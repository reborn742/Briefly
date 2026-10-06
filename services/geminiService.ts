import { UserPreferences, NewsResponse } from '../types';
import { toSafeHttpUrl } from './safe';

export const fetchCuratedNews = async (prefs: UserPreferences): Promise<NewsResponse> => {
  const response = await fetch('/api/news', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(prefs),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(typeof errorData.error === 'string' && errorData.error ? errorData.error : `Server responded with error status ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.content,
    groundingMetadata: data.groundingMetadata,
    timestamp: data.timestamp || new Date().toISOString(),
  };
};

export const summarizeBriefing = async (content: string): Promise<string> => {
  const response = await fetch('/api/summarize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(typeof errorData.error === 'string' && errorData.error ? errorData.error : 'Failed to generate summary');
  }

  const data = await response.json();
  return data.summary || 'Summary could not be generated.';
};

export const generateBriefingImage = async (topics: string[], visualStyle?: string): Promise<string | null> => {
  try {
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topics, visualStyle }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    // Only ever render https images; the server returns fixed Unsplash URLs.
    const url = toSafeHttpUrl(data.imageUrl);
    return url && url.startsWith('https://') ? url : null;
  } catch (error) {
    console.error('Failed to retrieve briefing image:', error);
    return null;
  }
};
