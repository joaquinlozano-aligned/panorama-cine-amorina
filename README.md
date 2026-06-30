# Panorama del cine independiente porteño en Instagram

Dashboard de inteligencia competitiva para **Amorina**: compara seguidores, posts y estilo de comunicación de salas, cineclubs y cinebars de Buenos Aires.

**Live:** https://joaquinlozano-aligned.github.io/panorama-cine-amorina/

## Cómo funciona

```
accounts.json  →  scrape.mjs  →  data.json + history.json  →  index.html (dashboard)
   (editorial)     (Playwright)        (datos)                    (lo consume vía fetch)
```

- **`accounts.json`** — la lista de cuentas a relevar y sus textos editoriales (tipo, descripción, etc.). **Es lo único que editás a mano.**
- **`scrape.mjs`** — entra a cada perfil público de Instagram (sin login, solo metadata pública), saca seguidores/posts/sigue y escribe `data.json`. También va guardando un snapshot diario en `history.json` para ver el crecimiento en el tiempo.
- **`index.html`** — el dashboard; lee `data.json`. Si no está, usa un fallback embebido.
- **`.github/workflows/scrape.yml`** — corre el scraper **1× por día** (09:00 ART) y commitea los datos nuevos solos.

## Sumar o quitar cuentas

Editá `accounts.json` (agregá un objeto con `handle`, `name`, `cat`, `tag`, `comm`, `me`) y listo: el próximo run del scraper completa los números. Para correrlo en el momento: pestaña **Actions → Scrape diario → Run workflow**.

## Correr local

```bash
npm install
npx playwright install chromium
node scrape.mjs
```

## Límites

- Solo datos **públicos**. La lista de *quién sigue* a una cuenta está detrás del login y no se scrapea.
- Los conteos en miles (`25K`) son los que muestra Instagram; cuando el perfil expone el número exacto, el scraper lo prefiere (mejor para series temporales).
