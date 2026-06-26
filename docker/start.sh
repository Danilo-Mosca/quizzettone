#!/bin/sh
node /app/backend/server.js &
nginx -g "daemon off;"
