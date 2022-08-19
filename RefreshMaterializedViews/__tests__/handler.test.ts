import { getMaterializedViewRefreshHandler } from "../handler";
import * as E from "fp-ts/lib/Either";

const queryMock = jest.fn().mockImplementation((query, __) => {
  expect(query).toBe(
    "REFRESH MATERIALIZED VIEW CONCURRENTLY online_merchant; REFRESH MATERIALIZED VIEW CONCURRENTLY offline_merchant; REFRESH MATERIALIZED VIEW CONCURRENTLY published_product_category"
  );

  return new Promise(resolve => {
    resolve([]);
  });
});

const cgnOperatorDbMock = { query: queryMock };

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getMaterializedViewRefreshHandler", () => {
  it("should refresh the materialized views", async () => {
    const response = await getMaterializedViewRefreshHandler(
      cgnOperatorDbMock as any
    )({} as any);

    expect(queryMock).toBeCalledTimes(1);
    expect(E.isRight(response)).toBe(true);
    if (E.isRight(response)) {
      expect(response.right).toEqual("Materialized view refreshed!");
    }
  });

  it("should report an error if there is an issue with the db", async () => {
    queryMock.mockImplementationOnce((_, __) => {
      return new Promise(_ => {
        throw Error("Query error!");
      });
    });

    const response = await getMaterializedViewRefreshHandler(
      cgnOperatorDbMock as any
    )({} as any);

    expect(queryMock).toBeCalledTimes(1);
    expect(E.isLeft(response)).toBe(true);
    if (E.isLeft(response)) {
      expect(response.left).toStrictEqual(Error("Query error!"));
    }
  });
});
