# vocab-backend

A personal tool for actually retaining Japanese vocabulary instead of letting it evaporate after you
look it up once. You save words as you encounter them (with readings, definitions, tags, priority),
and the app tracks which ones are "due" — neglected for a while, or under-used relative to a target.
From there it generates a short writing prompt built specifically to require those due words, either
via a live AI call, a copy-paste template for any external chat, or just writing your own. You reply
in Japanese, save it, and the cycle repeats — so vocabulary you looked up actually gets reused instead
of sitting in a list you never revisit.

This was vibecoded — built quickly with AI assistance rather than by hand — on purpose: the goal was
to spend time actually learning Japanese, not building a study app. If you're using this, run into
bugs, have ideas, or have done something interesting with it, reach out on Discord: **terriblethingz**.

## Local development

Two servers, run side by side:

```
npm run dev                 # backend on :4000 (uses .env)
cd frontend && npm run dev  # frontend on :5173, proxies /api and /uploads to :4000
```

## Self-hosted deploy (Docker)

Everything — frontend build, backend, MongoDB — runs via `docker-compose.yml`. The `app` service builds
the React frontend and serves it directly from the Express server (one image, one port, no CORS to
configure); `mongo` is a bundled MongoDB with a persistent volume.

1. Copy `.env.docker` and fill in whatever you want set (`APP_PASSWORD`, `ANTHROPIC_API_KEY`, etc.) —
   `MONGODB_URI` is already pointed at the bundled `mongo` service and shouldn't need to change.
2. From this directory (e.g. over SSH on the TrueNAS box, or via a TrueNAS Custom App pointed at this
   compose file):
   ```
   docker compose up -d --build
   ```
3. The app is then available at `http://<host>:4000`. `/api/health` is unauthenticated and suitable for
   a healthcheck/monitor.

Uploaded images are bind-mounted at `./uploads` — they persist across `docker compose restart`/rebuilds.
To pull in a newer version of the code, re-run `docker compose up -d --build`.
