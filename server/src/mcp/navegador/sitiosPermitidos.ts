// aunque alguien logre inyectarle algo al agente, solo puede abrir estos sitios
const ALLOWED_HOSTS = new Set(["books.google.com", "www.imdb.com", "imdb.com", "m.imdb.com"]);

export function isAllowedUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  if (ALLOWED_HOSTS.has(url.hostname)) return true;
  return url.hostname === "www.google.com" && url.pathname.startsWith("/books");
}

export function siteName(raw: string): "Google Books" | "IMDB" {
  return new URL(raw).hostname.includes("imdb") ? "IMDB" : "Google Books";
}
