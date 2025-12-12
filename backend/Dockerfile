FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm install

COPY backend/. .
COPY prisma ./prisma
COPY ecosystem.config.cjs ./ecosystem.config.cjs

RUN npm install -g pm2 \
  && npx prisma generate

COPY backend/entrypoint.sh ./entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 4000

CMD ["/app/entrypoint.sh"]
