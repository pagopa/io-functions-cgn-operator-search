import { Model } from "sequelize";

export default class MerchantProfileModel extends Model {
  public readonly agreement_fk!: string;
  public readonly description!: string;
  public readonly image_url!: string | undefined;
  public readonly name!: string;
  public readonly profile_k!: number;
  public readonly all_national_addresses!: boolean;
  public readonly website_url!: string | undefined;
}
