import * as express from "express";
import { Context } from "@azure/functions";
import { identity, pipe, flow } from "fp-ts/lib/function";
import * as AR from "fp-ts/lib/Array";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import * as O from "fp-ts/lib/Option";
import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { RequiredBodyPayloadMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_body_payload";
import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import { Sequelize, QueryTypes } from "sequelize";
import {
  IResponseErrorInternal,
  IResponseSuccessJson,
  ResponseErrorInternal,
  ResponseSuccessJson
} from "@pagopa/ts-commons/lib/responses";
import { withoutUndefinedValues } from "@pagopa/ts-commons/lib/types";
import { toLowerCase } from "fp-ts/lib/string";
import { OfflineMerchants } from "../generated/definitions/OfflineMerchants";

import { ProductCategoryFromModel } from "../models/ProductCategories";
import OfflineMerchantModel from "../models/OfflineMerchantModel";
import { OfflineMerchantSearchRequest } from "../generated/definitions/OfflineMerchantSearchRequest";
import { selectOfflineMerchantsQuery } from "../utils/postgres_queries";
import { errorsToError } from "../utils/conversions";
import { withTelemetryTimeTracking } from "../utils/sequelize";

type ResponseTypes =
  | IResponseSuccessJson<OfflineMerchants>
  | IResponseErrorInternal;

type IGetOfflineMerchantsHandler = (
  context: Context,
  searchRequest: OfflineMerchantSearchRequest
) => Promise<ResponseTypes>;

export const GetOfflineMerchantsHandler = (
  cgnOperatorDb: Sequelize,
  queryWithTimeTracker: ReturnType<typeof withTelemetryTimeTracking>,
  logPrefix: string = "GetOfflineMerchantsHandler"
): IGetOfflineMerchantsHandler => async (
  ctx,
  searchRequest
): Promise<ResponseTypes> =>
  pipe(
    TE.tryCatch(
      () =>
        queryWithTimeTracker(
          cgnOperatorDb.query,
          selectOfflineMerchantsQuery(searchRequest),
          {
            model: OfflineMerchantModel,
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
        AR.map(offlineMerchant =>
          withoutUndefinedValues({
            ...offlineMerchant,
            address: withoutUndefinedValues({
              full_address: offlineMerchant.address,
              latitude: pipe(
                O.fromNullable(offlineMerchant.latitude),
                O.toUndefined
              ),
              longitude: pipe(
                O.fromNullable(offlineMerchant.longitude),
                O.toUndefined
              )
            }),
            distance: pipe(
              O.fromNullable(offlineMerchant.distance),
              O.map(Math.round),
              O.toUndefined
            ),
            newDiscounts: offlineMerchant.new_discounts,
            productCategories: offlineMerchant.product_categories.map(pc =>
              ProductCategoryFromModel(pc)
            )
          })
        ),
        offlineMerchants => ({ items: offlineMerchants })
      )
    ),
    TE.chainW(
      flow(OfflineMerchants.decode, TE.fromEither, TE.mapLeft(errorsToError))
    ),
    TE.bimap(e => {
      ctx.log.error(`${logPrefix}|ERROR=${e.message}`);
      return ResponseErrorInternal(e.message);
    }, ResponseSuccessJson),
    TE.toUnion
  )();

export const GetOfflineMerchants = (
  cgnOperatorDb: Sequelize,
  queryWithTimeTracker: ReturnType<typeof withTelemetryTimeTracking>
): express.RequestHandler => {
  const handler = GetOfflineMerchantsHandler(
    cgnOperatorDb,
    queryWithTimeTracker
  );

  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    RequiredBodyPayloadMiddleware(OfflineMerchantSearchRequest)
  );

  return wrapRequestHandler(middlewaresWrap(handler));
};
