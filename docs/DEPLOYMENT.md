# Deployment: current preview and alternatives

## Current public preview

**Live:** https://returntrail-api.onrender.com  
**Readiness:** https://returntrail-api.onrender.com/actuator/health/readiness

| Component | Current deployment |
| --- | --- |
| Frontend and API | One Render Docker web service; the root `Dockerfile` embeds React into the Spring JAR. |
| Graph | External FalkorDB Cloud Free; FalkorDB remains the primary database. |
| Access | Synthetic guest workspaces; Google/GitHub sign-in disabled. |
| Host dependency | Runs independently of a local laptop. |
| Verification | [Public checks — 18 October 2026](PUBLIC-VALIDATION.md): five API workflow groups and one real four-tool AI investigation. |

Render Free can sleep after 15 minutes without incoming traffic; waking can take about a minute. Backend restarts invalidate in-memory sessions. FalkorDB Free has no TLS, persistence or backups and can stop/delete inactive instances. Database credentials travel without transport encryption on that tier. Use fictional records only and export the brief; this preview does not offer durable saved accounts.

### Reproduce this hosting shape

1. Create a dedicated external FalkorDB instance. Copy the database host, connection port, username and password from its console. Use host only, without a URI scheme, quotes, whitespace or a port suffix.
2. Create a Render Docker web service from this repository, branch `main`, repository root, **Dockerfile path `Dockerfile`**. This is the combined image. The separate `deploy/Render.Dockerfile` and `render.yaml` belong to the backend-only Vercel alternative.
3. Add the database/runtime settings below in Render. Keep credentials out of Git and frontend variables.
4. Set the health check path to `/actuator/health/readiness`. The image listens on `0.0.0.0` and uses Render's supplied `PORT`.
5. Deploy, wait for readiness UP, then test guest entry, source comparison, task/reply history and brief export on the public origin.

| Setting | Value |
| --- | --- |
| `FALKORDB_HOST`, `FALKORDB_PORT` | Exact database connection endpoint from the console |
| `FALKORDB_USERNAME`, `FALKORDB_PASSWORD` | Exact issued credentials; the current instance uses username `falkordb`, not an assumed default |
| `FALKORDB_SSL` | `false` for the non-TLS Free endpoint; `true` only with a TLS-enabled endpoint |
| `RETURNTRAIL_PUBLIC_URL` | `https://returntrail-api.onrender.com` for this deployment; use your own final HTTPS origin for another service |
| `SESSION_COOKIE_SECURE` | `true` |
| `GOOGLE_LOGIN_ENABLED`, `GITHUB_LOGIN_ENABLED` | `false` on this non-durable guest preview |
| `GROQ_API_KEY` | Backend-only model key if enabling AI investigation |
| `PUBLIC_SITE_URL` | Public HTTPS origin, consumed by the combined Docker build for SEO/share metadata |

A responding homepage alone does not establish graph or model availability. Readiness tests the graph; an actual AI investigation is a separate check. See [PUBLIC-VALIDATION.md](PUBLIC-VALIDATION.md) for the observed scope.

### Monitoring

The operator configured three UptimeRobot monitors and confirmed that one targets the readiness URL above. The 18 October dashboard showed all three UP at five-minute intervals. This is an observed status, not an uptime guarantee; alert delivery and a public status-page URL were not independently checked. Monitoring does not add database persistence, TLS or backups.

## Choose an alternative

| Shape | Guide | Boundary |
| --- | --- | --- |
| Vercel frontend + Render API | [VERCEL-RENDER.md](VERCEL-RENDER.md) | Separate backend-only image; not required for the current combined preview. |
| Temporary laptop HTTPS preview | [PUBLIC-DEMO.md](PUBLIC-DEMO.md) | Separate local Docker stack; laptop must stay awake and online. |
| Private persistent graph + Caddy HTTPS | Instructions below | Requires a host, actual target-host TLS/backup acceptance and one backend replica. |

