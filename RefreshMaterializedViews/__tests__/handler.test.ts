import { getMaterializedViewRefreshHandler } from "../handler";

const queryMock = jest.fn().mockImplementation((query, __) => {
  expect(query).toBe("REFRESH MATERIALIZED VIEW CONCURRENTLY online_merchant");

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

    expect(response._tag).toBe("Right");
    expect(response.value).toEqual("Materialized view refreshed!");
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
    expect(response._tag).toBe("Left");
    expect(response.value).toStrictEqual(Error("Query error!"));
  });
});
