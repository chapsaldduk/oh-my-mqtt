# Build stage
FROM node:20-slim AS build

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN npx vite build

# Runtime stage
FROM node:20-slim

WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/server.js ./server.js

RUN echo '{"type":"module","dependencies":{"express":"^4","ws":"^8"}}' > package.json && npm install

EXPOSE 3000

CMD ["node", "server.js"]
