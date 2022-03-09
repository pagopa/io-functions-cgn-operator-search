/* tslint:disable: no-any */
import { Transaction } from "sequelize/types";
import { DiscountBucketCode } from "../../generated/definitions/DiscountBucketCode";
import { GetDiscountBucketCodeHandler } from "../handler";
import * as TE from "fp-ts/lib/TaskEither";
import * as O from "fp-ts/lib/Option";
import * as redisStorage from "../../utils/redis_storage";
import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";

const aDiscountFk = "1";
const aBucketCodeK = 1;
const aBucketCode = "acode";

const aDiscountBucketCode = {
  bucket_code_k: aBucketCodeK,
  bucket_code_load_id: 1,
  code: aBucketCode,
  discount_fk: aDiscountFk,
  used: false
};

const selectMockResult = jest
  .fn()
  .mockImplementation(() =>
    Promise.resolve([
      aDiscountBucketCode,
      aDiscountBucketCode,
      aDiscountBucketCode
    ])
  );

const updateMockResult = jest
  .fn()
  .mockImplementation(() => Promise.resolve([undefined, 3]));

const queryMock = jest.fn().mockImplementation((query: string, params) => {
  if (query.includes("FROM discount_bucket_code")) {
    expect(params.replacements.discount_fk).toBe(aDiscountFk);
    return selectMockResult();
  } else if (query.includes("UPDATE discount_bucket_code")) {
    expect(params.replacements.bucket_code_k_list).toEqual([
      aBucketCodeK,
      aBucketCodeK,
      aBucketCodeK
    ]);
    return updateMockResult();
  } else {
    fail("Unexpected SQL query");
  }
});

const transactionMock = ({
  commit: jest.fn().mockImplementation(() => Promise.resolve(void 0)),
  rollback: jest.fn().mockImplementation(() => Promise.resolve(void 0))
} as unknown) as Transaction;

const cgnOperatorDbMock = {
  query: queryMock,
  transaction: jest
    .fn()
    .mockImplementation(() => Promise.resolve(transactionMock))
};

const anExpectedResponse: DiscountBucketCode = { code: aBucketCode };

beforeEach(() => {
  jest.clearAllMocks();
});

const popFromListMock = jest
  .fn()
  .mockImplementation(() => TE.of(O.some(aBucketCode)));

const pushInListMock = jest.fn().mockImplementation(() => TE.of(true));
jest.spyOn(redisStorage, "popFromList").mockImplementation(popFromListMock);

jest.spyOn(redisStorage, "pushInList").mockImplementation(pushInListMock);

