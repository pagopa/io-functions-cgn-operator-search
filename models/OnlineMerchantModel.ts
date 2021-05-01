import { Model } from "sequelize";

import { ProductCategoryEnumModelType } from "./ProductCategories";

export default class OnlineMerchantModel extends Model {
  public readonly id!: string;
  public readonly name!: string;
  public readonly product_categories!: ReadonlyArray<
    ProductCategoryEnumModelType
  >;
  public readonly website_url!: string;
}
