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
