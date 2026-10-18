# Vercel + Render + external FalkorDB

This route runs independently of your laptop. Vercel serves the frontend; a single
Render Docker web service serves the API; FalkorDB remains the primary graph
database. Supabase Postgres and Render Key Value are not FalkorDB replacements.

## Free preview limits

Use fictional data and guest workspaces with this free preview. The FalkorDB
Free tier has 100 MB, no TLS, no persistence and no backups. Its documented terms
stop an unused instance after one day and delete it after seven inactive days.
Database credentials also travel without transport encryption on this tier.
Keep Google/GitHub sign-in disabled. Saved work is not durable on this deployment;
export a case brief before leaving. A persistent, TLS-enabled database is required
before offering saved accounts or real customer records.

Render Free sleeps after 15 minutes of inactivity and the next request takes
about a minute to wake it. Memory sessions disappear on restart; start a fresh
guest desk after a backend restart. All free web services in one Render workspace
share 750 hours/month. A monitor does not add durability, TLS or guaranteed uptime.

## 1. Create external FalkorDB

At <https://app.falkordb.cloud/signup>, select Free and create an instance.
Use an instance dedicated to ReturnTrail. Keep its username and password private.
Copy the database host and database port, not its browser dashboard URL.
Do not import personal records. The app seeds synthetic cases into each new guest
graph; no manual import into a shared production graph is necessary.

## 2. Deploy the backend on Render

Create **New > Web Service**, connect `OM2412/ReturnTrail`, branch `main`:

| Setting | Value |
| --- | --- |
| Language/runtime | Docker |
| Root directory | Leave empty (repository root) |
| Dockerfile path | `deploy/Render.Dockerfile` |
| Docker context | Repository root (`.`) |
| Instance | Free |
| Health check | `/actuator/health/readiness` |

Alternatively use the repository's `render.yaml` Blueprint, reviewing its Free
plan and environment values before creating resources.

Add these variables **in Render**, never in a frontend environment or Git:

| Variable | Value |
| --- | --- |
| `FALKORDB_HOST` | Database host only |
| `FALKORDB_PORT` | Database connection port |
| `FALKORDB_USERNAME` | Username from the cloud console (often `default`) |
| `FALKORDB_PASSWORD` | Database password, exactly as issued |
| `FALKORDB_SSL` | `false` for the non-TLS Free endpoint; `true` for a TLS endpoint |
| `SESSION_COOKIE_SECURE` | `true` |
| `GOOGLE_LOGIN_ENABLED` | `false` |
| `GITHUB_LOGIN_ENABLED` | `false` |
| `GROQ_API_KEY` | Your model key, if enabling AI investigation |
| `RETURNTRAIL_PUBLIC_URL` | Final Vercel HTTPS origin; temporary `https://not-yet-configured.invalid` during the initial guest-only setup |

Render supplies `PORT`; the image uses it at runtime. The backend-only image does
not build or include the frontend. Never paste a Redis URI into the host field.
Do not wrap environment values in quote characters in the Render dashboard.
After deployment, wait until `https://YOUR-SERVICE.onrender.com/actuator/health/readiness`
returns `{"status":"UP"}`. Copy the public Render origin.

## 3. Generate public proxy routing and deploy Vercel

From Windows PowerShell at the project root:

```powershell
git pull --ff-only origin main
if ($LASTEXITCODE -ne 0) { throw "Git pull stopped. Review the output." }
node .\deploy\configure-vercel.mjs https://YOUR-SERVICE.onrender.com
if ($LASTEXITCODE -ne 0) { throw "Routing was not configured." }
git diff -- frontend/vercel.json
```

Replace `YOUR-SERVICE` with the actual Render service name. This creates only
`frontend/vercel.json`, containing a public backend URL, no credentials.
Commit and push this reviewed routing file so Vercel's Git deployment sees it:

```powershell
git add -- frontend/vercel.json
git commit -m "chore(deploy): route frontend requests to the hosted API"
if ($LASTEXITCODE -ne 0) { throw "Commit stopped. Review the output." }
git push origin main
if ($LASTEXITCODE -ne 0) { throw "Push stopped. Review the output." }
```

In Vercel, import the repo. Choose **Root Directory `frontend`**, Vite,
Node 24, build `npm run build`, output `dist`, install `npm ci`.
The generated routing forwards `/api`, `/oauth2`, `/login/oauth2` and the health
endpoint to Render before the SPA fallback. Sensitive routes have caching
disabled. The frontend continues using relative same-origin URLs and host-only
Secure session cookies; do not add database secrets or an alternate API base URL.

When Vercel gives the final public origin, set Render's `RETURNTRAIL_PUBLIC_URL`
to that exact HTTPS origin and redeploy Render. Set Vercel `VITE_PUBLIC_URL` to the
same origin and redeploy Vercel for public sitemap/canonical metadata.

## 4. Verify the actual deployed route

1. Open backend readiness first and wait for UP if Render is sleeping.
2. Open the Vercel link in a fresh private/incognito window.
3. Open a guest workspace, compare the two original claims, prepare one task,
   save a fictional clarification, then refresh and inspect history/context.
4. Open another private browser profile and confirm the first guest's reply is
   absent there. Check a deep page refresh and JSON case brief export.
5. Confirm Google/GitHub remain unavailable in this non-durable preview.

Automated API verification from the project root (uses synthetic fixture cases):

```powershell
$env:API_URL = "https://YOUR-PROJECT.vercel.app"
node .\frontend\tests\evidence-api.mjs
```

The test uses independent cookie jars and exercises writes, duplicate protection,
context exclusions and source isolation. A failed POST must not be blindly
retried; inspect the saved task/version first. First-load HTML/timeout errors can
come from Render cold starts; warm readiness and retry session initialization.

## 5. Monitor availability

After deployment, an HTTP(S) monitor can check the direct Render readiness URL.
UptimeRobot Free offers five-minute checks. Monitor the backend, not only the
Vercel static homepage. Checks create no guest sessions or model requests.
Keep within provider limits; monitoring cannot prevent provider restarts or
restore a deleted database. No monitor or cloud resource is created by this repo.

## Validation scope

`Split deployment check` verifies the backend-only Docker image with a 512 MB
memory cap, runtime `PORT`, real password-authenticated FalkorDB, guest API
invariants and wrong-password readiness failure. Route generation tests reject
unsafe origins and check auth/callback ordering and cache controls.
These checks do not establish real Render/Vercel deployment success, managed-cloud
ACL compatibility, TLS connectivity, actual OAuth login or real model output.
Run the public-route checks above after configuring your accounts.

Official references:
- <https://vercel.com/docs/routing/rewrites>
- <https://render.com/docs/free>
- <https://docs.falkordb.com/cloud/tiers/free>
- <https://uptimerobot.com/pricing/>
