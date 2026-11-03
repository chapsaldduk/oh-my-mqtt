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
COPY --from=build /app/LICENSE ./LICENSE

COPY --from=build /app/package.json /tmp/src-package.json
RUN node -e 'const v=require("/tmp/src-package.json").version;require("fs").writeFileSync("package.json",JSON.stringify({version:v,type:"module",dependencies:{express:"^4",ws:"^8"}}))' \
  && rm /tmp/src-package.json && npm install

EXPOSE 3000

ENTRYPOINT ["node", "server.js"]
