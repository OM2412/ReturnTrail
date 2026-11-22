// Account authorization primitives. They do not create accounts, accept OAuth
// assertions, or mint cookies: verified OAuth exchange is a separate release gate.
const SESSION_TOKEN = /^[A-Za-z0-9_-]{43}$/;
const ROLES = Object.freeze({ VIEWER: 1, MEMBER: 2, ADMIN: 3, OWNER: 4 });

export async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(digest, b => b.toString(16).padStart(2, '0')).join('');
}

export async function resolveAccountSession(db, rawToken, now = Date.now()) {
  if (typeof rawToken !== 'string' || !SESSION_TOKEN.test(rawToken)) return null;
  const hash = await sha256Hex(rawToken);
  const result = await db.prepare(`SELECT s.account_id AS accountId, s.csrf_hash AS csrfHash,
      a.status AS accountStatus, s.expires_at AS expiresAt
      FROM account_sessions s JOIN accounts a ON a.id=s.account_id
      WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND a.status='ACTIVE'`)
    .bind(hash, now).first();
  return result?.accountStatus === 'ACTIVE' && result.expiresAt > now ? result : null;
}

export async function authorizeWorkspace(db, accountId, workspaceId, requiredRole = 'VIEWER') {
  if (!Object.hasOwn(ROLES, requiredRole) || typeof accountId !== 'string' ||
      typeof workspaceId !== 'string' || !accountId || !workspaceId) return false;
  const row = await db.prepare(`SELECT m.role FROM workspace_memberships m
      JOIN account_workspaces w ON w.id=m.workspace_id
      JOIN accounts a ON a.id=m.account_id
      WHERE m.account_id=? AND m.workspace_id=? AND m.status='ACTIVE'
        AND w.status='ACTIVE' AND a.status='ACTIVE'`)
    .bind(accountId,workspaceId).first();
  return !!row && (ROLES[row.role] ?? 0) >= ROLES[requiredRole];
}
