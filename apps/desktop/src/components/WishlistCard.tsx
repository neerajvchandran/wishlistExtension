import React from 'react';
import { WishlistItem } from '@everything-wishlist/shared';
import {
  ExternalLink,
  Edit3,
  Trash2,
  Tag,
  MessageSquare,
  Sparkles,
  ShoppingBag,
  Gift,
  HelpCircle,
  Film,
  Bookmark,
  Utensils,
  Compass,
  Calendar
} from 'lucide-react';

interface WishlistCardProps {
  item: WishlistItem;
  onEdit: (item: WishlistItem) => void;
  onDelete: (id: string) => void;
}

const intentColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  buy: { bg: 'bg-emerald-950/80 border-emerald-800/60', text: 'text-emerald-300', icon: <ShoppingBag className="w-3 h-3" /> },
  gift: { bg: 'bg-pink-950/80 border-pink-800/60', text: 'text-pink-300', icon: <Gift className="w-3 h-3" /> },
  research: { bg: 'bg-sky-950/80 border-sky-800/60', text: 'text-sky-300', icon: <HelpCircle className="w-3 h-3" /> },
  try: { bg: 'bg-amber-950/80 border-amber-800/60', text: 'text-amber-300', icon: <Sparkles className="w-3 h-3" /> },
  watch: { bg: 'bg-indigo-950/80 border-indigo-800/60', text: 'text-indigo-300', icon: <Film className="w-3 h-3" /> },
  read: { bg: 'bg-teal-950/80 border-teal-800/60', text: 'text-teal-300', icon: <Bookmark className="w-3 h-3" /> },
  eat: { bg: 'bg-orange-950/80 border-orange-800/60', text: 'text-orange-300', icon: <Utensils className="w-3 h-3" /> },
  visit: { bg: 'bg-cyan-950/80 border-cyan-800/60', text: 'text-cyan-300', icon: <Compass className="w-3 h-3" /> },
  other: { bg: 'bg-slate-900 border-slate-700', text: 'text-slate-300', icon: <Tag className="w-3 h-3" /> }
};

export const WishlistCard: React.FC<WishlistCardProps> = ({ item, onEdit, onDelete }) => {
  const intentConfig = intentColors[item.intent] || intentColors.other;
  const formattedDate = item.date_added
    ? new Date(item.date_added).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null;

  return (
    <div className="glass-card rounded-2xl overflow-hidden flex flex-col group relative">
      {/* Top Image Container */}
      <div className="relative w-full h-48 bg-slate-900/90 overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              // Gracefully handle broken image URLs
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
            <Sparkles className="w-10 h-10 stroke-[1.2] text-slate-700 mb-2" />
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-600">
              {item.category}
            </span>
          </div>
        )}

        {/* Intent Badge */}
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide border shadow-md backdrop-blur-md ${intentConfig.bg} ${intentConfig.text}`}>
            {intentConfig.icon}
            <span className="capitalize">{item.intent}</span>
          </span>
        </div>

        {/* Price Pill if available */}
        {item.price && (
          <div className="absolute top-3 right-3">
            <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-slate-950/80 border border-slate-700/80 text-emerald-400 backdrop-blur-md shadow-md">
              {item.price}
            </span>
          </div>
        )}

        {/* Quick Action Overlay Buttons */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
          <button
            onClick={() => onEdit(item)}
            className="p-2.5 bg-slate-900/90 hover:bg-brand-600 text-white rounded-xl shadow-lg transition-transform hover:scale-110 border border-white/10"
            title="Edit Item Details"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          {item.source_url && (
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 bg-slate-900/90 hover:bg-slate-800 text-white rounded-xl shadow-lg transition-transform hover:scale-110 border border-white/10"
              title="Open Source Link"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button
            onClick={() => onDelete(item.id)}
            className="p-2.5 bg-slate-900/90 hover:bg-rose-600 text-white rounded-xl shadow-lg transition-transform hover:scale-110 border border-white/10"
            title="Delete from Wishlist"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          {/* Category & Subcategory Tag */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-brand-400 mb-1.5">
            <span>{item.category}</span>
            {item.subcategory && (
              <>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">{item.subcategory}</span>
              </>
            )}
          </div>

          {/* Title */}
          <h3 className="text-base font-bold text-slate-100 group-hover:text-brand-300 transition-colors line-clamp-1">
            {item.title}
          </h3>

          {/* Description */}
          {item.description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}

          {/* User Prompt / Notes */}
          {item.user_prompt && (
            <div className="mt-3 p-2 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-start gap-2 text-xs text-slate-300">
              <MessageSquare className="w-3.5 h-3.5 text-brand-400 shrink-0 mt-0.5" />
              <p className="italic line-clamp-2">"{item.user_prompt}"</p>
            </div>
          )}
        </div>

        {/* Card Footer */}
        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1 truncate max-w-[140px]" title={item.source_website || 'Saved item'}>
            {item.source_website || 'Local Capture'}
          </span>
          {formattedDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-600" />
              {formattedDate}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
