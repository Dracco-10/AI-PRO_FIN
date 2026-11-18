import { describe, expect, it, vi } from "vitest";
import { connectInMemory } from "../../agentes/herramientasMcp.js";
import { isAllowedUrl, siteName } from "./sitiosPermitidos.js";
import { createBrowserServer } from "./servidorMcpNavegador.js";

describe("allowlist", () => {
  it.each([
    ["https://books.google.com/books?id=abc", true],
    ["https://www.google.com/books/edition/_/abc", true],
    ["https://www.imdb.com/title/tt1/", true],
    ["https://m.imdb.com/title/tt1/", true],
    ["http://www.imdb.com/title/tt1/", false],
    ["https://evil.com/?q=imdb.com", false],
    ["https://www.imdb.com.evil.com/", false],
    ["https://user:pass@www.imdb.com/", false],
    ["https://www.google.com/search?q=x", false],
    ["javascript:alert(1)", false],
    ["no es url", false]
  ])("%s → %s", (url, expected) => {
    expect(isAllowedUrl(url)).toBe(expected);
  });

  it("identifica el sitio", () => {
    expect(siteName("https://www.imdb.com/x")).toBe("IMDB");
    expect(siteName("https://books.google.com/x")).toBe("Google Books");
  });
});

describe("MCP server de navegador", () => {
  it("abre URLs permitidas y rechaza las demás", async () => {
    const opener = vi.fn().mockResolvedValue(undefined);
    const client = await connectInMemory(createBrowserServer(opener), "t");

    const ok = await client.callTool({ name: "open_url", arguments: { url: "https://www.imdb.com/title/tt1/" } });
    expect(ok.isError).toBeFalsy();
    expect(opener).toHaveBeenCalledWith("https://www.imdb.com/title/tt1/");

    const bad = await client.callTool({ name: "open_url", arguments: { url: "https://phishing.com/login" } });
    expect(bad.isError).toBe(true);
    expect(opener).toHaveBeenCalledTimes(1);
    await client.close();
  });
});
