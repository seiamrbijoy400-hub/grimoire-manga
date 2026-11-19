/**
 * One canonical genre list for the whole app.
 *
 * The filter drawer, the search page chips and any future genre rail read from
 * here, so a genre can never drift out of one surface while remaining in
 * another (which made "Thriller" unfindable and "Comedy" invisible in groups).
 *
 * Names match the upstream tag vocabulary on WeebCentral/MangaDex exactly.
 */
import { isAdultTag } from './contentSafety.ts';

export interface GenreGroup {
  title: string;
  blurb: string;
  tags: string[];
}

export const GENRE_GROUPS: GenreGroup[] = [
  {
    title: 'Action & adventure',
    blurb: 'Momentum, stakes, journeys',
    tags: ['Action', 'Adventure', 'Martial Arts', 'Sports', 'Historical'],
  },
  {
    title: 'Story & mood',
    blurb: 'Tension, mystery, atmosphere',
    tags: ['Comedy', 'Drama', 'Mystery', 'Thriller', 'Tragedy', 'Psychological', 'Horror', 'Supernatural'],
  },
  {
    title: 'Life & world',
    blurb: 'Settings, systems, other worlds',
    tags: ['Slice of Life', 'School Life', 'Isekai', 'Mecha', 'Sci-fi', 'Fantasy'],
  },
  {
    title: 'Romance & people',
    blurb: 'Relationships and demographics',
    tags: ['Romance', 'Harem', 'Gender Bender', 'Yaoi', 'Yuri', 'Josei', 'Shoujo', 'Shounen', 'Seinen'],
  },
];

/** Every selectable genre, de-duplicated and safe. */
export const ALL_GENRES: string[] = Array.from(
  new Set(GENRE_GROUPS.flatMap((group) => group.tags)),
).filter((tag) => !isAdultTag(tag));

/** The short row shown above search results — most-used first. */
export const GENRE_CHIPS: string[] = [
  'All',
  'Action',
  'Romance',
  'Fantasy',
  'Comedy',
  'Drama',
  'Horror',
  'Mystery',
  'Isekai',
  'Slice of Life',
  'Sports',
  'Supernatural',
  'Sci-fi',
  'Thriller',
  'Seinen',
];

/** Find the group a genre belongs to (used for context labels). */
export const groupForGenre = (genre: string): GenreGroup | undefined =>
  GENRE_GROUPS.find((group) => group.tags.includes(genre));
