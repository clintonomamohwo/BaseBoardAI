# AI generation access controls

AI/image generation endpoints are protected by the request guard in `main.py`. It applies the configured request-per-minute and request-per-day quotas before an endpoint can call an AI provider. Defaults are 5 requests/minute and 100/day per principal, with a maximum of 60 rendered frames in one pipeline request and 12 in a scene-style batch. Premium frame rendering is disabled unless `ENABLE_PREMIUM_IMAGE_GENERATION=true`.

For production, set `APP_ENV=production`, keep `GENERATION_ENABLED=true` only when ready, and configure `GENERATION_API_TOKEN` on the server. Protected generation requests must include `Authorization: Bearer <token>`. Do not put this credential in a browser bundle or public client. The default production behavior fails closed when the token is missing. The token is a shared service credential, not user-account authentication; a public multi-user launch needs user-scoped authorization and per-user quotas, normally through a trusted server-side API layer.

The built-in quota ledger is process-local. Run one API worker when relying on it. Before using multiple workers or replicas, move the same rate/day limits to a shared store such as Redis or the production database. Use HTTPS and trusted proxy configuration in production. The development default remains local-friendly and rate-limited by client IP.
