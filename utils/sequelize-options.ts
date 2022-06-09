import { Options } from "sequelize/types";
import { getConfigOrThrow } from "../utils/config";

export const sequelizePostgresOptions: () => Options = () => ({
  dialect: "postgres",
  dialectOptions: {
    ssl: getConfigOrThrow().isPostgresSslEnabled
  },
  pool: {
    idle: 5000,
    max: getConfigOrThrow().CGN_POSTGRES_POOL_MAX_CONNECTIONS,
    min: 5
  },
  ssl: getConfigOrThrow().isPostgresSslEnabled
});
