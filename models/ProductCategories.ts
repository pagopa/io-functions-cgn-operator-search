import { ProductCategoryEnum } from "../generated/definitions/ProductCategory";

export enum ProductCategoryEnumModelType {
  bankingServices = "BANKING_SERVICES",
  cultureAndEntertainment = "CULTURE_AND_ENTERTAINMENT",
  health = "HEALTH",
  home = "HOME",
  jobOffers = "JOB_OFFERS",
  learning = "LEARNING",
  sports = "SPORTS",
  sustainableMobility = "SUSTAINABLE_MOBILITY",
  telephonyAndInternet = "TELEPHONY_AND_INTERNET",
  travelling = "TRAVELLING"
}

export const ProductCategoryFromModel = (
  productCategory: ProductCategoryEnumModelType
): ProductCategoryEnum => {
  switch (productCategory) {
    case ProductCategoryEnumModelType.bankingServices:
      return ProductCategoryEnum.bankingServices;
    case ProductCategoryEnumModelType.cultureAndEntertainment:
      return ProductCategoryEnum.cultureAndEntertainment;
    case ProductCategoryEnumModelType.health:
      return ProductCategoryEnum.health;
    case ProductCategoryEnumModelType.home:
      return ProductCategoryEnum.home;
    case ProductCategoryEnumModelType.jobOffers:
      return ProductCategoryEnum.jobOffers;
    case ProductCategoryEnumModelType.learning:
      return ProductCategoryEnum.learning;
    case ProductCategoryEnumModelType.sports:
      return ProductCategoryEnum.sports;
    case ProductCategoryEnumModelType.sustainableMobility:
      return ProductCategoryEnum.sustainableMobility;
    case ProductCategoryEnumModelType.telephonyAndInternet:
      return ProductCategoryEnum.telephonyAndInternet;
    case ProductCategoryEnumModelType.travelling:
      return ProductCategoryEnum.travelling;
    default:
      throw new Error(`Invalid product category value: ${productCategory}`);
  }
};

export const ProductCategoryToQueryColumn = (
  productCategory: ProductCategoryEnum
): string => {
  switch (productCategory) {
    case ProductCategoryEnum.bankingServices:
      return "bankingServices";
    case ProductCategoryEnum.cultureAndEntertainment:
      return "cultureAndEntertainment";
    case ProductCategoryEnum.health:
      return "health";
    case ProductCategoryEnum.home:
      return "home";
    case ProductCategoryEnum.jobOffers:
      return "jobOffers";
    case ProductCategoryEnum.learning:
      return "learning";
    case ProductCategoryEnum.sports:
      return "sports";
    case ProductCategoryEnum.sustainableMobility:
      return "sustainableMobility";
    case ProductCategoryEnum.telephonyAndInternet:
      return "telephonyAndInternet";
    case ProductCategoryEnum.travelling:
      return "travelling";
    default:
      throw Error(`Invalid product category value: ${productCategory}`);
  }
};
