FROM node:24-bookworm-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54

WORKDIR /app
ENV NODE_ENV=production
# No third-party dependencies: no install step or npm lifecycle scripts needed.
COPY --chown=root:root package.json ./
COPY --chown=root:root src/ ./src/
USER 1000:1000
EXPOSE 3000
CMD ["node", "src/server.js"]
