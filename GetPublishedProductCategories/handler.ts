import * as express from "express";

import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import * as AR from "fp-ts/lib/Array";
import { wrapRequestHandler } from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import { Sequelize, QueryTypes } from "sequelize";

import { pipe, flow } from "fp-ts/lib/function";
import {
  IResponseErrorInternal,
  IResponseSuccessJson,
  ResponseErrorInternal,
  ResponseSuccessJson
} from "@pagopa/ts-commons/lib/responses";
import { ProductCategoryFromModel } from "../models/ProductCategories";
import PublishedProductCategoryModel from "../models/PublishedProductCategoryModel";
import { SelectPublishedProductCategories } from "../utils/postgres_queries";
import { errorsToError } from "../utils/conversions";
import { PublishedProductCategories } from "../generated/definitions/PublishedProductCategories";

type ResponseTypes =
  | IResponseSuccessJson<PublishedProductCategories>
  | IResponseErrorInternal;

type IGetPublishedProductCategoriesHandler = () => Promise<ResponseTypes>;

export const GetPublishedProductCategoriesHandler = (
  cgnOperatorDb: Sequelize
): IGetPublishedProductCategoriesHandler => async (): Promise<ResponseTypes> =>
  pipe(
    TE.tryCatch(
      () =>
        cgnOperatorDb.query(SelectPublishedProductCategories, {
          model: PublishedProductCategoryModel,
          raw: true,
          type: QueryTypes.SELECT
        }),
      E.toError
    ),
    TE.map(
      flow(
        AR.map(productCategoryModel =>
          ProductCategoryFromModel(productCategoryModel.product_category)
        ),
        productCategories => ({ items: productCategories })
      )
    ),
    TE.chain(
      flow(
        PublishedProductCategories.decode,
        TE.fromEither,
        TE.mapLeft(errorsToError)
      )
    ),
    TE.bimap(e => ResponseErrorInternal(e.message), ResponseSuccessJson),
    TE.toUnion
  )();

export const GetPublishedProductCategories = (
  cgnOperatorDb: Sequelize
): express.RequestHandler => {
  const handler = GetPublishedProductCategoriesHandler(cgnOperatorDb);
  return wrapRequestHandler(handler);
};
