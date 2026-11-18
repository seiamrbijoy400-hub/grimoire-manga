/**
 * Client-side mirror of the server's adult-content policy.
 * Used to keep adult tags out of filter chips and detail views.
 */
export const ADULT_TAGS = [
  'adult',
  'adult content',
  'ecchi',
  'hentai',
  'smut',
  'mature',
  'lolicon',
  'shotacon',
  'nsfw',
  'pornographic',
];

const KEY = (value: string) => value.toLowerCase().replace(/[^a-z]/g, '');
const BLOCKED = new Set(ADULT_TAGS.map(KEY));

export const isAdultTag = (tag: string): boolean => BLOCKED.has(KEY(tag));

export const filterSafeTags = (tags?: string[]): string[] =>
  (tags || []).filter((tag) => !isAdultTag(tag));
