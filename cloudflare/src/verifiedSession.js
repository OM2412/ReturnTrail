// Only call after verifying a provider assertion server-side. Unknown identities
// cannot silently become new accounts or take over an account via email match.
import { sha256Hex } from './accountFoundation.js';

function randomSecret() {
  const bytes=crypto.getRandomValues(new Uint8Array(32));
  return btoa(Array.from(bytes,b=>String.fromCharCode(b)).join(''))
    .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

export async function issueSessionForKnownIdentity(db, identity, now=Date.now()) {
  if (!identity || !['GOOGLE','GITHUB'].includes(identity.provider) ||
      typeof identity.subject!=='string' || !identity.subject || identity.subject.length>255)
    throw new Error('Verified provider identity required');
  // Explicit identity linking is a separate, authenticated account operation.
  // Never use email to select an existing customer account.
  const row=await db.prepare(`SELECT a.id AS accountId FROM account_identities i
    JOIN accounts a ON a.id=i.account_id
    WHERE i.provider=? AND i.provider_subject=? AND a.status='ACTIVE'`)
    .bind(identity.provider,identity.subject).first();
  if (!row) return null;
  const token=randomSecret(), csrf=randomSecret();
  const expiresAt=now+7*24*60*60*1000;
  await db.prepare(`INSERT INTO account_sessions
    (token_hash,account_id,csrf_hash,created_at,last_seen_at,expires_at)
    VALUES(?,?,?,?,?,?)`).bind(await sha256Hex(token),row.accountId,
      await sha256Hex(csrf),now,now,expiresAt).run();
  return {accountId:row.accountId,token,csrf,expiresAt};
}

export async function revokeAccountSession(db, token) {
  if (typeof token!=='string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const result=await db.prepare(`UPDATE account_sessions SET revoked_at=?
    WHERE token_hash=? AND revoked_at IS NULL`).bind(Date.now(),await sha256Hex(token)).run();
  return (result?.meta?.changes ?? result?.changes ?? 0)>0;
}

export function accountSessionCookie(token, maxAge=604800) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('Invalid session token');
  return `__Host-RTACCOUNT=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
