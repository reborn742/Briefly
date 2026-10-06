import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Volume2, Headphones, Radio, Sparkles } from 'lucide-react';
import { loadVoicePrefs, storageSet } from '../services/safe';

interface AudioPlayerProps {
  fullText: string;
  title?: string;
  isSpeaking: boolean;
  onStartSpeak: (gender: 'female' | 'male', rate: number) => void;
  onPauseSpeak: () => void;
  onResumeSpeak: () => void;
  onStopSpeak: () => void;
  isPaused: boolean;
  currentSectionTitle?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  fullText,
  title = "Daily News Briefing",
  isSpeaking,
  onStartSpeak,
  onPauseSpeak,
  onResumeSpeak,
  onStopSpeak,
  isPaused,
  currentSectionTitle,
}) => {
  const [selectedGender, setSelectedGender] = useState<'female' | 'male'>(() => loadVoicePrefs().gender);

  const [playbackRate, setPlaybackRate] = useState<number>(() => loadVoicePrefs().rate);

  const handleGenderChange = (gender: 'female' | 'male') => {
    setSelectedGender(gender);
    storageSet('briefly_voice_gender', gender);

    // If already speaking, restart with new voice
    if (isSpeaking) {
      onStartSpeak(gender, playbackRate);
    }
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    storageSet('briefly_voice_rate', rate.toString());

    if (isSpeaking) {
      onStartSpeak(selectedGender, rate);
    }
  };

  const handlePlayToggle = () => {
    if (isSpeaking) {
      if (isPaused) {
        onResumeSpeak();
      } else {
        onPauseSpeak();
      }
    } else {
      onStartSpeak(selectedGender, playbackRate);
    }
  };

  return (
    <div className="bg-linear-to-r from-brand-600 via-brand-700 to-sky-800 text-white rounded-2xl p-4 sm:p-5 shadow-xl shadow-brand-500/10 mb-8 border border-brand-400/20 transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Side: Title & Status */}
        <div className="flex items-center gap-3.5">
          <div className={`p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-inner flex items-center justify-center shrink-0 ${isSpeaking && !isPaused ? 'animate-pulse' : ''}`}>
            {isSpeaking && !isPaused ? (
              <Radio size={24} className="text-white animate-spin" style={{ animationDuration: '4s' }} />
            ) : (
              <Headphones size={24} className="text-white" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-200 bg-white/10 px-2 py-0.5 rounded-full">
                Audio Edition
              </span>
              {isSpeaking && (
                <span className="flex items-center gap-1.5 text-xs text-brand-100 font-medium animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  {isPaused ? 'Paused' : 'Playing...'}
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight mt-0.5 leading-snug">
              Listen to Briefing
            </h3>
            {currentSectionTitle && isSpeaking ? (
              <p className="text-xs text-brand-100/90 font-medium truncate max-w-xs sm:max-w-md">
                Reading: <span className="text-white font-semibold">{currentSectionTitle}</span>
              </p>
            ) : (
              <p className="text-xs text-brand-100/80">
                Friendly human-like voice narration of all top stories
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Voice Options & Play Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Male / Female Voice Selector */}
          <div className="flex items-center bg-black/20 p-1 rounded-xl backdrop-blur-md border border-white/10">
            <button
              onClick={() => handleGenderChange('female')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedGender === 'female'
                  ? 'bg-white text-brand-800 shadow-xs'
                  : 'text-brand-100 hover:text-white hover:bg-white/10'
              }`}
              title="Friendly Female Voice"
            >
              <span>👩 Female</span>
            </button>
            <button
              onClick={() => handleGenderChange('male')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedGender === 'male'
                  ? 'bg-white text-brand-800 shadow-xs'
                  : 'text-brand-100 hover:text-white hover:bg-white/10'
              }`}
              title="Friendly Male Voice"
            >
              <span>👨 Male</span>
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center bg-black/20 p-1 rounded-xl backdrop-blur-md border border-white/10">
            {[0.9, 1.0, 1.2].map((rate) => (
              <button
                key={rate}
                onClick={() => handleRateChange(rate)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                  playbackRate === rate
                    ? 'bg-white text-brand-800 shadow-xs'
                    : 'text-brand-100 hover:text-white hover:bg-white/10'
                }`}
                title={`Playback Speed: ${rate}x`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Play / Pause / Stop Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePlayToggle}
              className="flex items-center gap-2 px-4 py-2 bg-white text-brand-800 hover:bg-brand-50 active:scale-95 rounded-xl font-bold text-sm shadow-md transition-all"
              title={isSpeaking ? (isPaused ? 'Resume Audio' : 'Pause Audio') : 'Start Listening'}
            >
              {isSpeaking && !isPaused ? (
                <>
                  <Pause size={16} className="fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play size={16} className="fill-current ml-0.5" />
                  <span>{isPaused ? 'Resume' : 'Listen'}</span>
                </>
              )}
            </button>

            {isSpeaking && (
              <button
                onClick={onStopSpeak}
                className="p-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl transition-all border border-white/20"
                title="Stop Audio"
              >
                <Square size={16} className="fill-current" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Audio Wave Visualizer when speaking */}
      {isSpeaking && !isPaused && (
        <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-brand-100">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-3 bg-white/70 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></span>
            <span className="w-1.5 h-5 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></span>
            <span className="w-1.5 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></span>
            <span className="w-1.5 h-6 bg-white rounded-full animate-pulse" style={{ animationDelay: '450ms' }}></span>
            <span className="w-1.5 h-4 bg-white/90 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></span>
            <span className="w-1.5 h-2 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: '350ms' }}></span>
            <span className="ml-2 font-medium">
              Narrating with friendly {selectedGender === 'female' ? 'female' : 'male'} voice ({playbackRate}x speed)
            </span>
          </div>
          <button
            onClick={onStopSpeak}
            className="text-xs text-brand-200 hover:text-white underline underline-offset-2 transition-colors"
          >
            End Audio
          </button>
        </div>
      )}
    </div>
  );
};
