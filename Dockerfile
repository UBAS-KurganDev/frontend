# syntax=docker/dockerfile:1
FROM node:22-alpine AS builder

ENV NODE_ENV=development
WORKDIR /app

COPY package.json package-lock.json ./
COPY scripts ./scripts
RUN npm ci

COPY . .
ARG VITE_API_URL=
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM nginx:1.28-alpine AS runtime

COPY deployment/container-nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
COPY compose.yaml /opt/ubas-frontend-deployment/compose.yaml
COPY scripts/deploy-production.sh /opt/ubas-frontend-deployment/deploy-production.sh
COPY scripts/poll-production.sh /opt/ubas-frontend-deployment/poll-production.sh

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --retries=12 --start-period=5s \
  CMD wget --quiet --output-document=/dev/null http://127.0.0.1:8080/index.html || exit 1
