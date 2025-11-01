FROM node:18-alpine
RUN corepack enable pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/*/package.json ./packages/*/

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build --filter=@ai-content-coach/api

WORKDIR /app/apps/api

EXPOSE 8000

CMD ["pnpm", "start"]