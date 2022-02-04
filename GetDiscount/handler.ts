import * as express from "express";

import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import * as AR from "fp-ts/lib/Array";
import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import { Sequelize, QueryTypes } from "sequelize";

import { pipe, flow } from "fp-ts/lib/function";
import * as O from "fp-ts/lib/Option";
import {
  IResponseErrorInternal,
  IResponseErrorNotFound,
  IResponseSuccessJson,
  ResponseErrorInternal,
  ResponseErrorNotFound,
  ResponseSuccessJson
} from "@pagopa/ts-commons/lib/responses";

import { withoutUndefinedValues } from "@pagopa/ts-commons/lib/types";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { RequiredParamMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_param";
import { Context } from "@azure/functions";
import { selectDiscountQuery } from "../utils/postgres_queries";
import { errorsToError } from "../utils/conversions";
import DiscountDetailModel from "../models/DiscountDetailModel";
import { OptionalHeaderParamMiddleware } from "../middlewares/optional_header_param";
import { DiscountDetail } from "../generated/definitions/DiscountDetail";
import { DiscountCodeTypeFromModel } from "../models/DiscountCodeTypes";
import { ProductCategoryFromModel } from "../models/ProductCategories";

type ResponseTypes =
  | IResponseSuccessJson<DiscountDetail>
  | IResponseErrorNotFound
  | IResponseErrorInternal;

type IGetDiscountHandler = (
  context: Context,
  discountId: NonEmptyString,
  maybeFromExternalHeader: O.Option<NonEmptyString>
) => Promise<ResponseTypes>;

export const GetDiscountHandler = (
  cgnOperatorDb: Sequelize
): IGetDiscountHandler => async (
  _,
  discountId,
  maybeFromExternalHeader
): Promise<ResponseTypes> =>
  pipe(
    TE.tryCatch(
      () =>
        cgnOperatorDb.query(selectDiscountQuery, {
          model: DiscountDetailModel,
          raw: true,
          replacements: {
            discountId
          },
          type: QueryTypes.SELECT
        }),
      E.toError
    ),
    TE.bimap(e => ResponseErrorInternal(e.message), AR.head),
    TE.chainW(
      TE.fromOption(() =>
        ResponseErrorNotFound("Not Found", "Published discount not found")
      )
    ),
    TE.map(discountDetailModel =>
      withoutUndefinedValues({
        condition: discountDetailModel.condition,
        description: discountDetailModel.discount_description,
        discount: discountDetailModel.discount_value,
        discountCodeType: pipe(
          O.fromNullable(discountDetailModel.discount_code_type),
          O.map(DiscountCodeTypeFromModel),
          O.toUndefined
        ),
        endDate: discountDetailModel.end_date,
        id: discountDetailModel.discount_id,
        landingPageReferrer: pipe(
          maybeFromExternalHeader,
          O.fold(
            () =>
              pipe(
                discountDetailModel.landing_page_referrer,
                O.fromNullable,
                O.toUndefined
              ),
            () => undefined
          )
        ),
        landingPageUrl: pipe(
          maybeFromExternalHeader,
          O.fold(
            () =>
              pipe(
                discountDetailModel.landing_page_url,
                O.fromNullable,
                O.toUndefined
              ),
            () => undefined
          )
        ),
        merchantId: discountDetailModel.operator_id,
        name: discountDetailModel.discount_name,
        productCategories: discountDetailModel.product_categories.map(
          ProductCategoryFromModel
        ),
        startDate: discountDetailModel.start_date,
        staticCode: pipe(
          maybeFromExternalHeader,
          O.fold(
            () =>
              pipe(
                discountDetailModel.static_code,
                O.fromNullable,
                O.toUndefined
              ),
            () => undefined
          )
        )
      })
    ),
    TE.chainW(
      flow(
        DiscountDetail.decode,
        TE.fromEither,
        TE.mapLeft(flow(errorsToError, e => ResponseErrorInternal(e.message)))
      )
    ),
    TE.map(ResponseSuccessJson),
    TE.toUnion
  )();

export const GetDiscount = (
  cgnOperatorDb: Sequelize,
  fromExternalHeaderName: NonEmptyString
): express.RequestHandler => {
  const handler = GetDiscountHandler(cgnOperatorDb);

  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    RequiredParamMiddleware("discountId", NonEmptyString),
    OptionalHeaderParamMiddleware(fromExternalHeaderName, NonEmptyString)
  );

  return wrapRequestHandler(middlewaresWrap(handler));
};
