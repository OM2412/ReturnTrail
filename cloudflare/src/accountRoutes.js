import {resolveAccountSession,sha256Hex} from './accountFoundation.js';

const ACCOUNT_COOKIE='__Host-RTACCOUNT';
const SESSION_RE=/^[A-Za-z0-9_-]{43}$/;
const clearCookie=`${ACCOUNT_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
const response=(value,status=200,headers={})=>new Response(JSON.stringify(value),{
  status,headers:{'content-type':'application/json','cache-control':'no-store',
    'x-content-type-options':'nosniff',...headers}});

function accountToken(request) {
  const value=request.headers.get('cookie')
    ?.match(/(?:^|;\s*)__Host-RTACCOUNT=([A-Za-z0-9_-]{43})(?:;|$)/)?.[1];
  return value&&SESSION_RE.test(value)?value:null;
}

function sameOrigin(request) {
  const origin=new URL(request.url).origin;
  return request.headers.get('origin')===origin ||
    (!request.headers.get('origin')&&request.headers.get('sec-fetch-site')==='same-origin');
}

function randomSecret() {
  return btoa(Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>String.fromCharCode(b)).join(''))
    .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

export async function handleAccountRoute(request,db) {
  const path=new URL(request.url).pathname;
  if (!['/api/account/session','/api/account/csrf','/api/account/logout'].includes(path)) return null;
  const token=accountToken(request);
  const current=token?await resolveAccountSession(db,token):null;
  if (path==='/api/account/session'&&request.method==='GET') {
    if (!current)return response({authenticated:false,workspaces:[]},401);
    const roles=await db.prepare(`SELECT w.id AS workspaceId,w.name,m.role FROM workspace_memberships m
      JOIN account_workspaces w ON w.id=m.workspace_id
      WHERE m.account_id=? AND m.status='ACTIVE' AND w.status='ACTIVE'
      ORDER BY w.id`).bind(current.accountId).all();
    return response({authenticated:true,accountId:current.accountId,workspaces:roles.results??[]});
  }
  if (path==='/api/account/csrf'&&request.method==='GET') {
    if (!sameOrigin(request))return response({error:'Forbidden origin'},403);
    if (!current)return response({error:'Authentication required'},401);
    const csrf=randomSecret();
    await db.prepare(`UPDATE account_sessions SET csrf_hash=?,last_seen_at=?
      WHERE token_hash=? AND revoked_at IS NULL`).bind(await sha256Hex(csrf),Date.now(),await sha256Hex(token)).run();
    return response({headerName:'X-CSRF-TOKEN',token:csrf});
  }
  if (path==='/api/account/logout'&&request.method==='POST') {
    if (request.headers.get('origin')!==new URL(request.url).origin)
      return response({error:'Forbidden origin'},403);
    if (!current)return response({error:'Authentication required'},401,{ 'set-cookie':clearCookie });
    const csrf=request.headers.get('x-csrf-token');
    if (!csrf||!SESSION_RE.test(csrf)||await sha256Hex(csrf)!==current.csrfHash)
      return response({error:'Invalid CSRF token'},403);
    await db.prepare('UPDATE account_sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL')
      .bind(Date.now(),await sha256Hex(token)).run();
    return new Response(null,{status:204,headers:{'cache-control':'no-store','set-cookie':clearCookie}});
  }
  return response({error:'Method not allowed'},405,{allow:path.endsWith('logout')?'POST':'GET'});
}
