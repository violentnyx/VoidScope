FROM node:22-alpine

RUN apk upgrade --no-cache \
  && apk add --no-cache bash build-base python3 py3-pip squid

WORKDIR /app
COPY --chown=node:node app/ ./

RUN npm ci \
  && npm prune --omit=dev \
  && npm cache clean --force \
  && chmod +x start.sh \
  && mkdir -p logs .tmp \
  && chown -R node:node logs .tmp

USER node

VOLUME ["/app/data"]
EXPOSE 1337

HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=6 \
  CMD ["node", "healthcheck.js"]

CMD ["./start.sh"]
