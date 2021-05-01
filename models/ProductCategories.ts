import { ProductCategoryEnum } from "../generated/definitions/ProductCategory";

export enum ProductCategoryEnumModelType {
  entertainments = "ENTERTAINMENTS",
  travels = "TRAVELS",
  transportation = "TRANSPORTATION",
  connectivity = "CONNECTIVITY",
  books = "BOOKS",
  arts = "ARTS",
  sports = "SPORTS",
  health = "HEALTH"
}

export const ProductCategoryFromModel = (
  productCategory: ProductCategoryEnumModelType
): ProductCategoryEnum => {
  switch (productCategory) {
    case ProductCategoryEnumModelType.arts:
      return ProductCategoryEnum.arts;
    case ProductCategoryEnumModelType.books:
      return ProductCategoryEnum.books;
    case ProductCategoryEnumModelType.connectivity:
      return ProductCategoryEnum.connectivity;
    case ProductCategoryEnumModelType.entertainments:
      return ProductCategoryEnum.entertainments;
    case ProductCategoryEnumModelType.health:
      return ProductCategoryEnum.health;
    case ProductCategoryEnumModelType.sports:
      return ProductCategoryEnum.sports;
    case ProductCategoryEnumModelType.transportation:
      return ProductCategoryEnum.transportation;
    case ProductCategoryEnumModelType.travels:
      return ProductCategoryEnum.travels;
    default:
      throw new Error(`Invalid enum value: ${productCategory}`);
  }
};

export const ProductCategoryToModel = (
  productCategory: ProductCategoryEnum
): ProductCategoryEnumModelType => {
  switch (productCategory) {
    case ProductCategoryEnum.arts:
      return ProductCategoryEnumModelType.arts;
    case ProductCategoryEnum.books:
      return ProductCategoryEnumModelType.books;
    case ProductCategoryEnum.connectivity:
      return ProductCategoryEnumModelType.connectivity;
    case ProductCategoryEnum.entertainments:
      return ProductCategoryEnumModelType.entertainments;
    case ProductCategoryEnum.health:
      return ProductCategoryEnumModelType.health;
    case ProductCategoryEnum.sports:
      return ProductCategoryEnumModelType.sports;
    case ProductCategoryEnum.transportation:
      return ProductCategoryEnumModelType.transportation;
    case ProductCategoryEnum.travels:
      return ProductCategoryEnumModelType.travels;
    default:
      throw new Error(`Invalid enum value: ${productCategory}`);
  }
};
