import { ProductCategoryEnum } from "../generated/definitions/ProductCategory";

export enum ProductCategoryEnumModelType {
  entertainment = "ENTERTAINMENT",
  travelling = "TRAVELLING",
  foodDrink = "FOOD_DRINK",
  services = "SERVICES",
  learning = "LEARNING",
  hotels = "HOTELS",
  sports = "SPORTS",
  health = "HEALTH",
  shopping = "SHOPPING"
}

export const ProductCategoryFromModel = (
  productCategory: ProductCategoryEnumModelType
): ProductCategoryEnum => {
  switch (productCategory) {
    case ProductCategoryEnumModelType.hotels:
      return ProductCategoryEnum.hotels;
    case ProductCategoryEnumModelType.learning:
      return ProductCategoryEnum.learning;
    case ProductCategoryEnumModelType.services:
      return ProductCategoryEnum.services;
    case ProductCategoryEnumModelType.entertainment:
      return ProductCategoryEnum.entertainment;
    case ProductCategoryEnumModelType.health:
      return ProductCategoryEnum.health;
    case ProductCategoryEnumModelType.sports:
      return ProductCategoryEnum.sports;
    case ProductCategoryEnumModelType.shopping:
      return ProductCategoryEnum.shopping;
    case ProductCategoryEnumModelType.travelling:
      return ProductCategoryEnum.travelling;
    case ProductCategoryEnumModelType.foodDrink:
      return ProductCategoryEnum.foodDrink;
    default:
      throw new Error(`Invalid product category value: ${productCategory}`);
  }
};

export const ProductCategoryToQueryColumn = (
  productCategory: ProductCategoryEnum
): string => {
  switch (productCategory) {
    case ProductCategoryEnum.shopping:
      return "shopping";
    case ProductCategoryEnum.learning:
      return "learning";
    case ProductCategoryEnum.services:
      return "services";
    case ProductCategoryEnum.entertainment:
      return "entertainment";
    case ProductCategoryEnum.health:
      return "health";
    case ProductCategoryEnum.sports:
      return "sports";
    case ProductCategoryEnum.hotels:
      return "hotels";
    case ProductCategoryEnum.travelling:
      return "travelling";
    case ProductCategoryEnum.foodDrink:
      return "foodDrink";
    default:
      throw Error(`Invalid product category value: ${productCategory}`);
  }
};
