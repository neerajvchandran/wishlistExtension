import React, { useState } from 'react';
import { WishlistItem, StructuredAIOutput, IntentType } from '@everything-wishlist/shared';
import { analyzeCapture } from '../services/api';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Check,
  Tag,
  ShoppingBag,
  Gift,
  HelpCircle,
  Clock,
  Edit2
} from 'lucide-react';

interface QuickPromptModalProps {
  imageBase64: string | null;
  onClose: () => void;
  onSave: (item: Partial<WishlistItem>) => Promise<void>;
}

const quickPromptSuggestions = [
  'Buy this',
  'Gift for my cousin',
  'Research this',
  'Want to try this later',
  'Gift for birthday'
];

export const QuickPromptModal: React.FC<QuickPromptModalProps> = ({
  imageBase64,
  onClose,
  onSave
}) => {
  const [userPrompt, setUserPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedData, setAnalyzedData] = useState<StructuredAIOutput | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  if (!imageBase64) return null;

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeCapture(imageBase64, userPrompt);
      setAnalyzedData(result);
    } catch (err: any) {
      console.error('Error analyzing image:', err);
      // Create sensible fallback on error
      setAnalyzedData({
        title: userPrompt || 'Captured Item',
        description: 'Captured from screen.',
        category: 'Other',
        subcategory: 'General',
        intent: 'buy',
        price: null,
        tags: ['snip']
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFinalSave = async () => {
    if (!analyzedData) return;
    setIsSaving(true);
    try {
      await onSave({
        title: analyzedData.title,
        description: analyzedData.description,
        category: analyzedData.category,
        subcategory: analyzedData.subcategory,
        intent: analyzedData.intent,
        price: analyzedData.price,
        user_prompt: userPrompt,
        image_url: imageBase64, // Keep image preview for user's wishlist
        metadata: {
          tags: analyzedData.tags,
          captured_at: new Date().toISOString()
        }
      });
      onClose();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg glass-panel rounded-3xl border border-slate-700/70 shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-950/80 border border-brand-800/50 flex items-center justify-center text-brand-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Quick Capture Context</h3>
              <p className="text-[11px] text-slate-400">Add notes or intentions before AI analysis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Captured Snip Preview Thumbnail */}
          <div className="relative w-full h-44 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center">
            <img
              src={imageBase64}
              alt="Screen Snip Preview"
              className="w-full h-full object-contain"
            />
            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] text-slate-300 font-mono">
              Temporary Capture
            </div>
          </div>

          {!analyzedData ? (
            /* Prompt Input Phase */
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                  Add Context (optional)
                </label>
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="e.g. 'Gift for my cousin', 'Buy this on sale', 'Research this paper'..."
                  rows={2}
                  className="w-full p-3 bg-slate-900/90 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 resize-none transition-all"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAnalyze();
                    }
                  }}
                />
              </div>

              {/* Quick Preset Chips */}
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Quick Suggestions:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {quickPromptSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setUserPrompt(suggestion)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        userPrompt === suggestion
                          ? 'bg-brand-950 text-brand-300 border-brand-800'
                          : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
                      }`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* AI Result Verification & Edit Phase */
            <div className="space-y-3 bg-slate-900/70 p-4 rounded-2xl border border-brand-900/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-brand-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Identification Result
                </span>
                <span className="text-[10px] text-slate-500">Edit anything if needed</span>
              </div>

              {/* Title Editor */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Item Title</label>
                <input
                  type="text"
                  value={analyzedData.title}
                  onChange={(e) => setAnalyzedData({ ...analyzedData, title: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-semibold focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Category & Subcategory */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">Category</label>
                  <input
                    type="text"
                    value={analyzedData.category}
                    onChange={(e) => setAnalyzedData({ ...analyzedData, category: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">Subcategory</label>
                  <input
                    type="text"
                    value={analyzedData.subcategory}
                    onChange={(e) => setAnalyzedData({ ...analyzedData, subcategory: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Intent & Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">Intent</label>
                  <select
                    value={analyzedData.intent}
                    onChange={(e) => setAnalyzedData({ ...analyzedData, intent: e.target.value as IntentType })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-brand-500"
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
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">Price (Optional)</label>
                  <input
                    type="text"
                    value={analyzedData.price || ''}
                    placeholder="$0.00"
                    onChange={(e) => setAnalyzedData({ ...analyzedData, price: e.target.value || null })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Description</label>
                <textarea
                  value={analyzedData.description}
                  onChange={(e) => setAnalyzedData({ ...analyzedData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-xl transition-all"
          >
            Cancel
          </button>

          {!analyzedData ? (
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="glow-btn flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-glow transition-all disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>AI Analyzing Image...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Analyze & Categorize</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleFinalSave}
              disabled={isSaving}
              className="glow-btn flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-xl shadow-glow transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save to Wishlist</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
