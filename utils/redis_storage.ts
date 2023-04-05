import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";
import * as E from "fp-ts/lib/Either";
import { RedisClient } from "./redis";

/**
 * Parse a Redis single string reply.
 *
 * @see https://redis.io/topics/protocol#simple-string-reply.
 */
export const singleStringReply = (
  err: Error | null,
  reply: "OK" | undefined
): E.Either<Error, boolean> => {
  if (err) {
    return E.left(err);
  }
  return E.right(reply === "OK");
};

export const singleStringReplyAsync = (
  command: TE.TaskEither<Error, string | null>
): TE.TaskEither<Error, boolean> =>
  pipe(
    command,
    TE.map(reply => reply === "OK")
  );

/**
 * Parse a Redis single string reply.
 *
 * @see https://redis.io/topics/protocol#simple-string-reply.
 */
export const singleValueReply = (
  err: Error | null,
  reply: string | null
): E.Either<Error, O.Option<string>> => {
  if (err) {
    return E.left(err);
  }
  return E.right(O.fromNullable(reply));
};

export const singleValueReplyAsync = (
  command: TE.TaskEither<Error, string | null>
): TE.TaskEither<Error, O.Option<string>> =>
  pipe(command, TE.map(O.fromNullable));

/**
 * Parse a Redis integer reply.
 *
 * @see https://redis.io/topics/protocol#integer-reply
 */
export const integerRepl = (
  err: Error | null,
  reply: unknown,
  expectedReply?: number
): E.Either<Error, boolean> => {
  if (err) {
    return E.left(err);
  }
  if (expectedReply !== undefined && expectedReply !== reply) {
    return E.right(false);
  }
  return E.right(typeof reply === "number");
};

export const integerReplAsync = (expectedReply?: number) => (
  command: TE.TaskEither<Error, unknown>
): TE.TaskEither<Error, boolean> =>
  pipe(
    command,
    TE.map(reply => {
      if (expectedReply !== undefined && expectedReply !== reply) {
        return false;
      }
      return typeof reply === "number";
    })
  );

/**
 * Transform any Redis falsy response to an error
 *
 * @param response
 * @param error
 * @returns
 */
export const falsyResponseToError = (
  response: E.Either<Error, boolean>,
  error: Error
): E.Either<Error, true> => {
  if (E.isLeft(response)) {
    return response;
  } else {
    return response.right ? E.right(true) : E.left(error);
  }
};

export const falsyResponseToErrorAsync = (error: Error) => (
  response: TE.TaskEither<Error, boolean>
): TE.TaskEither<Error, true> =>
  pipe(
    response,
    TE.chain(res => (res ? TE.right(res) : TE.left(error)))
  );

export const popFromList = (
  redisClient: RedisClient,
  key: string
): TE.TaskEither<Error, O.Option<string>> =>
  pipe(
    TE.tryCatch(() => redisClient.LPOP(key), E.toError),
    singleValueReplyAsync
  );

export const pushInList = (
  redisClient: RedisClient,
  key: string,
  codes: ReadonlyArray<string>
): TE.TaskEither<Error, boolean> =>
  pipe(
    TE.tryCatch(() => redisClient.LPUSH(key, [...codes]), E.toError),
    integerReplAsync()
  );
