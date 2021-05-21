import * as express from "express";

import { Context } from "@azure/functions";
import { toError } from "fp-ts/lib/Either";
import { tryCatch } from "fp-ts/lib/TaskEither";
import { ContextMiddleware } from "io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { RequiredBodyPayloadMiddleware } from "io-functions-commons/dist/src/utils/middlewares/required_body_payload";
import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "io-functions-commons/dist/src/utils/request_middleware";
import { Sequelize, QueryTypes } from "sequelize";

import { identity } from "fp-ts/lib/function";
import { fromNullable } from "fp-ts/lib/Option";
import {
  IResponseErrorInternal,
  IResponseSuccessJson,
  ResponseErrorInternal,
  ResponseSuccessJson
} from "@pagopa/ts-commons/lib/responses";
import { OnlineMerchants } from "../generated/definitions/OnlineMerchants";

import { ProductCategoryFromModel } from "../models/ProductCategories";
import OnlineMerchantModel from "../models/OnlineMerchantModel";
import { OnlineMerchantSearchRequest } from "../generated/definitions/OnlineMerchantSearchRequest";
import { selectOnlineMerchantsQuery } from "./postgres_queries";

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
  tryCatch(
    () =>
      cgnOperatorDb.query(
        selectOnlineMerchantsQuery(
          fromNullable(searchRequest.merchantName),
          fromNullable(searchRequest.productCategories),
          fromNullable(searchRequest.page),
          fromNullable(searchRequest.pageSize)
        ),
        {
          model: OnlineMerchantModel,
          raw: true,
          replacements: {
            name_filter:
              "%" +
              fromNullable(searchRequest.merchantName)
                .getOrElse("")
                .toLowerCase() +
              "%"
          },
          type: QueryTypes.SELECT
        }
      ),
    toError
  )
    .map(merchants =>
      merchants.map(m => ({
        id: m.id,
        name: m.name,
        productCategories: m.product_categories.map(pc =>
          ProductCategoryFromModel(pc)
        ),
        websiteUrl: m.website_url
      }))
    )
    .mapLeft(e => ResponseErrorInternal(e.message))
    .fold<ResponseTypes>(identity, items => ResponseSuccessJson({ items }))
    .run();

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
