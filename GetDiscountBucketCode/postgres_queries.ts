export const SelectDiscountBucketCodeByDiscount = `
SELECT * 
FROM discount_bucket_code dbc
WHERE dbc.discount_fk = :discount_fk 
  AND NOT dbc.used 
ORDER BY dbc.bucket_code_k ASC 
LIMIT 1 
FOR UPDATE 
SKIP LOCKED`;

export const UpdateDiscountBucketCodeSetUsed = `
UPDATE discount_bucket_code dbc
SET dbc.used = true 
WHERE dbc.bucket_code_k = :bucket_code_k`;
