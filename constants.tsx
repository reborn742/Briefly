import React from 'react';
import { NewsCategory } from './types';
import { Globe, Cpu, Briefcase, Activity, Film, Scale, Leaf, Newspaper, TrendingUp, Cloud } from 'lucide-react';

export const LANGUAGES = [
  { id: 'en', label: 'English', native: 'English' },
  { id: 'es', label: 'Spanish', native: 'Español' },
  { id: 'fr', label: 'French', native: 'Français' },
  { id: 'de', label: 'German', native: 'Deutsch' },
  { id: 'it', label: 'Italian', native: 'Italiano' },
  { id: 'pt', label: 'Portuguese', native: 'Português' },
  { id: 'ru', label: 'Russian', native: 'Русский' },
  { id: 'zh', label: 'Chinese', native: '中文' },
  { id: 'ja', label: 'Japanese', native: '日本語' },
  { id: 'ko', label: 'Korean', native: '한국어' },
  { id: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { id: 'bn', label: 'Bengali', native: 'বাংলা' },
  { id: 'ar', label: 'Arabic', native: 'العربية' },
  { id: 'tr', label: 'Turkish', native: 'Türkçe' },
  { id: 'id', label: 'Indonesian', native: 'Bahasa Indonesia' },
  { id: 'vi', label: 'Vietnamese', native: 'Tiếng Việt' },
];

export const NEWS_CATEGORIES: NewsCategory[] = [
  { id: 'weather', label: 'Weather', icon: 'Cloud' },
  { id: 'stocks', label: 'Stocks & Markets', icon: 'TrendingUp' },
  { id: 'technology', label: 'Technology', icon: 'Cpu' },
  { id: 'business', label: 'Business', icon: 'Briefcase' },
  { id: 'world', label: 'World News', icon: 'Globe' },
  { id: 'health', label: 'Health', icon: 'Activity' },
  { id: 'entertainment', label: 'Entertainment', icon: 'Film' },
  { id: 'sports', label: 'Sports', icon: 'Activity' }, 
  { id: 'science', label: 'Science', icon: 'Leaf' },
  { id: 'politics', label: 'Politics', icon: 'Scale' },
];

export const TONE_OPTIONS = [
  { id: 'brutally_honest', label: 'Brutally Honest', description: 'Unfiltered, skeptical, and direct. Cuts through PR spin and fluff.' },
  { id: 'just_the_facts', label: 'Just the Facts', description: 'Pure data and events. No narrative, no opinion. Bullet points only.' },
  { id: 'executive', label: 'Executive Brief', description: 'High-level summaries. Bottom line up front. Respects your time.' },
  { id: 'professional', label: 'Professional', description: 'Concise, factual, and direct journalism.' },
  { id: 'analytical', label: 'Analytical', description: 'Deep dive, context-heavy, and detailed.' },
  { id: 'casual', label: 'Casual', description: 'Easy to read, conversational style.' },
];