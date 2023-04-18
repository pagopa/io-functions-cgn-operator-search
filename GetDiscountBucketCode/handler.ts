import * as express from "express";
import { Context } from "@azure/functions";
import * as AR from "fp-ts/lib/Array";
import * as O from "fp-ts/lib/Option";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { flow, pipe } from "fp-ts/lib/function";
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
import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";
import DiscountBucketCodeModel from "../models/DiscountBucketCodeModel";
import { DiscountBucketCode } from "../generated/definitions/DiscountBucketCode";
import { errorsToError } from "../utils/conversions";
import {
  SelectDiscountBucketCodeByDiscount,
  UpdateDiscountBucketCodeSetUsed
} from "../utils/postgres_queries";
import { RedisClientFactory } from "../utils/redis";
import { popFromList, pushInList } from "../utils/redis_storage";

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

const getAndUpdateCodes = (
  cgnOperatorDb: Sequelize,
  discountId: string,
  bucketCodeLockLimit: NonNegativeInteger
): TE.TaskEither<
  IResponseErrorInternal | IResponseErrorNotFound,
  ReadonlyArray<DiscountBucketCodeModel>
> =>
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
              replacements: {
                discount_fk: discountId,
                limit: bucketCodeLockLimit
              },
              transaction: t,
              type: QueryTypes.SELECT
            }),
          E.toError
        ),
        TE.mapLeft(err => ResponseErrorInternal(err.message)),
        TE.chainW(
          TE.fromPredicate(
            results => results.length > 0,
            () =>
              ResponseErrorNotFound("Not Found", "Empty Discount bucket codes")
          )
        ),
        TE.chainW(codes =>
          pipe(
            TE.tryCatch(
              () =>
                cgnOperatorDb.query(UpdateDiscountBucketCodeSetUsed, {
                  raw: true,
                  replacements: {
                    bucket_code_k_list: codes.map(el => el.bucket_code_k)
                  },
                  transaction: t,
                  type: QueryTypes.UPDATE
                }),
              E.toError
            ),
            TE.chain(([__, numberOfUpdatedRecords]) =>
              TE.fromPredicate(
                (updatedRecordNumber: number) =>
                  updatedRecordNumber === codes.length,
                () => new Error("Cannot update retrieved bucket codes")
              )(numberOfUpdatedRecords)
            ),
            TE.mapLeft(err => ResponseErrorInternal(err.message)),
            TE.map(() => codes)
          )
        ),
        TE.chainW(codesResult =>
          pipe(
            commitTransaction(t),
            TE.bimap(
              err => ResponseErrorInternal(err.message),
              () => codesResult
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
    )
  );

export const GetDiscountBucketCodeHandler = (
  cgnOperatorDb: Sequelize,
  redisClientFactory: RedisClientFactory,
  bucketCodeLockLimit: NonNegativeInteger
): IGetDiscountBucketCodeHandler => (_, discountId): Promise<ResponseTypes> =>
  pipe(
    popFromList(redisClientFactory, discountId),
    // if popFromList fails it means Redis is currently unavailable so
    // we fallback to default behaviour by fetching codes with Sequelize
    TE.orElse(() =>
      pipe(
        getAndUpdateCodes(cgnOperatorDb, discountId, 1 as NonNegativeInteger),
        TE.map(resultCodes => [...resultCodes]),
        TE.map(
          flow(
            AR.head,
            O.map(codeModel => codeModel.code)
          )
        )
      )
    ),
    TE.chain(
      O.fold(
        () =>
          // No codes recognized so we try to fetch an other chunk of codes and store them to Redis
          pipe(
            getAndUpdateCodes(cgnOperatorDb, discountId, bucketCodeLockLimit),
            TE.map(resultCodes => [...resultCodes]),
            TE.chainW(
              flow(
                AR.map(discountBucketCode => discountBucketCode.code),
                AR.splitAt(1),
                ([[firstCode], codesToSave]) =>
                  pipe(
                    pushInList(redisClientFactory, discountId, codesToSave),
                    TE.map(() => firstCode),
                    // if Push fails we accept to burn a bunch of codes and just give back one without storing them on Redis.
                    TE.orElse(() => TE.of(firstCode))
                  )
              )
            )
          ),
        TE.of
      )
    ),
    TE.map(code => ({ code })),
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
  cgnOperatorDb: Sequelize,
  redisClientFactory: RedisClientFactory,
  bucketCodeLockLimit: NonNegativeInteger
): express.RequestHandler => {
  const handler = GetDiscountBucketCodeHandler(
    cgnOperatorDb,
    redisClientFactory,
    bucketCodeLockLimit
  );

  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    RequiredParamMiddleware("discountId", NonEmptyString)
  );

  return wrapRequestHandler(middlewaresWrap(handler));
};
