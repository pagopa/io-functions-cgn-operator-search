import { Model } from "sequelize";

export default class DiscountBucketCodeModel extends Model {
  public readonly bucket_code_k!: number;
  public readonly discount_fk!: number;
  public readonly code!: string;
  public readonly used!: boolean;
  public readonly bucket_code_load_id!: number;
}
