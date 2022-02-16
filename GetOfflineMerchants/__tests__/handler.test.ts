/* tslint:disable: no-any */

import {
  OfflineMerchantSearchRequest,
  OrderingEnum
} from "../../generated/definitions/OfflineMerchantSearchRequest";
import { ProductCategoryEnum } from "../../generated/definitions/ProductCategory";
import { ProductCategoryEnumModelType } from "../../models/ProductCategories";
import { GetOfflineMerchantsHandler } from "../handler";

const anEmptyArrayPromise = new Promise(resolve => {
  resolve([]);
});

const anOfflineMerchant = {
  id: "agreement_1",
  name: "PagoPa",
  address: "via Roma 1 Milano",
  latitude: 42.1234,
  longitude: 9.2456,
  distance: 10,
  product_categories: [
    ProductCategoryEnumModelType.cultureAndEntertainment,
    ProductCategoryEnumModelType.sports
  ]
};

const anOfflineMerchantList = [
  anOfflineMerchant,
  {
    ...anOfflineMerchant,
    product_categories: [
      ProductCategoryEnumModelType.bankingServices,
      ProductCategoryEnumModelType.travelling
    ]
  },
  {
    ...anOfflineMerchant,
    product_categories: [
      ProductCategoryEnumModelType.cultureAndEntertainment,
      ProductCategoryEnumModelType.sports,
      ProductCategoryEnumModelType.learning,
      ProductCategoryEnumModelType.health
    ]
  }
];

const anOfflineMerchantResponse = {
  id: anOfflineMerchant.id,
  name: anOfflineMerchant.name,
  address: {
    full_address: anOfflineMerchant.address,
    latitude: anOfflineMerchant.latitude,
    longitude: anOfflineMerchant.longitude
  },
  distance: anOfflineMerchant.distance,
  productCategories: [
    ProductCategoryEnum.cultureAndEntertainment,
    ProductCategoryEnum.sports
  ]
};

const anExpectedResponse = {
  items: [
    anOfflineMerchantResponse,
    {
      ...anOfflineMerchantResponse,
      productCategories: [
        ProductCategoryEnum.bankingServices,
        ProductCategoryEnum.travelling
      ]
    },
    {
      ...anOfflineMerchantResponse,
      productCategories: [
        ProductCategoryEnum.cultureAndEntertainment,
        ProductCategoryEnum.sports,
        ProductCategoryEnum.learning,
        ProductCategoryEnum.health
      ]
    }
  ]
};

const queryMock = jest.fn().mockImplementation((_, __) => {
  return new Promise(resolve => {
    resolve(anOfflineMerchantList);
  });
});

const cgnOperatorDbMock = { query: queryMock };

const aSearchRequestBody = {
  userCoordinates: {
    latitude: 45.61273504736962,
    longitude: 9.235292727136773
  },
  boundingBox: {
    coordinates: {
      latitude: 45.4673873,
      longitude: 9.18695985
    },
    deltaLatitude: 0.0489982,
    deltaLongitude: 0.0569915
  }
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GetOfflineMerchantsHandler", () => {
  it("should return the result when no parameter is passed", async () => {
    const response = await GetOfflineMerchantsHandler(cgnOperatorDbMock as any)(
      {} as any,
      aSearchRequestBody as OfflineMerchantSearchRequest
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

    const response = await GetOfflineMerchantsHandler(cgnOperatorDbMock as any)(
      {} as any,
      {
        ...aSearchRequestBody,
        merchantName: "A Company"
      } as OfflineMerchantSearchRequest
    );
    expect(queryMock).toBeCalledTimes(1);
    expect(response.kind).toBe("IResponseSuccessJson");
  });

  it("should add to the db query the product category filters", async () => {
    queryMock.mockImplementationOnce((query, _) => {
      expect(query).toMatch(/AND \(learning OR culture_and_entertainment\)/);

      return anEmptyArrayPromise;
    });

    const response = await GetOfflineMerchantsHandler(cgnOperatorDbMock as any)(
      {} as any,
      {
        ...aSearchRequestBody,
        productCategories: [
          ProductCategoryEnum.learning,
          ProductCategoryEnum.cultureAndEntertainment
        ]
      } as OfflineMerchantSearchRequest
    );
    expect(queryMock).toBeCalledTimes(1);
    expect(response.kind).toBe("IResponseSuccessJson");
  });

  it("should add to the db query all the product category filters", async () => {
    queryMock.mockImplementationOnce((query, _) => {
      expect(query).toMatch(
        /AND \(travelling OR banking_services OR sports OR learning OR sports OR health\)/
      );

      return anEmptyArrayPromise;
    });

    const response = await GetOfflineMerchantsHandler(cgnOperatorDbMock as any)(
      {} as any,
      {
        ...aSearchRequestBody,
        productCategories: [
          ProductCategoryEnum.travelling,
          ProductCategoryEnum.bankingServices,
          ProductCategoryEnum.sports,
          ProductCategoryEnum.learning,
          ProductCategoryEnum.sports,
          ProductCategoryEnum.health
        ]
      } as OfflineMerchantSearchRequest
    );
    expect(queryMock).toBeCalledTimes(1);
    expect(response.kind).toBe("IResponseSuccessJson");
  });

  it("should add to the db query the pagination parameters", async () => {
    queryMock.mockImplementationOnce((query, _) => {
      expect(query).toMatch(/LIMIT 10\nOFFSET 20$/);

      return anEmptyArrayPromise;
    });

    const response = await GetOfflineMerchantsHandler(cgnOperatorDbMock as any)(
      {} as any,
      {
        ...aSearchRequestBody,
        page: 2,
        pageSize: 10
      } as OfflineMerchantSearchRequest
    );
    expect(queryMock).toBeCalledTimes(1);
    expect(response.kind).toBe("IResponseSuccessJson");
  });

  it("should add to the db query the order by name", async () => {
    queryMock.mockImplementationOnce((query, _) => {
      expect(query).toMatch(/ORDER BY searchable_name ASC/);

      return anEmptyArrayPromise;
    });
    const response = await GetOfflineMerchantsHandler(cgnOperatorDbMock as any)(
      {} as any,
      {
        ...aSearchRequestBody,
        ordering: OrderingEnum.alphabetic
      } as OfflineMerchantSearchRequest
    );
    expect(queryMock).toBeCalledTimes(1);
    expect(response.kind).toBe("IResponseSuccessJson");
  });

  it("should add to the db query the order by distance", async () => {
    queryMock.mockImplementationOnce((query, _) => {
      expect(query).toMatch(/ORDER BY distance/);

      return anEmptyArrayPromise;
    });
    const response = await GetOfflineMerchantsHandler(cgnOperatorDbMock as any)(
      {} as any,
      {
        ...aSearchRequestBody,
        ordering: OrderingEnum.distance
      } as OfflineMerchantSearchRequest
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

    const response = await GetOfflineMerchantsHandler(cgnOperatorDbMock as any)(
      {} as any,
      {
        ...aSearchRequestBody,
        page: 0,
        pageSize: 20
      } as OfflineMerchantSearchRequest
    );
    expect(queryMock).toBeCalledTimes(1);
    expect(response.kind).toBe("IResponseErrorInternal");
  });
});
