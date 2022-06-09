import { cgnOperatorDb } from "../client/sequelize";
import { getMaterializedViewRefreshHandler } from "./handler";

const materializedViewRefreshHandler = getMaterializedViewRefreshHandler(
  cgnOperatorDb
);

export default materializedViewRefreshHandler;
