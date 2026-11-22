import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { issueSessionForKnownIdentity, revokeAccountSession, accountSessionCookie } from '../src/verifiedSession.js';
import {resolveAccountSession} from '../src/accountFoundation.js';

function fixture() {
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON');
  sqlite.exec(readFileSync(new URL('../migrations/0004_account_foundation.sql',import.meta.url),'utf8'));
  const now=Date.now();
  sqlite.prepare('INSERT INTO accounts(id,created_at,updated_at) VALUES(?,?,?)').run('customer-existing',now,now);
  sqlite.prepare(`INSERT INTO account_identities(provider,provider_subject,account_id,email,linked_at)
    VALUES('GOOGLE','google-123','customer-existing','customer@example.test',?)`).run(now);
  const db={prepare(sql){return {bind(...args){const statement=sqlite.prepare(sql);return {
    first:async()=>statement.get(...args)??null,
    run:async()=>statement.run(...args),
  };}};}};
  return {db,sqlite,now};
}

test('known provider subject creates hashed revocable account session',async()=>{
  const {db,sqlite,now}=fixture();
  try {
    const valid=await issueSessionForKnownIdentity(db,{provider:'GOOGLE',subject:'google-123'},now);
    assert.equal(valid.accountId,'customer-existing');
    assert.equal(valid.token.length,43);
    assert.match(accountSessionCookie(valid.token),/^__Host-RTACCOUNT=.*HttpOnly; Secure; SameSite=Lax/);
    assert.equal((await resolveAccountSession(db,valid.token,now)).accountId,'customer-existing');
    assert.equal(sqlite.prepare('SELECT token_hash FROM account_sessions').get().token_hash.length,64);
    assert.equal(await revokeAccountSession(db,valid.token),true);
    assert.equal(await resolveAccountSession(db,valid.token,now),null);
  }finally{sqlite.close();}
});

test('unknown provider identity cannot seize customer account via matching email',async()=>{
  const {db,sqlite,now}=fixture();
  try {
    assert.equal(await issueSessionForKnownIdentity(db,{provider:'GITHUB',subject:'google-123',
      email:'customer@example.test'},now),null);
    assert.equal(await issueSessionForKnownIdentity(db,{provider:'GOOGLE',subject:'unknown',
      email:'customer@example.test'},now),null);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM account_sessions').get().n,0);
    sqlite.prepare("UPDATE accounts SET status='SUSPENDED' WHERE id='customer-existing'").run();
    assert.equal(await issueSessionForKnownIdentity(db,{provider:'GOOGLE',subject:'google-123'},now),null);
  }finally{sqlite.close();}
});
