import { Options } from "sequelize/types";
import { getConfigOrThrow } from "../utils/config";

export const sequelizePostgresOptions: () => Options = () => ({
  dialect: "postgres",
  dialectOptions: {
    ssl: getConfigOrThrow().isPostgresSslEnabled
  },
  pool: {
    idle: 10000,
    max: 20,
    min: 0
  },
  ssl: getConfigOrThrow().isPostgresSslEnabled
});
