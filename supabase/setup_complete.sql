-- =========================================================
-- Everything Wishlist - Complete Supabase Setup
-- Run this in your Supabase Dashboard -> SQL Editor -> Run
-- =========================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT DEFAULT 'Sparkles',
    subcategories TEXT[] DEFAULT '{}',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view system and their own categories') THEN
        CREATE POLICY "Users can view system and their own categories"
            ON public.categories FOR SELECT
            USING (user_id IS NULL OR auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create their own custom categories') THEN
        CREATE POLICY "Users can create their own custom categories"
            ON public.categories FOR INSERT
            WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own custom categories') THEN
        CREATE POLICY "Users can update their own custom categories"
            ON public.categories FOR UPDATE
            USING (user_id IS NULL OR auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own custom categories') THEN
        CREATE POLICY "Users can delete their own custom categories"
            ON public.categories FOR DELETE
            USING (user_id IS NULL OR auth.uid() = user_id);
    END IF;
END $$;

-- 3. Wishlist Items Table
CREATE TABLE IF NOT EXISTS public.wishlist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT NOT NULL,
    subcategory TEXT DEFAULT '',
    intent TEXT NOT NULL DEFAULT 'buy',
    image_url TEXT,
    source_url TEXT,
    source_website TEXT,
    price TEXT,
    user_prompt TEXT,
    date_added TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for wishlist_items
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own items') THEN
        CREATE POLICY "Users can view their own items"
            ON public.wishlist_items FOR SELECT
            USING (user_id IS NULL OR auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own items') THEN
        CREATE POLICY "Users can insert their own items"
            ON public.wishlist_items FOR INSERT
            WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own items') THEN
        CREATE POLICY "Users can update their own items"
            ON public.wishlist_items FOR UPDATE
            USING (user_id IS NULL OR auth.uid() = user_id)
            WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own items') THEN
        CREATE POLICY "Users can delete their own items"
            ON public.wishlist_items FOR DELETE
            USING (user_id IS NULL OR auth.uid() = user_id);
    END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_id ON public.wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_category ON public.wishlist_items(category);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_date_added ON public.wishlist_items(date_added DESC);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_metadata ON public.wishlist_items USING gin(metadata);

-- 4. Seed Default System Categories
INSERT INTO public.categories (name, slug, icon, subcategories, sort_order)
VALUES
    ('Fashion', 'fashion', 'Sparkles', ARRAY['Shoes', 'Sneakers', 'Tops', 'Pants', 'Jackets & Coats', 'Dresses', 'Accessories'], 1),
    ('Electronics & Tech', 'tech', 'Cpu', ARRAY['Smartphones', 'Laptops & Computers', 'Audio & Headphones', 'Wearables', 'Gaming Hardware', 'Cameras'], 2),
    ('Books', 'books', 'BookOpen', ARRAY['Non-Fiction', 'Fiction', 'Self-Help', 'Sci-Fi & Fantasy', 'Biography', 'Business'], 3),
    ('Movies & Shows', 'movies', 'Film', ARRAY['Movies', 'TV Series', 'Documentaries', 'Anime'], 4),
    ('Home & Living', 'home', 'Home', ARRAY['Furniture', 'Kitchenware', 'Decor', 'Lighting', 'Bed & Bath'], 5),
    ('Food & Dining', 'food', 'Utensils', ARRAY['Restaurants & Cafes', 'Recipes & Cooking', 'Coffee & Tea', 'Wine & Spirits'], 6),
    ('Travel & Places', 'travel', 'Compass', ARRAY['Destinations', 'Hotels & Stays', 'Landmarks & Sights', 'Activities'], 7),
    ('Gaming & Toys', 'gaming', 'Gamepad2', ARRAY['Video Games', 'Toys & Collectibles', 'Board Games', 'LEGO & Building'], 8),
    ('Health & Beauty', 'health-beauty', 'HeartPulse', ARRAY['Skincare', 'Makeup & Cosmetics', 'Fragrances', 'Fitness & Gym'], 9),
    ('Research & Ideas', 'research', 'Lightbulb', ARRAY['Articles & Papers', 'Software & Tools', 'Tutorials & Guides', 'Project Ideas'], 10)
ON CONFLICT (slug) DO NOTHING;
