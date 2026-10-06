import React, { useState, useMemo, useEffect } from 'react';
import { NewsResponse, GroundingChunk, UserPreferences, SavedArticle } from '../types';
import { summarizeBriefing, generateBriefingImage } from '../services/geminiService';
import { speechNarrator } from '../services/speechService';
import { AudioPlayer } from './AudioPlayer';
import { ExternalLink, Calendar, Share2, Check, Filter, X, BookOpen, Sparkles, Loader2, ThumbsUp, ThumbsDown, Image as ImageIcon, AlertCircle, Volume2, StopCircle, Copy, Clock, Bookmark, BookmarkPlus, BookmarkCheck, Info, Headphones } from 'lucide-react';
import { Icon } from './Icon';
import { loadSavedArticles, loadStringSet, loadVoicePrefs, saveSavedArticles, saveStringSet, toSafeHttpUrl } from '../services/safe';

interface NewsDisplayProps {
  data: NewsResponse;
  preferences: UserPreferences;
  onViewSaved?: () => void;
}

interface DisplayArticle {
  id: string;
  title: string;
  topic: string;
  content: string;
  sourceUrls: string[];
}

interface Section {
  id: number;
  title: string;
  content: string;
  sourceUrls: string[];
}

export const NewsDisplay: React.FC<NewsDisplayProps> = ({ data, preferences, onViewSaved }) => {
  const { content, groundingMetadata, timestamp } = data;
  const [copied, setCopied] = useState(false);
  
  // Summary state
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryCopied, setSummaryCopied] = useState(false);

  // Audio Narration State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentAudioTitle, setCurrentAudioTitle] = useState<string>('');
  const [activeStorySpeakingId, setActiveStorySpeakingId] = useState<string | null>(null);

  // Stop speech when component unmounts
  useEffect(() => {
    return () => {
      speechNarrator.stop();
    };
  }, []);

  // Image Generation State
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Filtering state
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  // Feedback state
  const feedbackKey = `briefly_feedback_${timestamp}`;
  const [feedback, setFeedback] = useState<'yes' | 'no' | null>(null);

  // Read Articles State
  const [readArticles, setReadArticles] = useState<Set<string>>(new Set());
  
  // Saved Articles State
  const [savedArticles, setSavedArticles] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<{ text: string, type: 'success' | 'info' } | null>(null);

  useEffect(() => {
    try {
        const saved = localStorage.getItem(feedbackKey);
        if (saved === 'yes' || saved === 'no') {
            setFeedback(saved);
        }
    } catch (e) {
        console.warn('LocalStorage access denied', e);
    }
  }, [feedbackKey]);

  useEffect(() => {
    setReadArticles(loadStringSet('briefly_read_articles'));
    setSavedArticles(new Set(loadSavedArticles().map(a => a.id)));
  }, []);

  const handleFeedback = (vote: 'yes' | 'no') => {
    setFeedback(vote);
    try {
        localStorage.setItem(feedbackKey, vote);
    } catch (e) {
        console.warn('LocalStorage write failed', e);
    }
  };

  const handleLinkClick = (url: string) => {
    setReadArticles(prev => {
      const next = new Set(prev);
      next.add(url);
      return next;
    });
    // Persist outside the state updater (updaters must stay pure; StrictMode runs them twice).
    const stored = loadStringSet('briefly_read_articles');
    stored.add(url);
    saveStringSet('briefly_read_articles', stored);
  };

  const handleToggleSave = (articleData: DisplayArticle) => {
    // The stored list is the source of truth; side effects stay out of state updaters
    // (StrictMode runs updaters twice, which used to duplicate saved entries).
    const list = loadSavedArticles();
    const alreadySaved = list.some(item => item.id === articleData.id);
    const nextList = alreadySaved
      ? list.filter(item => item.id !== articleData.id)
      : [
          {
            id: articleData.id,
            title: articleData.title,
            topic: articleData.topic,
            content: articleData.content,
            sourceUrls: articleData.sourceUrls,
            savedAt: new Date().toISOString(),
          },
          ...list,
        ];

    saveSavedArticles(nextList);
    setSavedArticles(new Set(nextList.map(item => item.id)));
    setToastMessage(
      alreadySaved
        ? { text: "Removed from saved stories", type: 'info' }
        : { text: "Saved for later! Available in Saved section", type: 'success' },
    );
    window.dispatchEvent(new Event('briefly_saved_updated'));
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Formatting the date
  const dateStr = new Date(timestamp).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Extract unique sources for footer
  const uniqueSources = useMemo(() => {
    const sources = groundingMetadata?.groundingChunks
      ?.filter((chunk: GroundingChunk) => toSafeHttpUrl(chunk.web?.uri))
      .map((chunk: GroundingChunk) => ({ ...chunk.web!, uri: toSafeHttpUrl(chunk.web!.uri)! })) || [];
    return Array.from(new Set(sources.map(s => s?.uri)))
      .map(uri => sources.find(s => s?.uri === uri))
      .filter(Boolean);
  }, [groundingMetadata]);

  // Source citation logic for link styling
  const sourceCitationCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const matches = content.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);
    for (const match of matches) {
      try {
        const url = match[2];
        const hostname = new URL(url).hostname.replace(/^www\./, '');
        counts.set(hostname, (counts.get(hostname) || 0) + 1);
      } catch (e) {}
    }
    return counts;
  }, [content]);

  const readingTime = useMemo(() => {
    const words = content.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / 225);
    return `${minutes} min read`;
  }, [content]);

  const readabilityMetrics = useMemo(() => {
    let cleanText = content.replace(/^#+\s+/gm, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_~`>]/g, '').replace(/\n+/g, ' ');
    const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceCount = Math.max(1, sentences.length);
    const words: string[] = cleanText.match(/\b[a-zA-Z]{2,}\b/g) || [];
    const wordCount = Math.max(1, words.length);
    
    // Heuristic syllable counting
    let syllableCount = 0;
    words.forEach((word: string) => {
      let w = word.toLowerCase().replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
      const matches = w.match(/[aeiouy]{1,2}/g);
      syllableCount += matches ? matches.length : 1;
    });

    // Flesch-Kincaid Grade Level Formula
    const score = (0.39 * (wordCount / sentenceCount)) + (11.8 * (syllableCount / wordCount)) - 15.59;
    const grade = Math.max(0, Math.round(score * 10) / 10);
    
    let label = 'Standard';
    let colorClass = 'text-blue-600 bg-blue-50 border-blue-100 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300';
    
    if (grade <= 6) { 
      label = 'Easy'; 
      colorClass = 'text-green-600 bg-green-50 border-green-100 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300'; 
    }
    else if (grade <= 12) { 
      label = 'Standard'; 
      colorClass = 'text-blue-600 bg-blue-50 border-blue-100 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300'; 
    }
    else if (grade <= 16) { 
      label = 'Complex'; 
      colorClass = 'text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-300'; 
    }
    else { 
      label = 'Academic'; 
      colorClass = 'text-purple-600 bg-purple-50 border-purple-100 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-300'; 
    }
    
    return { grade, label, colorClass };
  }, [content]);

  const { intro, sections, topics } = useMemo(() => {
    const lines = content.split('\n');
    let currentSection: Section = { id: 0, title: 'Intro', content: '', sourceUrls: [] };
    const parsedSections: Section[] = [];
    const foundTopics: string[] = [];
    lines.forEach(line => {
      const match = line.match(/^##\s+(.+)/);
      if (match) {
        if (currentSection.content.trim()) parsedSections.push(currentSection);
        const title = match[1].replace(/\[|\]/g, '').trim();
        currentSection = { id: parsedSections.length + 1, title, content: '', sourceUrls: [] };
        foundTopics.push(title);
      } else {
        currentSection.content += line + '\n';
      }
      const urlMatches = line.match(/\(https?:\/\/[^\s)]+\)/g);
      if (urlMatches) urlMatches.forEach(u => currentSection.sourceUrls.push(u.slice(1, -1)));
    });
    if (currentSection.content.trim()) parsedSections.push(currentSection);
    return { intro: parsedSections.find(s => s.title === 'Intro')?.content || '', sections: parsedSections.filter(s => s.title !== 'Intro'), topics: foundTopics };
  }, [content]);

  const parseSectionArticles = (content: string, topicName: string, sectionPrefix: string) => {
    const lines = content.split('\n');
    const articles: DisplayArticle[] = [];
    let intro = '';
    let currentArticleLines: string[] = [];
    let currentHeadline = '';
    let currentArticleId: string | null = null;
    const flushArticle = () => {
        if (currentArticleLines.length > 0) {
            const fullText = currentArticleLines.join('\n');
            const urlMatches = fullText.match(/\(https?:\/\/[^\s)]+\)/g);
            const sourceUrls = (urlMatches || []).map(u => u.slice(1, -1));
            const title = currentHeadline || `${topicName} Headline`;
            const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
            const id = currentArticleId || `${sectionPrefix}-${slug}`;
            articles.push({ 
              id, 
              title,
              topic: topicName,
              content: fullText,
              sourceUrls
            });
            currentArticleLines = [];
            currentHeadline = '';
            currentArticleId = null;
        }
    };
    lines.forEach(line => {
        if (line.startsWith('### ')) {
            flushArticle();
            currentHeadline = line.replace('### ', '').trim();
            currentArticleLines.push(line);
            const match = line.match(/\[.*?\]\((.*?)\)/);
            if (match) currentArticleId = match[1];
        } else {
            if (currentArticleLines.length > 0) currentArticleLines.push(line);
            else intro += line + '\n';
        }
    });
    flushArticle();
    return { intro, articles };
  };

  const sectionsToRender = useMemo(() => {
    const baseSections = showSavedOnly ? sections : sections.filter(s => selectedTopic === 'All' || s.title === selectedTopic);
    return baseSections.map(section => {
        const { intro, articles } = parseSectionArticles(section.content, section.title, `sec-${section.id}`);
        const displayArticles = showSavedOnly ? articles.filter(a => savedArticles.has(a.id)) : articles;
        return { ...section, intro, displayArticles };
    }).filter(s => s.displayArticles.length > 0);
  }, [sections, selectedTopic, showSavedOnly, savedArticles]);

  const handleShare = async () => {
    const shareData = { title: 'Briefly.ai Daily Briefing', text: `${content}\n\nGenerated by Briefly.ai` };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (err) {}
    } else {
      try { await navigator.clipboard.writeText(shareData.text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch (err) {}
    }
  };

  const handleSummarize = async () => {
    if (summary) return;
    setIsSummarizing(true);
    try { const result = await summarizeBriefing(content); setSummary(result); window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {} finally { setIsSummarizing(false); }
  };

  const handleStartFullBriefing = (gender: 'female' | 'male', rate: number = 1.0) => {
    setActiveStorySpeakingId(null);
    setCurrentAudioTitle('Full Daily Briefing');
    speechNarrator.speakText(content, {
      gender,
      rate,
      onStart: () => {
        setIsSpeaking(true);
        setIsPaused(false);
      },
      onEnd: () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setActiveStorySpeakingId(null);
        setCurrentAudioTitle('');
      },
      onError: () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setActiveStorySpeakingId(null);
        setCurrentAudioTitle('');
      },
    });
  };

  const handleStartStoryAudio = (article: DisplayArticle, gender: 'female' | 'male' = 'female', rate: number = 1.0) => {
    if (activeStorySpeakingId === article.id && isSpeaking) {
      handleStopSpeak();
      return;
    }
    const { gender: currentGender, rate: currentRate } = loadVoicePrefs();
    setActiveStorySpeakingId(article.id);
    setCurrentAudioTitle(article.title);
    speechNarrator.speakText(`${article.title}. ${article.content}`, {
      gender: currentGender,
      rate: currentRate,
      onStart: () => {
        setIsSpeaking(true);
        setIsPaused(false);
      },
      onEnd: () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setActiveStorySpeakingId(null);
        setCurrentAudioTitle('');
      },
      onError: () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setActiveStorySpeakingId(null);
        setCurrentAudioTitle('');
      },
    });
  };

  const handlePauseSpeak = () => {
    speechNarrator.pause();
    setIsPaused(true);
  };

  const handleResumeSpeak = () => {
    speechNarrator.resume();
    setIsPaused(false);
  };

  const handleStopSpeak = () => {
    speechNarrator.stop();
    setIsSpeaking(false);
    setIsPaused(false);
    setActiveStorySpeakingId(null);
    setCurrentAudioTitle('');
  };

  const handleSpeakSummary = () => {
    if (!summary) return;
    if (isSpeaking) {
      handleStopSpeak();
      return;
    }
    const { gender: currentGender, rate: currentRate } = loadVoicePrefs();
    setCurrentAudioTitle('TL;DR Summary');
    speechNarrator.speakText(summary, {
      gender: currentGender,
      rate: currentRate,
      onStart: () => {
        setIsSpeaking(true);
        setIsPaused(false);
      },
      onEnd: () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setCurrentAudioTitle('');
      },
      onError: () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setCurrentAudioTitle('');
      },
    });
  };

  const handleGenerateImage = async () => {
    if (generatedImage) return;
    setIsGeneratingImage(true);
    setImageError(false);
    try {
        const visualTopics = topics.length > 0 ? topics : ['Global News'];
        const img = await generateBriefingImage(visualTopics);
        if (img) setGeneratedImage(img); else setImageError(true);
    } catch (e) { setImageError(true); } finally { setIsGeneratingImage(false); }
  };

  const parseInline = (text: string, keyPrefix: string): React.ReactNode[] => {
    const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
    return parts.map((part, i) => {
      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const linkText = linkMatch[1];
        // Model output is untrusted: never render a clickable link for anything but http(s).
        const linkUrl = toSafeHttpUrl(linkMatch[2]);
        if (!linkUrl) return linkText;
        let hostname = '';
        try { hostname = new URL(linkUrl).hostname.replace(/^www\./, ''); } catch (e) {}
        return (
          <a key={`${keyPrefix}-${i}`} href={linkUrl} onClick={() => handleLinkClick(linkMatch[2])} target="_blank" rel="noopener noreferrer" className="text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 decoration-brand-300 dark:decoration-brand-700 hover:underline underline-offset-2 transition-colors group inline-flex items-center align-baseline flex-wrap cursor-pointer">
            <span>{linkText}</span>
            {hostname && <span className="text-gray-400 dark:text-slate-500 text-xs font-normal no-underline whitespace-nowrap ml-1">({hostname})</span>}
            <ExternalLink size={13} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        );
      }
      return part;
    });
  };

  const renderMarkdownBlock = (
    text: string, 
    blockKey: string, 
    isRead: boolean = false, 
    isSaved: boolean = false, 
    onToggleSave?: () => void,
    onToggleListen?: () => void,
    isListeningThis: boolean = false
  ) => {
    const lines = text.split('\n');
    return lines.map((line, index) => {
      const key = `${blockKey}-${index}`;
      const trimmed = line.trim();
      if (trimmed.length === 0) return null;
      if (line.startsWith('### ')) {
        return (
          <div key={key} className="flex gap-4 items-start mt-8 mb-4 group/header relative">
            <div className="flex flex-col gap-2 shrink-0 pt-1">
                {onToggleListen && (
                  <button 
                    onClick={(e) => { e.preventDefault(); onToggleListen(); }} 
                    title={isListeningThis ? "Stop Reading Story" : "Listen to Story (Friendly Voice)"}
                    aria-label={isListeningThis ? "Stop reading story aloud" : "Listen to this story aloud"}
                    className={`p-2 rounded-xl transition-all shadow-xs transform hover:scale-110 active:scale-95 ${isListeningThis ? 'text-white bg-brand-600 shadow-md ring-2 ring-brand-400/40' : 'text-gray-400 hover:text-brand-500 hover:bg-gray-50 dark:hover:bg-slate-700 border border-transparent'}`}
                  >
                    {isListeningThis ? <StopCircle size={18} className="animate-pulse text-white" /> : <Volume2 size={18} />}
                  </button>
                )}
                {onToggleSave && (
                  <button 
                    onClick={(e) => { e.preventDefault(); onToggleSave(); }} 
                    title={isSaved ? "Remove from Saved" : "Save for Later"}
                    aria-label={isSaved ? "Remove article from saved stories" : "Save article for later"}
                    className={`p-2 rounded-xl transition-all shadow-xs transform hover:scale-110 active:scale-95 ${isSaved ? 'text-brand-600 bg-brand-50 dark:bg-brand-900/30 border border-brand-100 dark:border-brand-800' : 'text-gray-300 hover:text-brand-500 hover:bg-gray-50 dark:hover:bg-slate-700 border border-transparent'}`}
                  >
                    {isSaved ? <BookmarkCheck size={20} className="fill-current" /> : <BookmarkPlus size={20} />}
                  </button>
                )}
                {isRead && (
                    <div 
                        className="flex items-center justify-center p-2 text-green-500 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-900/40"
                        title="Already read"
                    >
                        <Check size={18} strokeWidth={3} />
                    </div>
                )}
            </div>
            <h3 className={`text-2xl font-bold leading-tight ${isRead ? 'text-gray-400 dark:text-slate-500' : 'text-gray-900 dark:text-white'}`}>
                {parseInline(line.replace('### ', ''), key)}
            </h3>
          </div>
        );
      }
      return <p key={key} className={`mb-4 leading-relaxed text-lg transition-colors ${isRead ? 'text-gray-400 dark:text-slate-500' : 'text-gray-700 dark:text-slate-300'}`}>{parseInline(line.replace(/^#+\s/, ''), key)}</p>;
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 text-gray-500 dark:text-slate-400 bg-white/50 dark:bg-slate-800/50 px-4 py-2 rounded-full border border-gray-100 dark:border-slate-700 text-sm">
                <Calendar size={14} /> <span>{dateStr}</span>
            </div>
            <div 
              className={`flex items-center space-x-2 px-4 py-2 rounded-full border text-sm cursor-help transition-all hover:shadow-xs ${readabilityMetrics.colorClass}`}
              title="Readability Score: Flesch-Kincaid Grade Level based on sentence and word complexity."
            >
                <BookOpen size={14} /> 
                <span className="font-medium">{readabilityMetrics.label} (Grade {readabilityMetrics.grade})</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-500 dark:text-slate-400 bg-white/50 dark:bg-slate-800/50 px-4 py-2 rounded-full border border-gray-100 dark:border-slate-700 text-sm">
                <Clock size={14} /> <span>{readingTime}</span>
            </div>
        </div>
        <div className="flex items-center gap-3">
            <button onClick={handleGenerateImage} disabled={isGeneratingImage || generatedImage !== null} className={`flex items-center gap-2 px-4 py-2 border rounded-full text-sm font-medium transition-all shadow-xs ${generatedImage ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-purple-50'}`}>
              {isGeneratingImage ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
              <span>{isGeneratingImage ? 'Creating...' : generatedImage ? 'Visual Created' : 'Generate Image'}</span>
            </button>
            <button onClick={handleSummarize} disabled={isSummarizing || summary !== null} className={`flex items-center gap-2 px-4 py-2 border rounded-full text-sm font-medium transition-all shadow-xs ${summary ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
              {isSummarizing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              <span>{isSummarizing ? 'Summarizing...' : summary ? 'Summarized' : 'Get Summary'}</span>
            </button>
            <button onClick={handleShare} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 shadow-xs transition-all">
              {copied ? <Check size={16} className="text-green-500" /> : <Share2 size={16} />}
              <span>{copied ? 'Copied' : 'Share'}</span>
            </button>
        </div>
      </div>

      {summary && (
          <div className="mb-8 p-6 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-indigo-100 dark:border-indigo-900/50 animate-in fade-in slide-in-from-top-4 relative group">
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={() => { navigator.clipboard.writeText(summary); setSummaryCopied(true); setTimeout(() => setSummaryCopied(false), 2000); }} className="p-2 bg-white/80 dark:bg-slate-700/80 hover:bg-white dark:hover:bg-slate-600 rounded-full shadow-xs text-indigo-600">{summaryCopied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}</button>
                 <button onClick={isSpeaking && currentAudioTitle === 'TL;DR Summary' ? handleStopSpeak : handleSpeakSummary} className={`p-2 rounded-full shadow-xs transition-all ${isSpeaking && currentAudioTitle === 'TL;DR Summary' ? 'bg-red-50 text-red-500' : 'bg-white/80 hover:bg-white text-indigo-600'}`} title="Listen to Summary">{isSpeaking && currentAudioTitle === 'TL;DR Summary' ? <StopCircle size={16} className="animate-pulse" /> : <Volume2 size={16} />}</button>
            </div>
            <h3 className="text-indigo-900 dark:text-indigo-200 font-bold flex items-center gap-2 mb-4 text-lg"><Sparkles size={20} className="text-indigo-600 dark:text-indigo-400" /> TL;DR Summary</h3>
            <div className="text-indigo-900/90 dark:text-indigo-100/90 space-y-3 pr-12">{summary.split('\n').filter(line => line.trim()).map((line, idx) => <p key={idx} className="flex gap-3 items-start"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 shrink-0" /><span>{line.replace(/^[-*•]\s*/, '')}</span></p>)}</div>
          </div>
      )}

      {/* Prominent Audio Player for Briefing Page */}
      <AudioPlayer
        fullText={content}
        title={selectedTopic === 'All' ? 'Full Daily Briefing' : `${selectedTopic} Briefing`}
        isSpeaking={isSpeaking && activeStorySpeakingId === null}
        isPaused={isPaused}
        onStartSpeak={handleStartFullBriefing}
        onPauseSpeak={handlePauseSpeak}
        onResumeSpeak={handleResumeSpeak}
        onStopSpeak={handleStopSpeak}
        currentSectionTitle={currentAudioTitle}
      />

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-slate-700 mb-12">
        {generatedImage && <div className="w-full h-64 sm:h-80 md:h-96 relative"><img src={generatedImage} alt="Header Art" referrerPolicy="no-referrer" decoding="async" className="w-full h-full object-cover" /></div>}
        
        {/* Toolbar */}
        <div className="sticky top-16 z-10 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border-b border-gray-100 dark:border-slate-700 px-6 py-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400"><Filter size={18} /> <span className="text-sm font-medium uppercase tracking-wider">Filter</span></div>
          
          <div className="relative">
            <select 
                value={selectedTopic} 
                onChange={(e) => setSelectedTopic(e.target.value)} 
                disabled={showSavedOnly} 
                className={`appearance-none pl-4 pr-10 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm font-medium text-gray-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 transition-all ${showSavedOnly ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-300 dark:hover:border-slate-500'}`}
            >
                <option value="All">All Topics</option>
                {topics.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <button 
            onClick={onViewSaved ? onViewSaved : () => setShowSavedOnly(!showSavedOnly)} 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${savedArticles.size > 0 ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300 border-brand-200 dark:border-brand-800' : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:border-brand-300 hover:text-brand-600'}`}
            title="View Saved Stories"
          >
            <Bookmark size={16} className={savedArticles.size > 0 ? "fill-current text-brand-600 dark:text-brand-400" : ""} />
            <span>Saved Stories {savedArticles.size > 0 && `(${savedArticles.size})`}</span>
          </button>
        </div>

        <div className="p-8 sm:p-12 min-h-[400px]">
          {showSavedOnly && (
            <div className="mb-10 flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-4 animate-in slide-in-from-left-4 duration-500">
                <div className="flex items-center gap-3 text-brand-600 dark:text-brand-400">
                  <BookmarkCheck size={28} className="fill-brand-50/50" />
                  <h2 className="text-3xl font-extrabold">Your Saved Stories</h2>
                </div>
                {onViewSaved && (
                  <button
                    onClick={onViewSaved}
                    className="text-sm font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    Open Full Saved Section &rarr;
                  </button>
                )}
            </div>
          )}

          {selectedTopic === 'All' && !showSavedOnly && intro.trim() && <div className="mb-8 pb-8 border-b border-gray-100 dark:border-slate-700">{renderMarkdownBlock(intro, 'intro')}</div>}
          
          {sectionsToRender.length > 0 ? (
            <div className="space-y-16">
              {sectionsToRender.map((section) => (
                <div key={section.id} className="animate-in fade-in duration-500">
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                    <span className="w-1.5 h-8 bg-brand-500 rounded-full" /> 
                    {section.title}
                  </h2>
                  {!showSavedOnly && section.intro && <div className="mb-6">{renderMarkdownBlock(section.intro, `sec-intro-${section.id}`)}</div>}
                  <div className="space-y-12">
                    {section.displayArticles.map((article, aIdx) => (
                        <div key={article.id} className={`transition-all duration-700 ${readArticles.has(article.id) ? 'opacity-50 grayscale-[0.5]' : ''}`}>
                            {renderMarkdownBlock(
                                article.content, 
                                `art-${section.id}-${aIdx}`, 
                                readArticles.has(article.id), 
                                savedArticles.has(article.id), 
                                () => handleToggleSave(article),
                                () => handleStartStoryAudio(article),
                                activeStorySpeakingId === article.id && isSpeaking
                            )}
                        </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-800 animate-in zoom-in-95 duration-500">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-full shadow-lg mb-6">
                <Bookmark size={48} className="text-gray-200 dark:text-slate-700" />
              </div>
              <p className="font-bold text-2xl text-gray-900 dark:text-white mb-2">
                {showSavedOnly ? 'Your list is empty' : 'No matches found'}
              </p>
              <p className="text-gray-500 dark:text-slate-400 text-center max-w-xs mb-8">
                {showSavedOnly ? 'Bookmark interesting articles to read them later when you have more time.' : 'Try adjusting your filters to find more stories.'}
              </p>
              <button 
                onClick={() => { setSelectedTopic('All'); setShowSavedOnly(false); }} 
                className="px-8 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl shadow-lg shadow-brand-500/20 transition-all active:scale-95"
              >
                {showSavedOnly ? 'Browse All Stories' : 'Reset Filters'}
              </button>
            </div>
          )}

          <div className="mt-20 pt-10 border-t border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-8">
             <div className="flex flex-col sm:flex-row items-center gap-6 text-sm">
                 <p className="text-gray-500 dark:text-slate-400 font-medium">Was this briefing helpful?</p>
                 <div className="flex gap-3">
                     <button onClick={() => handleFeedback('yes')} className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border font-bold transition-all ${feedback === 'yes' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-white dark:bg-slate-800 hover:border-green-100 dark:hover:border-green-900'}`}><ThumbsUp size={16} /> Yes</button>
                     <button onClick={() => handleFeedback('no')} className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border font-bold transition-all ${feedback === 'no' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' : 'bg-white dark:bg-slate-800 hover:border-red-100 dark:hover:border-red-900'}`}><ThumbsDown size={16} /> No</button>
                 </div>
             </div>
             <button onClick={handleShare} className="px-8 py-3.5 bg-gray-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all active:scale-95 flex items-center gap-2">
                <Share2 size={18} />
                Share Briefing
             </button>
          </div>
        </div>

        {uniqueSources.length > 0 && (
          <div className="bg-gray-50 dark:bg-slate-900/50 px-8 py-8 border-t border-gray-100 dark:border-slate-700">
            <h4 className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-6">Sources & References</h4>
            <div className="flex flex-wrap gap-3">
              {uniqueSources.map((source, idx) => (
                <a key={idx} href={source?.uri} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:text-brand-600 hover:border-brand-200 transition-all hover:shadow-xs">
                  <span className="truncate max-w-[200px]">{source?.title || 'External Source'}</span> <ExternalLink size={12} className="opacity-40" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-6 duration-300">
            <div className={`px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${toastMessage.type === 'success' ? 'bg-gray-900 dark:bg-white text-white dark:text-slate-900 border-gray-800 dark:border-slate-100' : 'bg-brand-600 text-white border-brand-500'}`}>
                {toastMessage.type === 'success' ? <BookmarkCheck size={20} className="text-green-400" /> : <Info size={20} />}
                <span className="font-bold text-sm">{toastMessage.text}</span>
            </div>
        </div>
      )}
      
      <div className="text-center mt-12 mb-20 text-gray-400 dark:text-slate-500 text-sm italic font-medium">
        <p>AI-generated content can be inaccurate. Briefly. prioritizes renowned sources but always verify important details.</p>
      </div>
    </div>
  );
};
