/* tslint:disable: no-any */
import { DiscountBucketCode } from "../../generated/definitions/DiscountBucketCode";
import { GetDiscountBucketCodeHandler } from "../handler";

const aDiscountFk = "1";
const aBucketCodeK = "1";
const aBucketCode = "acode";

const aDiscountBucketCode = {
  bucket_code_k: aBucketCodeK,
  bucket_code_load_id: 1,
  code: aBucketCode,
  discount_fk: aDiscountFk,
  used: false
};

const selectMockResult = jest.fn().mockImplementation(
  () =>
    new Promise(resolve => {
      resolve([aDiscountBucketCode]);
    })
);

const updateMockResult = jest.fn().mockImplementation(
  () =>
    new Promise(resolve => {
      resolve([undefined, 1]);
    })
);

const queryMock = jest.fn().mockImplementation((query: string, params) => {
  if (query.includes("FROM discount_bucket_code")) {
    expect(params.replacements.discount_fk).toBe(aDiscountFk);
    return selectMockResult();
  } else if (query.includes("UPDATE discount_bucket_code")) {
    expect(params.replacements.bucket_code_k).toBe(aBucketCodeK);
    return updateMockResult();
  } else {
    fail("Unexpected SQL query");
  }
});

const transactionMock = jest.fn().mockImplementation(
  async <A>(a: () => A): Promise<A> => {
    return a();
  }
);

const cgnOperatorDbMock = { query: queryMock, transaction: transactionMock };

const anExpectedResponse: DiscountBucketCode = { code: aBucketCode };

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GetDiscountBucketCodeHandler", () => {
  it("should return a IResponseSuccessJson with a discount bucket code by discount id", async () => {
    const response = await GetDiscountBucketCodeHandler(
      cgnOperatorDbMock as any
    )({} as any, aDiscountFk);
    expect(response.kind).toBe("IResponseSuccessJson");
    expect(transactionMock).toBeCalledTimes(1);
    expect(queryMock).toBeCalledTimes(2);
    expect(selectMockResult).toBeCalledTimes(1);
    expect(updateMockResult).toBeCalledTimes(1);
    if (response.kind === "IResponseSuccessJson") {
      expect(response.value).toEqual(anExpectedResponse);
    }
  });

  it("should return a IResponseErrorNotFound if no code is found", async () => {
    selectMockResult.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolve([]);
        })
    );

    const response = await GetDiscountBucketCodeHandler(
      cgnOperatorDbMock as any
    )({} as any, aDiscountFk);
    expect(response.kind).toBe("IResponseErrorNotFound");
    expect(transactionMock).toBeCalledTimes(1);
    expect(queryMock).toBeCalledTimes(1);
    expect(selectMockResult).toBeCalledTimes(1);
    expect(updateMockResult).not.toHaveBeenCalled();
  });

  it("should return a IResponseErrorInternal if any error is thrown during select", async () => {
    selectMockResult.mockImplementationOnce(() => {
      throw Error("Any error on select");
    });

    const response = await GetDiscountBucketCodeHandler(
      cgnOperatorDbMock as any
    )({} as any, aDiscountFk);
    expect(response.kind).toBe("IResponseErrorInternal");
    expect(transactionMock).toBeCalledTimes(1);
    expect(queryMock).toBeCalledTimes(1);
    expect(selectMockResult).toBeCalledTimes(1);
    expect(updateMockResult).not.toHaveBeenCalled();
    if (response.kind === "IResponseErrorInternal") {
      expect(response.detail).toEqual(
        "Internal server error: Any error on select"
      );
    }
  });

  it("should return a IResponseErrorInternal if any error is thrown during update", async () => {
    updateMockResult.mockImplementationOnce(() => {
      throw Error("Any error on update");
    });

    const response = await GetDiscountBucketCodeHandler(
      cgnOperatorDbMock as any
    )({} as any, aDiscountFk);
    expect(response.kind).toBe("IResponseErrorInternal");
    expect(transactionMock).toBeCalledTimes(1);
    expect(queryMock).toBeCalledTimes(2);
    expect(selectMockResult).toBeCalledTimes(1);
    expect(updateMockResult).toBeCalledTimes(1);
    if (response.kind === "IResponseErrorInternal") {
      expect(response.detail).toEqual(
        "Internal server error: Any error on update"
      );
    }
  });

  it("should return a IResponseErrorInternal if no update is executed", async () => {
    updateMockResult.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolve([undefined, 0]);
        })
    );

    const response = await GetDiscountBucketCodeHandler(
      cgnOperatorDbMock as any
    )({} as any, aDiscountFk);
    expect(response.kind).toBe("IResponseErrorInternal");
    expect(transactionMock).toBeCalledTimes(1);
    expect(queryMock).toBeCalledTimes(2);
    expect(selectMockResult).toBeCalledTimes(1);
    expect(updateMockResult).toBeCalledTimes(1);
    if (response.kind === "IResponseErrorInternal") {
      expect(response.detail).toEqual(
        "Internal server error: Cannot update the bucket code"
      );
    }
  });
});
