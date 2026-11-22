import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handleOAuthRoute} from '../src/oauthRoutes.js';

function fixture() {
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON');
  for (const filename of ['0001_core.sql','0002_workflow_parity.sql','0003_evidence_import.sql',
    '0004_account_foundation.sql','0005_oauth_transactions.sql'])
    sqlite.exec(readFileSync(new URL(`../migrations/${filename}`,import.meta.url),'utf8'));
  const now=Date.now();
  sqlite.prepare('INSERT INTO accounts(id,created_at,updated_at) VALUES(?,?,?)').run('customer',now,now);
  sqlite.prepare(`INSERT INTO account_identities(provider,provider_subject,account_id,linked_at)
    VALUES('GOOGLE','subject-one','customer',?)`).run(now);
  const DB={prepare(sql){return {bind(...args){const st=sqlite.prepare(sql);return {
    sql,args,
    run:async()=>st.run(...args),first:async()=>st.get(...args)??null,
  };}};},async batch(statements){sqlite.exec('BEGIN');try{
    const results=statements.map(x=>sqlite.prepare(x.sql).run(...x.args));
    sqlite.exec('COMMIT');return results;
  }catch(error){sqlite.exec('ROLLBACK');throw error;}}};
  return {sqlite,env:{DB,GOOGLE_CLIENT_ID:'client',GOOGLE_CLIENT_SECRET:'secret'}};
}

test('OAuth HTTP start and callback preserve existing customer and rotate one-time state',async()=>{
  const {sqlite,env}=fixture();
  try {
    const base='https://preview.example.test';
    const started=await handleOAuthRoute(new Request(`${base}/api/oauth/google/start`),env);
    assert.equal(started.status,302);
    const state=new URL(started.headers.get('location')).searchParams.get('state');
    const cookie=started.headers.get('set-cookie').split(';')[0];
    const callback=new Request(`${base}/api/oauth/google/callback?code=goodcode&state=${state}`,{
      headers:{cookie}});
    const exchange=async(args)=>{
      assert.equal(args.clientSecret,'secret');
      assert.equal(args.nonce.length,43);
      return {provider:'GOOGLE',subject:'subject-one',email:'different@example.test'};
    };
    const response=await handleOAuthRoute(callback,env,{exchange});
    assert.equal(response.status,303);
    assert.equal(response.headers.get('location'),'/');
    assert.match(response.headers.get('set-cookie'),/__Host-RTACCOUNT=/);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM accounts').get().n,1);
    const replay=await handleOAuthRoute(callback,env,{exchange});
    assert.equal(replay.status,403);
  }finally{sqlite.close();}
});

test('callback rejects missing cookie and unlinked identity without issuing sessions',async()=>{
  const {sqlite,env}=fixture();
  try {
    const base='https://preview.example.test';
    const started=await handleOAuthRoute(new Request(`${base}/api/oauth/google/start`),env);
    const state=new URL(started.headers.get('location')).searchParams.get('state');
    const path=`${base}/api/oauth/google/callback?code=goodcode&state=${state}`;
    assert.equal((await handleOAuthRoute(new Request(path),env)).status,403);
    const cookie=started.headers.get('set-cookie').split(';')[0];
    const result=await handleOAuthRoute(new Request(path,{headers:{cookie}}),env,{
      exchange:async()=>({provider:'GOOGLE',subject:'unlinked'})});
    assert.equal(result.status,403);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM account_sessions').get().n,0);
  }finally{sqlite.close();}
});

test('opt-in Google signup provisions an isolated demo workspace from verified subject',async()=>{
  const {sqlite,env}=fixture();
  try {
    env.GOOGLE_CUSTOMER_SIGNUP='true';
    const base='https://preview.example.test';
    const started=await handleOAuthRoute(new Request(`${base}/api/oauth/google/start`),env);
    const state=new URL(started.headers.get('location')).searchParams.get('state');
    const cookie=started.headers.get('set-cookie').split(';')[0];
    const callback=new Request(`${base}/api/oauth/google/callback?code=goodcode&state=${state}`,{headers:{cookie}});
    const response=await handleOAuthRoute(callback,env,{exchange:async()=>({
      provider:'GOOGLE',subject:'new-google-sub',email:'owner@example.test',
    })});
    assert.equal(response.status,303);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM accounts').get().n,2);
    const newIdentity=sqlite.prepare(`SELECT account_id AS id FROM account_identities
      WHERE provider='GOOGLE' AND provider_subject='new-google-sub'`).get();
    assert.ok(newIdentity);
    assert.equal(sqlite.prepare(`SELECT COUNT(*) AS n FROM cases WHERE workspace_id IN
      (SELECT workspace_id FROM workspace_memberships WHERE account_id=?)`).get(newIdentity.id).n,4);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM account_sessions').get().n,1);
    assert.equal(sqlite.prepare(`SELECT account_id AS id FROM account_identities
      WHERE provider='GOOGLE' AND provider_subject='subject-one'`).get().id,'customer');
    assert.equal((await handleOAuthRoute(callback,env,{exchange:async()=>({provider:'GOOGLE',subject:'new-google-sub'})})).status,403);
  }finally{sqlite.close();}
});

test('signup stays disabled by default and rejects provider mismatch',async()=>{
  const {sqlite,env}=fixture();
  try {
    const base='https://preview.example.test';
    const start=()=>handleOAuthRoute(new Request(`${base}/api/oauth/google/start`),env);
    let started=await start();
    let state=new URL(started.headers.get('location')).searchParams.get('state');
    let cookie=started.headers.get('set-cookie').split(';')[0];
    let result=await handleOAuthRoute(new Request(`${base}/api/oauth/google/callback?code=goodcode&state=${state}`,{headers:{cookie}}),env,{
      exchange:async()=>({provider:'GOOGLE',subject:'unlinked'})});
    assert.equal(result.status,403);
    env.GOOGLE_CUSTOMER_SIGNUP='true';
    started=await start();
    state=new URL(started.headers.get('location')).searchParams.get('state');
    cookie=started.headers.get('set-cookie').split(';')[0];
    result=await handleOAuthRoute(new Request(`${base}/api/oauth/google/callback?code=goodcode&state=${state}`,{headers:{cookie}}),env,{
      exchange:async()=>({provider:'GITHUB',subject:'unlinked'})});
    assert.equal(result.status,401);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM accounts').get().n,1);
  }finally{sqlite.close();}
});
