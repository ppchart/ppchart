# PPChart Server

Koa API service for PPChart.

## Setup

```bash
cp .env.example .env
yarn
npx prisma generate
yarn start
```

The service listens on port `7777` by default.

## Docker

```bash
docker compose up -d --build
```

## Environment

Configure MySQL, Redis, and CIAM settings in `.env`. Real environment files are ignored by Git.

## OAuth Login

PPChart supports GitHub and Google OAuth login. Configure these variables:

```bash
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=https://api.ppmark.cn/chart/api/oauth/github/callback

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://api.ppmark.cn/chart/api/oauth/google/callback
```

After changing `prisma/schema.prisma`, apply the schema to MySQL and regenerate the Prisma client:

```bash
npx prisma db push
npx prisma generate
```
