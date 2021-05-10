import { Options } from "sequelize/types";
import { getConfigOrThrow } from "../utils/config";

export const sequelizePostgresOptions: () => Options = () => ({
  dialect: "postgres",
  dialectOptions: {
    ssl: getConfigOrThrow().isPostgresSslEnabled
  },
  ssl: getConfigOrThrow().isPostgresSslEnabled
});
