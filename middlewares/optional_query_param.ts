import * as t from "io-ts";

import {
  IResponse,
  ResponseErrorFromValidationErrors
} from "@pagopa/ts-commons/lib/responses";
import { fromNullable, none, Option, some } from "fp-ts/lib/Option";
import { Either } from "fp-ts/lib/Either";
import { IRequestMiddleware } from "io-functions-commons/dist/src/utils/request_middleware";
import { fromEither, taskEither } from "fp-ts/lib/TaskEither";

// TODO move to https://github.com/pagopa/io-functions-commons project
/**
 * Returns a request middleware that validates the presence of an optional
 * parameter in the request.query object.
 *
 * @param name  The name of the parameter
 * @param type  The io-ts Type for validating the parameter
 */
export const OptionalQueryParamMiddleware = <S, A>(
  name: string,
  type: t.Type<A, S>
): IRequestMiddleware<"IResponseErrorValidation", Option<A>> => async (
  request
): Promise<Either<IResponse<"IResponseErrorValidation">, Option<A>>> =>
  taskEither
    .of<IResponse<"IResponseErrorValidation">, Option<unknown>>(
      fromNullable(request.query[name])
    )
    .chain(maybeQuery =>
      maybeQuery.foldL(
        () => taskEither.of(none),
        query =>
          fromEither(type.decode(query)).bimap(
            ResponseErrorFromValidationErrors(type),
            some
          )
      )
    )
    .run();
