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
- **`.github/workflows/scrape.yml`** — disparo manual del scraper desde la pestaña **Actions**. El cron diario viene **desactivado** (ver abajo).

## ⚠️ Importante: Instagram bloquea las IP de datacenter

Desde un runner de GitHub Actions, Instagram devuelve el muro de login y el scraper no obtiene nada (por eso el cron está comentado). Hay **dos formas** de tener actualización automática:

### Opción A — Correr local (recomendado, gratis, sin riesgo)
Tu IP residencial no está bloqueada. Corré `./run-local.sh`: scrapea y pushea solo (Pages se actualiza). Para que sea diario en macOS, programalo con **launchd**:

```bash
# crea ~/Library/LaunchAgents/com.amorina.panorama.plist apuntando a run-local.sh
# con <StartCalendarInterval> (p. ej. Hour 9) y luego:
launchctl load ~/Library/LaunchAgents/com.amorina.panorama.plist
```

### Opción B — Cookie de sesión en CI (funciona, pero con riesgo de TOS)
Cargá el secret `IG_SESSIONID` (Settings → Secrets and variables → Actions) con la cookie `sessionid` de una cuenta de Instagram (idealmente secundaria/quemada), y reactivá el `schedule` en `scrape.yml`. El scraper la usa para destrabar el acceso. Riesgo: Instagram puede marcar/banear esa cuenta.

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
