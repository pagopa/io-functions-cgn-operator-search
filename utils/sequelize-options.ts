import { Options } from "sequelize/types";
import { getConfigOrThrow } from "../utils/config";

const config = getConfigOrThrow();

export const sequelizePostgresOptions = (): Options => ({
  dialect: "postgres",
  dialectOptions: {
    ssl: config.isPostgresSslEnabled
  },
  pool: {
    idle: config.CGN_POSTGRES_POOL_IDLE_TIMEOUT,
    max: config.CGN_POSTGRES_POOL_MAX_CONNECTIONS,
    min: config.CGN_POSTGRES_POOL_MIN_CONNECTIONS
  },
  ssl: getConfigOrThrow().isPostgresSslEnabled
});
