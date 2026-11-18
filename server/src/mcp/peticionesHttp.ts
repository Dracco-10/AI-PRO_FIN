export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export async function getJson<T>(fetchFn: FetchLike, url: string, init?: RequestInit): Promise<T> {
  const res = await fetchFn(url, init);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} al llamar ${new URL(url).hostname}`);
  }
  return (await res.json()) as T;
}

// textos cortos = menos tokens y menos espacio para esconder instrucciones
export function truncate(text: string | undefined | null, max = 400): string {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
