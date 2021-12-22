import * as O from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/function";
import { BoundingBox } from "../generated/definitions/BoundingBox";
import { Coordinates } from "../generated/definitions/Coordinates";
import { ProductCategory } from "../generated/definitions/ProductCategory";
import { ProductCategoryToQueryColumn } from "../models/ProductCategories";
import { OrderingEnum } from "../generated/definitions/OfflineMerchantSearchRequest";
import { OfflineMerchantSearchRequest } from "../generated/definitions/OfflineMerchantSearchRequest";

const categoryFilter = (
  productCategoriesFilter: O.Option<ReadonlyArray<ProductCategory>>
): string =>
  pipe(
    productCategoriesFilter,
    O.map(s => s.map(c => ProductCategoryToQueryColumn(c)).join(" OR ")),
    O.map(s => `AND (${s})`),
    O.getOrElse(() => "")
  );

const nameFilterQueryPart = (nameFilter: O.Option<string>): string =>
  pipe(
    nameFilter,
    O.map(__ => " AND searchable_name LIKE :name_filter "),
    O.getOrElse(() => "")
  );

const pageNumber = (maybePage: O.Option<number>): number =>
  pipe(
    maybePage,
    O.getOrElse(() => 0)
  );

const pageSize = (maybePageSize: O.Option<number>): number =>
  pipe(
    maybePageSize,
    O.getOrElse(() => 100)
  );

const offset = (
  page: O.Option<number>,
  maybePageSize: O.Option<number>
): number => pageNumber(page) * pageSize(maybePageSize);

const getBoundingBoxMinLatitude = (boundingBox: BoundingBox): number =>
  boundingBox.coordinates.latitude - boundingBox.deltaLatitude / 2;

const getBoundingBoxMaxLatitude = (boundingBox: BoundingBox): number =>
  // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
  boundingBox.coordinates.latitude + boundingBox.deltaLatitude / 2;

const getBoundingBoxMinLongitude = (boundingBox: BoundingBox): number =>
  boundingBox.coordinates.longitude - boundingBox.deltaLongitude / 2;

const getBoundingBoxMaxLongitude = (boundingBox: BoundingBox): number =>
  // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
  boundingBox.coordinates.longitude + boundingBox.deltaLongitude / 2;

const boundingBoxFilter = (boundingBox: BoundingBox): string =>
  ` AND latitude BETWEEN ${getBoundingBoxMinLatitude(boundingBox)} 
        AND ${getBoundingBoxMaxLatitude(boundingBox)}
    AND longitude BETWEEN ${getBoundingBoxMinLongitude(boundingBox)} 
        AND ${getBoundingBoxMaxLongitude(boundingBox)} `;

const distanceParameter = (userCoordinates: Coordinates): string =>
  `ST_MakePoint(longitude, latitude)::geography <-> ST_MakePoint(${userCoordinates.longitude}, ${userCoordinates.latitude})::geography AS distance`;

const orderingParameter = (
  ordering: OrderingEnum,
  maybeUserCoordinates: O.Option<Coordinates>
): string =>
  ordering === OrderingEnum.alphabetic
    ? "searchable_name"
    : pipe(
        maybeUserCoordinates,
        O.map(distanceParameter),
        O.getOrElse(() => "searchable_name")
      );

export const selectOnlineMerchantsQuery = (
  nameFilter: O.Option<string>,
  productCategoriesFilter: O.Option<ReadonlyArray<ProductCategory>>,
  page: O.Option<number>,
  maybePageSize: O.Option<number>
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
ORDER BY searchable_name ASC
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
  longitude${pipe(
    searchRequest.userCoordinates,
    O.fromNullable,
    O.map(distanceParameter),
    O.map(distanceParam => `,${distanceParam}`),
    O.getOrElse(() => "")
  )}
FROM offline_merchant
WHERE 1 = 1
  ${pipe(
    searchRequest.boundingBox,
    O.fromNullable,
    O.map(boundingBoxFilter),
    O.getOrElse(() => "")
  )}
  ${nameFilterQueryPart(O.fromNullable(searchRequest.merchantName))}
  ${categoryFilter(O.fromNullable(searchRequest.productCategories))}
ORDER BY ${orderingParameter(
  pipe(
    searchRequest.ordering,
    O.fromNullable,
    O.getOrElseW(() => OrderingEnum.distance)
  ),
  O.fromNullable(searchRequest.userCoordinates)
)} ASC
LIMIT ${pageSize(O.fromNullable(searchRequest.pageSize))}
OFFSET ${offset(
  O.fromNullable(searchRequest.page),
  O.fromNullable(searchRequest.pageSize)
)}`;
