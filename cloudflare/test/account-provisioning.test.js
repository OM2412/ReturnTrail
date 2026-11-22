import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {provisionAccountByAdmin,grantSupportWorkspaceAccess} from '../src/accountProvisioning.js';

function fixture() {
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON');
  for(const file of ['0004_account_foundation.sql','0006_account_personas.sql'])
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

test('admin provisioning creates isolated personas and preserves existing identities',async()=>{
  const {db,sqlite}=fixture();
  try {
    const customer=await provisionAccountByAdmin(db,{provider:'GOOGLE',subject:'customer-sub',persona:'CUSTOMER',workspaceName:'Customer Desk'});
    const agent=await provisionAccountByAdmin(db,{provider:'GOOGLE',subject:'agent-sub',persona:'SUPPORT_AGENT',workspaceName:'Agent Desk'});
    assert.notEqual(customer.accountId,agent.accountId);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM accounts').get().n,2);
    assert.equal(sqlite.prepare("SELECT persona FROM account_personas WHERE account_id=?").get(agent.accountId).persona,'SUPPORT_AGENT');
    const same=await provisionAccountByAdmin(db,{provider:'GOOGLE',subject:'customer-sub',persona:'SUPPORT_AGENT',workspaceName:'Wrong desk'});
    assert.deepEqual(same,{created:false,accountId:customer.accountId});
    assert.equal(sqlite.prepare("SELECT persona FROM account_personas WHERE account_id=?").get(customer.accountId).persona,'CUSTOMER');
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM accounts').get().n,2);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM workspace_memberships').get().n,2);
    await assert.rejects(()=>grantSupportWorkspaceAccess(db,{agentAccountId:customer.accountId,workspaceId:agent.workspaceId}),/support agent/);
    await grantSupportWorkspaceAccess(db,{agentAccountId:agent.accountId,workspaceId:customer.workspaceId});
    assert.equal(sqlite.prepare('SELECT role FROM workspace_memberships WHERE account_id=? AND workspace_id=?').get(agent.accountId,customer.workspaceId).role,'MEMBER');
    assert.equal(sqlite.prepare('SELECT role FROM workspace_memberships WHERE account_id=? AND workspace_id=?').get(agent.accountId,agent.workspaceId).role,'OWNER');
  }finally{sqlite.close();}
});

test('invalid provisioning does not mutate tables',async()=>{
  const {db,sqlite}=fixture();
  try {
    await assert.rejects(()=>provisionAccountByAdmin(db,{provider:'GOOGLE',subject:'a',persona:'ADMIN',workspaceName:'x'}),/Invalid/);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM accounts').get().n,0);
  }finally{sqlite.close();}
});
