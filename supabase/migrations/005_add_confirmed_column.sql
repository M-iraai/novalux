-- Add confirmed column to orders table
-- All orders will default to not confirmed (false)

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS confirmed BOOLEAN DEFAULT FALSE;

-- Update existing orders to not confirmed (they should already be false by default)
UPDATE orders SET confirmed = FALSE WHERE confirmed IS NULL;
