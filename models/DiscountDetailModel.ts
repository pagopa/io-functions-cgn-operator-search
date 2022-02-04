import { Model } from "sequelize";
import { ProductCategoryEnumModelType } from "./ProductCategories";
import { DiscountCodeTypeEnumModel } from "./DiscountCodeTypes";

export default class DiscountDetailModel extends Model {
  public readonly discount_id!: number;
  public readonly operator_id!: string;
  public readonly condition!: string | undefined;
  public readonly discount_code_type!: DiscountCodeTypeEnumModel | undefined;
  public readonly discount_description!: string | undefined;
  public readonly discount_name!: string;
  public readonly discount_value!: number | undefined;
  public readonly end_date!: Date;
  public readonly product_categories!: ReadonlyArray<
    ProductCategoryEnumModelType
  >;
  public readonly start_date!: Date;
  public readonly static_code!: string | undefined;
  public readonly bucket_code!: string | undefined;
  public readonly landing_page_url!: string | undefined;
  public readonly landing_page_referrer!: string | undefined;
}
