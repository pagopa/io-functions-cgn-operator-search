/**
 * Config module
 *
 * Single point of access for the application confguration. Handles validation on required environment variables.
 * The configuration is evaluate eagerly at the first access to the module. The module exposes convenient methods to access such value.
 */

import { identity } from "fp-ts/lib/function";
import { fromNullable } from "fp-ts/lib/Either";
import * as t from "io-ts";
import { ValidationError } from "io-ts";
import { readableReport } from "italia-ts-commons/lib/reporters";
import { NonEmptyString } from "italia-ts-commons/lib/strings";

// global app configuration
export type IConfig = t.TypeOf<typeof IConfig>;
// eslint-disable-next-line @typescript-eslint/ban-types
export const IConfig = t.interface({
  AzureWebJobsStorage: NonEmptyString,

  CDN_MERCHANT_IMAGES_BASE_URL: NonEmptyString,
  CGN_EXTERNAL_SOURCE_HEADER_NAME: NonEmptyString,

  CGN_POSTGRES_DB_ADMIN_URI: NonEmptyString,
  CGN_POSTGRES_DB_RO_URI: NonEmptyString,
  isPostgresSslEnabled: t.boolean,

  isProduction: t.boolean
});

const DEFAULT_CGN_EXTERNAL_SOURCE_HEADER_NAME = "x-from-external";

// No need to re-evaluate this object for each call
const errorOrConfig: t.Validation<IConfig> = IConfig.decode({
  ...process.env,
  CGN_EXTERNAL_SOURCE_HEADER_NAME: fromNullable(
    DEFAULT_CGN_EXTERNAL_SOURCE_HEADER_NAME
  )(process.env.CGN_EXTERNAL_SOURCE_HEADER_NAME)
    .chain(_ =>
      NonEmptyString.decode(_).mapLeft(
        () => DEFAULT_CGN_EXTERNAL_SOURCE_HEADER_NAME
      )
    )
    .fold(identity, identity),
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
  errorOrConfig.getOrElseL((errors: ReadonlyArray<ValidationError>) => {
    throw new Error(`Invalid configuration: ${readableReport(errors)}`);
  });
