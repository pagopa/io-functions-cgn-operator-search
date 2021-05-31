// eslint-disable @typescript-eslint/no-explicit-any

import * as t from "io-ts";

import { isLeft, isRight } from "fp-ts/lib/Either";
import { isNone, isSome } from "fp-ts/lib/Option";

import { OptionalHeaderParamMiddleware } from "../optional_header_param";

const middleware = OptionalHeaderParamMiddleware("param", t.string);

const mockHeader = jest.fn().mockReturnValue("param");
const mockReq = {
  header: mockHeader
};

describe("OptionalHeaderMiddleware", () => {
  it("should respond with none if the header parameter is missing", async () => {
    mockHeader.mockReturnValueOnce(undefined);
    const result = await middleware(mockReq as any);

    expect(isRight(result)).toBeTruthy();
    expect(isRight(result)).toBeTruthy();
    if (isRight(result)) {
      const maybeValue = result.value;
      expect(isNone(maybeValue)).toBeTruthy();
    }
  });

  it("should respond with a validation error if the parameter is present but NOT valid", async () => {
    mockHeader.mockReturnValueOnce(2);
    const result = await middleware(mockReq as any);

    expect(isLeft(result)).toBeTruthy();
    if (isLeft(result)) {
      expect(result.value.kind).toBe("IResponseErrorValidation");
    }
  });

  it("should extract the parameter if it is present and valid", async () => {
    const result = await middleware(mockReq as any);

    expect(isRight(result)).toBeTruthy();
    if (isRight(result)) {
      const maybeValue = result.value;
      expect(isSome(maybeValue)).toBeTruthy();
      if (isSome(maybeValue)) {
        const value = maybeValue.value;
        expect(value).toBe("param");
      }
    }
  });
});
