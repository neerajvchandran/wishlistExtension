import React, { useState, useEffect } from 'react';
import { WishlistItem, Category, IntentType } from '@everything-wishlist/shared';
import {
  X,
  Trash2,
  Save,
  Tag,
  Link,
  DollarSign,
  MessageSquare,
  Image,
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface ItemDetailModalProps {
  item: WishlistItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<WishlistItem>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  categories: Category[];
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave,
  onDelete,
  categories
}) => {
  const [formData, setFormData] = useState<Partial<WishlistItem>>({
    title: '',
    description: '',
    category: 'Fashion',
    subcategory: '',
    intent: 'buy',
    price: '',
    source_url: '',
    source_website: '',
    image_url: '',
    user_prompt: ''
  });

  useEffect(() => {
    if (item) {
      setFormData(item);
    } else {
      setFormData({
        title: '',
        description: '',
        category: 'Fashion',
        subcategory: '',
        intent: 'buy',
        price: '',
        source_url: '',
        source_website: '',
        image_url: '',
        user_prompt: ''
      });
    }
  }, [item, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) return;
    await onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl glass-panel rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-950/80 border border-brand-800/50 flex items-center justify-center text-brand-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {item ? 'Edit Wishlist Item' : 'Add New Item to Wishlist'}
              </h2>
              <p className="text-xs text-slate-400">
                AI suggestions are flexible — customize any field to match your preference.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Nike Vomero 5"
              className="w-full px-3.5 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
            />
          </div>

          {/* Category, Subcategory, and Intent */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Category</label>
              <input
                type="text"
                list="category-suggestions"
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Category"
                className="w-full px-3 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-500"
              />
              <datalist id="category-suggestions">
                {categories.map((c) => (
                  <option key={c.id || c.name} value={c.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Subcategory</label>
              <input
                type="text"
                value={formData.subcategory || ''}
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                placeholder="e.g. Shoes, Sci-Fi"
                className="w-full px-3 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Intent</label>
              <select
                value={formData.intent || 'buy'}
                onChange={(e) => setFormData({ ...formData, intent: e.target.value as IntentType })}
                className="w-full px-3 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-500"
              >
                <option value="buy">Buy</option>
                <option value="gift">Gift</option>
                <option value="research">Research</option>
                <option value="try">Try</option>
                <option value="watch">Watch</option>
                <option value="read">Read</option>
                <option value="eat">Eat / Dine</option>
                <option value="visit">Visit</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Price & Website */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Price</label>
              <div className="relative">
                <DollarSign className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.price || ''}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="$160 or €45"
                  className="w-full pl-8 pr-3 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Source Website</label>
              <input
                type="text"
                value={formData.source_website || ''}
                onChange={(e) => setFormData({ ...formData, source_website: e.target.value })}
                placeholder="e.g. nike.com, amazon.com"
                className="w-full px-3 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Description</label>
            <textarea
              rows={2}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Summary or item details..."
              className="w-full p-3 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-500 resize-none"
            />
          </div>

          {/* User Prompt / Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Personal Notes / Context
            </label>
            <div className="relative">
              <MessageSquare className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
              <textarea
                rows={2}
                value={formData.user_prompt || ''}
                onChange={(e) => setFormData({ ...formData, user_prompt: e.target.value })}
                placeholder="e.g. 'Gift for cousin's birthday in October'"
                className="w-full pl-8 pr-3 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-500 resize-none"
              />
            </div>
          </div>

          {/* Source URL & Image URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Source URL</label>
              <div className="relative">
                <Link className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  value={formData.source_url || ''}
                  onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full pl-8 pr-3 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Image URL</label>
              <div className="relative">
                <Image className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.image_url || ''}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://... or base64"
                  className="w-full pl-8 pr-3 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
          <div>
            {item && onDelete && (
              <button
                type="button"
                onClick={async () => {
                  if (confirm(`Delete "${item.title}" from wishlist?`)) {
                    await onDelete(item.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 rounded-xl text-xs font-semibold transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Item</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="glow-btn flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-glow transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{item ? 'Save Changes' : 'Create Item'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
