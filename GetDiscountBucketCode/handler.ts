import * as express from "express";
import { Context } from "@azure/functions";
import * as AR from "fp-ts/lib/Array";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { RequiredParamMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_param";
import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import { Sequelize, QueryTypes, Transaction } from "sequelize";
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
} from "../utils/postgres_queries";

type ResponseTypes =
  | IResponseSuccessJson<DiscountBucketCode>
  | IResponseErrorNotFound
  | IResponseErrorInternal;

type IGetDiscountBucketCodeHandler = (
  context: Context,
  discountId: string
) => Promise<ResponseTypes>;

const rollbackTransaction = (
  transaction: Transaction
): TE.TaskEither<Error, void> =>
  TE.tryCatch(() => transaction.rollback(), E.toError);

const commitTransaction = (
  transaction: Transaction
): TE.TaskEither<Error, void> =>
  TE.tryCatch(() => transaction.commit(), E.toError);

export const GetDiscountBucketCodeHandler = (
  cgnOperatorDb: Sequelize
): IGetDiscountBucketCodeHandler => async (
  _,
  discountId
): Promise<ResponseTypes> =>
  pipe(
    TE.tryCatch(() => cgnOperatorDb.transaction(), E.toError),
    TE.mapLeft(err => ResponseErrorInternal(err.message)),
    TE.chain(t =>
      pipe(
        TE.tryCatch(
          () =>
            cgnOperatorDb.query(SelectDiscountBucketCodeByDiscount, {
              model: DiscountBucketCodeModel,
              raw: true,
              replacements: { discount_fk: discountId },
              transaction: t,
              type: QueryTypes.SELECT
            }),
          E.toError
        ),
        TE.bimap(err => ResponseErrorInternal(err.message), AR.head),
        TE.chainW(
          TE.fromOption(() =>
            ResponseErrorNotFound("Not Found", "Discount bucket code not found")
          )
        ),
        TE.chainW(code =>
          pipe(
            TE.tryCatch(
              () =>
                cgnOperatorDb.query(UpdateDiscountBucketCodeSetUsed, {
                  raw: true,
                  replacements: { bucket_code_k: code.bucket_code_k },
                  transaction: t,
                  type: QueryTypes.UPDATE
                }),
              E.toError
            ),
            TE.chain(([__, numberOfUpdatedRecords]) =>
              TE.fromPredicate(
                (updatedRecordNumber: number) => updatedRecordNumber === 1,
                () => new Error("Cannot update the bucket code")
              )(numberOfUpdatedRecords)
            ),
            TE.mapLeft(err => ResponseErrorInternal(err.message)),
            TE.chainW(() =>
              pipe(
                code,
                DiscountBucketCode.decode,
                TE.fromEither,
                TE.bimap(
                  e => ResponseErrorInternal(errorsToError(e).message),
                  ResponseSuccessJson
                )
              )
            )
          )
        ),
        TE.chainW(success =>
          pipe(
            commitTransaction(t),
            TE.bimap(
              err => ResponseErrorInternal(err.message),
              () => success
            )
          )
        ),
        TE.orElseW(errorResponses =>
          pipe(
            rollbackTransaction(t),
            TE.mapLeft(err => ResponseErrorInternal(err.message)),
            TE.chain(() => TE.left(errorResponses))
          )
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
