import * as express from "express";

import { Context } from "@azure/functions";
import { sequenceT } from "fp-ts/lib/Apply";
import { toError } from "fp-ts/lib/Either";
import {
  taskEither,
  tryCatch,
  fromPredicate,
  TaskEither,
  fromEither
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
import { identity } from "fp-ts/lib/function";
import { Merchant } from "../generated/definitions/Merchant";

import AddressModel from "../models/AddressModel";
import MerchantProfileModel from "../models/MerchantProfileModel";
import DiscountModel from "../models/DiscountModel";
import { ProductCategoryFromModel } from "../models/ProductCategories";
import { errorsToError } from "../utils/conversions";
import {
  SelectDiscountsByMerchantQuery,
  SelectMerchantAddressListQuery,
  SelectMerchantProfileQuery
} from "./postgres_queries";

type ResponseTypes =
  | IResponseSuccessJson<Merchant>
  | IResponseErrorNotFound
  | IResponseErrorInternal;

type IGetMerchantHandler = (
  context: Context,
  merchantId: string
) => Promise<ResponseTypes>;

const addressesTask = (
  cgnOperatorDb: Sequelize,
  profileId: number
): TaskEither<IResponseErrorInternal, ReadonlyArray<AddressModel>> =>
  tryCatch(
    () =>
      cgnOperatorDb.query(SelectMerchantAddressListQuery, {
        model: AddressModel,
        raw: true,
        replacements: { profile_key: profileId },
        type: QueryTypes.SELECT
      }),
    toError
  ).mapLeft<IResponseErrorInternal>(e => ResponseErrorInternal(e.message));

const discountsTask = (
  cgnOperatorDb: Sequelize,
  merchantId: string
): TaskEither<IResponseErrorInternal, ReadonlyArray<DiscountModel>> =>
  tryCatch(
    () =>
      cgnOperatorDb.query(SelectDiscountsByMerchantQuery, {
        model: DiscountModel,
        raw: true,
        replacements: { agreement_key: merchantId },
        type: QueryTypes.SELECT
      }),
    toError
  ).mapLeft<IResponseErrorInternal>(e => ResponseErrorInternal(e.message));

export const GetMerchantHandler = (
  cgnOperatorDb: Sequelize,
  cdnBaseUrl: string
): IGetMerchantHandler => async (_, merchantId): Promise<ResponseTypes> =>
  tryCatch(
    () =>
      cgnOperatorDb.query(SelectMerchantProfileQuery, {
        model: MerchantProfileModel,
        raw: true,
        replacements: { merchant_id: merchantId },
        type: QueryTypes.SELECT
      }),
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
    .chain(merchant =>
      sequenceT(taskEither)(
        addressesTask(cgnOperatorDb, merchant.profile_k),
        discountsTask(cgnOperatorDb, merchantId)
      ).map(([addresses, discounts]) => ({ addresses, discounts, merchant }))
    )
    .map(__ => ({
      ...__,
      addresses: __.addresses.map(a => ({
        full_address: a.full_address,
        latitude: a.latitude,
        longitude: a.longitude
      })),
      discounts: __.discounts.map(d => ({
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
      }))
    }))
    .map(({ addresses, discounts, merchant }) => ({
      addresses,
      description: merchant.description,
      discounts,
      id: merchant.agreement_fk,
      imageUrl: `${cdnBaseUrl}${merchant.image_url}`,
      name: merchant.name,
      websiteUrl: merchant.website_url
    }))
    .chain(merchant =>
      fromEither(Merchant.decode(merchant)).mapLeft(errs =>
        ResponseErrorInternal(errorsToError(errs).message)
      )
    )
    .fold<ResponseTypes>(identity, ResponseSuccessJson)
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
