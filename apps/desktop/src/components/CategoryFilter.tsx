import React from 'react';
import { Category, IntentType } from '@everything-wishlist/shared';
import {
  Sparkles,
  Cpu,
  BookOpen,
  Film,
  Home,
  Utensils,
  Compass,
  Gamepad2,
  HeartPulse,
  Lightbulb,
  Grid,
  ShoppingBag,
  Gift,
  HelpCircle,
  Eye,
  Bookmark
} from 'lucide-react';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  selectedIntent: string;
  onSelectIntent: (intent: string) => void;
  totalItemsCount: number;
  availableIntents?: string[];
}

const iconMap: Record<string, React.ReactNode> = {
  Sparkles: <Sparkles className="w-3.5 h-3.5" />,
  Cpu: <Cpu className="w-3.5 h-3.5" />,
  BookOpen: <BookOpen className="w-3.5 h-3.5" />,
  Film: <Film className="w-3.5 h-3.5" />,
  Home: <Home className="w-3.5 h-3.5" />,
  Utensils: <Utensils className="w-3.5 h-3.5" />,
  Compass: <Compass className="w-3.5 h-3.5" />,
  Gamepad2: <Gamepad2 className="w-3.5 h-3.5" />,
  HeartPulse: <HeartPulse className="w-3.5 h-3.5" />,
  Lightbulb: <Lightbulb className="w-3.5 h-3.5" />
};

const allIntentBadges: { id: IntentType | 'all'; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'all', label: 'All Intents', icon: <Grid className="w-3 h-3" />, color: 'text-slate-300' },
  { id: 'buy', label: 'Buy', icon: <ShoppingBag className="w-3 h-3" />, color: 'text-emerald-400' },
  { id: 'gift', label: 'Gift', icon: <Gift className="w-3 h-3" />, color: 'text-pink-400' },
  { id: 'research', label: 'Research', icon: <HelpCircle className="w-3 h-3" />, color: 'text-sky-400' },
  { id: 'try', label: 'Try', icon: <Sparkles className="w-3 h-3" />, color: 'text-amber-400' },
  { id: 'watch', label: 'Watch', icon: <Film className="w-3 h-3" />, color: 'text-indigo-400' },
  { id: 'read', label: 'Read', icon: <Bookmark className="w-3 h-3" />, color: 'text-teal-400' },
  { id: 'eat', label: 'Eat / Dine', icon: <Utensils className="w-3 h-3" />, color: 'text-orange-400' },
  { id: 'visit', label: 'Visit', icon: <Compass className="w-3 h-3" />, color: 'text-cyan-400' },
];

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  selectedIntent,
  onSelectIntent,
  totalItemsCount,
  availableIntents = []
}) => {
  // If there are no items, hide the filter bar completely to keep the interface pristine and empty
  if (totalItemsCount === 0) {
    return null;
  }

  // Only display categories that actually have items in the user's wishlist
  const activeCategories = categories.filter((cat) => (cat.item_count || 0) > 0);

  // Only display intents that actually exist in saved items
  const activeIntents = allIntentBadges.filter(
    (b) => b.id === 'all' || availableIntents.includes(b.id)
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-6 pt-6 pb-2 space-y-3 animate-in fade-in duration-300">
      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => onSelectCategory('all')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            selectedCategory === 'all'
              ? 'bg-brand-600 text-white shadow-glow'
              : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          <span>All Categories</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
            selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
          }`}>
            {totalItemsCount}
          </span>
        </button>

        {activeCategories.map((cat) => {
          const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
          return (
            <button
              key={cat.id || cat.slug}
              onClick={() => onSelectCategory(cat.name)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-brand-600 text-white shadow-glow'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {iconMap[cat.icon || 'Sparkles'] || <Sparkles className="w-3.5 h-3.5" />}
              <span>{cat.name}</span>
              {(cat.item_count !== undefined && cat.item_count > 0) && (
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {cat.item_count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Intent Filters (Only rendered if more than 1 intent is available) */}
      {activeIntents.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-semibold text-brand-400 flex items-center gap-1 uppercase tracking-wider mr-1">
            <Sparkles className="w-3 h-3" />
            AI Intent:
          </span>
          {activeIntents.map((intent) => {
            const isSelected = selectedIntent === intent.id;
            return (
              <button
                key={intent.id}
                onClick={() => onSelectIntent(intent.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
                  isSelected
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <span className={intent.color}>{intent.icon}</span>
                <span>{intent.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
