import * as express from "express";

import { Context } from "@azure/functions";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import * as AR from "fp-ts/lib/Array";
import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { RequiredBodyPayloadMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_body_payload";
import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import { Sequelize, QueryTypes } from "sequelize";

import { identity, pipe, flow } from "fp-ts/lib/function";
import * as O from "fp-ts/lib/Option";
import {
  IResponseErrorInternal,
  IResponseSuccessJson,
  ResponseErrorInternal,
  ResponseSuccessJson
} from "@pagopa/ts-commons/lib/responses";
import { toLowerCase } from "fp-ts/lib/string";
import { OnlineMerchants } from "../generated/definitions/OnlineMerchants";

import { ProductCategoryFromModel } from "../models/ProductCategories";
import OnlineMerchantModel from "../models/OnlineMerchantModel";
import { OnlineMerchantSearchRequest } from "../generated/definitions/OnlineMerchantSearchRequest";
import { selectOnlineMerchantsQuery } from "../utils/postgres_queries";
import { errorsToError } from "../utils/conversions";
import { DiscountCodeTypeFromModel } from "../models/DiscountCodeTypes";

type ResponseTypes =
  | IResponseSuccessJson<OnlineMerchants>
  | IResponseErrorInternal;

type IGetOnlineMerchantsHandler = (
  context: Context,
  searchRequest: OnlineMerchantSearchRequest
) => Promise<ResponseTypes>;

export const GetOnlineMerchantsHandler = (
  cgnOperatorDb: Sequelize
): IGetOnlineMerchantsHandler => async (
  _,
  searchRequest
): Promise<ResponseTypes> =>
  pipe(
    TE.tryCatch(
      () =>
        cgnOperatorDb.query(
          selectOnlineMerchantsQuery(
            O.fromNullable(searchRequest.merchantName),
            O.fromNullable(searchRequest.productCategories),
            O.fromNullable(searchRequest.page),
            O.fromNullable(searchRequest.pageSize)
          ),
          {
            model: OnlineMerchantModel,
            raw: true,
            replacements: {
              name_filter: `%${pipe(
                O.fromNullable(searchRequest.merchantName),
                O.fold(() => "", identity),
                toLowerCase
              )}%`
            },
            type: QueryTypes.SELECT
          }
        ),
      E.toError
    ),
    TE.map(
      flow(
        AR.map(onlineMerchant => ({
          ...onlineMerchant,
          discountCodeType: DiscountCodeTypeFromModel(
            onlineMerchant.discount_code_type
          ),
          newDiscounts: onlineMerchant.new_discounts,
          productCategories: pipe(
            [...onlineMerchant.product_categories],
            AR.map(ProductCategoryFromModel)
          ),
          websiteUrl: onlineMerchant.website_url
        })),
        onlineMerchants => ({ items: onlineMerchants })
      )
    ),
    TE.chain(
      flow(OnlineMerchants.decode, TE.fromEither, TE.mapLeft(errorsToError))
    ),
    TE.bimap(e => ResponseErrorInternal(e.message), ResponseSuccessJson),
    TE.toUnion
  )();

export const GetOnlineMerchants = (
  cgnOperatorDb: Sequelize
): express.RequestHandler => {
  const handler = GetOnlineMerchantsHandler(cgnOperatorDb);

  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    RequiredBodyPayloadMiddleware(OnlineMerchantSearchRequest)
  );

  return wrapRequestHandler(middlewaresWrap(handler));
};
