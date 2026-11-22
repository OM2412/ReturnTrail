// Provider validation primitives only. No endpoint issues sessions until OAuth
// state, PKCE, callback URL and account database transactions are wired.
const textDecoder = new TextDecoder();
const encoded = (part) => {
  if (!/^[A-Za-z0-9_-]+$/.test(part) || part.length > 8192) throw new Error('Invalid token encoding');
  const b64 = part.replace(/-/g,'+').replace(/_/g,'/');
  const binary = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4,'='));
  return Uint8Array.from(binary, c=>c.charCodeAt(0));
};
const parseSegment = part => JSON.parse(textDecoder.decode(encoded(part)));

export async function verifyGoogleIdToken(idToken, { clientId, nonce, jwks, now = Date.now() }) {
  if (!clientId || !nonce || typeof idToken !== 'string' || idToken.length > 16384)
    throw new Error('Invalid Google verification context');
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Invalid Google token');
  const [header,claims] = parts.slice(0,2).map(parseSegment);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || header.typ && header.typ !== 'JWT')
    throw new Error('Unsupported Google signature');
  const key = jwks?.keys?.find(k=>k.kid===header.kid && k.kty==='RSA' && k.use==='sig' && k.alg==='RS256');
  if (!key) throw new Error('Unknown Google signing key');
  const imported = await crypto.subtle.importKey('jwk', key, {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const verified = await crypto.subtle.verify('RSASSA-PKCS1-v1_5',imported,encoded(parts[2]),new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  if (!verified) throw new Error('Invalid Google signature');
  const seconds=Math.floor(now/1000);
  if (!['accounts.google.com','https://accounts.google.com'].includes(claims.iss) ||
      claims.aud!==clientId || claims.nonce!==nonce ||
      typeof claims.sub!=='string' || !/^[0-9]{1,40}$/.test(claims.sub) ||
      !Number.isSafeInteger(claims.exp) || claims.exp<=seconds ||
      !Number.isSafeInteger(claims.iat) || claims.iat>seconds+60 || claims.iat<seconds-3600)
    throw new Error('Invalid Google identity claims');
  return { provider:'GOOGLE', subject:claims.sub,
    email:typeof claims.email==='string' && claims.email.length<=254 ? claims.email:null,
    emailVerified:claims.email_verified===true };
}

export async function verifyGithubAccessToken(accessToken, { fetcher = fetch } = {}) {
  if (typeof accessToken!=='string' || !accessToken || accessToken.length>4096)
    throw new Error('Invalid GitHub token');
  // Authenticate against GitHub itself. Never accept a browser-supplied login or email.
  const response=await fetcher('https://api.github.com/user',{
    method:'GET',headers:{ Authorization:`Bearer ${accessToken}`,Accept:'application/vnd.github+json',
      'X-GitHub-Api-Version':'2022-11-28' },redirect:'manual',signal:AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('GitHub token validation failed');
  const user=await response.json();
  if (!Number.isSafeInteger(user.id) || user.id<=0) throw new Error('Invalid GitHub identity');
  return {provider:'GITHUB',subject:String(user.id),email:null,emailVerified:false,
    login:typeof user.login==='string' ? user.login.slice(0,80) : null};
}
