import * as express from "express";
import * as winston from "winston";

import { Context } from "@azure/functions";
import { secureExpressApp } from "@pagopa/io-functions-commons/dist/src/utils/express";
import { AzureContextTransport } from "@pagopa/io-functions-commons/dist/src/utils/logging";
import { setAppContext } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import createAzureFunctionHandler from "@pagopa/express-azure-functions/dist/src/createAzureFunctionsHandler";
import { cgnOperatorDb } from "../client/sequelize";
import { withTelemetryTimeTracking } from "../utils/sequelize";
import { initTelemetryClient } from "../utils/appinsights";
import { getConfigOrThrow } from "../utils/config";
import { GetOfflineMerchants } from "./handler";

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

const queryTimeTracker = withTelemetryTimeTracking(
  initTelemetryClient(config.APPINSIGHTS_INSTRUMENTATIONKEY),
  config.QUERY_TIME_TRACKING_THRESHOLD_MILLISECONDS
);
// Add express route
app.post(
  "/api/v1/cgn/operator-search/offline-merchants",
  GetOfflineMerchants(cgnOperatorDb, queryTimeTracker)
);

const azureFunctionHandler = createAzureFunctionHandler(app);

// Binds the express app to an Azure Function handler
const httpStart = (context: Context): void => {
  logger = context.log;
  setAppContext(app, context);
  azureFunctionHandler(context);
};

export default httpStart;
