import { verifyGithubAccessToken, verifyGoogleIdToken } from './oauthProviders.js';

const TOKEN_ENDPOINTS = Object.freeze({
  GOOGLE:'https://oauth2.googleapis.com/token',
  GITHUB:'https://github.com/login/oauth/access_token',
});
const CODE = /^[A-Za-z0-9_./~-]{1,2048}$/;
const VERIFIER = /^[A-Za-z0-9_-]{43,128}$/;

// Must be used only after consumeOAuth() successfully validates a one-time
// state and the matching HttpOnly cookie. Credentials come from Worker secrets.
export async function exchangeAuthorizationCode({provider,code,pkceVerifier,clientId,
  clientSecret,redirectUri,nonce,fetcher=fetch}) {
  if (!Object.hasOwn(TOKEN_ENDPOINTS,provider) || typeof code!=='string' || !CODE.test(code) ||
      typeof pkceVerifier!=='string' || !VERIFIER.test(pkceVerifier) ||
      !clientId || !clientSecret || !nonce ||
      !redirectUri || new URL(redirectUri).protocol!=='https:')
    throw new Error('Invalid OAuth exchange parameters');
  const response=await fetcher(TOKEN_ENDPOINTS[provider],{
    method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
    headers:{'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json'},
    body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,
      code,redirect_uri:redirectUri,grant_type:'authorization_code',code_verifier:pkceVerifier}).toString(),
  });
  if (!response.ok) throw new Error('OAuth code exchange failed');
  const payload=await response.json();
  if (payload.error) throw new Error('Provider rejected authorization code');
  if (provider==='GITHUB') {
    if (typeof payload.access_token!=='string') throw new Error('Missing GitHub token');
    // Never return or persist the provider access token.
    return verifyGithubAccessToken(payload.access_token,{fetcher});
  }
  if (typeof payload.id_token!=='string') throw new Error('Missing Google identity token');
  const keysResponse=await fetcher('https://www.googleapis.com/oauth2/v3/certs',{
    method:'GET',redirect:'error',signal:AbortSignal.timeout(10000),
  });
  if (!keysResponse.ok) throw new Error('Google verification keys unavailable');
  const jwks=await keysResponse.json();
  return verifyGoogleIdToken(payload.id_token,{clientId,nonce,jwks});
}
