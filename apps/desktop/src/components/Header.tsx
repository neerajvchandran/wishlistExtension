import React from 'react';
import {
  Sparkles,
  Camera,
  Plus,
  Search,
  Settings,
  X,
  Layers
} from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onTriggerCapture: () => void;
  onOpenNewItem: () => void;
  onOpenSettings: () => void;
  totalItems: number;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onTriggerCapture,
  onOpenNewItem,
  onOpenSettings,
  totalItems
}) => {
  return (
    <header className="sticky top-0 z-30 w-full glass-panel border-b border-slate-800/80 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-purple-400 p-[1px] shadow-glow flex items-center justify-center">
            <div className="w-full h-full bg-[#090d16] rounded-[11px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-brand-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                Everything <span className="bg-gradient-to-r from-brand-400 via-purple-300 to-indigo-300 bg-clip-text text-transparent">Wishlist</span>
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand-950/80 border border-brand-800/50 text-brand-300 font-medium">
                AI Powered
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-slate-500" />
              <span>{totalItems} {totalItems === 1 ? 'item' : 'items'} captured</span>
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search items, categories, tags, or notes..."
            className="w-full pl-10 pr-9 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 self-end md:self-auto">
          <button
            onClick={onTriggerCapture}
            className="glow-btn flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl shadow-glow transition-all"
            title="Snip screen area (Global shortcut: Ctrl+Shift+S)"
          >
            <Camera className="w-4 h-4" />
            <span>Snip Screen</span>
            <span className="hidden sm:inline-block text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-black/30 border border-white/10 text-brand-200">
              Ctrl+Shift+S
            </span>
          </button>

          <button
            onClick={onOpenNewItem}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800/90 hover:bg-slate-700/80 border border-slate-700/70 text-slate-200 hover:text-white text-sm font-medium rounded-xl transition-all"
          >
            <Plus className="w-4 h-4 text-brand-400" />
            <span>Add Item</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"
            title="Settings & Integrations"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
