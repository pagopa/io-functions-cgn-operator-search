import * as t from "io-ts";

import {
  IResponse,
  ResponseErrorFromValidationErrors
} from "@pagopa/ts-commons/lib/responses";
import { none, Option, some } from "fp-ts/lib/Option";
import { Either, right } from "fp-ts/lib/Either";
import { IRequestMiddleware } from "io-functions-commons/dist/src/utils/request_middleware";

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
  new Promise(resolve => {
    // If the parameter is not found return None
    if (request.query[name] === undefined) {
      resolve(right(none));
    }

    const validation = type.decode(request.query[name]);
    const result = validation.bimap(
      ResponseErrorFromValidationErrors(type),
      some
    );

    resolve(result);
  });
