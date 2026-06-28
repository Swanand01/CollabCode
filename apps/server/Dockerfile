FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/
COPY apps/client/package.json apps/client/

RUN npm ci

COPY apps/server/src ./apps/server/src
COPY apps/server/tsconfig.json ./apps/server/

EXPOSE 3000 1234

CMD ["node_modules/.bin/tsx", "apps/server/src/index.ts"]
