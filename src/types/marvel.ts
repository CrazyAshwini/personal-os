export type MarvelUniverse =
  | 'MCU'
  | 'Netflix/Marvel TV'
  | 'Marvel TV'
  | 'Fox'
  | 'Sony'
  | 'Legacy';

export type MarvelType =
  | 'Movie'
  | 'Animated Movie'
  | 'Series'
  | 'Animated Series'
  | 'Animated Shorts'
  | 'Special Presentation';

export type MarvelPriority = 'Essential' | 'Recommended' | 'Optional';

export interface MarvelItem {
  id: string;
  order: number;
  universe: MarvelUniverse;
  group: string;
  title: string;
  type: MarvelType;
  releaseDate: string | null;
  releaseYear: number;
  releaseYearEnd: number | null;
  seasons: number | null;
  continuity: string;
  priority: MarvelPriority;
  released: boolean;
  note: string | null;
}

export interface MarvelWatchlistData {
  schemaVersion: number;
  dataAsOf: string;
  items: MarvelItem[];
}

export type MarvelWatchStatus = 'unwatched' | 'watching' | 'watched';

export interface MarvelItemProgress {
  status: MarvelWatchStatus;
  rating?: number | null;
  notes?: string | null;
  watchedOn?: string | null;
}

export type MarvelProgressMap = Record<string, MarvelItemProgress>;
