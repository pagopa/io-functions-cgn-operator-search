import * as express from "express";
import * as winston from "winston";

import { Context } from "@azure/functions";
import { secureExpressApp } from "@pagopa/io-functions-commons/dist/src/utils/express";
import { AzureContextTransport } from "@pagopa/io-functions-commons/dist/src/utils/logging";
import { setAppContext } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import createAzureFunctionHandler from "@pagopa/express-azure-functions/dist/src/createAzureFunctionsHandler";

import { getConfigOrThrow } from "../utils/config";
import { REDIS_CLIENT } from "../utils/redis";
import { cgnOperatorDb } from "../client/sequelize";
import { GetDiscountBucketCode } from "./handler";

const config = getConfigOrThrow();

// eslint-disable-next-line functional/no-let
let logger: Context["log"] | undefined;
const contextTransport = new AzureContextTransport(() => logger, {
  level: "debug"
});
winston.add(contextTransport);

// Setup Express
const app = express();
secureExpressApp(app);

// Binds the express app to an Azure Function handler
const httpStart = async (context: Context): Promise<void> => {
  logger = context.log;
  const redisClient = await REDIS_CLIENT;

  // Add express route
  app.get(
    "/api/v1/cgn/operator-search/discount-bucket-code/:discountId",
    GetDiscountBucketCode(
      cgnOperatorDb,
      redisClient,
      config.CGN_BUCKET_CODE_LOCK_LIMIT
    )
  );

  const azureFunctionHandler = createAzureFunctionHandler(app);

  setAppContext(app, context);
  azureFunctionHandler(context);
};

export default httpStart;
