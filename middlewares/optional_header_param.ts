import * as t from "io-ts";

import {
  IResponseErrorValidation,
  ResponseErrorFromValidationErrors
} from "@pagopa/ts-commons/lib/responses";
import * as TE from "fp-ts/lib/TaskEither";
import * as O from "fp-ts/lib/Option";
import * as E from "fp-ts/lib/Either";
import { flow, pipe } from "fp-ts/lib/function";
import { Request } from "express";

// TODO move to https://github.com/pagopa/io-functions-commons project
/**
 * Returns a request middleware that validates the presence of an optional
 * parameter in the request.header object.
 *
 * @param name  The name of the parameter
 * @param type  The io-ts Type for validating the parameter
 */
export const OptionalHeaderParamMiddleware = <S, A>(
  name: string,
  type: t.Type<A, S>
) => (
  request: Request
): Promise<E.Either<IResponseErrorValidation, O.Option<A>>> =>
  pipe(
    O.fromNullable(request.header(name)),
    O.fold(
      () => TE.of(O.none),
      flow(
        type.decode,
        TE.fromEither,
        TE.bimap(ResponseErrorFromValidationErrors(type), O.some)
      )
    )
  )();
