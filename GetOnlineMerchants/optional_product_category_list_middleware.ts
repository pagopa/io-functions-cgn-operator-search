import {
  IResponse,
  ResponseErrorFromValidationErrors
} from "@pagopa/ts-commons/lib/responses";
import { Either, right, left } from "fp-ts/lib/Either";
import { none, Option, some } from "fp-ts/lib/Option";
import { IRequestMiddleware } from "io-functions-commons/dist/src/utils/request_middleware";
import * as t from "io-ts";
import * as A from "fp-ts/lib/Array";
import { identity } from "fp-ts/lib/function";
import {
  ProductCategory,
  ProductCategoryEnum
} from "../generated/definitions/ProductCategory";

// this utility function can be used to turn a TypeScript enum into a io-ts codec.
const fromEnum = <EnumType>(
  enumName: string,
  theEnum: Record<string, string | number>
): t.Type<EnumType> => {
  const isEnumValue = (input: unknown): input is EnumType =>
    Object.values<unknown>(theEnum).includes(input);

  return new t.Type<EnumType>(
    enumName,
    isEnumValue,
    (input, context) =>
      isEnumValue(input) ? t.success(input) : t.failure(input, context),
    t.identity
  );
};

export const OptionalProductCategoryListMiddleware = (
  name: string
): IRequestMiddleware<
  "IResponseErrorValidation",
  Option<ReadonlyArray<ProductCategory>>
> => async (
  request
): Promise<
  Either<
    IResponse<"IResponseErrorValidation">,
    Option<ReadonlyArray<ProductCategory>>
  >
> =>
  new Promise(resolve => {
    // If the parameter is not found return None
    if (request.query[name] === undefined) {
      resolve(right(none));
      return;
    }

    const ProductCategoryCodec = fromEnum<ProductCategory>(
      "ProductCategory",
      ProductCategoryEnum
    );

    const validation = (request.query[name] as string)
      .trim()
      .split(",")
      .map(ProductCategoryCodec.decode)
      .map(cat =>
        cat.bimap(ResponseErrorFromValidationErrors(ProductCategory), identity)
      );

    const errors = A.partitionMap(validation, identity).left;

    if (errors.length > 0) {
      resolve(left(errors[0]));
      return;
    }

    resolve(right(some(A.partitionMap(validation, identity).right)));
  });
