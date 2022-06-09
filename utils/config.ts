/**
 * Config module
 *
 * Single point of access for the application confguration. Handles validation on required environment variables.
 * The configuration is evaluate eagerly at the first access to the module. The module exposes convenient methods to access such value.
 */

import { flow, identity, pipe } from "fp-ts/lib/function";
import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import * as t from "io-ts";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import {
  IntegerFromString,
  NonNegativeInteger
} from "@pagopa/ts-commons/lib/numbers";

export const RedisParams = t.intersection([
  t.interface({
    REDIS_URL: NonEmptyString
  }),
  t.partial({
    REDIS_CLUSTER_ENABLED: t.boolean,
    REDIS_PASSWORD: NonEmptyString,
    REDIS_PORT: NonEmptyString,
    REDIS_TLS_ENABLED: t.boolean
  })
]);
export type RedisParams = t.TypeOf<typeof RedisParams>;

// global app configuration
export type IConfig = t.TypeOf<typeof IConfig>;
// eslint-disable-next-line @typescript-eslint/ban-types
export const IConfig = t.intersection([
  t.interface({
    AzureWebJobsStorage: NonEmptyString,

    CDN_MERCHANT_IMAGES_BASE_URL: NonEmptyString,
    CGN_BUCKET_CODE_LOCK_LIMIT: NonNegativeInteger,
    CGN_EXTERNAL_SOURCE_HEADER_NAME: NonEmptyString,

    CGN_POSTGRES_DB_ADMIN_URI: NonEmptyString,
    CGN_POSTGRES_DB_RO_URI: NonEmptyString,
    CGN_POSTGRES_POOL_MAX_CONNECTIONS: NonNegativeInteger,
    isPostgresSslEnabled: t.boolean,

    isProduction: t.boolean
  }),
  RedisParams
]);

const DEFAULT_CGN_EXTERNAL_SOURCE_HEADER_NAME = "x-from-external";

// No need to re-evaluate this object for each call
const errorOrConfig: t.Validation<IConfig> = IConfig.decode({
  ...process.env,
  CGN_BUCKET_CODE_LOCK_LIMIT: pipe(
    process.env.CGN_BUCKET_CODE_LOCK_LIMIT,
    IntegerFromString.decode,
    E.map(_ => _ as NonNegativeInteger),
    E.getOrElse(() => 100 as NonNegativeInteger)
  ),
  CGN_EXTERNAL_SOURCE_HEADER_NAME: pipe(
    process.env.CGN_EXTERNAL_SOURCE_HEADER_NAME,
    E.fromNullable(DEFAULT_CGN_EXTERNAL_SOURCE_HEADER_NAME),
    E.chain(
      flow(
        NonEmptyString.decode,
        E.mapLeft(() => DEFAULT_CGN_EXTERNAL_SOURCE_HEADER_NAME)
      )
    ),
    E.fold(identity, identity)
  ),
  CGN_POSTGRES_POOL_MAX_CONNECTIONS: pipe(
    process.env.CGN_POSTGRES_POOL_MAX_CONNECTIONS,
    IntegerFromString.decode,
    E.map(_ => _ as NonNegativeInteger),
    E.getOrElse(() => 30 as NonNegativeInteger)
  ),
  REDIS_CLUSTER_ENABLED: pipe(
    O.fromNullable(process.env.REDIS_CLUSTER_ENABLED),
    O.map(_ => _.toLowerCase() === "true"),
    O.toUndefined
  ),
  REDIS_TLS_ENABLED: pipe(
    O.fromNullable(process.env.REDIS_TLS_ENABLED),
    O.map(_ => _.toLowerCase() === "true"),
    O.toUndefined
  ),
  isPostgresSslEnabled: process.env.CGN_POSTGRES_DB_SSL_ENABLED === "true",
  isProduction: process.env.NODE_ENV === "production"
});

/**
 * Read the application configuration and check for invalid values.
 * Configuration is eagerly evalued when the application starts.
 *
 * @returns either the configuration values or a list of validation errors
 */
export const getConfig = (): t.Validation<IConfig> => errorOrConfig;

/**
 * Read the application configuration and check for invalid values.
 * If the application is not valid, raises an exception.
 *
 * @returns the configuration values
 * @throws validation errors found while parsing the application configuration
 */
export const getConfigOrThrow = (): IConfig =>
  pipe(
    errorOrConfig,
    E.getOrElse<t.Errors, IConfig>(errors => {
      throw new Error(`Invalid configuration: ${readableReport(errors)}`);
    })
  );
