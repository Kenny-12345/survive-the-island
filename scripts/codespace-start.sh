#!/usr/bin/env bash
# Runs on every codespace start. The game server itself is started by the container (.devcontainer/boot.sh);
# this only makes port 3001 public again, because Codespaces resets it to private on each start.
[ -z "$WAKE_TOKEN" ] && exit 0
for i in $(seq 1 30); do
  GH_TOKEN="$WAKE_TOKEN" gh codespace ports visibility 3001:public -c "$CODESPACE_NAME" && exit 0
  sleep 4
done
