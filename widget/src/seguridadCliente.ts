// el server ya valida esto, pero el widget tampoco se confía
const OPENABLE_HOSTS = ["books.google.com", "www.imdb.com", "imdb.com", "m.imdb.com"];
const IMAGE_HOSTS = ["image.tmdb.org", "books.google.com", "books.googleusercontent.com"];

function parseHttps(raw: string | undefined): URL | null {
  try {
    const url = new URL(raw ?? "");
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function isOpenableUrl(raw: string): boolean {
  const url = parseHttps(raw);
  if (!url) return false;
  return OPENABLE_HOSTS.includes(url.hostname) || (url.hostname === "www.google.com" && url.pathname.startsWith("/books"));
}

export function isTrustedImage(raw: string | undefined): boolean {
  const url = parseHttps(raw);
  return url !== null && IMAGE_HOSTS.includes(url.hostname);
}

export function getSessionId(storage: Pick<Storage, "getItem" | "setItem"> | undefined = globalThis.sessionStorage): string {
  const fresh = () => `s-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  try {
    const existing = storage?.getItem("agichat-session");
    if (existing) return existing;
    const id = fresh();
    storage?.setItem("agichat-session", id);
    return id;
  } catch {
    return fresh();
  }
}
