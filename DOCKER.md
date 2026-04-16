# Docker setup

This project supports both development and production containers.

## Prerequisites

- Docker Desktop (or Docker Engine + Compose plugin)

## Development container (hot reload)

Run:

```bash
docker compose up frontend-dev --build
```

Then open:

- http://localhost:8080

Notes:

- Source code is bind-mounted into the container.
- `node_modules` stays inside the container via a named anonymous volume.
- Polling is enabled to make file watching reliable across host environments.

Stop:

```bash
docker compose down
```

## Production container (static build + Nginx)

Run:

```bash
docker compose up frontend-prod --build
```

Then open:

- http://localhost:4173

This uses:

- Multi-stage build (`node:20-alpine` -> `nginx:alpine`)
- SPA fallback routing (`try_files ... /index.html`) in `nginx.conf`

## Environment variables

For Vite frontend env vars:

- Only variables prefixed with `VITE_` are exposed to client code.
- They are baked in at build time for production images (`npm run build`).

Examples:

- For dev container: use `.env` in repo root.
- For prod image: pass build-time args or bake `.env.production` values before build.
