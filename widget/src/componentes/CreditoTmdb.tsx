// TMDB pide esta atribución en sus términos.
// logo: https://www.themoviedb.org/about/logos-attribution -> widget/public/tmdb-logo.svg
export function CreditoTmdb() {
  return (
    <footer className="agichat-attribution">
      <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">
        <img src="/tmdb-logo.svg" alt="TMDB" height={12} />
      </a>
      <span>This product uses the TMDB API but is not endorsed or certified by TMDB.</span>
    </footer>
  );
}
