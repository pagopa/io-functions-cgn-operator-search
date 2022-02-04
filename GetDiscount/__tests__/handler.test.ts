import { withoutUndefinedValues } from "@pagopa/ts-commons/lib/types";
import * as O from "fp-ts/lib/Option";
import { GetDiscountHandler } from "../handler";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import {
  ProductCategoryEnumModelType,
  ProductCategoryFromModel
} from "../../models/ProductCategories";
import {
  DiscountCodeTypeEnumModel,
  DiscountCodeTypeFromModel
} from "../../models/DiscountCodeTypes";

const now = new Date();
const aDiscountDetailModel = {
  discount_id: 1,
  operator_id: "anOperatorId",
  condition: "aCondition",
  discount_code_type: DiscountCodeTypeEnumModel.api,
  discount_name: "discount_name",
  end_date: now,
  product_categories: [ProductCategoryEnumModelType.bankingServices],
  start_date: now,
  static_code: "ASTATIC_CODE"
};

const anExpectedDiscountDetailResponse = {
  condition: aDiscountDetailModel.condition,
  id: aDiscountDetailModel.discount_id,
  merchantId: aDiscountDetailModel.operator_id,
  name: aDiscountDetailModel.discount_name,
  startDate: aDiscountDetailModel.start_date,
  endDate: aDiscountDetailModel.end_date,
  discountCodeType: DiscountCodeTypeFromModel(
    aDiscountDetailModel.discount_code_type
  ),
  productCategories: aDiscountDetailModel.product_categories.map(
    ProductCategoryFromModel
  ),
  staticCode: aDiscountDetailModel.static_code
};
const aDiscountDetailtModelList = [aDiscountDetailModel];

const aWrongDiscountDetailModel = {
  ...aDiscountDetailModel,
  discount_name: 5
};

const queryMock = jest
  .fn()
  .mockImplementation((_, __) => Promise.resolve(aDiscountDetailtModelList));

const cgnOperatorDbMock = { query: queryMock };

const aDiscountId = "aDiscountId" as NonEmptyString;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GetDiscountHandler", () => {
  it("should return an internal error if query fails", async () => {
    queryMock.mockImplementationOnce(() => Promise.reject("Cannot query db"));
    const response = await GetDiscountHandler(cgnOperatorDbMock as any)(
      {} as any,
      aDiscountId,
      O.none
    );
    expect(queryMock).toBeCalledTimes(1);

    expect(response.kind).toBe("IResponseErrorInternal");
    if (response.kind === "IResponseErrorInternal") {
      expect(response.detail).toEqual("Internal server error: Cannot query db");
    }
  });

  it("should return an internal error if results decode fails", async () => {
    queryMock.mockImplementationOnce(() =>
      Promise.resolve([aWrongDiscountDetailModel])
    );
    const response = await GetDiscountHandler(cgnOperatorDbMock as any)(
      {} as any,
      aDiscountId,
      O.none
    );
    expect(queryMock).toBeCalledTimes(1);

    expect(response.kind).toBe("IResponseErrorInternal");
  });

  it("should return a Not Found Error if query returns empty result", async () => {
    queryMock.mockImplementationOnce(() => Promise.resolve([]));
    const response = await GetDiscountHandler(cgnOperatorDbMock as any)(
      {} as any,
      aDiscountId,
      O.none
    );
    expect(queryMock).toBeCalledTimes(1);

    expect(response.kind).toBe("IResponseErrorNotFound");
  });

  it("should return success if there is a result to show", async () => {
    const response = await GetDiscountHandler(cgnOperatorDbMock as any)(
      {} as any,
      aDiscountId,
      O.none
    );
    expect(queryMock).toBeCalledTimes(1);
    console.log(JSON.stringify(response));
    expect(response.kind).toBe("IResponseSuccessJson");
    if (response.kind === "IResponseSuccessJson") {
      expect(response.value).toEqual(anExpectedDiscountDetailResponse);
    }
  });

  it("should return success without secret attributes if external header is set", async () => {
    const response = await GetDiscountHandler(cgnOperatorDbMock as any)(
      {} as any,
      aDiscountId,
      O.some("anExternalHeader" as NonEmptyString)
    );
    expect(queryMock).toBeCalledTimes(1);
    console.log(JSON.stringify(response));
    expect(response.kind).toBe("IResponseSuccessJson");
    if (response.kind === "IResponseSuccessJson") {
      expect(response.value).toEqual(
        withoutUndefinedValues({
          ...anExpectedDiscountDetailResponse,
          staticCode: undefined
        })
      );
    }
  });
});
