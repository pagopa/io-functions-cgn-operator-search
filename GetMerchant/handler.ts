import * as express from "express";

import { Context } from "@azure/functions";
import { sequenceT } from "fp-ts/lib/Apply";
import { toError } from "fp-ts/lib/Either";
import {
  right,
  taskEither,
  tryCatch,
  fromPredicate
} from "fp-ts/lib/TaskEither";
import { ContextMiddleware } from "io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { RequiredParamMiddleware } from "io-functions-commons/dist/src/utils/middlewares/required_param";
import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "io-functions-commons/dist/src/utils/request_middleware";
import { Sequelize, QueryTypes } from "sequelize";
import {
  IResponseErrorInternal,
  IResponseErrorNotFound,
  IResponseSuccessJson,
  ResponseErrorInternal,
  ResponseErrorNotFound,
  ResponseSuccessJson
} from "@pagopa/ts-commons/lib/responses";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { Task } from "fp-ts/lib/Task";
import { identity } from "fp-ts/lib/function";
import { Merchant } from "../generated/definitions/Merchant";

import AddressModel from "../models/AddressModel";
import MerchantProfileModel from "../models/MerchantProfileModel";
import DiscountModel from "../models/DiscountModel";
import { ProductCategoryFromModel } from "../models/ProductCategories";

type ResponseTypes =
  | IResponseSuccessJson<Merchant>
  | IResponseErrorNotFound
  | IResponseErrorInternal;

type IGetMerchantHandler = (
  context: Context,
  merchantId: string
) => Promise<ResponseTypes>;

export const GetMerchantHandler = (
  cgnOperatorDb: Sequelize,
  cdnBaseUrl: string
): IGetMerchantHandler => async (_, merchantId): Promise<ResponseTypes> =>
  tryCatch(
    () =>
      cgnOperatorDb.query(
        `SELECT
          p.agreement_fk,
          p.profile_k,
          p.name,
          p.description,
          p.website_url,
          a.image_url
        FROM profile p
        JOIN agreement a ON (p.agreement_fk = a.agreement_k)
        WHERE agreement_fk = :merchant_id
        AND a.state = 'APPROVED'
        AND a.start_date <= CURRENT_TIMESTAMP
        AND CURRENT_TIMESTAMP <= a.end_date`,
        {
          model: MerchantProfileModel,
          raw: true,
          replacements: { merchant_id: merchantId },
          type: QueryTypes.SELECT
        }
      ),
    toError
  )
    .mapLeft<IResponseErrorInternal | IResponseErrorNotFound>(e =>
      ResponseErrorInternal(e.message)
    )
    .chain(
      fromPredicate(
        merchants => merchants.length > 0,
        () => ResponseErrorNotFound("Not Found", "Merchant profile not found")
      )
    )
    .map(merchants => merchants[0])
    .chain(merchant => {
      const addresses = tryCatch(
        () =>
          cgnOperatorDb.query(
            `SELECT 
            street,
            zip_code,
            city,
            district,
            latitude,
            longitude
          FROM address
          WHERE profile_fk = :profile_key`,
            {
              model: AddressModel,
              raw: true,
              replacements: { profile_key: merchant.profile_k },
              type: QueryTypes.SELECT
            }
          ),
        toError
      ).mapLeft<IResponseErrorInternal>(e => ResponseErrorInternal(e.message));

      const discounts = tryCatch(
        () =>
          cgnOperatorDb.query(
            `WITH operator_discounts AS (
            SELECT
                d.discount_k,
                d.name,
                d.description,
                d.start_date,
                d.end_date,
                d.discount_value,
                d.condition,
                d.static_code
            FROM discount d
            WHERE d.agreement_fk = :agreement_key
            AND d.state = 'PUBLISHED'
            AND d.start_date <= CURRENT_TIMESTAMP
            AND CURRENT_TIMESTAMP <= d.end_date
          ),
          discounts_with_categories AS (
            SELECT
                d.discount_k,
                d.name,
                d.description,
                d.start_date,
                d.end_date,
                d.discount_value,
                d.condition,
                d.static_code,
                pc.product_category
            FROM operator_discounts d
            JOIN discount_product_category pc ON (pc.discount_fk = d.discount_k)
          )
          SELECT
              d.discount_k,
              d.name,
              d.description,
              d.start_date,
              d.end_date,
              d.discount_value,
              d.condition,
              d.static_code,
              array_agg(d.product_category) AS product_categories
          FROM discounts_with_categories d
          GROUP BY 1,2,3,4,5,6,7,8`,
            {
              model: DiscountModel,
              raw: true,
              replacements: { agreement_key: merchantId },
              type: QueryTypes.SELECT
            }
          ),
        toError
      ).mapLeft<IResponseErrorInternal>(e => ResponseErrorInternal(e.message));

      const merchantTaskEither = right<
        IResponseErrorNotFound | IResponseErrorInternal,
        MerchantProfileModel
      >(new Task(() => Promise.resolve(merchant)));

      return sequenceT(taskEither)(merchantTaskEither, addresses, discounts);
    })
    .map(results => {
      const [merchant, addresses, discounts] = results;

      const discountsDto = discounts.map(d => ({
        condition: d.condition,
        description: d.description,
        discount: d.discount_value,
        endDate: d.end_date,
        name: d.name,
        productCategories: d.product_categories.map(p =>
          ProductCategoryFromModel(p)
        ),
        startDate: d.start_date,
        staticCode: d.static_code // TODO if called by App IO use value otherwise NULL
      }));

      const addressesDto = addresses.map(a => ({
        city: a.city,
        district: a.district,
        latitude: a.latitude,
        longitude: a.longitude,
        street: a.street,
        zipCode: a.zip_code
      }));

      return {
        addresses: addressesDto,
        description: merchant.description,
        discounts: discountsDto,
        id: merchant.agreement_fk,
        imageUrl: `${cdnBaseUrl}${merchant.image_url}`,
        name: merchant.name,
        websiteUrl: merchant.website_url
      };
    })
    .fold<ResponseTypes>(identity, merchant => ResponseSuccessJson(merchant))
    .run();

export const GetMerchant = (
  cgnOperatorDb: Sequelize,
  cdnBaseUrl: string
): express.RequestHandler => {
  const handler = GetMerchantHandler(cgnOperatorDb, cdnBaseUrl);

  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    RequiredParamMiddleware("merchantId", NonEmptyString)
  );

  return wrapRequestHandler(middlewaresWrap(handler));
};
