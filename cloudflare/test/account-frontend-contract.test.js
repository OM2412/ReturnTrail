import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../src/worker.js';
import {sha256Hex} from '../src/accountFoundation.js';
import {provisionCustomerAccountByAdmin} from '../src/accountProvisioning.js';

test('opt-in account contract opens seeded cases, rotates CSRF and logs out',async()=>{
  const sqlite=new DatabaseSync(':memory:');
  try {
    sqlite.exec('PRAGMA foreign_keys=ON');
    for(const file of ['0001_core.sql','0002_workflow_parity.sql','0003_evidence_import.sql','0004_account_foundation.sql','0005_oauth_transactions.sql'])
      sqlite.exec(readFileSync(new URL(`../migrations/${file}`,import.meta.url),'utf8'));
    const db={prepare(sql){return {bind(...args){const stmt=sqlite.prepare(sql);return {
      first:async()=>stmt.get(...args)??null,all:async()=>({results:stmt.all(...args)}),
      run:async()=>stmt.run(...args),sql,args,
    };}};},async batch(statements){sqlite.exec('BEGIN');try{
      const result=statements.map(s=>sqlite.prepare(s.sql).run(...s.args));
      sqlite.exec('COMMIT');return result;
    }catch(e){sqlite.exec('ROLLBACK');throw e;}}};
    const account=await provisionCustomerAccountByAdmin(db,{provider:'GOOGLE',subject:'123456789',workspaceName:'Private Return Desk'});
    const token='A'.repeat(43),now=Date.now();
    sqlite.prepare(`INSERT INTO account_sessions(token_hash,account_id,csrf_hash,created_at,last_seen_at,expires_at)
      VALUES(?,?,?,?,?,?)`).run(await sha256Hex(token),account.accountId,await sha256Hex('B'.repeat(43)),now,now,now+60000);
    const env={DB:db,AUTH_ENABLED:'true',ACCOUNT_FRONTEND_ENABLED:'true',GOOGLE_CLIENT_ID:'example-client'};
    const origin='https://preview.example.test',headers={cookie:`__Host-RTACCOUNT=${token}`};
    const request=(path,options={})=>new Request(`${origin}${path}`,options);
    const auth=await worker.fetch(request('/api/auth/session',{headers}),env);
    const state=await auth.json();
    assert.equal(state.authenticated,true);
    assert.equal(state.workspaceMode,'ACCOUNT');
    assert.equal(state.authFlow,'CLOUDFLARE');
    const cases=await worker.fetch(request('/api/cases',{headers}),env);
    assert.equal((await cases.json()).count,4);
    const snapshot=await worker.fetch(request('/api/cases/CASE-001/snapshot',{headers}),env);
    assert.equal(snapshot.status,200);
    const csrf=await worker.fetch(request('/api/auth/csrf',{headers:{...headers,'sec-fetch-site':'same-origin'}}),env);
    assert.equal(csrf.status,200);
    const csrfValue=(await csrf.json()).token;
    const logout=await worker.fetch(request('/api/auth/logout',{method:'POST',
      headers:{...headers,origin,'x-csrf-token':csrfValue}}),env);
    assert.equal(logout.status,204);
    const after=await worker.fetch(request('/api/auth/session',{headers}),env);
    assert.equal((await after.json()).authenticated,false);
  }finally{sqlite.close();}
});
