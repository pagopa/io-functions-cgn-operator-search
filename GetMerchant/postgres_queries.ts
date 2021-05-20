export const SelectMerchantProfileQuery = `
SELECT
    p.agreement_fk,
    p.profile_k,
    p.name,
    p.description,
    p.website_url,
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
      d.description,
      d.start_date,
      d.end_date,
      d.discount_value,
      d.condition,
      d.static_code
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
    array_agg(d.product_category) AS product_categories
FROM discounts_with_categories d
GROUP BY 1,2,3,4,5,6,7,8`;
