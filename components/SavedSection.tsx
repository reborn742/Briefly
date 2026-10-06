import React, { useState, useEffect, useMemo } from 'react';
import { SavedArticle } from '../types';
import { speechNarrator } from '../services/speechService';
import { loadSavedArticles, loadStringSet, loadVoicePrefs, saveSavedArticles, saveStringSet, toSafeHttpUrl } from '../services/safe';
import { 
  Bookmark, 
  Trash2, 
  ArrowLeft, 
  ExternalLink, 
  Share2, 
  Check, 
  Search, 
  Clock, 
  Calendar,
  BookOpen,
  Filter,
  Volume2,
  StopCircle
} from 'lucide-react';

interface SavedSectionProps {
  onBack: () => void;
  hasBriefing: boolean;
}

export const SavedSection: React.FC<SavedSectionProps> = ({ onBack, hasBriefing }) => {
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [readArticles, setReadArticles] = useState<Set<string>>(new Set());
  const [playingArticleId, setPlayingArticleId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      speechNarrator.stop();
    };
  }, []);

  const handleToggleListen = (article: SavedArticle) => {
    if (playingArticleId === article.id) {
      speechNarrator.stop();
      setPlayingArticleId(null);
      return;
    }

    const { gender: currentGender, rate: currentRate } = loadVoicePrefs();
    setPlayingArticleId(article.id);

    speechNarrator.speakText(`${article.title}. ${article.content}`, {
      gender: currentGender,
      rate: currentRate,
      onEnd: () => setPlayingArticleId(null),
      onError: () => setPlayingArticleId(null),
    });
  };

  // Load saved articles and read status from localStorage
  useEffect(() => {
    setSavedArticles(loadSavedArticles());
    setReadArticles(loadStringSet('briefly_read_articles'));
  }, []);

  const handleRemove = (id: string) => {
    const updated = savedArticles.filter(a => a.id !== id);
    setSavedArticles(updated);
    saveSavedArticles(updated);
    window.dispatchEvent(new Event('briefly_saved_updated'));
  };

  const handleClearAll = () => {
    if (savedArticles.length === 0) return;
    if (window.confirm('Are you sure you want to remove all saved articles?')) {
      setSavedArticles([]);
      saveSavedArticles([]);
      window.dispatchEvent(new Event('briefly_saved_updated'));
    }
  };

  const handleToggleRead = (id: string) => {
    const next = new Set<string>(readArticles);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setReadArticles(next);
    saveStringSet('briefly_read_articles', next);
  };

  const handleShare = async (article: SavedArticle) => {
    const shareData = {
      title: article.title,
      text: `${article.title}\n\n${article.content}\n\nSaved via Briefly.`,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (e) {}
    } else {
      try {
        await navigator.clipboard.writeText(shareData.text);
        setCopiedId(article.id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch (e) {}
    }
  };

  // Distinct topics
  const topics = useMemo(() => {
    const set = new Set(savedArticles.map(a => a.topic).filter(Boolean));
    return Array.from(set);
  }, [savedArticles]);

  // Filtered articles
  const filteredArticles = useMemo(() => {
    return savedArticles.filter(article => {
      const matchesTopic = selectedTopic === 'All' || article.topic === selectedTopic;
      const matchesSearch = !searchQuery.trim() || 
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTopic && matchesSearch;
    });
  }, [savedArticles, selectedTopic, searchQuery]);

  const parseInlineLinks = (text: string, keyPrefix: string): React.ReactNode[] => {
    const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
    return parts.map((part, i) => {
      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const linkText = linkMatch[1];
        // Stored/model text is untrusted: only ever render http(s) links.
        const linkUrl = toSafeHttpUrl(linkMatch[2]);
        if (!linkUrl) return linkText;
        let hostname = '';
        try {
          hostname = new URL(linkUrl).hostname.replace(/^www\./, '');
        } catch (e) {}
        return (
          <a
            key={`${keyPrefix}-${i}`}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 underline underline-offset-2 transition-colors inline-flex items-center align-baseline flex-wrap"
          >
            <span>{linkText}</span>
            {hostname && <span className="text-gray-400 dark:text-slate-500 text-xs font-normal no-underline ml-1">({hostname})</span>}
            <ExternalLink size={12} className="ml-1 opacity-70" />
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in duration-500">
      {/* Top Header / Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-100 dark:border-slate-800">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors mb-3"
          >
            <ArrowLeft size={16} />
            <span>{hasBriefing ? 'Back to Briefing' : 'Back to Home'}</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-2xl">
              <Bookmark size={24} className="fill-current" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                Saved for Later
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {savedArticles.length === 1 ? '1 bookmarked article' : `${savedArticles.length} bookmarked articles`}
              </p>
            </div>
          </div>
        </div>

        {savedArticles.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-100 dark:hover:border-red-900/30 rounded-xl transition-all"
            >
              <Trash2 size={16} />
              <span>Clear All</span>
            </button>
          </div>
        )}
      </div>

      {savedArticles.length > 0 ? (
        <>
          {/* Search and Topic Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your saved stories..."
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-xs"
              />
            </div>

            {topics.length > 0 && (
              <div className="relative shrink-0">
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium text-gray-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-xs cursor-pointer"
                >
                  <option value="All">All Topics ({savedArticles.length})</option>
                  {topics.map(t => (
                    <option key={t} value={t}>
                      {t} ({savedArticles.filter(a => a.topic === t).length})
                    </option>
                  ))}
                </select>
                <Filter size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-slate-500" />
              </div>
            )}
          </div>

          {/* Articles List */}
          {filteredArticles.length > 0 ? (
            <div className="space-y-6">
              {filteredArticles.map((article) => {
                const isRead = readArticles.has(article.id);
                const formattedDate = article.savedAt
                  ? new Date(article.savedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : null;

                return (
                  <article
                    key={article.id}
                    className={`bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 sm:p-8 shadow-md hover:shadow-lg transition-all duration-300 relative group ${
                      isRead ? 'opacity-75' : ''
                    }`}
                  >
                    {/* Header info */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4 text-xs">
                      <div className="flex items-center gap-2">
                        {article.topic && (
                          <span className="px-3 py-1 font-semibold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 border border-brand-100 dark:border-brand-800 rounded-full">
                            {article.topic}
                          </span>
                        )}
                        {formattedDate && (
                          <span className="flex items-center gap-1 text-gray-400 dark:text-slate-500">
                            <Calendar size={13} />
                            <span>Saved {formattedDate}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleListen(article)}
                          className={`p-1.5 rounded-lg transition-all ${
                            playingArticleId === article.id
                              ? 'text-white bg-brand-600 shadow-md ring-2 ring-brand-400/40'
                              : 'text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                          }`}
                          title={playingArticleId === article.id ? 'Stop listening' : 'Listen to story (Friendly voice)'}
                        >
                          {playingArticleId === article.id ? <StopCircle size={16} className="animate-pulse" /> : <Volume2 size={16} />}
                        </button>

                        <button
                          onClick={() => handleToggleRead(article.id)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                            isRead
                              ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                              : 'text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600 hover:text-gray-700'
                          }`}
                          title={isRead ? 'Mark as unread' : 'Mark as read'}
                        >
                          <Check size={12} strokeWidth={2.5} />
                          <span>{isRead ? 'Read' : 'Mark Read'}</span>
                        </button>

                        <button
                          onClick={() => handleShare(article)}
                          className="p-1.5 text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          title="Share Article"
                        >
                          {copiedId === article.id ? <Check size={16} className="text-green-500" /> : <Share2 size={16} />}
                        </button>

                        <button
                          onClick={() => handleRemove(article.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Remove from Saved"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Headline */}
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 leading-snug">
                      {parseInlineLinks(article.title, `saved-title-${article.id}`)}
                    </h2>

                    {/* Article Content */}
                    <div className="text-gray-700 dark:text-slate-300 text-base leading-relaxed space-y-3 mb-6">
                      {article.content.split('\n').filter(l => l.trim().length > 0).map((paragraph, pIdx) => {
                        // Skip duplicate headline if included in content
                        if (paragraph.startsWith('### ')) return null;
                        return (
                          <p key={pIdx}>
                            {parseInlineLinks(paragraph.replace(/^#+\s*/, ''), `saved-p-${article.id}-${pIdx}`)}
                          </p>
                        );
                      })}
                    </div>

                    {/* Sources section if available */}
                    {article.sourceUrls && article.sourceUrls.length > 0 && (
                      <div className="pt-4 border-t border-gray-100 dark:border-slate-700/60 flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mr-1">
                          Sources:
                        </span>
                        {article.sourceUrls.map((rawUrl, uIdx) => {
                          const url = toSafeHttpUrl(rawUrl);
                          if (!url) return null;
                          let label = 'Source';
                          try {
                            label = new URL(url).hostname.replace(/^www\./, '');
                          } catch (e) {}
                          return (
                            <a
                              key={uIdx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-600 transition-colors"
                            >
                              <span>{label}</span>
                              <ExternalLink size={10} />
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
              <Search size={36} className="mx-auto text-gray-300 dark:text-slate-600 mb-3" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                No matching saved stories
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Try clearing your search query or choosing another topic filter.
              </p>
            </div>
          )}
        </>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 px-4 bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 text-center shadow-xs">
          <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/30 rounded-2xl flex items-center justify-center mb-6 text-brand-600 dark:text-brand-400 shadow-inner">
            <Bookmark size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            No saved articles yet
          </h2>
          <p className="text-gray-500 dark:text-slate-400 max-w-md mb-8 text-base">
            While reading your daily news briefing, click the bookmark icon next to any headline to save it here for reading later.
          </p>
          <button
            onClick={onBack}
            className="px-8 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl shadow-md shadow-brand-500/20 transition-all hover:-translate-y-0.5"
          >
            {hasBriefing ? 'Read Today\'s Briefing' : 'Browse News Briefings'}
          </button>
        </div>
      )}
    </div>
  );
};
