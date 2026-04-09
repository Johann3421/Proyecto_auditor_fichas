ALTER TABLE fichas ADD COLUMN IF NOT EXISTS published_at DATE;
CREATE INDEX IF NOT EXISTS idx_fichas_published_at ON fichas (published_at);
