// Opt-in live preview smoke test. Creates and revokes an isolated synthetic workspace.
// Usage: RETURNTRAIL_PREVIEW_URL=https://... node cloudflare/test/live-smoke.mjs
import assert from 'node:assert/strict';

const base = process.env.RETURNTRAIL_PREVIEW_URL;
if (!base || !/^https:\/\/[^/?#]+$/.test(base))
  throw new Error('Set RETURNTRAIL_PREVIEW_URL to a preview HTTPS origin without a path');
if (!base.includes('returntrail-preview-api.') && process.env.ALLOW_CUSTOM_PREVIEW !== 'true')
  throw new Error('Refusing to create a workspace outside the dedicated ReturnTrail preview');

let cookies = {};
async function call(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    signal: AbortSignal.timeout(15000),
    ...options,
    headers: {
      ...(Object.keys(cookies).length ? { Cookie: Object.entries(cookies).map(([k,v])=>`${k}=${v}`).join('; ') } : {}),
      ...options.headers,
    },
  });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    const [name, value] = setCookie.split(';',1)[0].split('=');
    if (value) cookies[name] = value;
    else delete cookies[name];
  }
  const data = response.status === 204 ? null : await response.json();
  return { status: response.status, data };
}

const results = [];
const check = (name, condition) => { assert.ok(condition, name); results.push(name); };
let active = false;
try {
  const health = await call('/api/health');
  check('D1 health', health.status === 200 && health.data.database === 'ready');
  const denied = await call('/api/cases');
  check('Unauthenticated cases denied', denied.status === 401);
  const csrf = await call('/api/auth/csrf');
  check('Pre-session CSRF', csrf.status === 200 && !!cookies.RTCSRF);
  const guest = await call('/api/guest-sessions', {
    method: 'POST', headers: { Origin: base, 'X-CSRF-TOKEN': csrf.data.token },
  });
  check('Guest session created', guest.status === 200 && guest.data.synthetic && !!cookies.RTSESSION);
  active = true;
  const catalog = await call('/api/cases');
  check('Four scoped cases', catalog.status === 200 && catalog.data.count === 4);
  for (const part of ['snapshot','evidence','proof','findings','actions','clarifications','context','brief']) {
    const item = await call(`/api/cases/CASE-001/${part}`);
    check(`CASE-001 ${part}`, item.status === 200 && item.data.caseId === 'CASE-001' ||
      (part === 'brief' && item.status === 200 && item.data.snapshot?.caseId === 'CASE-001'));
  }
  const activeCsrf = await call('/api/auth/csrf');
  const blocked = await call('/api/auth/logout', {method:'POST',headers:{Origin:'https://other.invalid','X-CSRF-TOKEN':activeCsrf.data.token}});
  check('Cross-origin logout denied', blocked.status === 403);
  const logout = await call('/api/auth/logout', {method:'POST',headers:{Origin:base,'X-CSRF-TOKEN':activeCsrf.data.token}});
  check('Guest logout', logout.status === 204);
  active = false;
  const ended = await call('/api/auth/session');
  check('Session revoked', ended.data.workspaceMode === 'NONE');
  console.log(`PASS ${results.length} live checks: ${results.join(', ')}`);
} finally {
  if (active && cookies.RTSESSION) {
    try {
      const token = (await call('/api/auth/csrf')).data.token;
      await call('/api/guest-sessions', {method:'DELETE',headers:{Origin:base,'X-CSRF-TOKEN':token}});
    } catch { console.error('WARNING: Preview session cleanup failed; it expires after 24 hours'); }
  }
}
