/* tslint:disable: no-any */

import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { withoutUndefinedValues } from "@pagopa/ts-commons/lib/types";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/lib/Option";
import { DiscountCodeTypeEnum } from "../../generated/definitions/DiscountCodeType";
import { ProductCategoryEnum } from "../../generated/definitions/ProductCategory";
import { DiscountCodeTypeEnumModel } from "../../models/DiscountCodeTypes";
import { ProductCategoryEnumModelType } from "../../models/ProductCategories";
import { GetMerchantHandler } from "../handler";

const anAgreementId = "abc-123-def";
const anExternalHeader = O.some("EXT_PORTAL" as NonEmptyString);
const aMerchantProfileWithStaticDiscountTypeModel = {
  agreement_fk: anAgreementId,
  description: "description something",
  image_url: "/images/1.png",
  name: "PagoPa",
  profile_k: 123,
  website_url: "https://pagopa.it",
  discount_code_type: DiscountCodeTypeEnumModel.static
};
const aMerchantProfileModelList = [aMerchantProfileWithStaticDiscountTypeModel];

const anAddress = {
  full_address: "la rue 17, 1231, roma (rm)",
  latitude: 1,
  longitude: 2
};
const anAddressModelList = [anAddress, { ...anAddress, city: "milano" }];

const aDiscountModelWithStaticCode = {
  condition: null,
  description: "something something",
  discount_k: 1,
  discount_value: 20,
  end_date: new Date("2021-01-01"),
  name: "name 1",
  product_categories: [
    ProductCategoryEnumModelType.cultureAndEntertainment,
    ProductCategoryEnumModelType.learning
  ],
  start_date: new Date("2020-01-01"),
  static_code: "xxx",
  landing_page_url: undefined,
  landing_page_referrer: undefined
};

const aDiscountModelWithLandingPage = {
  condition: null,
  description: "something something",
  discount_k: 1,
  discount_value: 20,
  end_date: new Date("2021-01-01"),
  name: "name 1",
  product_categories: [
    ProductCategoryEnumModelType.cultureAndEntertainment,
    ProductCategoryEnumModelType.learning
  ],
  start_date: new Date("2020-01-01"),
  static_code: undefined,
  landing_page_url: "xxx",
  landing_page_referrer: "xxx"
};

const aDiscountModelList = [
  aDiscountModelWithStaticCode,
  aDiscountModelWithLandingPage
];

const anExpectedResponse = (withoutStaticCode: boolean = false) => ({
  description: aMerchantProfileWithStaticDiscountTypeModel.description,
  name: aMerchantProfileWithStaticDiscountTypeModel.name,
  id: anAgreementId,
  imageUrl: `/${aMerchantProfileWithStaticDiscountTypeModel.image_url}`,
  websiteUrl: aMerchantProfileWithStaticDiscountTypeModel.website_url,
  discountCodeType: DiscountCodeTypeEnum.static,
  addresses: anAddressModelList.map(address => ({
    full_address: address.full_address,
    latitude: address.latitude,
    longitude: address.longitude
  })),
  discounts: aDiscountModelList.map(discount =>
    withoutUndefinedValues({
      condition: pipe(O.fromNullable(discount.condition), O.toUndefined),
      description: pipe(O.fromNullable(discount.description), O.toUndefined),
      name: discount.name,
      endDate: discount.end_date,
      discount: pipe(O.fromNullable(discount.discount_value), O.toUndefined),
      id: discount.discount_k,
      startDate: discount.start_date,
      staticCode: withoutStaticCode ? undefined : discount.static_code,
      landingPageUrl: withoutStaticCode ? undefined : discount.landing_page_url,
      landingPageReferrer: withoutStaticCode
        ? undefined
        : discount.landing_page_referrer,
      productCategories: [
        ProductCategoryEnum.cultureAndEntertainment,
        ProductCategoryEnum.learning
      ]
    })
  )
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
      O.none
    );
    expect(response.kind).toBe("IResponseSuccessJson");
    expect(queryMock).toBeCalledTimes(3);
    if (response.kind === "IResponseSuccessJson") {
      expect(response.value).toEqual(anExpectedResponse());
    }
  });

  it("should return a merchant given its ID, without static code in discounts if external header is present", async () => {
    const response = await GetMerchantHandler(cgnOperatorDbMock as any, "")(
      {} as any,
      anAgreementId,
      O.some("header" as NonEmptyString)
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
    console.log(JSON.stringify(response));
    expect(response.kind).toBe("IResponseSuccessJson");
    if (response.kind === "IResponseSuccessJson") {
      expect(response.value).toEqual({
        ...anExpectedResponse(true),
        addresses: []
      });
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
