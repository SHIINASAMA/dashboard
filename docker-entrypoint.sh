#!/bin/sh
set -eu

mkdir -p /app/data/db /app/data/logs
chown -R dashboard:nodejs /app/data

exec su -s /bin/sh dashboard -c 'exec node /app/server/index.mjs'
