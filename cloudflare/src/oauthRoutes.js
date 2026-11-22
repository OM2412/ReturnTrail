import {beginOAuth,consumeOAuth} from './oauthFlow.js';
import {exchangeAuthorizationCode} from './oauthExchange.js';
import {issueSessionForKnownIdentity,accountSessionCookie} from './verifiedSession.js';
import {provisionVerifiedGoogleCustomer} from './accountProvisioning.js';

const STATE_COOKIE='__Host-RTOAUTH';
const cookieState=(request)=>request.headers.get('cookie')
  ?.match(/(?:^|;\s*)__Host-RTOAUTH=([A-Za-z0-9_-]{43})(?:;|$)/)?.[1]??null;
const clearState=`${STATE_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
const reply=(status,message,clear=false)=>new Response(JSON.stringify({error:message}),{
  status,headers:{'content-type':'application/json','cache-control':'no-store',
    ...(clear?{'set-cookie':clearState}:{})}});

// The Worker must route here only when AUTH_ENABLED=true. New customer signup
// is opt-in for verified Google assertions only; no email-based linking.
export async function handleOAuthRoute(request,env,{exchange=exchangeAuthorizationCode}={}) {
  const url=new URL(request.url);
  const match=url.pathname.match(/^\/api\/oauth\/(google|github)\/(start|callback)$/);
  if (!match || request.method!=='GET') return null;
  const provider=match[1].toUpperCase(),action=match[2];
  const config=provider==='GOOGLE'
    ? {clientId:env.GOOGLE_CLIENT_ID,clientSecret:env.GOOGLE_CLIENT_SECRET}
    : {clientId:env.GITHUB_CLIENT_ID,clientSecret:env.GITHUB_CLIENT_SECRET};
  const callback=`${url.origin}/api/oauth/${match[1]}/callback`;
  if (url.protocol!=='https:' || !config.clientId || !config.clientSecret)
    return reply(503,'OAuth provider is unavailable');
  if (action==='start') {
    try {
      const flow=await beginOAuth(env.DB,{provider,clientId:config.clientId,redirectUri:callback});
      return new Response(null,{status:302,headers:{location:flow.authorizationUrl,
        'cache-control':'no-store',
        'set-cookie':`${STATE_COOKIE}=${flow.state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=300`}});
    } catch {return reply(503,'OAuth login unavailable');}
  }
  if (url.searchParams.has('error')) return reply(401,'Provider authorization denied',true);
  const state=url.searchParams.get('state'),code=url.searchParams.get('code');
  if (!code || !state) return reply(400,'Missing OAuth callback parameters',true);
  let stage='state';
  try {
    const transaction=await consumeOAuth(env.DB,{provider,state,cookieState:cookieState(request)});
    if (!transaction) return reply(403,'OAuth state is invalid or expired',true);
    stage='exchange';
    const identity=await exchange({...config,provider,code,redirectUri:callback,...transaction});
    if (identity?.provider!==provider)return reply(401,'OAuth provider mismatch',true);
    stage='provision';
    if (provider==='GOOGLE' && env.GOOGLE_CUSTOMER_SIGNUP==='true')
      await provisionVerifiedGoogleCustomer(env.DB,identity);
    stage='session';
    const result=await issueSessionForKnownIdentity(env.DB,identity);
    if (!result) return reply(403,'Account not linked; contact administrator',true);
    const headers=new Headers({'location':'/','cache-control':'no-store'});
    headers.append('set-cookie',clearState);
    headers.append('set-cookie',accountSessionCookie(result.token));
    return new Response(null,{status:303,headers});
  } catch (error) {
    // A fixed allowlist keeps logs diagnostic without recording OAuth codes,
    // access tokens, provider responses, email addresses, or SQL parameters.
    const knownReasons=new Set([
      'Invalid OAuth exchange parameters','OAuth code exchange failed',
      'Provider rejected authorization code','Missing Google identity token',
      'OAuth token endpoint unavailable','OAuth token response malformed',
      'Google verification keys unavailable','Google verification keys unreachable',
      'Google verification keys malformed','Google verification runtime error',
      'Invalid Google token',
      'Invalid token encoding','Unsupported Google signature',
      'Unknown Google signing key','Invalid Google signature',
      'Invalid Google identity claims','Invalid Google verification context',
      'Verified Google subject required',
    ]);
    console.warn('returntrail_oauth_callback_failure',{
      provider,stage,reason:knownReasons.has(error?.message)?error.message:'internal_error',
    });
    if (env.OAUTH_DIAGNOSTICS==='true') {
      // Staging-only: fixed enum details, never token/provider payloads.
      return new Response(JSON.stringify({error:'OAuth verification failed',
        diagnostic:{stage,reason:knownReasons.has(error?.message)?error.message:'internal_error'}}),{
        status:401,headers:{'content-type':'application/json','cache-control':'no-store','set-cookie':clearState},
      });
    }
    return reply(401,'OAuth verification failed',true);
  }
}
