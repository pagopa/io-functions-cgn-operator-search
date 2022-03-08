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
        O.map(_ => "distance"),
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
  website_url,
  discount_code_type
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

export const SelectMerchantProfileQuery = `
SELECT
    p.agreement_fk,
    p.profile_k,
    COALESCE( NULLIF(p.name, ''), p.full_name) AS name,
    p.description,
    p.website_url,
    p.discount_code_type,
    p.all_national_addresses,
    a.image_url
FROM profile p
JOIN agreement a ON (p.agreement_fk = a.agreement_k)
WHERE agreement_fk = :merchant_id
  AND a.state = 'APPROVED'
  AND a.start_date <= CURRENT_TIMESTAMP
  AND CURRENT_TIMESTAMP <= a.end_date`;

export const SelectMerchantAddressListQuery = `
SELECT 
    full_address,
    latitude,
    longitude
FROM address
WHERE profile_fk = :profile_key`;

export const SelectDiscountsByMerchantQuery = `
WITH operator_discounts AS (
  SELECT
      d.discount_k,
      d.name,
      NULLIF(d.description, '') AS description,
      d.start_date,
      d.end_date,
      d.discount_value,
      NULLIF(d.condition, '') AS condition,
      NULLIF(d.static_code, '') AS static_code,
      NULLIF(d.landing_page_url, '') AS landing_page_url,
      NULLIF(d.landing_page_referrer, '') AS landing_page_referrer,
      NULLIF(d.discount_url, '') AS discount_url
  FROM discount d
  WHERE d.agreement_fk = :agreement_key
    AND d.state = 'PUBLISHED'
    AND d.start_date <= CURRENT_TIMESTAMP
    AND CURRENT_TIMESTAMP <= d.end_date
),
discounts_with_categories AS (
  SELECT
      d.discount_k,
      d.name,
      d.description,
      d.start_date,
      d.end_date,
      d.discount_value,
      d.condition,
      d.static_code,
      d.landing_page_url,
      d.landing_page_referrer,
      d.discount_url,
      pc.product_category
  FROM operator_discounts d
  JOIN discount_product_category pc ON (pc.discount_fk = d.discount_k)
)
SELECT
    d.discount_k,
    d.name,
    d.description,
    d.start_date,
    d.end_date,
    d.discount_value,
    d.condition,
    d.static_code,
    d.landing_page_url,
    d.landing_page_referrer,
    d.discount_url,
    array_agg(d.product_category) AS product_categories
FROM discounts_with_categories d
GROUP BY 1,2,3,4,5,6,7,8,9,10,11`;

export const SelectDiscountBucketCodeByDiscount = `
SELECT 
  bucket_code_k,
  discount_fk,
  code,
  used,
  bucket_code_load_id
FROM discount_bucket_code
WHERE discount_fk = :discount_fk 
  AND NOT used 
ORDER BY bucket_code_k ASC 
LIMIT :limit 
FOR UPDATE 
SKIP LOCKED`;

export const UpdateDiscountBucketCodeSetUsed = `
UPDATE discount_bucket_code
SET used = true 
WHERE bucket_code_k in (:bucket_code_k_list)`;

export const SelectPublishedProductCategories = `
SELECT
  product_category
FROM published_product_category`;
