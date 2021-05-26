import { Model } from "sequelize";

export default class AddressModel extends Model {
  public readonly full_address!: string;
  public readonly latitude!: number;
  public readonly longitude!: number;
}
