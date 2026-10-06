import React, { useState } from 'react';
import { NEWS_CATEGORIES, TONE_OPTIONS, LANGUAGES } from '../constants';
import { UserPreferences } from '../types';
import { Icon } from './Icon';
import { Check, Plus, X, Globe, ChevronDown, MapPin, ArrowRight } from 'lucide-react';

// Keep in sync with the limits enforced by the server (server/security.ts)
const MAX_TOPICS = 10;
const MAX_TOPIC_LEN = 60;
const MAX_LOCATION_LEN = 80;

interface OnboardingProps {
  onComplete: (prefs: UserPreferences) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState('');
  const [selectedTone, setSelectedTone] = useState<UserPreferences['tone']>('professional');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [manualLocation, setManualLocation] = useState('');

  const toggleTopic = (id: string) => {
    setSelectedTopics(prev => 
      prev.includes(id) 
        ? prev.filter(t => t !== id) 
        : [...prev, id]
    );
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const value = customInput.trim();
    if (value && !selectedTopics.includes(value) && selectedTopics.length < MAX_TOPICS) {
      setSelectedTopics(prev => [...prev, value]);
      setCustomInput('');
    }
  };

  const removeTopic = (topic: string) => {
    setSelectedTopics(prev => prev.filter(t => t !== topic));
  };

  const handleGenerate = () => {
    if (selectedTopics.length === 0) return;
    
    onComplete({
      topics: selectedTopics,
      tone: selectedTone,
      language: selectedLanguage,
      manualLocation: manualLocation.trim() || undefined
    });
  };

  const isValid = selectedTopics.length > 0;

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
          Welcome to Briefly.
        </h1>
        <p className="text-lg text-gray-600 dark:text-slate-400">
          Design your daily briefing. Select topics, choose your language, and get news from renowned sources.
        </p>
      </div>

      {/* Topics Section */}
      <div className="mb-12">
        <h2 className="text-sm font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-6">
          1. Choose Topics <span className="text-red-400">*</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {NEWS_CATEGORIES.map((cat) => {
            const isSelected = selectedTopics.includes(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => toggleTopic(cat.id)}
                className={`
                  relative flex flex-col items-center justify-center p-6 rounded-2xl border transition-all duration-200
                  hover:shadow-md focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900
                  ${isSelected 
                    ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-700 shadow-xs' 
                    : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:border-brand-100 dark:hover:border-slate-600'}
                `}
              >
                <div className={`
                  mb-3 p-3 rounded-full transition-colors
                  ${isSelected ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300' : 'bg-gray-50 dark:bg-slate-700 text-gray-400 dark:text-slate-400'}
                `}>
                  <Icon name={cat.icon} size={24} />
                </div>
                <span className={`font-medium ${isSelected ? 'text-brand-900 dark:text-brand-200' : 'text-gray-600 dark:text-slate-400'}`}>
                  {cat.label}
                </span>
                
                {isSelected && (
                  <div className="absolute top-3 right-3 text-brand-500 dark:text-brand-400">
                    <Check size={16} strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleAddCustom} className="flex gap-2 mb-4">
          <input 
            type="text" 
            value={customInput}
            maxLength={MAX_TOPIC_LEN}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Add specific interest (e.g., 'AAPL', 'Bitcoin', 'NVIDIA')"
            className="flex-1 p-3 px-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-brand-500 outline-hidden transition-all shadow-xs"
          />
          <button 
            type="submit" 
            disabled={!customInput.trim() || selectedTopics.length >= MAX_TOPICS}
            className="bg-gray-900 dark:bg-slate-700 text-white p-3 rounded-xl hover:bg-gray-800 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus size={24} />
          </button>
        </form>

        {selectedTopics.some(t => !NEWS_CATEGORIES.find(c => c.id === t)) && (
           <div className="flex flex-wrap gap-2">
             {selectedTopics
               .filter(t => !NEWS_CATEGORIES.find(c => c.id === t))
               .map(t => (
                 <span key={t} className="bg-brand-100 dark:bg-brand-900/40 text-brand-800 dark:text-brand-200 pl-3 pr-2 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium animate-in fade-in zoom-in duration-200">
                   {t}
                   <button onClick={() => removeTopic(t)} className="hover:text-brand-900 dark:hover:text-white p-0.5 hover:bg-brand-200 dark:hover:bg-brand-800/50 rounded-md transition-colors">
                     <X size={14} />
                   </button>
                 </span>
               ))
             }
           </div>
        )}
      </div>

      {/* Language Section */}
      <div className="mb-12">
        <h2 className="text-sm font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-6">
          2. Select Language
        </h2>
        <div className="relative">
            <div className="relative">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full appearance-none bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white text-base font-medium rounded-xl py-3 pl-12 pr-10 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-hidden transition-all shadow-xs cursor-pointer hover:border-gray-300 dark:hover:border-slate-600"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.native} ({lang.label})
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400 dark:text-slate-500">
                 <Globe size={20} />
              </div>
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-400 dark:text-slate-500">
                <ChevronDown size={20} />
              </div>
            </div>
        </div>
      </div>

      {/* Location Section */}
      <div className="mb-12">
        <h2 className="text-sm font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-6">
          3. Set Location (Optional)
        </h2>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400 dark:text-slate-500">
            <MapPin size={20} />
          </div>
          <input
            type="text"
            value={manualLocation}
            maxLength={MAX_LOCATION_LEN}
            onChange={(e) => setManualLocation(e.target.value)}
            placeholder="Enter city or region (e.g., New York, Tokyo)"
            className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white text-base font-medium rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-hidden transition-all shadow-xs hover:border-gray-300 dark:hover:border-slate-600 placeholder:text-gray-400 dark:placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Tone Section */}
      <div className="mb-12">
        <h2 className="text-sm font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-6">
          4. Briefing Style
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TONE_OPTIONS.map((tone) => (
            <button
              key={tone.id}
              onClick={() => setSelectedTone(tone.id as any)}
              className={`
                px-4 py-3 rounded-xl border text-left transition-all
                ${selectedTone === tone.id 
                  ? 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white text-white dark:text-slate-900 shadow-lg' 
                  : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600'}
              `}
            >
              <div className="font-semibold mb-1">{tone.label}</div>
              <div className={`text-xs ${selectedTone === tone.id ? 'text-gray-300 dark:text-slate-600' : 'text-gray-400 dark:text-slate-500'}`}>
                {tone.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-center pb-8">
        <button
          onClick={handleGenerate}
          disabled={!isValid}
          className={`
            group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200
            bg-brand-600 rounded-full shadow-lg hover:bg-brand-700 hover:shadow-brand-500/30 hover:-translate-y-0.5
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:bg-gray-400 dark:disabled:bg-slate-700
          `}
        >
          <span>Create Briefing</span>
          <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
        </button>
      </div>
    </div>
  );
};