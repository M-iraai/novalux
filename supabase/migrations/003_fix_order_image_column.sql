DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE orders ADD COLUMN image_url TEXT DEFAULT '';
  END IF;
END $$;
