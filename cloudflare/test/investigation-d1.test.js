import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../src/worker.js';
import {prepareSeed} from '../src/seed.js';

test('D1 investigation runs rules only, prepares idempotent tasks and requires CSRF',async()=>{
  const sqlite=new DatabaseSync(':memory:');
  try {
    sqlite.exec('PRAGMA foreign_keys=ON');
    for(const name of ['0001_core.sql','0002_workflow_parity.sql','0003_evidence_import.sql'])
      sqlite.exec(readFileSync(new URL(`../migrations/${name}`,import.meta.url),'utf8'));
    const DB={prepare(sql){return {bind(...args){const statement=sqlite.prepare(sql);return {
      sql,args,first:async()=>statement.get(...args)??null,
      all:async()=>({results:statement.all(...args)}),run:async()=>statement.run(...args),
    };}};},async batch(queries){sqlite.exec('BEGIN');try {
      const results=queries.map(q=>sqlite.prepare(q.sql).run(...q.args));
      sqlite.exec('COMMIT');return results.map(()=>({success:true}));
    }catch(error){sqlite.exec('ROLLBACK');throw error;}}};
    const now=Date.now(),session='5cd7ce19-fbdb-4296-a8c5-85ab3e24b707',csrf='1ac41952-53af-425b-951e-074e71903c82';
    sqlite.prepare('INSERT INTO guest_sessions(id,csrf_token,workspace_reference,created_at,expires_at) VALUES(?,?,?,?,?)')
      .run(session,csrf,'fixture',now,now+60_000);
    await DB.batch(prepareSeed(DB,session,now));
    const url='https://example.test/api/cases/CASE-001/investigate';
    const request=(headers={})=>new Request(url,{method:'POST',headers});
    assert.equal((await worker.fetch(request(),{DB})).status,401);
    assert.equal((await worker.fetch(request({cookie:`RTSESSION=${session}`}),{DB})).status,403);
    const auth={cookie:`RTSESSION=${session}`,origin:'https://example.test','x-csrf-token':csrf};
    const first=await worker.fetch(request(auth),{DB});
    assert.equal(first.status,200);
    const run=await first.json();
    assert.equal(run.modelRequests,0);
    assert.match(run.model,/deterministic/);
    assert.equal(run.caseId,'CASE-001');
    assert.equal(run.toolTrace.length,4);
    assert.ok(Array.isArray(run.pendingFindings));
    const count=sqlite.prepare('SELECT COUNT(*) AS n FROM case_actions WHERE workspace_id=?').get(session).n;
    const again=await worker.fetch(request(auth),{DB});
    assert.equal(again.status,200);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM case_actions WHERE workspace_id=?').get(session).n,count);
  }finally{sqlite.close();}
});
