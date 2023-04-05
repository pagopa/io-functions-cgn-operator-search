import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";
import { popFromList, pushInList } from "../redis_storage";

const aRedisKey = "KEY";
const aRedisValue = "VALUE";

const lPopMock = jest.fn().mockImplementation(_ => aRedisValue);
const lpushMock = jest.fn().mockImplementation((_, __) => 1);
const redisClientMock = {
  lpush: lpushMock,
  lpop: lPopMock
};

describe("popFromList", () => {
  it("should return a value if redis lpop key-value pair correctly", () => {
    pipe(
      // tslint:disable-next-line: no-any
      popFromList(redisClientMock as any, aRedisKey),
      TE.bimap(
        () => fail(),
        O.fold(
          () => fail(),
          value => expect(value).toEqual(aRedisValue)
        )
      )
    );
  });

  it("should return none if no value was popped for the provided key", () => {
    lPopMock.mockImplementationOnce(_ => undefined);
    pipe(
      popFromList(redisClientMock as any, aRedisKey),
      TE.bimap(
        () => fail(),
        maybeResult => expect(O.isNone(maybeResult)).toBeTruthy()
      )
    );
  });

  it("should return an error if redis pop value fails", () => {
    lPopMock.mockImplementationOnce(_ => new Error("Cannot get value"));
    pipe(
      popFromList(redisClientMock as any, aRedisKey),
      TE.bimap(
        _ => expect(_).toBeDefined(),
        _ => fail()
      )
    );
  });
});

describe("pushInList", () => {
  it("should return true if list element has been pushed from redis", () => {
    pipe(
      pushInList(redisClientMock as any, aRedisKey, [aRedisValue]),
      TE.bimap(
        _ => {
          console.log(_);
          return fail();
        },
        res => expect(res).toBeTruthy()
      )
    );
  });

  it("should return false if no values are pushed in redis", () => {
    lpushMock.mockImplementationOnce((_, __) => null);
    pipe(
      pushInList(redisClientMock as any, aRedisKey, [aRedisValue]),
      TE.bimap(
        () => fail(),
        res => expect(res).toBeFalsy()
      )
    );
  });

  it("should return an error if redis lpush fails", () => {
    lpushMock.mockImplementationOnce(
      (_, __) => new Error("Cannot perform push on redis")
    );
    pipe(
      pushInList(redisClientMock as any, aRedisKey, [aRedisValue]),
      TE.bimap(
        _ => expect(_).toBeDefined(),
        () => fail()
      )
    );
  });
});
