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
      <div className="w-full max-w-2xl mx-auto my-12 p-8 glass-panel rounded-3xl text-center flex flex-col items-center gap-5 border border-slate-800/80 shadow-2xl animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-900/60 to-indigo-900/60 border border-brand-500/30 flex items-center justify-center text-brand-400 shadow-glow">
          <Sparkles className="w-8 h-8 stroke-[1.8]" />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-950/70 border border-brand-800/60 text-brand-300 text-xs font-semibold mb-2">
            <Sparkles className="w-3 h-3" />
            AI-Driven Wishlist Canvas
          </div>
          <h3 className="text-xl font-extrabold text-slate-100 tracking-tight">Your Wishlist is Fresh & Ready</h3>
          <p className="text-sm text-slate-400 mt-2 max-w-lg mx-auto leading-relaxed">
            Capture anything you want to buy, watch, read, research, or try. The AI automatically deduces what it's for, categorizes it, provides smart default comments, and summarizes long notes into bullet points.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full my-2 text-left">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/70">
            <span className="text-[11px] font-bold text-brand-400 block mb-1">✦ Auto Deduce</span>
            <p className="text-xs text-slate-400">AI predicts if it's for Watching, Reading, Buying, Dining, or Researching.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/70">
            <span className="text-[11px] font-bold text-emerald-400 block mb-1">✦ Smart Comments</span>
            <p className="text-xs text-slate-400">Pre-suggests "Watch this", "Read this", or stock alerts that you can edit anytime.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/70">
            <span className="text-[11px] font-bold text-purple-400 block mb-1">✦ Bullet Summaries</span>
            <p className="text-xs text-slate-400">Any long notes or comments are automatically distilled into clean bullet points.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-1">
          <button
            onClick={onTriggerCapture}
            className="glow-btn flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl shadow-glow transition-all"
          >
            <Camera className="w-4 h-4" />
            <span>Snip Screen (Ctrl+Shift+S)</span>
          </button>
          <button
            onClick={onOpenNewItem}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-sm font-semibold rounded-xl border border-slate-700/80 transition-all"
          >
            <Plus className="w-4 h-4 text-brand-400" />
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
