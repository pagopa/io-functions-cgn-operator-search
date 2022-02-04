import { withoutUndefinedValues } from "@pagopa/ts-commons/lib/types";
import DiscountResultModel from "../../models/DiscountResultModel";
import * as AR from "fp-ts/lib/Array";
import { GetDiscountsHandler } from "../handler";
import { pipe } from "fp-ts/lib/function";
import { ProductCategoryEnum } from "../../generated/definitions/ProductCategory";

const aDiscountResultModel = {
  discount_k: 1,
  name: "PagoPa",
  operator_name: "Operator Name",
  discount_value: 10
};

const aDiscountResultModelList = [aDiscountResultModel];

const aWrongDiscountResultModel = {
  discount_k: undefined
};

const mapDiscountResult = (input: DiscountResultModel[]) =>
  pipe(
    input,
    AR.map(d =>
      withoutUndefinedValues({
        discount: d.discount_value,
        id: d.discount_k,
        merchantName: d.operator_name,
        name: d.name
      })
    )
  );

const queryMock = jest
  .fn()
  .mockImplementation((_, __) => Promise.resolve(aDiscountResultModelList));

const cgnOperatorDbMock = { query: queryMock };

const searchRequestBody = {};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GetDiscountsHandler", () => {
  it("should return an internal error if query fails", async () => {
    queryMock.mockImplementationOnce(() => Promise.reject("Cannot query db"));
    const response = await GetDiscountsHandler(cgnOperatorDbMock as any)(
      {} as any,
      searchRequestBody as any
    );
    expect(queryMock).toBeCalledTimes(1);

    expect(response.kind).toBe("IResponseErrorInternal");
    if (response.kind === "IResponseErrorInternal") {
      expect(response.detail).toEqual("Internal server error: Cannot query db");
    }
  });

  it("should return an internal error if results decode fails", async () => {
    queryMock.mockImplementationOnce(() =>
      Promise.resolve([aWrongDiscountResultModel])
    );
    const response = await GetDiscountsHandler(cgnOperatorDbMock as any)(
      {} as any,
      searchRequestBody as any
    );
    expect(queryMock).toBeCalledTimes(1);

    expect(response.kind).toBe("IResponseErrorInternal");
  });

  it("should return success if there are no results to show", async () => {
    queryMock.mockImplementationOnce(() => Promise.resolve([]));
    const response = await GetDiscountsHandler(cgnOperatorDbMock as any)(
      {} as any,
      searchRequestBody as any
    );
    expect(queryMock).toBeCalledTimes(1);

    expect(response.kind).toBe("IResponseSuccessJson");
    if (response.kind === "IResponseSuccessJson") {
      expect(response.value).toEqual({ items: [] });
    }
  });

  it("should return success if there are at least a result to show", async () => {
    const response = await GetDiscountsHandler(cgnOperatorDbMock as any)(
      {} as any,
      searchRequestBody as any
    );
    expect(queryMock).toBeCalledTimes(1);

    expect(response.kind).toBe("IResponseSuccessJson");
    if (response.kind === "IResponseSuccessJson") {
      expect(response.value).toEqual({
        items: mapDiscountResult(aDiscountResultModelList as any)
      });
    }
  });

  it("should add to the db query the discount name filter, lowering its case", async () => {
    queryMock.mockImplementationOnce((query, params) => {
      expect(query).toMatch(/AND searchable_name LIKE/);
      expect(params.replacements.name_filter).toBe("%a discount%");

      return Promise.resolve([]);
    });

    const response = await GetDiscountsHandler(cgnOperatorDbMock as any)(
      {} as any,
      { discountName: "A Discount" } as any
    );
    expect(queryMock).toBeCalledTimes(1);
    expect(response.kind).toBe("IResponseSuccessJson");
  });

  it("should add to the db query the product category filters", async () => {
    queryMock.mockImplementationOnce((query, _) => {
      expect(query).toMatch(/AND \(health OR cultureAndEntertainment\)/);

      return Promise.resolve([]);
    });

    const response = await GetDiscountsHandler(cgnOperatorDbMock as any)(
      {} as any,
      {
        productCategories: [
          ProductCategoryEnum.health,
          ProductCategoryEnum.cultureAndEntertainment
        ]
      } as any
    );
    expect(queryMock).toBeCalledTimes(1);
    expect(response.kind).toBe("IResponseSuccessJson");
  });

  it("should add to the db query the pagination parameters", async () => {
    queryMock.mockImplementationOnce((query, _) => {
      expect(query).toMatch(/LIMIT 10\nOFFSET 20$/);

      return Promise.resolve([]);
    });

    const response = await GetDiscountsHandler(cgnOperatorDbMock as any)(
      {} as any,
      { page: 2, pageSize: 10 } as any
    );
    expect(queryMock).toBeCalledTimes(1);
    expect(response.kind).toBe("IResponseSuccessJson");
  });
});
