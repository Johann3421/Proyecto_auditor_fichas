DROP INDEX IF EXISTS idx_fichas_published_at;
ALTER TABLE fichas DROP COLUMN IF EXISTS published_at;
