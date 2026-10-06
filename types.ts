export interface UserPreferences {
  topics: string[];
  tone: 'professional' | 'casual' | 'analytical' | 'executive' | 'just_the_facts' | 'brutally_honest';
  language: string;
  location?: {
    lat: number;
    lng: number;
  };
  manualLocation?: string;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface GroundingMetadata {
  groundingChunks: GroundingChunk[];
  groundingSupports?: any[];
  searchEntryPoint?: any;
}

export interface NewsResponse {
  content: string;
  groundingMetadata?: GroundingMetadata;
  timestamp: string;
}

export interface NewsCategory {
  id: string;
  label: string;
  icon: string;
}

export interface SavedArticle {
  id: string;
  title: string;
  topic: string;
  content: string;
  sourceUrls?: string[];
  savedAt: string;
}

export enum AppView {
  ONBOARDING = 'ONBOARDING',
  FEED = 'FEED',
  SAVED = 'SAVED',
}