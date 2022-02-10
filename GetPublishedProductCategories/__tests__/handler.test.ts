/* tslint:disable: no-any */
import { DiscountCodeTypeEnum } from "../../generated/definitions/DiscountCodeType";
import { OnlineMerchantSearchRequest } from "../../generated/definitions/OnlineMerchantSearchRequest";
import { ProductCategoryEnum } from "../../generated/definitions/ProductCategory";
import { DiscountCodeTypeEnumModel } from "../../models/DiscountCodeTypes";
import { ProductCategoryEnumModelType } from "../../models/ProductCategories";
import { GetPublishedProductCategoriesHandler } from "../handler";

const anEmptyArrayPromise = new Promise(resolve => {
  resolve([]);
});

const firstPublishedProductCategoryModel = {
  product_category: ProductCategoryEnumModelType.cultureAndEntertainment
};

const secondPublishedProductCategoryModel = {
  product_category: ProductCategoryEnumModelType.sports
};

const aPublishedProductCategoryList = [
  firstPublishedProductCategoryModel,
  secondPublishedProductCategoryModel
];

const anExpectedResponse = {
  items: [
    ProductCategoryEnum.cultureAndEntertainment,
    ProductCategoryEnum.sports
  ]
};

const queryMock = jest.fn().mockImplementation((_, __) => {
  return new Promise(resolve => {
    resolve(aPublishedProductCategoryList);
  });
});

const cgnOperatorDbMock = { query: queryMock };

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GetPublishedProductCategoriesHandler", () => {
  it("should return the result if no errors occur", async () => {
    const response = await GetPublishedProductCategoriesHandler(
      cgnOperatorDbMock as any
    )();
    expect(queryMock).toBeCalledTimes(1);
    expect(response.kind).toBe("IResponseSuccessJson");
    if (response.kind === "IResponseSuccessJson") {
      expect(response.value).toEqual(anExpectedResponse);
    }
  });

  it("should return an InternalServerError when there is an issue quering the db", async () => {
    queryMock.mockImplementationOnce(
      (_, __) =>
        new Promise(resolve => {
          throw Error("fail to connect to db");
        })
    );

    const response = await GetPublishedProductCategoriesHandler(
      cgnOperatorDbMock as any
    )();
    expect(queryMock).toBeCalledTimes(1);
    expect(response.kind).toBe("IResponseErrorInternal");
  });
});
