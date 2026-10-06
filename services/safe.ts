import { SavedArticle } from '../types';

/** Normalised http(s) URL, or null (rejects javascript:, data:, vbscript:, file:, credentials in URL…). */
export const toSafeHttpUrl = (raw: unknown): string | null => {
  if (typeof raw !== 'string' || raw.length > 2048) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
};

// --- localStorage ----------------------------------------------------------------------------
// Access can throw (blocked storage, sandboxed iframes, private mode) and stored data can be
// corrupted or tampered with, so every read is wrapped and validated before use.

export const storageGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const storageSet = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

const parseJson = (raw: string | null): unknown => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const MAX_ID_LEN = 2048;
const MAX_STORED_IDS = 1000;

export const loadStringSet = (key: string): Set<string> => {
  const parsed = parseJson(storageGet(key));
  if (!Array.isArray(parsed)) return new Set();
  return new Set(
    parsed.filter((v): v is string => typeof v === 'string' && v.length <= MAX_ID_LEN).slice(-MAX_STORED_IDS),
  );
};

export const saveStringSet = (key: string, set: Set<string>): void => {
  storageSet(key, JSON.stringify(Array.from(set).slice(-MAX_STORED_IDS)));
};

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '');

export const loadSavedArticles = (): SavedArticle[] => {
  const parsed = parseJson(storageGet('briefly_saved_articles_list'));
  if (!Array.isArray(parsed)) return [];
  const out: SavedArticle[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const a = item as Record<string, unknown>;
    const id = str(a.id, MAX_ID_LEN);
    if (!id) continue;
    out.push({
      id,
      title: str(a.title, 500),
      topic: str(a.topic, 100),
      content: str(a.content, 50_000),
      sourceUrls: Array.isArray(a.sourceUrls)
        ? a.sourceUrls.map(toSafeHttpUrl).filter((u): u is string => u !== null).slice(0, 50)
        : [],
      savedAt: str(a.savedAt, 40),
    });
  }
  return out;
};

export const saveSavedArticles = (list: SavedArticle[]): void => {
  storageSet('briefly_saved_articles_list', JSON.stringify(list));
  storageSet('briefly_saved_articles', JSON.stringify(list.map(a => a.id)));
};

export const loadVoicePrefs = (): { gender: 'female' | 'male'; rate: number } => {
  const gender = storageGet('briefly_voice_gender') === 'male' ? 'male' : 'female';
  const rate = parseFloat(storageGet('briefly_voice_rate') || '');
  return { gender, rate: Number.isFinite(rate) ? Math.min(2, Math.max(0.5, rate)) : 1.0 };
};
