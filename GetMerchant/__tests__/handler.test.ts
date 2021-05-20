/* tslint:disable: no-any */

import { ProductCategoryEnum } from "../../generated/definitions/ProductCategory";
import { ProductCategoryEnumModelType } from "../../models/ProductCategories";
import { GetMerchantHandler } from "../handler";

const anAgreementId = "abc-123-def";
const aMerchantProfileModel = {
  agreement_fk: anAgreementId,
  description: "description something",
  image_url: "/images/1.png",
  name: "PagoPa",
  profile_k: 123,
  website_url: "https://pagopa.it"
};
const aMerchantProfileModelList = [aMerchantProfileModel];

const anAddress = {
  full_address: "la rue 17, 1231, roma (rm)",
  latitude: 1,
  longitude: 2
};
const anAddressModelList = [anAddress, { ...anAddress, city: "milano" }];

const aDiscountModel = {
  condition: "mah",
  description: "something something",
  discount_value: 20,
  end_date: new Date("2021-01-01"),
  name: "name 1",
  product_categories: [
    ProductCategoryEnumModelType.arts,
    ProductCategoryEnumModelType.books
  ],
  start_date: new Date("2020-01-01"),
  static_code: "xxx"
};
const aDiscountModelList = [aDiscountModel];

const anExpectedResponse = {
  description: aMerchantProfileModel.description,
  name: aMerchantProfileModel.name,
  id: anAgreementId,
  imageUrl: aMerchantProfileModel.image_url,
  websiteUrl: aMerchantProfileModel.website_url,
  addresses: anAddressModelList.map(address => ({
    full_address: address.full_address,
    latitude: address.latitude,
    longitude: address.longitude
  })),
  discounts: aDiscountModelList.map(discount => ({
    condition: discount.condition,
    description: discount.description,
    name: discount.name,
    endDate: discount.end_date,
    discount: discount.discount_value,
    startDate: discount.start_date,
    staticCode: discount.static_code,
    productCategories: [ProductCategoryEnum.arts, ProductCategoryEnum.books]
  }))
};

const queryMock = jest.fn().mockImplementation((query: string, params) => {
  if (query.includes("FROM profile")) {
    expect(params.replacements.merchant_id).toBe(anAgreementId);

    return new Promise(resolve => {
      resolve(aMerchantProfileModelList);
    });
  } else if (query.includes("FROM address")) {
    expect(params.replacements.profile_key).toBe(123);

    return new Promise(resolve => {
      resolve(anAddressModelList);
    });
  } else if (query.includes("FROM discount")) {
    expect(params.replacements.agreement_key).toBe(anAgreementId);

    return new Promise(resolve => {
      resolve(aDiscountModelList);
    });
  } else {
    fail("Unexpected SQL query");
  }
});

const cgnOperatorDbMock = { query: queryMock };

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GetMerchantHandler", () => {
  it("should return a merchant given its ID, together with the address list and the published discount list", async () => {
    const response = await GetMerchantHandler(cgnOperatorDbMock as any, "")(
      {} as any,
      anAgreementId
    );
    expect(response.kind).toBe("IResponseSuccessJson");
    expect(queryMock).toBeCalledTimes(3);
    if (response.kind === "IResponseSuccessJson") {
      expect(response.value).toEqual(anExpectedResponse);
    }
  });

  it("should return a merchant given its ID, also if there is no address associated", async () => {
    queryMock.mockImplementation((query: string, params) => {
      if (query.includes("FROM profile")) {
        expect(params.replacements.merchant_id).toBe(anAgreementId);

        return new Promise(resolve => {
          resolve(aMerchantProfileModelList);
        });
      } else if (query.includes("FROM address")) {
        expect(params.replacements.profile_key).toBe(123);
        return new Promise(resolve => {
          resolve([]);
        });
      } else if (query.includes("FROM discount")) {
        expect(params.replacements.agreement_key).toBe(anAgreementId);

        return new Promise(resolve => {
          resolve(aDiscountModelList);
        });
      } else {
        fail("Unexpected SQL query");
      }
    });

    const response = await GetMerchantHandler(cgnOperatorDbMock as any, "")(
      {} as any,
      anAgreementId
    );
    expect(queryMock).toBeCalledTimes(3);
    expect(response.kind).toBe("IResponseSuccessJson");
    if (response.kind === "IResponseSuccessJson") {
      expect(response.value).toEqual({ ...anExpectedResponse, addresses: [] });
    }
  });

  it("should return a NotFound error if there is no merchant in the db", async () => {
    queryMock.mockImplementationOnce((query, params) => {
      expect(params.replacements.merchant_id).toBe(anAgreementId);

      return new Promise(resolve => {
        resolve([]);
      });
    });

    const response = await GetMerchantHandler(cgnOperatorDbMock as any, "")(
      {} as any,
      anAgreementId
    );
    expect(response.kind).toBe("IResponseErrorNotFound");
    expect(queryMock).toBeCalledTimes(1);
  });

  it("should return an InternalServerError if there is an issue querying the db", async () => {
    queryMock.mockImplementationOnce((query, params) => {
      expect(params.replacements.merchant_id).toBe(anAgreementId);

      return new Promise(_ => {
        throw Error("Query error!");
      });
    });

    const response = await GetMerchantHandler(cgnOperatorDbMock as any, "")(
      {} as any,
      anAgreementId
    );
    expect(response.kind).toBe("IResponseErrorInternal");
    expect(queryMock).toBeCalledTimes(1);
  });
});
