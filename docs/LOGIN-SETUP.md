# Saved sign-in: Google first, guest always available

The lamp is an optional interaction. Turning it off never disables guest or sign-in controls. This fictional demo can be explored without an account. Email OTP/password/phone sign-in are not implemented.

## Google setup on the local machine

Use Google Auth Platform in a Google Cloud project. Configure its branding/audience and create an **OAuth client ID for a Web application**. Follow the console's current prompts; if the app is in testing, add the accounts you intend to test with. No Gmail/inbox access is needed.

| Field | Value |
| --- | --- |
| Application type | Web application |
| Local homepage | `http://127.0.0.1:5174` |
| Authorized redirect URI | `http://127.0.0.1:5174/login/oauth2/code/google` |
| Optional JavaScript origin, if requested | `http://127.0.0.1:5174` |

This implementation uses Spring Security's server authorization-code/OIDC flow with state, nonce and PKCE. Requested scopes are `openid profile`. The backend verifies the ID token through the configured provider; it does not trust an email or subject posted by the browser.

Stop the old backend with Ctrl+C. In that backend terminal:

```powershell
Set-Location "$env:USERPROFILE\Projects\returntrail\backend"
$env:GOOGLE_LOGIN_ENABLED = "true"
$env:GOOGLE_CLIENT_ID = (Read-Host "Google Web OAuth Client ID").Trim()
$googleSecret = Read-Host "Google OAuth Client Secret" -AsSecureString
$env:GOOGLE_CLIENT_SECRET = [Net.NetworkCredential]::new("", $googleSecret).Password
$env:GITHUB_LOGIN_ENABLED = "false"
$env:RETURNTRAIL_PUBLIC_URL = "http://127.0.0.1:5174"
mvn spring-boot:run
```

Keep an existing `GROQ_API_KEY` in this backend environment if using AI investigation. Rule review and Context lab work without it. The Google secret and Groq key are different credentials. Do not put either in Vite environment variables, source files, screenshots or chat.

Start the UI in a separate terminal:

```powershell
Set-Location "$env:USERPROFILE\Projects\returntrail\frontend"
npm.cmd ci
npm.cmd run dev
```

Open `http://127.0.0.1:5174/signin`. Use the same host spelling and port consistently. Register a separate exact callback if the origin changes. Vite proxies `/api`, `/oauth2` and `/login/oauth2` to the backend on 8085.

To inspect safe configuration flags:

```powershell
Invoke-RestMethod "http://127.0.0.1:5174/api/auth/session" | ConvertTo-Json -Depth 5
```

`googleConfigured=true` establishes registration presence, not successful external authentication. Confirm the real callback, account page, logout and re-login manually.

## Optional GitHub

GitHub is an optional developer choice. Register an OAuth App with callback `http://127.0.0.1:5174/login/oauth2/code/github`, set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` and `GITHUB_LOGIN_ENABLED=true` in the backend terminal. Google and GitHub identities are distinct even if display names or email addresses match. Existing GitHub registry keys are preserved; old in-memory sessions require re-login after the backend restart.

## Public deployment: Google and GitHub

Current origin: `https://returntrail-api.onrender.com`.

Local terminal environment variables are not copied to Render. A working local
provider login does not configure the hosted service.

### Register exact public callbacks

| Provider | Authorized callback |
| --- | --- |
| Google Web OAuth client | `https://returntrail-api.onrender.com/login/oauth2/code/google` |
| GitHub OAuth App | `https://returntrail-api.onrender.com/login/oauth2/code/github` |

Use `https://returntrail-api.onrender.com` as the public homepage/origin where
the provider requests it. Keep local and production configurations distinct.
Retain a local callback only in an appropriate development client; do not replace
a development secret without updating the corresponding environment.

For Google, check the actual audience and publishing state. A configuration
restricted to named test accounts cannot be assumed to admit arbitrary judges.
The server requests only `openid profile`; it does not request Gmail access.
Complete any console-required branding, audience and ownership steps before
claiming public access. Do not add unrelated scopes to bypass a setup error.

### Configure Render privately

Enter the existing client credentials directly in the Render service's
Environment editor. Do not send secrets in chat, paste them in screenshots,
commit them, or put them in `VITE_*` variables.

| Backend variable | Required value |
| --- | --- |
| `GOOGLE_CLIENT_ID` | Google Web OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Matching Google client secret |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | Matching GitHub client secret |
| `RETURNTRAIL_PUBLIC_URL` | `https://returntrail-api.onrender.com` |
| `SESSION_COOKIE_SECURE` | `true` |
| `GOOGLE_LOGIN_ENABLED` | `true`, after the Google credentials and callback are configured |
| `GITHUB_LOGIN_ENABLED` | `true`, after the GitHub credentials and callback are configured |

