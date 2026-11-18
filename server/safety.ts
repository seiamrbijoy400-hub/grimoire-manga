/**
 * Content safety — adult titles are removed from discovery and direct access.
 *
 * Rules are deliberately tag-based: WeebCentral exposes tags like "Adult",
 * "Hentai", "Ecchi" while MangaDex uses contentRating (handled in mangadex.ts).
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

export function isAdultTag(tag: string): boolean {
  return BLOCKED.has(KEY(tag));
}

export function isAdultContent(item: { tags?: string[] }): boolean {
  return (item.tags || []).some(isAdultTag);
}

/** Strip adult entries from any result list. */
export function filterSafe<T extends { tags?: string[] }>(items: T[]): T[] {
  return items.filter((item) => !isAdultContent(item));
}
