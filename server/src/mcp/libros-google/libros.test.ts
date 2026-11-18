import { describe, expect, it } from "vitest";
import { connectInMemory } from "../../agentes/herramientasMcp.js";
import { BOOKS_ROUTES, fakeFetch } from "../../utilidadesDePrueba/dobles.js";
import { GoogleBooksApi } from "./clienteApiGoogleBooks.js";
import { createBooksServer } from "./servidorMcpLibros.js";

describe("GoogleBooksApi", () => {
  it("busca libros, usa https y genera el link a Google Books", async () => {
    const f = fakeFetch(BOOKS_ROUTES);
    const api = new GoogleBooksApi("key", f);
    const res = await api.searchBooks("dune", "herbert");
    expect(res[0]).toMatchObject({
      title: "Dune",
      authors: ["Frank Herbert"],
      thumbnail: "https://books.google.com/img.jpg",
      infoUrl: "https://books.google.com/books?id=abc"
    });
    expect(decodeURIComponent(f.urls[0])).toContain("intitle:dune+inauthor:herbert");
    expect(f.urls[0]).toContain("key=key");
  });

  it("funciona sin API key y sin resultados", async () => {
    const f = fakeFetch({ "volumes?": {} });
    const api = new GoogleBooksApi(undefined, f);
    expect(await api.searchBooks("nada")).toEqual([]);
    expect(f.urls[0]).not.toContain("key=");
  });

  it("obtiene detalle y limpia HTML de la descripción", async () => {
    const api = new GoogleBooksApi(undefined, fakeFetch(BOOKS_ROUTES));
    const book = await api.getBook("abc");
    expect(book.description).toBe("Épica");
    expect(book.thumbnail).toBeNull();
  });

  it("rellena valores por defecto", async () => {
    const api = new GoogleBooksApi(undefined, fakeFetch({ "volumes/z": { id: "z", volumeInfo: {} } }));
    expect(await api.getBook("z")).toMatchObject({ title: "Sin título", authors: [], rating: null, pageCount: null });
  });
});

describe("MCP server de libros", () => {
  it("expone search_books y get_book_details", async () => {
    const client = await connectInMemory(createBooksServer(new GoogleBooksApi(undefined, fakeFetch(BOOKS_ROUTES))), "t");
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["get_book_details", "search_books"]);
    const res = await client.callTool({ name: "search_books", arguments: { query: "dune" } });
    expect(JSON.stringify(res.content)).toContain("Frank Herbert");
    const det = await client.callTool({ name: "get_book_details", arguments: { book_id: "abc" } });
    expect(det.isError).toBeFalsy();
    await client.close();
  });
});
