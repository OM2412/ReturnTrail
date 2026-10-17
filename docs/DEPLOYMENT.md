# Same-origin deployment and local fallback

This update prepares deployment source. It does not buy hosting/domain names or deploy anything. Docker/Caddy execution and public TLS were not run in this workspace because no Docker daemon or hosting credentials were available. The equivalent built frontend + Spring production JAR is tested locally; that is a narrower guarantee.

## Supported shape

One Java backend serves the production frontend and API. FalkorDB stays on a private container network with a persistent volume; Caddy terminates HTTPS and compresses responses. Never expose an unauthenticated graph/database browser directly to the internet. Current sessions/lifecycle/budgets are local, so run **one backend replica**.

The supplied production compose file is independent of the local compose file. It uses its own named graph volume and does not migrate local Docker data. Existing local saved accounts will not appear in a new deployment unless their data is intentionally backed up/migrated. Do not use `docker compose down -v` on a volume that contains data you need.

## On a host you control

1. Point a real hostname at the host and allow the required HTTP/HTTPS ingress.
2. Copy `.env.example` to `.env`, set `PUBLIC_HOST` (hostname only) and optional provider secrets. Keep `.env` private and out of Git.
3. Register `https://YOUR_HOST/login/oauth2/code/google` as the exact Google callback. Restrict test/public audience according to the actual provider setup.
4. Review Docker/volume configuration, then build/run:

```powershell
docker compose -f compose.production.yaml up -d --build
```

`Dockerfile` embeds the built frontend in the Spring JAR, runs Java as a non-root UID and receives secrets only at runtime. Build-time `PUBLIC_SITE_URL` affects public metadata/sitemap, not authentication credentials. Do not bake secrets into build arguments.

The base runtime/tooling tags in this source are version-family tags; verify/pin appropriate image digests after the first successful host build for reproducible production releases. The FalkorDB digest is already pinned to the tested build. No claim is made that every newest upstream image has been validated here.

## Verify on the real host

- Homepage, How it works, privacy and image assets return 200 over HTTPS.
- Refresh `/case/CASE-001/context` without a session: the UI shell can load, but APIs deny case data until a valid guest/account session exists.
- `/actuator/health/readiness` reflects responding FalkorDB. `/actuator/health/liveness` reflects process liveness. These do not test Groq/Google availability or restart a container automatically.
- Google login, cancelled login, POST logout and re-login work on the exact public origin.
- Guest and two-account isolation work; saved tasks survive an app restart and a database restart with the volume retained.
- Hashed `/assets/` files use immutable cache headers; HTML and authenticated API responses are not treated as immutable.
- Back up graph data using a tested consistent backup method and perform a restore drill in a separate instance. A named volume alone is not a backup.
- A real Groq investigation returns the actual trace. A rule review remains explicitly labeled when no AI key is configured.
- Inspect actual logs for failures without publishing secrets or provider callback codes.

## SEO/share source

A production build with `VITE_PUBLIC_URL=https://your-host` emits a public-only sitemap, canonical homepage URL and absolute sharing image URL. Private app routes are noindex both in the production SPA fallback response and client navigation. Noindex/robots rules are not an authorization mechanism.

```powershell
$env:VITE_PUBLIC_URL = "https://your-host"
npm.cmd run build
Remove-Item Env:VITE_PUBLIC_URL
```

An unset origin omits canonical/sitemap claims rather than inventing a localhost production URL. Public HTML guides work without React. There is no guarantee of indexing, first rank or rich results.

## CI

`.github/workflows/verify.yml` runs backend regression checks, frontend lint/tests/build and mocked browser contracts on pushes/PRs. It uses read-only repository permissions. Source presence/YAML parsing are not a successful hosted run; verify its first GitHub Actions result after the user commits/pushes. The opt-in database/OIDC tests are separately documented and are not silently claimed as part of the default hosted job.

## No-hosting fallback

The event page prefers a live deployment, allowing a complete local setup and a working demo video when deployment is unavailable. Prepare a clean-checkout walkthrough, keep the graph/model configuration available locally and record the actual tested flow. Verify the final submission form's requirements.

https://www.wemakedevs.org/hackathons/falkordb
