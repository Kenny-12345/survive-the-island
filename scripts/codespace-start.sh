#!/usr/bin/env bash
# Runs on every codespace start: launch the game server, then make its port public so players can
# reach it. Port visibility resets to private on each start, so it has to be reapplied here.
cd /workspaces/survive-the-island
curl -s localhost:3001/healthz >/dev/null || setsid nohup npm start > /tmp/server.log 2>&1 < /dev/null &
if [ -n "$WAKE_TOKEN" ]; then
  ( for i in $(seq 1 30); do
      GH_TOKEN="$WAKE_TOKEN" gh codespace ports visibility 3001:public -c "$CODESPACE_NAME" >/tmp/port.log 2>&1 && exit 0
      sleep 4
    done ) < /dev/null > /dev/null 2>&1 &
  disown
fi
