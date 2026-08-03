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
