#!/usr/bin/env bash
# Corre el scraper desde tu máquina (IP residencial → Instagram no bloquea) y
# pushea los datos nuevos al repo, lo que actualiza el dashboard en GitHub Pages.
#
# Para automatizarlo 1x/día en macOS, programalo con launchd (ver README) apuntando
# a este script. Uso manual:  ./run-local.sh
set -euo pipefail
cd "$(dirname "$0")"

command -v node >/dev/null || { echo "Falta Node.js"; exit 1; }
[ -d node_modules ] || npm install
npx playwright install chromium >/dev/null 2>&1 || true

node scrape.mjs

if ! git diff --quiet data.json history.json; then
  git add data.json history.json
  git commit -m "Datos: snapshot $(date +%Y-%m-%d) (local)"
  git push
  echo "Datos actualizados y pusheados."
else
  echo "Sin cambios en los datos."
fi
