# FORCE V149 deployment structure

This repository keeps the historical FORCE source layout intact for local work and tests, while adding a production-facing split:

- `public/` - browser-visible static assets only.
- `src/index.js` - Cloudflare Worker entrypoint. Static requests go to Cloudflare Static Assets; `/api/*` goes to the FORCE Python container.
- `force_server.py` - Python API/backend. In public mode, administrative pressure writes are disabled and debug API routes are not public.
- `Dockerfile` - container image for the Python backend.
- `wrangler.jsonc` - Worker + Static Assets + Container configuration.
- `scripts/build_public.py` - regenerates `public/` from the canonical V149 frontend source files.

The FORCE model/application version remains V149.
