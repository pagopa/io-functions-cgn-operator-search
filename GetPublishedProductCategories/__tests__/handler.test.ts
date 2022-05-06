/* tslint:disable: no-any */
import * as O from "fp-ts/lib/Option";
import { ProductCategoryEnum } from "../../generated/definitions/ProductCategory";
import { ProductCategoryEnumModelType } from "../../models/ProductCategories";
import { GetPublishedProductCategoriesHandler } from "../handler";

const anEmptyArrayPromise = new Promise(resolve => {
  resolve([]);
});

const firstPublishedProductCategoryModel = {
  product_category: ProductCategoryEnumModelType.cultureAndEntertainment,
  new_discounts: 1
};

const secondPublishedProductCategoryModel = {
  product_category: ProductCategoryEnumModelType.sports,
  new_discounts: 2
};

const aPublishedProductCategoryList = [
  firstPublishedProductCategoryModel,
  secondPublishedProductCategoryModel
];

const anExpectedResponseWithOnlyCategories = {
  items: [
    ProductCategoryEnum.cultureAndEntertainment,
    ProductCategoryEnum.sports
  ]
};

const anExpectedResponseWithNewDiscountsCount = {
  items: [
    {
      productCategory: ProductCategoryEnum.cultureAndEntertainment,
      newDiscounts: 1
    },
    { productCategory: ProductCategoryEnum.sports, newDiscounts: 2 }
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

describe("GetPublishedProductCategoriesHandler |> maybeCountNewDiscounts = None", () => {
  it("should return the result with only categories array if no errors occur", async () => {
    const response = await GetPublishedProductCategoriesHandler(
      cgnOperatorDbMock as any
    )(O.none);
    expect(queryMock).toBeCalledTimes(1);
    expect(response.kind).toBe("IResponseSuccessJson");
    if (response.kind === "IResponseSuccessJson") {
      expect(response.value).toEqual(anExpectedResponseWithOnlyCategories);
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
    )(O.none);
    expect(queryMock).toBeCalledTimes(1);
    expect(response.kind).toBe("IResponseErrorInternal");
  });
});

describe("GetPublishedProductCategoriesHandler |> maybeCountNewDiscounts = Some(boolean)", () => {
  it("should return the result with counts if no errors occur and param is true", async () => {
    const response = await GetPublishedProductCategoriesHandler(
      cgnOperatorDbMock as any
    )(O.some(true));
    expect(queryMock).toBeCalledTimes(1);
    expect(response.kind).toBe("IResponseSuccessJson");
    if (response.kind === "IResponseSuccessJson") {
      expect(response.value).toEqual(anExpectedResponseWithNewDiscountsCount);
    }
  });

  it("should return the result with only categories array if no errors occur and param is false", async () => {
    const response = await GetPublishedProductCategoriesHandler(
      cgnOperatorDbMock as any
    )(O.some(false));
    expect(queryMock).toBeCalledTimes(1);
    expect(response.kind).toBe("IResponseSuccessJson");
    if (response.kind === "IResponseSuccessJson") {
      expect(response.value).toEqual(anExpectedResponseWithOnlyCategories);
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
    )(O.some(true));
    expect(queryMock).toBeCalledTimes(1);
    expect(response.kind).toBe("IResponseErrorInternal");
  });
});
