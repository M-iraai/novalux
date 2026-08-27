-- ============================================
-- MyShop Dashboard - Orders Only Schema
-- ============================================

-- 1. Orders Table (all-in-one, no products table)
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT DEFAULT '',
  color TEXT DEFAULT '',
  size TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Orders policies (single-user: authenticated = admin)
CREATE POLICY "Allow all for authenticated users" ON orders
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Create your admin user
-- Go to Dashboard > Authentication > Users > Add User
-- Email: admin@yourdomain.com
-- Password: (choose a strong password)
-- Auto Confirm: Yes

-- ============================================
-- Done! Your dashboard is ready.
-- Images are stored in Cloudflare R2 (not Supabase Storage).
-- ============================================
