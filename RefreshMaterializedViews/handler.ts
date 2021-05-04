import { Context, AzureFunction } from "@azure/functions";
import { Either, toError } from "fp-ts/lib/Either";
import { tryCatch } from "fp-ts/lib/TaskEither";
import { QueryTypes, Sequelize } from "sequelize";

export const getMaterializedViewRefreshHandler = (
  cgnOperatorDb: Sequelize
): AzureFunction => async (_: Context): Promise<Either<Error, string> | void> =>
  tryCatch(
    () =>
      cgnOperatorDb.query(
        `REFRESH MATERIALIZED VIEW CONCURRENTLY online_merchant`,
        { type: QueryTypes.RAW }
      ),
    toError
  )
    .map(__ => "Materialized view refreshed!")
    .run();
