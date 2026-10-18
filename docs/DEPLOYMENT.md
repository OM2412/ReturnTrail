# Same-origin deployment and local fallback

The production app image, real FalkorDB API behavior and database-volume retention across a database container restart were verified on a hosted Ubuntu amd64 runner on 17 October 2026. This is not a public deployment. Oracle account/VM provisioning, native ARM execution, Caddy/public TLS, real provider callbacks and target-host backup/restore still require acceptance checks.

For a card-free temporary public preview from a laptop, use [PUBLIC-DEMO.md](PUBLIC-DEMO.md). That route runs a separate local Docker stack and requires the laptop to stay awake and online; it is not an always-on hosted deployment.

For laptop-independent Vercel + Render deployment with external FalkorDB, see [VERCEL-RENDER.md](VERCEL-RENDER.md). Its free preview has different persistence, encryption and cold-start limits; review those before choosing it.

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

`.github/workflows/verify.yml` runs backend regression checks, frontend lint/tests/build and mocked browser contracts with read-only repository permissions; hosted runs have passed. The opt-in provider tests are separately documented and are not part of this default job.

`.github/workflows/deployment-check.yml` builds the actual production Dockerfile, starts the app and private FalkorDB through the production Compose source with an isolated loopback HTTP test override, runs the real source/workflow API invariants, then checks a graph marker after restarting the database container. Its [first hosted run passed](https://github.com/OM2412/ReturnTrail/actions/runs/39002103132) at commit `346227f81b42a588ed2e0b657a0f4c6aeab4ec1c`.

The pinned FalkorDB image manifest lists both `linux/amd64` and `linux/arm64`; the hosted execution was amd64. This does not claim that the full stack has already run on an Oracle ARM VM. The CI override uses HTTP/non-secure cookies only inside the isolated runner. Production Compose retains HTTPS public-origin settings and secure cookies. CI cleanup removes only its own temporary volumes; never run volume-deleting cleanup on a deployment whose data you need.

## No-hosting fallback

The event page prefers a live deployment, allowing a complete local setup and a working demo video when deployment is unavailable. Prepare a clean-checkout walkthrough, keep the graph/model configuration available locally and record the actual tested flow. Verify the final submission form's requirements.

https://www.wemakedevs.org/hackathons/falkordb

## Free VM account setup

Oracle Always Free is an optional VM route, subject to signup verification and regional capacity. Create the account at https://signup.cloud.oracle.com/ and select the home region carefully: Always Free compute must be provisioned in that region, and the home region cannot be changed after signup. Do not upgrade to Pay As You Go or create resources outside the Always Free allowances for this route.

Oracle may require a mobile number and supported card for identity verification; a temporary authorization hold may appear. Enter verification details only on Oracle's site. Account/VM provisioning has not been performed by this project. After account activation, check the actual Always Free label, remaining account allowance and estimated charge before creating a VM. The selected image architecture, storage, ingress and final public hostname must then be verified on the target host.

Official references: [Free Tier](https://docs.oracle.com/iaas/Content/FreeTier/freetier.htm), [Always Free resources and capacity](https://docs.oracle.com/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm), [signup steps](https://docs.oracle.com/en-us/iaas/Content/GSG/Tasks/signingup_topic-Sign_Up_for_Free_Oracle_Cloud_Promotion.htm).
