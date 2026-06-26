# === Stage 1: Build del frontend ===
FROM node:22-alpine AS build
WORKDIR /app
COPY frontend-quizzettone/ ./
RUN npm install && npm run build

# === Stage 2: Immagine finale ===
FROM nginx:alpine

# Copia la configurazione di nginx (con proxy WebSocket)
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copia il frontend compilato
COPY --from=build /app/dist /usr/share/nginx/html

# Installa Node.js e prepara il backend
COPY backend-quizzettone/package.json /app/backend/
RUN apk add --no-cache nodejs npm \
    && cd /app/backend && npm install --omit=dev
COPY backend-quizzettone/server.js /app/backend/server.js

# Copia lo script di avvio
COPY docker/start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 8080

CMD ["/start.sh"]