import {
  IResponse,
  ResponseErrorFromValidationErrors
} from "@pagopa/ts-commons/lib/responses";
import { Either, right, left } from "fp-ts/lib/Either";
import { fromNullable, none, Option, some } from "fp-ts/lib/Option";
import { IRequestMiddleware } from "io-functions-commons/dist/src/utils/request_middleware";
import * as t from "io-ts";
import * as A from "fp-ts/lib/Array";
import { identity } from "fp-ts/lib/function";
import { fromEither, taskEither } from "fp-ts/lib/TaskEither";
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

const productCategoryCodec = fromEnum<ProductCategory>(
  "ProductCategory",
  ProductCategoryEnum
);

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
  taskEither
    .of<IResponse<"IResponseErrorValidation">, Option<unknown>>(
      fromNullable(request.query[name])
    )
    .chain(maybeQuery =>
      maybeQuery.foldL(
        () => taskEither.of(none),
        query =>
          fromEither(
            A.array
              .of(
                A.partitionMap(
                  (query as string)
                    .trim()
                    .split(",")
                    .map(productCategoryCodec.decode)
                    .map(cat =>
                      cat.bimap(
                        ResponseErrorFromValidationErrors(ProductCategory),
                        identity
                      )
                    ),
                  identity
                )
              )
              .map<
                Either<
                  IResponse<"IResponseErrorValidation">,
                  Option<ReadonlyArray<ProductCategory>>
                >
              >(separated =>
                separated.left.length > 0
                  ? left(separated.left[0])
                  : right(some(separated.right))
              )[0]
          )
      )
    )
    .run();
