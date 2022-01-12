import {
  IResponse,
  ResponseErrorFromValidationErrors
} from "@pagopa/ts-commons/lib/responses";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import * as O from "fp-ts/lib/Option";
import * as t from "io-ts";
import { flow, pipe } from "fp-ts/lib/function";
import { Request } from "express";
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

const CommaSeparatedListOf = (
  decoder: t.Mixed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): t.Type<ReadonlyArray<any>, string, unknown> =>
  new t.Type<ReadonlyArray<t.TypeOf<typeof decoder>>, string, unknown>(
    `CommaSeparatedListOf<${decoder.name}>`,
    (value: unknown): value is ReadonlyArray<t.TypeOf<typeof decoder>> =>
      Array.isArray(value) && value.every(e => decoder.is(e)),
    input =>
      t.readonlyArray(decoder).decode(
        typeof input === "string"
          ? input
              .split(",")
              .map(e => e.trim())
              .filter(Boolean)
          : !input
          ? [] // fallback to empty array in case of empty input
          : input // it should not happen, but in case we let the decoder fail
      ),
    String
  );

export const OptionalProductCategoryListMiddleware = (name: string) => async (
  request: Request
): Promise<
  E.Either<
    IResponse<"IResponseErrorValidation">,
    O.Option<ReadonlyArray<ProductCategory>>
  >
> =>
  pipe(
    O.fromNullable(request.query[name]),
    O.fold(
      () => TE.of(O.none),
      flow(
        CommaSeparatedListOf(productCategoryCodec).decode,
        TE.fromEither,
        TE.bimap(ResponseErrorFromValidationErrors(ProductCategory), O.some)
      )
    )
  )();
