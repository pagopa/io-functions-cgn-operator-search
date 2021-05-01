/* tslint:disable: no-any */

import { ProductCategoryEnum } from "../../generated/definitions/ProductCategory";
import { ProductCategoryEnumModelType } from "../../models/ProductCategories";
import { GetMerchantHandler } from "../handler";

const queryMock = jest.fn().mockImplementation(_ => {});

const cgnOperatorDbMock = { query: queryMock };

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GetMerchantHandler", () => {
  it("should return a merchant given its ID, together with the address list and the published discount list", async () => {
    const agreementId: string = "abc-123-def";

    queryMock
      .mockImplementationOnce((query, params) => {
        expect(params.replacements.merchant_id).toBe(agreementId);

        return new Promise(resolve => {
          resolve([
            {
              agreement_fk: agreementId,
              description: "description something",
              image_url: "/images/1.png",
              name: "PagoPa",
              profile_k: 123,
              website_url: "https://pagopa.it"
            }
          ]);
        });
      })
      .mockImplementation(
        (query: string, params) =>
          new Promise(resolve => {
            if (query.includes("FROM address")) {
              expect(params.replacements.profile_key).toBe(123);

              const addressResponse = [
                {
                  city: "roma",
                  district: "rm",
                  latitude: 1,
                  longitude: 2,
                  street: "la rue 17",
                  zip_code: "1231"
                },
                {
                  city: "milano",
                  district: "mi",
                  latitude: 12,
                  longitude: 21,
                  street: "la rue 17",
                  zip_code: "1231"
                }
              ];
              resolve(addressResponse);
            } else if (query.includes("FROM discount")) {
              expect(params.replacements.agreement_key).toBe(agreementId);

              const discountResponse = [
                {
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
                }
              ];
              resolve(discountResponse);
            } else {
              fail("Unexpected SQL query");
            }
          })
      );

    const response = await GetMerchantHandler(cgnOperatorDbMock as any, "")(
      {} as any,
      agreementId
    );
    expect(response.kind).toBe("IResponseSuccessJson");
    expect(queryMock).toBeCalledTimes(3);
    if (response.kind === "IResponseSuccessJson") {
      expect(response.value).toEqual({
        id: agreementId,
        description: "description something",
        imageUrl: "/images/1.png",
        name: "PagoPa",
        websiteUrl: "https://pagopa.it",
        addresses: [
          {
            city: "roma",
            district: "rm",
            latitude: 1,
            longitude: 2,
            street: "la rue 17",
            zipCode: "1231"
          },
          {
            city: "milano",
            district: "mi",
            latitude: 12,
            longitude: 21,
            street: "la rue 17",
            zipCode: "1231"
          }
        ],
        discounts: [
          {
            condition: "mah",
            description: "something something",
            discount: 20,
            endDate: new Date("2021-01-01"),
            name: "name 1",
            productCategories: [
              ProductCategoryEnum.arts,
              ProductCategoryEnum.books
            ],
            startDate: new Date("2020-01-01"),
            staticCode: "xxx"
          }
        ]
      });
    }
  });

  it("should return a merchant given its ID, also if there is no address associated", async () => {
    const agreementId: string = "abc-123-def";

    queryMock
      .mockImplementationOnce((query, params) => {
        expect(params.replacements.merchant_id).toBe(agreementId);

        return new Promise(resolve => {
          resolve([
            {
              agreement_fk: agreementId,
              description: "description something",
              image_url: "/images/1.png",
              name: "PagoPa",
              profile_k: 123,
              website_url: "https://pagopa.it"
            }
          ]);
        });
      })
      .mockImplementation(
        (query: string, params) =>
          new Promise(resolve => {
            if (query.includes("FROM address")) {
              expect(params.replacements.profile_key).toBe(123);
              resolve([]);
            } else if (query.includes("FROM discount")) {
              expect(params.replacements.agreement_key).toBe(agreementId);

              const discountResponse = [
                {
                  condition: "mah",
                  description: "something something",
                  discount_value: 20,
                  end_date: new Date("2021-01-01"),
                  name: "name 1",
                  product_categories: [
                    ProductCategoryEnumModelType.entertainments,
                    ProductCategoryEnumModelType.sports
                  ],
                  start_date: new Date("2020-01-01"),
                  static_code: "xxx"
                }
              ];
              resolve(discountResponse);
            } else {
              fail("Unexpected SQL query");
            }
          })
      );

    const response = await GetMerchantHandler(cgnOperatorDbMock as any, "")(
      {} as any,
      agreementId
    );
    expect(queryMock).toBeCalledTimes(3);
    expect(response.kind).toBe("IResponseSuccessJson");
    if (response.kind === "IResponseSuccessJson") {
      expect(response.value).toEqual({
        id: agreementId,
        description: "description something",
        imageUrl: "/images/1.png",
        name: "PagoPa",
        websiteUrl: "https://pagopa.it",
        addresses: [],
        discounts: [
          {
            condition: "mah",
            description: "something something",
            discount: 20,
            endDate: new Date("2021-01-01"),
            name: "name 1",
            productCategories: [
              ProductCategoryEnum.entertainments,
              ProductCategoryEnum.sports
            ],
            startDate: new Date("2020-01-01"),
            staticCode: "xxx"
          }
        ]
      });
    }
  });

  it("should return a NotFound error if there is no merchant in the db", async () => {
    queryMock.mockImplementationOnce((query, params) => {
      expect(params.replacements.merchant_id).toBe("agreement_k");

      return new Promise(resolve => {
        resolve([]);
      });
    });

    const response = await GetMerchantHandler(cgnOperatorDbMock as any, "")(
      {} as any,
      "agreement_k"
    );
    expect(response.kind).toBe("IResponseErrorNotFound");
    expect(queryMock).toBeCalledTimes(1);
  });

  it("should return an InternalServerError if there is an issue querying the db", async () => {
    queryMock.mockImplementationOnce((query, params) => {
      expect(params.replacements.merchant_id).toBe("agreement_k");

      return new Promise(resolve => {
        throw Error("Query error!");
      });
    });

    const response = await GetMerchantHandler(cgnOperatorDbMock as any, "")(
      {} as any,
      "agreement_k"
    );
    expect(response.kind).toBe("IResponseErrorInternal");
    expect(queryMock).toBeCalledTimes(1);
  });
});
