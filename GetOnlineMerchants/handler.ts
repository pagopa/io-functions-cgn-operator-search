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

import {
  ProductCategoryFromModel,
  ProductCategoryToQueryColumn
} from "../models/ProductCategories";
import OnlineMerchantModel from "../models/OnlineMerchantModel";
import { ProductCategory } from "../generated/definitions/ProductCategory";
import { OptionalProductCategoryListMiddleware } from "./optional_product_category_list_middleware";
import { OptionalQueryParamMiddleware } from "./optional_query_param";

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

const categoryFilter = (
  productCategoriesFilter: Option<ReadonlyArray<ProductCategory>>
): string =>
productCategoriesFilter
    .map(s => s.map(c => ProductCategoryToQueryColumn(c)).join(" OR "))
    .map(s => `AND (${s})`)
    .getOrElse("");

const nameFilterQueryPart = (nameFilter: Option<string>): string =>
  nameFilter.map(__ => " AND searchable_name LIKE :name_filter ").getOrElse("");

const pageSize = (maybePageSize: Option<NonNegativeInteger>): number =>
  maybePageSize.map(n => n as number).getOrElse(100);

const offset = (
  page: Option<NonNegativeInteger>,
  maybePageSize: Option<NonNegativeInteger>
): number => page.map(n => n as number).getOrElse(0) * pageSize(maybePageSize);

const SelectOnlineMerchantsQuery = (
  nameFilter: Option<string>,
  productCategoriesFilter: Option<ReadonlyArray<ProductCategory>>,
  page: Option<NonNegativeInteger>,
  maybePageSize: Option<NonNegativeInteger>
): string => `
SELECT
  id,
  name,
  product_categories,
  website_url
FROM online_merchant
WHERE 1 = 1
  ${nameFilterQueryPart(nameFilter)}
  ${categoryFilter(productCategoriesFilter)}
ORDER BY name ASC
LIMIT ${pageSize(maybePageSize)}
OFFSET ${offset(page, maybePageSize)}`;

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
        SelectOnlineMerchantsQuery(
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
