FROM node:26-bookworm-slim@sha256:5df79989ed685e09f0a98019db4cebfb22fb9df1a53c0161664a011f7ff6b0f1

WORKDIR /app
ENV NODE_ENV=production
# No third-party dependencies: no install step or npm lifecycle scripts needed.
COPY --chown=root:root package.json ./
COPY --chown=root:root src/ ./src/
USER 1000:1000
EXPOSE 3000
CMD ["node", "src/server.js"]
