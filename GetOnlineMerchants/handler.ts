import * as express from "express";

import { Context } from "@azure/functions";
import { toError } from "fp-ts/lib/Either";
import { tryCatch } from "fp-ts/lib/TaskEither";
import { ContextMiddleware } from "io-functions-commons/dist/src/utils/middlewares/context_middleware";
import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "io-functions-commons/dist/src/utils/request_middleware";
import { Sequelize, QueryTypes } from "sequelize";

import { identity } from "fp-ts/lib/function";
import { Option } from "fp-ts/lib/Option";
import {
  NonNegativeInteger,
  NonNegativeIntegerFromString
} from "@pagopa/ts-commons/lib/numbers";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import {
  IResponseErrorInternal,
  IResponseSuccessJson,
  ResponseErrorInternal,
  ResponseSuccessJson
} from "@pagopa/ts-commons/lib/responses";
import { OnlineMerchants } from "../generated/definitions/OnlineMerchants";

import { ProductCategoryFromModel } from "../models/ProductCategories";
import OnlineMerchantModel from "../models/OnlineMerchantModel";
import { ProductCategory } from "../generated/definitions/ProductCategory";
import { OptionalProductCategoryListMiddleware } from "./optional_product_category_list_middleware";
import { OptionalQueryParamMiddleware } from "./optional_query_param";
import { selectOnlineMerchantsQuery } from "./postgres_queries";

type ResponseTypes =
  | IResponseSuccessJson<OnlineMerchants>
  | IResponseErrorInternal;

type IGetOnlineMerchantsHandler = (
  context: Context,
  nameFilter: Option<string>,
  productCategoriesFilter: Option<ReadonlyArray<ProductCategory>>,
  page: Option<NonNegativeInteger>,
  maybePageSize: Option<NonNegativeInteger>
) => Promise<ResponseTypes>;

export const GetOnlineMerchantsHandler = (
  cgnOperatorDb: Sequelize
): IGetOnlineMerchantsHandler => async (
  _,
  nameFilter,
  productCategoriesFilter,
  page,
  maybePageSize
): Promise<ResponseTypes> =>
  tryCatch(
    () =>
      cgnOperatorDb.query(
        selectOnlineMerchantsQuery(
          nameFilter,
          productCategoriesFilter,
          page,
          maybePageSize
        ),
        {
          model: OnlineMerchantModel,
          raw: true,
          replacements: {
            name_filter: "%" + nameFilter.getOrElse("").toLowerCase() + "%"
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
    OptionalQueryParamMiddleware("merchantName", NonEmptyString),
    OptionalProductCategoryListMiddleware("productCategories"),
    OptionalQueryParamMiddleware("page", NonNegativeIntegerFromString),
    OptionalQueryParamMiddleware("pageSize", NonNegativeIntegerFromString)
  );

  return wrapRequestHandler(middlewaresWrap(handler));
};
