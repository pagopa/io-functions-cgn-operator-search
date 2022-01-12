/* tslint:disable: no-any */
import { DiscountCodeType, DiscountCodeTypeEnum } from "../../generated/definitions/DiscountCodeType";
import { OnlineMerchantSearchRequest } from "../../generated/definitions/OnlineMerchantSearchRequest";
import { ProductCategoryEnum } from "../../generated/definitions/ProductCategory";
import { DiscountCodeTypeEnumModel } from "../../models/DiscountCodeTypes";
import { ProductCategoryEnumModelType } from "../../models/ProductCategories";
import { GetOnlineMerchantsHandler } from "../handler";

const anEmptyArrayPromise = new Promise(resolve => {
  resolve([]);
});

const anOnlineMerchant = {
  id: "agreement_1",
  name: "PagoPa",
  website_url: "https://pagopa.it",
  discount_code_type: DiscountCodeTypeEnumModel.static,
  product_categories: [
    ProductCategoryEnumModelType.entertainment,
    ProductCategoryEnumModelType.sports
  ]
};

const anOnlineMerchantList = [
  anOnlineMerchant,
  {
    ...anOnlineMerchant,
    product_categories: [
      ProductCategoryEnumModelType.shopping,
      ProductCategoryEnumModelType.travelling
    ]
  },
  {
    ...anOnlineMerchant,
    product_categories: [
      ProductCategoryEnumModelType.entertainment,
      ProductCategoryEnumModelType.services,
      ProductCategoryEnumModelType.learning,
      ProductCategoryEnumModelType.health
    ]
  }
];

const anOnlineMerchantResponse = {
  id: anOnlineMerchant.id,
  name: anOnlineMerchant.name,
  websiteUrl: anOnlineMerchant.website_url,
  discountCodeType: DiscountCodeTypeEnum.static,
  productCategories: [ProductCategoryEnum.entertainment, ProductCategoryEnum.sports]
};

const anExpectedResponse = {
  items: [
    anOnlineMerchantResponse,
    {
      ...anOnlineMerchantResponse,
      productCategories: [
        ProductCategoryEnum.shopping,
        ProductCategoryEnum.travelling
      ]
    },
    {
      ...anOnlineMerchantResponse,
      productCategories: [
        ProductCategoryEnum.entertainment,
        ProductCategoryEnum.services,
        ProductCategoryEnum.learning,
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
      expect(query).toMatch(/AND \(foodDrink OR entertainment\)/);

      return anEmptyArrayPromise;
    });

    const response = await GetOnlineMerchantsHandler(cgnOperatorDbMock as any)(
      {} as any,
       {productCategories: [ProductCategoryEnum.foodDrink, ProductCategoryEnum.entertainment]} as OnlineMerchantSearchRequest 
    );
    expect(queryMock).toBeCalledTimes(1);
    expect(response.kind).toBe("IResponseSuccessJson");
  });

  it("should add to the db query all the product category filters", async () => {
    queryMock.mockImplementationOnce((query, _) => {
      expect(query).toMatch(
        /AND \(travelling OR shopping OR services OR learning OR sports OR health\)/
      );

      return anEmptyArrayPromise;
    });

    const response = await GetOnlineMerchantsHandler(cgnOperatorDbMock as any)(
      {} as any,
      {productCategories: [ProductCategoryEnum.travelling,
        ProductCategoryEnum.shopping,
        ProductCategoryEnum.services,
        ProductCategoryEnum.learning,
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
