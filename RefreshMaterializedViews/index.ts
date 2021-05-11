import { Sequelize } from "sequelize";

import { getConfigOrThrow } from "../utils/config";
import { sequelizePostgresOptions } from "../utils/sequelize-options";
import { getMaterializedViewRefreshHandler } from "./handler";

const config = getConfigOrThrow();

const cgnOperatorDb = new Sequelize(
  config.CGN_POSTGRES_DB_ADMIN_URI,
  sequelizePostgresOptions()
);

const materializedViewRefreshHandler = getMaterializedViewRefreshHandler(
  cgnOperatorDb
);

export default materializedViewRefreshHandler;
