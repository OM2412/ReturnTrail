import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {provisionCustomerAccountByAdmin} from '../src/accountProvisioning.js';

function fixture() {
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON');
  for(const file of ['0001_core.sql','0002_workflow_parity.sql','0003_evidence_import.sql','0004_account_foundation.sql'])
    sqlite.exec(readFileSync(new URL(`../migrations/${file}`,import.meta.url),'utf8'));
  const prepare=(sql)=>({bind(...args){return {
    sql,args,first:async()=>sqlite.prepare(sql).get(...args)??null,
    run:async()=>sqlite.prepare(sql).run(...args),
  };}});
  const db={prepare,async batch(statements){sqlite.exec('BEGIN');try{
    const results=statements.map(x=>sqlite.prepare(x.sql).run(...x.args));
    sqlite.exec('COMMIT');return results;
  }catch(e){sqlite.exec('ROLLBACK');throw e;}}};
  return {db,sqlite};
}

test('admin provisioning creates isolated customer workspaces and preserves identities',async()=>{
  const {db,sqlite}=fixture();
  try {
    const customer=await provisionCustomerAccountByAdmin(db,{provider:'GOOGLE',subject:'customer-sub',workspaceName:'Customer Desk'});
    const otherCustomer=await provisionCustomerAccountByAdmin(db,{provider:'GOOGLE',subject:'second-customer',workspaceName:'Second Customer Desk'});
    assert.notEqual(customer.accountId,otherCustomer.accountId);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM accounts').get().n,2);
    const same=await provisionCustomerAccountByAdmin(db,{provider:'GOOGLE',subject:'customer-sub',workspaceName:'Wrong desk'});
    assert.deepEqual(same,{created:false,accountId:customer.accountId});
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM accounts').get().n,2);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM workspace_memberships').get().n,2);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM cases').get().n,8);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM evidence').get().n,14);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM case_actions').get().n,2);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM clarifications').get().n,2);
    assert.equal(sqlite.prepare('SELECT role FROM workspace_memberships WHERE account_id=? AND workspace_id=?').get(otherCustomer.accountId,otherCustomer.workspaceId).role,'OWNER');
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM workspace_memberships WHERE account_id=? AND workspace_id=?').get(otherCustomer.accountId,customer.workspaceId).n,0);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM cases WHERE workspace_id=?').get(customer.workspaceId).n,4);
  }finally{sqlite.close();}
});

test('invalid provisioning does not mutate tables',async()=>{
  const {db,sqlite}=fixture();
  try {
    await assert.rejects(()=>provisionCustomerAccountByAdmin(db,{provider:'GOOGLE',subject:'',workspaceName:'x'}),/Invalid/);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM accounts').get().n,0);
  }finally{sqlite.close();}
});
