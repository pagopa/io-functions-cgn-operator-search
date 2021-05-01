import { Model } from "sequelize";

export default class AddressModel extends Model {
  public readonly city!: string;
  public readonly district!: string;
  public readonly latitude!: number | undefined;
  public readonly longitude!: number | undefined;
  public readonly street!: string;
  public readonly zip_code!: string;
}
