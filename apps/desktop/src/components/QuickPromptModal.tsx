import React, { useState, useEffect } from 'react';
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
      // Pre-populate with AI suggested default comment
      if (result.suggested_comment) {
        setUserPrompt(result.suggested_comment);
      }
    } catch (err: any) {
      console.error('Error analyzing image:', err);
      // Fallback
      setAnalyzedData({
        title: userPrompt || 'Captured Screen Item',
        description: 'Captured from screen.',
        category: 'Other',
        subcategory: 'General',
        intent: 'buy',
        intent_reasoning: 'AI analyzed screen capture.',
        suggested_comment: 'Check this out',
        bullet_points: userPrompt ? [userPrompt] : [],
        price: null,
        tags: ['snip']
      });
      if (!userPrompt) {
        setUserPrompt('Check this out');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auto-analyze screen content immediately upon capture
  useEffect(() => {
    if (imageBase64 && !analyzedData && !isAnalyzing) {
      handleAnalyze();
    }
  }, [imageBase64]);

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
        intent_reasoning: analyzedData.intent_reasoning,
        suggested_comment: analyzedData.suggested_comment,
        bullet_points: analyzedData.bullet_points,
        price: analyzedData.price,
        user_prompt: userPrompt,
        image_url: imageBase64, // Keep image preview for user's wishlist
        metadata: {
          tags: analyzedData.tags,
          captured_at: new Date().toISOString(),
          intent_reasoning: analyzedData.intent_reasoning,
          bullet_points: analyzedData.bullet_points
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
              <h3 className="text-sm font-bold text-slate-100">AI Screen Snip Capture</h3>
              <p className="text-[11px] text-slate-400">AI reads entire screen content, deduces purpose, and organizes</p>
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

          {isAnalyzing && !analyzedData ? (
            /* AI Scanning State */
            <div className="p-7 flex flex-col items-center justify-center text-center space-y-3 bg-slate-900/60 rounded-2xl border border-brand-900/40 animate-in fade-in duration-200">
              <div className="w-11 h-11 rounded-2xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
                <Sparkles className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100">Reading Entire Screen Contents...</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                  AI is scanning visible text, detecting stock status, and deducing what this item is for.
                </p>
              </div>
            </div>
          ) : analyzedData ? (
            /* AI Result Verification & Edit Phase */
            <div className="space-y-3.5 bg-slate-900/70 p-4 rounded-2xl border border-brand-900/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-brand-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Decision & Identification
                </span>
                <span className="text-[10px] text-slate-400 bg-brand-950/60 px-2 py-0.5 rounded border border-brand-800/40">
                  ✦ AI Deduces Intent & Summaries
                </span>
              </div>

              {/* AI Reasoning Callout */}
              {analyzedData.intent_reasoning && (
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-brand-300/90 flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-brand-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">AI Reasoning: </span>
                    <span>{analyzedData.intent_reasoning}</span>
                  </div>
                </div>
              )}

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
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Intent (AI Deduced: {analyzedData.intent})
                  </label>
                  <select
                    value={analyzedData.intent}
                    onChange={(e) => setAnalyzedData({ ...analyzedData, intent: e.target.value as IntentType })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    <option value="buy">Buy</option>
                    <option value="watch">Watch</option>
                    <option value="read">Read</option>
                    <option value="research">Research</option>
                    <option value="eat">Eat / Dine</option>
                    <option value="visit">Visit</option>
                    <option value="gift">Gift</option>
                    <option value="try">Try</option>
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

              {/* Comment / Note with Quick Clear */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-slate-400">
                    Comment / Notes
                  </label>
                  <div className="flex items-center gap-2">
                    {userPrompt && (
                      <button
                        type="button"
                        onClick={() => setUserPrompt('')}
                        className="text-[10px] text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        Clear comment
                      </button>
                    )}
                    {analyzedData.suggested_comment && userPrompt !== analyzedData.suggested_comment && (
                      <button
                        type="button"
                        onClick={() => setUserPrompt(analyzedData.suggested_comment || '')}
                        className="text-[10px] text-brand-400 hover:text-brand-300 transition-colors"
                      >
                        Use AI Suggestion: "{analyzedData.suggested_comment}"
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="Notes or context..."
                  rows={2}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>

              {/* AI Bullet Points Summary Preview */}
              {analyzedData.bullet_points && analyzedData.bullet_points.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-950 border border-brand-900/40 space-y-1">
                  <span className="text-[10px] font-bold text-brand-400 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI Bullet Points Summary:
                  </span>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {analyzedData.bullet_points.map((pt, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-brand-400 font-bold">•</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-xl transition-all"
          >
            Cancel
          </button>

          <button
            onClick={handleFinalSave}
            disabled={isSaving || isAnalyzing || !analyzedData}
            className="glow-btn flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-xl shadow-glow transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : isAnalyzing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>AI Analyzing...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Save to Wishlist</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
