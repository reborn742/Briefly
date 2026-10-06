/**
 * Input validation / sanitisation helpers for the API.
 * Everything that reaches an LLM prompt or a response goes through here.
 * Kept free of side effects so it can be unit-tested.
 */

export const MAX_TOPICS = 10;
export const MAX_TOPIC_LEN = 60;
export const MAX_LOCATION_LEN = 80;
export const MAX_SUMMARY_INPUT = 10_000;

export const TONES = [
  'professional',
  'casual',
  'analytical',
  'executive',
  'just_the_facts',
  'brutally_honest',
] as const;
export type Tone = (typeof TONES)[number];

export const LANGUAGES_MAP: Record<string, string> = {
  en: 'English',
  es: 'Spanish (Español)',
  fr: 'French (Français)',
  de: 'German (Deutsch)',
  it: 'Italian (Italiano)',
  pt: 'Portuguese (Português)',
  ru: 'Russian (Русский)',
  zh: 'Simplified Chinese (简体中文)',
  ja: 'Japanese (日本語)',
  ko: 'Korean (한국어)',
  ar: 'Arabic (العربية)',
  hi: 'Hindi (हिन्दी)',
  bn: 'Bengali (বাংলা)',
  ur: 'Urdu (اردو)',
  tr: 'Turkish (Türkçe)',
  id: 'Indonesian (Bahasa Indonesia)',
  vi: 'Vietnamese (Tiếng Việt)',
};

// C0/C1 control chars, line/paragraph separators, zero-width and bidi override characters
// (the latter are commonly used to hide or reorder text in prompt-injection payloads).
// eslint-disable-next-line no-control-regex
const INVISIBLE_OR_CONTROL = /[\u0000-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g;

/** Returns a single-line, length-limited string, or '' for non-strings. */
export function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(INVISIBLE_OR_CONTROL, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function parseTopics(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const topic = cleanText(item, MAX_TOPIC_LEN);
    if (!topic) continue;
    const key = topic.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(topic);
    if (out.length >= MAX_TOPICS) break;
  }
  return out;
}

export function parseTone(value: unknown): Tone {
  return typeof value === 'string' && (TONES as readonly string[]).includes(value)
    ? (value as Tone)
    : 'professional';
}

/** Own-property lookup only: `constructor`, `__proto__`, `toString`… must not resolve. */
export function resolveLanguage(code: unknown): string {
  return typeof code === 'string' && Object.hasOwn(LANGUAGES_MAP, code) ? LANGUAGES_MAP[code] : 'English';
}

/** Validates GPS coordinates and reduces precision to ~1 km (data minimisation). */
export function parseLocation(value: unknown): { lat: number; lng: number } | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const { lat, lng } = value as Record<string, unknown>;
  if (typeof lat !== 'number' || typeof lng !== 'number') return undefined;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;
  return { lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100 };
}

/** Normalised http(s) URL or null. Rejects javascript:, data:, vbscript:, file:, etc. */
export function toSafeHttpUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 2048) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

const XML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#39': "'",
  '#x27': "'",
};

/** Single-pass entity decode (decoding `&amp;` first would double-decode `&amp;lt;`). */
export function decodeXmlText(input: string): string {
  return input
    .replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1')
    .replace(/&(amp|lt|gt|quot|apos|#39|#x27);/g, (_m, name: string) => XML_ENTITIES[name])
    .replace(/<[^>]*>/g, ' ');
}

// URL part tolerates one level of nested parentheses, e.g. https://en.wikipedia.org/wiki/Foo_(bar)
const MD_LINK = /(!?)\[([^\]]*)\]\(\s*<?((?:[^()\s>]|\([^()\s]*\))+)>?(?:\s+"[^"]*")?\s*\)/g;

/**
 * LLM output is untrusted (it is influenced by user input and third-party headlines).
 * Keep a markdown link only if its URL is one we actually retrieved; otherwise keep the
 * label as plain text. Images are always dropped.
 */
export function restrictLinks(markdown: string, allowed: ReadonlySet<string>): string {
  return markdown.replace(MD_LINK, (_m, bang: string, text: string, url: string) => {
    if (bang) return '';
    const safe = toSafeHttpUrl(url);
    return safe && allowed.has(safe) ? `[${text}](${safe})` : text;
  });
}
