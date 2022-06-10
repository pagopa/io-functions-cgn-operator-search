import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";
import { TelemetryClient } from "applicationinsights";
import { Model, QueryOptionsWithModel, Sequelize } from "sequelize/types";

export const withTelemetryTimeTracking = (
  telemetryClient: TelemetryClient,
  milliSecondsLimit: NonNegativeInteger
) => async <M extends Model>(
  sequelizeQuery: Sequelize["query"],
  sql: string,
  options: QueryOptionsWithModel<M>
  // eslint-disable-next-line functional/prefer-readonly-type
): Promise<M[]> => {
  const startTrack = Date.now();
  const results = await sequelizeQuery<M>(sql, options);
  const diff = Date.now() - startTrack;
  if (diff > milliSecondsLimit) {
    telemetryClient.trackEvent({
      name: "cgn.operatorSearch.query.tooMuchExecutionTime",
      properties: {
        params: options.replacements,
        query: sql,
        timeTaken: `${milliSecondsLimit} ms`
      },
      tagOverrides: { samplingEnabled: "false" }
    });
  }
  return results;
};
