import { Model } from "sequelize";

export default class DiscountResultModel extends Model {
  public readonly discount_k!: number;
  public readonly name!: string;
  public readonly operator_name!: string;
  public readonly discount_value!: number | undefined;
}
