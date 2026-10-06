import React from 'react';
import { Newspaper, RefreshCw, Trash2, Moon, Sun, Home, Bookmark } from 'lucide-react';

interface HeaderProps {
  onReset: () => void;
  showReset: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onClearData?: () => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  onViewSaved?: () => void;
  savedCount?: number;
  isSavedView?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  onReset, 
  showReset, 
  onRefresh, 
  isRefreshing, 
  onClearData,
  isDarkMode,
  toggleTheme,
  onViewSaved,
  savedCount = 0,
  isSavedView = false,
}) => {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 transition-all duration-300">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={showReset ? onReset : undefined}
        >
          <div className="bg-brand-600 dark:bg-brand-500 p-1.5 rounded-lg text-white shadow-xs">
            <Newspaper size={20} />
          </div>
          <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">Briefly.</span>
        </div>
        
        <div className="flex items-center gap-2">
          {onViewSaved && (
            <button
              onClick={onViewSaved}
              className={`relative p-2 rounded-full transition-all ${
                isSavedView
                  ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 ring-1 ring-brand-500/20'
                  : 'text-gray-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-slate-800'
              }`}
              title="Saved Articles"
            >
              <Bookmark size={18} className={isSavedView ? 'fill-current' : ''} />
              {savedCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                  {savedCount}
                </span>
              )}
            </button>
          )}

          {showReset && (
            <button
              onClick={onReset}
              className="p-2 text-gray-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-slate-800 rounded-full transition-all"
              title="Back to Home"
            >
              <Home size={18} />
            </button>
          )}

          {showReset && onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`p-2 text-gray-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-slate-800 rounded-full transition-all ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Refresh News"
            >
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          )}
          
          {showReset && onClearData && (
            <button
              onClick={onClearData}
              className="p-2 text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"
              title="Clear History & Saved"
            >
              <Trash2 size={18} />
            </button>
          )}

          {toggleTheme && (
            <button 
              onClick={toggleTheme}
              className="p-2 text-gray-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-all"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};