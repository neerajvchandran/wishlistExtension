export interface CanonicalCategoryDefinition {
  name: string;
  slug: string;
  icon: string;
  aliases: string[];
  subcategories: string[];
}

export const CANONICAL_CATEGORIES: CanonicalCategoryDefinition[] = [
  {
    name: 'Fashion',
    slug: 'fashion',
    icon: 'Sparkles',
    aliases: ['clothes', 'clothing', 'apparel', 'wear', 'garments', 'outfits', 'wardrobe', 'footwear', 'shoes', 'fashion'],
    subcategories: ['Shoes', 'Sneakers', 'Tops', 'Pants', 'Jackets & Coats', 'Dresses', 'Accessories', 'Bags', 'Jewelry']
  },
  {
    name: 'Electronics & Tech',
    slug: 'tech',
    icon: 'Cpu',
    aliases: ['tech', 'technology', 'gadgets', 'electronics', 'hardware', 'computers', 'phones', 'audio', 'appliances'],
    subcategories: ['Smartphones', 'Laptops & Computers', 'Audio & Headphones', 'Wearables', 'Gaming Hardware', 'Cameras', 'Smart Home', 'Accessories']
  },
  {
    name: 'Books',
    slug: 'books',
    icon: 'BookOpen',
    aliases: ['book', 'books', 'literature', 'reading', 'novels', 'non-fiction', 'ebooks', 'textbooks', 'comics', 'manga'],
    subcategories: ['Non-Fiction', 'Fiction', 'Self-Help', 'Sci-Fi & Fantasy', 'Biography', 'Business', 'Comics & Graphic Novels']
  },
  {
    name: 'Movies & Shows',
    slug: 'movies',
    icon: 'Film',
    aliases: ['movie', 'movies', 'film', 'films', 'tv', 'tv shows', 'series', 'cinema', 'documentaries', 'anime', 'watch'],
    subcategories: ['Movies', 'TV Series', 'Documentaries', 'Anime', 'Mini-Series']
  },
  {
    name: 'Home & Living',
    slug: 'home',
    icon: 'Home',
    aliases: ['home', 'house', 'furniture', 'decor', 'kitchen', 'interior', 'bedding', 'bath', 'lighting'],
    subcategories: ['Furniture', 'Kitchenware', 'Decor', 'Lighting', 'Bed & Bath', 'Organization', 'Plants & Garden']
  },
  {
    name: 'Food & Dining',
    slug: 'food',
    icon: 'Utensils',
    aliases: ['food', 'dining', 'restaurants', 'restaurant', 'cafes', 'coffee', 'recipes', 'baking', 'snacks', 'eat', 'drinks', 'cocktails'],
    subcategories: ['Restaurants & Cafes', 'Recipes & Cooking', 'Coffee & Tea', 'Wine & Spirits', 'Snacks & Sweets']
  },
  {
    name: 'Travel & Places',
    slug: 'travel',
    icon: 'Compass',
    aliases: ['travel', 'places', 'destinations', 'vacation', 'trips', 'hotels', 'attractions', 'cities', 'visit'],
    subcategories: ['Destinations', 'Hotels & Stays', 'Landmarks & Sights', 'Outdoor & Nature', 'Activities']
  },
  {
    name: 'Gaming & Toys',
    slug: 'gaming',
    icon: 'Gamepad2',
    aliases: ['gaming', 'games', 'video games', 'toys', 'collectibles', 'lego', 'board games', 'hobbies'],
    subcategories: ['Video Games', 'Toys & Collectibles', 'Board Games', 'LEGO & Building', 'Merchandise']
  },
  {
    name: 'Health & Beauty',
    slug: 'health-beauty',
    icon: 'HeartPulse',
    aliases: ['health', 'beauty', 'skincare', 'wellness', 'fitness', 'cosmetics', 'grooming', 'supplements', 'personal care'],
    subcategories: ['Skincare', 'Makeup & Cosmetics', 'Fragrances', 'Fitness & Gym', 'Wellness & Care']
  },
  {
    name: 'Research & Ideas',
    slug: 'research',
    icon: 'Lightbulb',
    aliases: ['research', 'ideas', 'learning', 'articles', 'papers', 'topics', 'projects', 'tools', 'software', 'skills'],
    subcategories: ['Articles & Papers', 'Software & Tools', 'Tutorials & Guides', 'Project Ideas', 'Topics to Explore']
  }
];

/**
 * Normalizes a raw category string or alias to its canonical representation.
 * If no matching canonical category is found, title-cases the string cleanly.
 */
export function normalizeCategory(rawCategory?: string): { category: string; matchedCanonical: boolean } {
  if (!rawCategory || !rawCategory.trim()) {
    return { category: 'Other', matchedCanonical: false };
  }

  const cleaned = rawCategory.trim().toLowerCase();

  for (const item of CANONICAL_CATEGORIES) {
    if (
      item.name.toLowerCase() === cleaned ||
      item.slug.toLowerCase() === cleaned ||
      item.aliases.some((alias) => alias.toLowerCase() === cleaned || cleaned.includes(alias.toLowerCase()))
    ) {
      return { category: item.name, matchedCanonical: true };
    }
  }

  // Capitalize neatly if it's a new custom user-defined category
  const formatted = rawCategory
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return { category: formatted, matchedCanonical: false };
}
