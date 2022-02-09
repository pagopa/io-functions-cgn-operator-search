import { Model } from "sequelize";
import { ProductCategoryEnumModelType } from "./ProductCategories";

export default class PublishedProductCategoryModel extends Model {
  public readonly product_category!: ProductCategoryEnumModelType;
}
