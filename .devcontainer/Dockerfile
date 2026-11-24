FROM mcr.microsoft.com/devcontainers/javascript-node:22
COPY boot.sh /usr/local/bin/island-boot
RUN chmod +x /usr/local/bin/island-boot
# The game server is the container's main process, so nothing can reap it after start-up hooks finish.
CMD ["/usr/local/bin/island-boot"]
