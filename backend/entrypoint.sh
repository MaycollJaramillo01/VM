#!/bin/sh
set -e

npx prisma migrate deploy
npx prisma generate

pm2-runtime start ecosystem.config.cjs
