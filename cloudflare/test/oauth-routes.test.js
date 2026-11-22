import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handleOAuthRoute} from '../src/oauthRoutes.js';

function fixture() {
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON');
  for (const filename of ['0004_account_foundation.sql','0005_oauth_transactions.sql'])
    sqlite.exec(readFileSync(new URL(`../migrations/${filename}`,import.meta.url),'utf8'));
  const now=Date.now();
  sqlite.prepare('INSERT INTO accounts(id,created_at,updated_at) VALUES(?,?,?)').run('customer',now,now);
  sqlite.prepare(`INSERT INTO account_identities(provider,provider_subject,account_id,linked_at)
    VALUES('GOOGLE','subject-one','customer',?)`).run(now);
  const DB={prepare(sql){return {bind(...args){const st=sqlite.prepare(sql);return {
    run:async()=>st.run(...args),first:async()=>st.get(...args)??null,
  };}};}};
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
