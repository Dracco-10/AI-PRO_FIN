import { describe, expect, it } from "vitest";
import { connectInMemory } from "../../agentes/herramientasMcp.js";
import { fakeFetch, TMDB_ROUTES } from "../../utilidadesDePrueba/dobles.js";
import { posterUrl, TmdbApi } from "./clienteApiTmdb.js";
import { createTmdbServer } from "./servidorMcpPeliculas.js";

describe("TmdbApi", () => {
  it("busca películas con token Bearer y arma la URL del póster", async () => {
    const f = fakeFetch(TMDB_ROUTES);
    const api = new TmdbApi("tok", f);
    const res = await api.searchMovies("dune", 2021);
    expect(res[0]).toMatchObject({ id: 1, title: "Dune", posterUrl: "https://image.tmdb.org/t/p/w500/dune.jpg" });
    expect(f.urls[0]).toContain("query=dune");
    expect(f.urls[0]).toContain("year=2021");
    expect(f.urls[0]).toContain("language=es-MX");
  });

  it("obtiene detalles con link a IMDB y detecta si está basada en un libro", async () => {
    const api = new TmdbApi("tok", fakeFetch(TMDB_ROUTES));
    const d = await api.getMovieDetails(1);
    expect(d.imdbUrl).toBe("https://www.imdb.com/title/tt1160419/");
    expect(d.basedOnBook).toBe(true);
    expect(d.genres).toEqual(["Ciencia ficción"]);
  });

  it("maneja campos faltantes en detalles", async () => {
    const api = new TmdbApi("tok", fakeFetch({ "/movie/9": { id: 9, title: "X" } }));
    const d = await api.getMovieDetails(9);
    expect(d).toMatchObject({ imdbUrl: null, basedOnBook: false, runtime: null, genres: [], posterUrl: null, rating: 0 });
  });

  it("recomienda por género, por similitud y por libros", async () => {
    const f = fakeFetch(TMDB_ROUTES);
    const api = new TmdbApi("tok", f);
    expect((await api.recommendMovies({ genre: "terror" }))[0].title).toBe("El Conjuro");
    expect(f.urls.at(-1)).toContain("with_genres=27");
    expect((await api.recommendMovies({ similarToMovieId: 1 }))[0].title).toBe("Dune: Parte Dos");
    await api.recommendMovies({ basedOnBook: true });
    expect(f.urls.at(-1)).toContain("with_keywords=818");
    expect(await api.findGenreId("western")).toBeUndefined();
  });

  it("lanza error si TMDB responde con error", async () => {
    const api = new TmdbApi("tok", fakeFetch(TMDB_ROUTES, 401));
    await expect(api.searchMovies("x")).rejects.toThrow("HTTP 401");
  });

  it("posterUrl devuelve null sin ruta", () => {
    expect(posterUrl(null)).toBeNull();
  });
});

describe("MCP server de TMDB", () => {
  it("expone las 3 tools y responde por protocolo MCP", async () => {
    const client = await connectInMemory(createTmdbServer(new TmdbApi("tok", fakeFetch(TMDB_ROUTES))), "test");
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["get_movie_details", "recommend_movies", "search_movies"]);

    const search = await client.callTool({ name: "search_movies", arguments: { query: "dune" } });
    expect(JSON.stringify(search.content)).toContain("Dune");
    const details = await client.callTool({ name: "get_movie_details", arguments: { movie_id: 1 } });
    expect(JSON.stringify(details.content)).toContain("tt1160419");
    const rec = await client.callTool({ name: "recommend_movies", arguments: { genre: "comedia", based_on_book: false } });
    expect(rec.isError).toBeFalsy();
    await client.close();
  });

  it("devuelve isError cuando la API falla", async () => {
    const client = await connectInMemory(createTmdbServer(new TmdbApi("tok", fakeFetch({}))), "test");
    const res = await client.callTool({ name: "search_movies", arguments: { query: "x" } });
    expect(res.isError).toBe(true);
    await client.close();
  });
});
