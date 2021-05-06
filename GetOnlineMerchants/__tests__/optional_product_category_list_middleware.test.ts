// eslint-disable @typescript-eslint/no-explicit-any

import { isLeft, isRight } from "fp-ts/lib/Either";
import { isNone, isSome } from "fp-ts/lib/Option";
import { ProductCategoryEnum } from "../../generated/definitions/ProductCategory";

import { OptionalProductCategoryListMiddleware } from "../optional_product_category_list_middleware";

const middleware = OptionalProductCategoryListMiddleware("param");

describe("OptionalProductCategoryListMiddleware", () => {
  it("should respond with none if the parameter is missing", async () => {
    const result = await middleware({
      query: {}
    } as any);

    expect(isRight(result)).toBeTruthy();
    expect(isRight(result)).toBeTruthy();
    if (isRight(result)) {
      const maybeValue = result.value;
      expect(isNone(maybeValue)).toBeTruthy();
    }
  });

  it("should respond with a validation error if the parameter is present but NOT valid", async () => {
    const result = await middleware({
      query: {
        param: "something"
      }
    } as any);

    expect(isLeft(result)).toBeTruthy();
    if (isLeft(result)) {
      expect(result.value.kind).toBe("IResponseErrorValidation");
    }
  });

  it("should extract the parameter if it is present and valid", async () => {
    const result = await middleware({
      query: {
        param: "arts,entertainments"
      }
    } as any);

    expect(isRight(result)).toBeTruthy();
    if (isRight(result)) {
      const maybeValue = result.value;
      expect(isSome(maybeValue)).toBeTruthy();
      if (isSome(maybeValue)) {
        const value = maybeValue.value;
        expect(value).toStrictEqual([
          ProductCategoryEnum.arts,
          ProductCategoryEnum.entertainments
        ]);
      }
    }
  });
});