## Private Docker production route

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

## SEO and sharing

The combined root `Dockerfile` accepts `PUBLIC_SITE_URL` as a build argument and passes it to Vite as `VITE_PUBLIC_URL`. Configure the final public origin **before rebuilding the image**. Changing only the runtime `RETURNTRAIL_PUBLIC_URL` does not regenerate built HTML.

A frontend build with `VITE_PUBLIC_URL=https://your-host` emits a public-only sitemap, canonical homepage URL and absolute sharing image URL. Private app routes are noindex both in the production SPA fallback response and client navigation. Noindex/robots rules are not an authorization mechanism.

```powershell
$env:VITE_PUBLIC_URL = "https://your-host"
npm.cmd run build
Remove-Item Env:VITE_PUBLIC_URL
```

Verify the rebuilt homepage source contains the correct canonical and Open Graph image, and `/sitemap.xml` returns the public URL set. The initial 18 October public check found those tags absent and the sitemap returned 404. After configuring `PUBLIC_SITE_URL=https://returntrail-api.onrender.com` and rebuilding, the homepage metadata, sharing PNG, robots sitemap declaration and four-page XML sitemap passed the live check; see [the validation record](PUBLIC-VALIDATION.md). Keep the origin setting when rebuilding this deployment.

An unset origin omits canonical/sitemap claims rather than inventing a localhost production URL. Public HTML guides work without React. There is no guarantee of indexing, first rank or rich results.

## CI

`.github/workflows/verify.yml` runs backend regression checks, frontend lint/tests/build and mocked browser contracts with read-only repository permissions; hosted runs have passed. The opt-in provider tests are separately documented and are not part of this default job.

`.github/workflows/deployment-check.yml` builds the actual production Dockerfile, starts the app and private FalkorDB through the production Compose source with an isolated loopback HTTP test override, runs the real source/workflow API invariants, then checks a graph marker after restarting the database container. Its [first hosted run passed](https://github.com/OM2412/ReturnTrail/actions/runs/39002103132) at commit `346227f81b42a588ed2e0b657a0f4c6aeab4ec1c`.

The pinned FalkorDB image manifest lists both `linux/amd64` and `linux/arm64`; the hosted execution was amd64. This does not claim that the full stack has already run on an Oracle ARM VM. The CI override uses HTTP/non-secure cookies only inside the isolated runner. Production Compose retains HTTPS public-origin settings and secure cookies. CI cleanup removes only its own temporary volumes; never run volume-deleting cleanup on a deployment whose data you need.

## No-hosting fallback

The event rules require a working demo video and either a live deployment or complete local setup instructions. Prepare a clean-checkout walkthrough, keep the graph/model configuration available locally and record the actual tested flow. Verify the final submission form's requirements.

https://www.wemakedevs.org/hackathons/falkordb

## Optional VM route

Oracle Always Free is an optional VM route, subject to signup verification and regional capacity. Create the account at https://signup.cloud.oracle.com/ and select the home region carefully: Always Free compute must be provisioned in that region, and the home region cannot be changed after signup. Do not upgrade to Pay As You Go or create resources outside the Always Free allowances for this route.

Oracle may require a mobile number and supported card for identity verification; a temporary authorization hold may appear. Enter verification details only on Oracle's site. Account/VM provisioning has not been performed by this project. After account activation, check the actual Always Free label, remaining account allowance and estimated charge before creating a VM. The selected image architecture, storage, ingress and final public hostname must then be verified on the target host.

Official references: [Free Tier](https://docs.oracle.com/iaas/Content/FreeTier/freetier.htm), [Always Free resources and capacity](https://docs.oracle.com/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm), [signup steps](https://docs.oracle.com/en-us/iaas/Content/GSG/Tasks/signingup_topic-Sign_Up_for_Free_Oracle_Cloud_Promotion.htm).
