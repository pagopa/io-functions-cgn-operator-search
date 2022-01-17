export const SelectDiscountBucketCodeByDiscount = `
SELECT * 
FROM discount_bucket_code
WHERE discount_fk = :discount_fk 
  AND NOT used 
ORDER BY bucket_code_k ASC 
LIMIT 1 
FOR UPDATE 
SKIP LOCKED`;

export const UpdateDiscountBucketCodeSetUsed = `
UPDATE discount_bucket_code
SET used = true 
WHERE bucket_code_k = :bucket_code_k`;
