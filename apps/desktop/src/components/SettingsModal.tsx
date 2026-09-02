import React, { useState } from 'react';
import {
  X,
  Database,
  Key,
  Laptop,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  Terminal,
  Save
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [backendUrl, setBackendUrl] = useState(
    (window as any).BACKEND_URL_OVERRIDE || 'http://localhost:3001'
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    (window as any).BACKEND_URL_OVERRIDE = backendUrl;
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl glass-panel rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-950/80 border border-brand-800/50 flex items-center justify-center text-brand-400">
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Application Settings</h2>
              <p className="text-xs text-slate-400">Manage backend, Supabase sync, and shortcuts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Backend API Configuration */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-brand-400" />
              <span>Backend API URL (Server & AI Processing)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="http://localhost:3001"
                className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-500"
              />
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-glow"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
            {savedSuccess && (
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Backend URL updated.
              </p>
            )}
          </div>

          {/* Global Shortcuts Reference */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Keyboard Shortcuts</span>
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Screen Selection Snip</span>
                <span className="font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-brand-300">
                  Ctrl + Shift + S
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Cancel Snip Overlay</span>
                <span className="font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-300">
                  ESC
                </span>
              </div>
            </div>
          </div>

          {/* Supabase & Privacy Notice */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Supabase PostgreSQL & Security</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              OpenAI API keys are never exposed to the client. All AI categorization and structured output validation runs server-side on Node.js. Supabase Row Level Security (RLS) guarantees you can only access your own wishlist data.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
