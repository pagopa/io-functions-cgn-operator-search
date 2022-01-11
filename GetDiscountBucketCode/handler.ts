import * as express from "express";
import { Context } from "@azure/functions";
import * as AR from "fp-ts/lib/Array";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import * as O from "fp-ts/lib/Option";
import * as TO from "fp-ts/lib/TaskOption";
import { flow, pipe } from "fp-ts/lib/function";
import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { RequiredParamMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_param";
import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
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
import DiscountBucketCodeModel from "../models/DiscountBucketCodeModel";
import { DiscountBucketCode } from "../generated/definitions/DiscountBucketCode";
import { errorsToError } from "../utils/conversions";
import {
  SelectDiscountBucketCodeByDiscount,
  UpdateDiscountBucketCodeSetUsed
} from "./postgres_queries";

type ResponseTypes =
  | IResponseSuccessJson<DiscountBucketCode>
  | IResponseErrorNotFound
  | IResponseErrorInternal;

type IGetDiscountBucketCodeHandler = (
  context: Context,
  discountId: string
) => Promise<ResponseTypes>;

export const GetDiscountBucketCodeHandler = (
  cgnOperatorDb: Sequelize
): IGetDiscountBucketCodeHandler => async (
  _,
  discountId
): Promise<ResponseTypes> =>
  pipe(
    TE.tryCatch(
      () =>
        cgnOperatorDb.transaction(async t =>
          pipe(
            await cgnOperatorDb.query(SelectDiscountBucketCodeByDiscount, {
              model: DiscountBucketCodeModel,
              raw: true,
              replacements: { discount_fk: discountId },
              transaction: t,
              type: QueryTypes.SELECT
            }),
            AR.head,
            TO.fromOption,
            TO.chain(code => async (): Promise<
              O.Option<DiscountBucketCodeModel>
            > => {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const [__, meta] = await cgnOperatorDb.query(
                UpdateDiscountBucketCodeSetUsed,
                {
                  raw: true,
                  replacements: { bucket_code_k: code.bucket_code_k },
                  transaction: t,
                  type: QueryTypes.UPDATE
                }
              );

              if (meta !== 1) {
                // we expect just one code to be updated, or else we should rollback
                throw Error("Cannot update the bucket code");
              }

              return O.some(code);
            })
          )()
        ),
      E.toError
    ),
    TE.mapLeft(e => ResponseErrorInternal(e.message)),
    TE.chainW(
      TE.fromOption(() =>
        ResponseErrorNotFound("Not Found", "Discount bucket code not found")
      )
    ),
    TE.chainW(
      flow(
        DiscountBucketCode.decode,
        TE.fromEither,
        TE.bimap(
          e => ResponseErrorInternal(errorsToError(e).message),
          ResponseSuccessJson
        )
      )
    ),
    TE.toUnion
  )();

export const GetDiscountBucketCode = (
  cgnOperatorDb: Sequelize
): express.RequestHandler => {
  const handler = GetDiscountBucketCodeHandler(cgnOperatorDb);

  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    RequiredParamMiddleware("discountId", NonEmptyString)
  );

  return wrapRequestHandler(middlewaresWrap(handler));
};
