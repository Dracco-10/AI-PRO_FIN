import { getSessionId, isOpenableUrl, isTrustedImage } from "./seguridadCliente";
import { defaultWsUrl, mountChatWidget } from "./sdk";
import { act } from "@testing-library/react";
import { fakeFactory } from "./utilidadesDePrueba/socketFalso";

describe("isOpenableUrl", () => {
  it.each([
    ["https://books.google.com/books?id=1", true],
    ["https://www.google.com/books/edition/x", true],
    ["https://www.imdb.com/title/tt1/", true],
    ["http://www.imdb.com/", false],
    ["https://www.imdb.com.evil.com/", false],
    ["javascript:alert(1)", false],
    ["nada", false]
  ])("%s → %s", (url, ok) => expect(isOpenableUrl(url)).toBe(ok));
});

describe("isTrustedImage", () => {
  it("acepta pósters de TMDB y rechaza otros dominios", () => {
    expect(isTrustedImage("https://image.tmdb.org/t/p/w500/a.jpg")).toBe(true);
    expect(isTrustedImage("https://evil.com/a.jpg")).toBe(false);
    expect(isTrustedImage(undefined)).toBe(false);
  });
});

describe("getSessionId", () => {
  it("reutiliza el id guardado", () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    const id = getSessionId(storage);
    expect(getSessionId(storage)).toBe(id);
  });

  it("funciona sin storage o si el storage falla", () => {
    expect(getSessionId(undefined)).toMatch(/^s-/);
    const broken = {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {}
    };
    expect(getSessionId(broken)).toMatch(/^s-/);
  });
});

describe("SDK", () => {
  it("arma la URL del websocket según el protocolo", () => {
    expect(defaultWsUrl({ protocol: "https:", host: "agichat.com" })).toBe("wss://agichat.com/ws");
    expect(defaultWsUrl({ protocol: "http:", host: "localhost:5173" })).toBe("ws://localhost:5173/ws");
    expect(defaultWsUrl()).toMatch(/^ws:\/\//);
  });

  it("monta el widget en un elemento", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    let root!: ReturnType<typeof mountChatWidget>;
    act(() => {
      root = mountChatWidget(el, { wsUrl: "ws://t", createSocket: fakeFactory });
    });
    expect(el.querySelector(".agichat-launcher")).not.toBeNull();
    act(() => root.unmount());
  });
});
