import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {sha256Hex} from '../src/accountFoundation.js';
import {handleAccountRoute} from '../src/accountRoutes.js';

async function fixture() {
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON');
  sqlite.exec(readFileSync(new URL('../migrations/0004_account_foundation.sql',import.meta.url),'utf8'));
  const now=Date.now(),token='A'.repeat(43);
  sqlite.prepare('INSERT INTO accounts(id,created_at,updated_at) VALUES(?,?,?)').run('customer',now,now);
  sqlite.prepare('INSERT INTO account_workspaces(id,name,created_at) VALUES(?,?,?)').run('team','Customer Team',now);
  sqlite.prepare('INSERT INTO workspace_memberships(workspace_id,account_id,role,created_at) VALUES(?,?,?,?)')
    .run('team','customer','VIEWER',now);
  sqlite.prepare(`INSERT INTO account_sessions(token_hash,account_id,csrf_hash,created_at,last_seen_at,expires_at)
    VALUES(?,?,?,?,?,?)`).run(await sha256Hex(token),'customer',await sha256Hex('B'.repeat(43)),now,now,now+60_000);
  const db={prepare(sql){return {bind(...args){const stmt=sqlite.prepare(sql);return {
    first:async()=>stmt.get(...args)??null,run:async()=>stmt.run(...args),all:async()=>({results:stmt.all(...args)}),
  };}};}};
  return {sqlite,db,token};
}

test('authenticated session reads roles from DB, rotates csrf and logs out',async()=>{
  const {sqlite,db,token}=await fixture();
  const origin='https://preview.example.test';
  const cookie=`__Host-RTACCOUNT=${token}`;
  try {
    const session=await handleAccountRoute(new Request(`${origin}/api/account/session`,{headers:{cookie}}),db);
    assert.equal(session.status,200);
    assert.deepEqual((await session.json()).workspaces,[{workspaceId:'team',name:'Customer Team',role:'VIEWER'}]);
    const csrfRes=await handleAccountRoute(new Request(`${origin}/api/account/csrf`,{
      headers:{cookie,'sec-fetch-site':'same-origin'}}),db);
    assert.equal(csrfRes.status,200);
    const csrf=(await csrfRes.json()).token;
    const logoutPath=`${origin}/api/account/logout`;
    assert.equal((await handleAccountRoute(new Request(logoutPath,{method:'POST',headers:{cookie,origin}}),db)).status,403);
    const logout=await handleAccountRoute(new Request(logoutPath,{method:'POST',
      headers:{cookie,origin,'x-csrf-token':csrf}}),db);
    assert.equal(logout.status,204);
    assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
    assert.equal((await handleAccountRoute(new Request(`${origin}/api/account/session`,{headers:{cookie}}),db)).status,401);
  }finally{sqlite.close();}
});

test('cross-origin requests cannot fetch CSRF or revoke session',async()=>{
  const {sqlite,db,token}=await fixture();
  const origin='https://preview.example.test',cookie=`__Host-RTACCOUNT=${token}`;
  try {
    assert.equal((await handleAccountRoute(new Request(`${origin}/api/account/csrf`,{
      headers:{cookie,origin:'https://attacker.example.test'}}),db)).status,403);
    assert.equal((await handleAccountRoute(new Request(`${origin}/api/account/logout`,{
      method:'POST',headers:{cookie,origin:'https://attacker.example.test','x-csrf-token':'B'.repeat(43)}}),db)).status,403);
  }finally{sqlite.close();}
});
