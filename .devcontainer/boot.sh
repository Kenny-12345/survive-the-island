#!/usr/bin/env bash
# Container main process: keep the game server running forever (restart if it ever exits).
APP=/workspaces/survive-the-island
while true; do
  if [ -d "$APP/node_modules/tsx" ]; then
    cd "$APP" && su node -c "PORT=${PORT:-3001} CORS_ORIGINS='$CORS_ORIGINS' npx tsx server/index.ts" >> /tmp/server.log 2>&1
    echo "[boot] server exited, restarting" >> /tmp/server.log
  fi
  sleep 3
done
