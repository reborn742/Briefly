export interface VoiceOptions {
  gender: 'female' | 'male';
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
  onSectionChange?: (title: string) => void;
}

export const cleanMarkdownForSpeech = (markdown: string): string => {
  return markdown
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove image tags
    .replace(/!\[.*?\]\(.*?\)/g, '')
    // Convert links [Text](URL) -> Text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove raw URLs
    .replace(/https?:\/\/\S+/g, '')
    // Clean headers
    .replace(/^#+\s+/gm, '')
    // Clean bullet points
    .replace(/^[\*\-\•]\s+/gm, '')
    // Remove markdown bold/italics
    .replace(/[*_~`]/g, '')
    // Normalize abbreviations for friendly natural pronunciation
    .replace(/\bCEOs\b/g, 'C E Os')
    .replace(/\bCEO\b/g, 'C E O')
    .replace(/\bAI\b/g, 'A I')
    .replace(/\bBLUF\b/g, 'Bottom Line Up Front')
    // Remove "Sources:" lines with raw links
    .replace(/Sources?:.*$/gim, '')
    // Remove multiple newlines
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    // Remove excess spaces
    .replace(/\s{2,}/g, ' ')
    .trim();
};

export class SpeechNarrator {
  private isSpeakingInternal: boolean = false;
  private isPausedInternal: boolean = false;
  private currentChunks: string[] = [];
  private currentChunkIndex: number = 0;
  private currentOptions: VoiceOptions | null = null;
  private availableVoices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  private loadVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.availableVoices = window.speechSynthesis.getVoices();
    }
  }

  public getBestVoice(gender: 'female' | 'male', lang: string = 'en'): { voice: SpeechSynthesisVoice | null; pitch: number } {
    if (!this.availableVoices.length && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.availableVoices = window.speechSynthesis.getVoices();
    }

    const englishVoices = this.availableVoices.filter(v => v.lang.startsWith('en') || v.lang.startsWith(lang));
    const voicesPool = englishVoices.length > 0 ? englishVoices : this.availableVoices;

    if (gender === 'female') {
      const femaleKeywords = [
        'natural', 'female', 'samantha', 'victoria', 'karen', 'zira', 'jenny', 'aria',
        'google us english', 'moira', 'fiona', 'tessa', 'susan', 'ava', 'allison', 'serena'
      ];
      
      const found = voicesPool.find(v => {
        const name = v.name.toLowerCase();
        return femaleKeywords.some(kw => name.includes(kw));
      }) || voicesPool.find(v => !v.name.toLowerCase().includes('male') && !v.name.toLowerCase().includes('david')) || voicesPool[0];

      return { voice: found || null, pitch: 1.05 };
    } else {
      const maleKeywords = [
        'male', 'david', 'alex', 'guy', 'george', 'daniel', 'oliver', 'tom',
        'google uk english male', 'rishi', 'mark', 'fred', 'bruce'
      ];

      const found = voicesPool.find(v => {
        const name = v.name.toLowerCase();
        return maleKeywords.some(kw => name.includes(kw));
      }) || voicesPool.find(v => v.name.toLowerCase().includes('male')) || voicesPool[0];

      return { voice: found || null, pitch: 0.90 };
    }
  }

  public speakText(text: string, options: VoiceOptions) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis is not supported in this browser.');
      options.onError?.();
      return;
    }

    this.stop();

    const cleaned = cleanMarkdownForSpeech(text);
    if (!cleaned) {
      options.onEnd?.();
      return;
    }

    // Split text into manageable natural sentences to prevent Chrome/Safari speech cutoff
    const sentences = cleaned.match(/[^.!?]+[.!?]+|\s*[^.!?]+$/g) || [cleaned];
    this.currentChunks = sentences.map(s => s.trim()).filter(s => s.length > 0);
    this.currentChunkIndex = 0;
    this.currentOptions = options;
    this.isSpeakingInternal = true;
    this.isPausedInternal = false;

    options.onStart?.();
    this.speakNextChunk();
  }

  private speakNextChunk() {
    if (!this.isSpeakingInternal || this.currentChunkIndex >= this.currentChunks.length) {
      this.isSpeakingInternal = false;
      this.isPausedInternal = false;
      this.currentOptions?.onEnd?.();
      return;
    }

    const chunk = this.currentChunks[this.currentChunkIndex];
    const utterance = new SpeechSynthesisUtterance(chunk);
    const { gender, rate = 1.0 } = this.currentOptions || { gender: 'female' };
    const { voice, pitch } = this.getBestVoice(gender);

    if (voice) {
      utterance.voice = voice;
    }
    utterance.pitch = pitch;
    utterance.rate = rate;

    utterance.onend = () => {
      this.currentChunkIndex++;
      this.speakNextChunk();
    };

    utterance.onerror = (e) => {
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        console.warn('Speech synthesis error:', e);
      }
      this.currentChunkIndex++;
      this.speakNextChunk();
    };

    window.speechSynthesis.speak(utterance);
  }

  public pause() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
      this.isPausedInternal = true;
    }
  }

  public resume() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
      this.isPausedInternal = false;
    }
  }

  public stop() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.isSpeakingInternal = false;
      this.isPausedInternal = false;
      this.currentChunks = [];
      this.currentChunkIndex = 0;
      window.speechSynthesis.cancel();
      this.currentOptions?.onEnd?.();
    }
  }

  public isSpeaking(): boolean {
    return this.isSpeakingInternal;
  }

  public isPaused(): boolean {
    return this.isPausedInternal;
  }
}

export const speechNarrator = new SpeechNarrator();
