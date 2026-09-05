-- Seed Default System Categories (user_id is NULL so accessible to all users)
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
