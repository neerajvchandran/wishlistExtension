-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Categories Table (data-driven categories)
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

-- Categories RLS: Users can view public system categories (user_id IS NULL) or their own custom categories
CREATE POLICY "Users can view system and their own categories"
    ON public.categories FOR SELECT
    USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can create their own custom categories"
    ON public.categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom categories"
    ON public.categories FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom categories"
    ON public.categories FOR DELETE
    USING (auth.uid() = user_id);

-- 2. Wishlist Items Table
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

-- Wishlist Items RLS: Users can view their own or unauthenticated desktop items
CREATE POLICY "Users can view their own items"
    ON public.wishlist_items FOR SELECT
    USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can insert their own items"
    ON public.wishlist_items FOR INSERT
    WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can update their own items"
    ON public.wishlist_items FOR UPDATE
    USING (user_id IS NULL OR auth.uid() = user_id)
    WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can delete their own items"
    ON public.wishlist_items FOR DELETE
    USING (user_id IS NULL OR auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_id ON public.wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_category ON public.wishlist_items(category);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_date_added ON public.wishlist_items(date_added DESC);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_metadata ON public.wishlist_items USING gin(metadata);

-- Storage bucket for wishlist item images
INSERT INTO storage.buckets (id, name, public)
VALUES ('wishlist-images', 'wishlist-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload their own wishlist images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'wishlist-images' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view public wishlist images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'wishlist-images');
