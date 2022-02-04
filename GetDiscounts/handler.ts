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

import { withoutUndefinedValues } from "@pagopa/ts-commons/lib/types";
import { OnlineMerchantSearchRequest } from "../generated/definitions/OnlineMerchantSearchRequest";
import { selectDiscountsQuery } from "../utils/postgres_queries";
import { errorsToError } from "../utils/conversions";
import { DiscountResults } from "../generated/definitions/DiscountResults";
import { DiscountsSearchRequest } from "../generated/definitions/DiscountsSearchRequest";
import DiscountResultModel from "../models/DiscountResultModel";

type ResponseTypes =
  | IResponseSuccessJson<DiscountResults>
  | IResponseErrorInternal;

type IGetDiscountsHandler = (
  context: Context,
  searchRequest: DiscountsSearchRequest
) => Promise<ResponseTypes>;

export const GetDiscountsHandler = (
  cgnOperatorDb: Sequelize
): IGetDiscountsHandler => async (_, searchRequest): Promise<ResponseTypes> =>
  pipe(
    TE.tryCatch(
      () =>
        cgnOperatorDb.query(
          selectDiscountsQuery(
            O.fromNullable(searchRequest.discountName),
            O.fromNullable(searchRequest.productCategories),
            O.fromNullable(searchRequest.page),
            O.fromNullable(searchRequest.pageSize)
          ),
          {
            model: DiscountResultModel,
            raw: true,
            replacements: {
              name_filter: `%${pipe(
                O.fromNullable(searchRequest.discountName),
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
        AR.map(discountResult =>
          withoutUndefinedValues({
            discount: discountResult.discount_value,
            id: discountResult.discount_k,
            merchantName: discountResult.operator_name,
            name: discountResult.name
          })
        ),
        discountResults => ({ items: discountResults })
      )
    ),
    TE.chain(
      flow(DiscountResults.decode, TE.fromEither, TE.mapLeft(errorsToError))
    ),
    TE.bimap(e => ResponseErrorInternal(e.message), ResponseSuccessJson),
    TE.toUnion
  )();

export const GetDiscounts = (
  cgnOperatorDb: Sequelize
): express.RequestHandler => {
  const handler = GetDiscountsHandler(cgnOperatorDb);

  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    RequiredBodyPayloadMiddleware(OnlineMerchantSearchRequest)
  );

  return wrapRequestHandler(middlewaresWrap(handler));
};
