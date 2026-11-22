import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {sha256Hex} from '../src/accountFoundation.js';
import {handleAccountCaseRoute} from '../src/accountCaseRoutes.js';

test('customer cases are scoped to explicitly authorized account workspaces',async()=>{
  const sqlite=new DatabaseSync(':memory:');
  try {
    sqlite.exec('PRAGMA foreign_keys=ON');
    for(const migration of ['0001_core.sql','0004_account_foundation.sql'])
      sqlite.exec(readFileSync(new URL(`../migrations/${migration}`,import.meta.url),'utf8'));
    const now=Date.now(),token='A'.repeat(43),customer='customer',agent='agent';
    const customerWorkspace='f3b36bc0-8775-4d62-8191-3154c0641111';
    const agentWorkspace='1a712774-0121-4cdd-94c6-38e6c1392222';
    for(const id of [customer,agent])sqlite.prepare('INSERT INTO accounts(id,created_at,updated_at) VALUES(?,?,?)').run(id,now,now);
    for(const id of [customerWorkspace,agentWorkspace])sqlite.prepare('INSERT INTO account_workspaces(id,name,created_at) VALUES(?,?,?)').run(id,id,now);
    sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,created_at) VALUES(?,?,?,?)")
      .run(customerWorkspace,customer,'OWNER',now);
    sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,created_at) VALUES(?,?,?,?)")
      .run(agentWorkspace,agent,'OWNER',now);
    sqlite.prepare(`INSERT INTO account_sessions(token_hash,account_id,csrf_hash,created_at,last_seen_at,expires_at)
      VALUES(?,?,?,?,?,?)`).run(await sha256Hex(token),customer,await sha256Hex('B'.repeat(43)),now,now,now+60_000);
    sqlite.prepare(`INSERT INTO cases(workspace_id,id,title,scenario,description,lesson,created_at)
      VALUES(?,'CASE-001','Customer case','TEST','Private','Lesson',?)`).run(customerWorkspace,now);
    sqlite.prepare(`INSERT INTO cases(workspace_id,id,title,scenario,description,lesson,created_at)
      VALUES(?,'CASE-001','Agent case','TEST','Private','Lesson',?)`).run(agentWorkspace,now);
    const db={prepare(sql){return {bind(...args){const stmt=sqlite.prepare(sql);return {
      first:async()=>stmt.get(...args)??null,all:async()=>({results:stmt.all(...args)}),
    };}};}};
    const root='https://api.example.test/api/account/workspaces';
    const request=(wid,authenticated=true)=>new Request(`${root}/${wid}/cases`,{
      headers:authenticated?{cookie:`__Host-RTACCOUNT=${token}`}:{}});
    const authorized=await handleAccountCaseRoute(request(customerWorkspace),db);
    assert.equal(authorized.status,200);
    assert.deepEqual((await authorized.json()).cases.map(x=>x.title),['Customer case']);
    assert.equal((await handleAccountCaseRoute(request(agentWorkspace),db)).status,404);
    assert.equal((await handleAccountCaseRoute(request(customerWorkspace,false),db)).status,401);
    sqlite.prepare(`INSERT INTO workspace_memberships(workspace_id,account_id,role,created_at)
      VALUES(?,?,?,?)`).run(agentWorkspace,customer,'VIEWER',now);
    const granted=await handleAccountCaseRoute(request(agentWorkspace),db);
    assert.equal(granted.status,200);
    assert.deepEqual((await granted.json()).cases.map(x=>x.title),['Agent case']);
    const evidenceUrl=`${root}/${agentWorkspace}/cases/CASE-001/evidence`;
    const writeHeaders={cookie:`__Host-RTACCOUNT=${token}`,origin:'https://api.example.test',
      'x-csrf-token':'B'.repeat(43)};
    assert.equal((await handleAccountCaseRoute(new Request(evidenceUrl,{method:'POST',headers:writeHeaders,
      body:JSON.stringify({})}),db)).status,403,'viewer must not write');
    const customerWrite=`${root}/${customerWorkspace}/cases/CASE-001/evidence`;
    assert.equal((await handleAccountCaseRoute(new Request(customerWrite,{method:'POST',
      headers:{cookie:`__Host-RTACCOUNT=${token}`,origin:'https://api.example.test'},body:'{}'}),db)).status,403,'csrf required');
    assert.equal((await handleAccountCaseRoute(new Request(customerWrite,{method:'POST',
      headers:writeHeaders,body:'{}'}),db)).status,400,'invalid evidence rejected');
  }finally{sqlite.close();}
});
