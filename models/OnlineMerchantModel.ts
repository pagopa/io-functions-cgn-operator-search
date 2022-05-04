import { Model } from "sequelize";

import { ProductCategoryEnumModelType } from "./ProductCategories";
import { DiscountCodeTypeEnumModel } from "./DiscountCodeTypes";

export default class OnlineMerchantModel extends Model {
  public readonly id!: string;
  public readonly name!: string;
  public readonly product_categories!: ReadonlyArray<
    ProductCategoryEnumModelType
  >;
  public readonly website_url!: string;
  public readonly discount_code_type!: DiscountCodeTypeEnumModel;
  public readonly new_discounts!: boolean;
}
