-- READ ONLY. Compare types, nullability and defaults, not just the column count.
SELECT ordinal_position, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'quote_requests'
ORDER BY ordinal_position;
