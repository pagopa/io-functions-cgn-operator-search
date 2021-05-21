/* tslint:disable: no-any */

import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";
import { none, some } from "fp-ts/lib/Option";
import { OnlineMerchantSearchRequest } from "../../generated/definitions/OnlineMerchantSearchRequest";
import { ProductCategoryEnum } from "../../generated/definitions/ProductCategory";
import { ProductCategoryEnumModelType } from "../../models/ProductCategories";
import { GetOnlineMerchantsHandler } from "../handler";

const anEmptyArrayPromise = new Promise(resolve => {
  resolve([]);
});

const anOnlineMerchant = {
  id: "agreement_1",
  name: "PagoPa",
  website_url: "https://pagopa.it",
  product_categories: [
    ProductCategoryEnumModelType.arts,
    ProductCategoryEnumModelType.sports
  ]
};

const anOnlineMerchantList = [
  anOnlineMerchant,
  {
    ...anOnlineMerchant,
    product_categories: [
      ProductCategoryEnumModelType.transportation,
      ProductCategoryEnumModelType.travels
    ]
  },
  {
    ...anOnlineMerchant,
    product_categories: [
      ProductCategoryEnumModelType.entertainments,
      ProductCategoryEnumModelType.connectivity,
      ProductCategoryEnumModelType.books,
      ProductCategoryEnumModelType.health
    ]
  }
];

const anOnlineMerchantResponse = {
  id: anOnlineMerchant.id,
  name: anOnlineMerchant.name,
  websiteUrl: anOnlineMerchant.website_url,
  productCategories: [ProductCategoryEnum.arts, ProductCategoryEnum.sports]
};

const anExpectedResponse = {
  items: [
    anOnlineMerchantResponse,
    {
      ...anOnlineMerchantResponse,
      productCategories: [
        ProductCategoryEnum.transportation,
        ProductCategoryEnum.travels
      ]
    },
    {
      ...anOnlineMerchantResponse,
      productCategories: [
        ProductCategoryEnum.entertainments,
        ProductCategoryEnum.connectivity,
        ProductCategoryEnum.books,
        ProductCategoryEnum.health
      ]
    }
  ]
};

const queryMock = jest.fn().mockImplementation((_, __) => {
  return new Promise(resolve => {
    resolve(anOnlineMerchantList);
  });
});

const cgnOperatorDbMock = { query: queryMock };

const searchRequestBody = {};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GetOnlineMerchantsHandler", () => {
  it("should return the result when no parameter is passed", async () => {
    const response = await GetOnlineMerchantsHandler(cgnOperatorDbMock as any)(
      {} as any,
      searchRequestBody as OnlineMerchantSearchRequest
    );
    expect(queryMock).toBeCalledTimes(1);
    expect(response.kind).toBe("IResponseSuccessJson");
    if (response.kind === "IResponseSuccessJson") {
      expect(response.value).toEqual(anExpectedResponse);
    }
  });

  it("should add to the db query the merchant name filter, lowering its case", async () => {
    queryMock.mockImplementationOnce((query, params) => {
      expect(query).toMatch(/AND searchable_name LIKE/);
      expect(params.replacements.name_filter).toBe("%a company%");

      return anEmptyArrayPromise;
    });

    const response = await GetOnlineMerchantsHandler(cgnOperatorDbMock as any)(
      {} as any,
      {merchantName: "A Company"} as OnlineMerchantSearchRequest
    );
    expect(queryMock).toBeCalledTimes(1);
    expect(response.kind).toBe("IResponseSuccessJson");
  });

  it("should add to the db query the product category filters", async () => {
    queryMock.mockImplementationOnce((query, _) => {
      expect(query).toMatch(/AND \(arts OR entertainments\)/);

      return anEmptyArrayPromise;
    });

    const response = await GetOnlineMerchantsHandler(cgnOperatorDbMock as any)(
      {} as any,
       {productCategories: [ProductCategoryEnum.arts, ProductCategoryEnum.entertainments]} as OnlineMerchantSearchRequest 
    );
    expect(queryMock).toBeCalledTimes(1);
    expect(response.kind).toBe("IResponseSuccessJson");
  });

  it("should add to the db query all the product category filters", async () => {
    queryMock.mockImplementationOnce((query, _) => {
      expect(query).toMatch(
        /AND \(travels OR transportation OR connectivity OR books OR sports OR health\)/
      );

      return anEmptyArrayPromise;
    });

    const response = await GetOnlineMerchantsHandler(cgnOperatorDbMock as any)(
      {} as any,
      {productCategories: [ProductCategoryEnum.travels,
        ProductCategoryEnum.transportation,
        ProductCategoryEnum.connectivity,
        ProductCategoryEnum.books,
        ProductCategoryEnum.sports,
        ProductCategoryEnum.health]} as OnlineMerchantSearchRequest 

    );
    expect(queryMock).toBeCalledTimes(1);
    expect(response.kind).toBe("IResponseSuccessJson");
  });

  it("should add to the db query the pagination parameters", async () => {
    queryMock.mockImplementationOnce((query, _) => {
      expect(query).toMatch(/LIMIT 10\nOFFSET 20$/);

      return anEmptyArrayPromise;
    });

    const response = await GetOnlineMerchantsHandler(cgnOperatorDbMock as any)(
      {} as any,
      {page: 2, pageSize: 10} as OnlineMerchantSearchRequest 
    );
    expect(queryMock).toBeCalledTimes(1);
    expect(response.kind).toBe("IResponseSuccessJson");
  });

  it("should return an InternalServerError when there is an issue quering the db", async () => {
    queryMock.mockImplementationOnce(
      (_, __) =>
        new Promise(resolve => {
          throw Error("fail to connect to db");
        })
    );

    const response = await GetOnlineMerchantsHandler(cgnOperatorDbMock as any)(
      {} as any,
      {page: 0, pageSize: 20} as OnlineMerchantSearchRequest 
    );
    expect(queryMock).toBeCalledTimes(1);
    expect(response.kind).toBe("IResponseErrorInternal");
  });
});
