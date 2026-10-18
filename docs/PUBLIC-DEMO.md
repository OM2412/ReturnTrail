# Card-free temporary public demo

This is the fallback when cloud signup is blocked. Cloudflare Quick Tunnels provide a temporary public HTTPS address for the combined app running in Docker on your laptop. No Cloudflare account, domain or payment card is needed for a Quick Tunnel.

This is not an always-on hosted deployment. The laptop must remain awake and online, and Docker must keep running. The hostname can change when the tunnel restarts, and Cloudflare provides no uptime guarantee for Quick Tunnels. Keep the recorded video and complete local setup as submission fallbacks.

## Start on Windows

Start Docker Desktop with Linux containers. From your usual PowerShell terminal (the one with `GROQ_API_KEY` set if you want AI investigation):

```powershell
Set-Location "$env:USERPROFILE\Projects\returntrail"
git pull --ff-only origin main
if ($LASTEXITCODE -ne 0) { throw 'Git pull stopped. Share its output before continuing.' }
powershell -NoProfile -ExecutionPolicy Bypass -File .\Start-PublicDemo.ps1
```

The first Docker build can take several minutes. The script prints **PUBLIC DEMO:** only after the app's local and public readiness checks pass and its frontend is reachable. Open that HTTPS address on a phone using mobile data to check access from outside your Wi-Fi. Use that exact URL when sharing; do not substitute localhost.

The script uses a separate `returntrail-public-demo` Compose project and named graph volume. It does not use the development graph, production Compose stack or existing root `.env`. The database has no published host port; only the app is bound locally on `127.0.0.1:18085`. Cloudflared connects to the app inside the container network.

No API key, OAuth credential or card detail is requested in chat. An existing `GROQ_API_KEY` environment variable is passed only to the app at runtime. Without it, the explicitly labeled rule review and guest workflows still work.

## Demo behavior

- The app is served as a built production frontend and API, not a public Vite development server.
- Guests receive separate fictional workspaces. The full source/context/task/brief workflow is available.
- Google/GitHub sign-in is disabled in this preview because its hostname can change. The lamp page remains available with guest entry.
- Public-URL canonical/sitemap metadata is omitted from the build instead of publishing a changing tunnel as a permanent site origin.
- Session cookies are Secure for the public HTTPS URL. Restarting the app loses its in-memory sessions; that is separate from retaining graph files.
- The local Docker graph volume survives ordinary container restarts. A volume is not a backup, and deleting Docker data can remove it.
- Containers run in the background after the PowerShell script exits. Closing that terminal alone does not stop them. Sleeping/shutting down the laptop or stopping Docker interrupts access.

If the image is already built and source has not changed, a retry can use `-SkipBuild`. Running the script again reuses the tunnel while that container is still running. A restarted tunnel can receive a different hostname; the script reads the new one and updates the app's public-origin setting.

## Stop

From the repository root:

```powershell
docker compose --project-name returntrail-public-demo -f compose.public-demo.yaml stop
```

This closes public access and stops this preview while retaining its named volume. Do not add volume-deleting options if you need its data.

For startup errors, inspect `docker compose --project-name returntrail-public-demo -f compose.public-demo.yaml logs --tail 100 app tunnel`. Do not post an environment dump or secrets. If no URL is allocated, internet access to Cloudflare may be blocked. A local port conflict on 18085 must be resolved before startup; existing backend port 8085 and Vite port 5174 are separate.

Cloudflare's current Quick Tunnel limits include 200 in-flight requests, no SSE support, no uptime guarantee and a changing hostname on restart. ReturnTrail's investigation uses a normal JSON request, not SSE. This route is a small demo, not a scalability result.

Official reference: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/
