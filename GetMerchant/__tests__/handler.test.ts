/* tslint:disable: no-any */

import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { withoutUndefinedValues } from "@pagopa/ts-commons/lib/types";
import { fromNullable, none, some } from "fp-ts/lib/Option";
import { ProductCategoryEnum } from "../../generated/definitions/ProductCategory";
import { ProductCategoryEnumModelType } from "../../models/ProductCategories";
import { GetMerchantHandler } from "../handler";

const anAgreementId = "abc-123-def";
const anExternalHeader = some("EXT_PORTAL" as NonEmptyString);
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
  condition: null,
  description: "something something",
  discount_value: 20,
  end_date: new Date("2021-01-01"),
  name: "name 1",
  product_categories: [
    ProductCategoryEnumModelType.entertainment,
    ProductCategoryEnumModelType.learning
  ],
  start_date: new Date("2020-01-01"),
  static_code: "xxx"
};
const aDiscountModelList = [aDiscountModel];

const anExpectedResponse = (withoutStaticCode: boolean = false) => ({
  description: aMerchantProfileModel.description,
  name: aMerchantProfileModel.name,
  id: anAgreementId,
  imageUrl: `/${aMerchantProfileModel.image_url}`,
  websiteUrl: aMerchantProfileModel.website_url,
  addresses: anAddressModelList.map(address => ({
    full_address: address.full_address,
    latitude: address.latitude,
    longitude: address.longitude
  })),
  discounts: aDiscountModelList.map(discount => withoutUndefinedValues({
    condition: fromNullable(discount.condition).toUndefined(),
    description: fromNullable(discount.description).toUndefined(),
    name: discount.name,
    endDate: discount.end_date,
    discount: fromNullable(discount.discount_value).toUndefined(),
    startDate: discount.start_date,
    staticCode: withoutStaticCode ? undefined : discount.static_code,
    productCategories: [ProductCategoryEnum.entertainment, ProductCategoryEnum.learning]
  }))
});

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
      anAgreementId,
      anExternalHeader
    );
    expect(response.kind).toBe("IResponseSuccessJson");
    expect(queryMock).toBeCalledTimes(3);
    if (response.kind === "IResponseSuccessJson") {
      expect(response.value).toEqual(anExpectedResponse());
    }
  });

  it("should return a merchant given its ID, without static code in discounts if external header is none", async () => {
    const response = await GetMerchantHandler(cgnOperatorDbMock as any, "")(
      {} as any,
      anAgreementId,
      none
    );
    expect(response.kind).toBe("IResponseSuccessJson");
    expect(queryMock).toBeCalledTimes(3);
    if (response.kind === "IResponseSuccessJson") {
      expect(response.value).toEqual(anExpectedResponse(true));
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
      anAgreementId,
      anExternalHeader
    );
    expect(queryMock).toBeCalledTimes(3);
    expect(response.kind).toBe("IResponseSuccessJson");
    if (response.kind === "IResponseSuccessJson") {
      expect(response.value).toEqual({ ...anExpectedResponse(), addresses: [] });
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
      anAgreementId,
      anExternalHeader
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
      anAgreementId,
      anExternalHeader
    );
    expect(response.kind).toBe("IResponseErrorInternal");
    expect(queryMock).toBeCalledTimes(1);
  });
});
