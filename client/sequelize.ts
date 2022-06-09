import { Sequelize } from "sequelize";
import { getConfigOrThrow } from "../utils/config";
import { sequelizePostgresOptions } from "../utils/sequelize-options";

const config = getConfigOrThrow();

export const cgnOperatorDb = new Sequelize(
  config.CGN_POSTGRES_DB_ADMIN_URI,
  sequelizePostgresOptions()
);