describe("GetDiscountBucketCodeHandler", () => {
  it("should return a IResponseSuccessJson with a discount bucket code by discount id if Redis does not contain any discount codes", async () => {
    popFromListMock.mockImplementationOnce(() => TE.of(O.none));
    const response = await GetDiscountBucketCodeHandler(
      cgnOperatorDbMock as any,
      {} as any,
      100 as NonNegativeInteger
    )({} as any, aDiscountFk);

    expect(popFromListMock).toBeCalledTimes(1);
    expect(queryMock).toBeCalledTimes(2);
    expect(selectMockResult).toBeCalledTimes(1);
    expect(updateMockResult).toBeCalledTimes(1);
    expect(transactionMock.commit).toBeCalledTimes(1);
    expect(pushInListMock).toBeCalledTimes(1);
    expect(pushInListMock).toHaveBeenCalledWith({}, aDiscountFk, [
      aBucketCode,
      aBucketCode
    ]);

    expect(response.kind).toBe("IResponseSuccessJson");
    if (response.kind === "IResponseSuccessJson") {
      expect(response.value).toEqual(anExpectedResponse);
    }
  });

  it("should return a IResponseSuccessJson with a discount bucket code by discount id if Redis contains some discount codes", async () => {
    const response = await GetDiscountBucketCodeHandler(
      cgnOperatorDbMock as any,
      {} as any,
      100 as NonNegativeInteger
    )({} as any, aDiscountFk);

    expect(popFromListMock).toBeCalledTimes(1);
    expect(queryMock).not.toBeCalled();
    expect(selectMockResult).not.toBeCalled();
    expect(updateMockResult).not.toBeCalled();
    expect(transactionMock.commit).not.toBeCalled();
    expect(pushInListMock).not.toBeCalled();

    expect(response.kind).toBe("IResponseSuccessJson");
    if (response.kind === "IResponseSuccessJson") {
      expect(response.value).toEqual(anExpectedResponse);
    }
  });

  it("should return a IResponseSuccessJson with a discount bucket code by discount id if Redis pop is unreacheable", async () => {
    popFromListMock.mockImplementationOnce(() =>
      TE.left(new Error("ENOTFOUND"))
    );
    const response = await GetDiscountBucketCodeHandler(
      cgnOperatorDbMock as any,
      {} as any,
      100 as NonNegativeInteger
    )({} as any, aDiscountFk);

    expect(popFromListMock).toBeCalledTimes(1);
    expect(queryMock).toBeCalledTimes(2);
    expect(selectMockResult).toBeCalledTimes(1);
    expect(updateMockResult).toBeCalledTimes(1);
    expect(transactionMock.commit).toBeCalledTimes(1);
    expect(pushInListMock).not.toBeCalled();

    expect(response.kind).toBe("IResponseSuccessJson");
    if (response.kind === "IResponseSuccessJson") {
      expect(response.value).toEqual(anExpectedResponse);
    }
  });

  it("should return a IResponseErrorNotFound if no code is found", async () => {
    selectMockResult.mockImplementationOnce(() => Promise.resolve([]));
    popFromListMock.mockImplementationOnce(() => TE.of(O.none));
    const response = await GetDiscountBucketCodeHandler(
      cgnOperatorDbMock as any,
      {} as any,
      100 as NonNegativeInteger
    )({} as any, aDiscountFk);
    expect(response.kind).toBe("IResponseErrorNotFound");
    expect(transactionMock.rollback).toBeCalledTimes(1);
    expect(queryMock).toBeCalledTimes(1);
    expect(selectMockResult).toBeCalledTimes(1);
    expect(updateMockResult).not.toHaveBeenCalled();
  });

  it("should return a IResponseErrorInternal if any error is thrown during select", async () => {
    selectMockResult.mockImplementationOnce(() =>
      Promise.reject("Any error on select")
    );
    popFromListMock.mockImplementationOnce(() => TE.of(O.none));
    const response = await GetDiscountBucketCodeHandler(
      cgnOperatorDbMock as any,
      {} as any,
      100 as NonNegativeInteger
    )({} as any, aDiscountFk);
    expect(response.kind).toBe("IResponseErrorInternal");
    expect(transactionMock.rollback).toBeCalledTimes(1);
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
    updateMockResult.mockImplementationOnce(() =>
      Promise.reject("Any error on update")
    );
    popFromListMock.mockImplementationOnce(() => TE.of(O.none));
    const response = await GetDiscountBucketCodeHandler(
      cgnOperatorDbMock as any,
      {} as any,
      100 as NonNegativeInteger
    )({} as any, aDiscountFk);
    expect(response.kind).toBe("IResponseErrorInternal");
    expect(transactionMock.rollback).toBeCalledTimes(1);
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
    updateMockResult.mockImplementationOnce(() =>
      Promise.resolve([undefined, 0])
    );
    popFromListMock.mockImplementationOnce(() => TE.of(O.none));
    const response = await GetDiscountBucketCodeHandler(
      cgnOperatorDbMock as any,
      {} as any,
      100 as NonNegativeInteger
    )({} as any, aDiscountFk);
    expect(response.kind).toBe("IResponseErrorInternal");
    expect(transactionMock.rollback).toBeCalledTimes(1);
    expect(queryMock).toBeCalledTimes(2);
    expect(selectMockResult).toBeCalledTimes(1);
    expect(updateMockResult).toBeCalledTimes(1);
    if (response.kind === "IResponseErrorInternal") {
      expect(response.detail).toEqual(
        "Internal server error: Cannot update retrieved bucket codes"
      );
    }
  });
});
