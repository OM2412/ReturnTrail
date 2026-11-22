import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { beginOAuth, consumeOAuth } from '../src/oauthFlow.js';

function database() {
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../migrations/0005_oauth_transactions.sql',import.meta.url),'utf8'));
  const db={prepare(sql){return {bind(...args){const statement=sqlite.prepare(sql);return {
    run:async()=>statement.run(...args),first:async()=>statement.get(...args)??null,
  };}};}};
  return {sqlite,db};
}

test('OAuth handshakes use S256, nonce and one-time state with short expiry',async()=>{
  const {sqlite,db}=database();
  try {
    const now=1_800_000_000_000;
    const flow=await beginOAuth(db,{provider:'GOOGLE',clientId:'example-client',
      redirectUri:'https://api.example.test/oauth/google/callback',now});
    const url=new URL(flow.authorizationUrl);
    assert.equal(url.searchParams.get('code_challenge_method'),'S256');
    assert.equal(url.searchParams.get('response_type'),'code');
    assert.equal(url.searchParams.get('nonce')?.length,43);
    assert.equal(flow.state.length,43);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM oauth_transactions').get().n,1);
    assert.equal(await consumeOAuth(db,{provider:'GOOGLE',state:flow.state,cookieState:'invalid',now}),null);
    const consumed=await consumeOAuth(db,{provider:'GOOGLE',state:flow.state,cookieState:flow.state,now});
    assert.equal(consumed.nonce,url.searchParams.get('nonce'));
    const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(consumed.pkceVerifier)));
    const challenge=btoa(Array.from(digest,b=>String.fromCharCode(b)).join('')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    assert.equal(challenge,url.searchParams.get('code_challenge'));
    assert.equal(await consumeOAuth(db,{provider:'GOOGLE',state:flow.state,cookieState:flow.state,now}),null);
  } finally {sqlite.close();}
});

test('expired or wrong-provider transactions cannot be used',async()=>{
  const {sqlite,db}=database();
  try {
    const options={provider:'GITHUB',clientId:'example',redirectUri:'https://api.example.test/callback',now:1000};
    const wrong=await beginOAuth(db,options);
    assert.equal(await consumeOAuth(db,{provider:'GOOGLE',state:wrong.state,cookieState:wrong.state,now:1000}),null);
    const expired=await beginOAuth(db,options);
    assert.equal(await consumeOAuth(db,{provider:'GITHUB',state:expired.state,cookieState:expired.state,now:301001}),null);
    await assert.rejects(()=>beginOAuth(db,{...options,redirectUri:'http://localhost:3000/callback'}),/HTTPS/);
    await assert.rejects(()=>beginOAuth(db,{...options,provider:'UNKNOWN'}),/configuration/);
  } finally {sqlite.close();}
});