Missing enabled-provider credentials deliberately prevent startup. Add and review
all required values before saving/rebuilding. `PUBLIC_SITE_URL` configures
built public metadata; it is separate from OAuth registration and is not a
provider credential.

The current free cloud graph has no TLS, persistence or backups. Account identity
bindings are stored in that graph; sign-in does not add transport encryption or
durability. This setup remains a fictional-data prototype, with no durable-work
promise or real customer-record intake. Review these limits before enabling
accounts; a TLS-enabled, durable database is the appropriate deployment for a
saved-account service.

### Acceptance on the actual public origin

After rebuilding, inspect `GET /api/auth/session`. Both configured flags should
be true. That proves registration presence, not successful provider login.
Then independently exercise each provider:

1. Sign in from `/signin` and return to the account-owned case library.
2. Confirm the displayed provider and account workspace, then save a fictional note.
3. POST sign out; sign back in with the same provider account and inspect the note.
4. Check another account cannot read the first account's workspace.
5. Cancel a provider flow and confirm guest entry still works.

Google and GitHub accounts remain separate even if their names match.
Do not merge them by name/email. Do not report either real provider as tested
until its actual authorization and callback have completed.

## Workspace behavior

- New sign-in opens a separate saved fictional workspace; it does not import a guest's text, tasks or notes. Export guest work first.
- Stable identity is provider plus verified subject, never an editable display name or client-supplied email.
- API responses expose a bounded profile/provider and opaque workspace reference, not the provider subject or graph name.
- Sessions rotate on login. Unsafe operations require the current masked CSRF token. Logout is POST; GET does not log out.
- OAuth API access/refresh tokens are removed from the authorized-client session entry after login. The Google OIDC identity token/claims remain in the authenticated server session; they are not sent to the frontend as tokens.
- Saved graphs remain while the database is retained. Sessions are in memory and expire after two hours of inactivity. Only one backend replica is supported.
- No automatic provider linking, account deletion, real-data intake or email OTP exists in this update. This boundary is also stated on the public demo privacy page.

## External acceptance test

1. With real credentials, Continue with Google reaches the account workspace.
2. A saved task remains after sign out and a fresh sign-in to the same account.
3. A second account cannot see the first account's task or note.
4. Cancelling sign-in recovers; guest demo remains reachable.
5. A signed-in user cannot reset/delete the account graph through guest endpoints.
6. Repeat on the final HTTPS origin. Set secure cookies and register its exact callback.

The automated OIDC integration uses a local signed-token/JWKS provider with real Spring filters and real FalkorDB. It is not a claim that actual Google credentials were tested in this workspace.

## Reproduce opt-in security tests

With the local FalkorDB Docker instance running on 6380:

```powershell
Set-Location "$env:USERPROFILE\Projects\returntrail\backend"
$env:RETURNTRAIL_AUTH_LIVE = "true"
$env:FALKORDB_TEST_PORT = "6380"
mvn '-Dtest=AccountOAuthLiveTests,GoogleOidcLiveTests' test
Remove-Item Env:RETURNTRAIL_AUTH_LIVE
```

These test classes create local-only providers, isolated test identity registries and synthetic graph data. They do not contact real GitHub/Google or call Groq. Test-only provider classes are not packaged in the application JAR.

Primary references:
- https://developers.google.com/identity/openid-connect/openid-connect
- https://docs.spring.io/spring-security/reference/servlet/oauth2/login/core.html
- https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app

## Direct PowerShell API check

Run against the Vite origin while both servers are running:

```powershell
$base = "http://127.0.0.1:5174"
$check = Invoke-RestMethod "$base/api/auth/csrf" -SessionVariable trail -ErrorAction Stop
$headers = @{ "X-CSRF-TOKEN" = $check.token }
$guest = Invoke-RestMethod -Method Post -Uri "$base/api/guest-sessions" -WebSession $trail -Headers $headers -ErrorAction Stop
Invoke-RestMethod "$base/api/cases/CASE-001/context?exclude=DOC-001" -WebSession $trail -ErrorAction Stop | ConvertTo-Json -Depth 12
```

This creates its own fictional guest session and reads a preview. It does not log in to Google or alter original evidence. A failed write is never automatically retried; refresh before a manual retry.
