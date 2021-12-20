// eslint-disable @typescript-eslint/no-explicit-any

import * as t from "io-ts";

import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";

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

    expect(E.isRight(result)).toBeTruthy();
    expect(E.isRight(result)).toBeTruthy();
    if (E.isRight(result)) {
      const maybeValue = result.right;
      expect(O.isNone(maybeValue)).toBeTruthy();
    }
  });

  it("should respond with a validation error if the parameter is present but NOT valid", async () => {
    mockHeader.mockReturnValueOnce(2);
    const result = await middleware(mockReq as any);

    expect(E.isLeft(result)).toBeTruthy();
    if (E.isLeft(result)) {
      expect(result.left.kind).toBe("IResponseErrorValidation");
    }
  });

  it("should extract the parameter if it is present and valid", async () => {
    const result = await middleware(mockReq as any);

    expect(E.isRight(result)).toBeTruthy();
    if (E.isRight(result)) {
      const maybeValue = result.right;
      expect(O.isSome(maybeValue)).toBeTruthy();
      if (O.isSome(maybeValue)) {
        const value = maybeValue.value;
        expect(value).toBe("param");
      }
    }
  });
});
