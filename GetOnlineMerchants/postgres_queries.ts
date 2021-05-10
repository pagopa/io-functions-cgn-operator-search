import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";
import { Option } from "fp-ts/lib/Option";
import { ProductCategory } from "../generated/definitions/ProductCategory";
import { ProductCategoryToQueryColumn } from "../models/ProductCategories";

const categoryFilter = (
  productCategoriesFilter: Option<ReadonlyArray<ProductCategory>>
): string =>
  productCategoriesFilter
    .map(s => s.map(c => ProductCategoryToQueryColumn(c)).join(" OR "))
    .map(s => `AND (${s})`)
    .getOrElse("");

const nameFilterQueryPart = (nameFilter: Option<string>): string =>
  nameFilter.map(__ => " AND searchable_name LIKE :name_filter ").getOrElse("");

const pageSize = (maybePageSize: Option<NonNegativeInteger>): number =>
  maybePageSize.map(n => n as number).getOrElse(100);

const offset = (
  page: Option<NonNegativeInteger>,
  maybePageSize: Option<NonNegativeInteger>
): number => page.map(n => n as number).getOrElse(0) * pageSize(maybePageSize);

export const selectOnlineMerchantsQuery = (
  nameFilter: Option<string>,
  productCategoriesFilter: Option<ReadonlyArray<ProductCategory>>,
  page: Option<NonNegativeInteger>,
  maybePageSize: Option<NonNegativeInteger>
): string => `
SELECT
  id,
  name,
  product_categories,
  website_url
FROM online_merchant
WHERE 1 = 1
  ${nameFilterQueryPart(nameFilter)}
  ${categoryFilter(productCategoriesFilter)}
ORDER BY name ASC
LIMIT ${pageSize(maybePageSize)}
OFFSET ${offset(page, maybePageSize)}`;
