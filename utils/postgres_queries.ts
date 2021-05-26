import { Option } from "fp-ts/lib/Option";
import { fromNullable } from "fp-ts/lib/Option";
import { BoundingBox } from "../generated/definitions/BoundingBox";
import { Coordinates } from "../generated/definitions/Coordinates";
import { ProductCategory } from "../generated/definitions/ProductCategory";
import { ProductCategoryToQueryColumn } from "../models/ProductCategories";
import { OrderingEnum } from "../generated/definitions/OfflineMerchantSearchRequest";
import { OfflineMerchantSearchRequest } from "../generated/definitions/OfflineMerchantSearchRequest";

const categoryFilter = (
  productCategoriesFilter: Option<ReadonlyArray<ProductCategory>>
): string =>
  productCategoriesFilter
    .map(s => s.map(c => ProductCategoryToQueryColumn(c)).join(" OR "))
    .map(s => `AND (${s})`)
    .getOrElse("");

const nameFilterQueryPart = (nameFilter: Option<string>): string =>
  nameFilter.map(__ => " AND searchable_name LIKE :name_filter ").getOrElse("");

const pageSize = (maybePageSize: Option<number>): number =>
  maybePageSize.getOrElse(100);

const offset = (page: Option<number>, maybePageSize: Option<number>): number =>
  page.getOrElse(0) * pageSize(maybePageSize);

const getBoundingBoxMinLatitude = (boundingBox: BoundingBox): number =>
  boundingBox.coordinates.latitude - boundingBox.deltaLatitude / 2;

const getBoundingBoxMaxLatitude = (boundingBox: BoundingBox): number =>
  // tslint:disable-next-line:restrict-plus-operands
  boundingBox.coordinates.latitude + boundingBox.deltaLatitude / 2;

const getBoundingBoxMinLongitude = (boundingBox: BoundingBox): number =>
  boundingBox.coordinates.longitude - boundingBox.deltaLongitude / 2;

const getBoundingBoxMaxLongitude = (boundingBox: BoundingBox): number =>
  // tslint:disable-next-line:restrict-plus-operands
  boundingBox.coordinates.longitude + boundingBox.deltaLongitude / 2;

const boundingBoxFilter = (boundingBox: BoundingBox): string =>
  ` AND latitude BETWEEN ${getBoundingBoxMinLatitude(boundingBox)} 
        AND ${getBoundingBoxMaxLatitude(boundingBox)}
    AND longitude BETWEEN ${getBoundingBoxMinLongitude(boundingBox)} 
        AND ${getBoundingBoxMaxLongitude(boundingBox)} `;

const distanceParameter = (userCoordinates: Coordinates): string =>
  `ST_MakePoint(longitude, latitude)::geography <-> ST_MakePoint(${userCoordinates.longitude}, ${userCoordinates.latitude})::geography`;

const orderingParameter = (
  ordering: OrderingEnum,
  userCoordinates: Coordinates
): string =>
  ordering === OrderingEnum.alphabetic
    ? "name"
    : distanceParameter(userCoordinates);

export const selectOnlineMerchantsQuery = (
  nameFilter: Option<string>,
  productCategoriesFilter: Option<ReadonlyArray<ProductCategory>>,
  page: Option<number>,
  maybePageSize: Option<number>
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

export const selectOfflineMerchantsQuery = (
  searchRequest: OfflineMerchantSearchRequest
): string => `
SELECT
  id,
  name,
  product_categories,
  full_address AS address,
  latitude,
  longitude,
  ${distanceParameter(searchRequest.userCoordinates)} AS distance
FROM offline_merchant
WHERE 1 = 1
  ${boundingBoxFilter(searchRequest.boundingBox)}
  ${nameFilterQueryPart(fromNullable(searchRequest.merchantName))}
  ${categoryFilter(fromNullable(searchRequest.productCategories))}
ORDER BY ${orderingParameter(
  fromNullable(searchRequest.ordering).getOrElse(OrderingEnum.distance),
  searchRequest.userCoordinates
)} ASC
LIMIT ${pageSize(fromNullable(searchRequest.pageSize))}
OFFSET ${offset(
  fromNullable(searchRequest.page),
  fromNullable(searchRequest.pageSize)
)}`;
