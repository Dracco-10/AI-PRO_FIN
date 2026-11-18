import { getJson, truncate, type FetchLike } from "../peticionesHttp.js";

const BASE = "https://www.googleapis.com/books/v1/volumes";

export interface BookSummary {
  id: string;
  title: string;
  authors: string[];
  publishedDate: string;
  rating: number | null;
  ratingsCount: number;
  pageCount: number | null;
  description: string;
  thumbnail: string | null;
  infoUrl: string;
}

interface RawVolume {
  id: string;
  volumeInfo: {
    title?: string;
    authors?: string[];
    publishedDate?: string;
    averageRating?: number;
    ratingsCount?: number;
    pageCount?: number;
    description?: string;
    imageLinks?: { thumbnail?: string };
    infoLink?: string;
  };
}

function toSummary(v: RawVolume, descMax: number): BookSummary {
  const i = v.volumeInfo;
  return {
    id: v.id,
    title: i.title ?? "Sin título",
    authors: i.authors ?? [],
    publishedDate: i.publishedDate ?? "",
    rating: i.averageRating ?? null,
    ratingsCount: i.ratingsCount ?? 0,
    pageCount: i.pageCount ?? null,
    description: truncate(i.description?.replace(/<[^>]+>/g, ""), descMax),
    thumbnail: i.imageLinks?.thumbnail?.replace("http://", "https://") ?? null,
    // el link lo armamos nosotros, no se usa el que manda la API
    infoUrl: `https://books.google.com/books?id=${encodeURIComponent(v.id)}`
  };
}

export class GoogleBooksApi {
  constructor(
    private readonly apiKey?: string,
    private readonly fetchFn: FetchLike = fetch
  ) {}

  private url(path: string, params: Record<string, string>): string {
    const url = new URL(`${BASE}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    if (this.apiKey) url.searchParams.set("key", this.apiKey);
    return url.toString();
  }

  async searchBooks(query: string, author?: string): Promise<BookSummary[]> {
    const q = author ? `intitle:${query}+inauthor:${author}` : query;
    const data = await getJson<{ items?: RawVolume[] }>(
      this.fetchFn,
      this.url("", { q, maxResults: "5", printType: "books" })
    );
    return (data.items ?? []).map((v) => toSummary(v, 250));
  }

  async getBook(id: string): Promise<BookSummary> {
    const data = await getJson<RawVolume>(this.fetchFn, this.url(`/${encodeURIComponent(id)}`, {}));
    return toSummary(data, 600);
  }
}
