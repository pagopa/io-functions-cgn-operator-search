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
import { OfflineMerchants } from "../generated/definitions/OfflineMerchants";

import { ProductCategoryFromModel } from "../models/ProductCategories";
import OfflineMerchantModel from "../models/OfflineMerchantModel";
import { OfflineMerchantSearchRequest } from "../generated/definitions/OfflineMerchantSearchRequest";
import { selectOfflineMerchantsQuery } from "../utils/postgres_queries";

type ResponseTypes =
  | IResponseSuccessJson<OfflineMerchants>
  | IResponseErrorInternal;

type IGetOfflineMerchantsHandler = (
  context: Context,
  searchRequest: OfflineMerchantSearchRequest
) => Promise<ResponseTypes>;

export const GetOfflineMerchantsHandler = (
  cgnOperatorDb: Sequelize
): IGetOfflineMerchantsHandler => async (
  _,
  searchRequest
): Promise<ResponseTypes> =>
  tryCatch(
    () =>
      cgnOperatorDb.query(selectOfflineMerchantsQuery(searchRequest), {
        model: OfflineMerchantModel,
        raw: true,
        replacements: {
          name_filter: `%${fromNullable(searchRequest.merchantName)
            .getOrElse("")
            .toLowerCase()}%`
        },
        type: QueryTypes.SELECT
      }),
    toError
  )
    .map(merchants =>
      merchants.map(m => ({
        address: {
          full_address: m.address,
          latitude: m.latitude,
          longitude: m.longitude
        },
        distance: m.distance,
        id: m.id,
        name: m.name,
        productCategories: m.product_categories.map(pc =>
          ProductCategoryFromModel(pc)
        )
      }))
    )
    .mapLeft(e => ResponseErrorInternal(e.message))
    .fold<ResponseTypes>(identity, items => ResponseSuccessJson({ items }))
    .run();

export const GetOfflineMerchants = (
  cgnOperatorDb: Sequelize
): express.RequestHandler => {
  const handler = GetOfflineMerchantsHandler(cgnOperatorDb);

  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    RequiredBodyPayloadMiddleware(OfflineMerchantSearchRequest)
  );

  return wrapRequestHandler(middlewaresWrap(handler));
};