import { getJson, truncate, type FetchLike } from "../peticionesHttp.js";

const BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";
// keyword 818 de TMDB = "based on novel or book"
export const BASED_ON_BOOK_KEYWORD = 818;

export interface MovieSummary {
  id: number;
  title: string;
  releaseDate: string;
  rating: number;
  overview: string;
  posterUrl: string | null;
}

export interface MovieDetails extends MovieSummary {
  originalTitle: string;
  runtime: number | null;
  genres: string[];
  imdbUrl: string | null;
  basedOnBook: boolean;
}

interface RawMovie {
  id: number;
  title: string;
  original_title?: string;
  release_date?: string;
  vote_average?: number;
  overview?: string;
  poster_path?: string | null;
  runtime?: number | null;
  genres?: Array<{ id: number; name: string }>;
  imdb_id?: string | null;
  keywords?: { keywords?: Array<{ id: number; name: string }> };
}

export function posterUrl(path?: string | null): string | null {
  return path ? `${IMG}${path}` : null;
}

function toSummary(m: RawMovie): MovieSummary {
  return {
    id: m.id,
    title: m.title,
    releaseDate: m.release_date ?? "",
    rating: m.vote_average ?? 0,
    overview: truncate(m.overview, 300),
    posterUrl: posterUrl(m.poster_path)
  };
}

export class TmdbApi {
  constructor(
    private readonly token: string,
    private readonly fetchFn: FetchLike = fetch,
    private readonly language = "es-MX"
  ) {}

  private get<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
    const url = new URL(`${BASE}${path}`);
    url.searchParams.set("language", this.language);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
    return getJson<T>(this.fetchFn, url.toString(), {
      headers: { Authorization: `Bearer ${this.token}`, accept: "application/json" }
    });
  }

  async searchMovies(query: string, year?: number): Promise<MovieSummary[]> {
    const data = await this.get<{ results: RawMovie[] }>("/search/movie", { query, year });
    return data.results.slice(0, 5).map(toSummary);
  }

  async getMovieDetails(id: number): Promise<MovieDetails> {
    const m = await this.get<RawMovie>(`/movie/${id}`, { append_to_response: "keywords" });
    const keywords = m.keywords?.keywords ?? [];
    return {
      ...toSummary(m),
      overview: truncate(m.overview, 600),
      originalTitle: m.original_title ?? m.title,
      runtime: m.runtime ?? null,
      genres: (m.genres ?? []).map((g) => g.name),
      imdbUrl: m.imdb_id ? `https://www.imdb.com/title/${m.imdb_id}/` : null,
      basedOnBook: keywords.some((k) => k.id === BASED_ON_BOOK_KEYWORD)
    };
  }

  async findGenreId(name: string): Promise<number | undefined> {
    const data = await this.get<{ genres: Array<{ id: number; name: string }> }>("/genre/movie/list");
    const needle = name.trim().toLowerCase();
    return data.genres.find((g) => g.name.toLowerCase().includes(needle))?.id;
  }

  async recommendMovies(opts: {
    genre?: string;
    similarToMovieId?: number;
    basedOnBook?: boolean;
  }): Promise<MovieSummary[]> {
    if (opts.similarToMovieId) {
      const data = await this.get<{ results: RawMovie[] }>(`/movie/${opts.similarToMovieId}/recommendations`);
      return data.results.slice(0, 5).map(toSummary);
    }
    const genreId = opts.genre ? await this.findGenreId(opts.genre) : undefined;
    const data = await this.get<{ results: RawMovie[] }>("/discover/movie", {
      sort_by: "popularity.desc",
      "vote_count.gte": 300,
      with_genres: genreId,
      with_keywords: opts.basedOnBook ? BASED_ON_BOOK_KEYWORD : undefined
    });
    return data.results.slice(0, 5).map(toSummary);
  }
}
