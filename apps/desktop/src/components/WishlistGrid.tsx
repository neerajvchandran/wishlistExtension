import React from 'react';
import { WishlistItem } from '@everything-wishlist/shared';
import { WishlistCard } from './WishlistCard';
import { Sparkles, PackageOpen, Plus, Camera } from 'lucide-react';

interface WishlistGridProps {
  items: WishlistItem[];
  selectedCategory: string;
  onEditItem: (item: WishlistItem) => void;
  onDeleteItem: (id: string) => void;
  onTriggerCapture: () => void;
  onOpenNewItem: () => void;
}

export const WishlistGrid: React.FC<WishlistGridProps> = ({
  items,
  selectedCategory,
  onEditItem,
  onDeleteItem,
  onTriggerCapture,
  onOpenNewItem
}) => {
  if (items.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto my-16 p-8 glass-panel rounded-3xl text-center flex flex-col items-center gap-4 border border-slate-800/80">
        <div className="w-16 h-16 rounded-2xl bg-brand-950/60 border border-brand-800/50 flex items-center justify-center text-brand-400 mb-2">
          <PackageOpen className="w-8 h-8 stroke-[1.5]" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-100">No Wishlist Items Found</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            {selectedCategory === 'all'
              ? 'Start building your wishlist by snipping an item from your screen or adding one manually.'
              : `No items found in the "${selectedCategory}" category.`}
          </p>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={onTriggerCapture}
            className="glow-btn flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl shadow-glow transition-all"
          >
            <Camera className="w-4 h-4" />
            <span>Snip Screen (Ctrl+Shift+S)</span>
          </button>
          <button
            onClick={onOpenNewItem}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-sm font-semibold rounded-xl border border-slate-700 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Manually</span>
          </button>
        </div>
      </div>
    );
  }

  // If "all" categories are selected, group items by category sections
  if (selectedCategory === 'all') {
    const categoryGroups: Record<string, WishlistItem[]> = {};
    items.forEach((item) => {
      const cat = item.category || 'Other';
      if (!categoryGroups[cat]) categoryGroups[cat] = [];
      categoryGroups[cat].push(item);
    });

    const categoryNames = Object.keys(categoryGroups);

    return (
      <div className="w-full max-w-7xl mx-auto px-6 py-4 space-y-10">
        {categoryNames.map((catName) => {
          const groupItems = categoryGroups[catName];
          return (
            <section key={catName} className="space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-800/60">
                <Sparkles className="w-4 h-4 text-brand-400" />
                <h2 className="text-lg font-bold text-slate-100 tracking-tight">
                  {catName}
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/50">
                  {groupItems.length}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {groupItems.map((item) => (
                  <WishlistCard
                    key={item.id}
                    item={item}
                    onEdit={onEditItem}
                    onDelete={onDeleteItem}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  // Specific category selected: single grid
  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {items.map((item) => (
          <WishlistCard
            key={item.id}
            item={item}
            onEdit={onEditItem}
            onDelete={onDeleteItem}
          />
        ))}
      </div>
    </div>
  );
};
