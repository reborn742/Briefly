import React, { useState, useEffect, useCallback } from 'react';
import { UserPreferences, NewsResponse, AppView } from './types';
import { fetchCuratedNews } from './services/geminiService';
import { Header } from './components/Header';
import { Onboarding } from './components/Onboarding';
import { NewsDisplay } from './components/NewsDisplay';
import { SavedSection } from './components/SavedSection';
import { RefreshCw, AlertCircle, MapPin, Newspaper } from 'lucide-react';
import { loadSavedArticles, storageGet, storageSet } from './services/safe';

const SplashScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Stage 1: Enter Logo and Text
    const timer1 = setTimeout(() => setStage(1), 100);
    // Stage 2: Exit animations (fade out)
    const timer2 = setTimeout(() => setStage(2), 3000);
    // Complete: Unmount
    const timer3 = setTimeout(() => onComplete(), 3600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 transition-opacity duration-700 ${stage === 2 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <div className={`flex flex-col items-center transition-all duration-1000 transform ${stage >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        <div className="bg-brand-600 dark:bg-brand-500 p-6 rounded-3xl shadow-2xl mb-8 animate-float">
          <Newspaper size={64} className="text-white" strokeWidth={1.5} />
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-4 font-sans">
          Briefly.
        </h1>
        <div className="h-px w-16 bg-brand-500/50 mb-4 rounded-full"></div>
        <p className="text-xl text-gray-500 dark:text-slate-400 font-light tracking-wide animate-in fade-in slide-in-from-bottom-2 duration-1000 delay-500 fill-mode-forwards opacity-0" style={{ animationDelay: '500ms', animationFillMode: 'forwards' }}>
          Knowledge without the noise.
        </p>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [view, setView] = useState<AppView>(AppView.ONBOARDING);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [newsData, setNewsData] = useState<NewsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Curating your briefing...");
  const [error, setError] = useState<string | null>(null);

  // Saved Articles Count State
  const [savedCount, setSavedCount] = useState(0);

  const updateSavedCount = useCallback(() => {
    setSavedCount(loadSavedArticles().length);
  }, []);

  useEffect(() => {
    updateSavedCount();
    const handleSavedUpdated = () => updateSavedCount();
    window.addEventListener('briefly_saved_updated', handleSavedUpdated);
    window.addEventListener('storage', handleSavedUpdated);
    return () => {
      window.removeEventListener('briefly_saved_updated', handleSavedUpdated);
      window.removeEventListener('storage', handleSavedUpdated);
    };
  }, [updateSavedCount]);

  // Dark Mode State Management
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = storageGet('briefly_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      storageSet('briefly_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      storageSet('briefly_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handlePreferencesComplete = async (prefs: UserPreferences) => {
    let finalPrefs = { ...prefs };

    setPreferences(finalPrefs);
    setLoading(true);
    setLoadingMessage("Curating your briefing...");
    setError(null);
    setView(AppView.FEED);

    // If Weather is selected AND no manual location provided, try to get location with snappy timeout
    if (prefs.topics.includes('weather') && !prefs.manualLocation) {
        setLoadingMessage("Locating you for local weather...");
        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 1200 });
            });
            finalPrefs = {
                ...prefs,
                location: {
                    // ~1 km precision is plenty for a local briefing and avoids sending exact coordinates
                    lat: Math.round(position.coords.latitude * 100) / 100,
                    lng: Math.round(position.coords.longitude * 100) / 100
                }
            };
            setPreferences(finalPrefs);
        } catch (locError) {
            console.warn("Location permission denied or timed out. Proceeding without specific location.", locError);
        }
    }

    setLoadingMessage("Scanning renowned sources...");

    try {
      const data = await fetchCuratedNews(finalPrefs);
      setNewsData(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    if (!preferences) return;
    
    setLoading(true);
    setLoadingMessage("Refreshing your briefing...");
    setError(null);

    try {
      const data = await fetchCuratedNews(preferences);
      setNewsData(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [preferences]);

  const handleReset = () => {
    setView(AppView.ONBOARDING);
    setNewsData(null);
    setError(null);
    setLoadingMessage("Curating your briefing...");
  };

  const handleBackFromSaved = () => {
    if (newsData && preferences) {
      setView(AppView.FEED);
    } else {
      setView(AppView.ONBOARDING);
    }
  };

  const handleClearData = () => {
    if (window.confirm("Are you sure you want to clear all history? This will remove saved articles, read status, and feedback.")) {
       try {
         const keysToRemove: string[] = [];
         for (let i = 0; i < localStorage.length; i++) {
             const key = localStorage.key(i);
             if (key && key.startsWith('briefly_')) {
                 keysToRemove.push(key);
             }
         }
         keysToRemove.forEach(k => localStorage.removeItem(k));
       } catch (e) {
         console.warn('Could not clear local data', e);
       }
       window.location.reload();
    }
  };

  // Auto-refresh every 15 minutes
  useEffect(() => {
    if (view !== AppView.FEED || !preferences) return;

    const interval = setInterval(() => {
      // Don't spend API quota refreshing a tab nobody is looking at.
      if (document.hidden) return;
      handleRefresh();
    }, 15 * 60 * 1000); // 15 minutes

    return () => clearInterval(interval);
  }, [view, preferences, handleRefresh]);

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      
      <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-brand-100 dark:selection:bg-brand-900 selection:text-brand-900 dark:selection:text-brand-100 transition-colors duration-300 ${showSplash ? 'opacity-0' : 'opacity-100 animate-in fade-in duration-1000'}`}>
        <Header 
          onReset={handleReset} 
          showReset={view === AppView.FEED} 
          onRefresh={view === AppView.FEED ? handleRefresh : undefined}
          isRefreshing={loading}
          onClearData={handleClearData}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          onViewSaved={() => setView(AppView.SAVED)}
          savedCount={savedCount}
          isSavedView={view === AppView.SAVED}
        />

        <main>
          {view === AppView.ONBOARDING && (
            <Onboarding onComplete={handlePreferencesComplete} />
          )}

          {view === AppView.SAVED && (
            <SavedSection onBack={handleBackFromSaved} hasBriefing={!!newsData} />
          )}

          {view === AppView.FEED && (
            <>
              {loading && (
                <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center animate-in fade-in duration-500">
                  <div className="relative mb-8">
                    <div className="absolute inset-0 bg-brand-200 dark:bg-brand-900 rounded-full animate-ping opacity-25"></div>
                    <div className="relative bg-white dark:bg-slate-800 p-4 rounded-full shadow-lg border border-gray-100 dark:border-slate-700">
                      <RefreshCw className="animate-spin text-brand-600 dark:text-brand-400" size={32} />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{loadingMessage}</h2>
                  <p className="text-gray-500 dark:text-slate-400 max-w-md">
                    We're scanning renowned sources for the latest on <span className="text-brand-600 dark:text-brand-400 font-medium">{preferences?.topics.join(', ')}</span>...
                  </p>
                  {(preferences?.location || preferences?.manualLocation) && (
                      <div className="mt-4 flex items-center gap-2 text-sm text-brand-600 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 px-3 py-1 rounded-full animate-in slide-in-from-bottom-2 border border-brand-100 dark:border-brand-800">
                          <MapPin size={14} />
                          <span>Using your location: {preferences?.manualLocation || 'GPS'}</span>
                      </div>
                  )}
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4">
                    <AlertCircle className="text-red-500 dark:text-red-400" size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Something went wrong</h3>
                  <p className="text-gray-600 dark:text-slate-400 mb-6 text-center max-w-md">{error}</p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    <button 
                      onClick={handleRefresh}
                      className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium transition-colors shadow-xs"
                    >
                      Retry Now
                    </button>
                    <button 
                      onClick={handleReset}
                      className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 font-medium transition-colors"
                    >
                      Change Preferences
                    </button>
                  </div>
                </div>
              )}

              {!loading && !error && newsData && preferences && (
                <NewsDisplay 
                  data={newsData} 
                  preferences={preferences} 
                  onViewSaved={() => setView(AppView.SAVED)}
                />
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
};

export default App;