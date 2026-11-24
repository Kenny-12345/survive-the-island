#!/usr/bin/env bash
# Build the client for the codespace server and deploy it plus the wake function to Vercel.
set -e
cd "$(dirname "$0")/.."
SERVER=https://survive-island-jrgppjvw79gw2vjw-3001.app.github.dev
VITE_SERVER_URL=$SERVER npm run build
OUT=deploy/vercel
find "$OUT" -mindepth 1 -maxdepth 1 ! -name api ! -name .vercel -exec rm -rf {} +
cp -r client/dist/. "$OUT/"
cd "$OUT" && npx -y vercel@latest deploy --prod --yes --name survive-the-island
