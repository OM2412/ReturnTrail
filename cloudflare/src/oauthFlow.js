// OAuth authorization-code handshake primitives. Callback routes, code exchange,
// account linking and cookie issuance require a separate reviewed integration.
import { sha256Hex } from './accountFoundation.js';

const PROVIDERS = Object.freeze({
  GOOGLE: 'https://accounts.google.com/o/oauth2/v2/auth',
  GITHUB: 'https://github.com/login/oauth/authorize',
});
const STATE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, b => String.fromCharCode(b)).join('');
}

function secureToken() {
  const raw = randomToken();
  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function assertConfiguration(provider, clientId, redirectUri) {
  if (!Object.hasOwn(PROVIDERS, provider) || typeof clientId !== 'string' ||
      !clientId.trim() || typeof redirectUri !== 'string') throw new Error('Invalid OAuth configuration');
  const url = new URL(redirectUri);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search ||
      !url.hostname || url.hostname === 'localhost') throw new Error('HTTPS callback URL required');
}

export async function beginOAuth(db, { provider, clientId, redirectUri, now = Date.now() }) {
  assertConfiguration(provider, clientId, redirectUri);
  const state = secureToken();
  const nonce = secureToken();
  const pkceVerifier = secureToken();
  const challengeHash = new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(pkceVerifier)));
  const challenge = btoa(Array.from(challengeHash,b=>String.fromCharCode(b)).join(''))
    .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const expiresAt = now + 5 * 60 * 1000;
  await db.prepare(`INSERT INTO oauth_transactions
    (state_hash,provider,pkce_verifier,nonce,created_at,expires_at) VALUES(?,?,?,?,?,?)`)
    .bind(await sha256Hex(state),provider,pkceVerifier,nonce,now,expiresAt).run();
  const url = new URL(PROVIDERS[provider]);
  const params = provider === 'GOOGLE'
    ? { client_id:clientId,redirect_uri:redirectUri,response_type:'code',scope:'openid email profile',
      state,nonce,code_challenge:challenge,code_challenge_method:'S256' }
    : {client_id:clientId,redirect_uri:redirectUri,scope:'read:user',state,
      code_challenge:challenge,code_challenge_method:'S256'};
  for (const [key,value] of Object.entries(params)) url.searchParams.set(key,value);
  // The caller must also set an HttpOnly, Secure, SameSite=Lax host-only state cookie.
  return {authorizationUrl:url.toString(),state,expiresAt};
}

export async function consumeOAuth(db, {provider,state,cookieState,now=Date.now()}) {
  if (!Object.hasOwn(PROVIDERS,provider) || typeof state!=='string' ||
      !STATE_PATTERN.test(state) || state !== cookieState) return null;
  // DELETE RETURNING is atomic: replayed callbacks cannot retrieve a verifier.
  const result = await db.prepare(`DELETE FROM oauth_transactions WHERE state_hash=?
    RETURNING provider,pkce_verifier AS pkceVerifier,nonce,expires_at AS expiresAt`)
    .bind(await sha256Hex(state)).first();
  if (!result || result.provider!==provider || result.expiresAt<=now) return null;
  return {pkceVerifier:result.pkceVerifier,nonce:result.nonce};
}
