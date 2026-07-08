#!/bin/sh
set -eu

mkdir -p /app/data/db /app/data/logs
chown -R nextjs:nodejs /app/data

exec su -s /bin/sh nextjs -c 'exec node server.js'
