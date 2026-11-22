import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { authorizeWorkspace, resolveAccountSession, sha256Hex } from '../src/accountFoundation.js';

function setup() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  sqlite.exec(readFileSync(new URL('../migrations/0004_account_foundation.sql', import.meta.url), 'utf8'));
  const db = { prepare(sql) { return { bind(...values) { const statement=sqlite.prepare(sql);return {
    first: async()=>statement.get(...values)??null,
  }; } }; } };
  const now = Date.now();
  for (const account of ['alice','bob']) sqlite.prepare('INSERT INTO accounts(id,created_at,updated_at) VALUES(?,?,?)').run(account,now,now);
  sqlite.prepare("INSERT INTO account_workspaces(id,name,created_at) VALUES('team-a','Team A',?)").run(now);
  sqlite.prepare("INSERT INTO account_workspaces(id,name,created_at) VALUES('team-b','Team B',?)").run(now);
  sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,created_at) VALUES('team-a','alice','OWNER',?)").run(now);
  sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,created_at) VALUES('team-a','bob','VIEWER',?)").run(now);
  sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,created_at) VALUES('team-b','bob','OWNER',?)").run(now);
  return {sqlite,db,now};
}

test('identity subjects cannot be linked to two accounts, even with matching email', () => {
  const {sqlite,now}=setup();
  try {
    sqlite.prepare('INSERT INTO account_identities(provider,provider_subject,account_id,email,linked_at) VALUES(?,?,?,?,?)')
      .run('GITHUB','subject-123','alice','common@example.invalid',now);
    assert.throws(()=>sqlite.prepare('INSERT INTO account_identities(provider,provider_subject,account_id,email,linked_at) VALUES(?,?,?,?,?)')
      .run('GITHUB','subject-123','bob','common@example.invalid',now),/UNIQUE constraint/);
    sqlite.prepare('INSERT INTO account_identities(provider,provider_subject,account_id,email,linked_at) VALUES(?,?,?,?,?)')
      .run('GOOGLE','subject-123','bob','common@example.invalid',now);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM account_identities').get().n,2);
  } finally { sqlite.close(); }
});

test('session tokens are stored by hash; expired, revoked and suspended sessions fail closed', async () => {
  const {sqlite,db,now}=setup();
  try {
    const token='A'.repeat(43), csrf='B'.repeat(43);
    const hash=await sha256Hex(token);
    assert.equal(hash.length,64);
    sqlite.prepare('INSERT INTO account_sessions(token_hash,account_id,csrf_hash,created_at,last_seen_at,expires_at) VALUES(?,?,?,?,?,?)')
      .run(hash,'alice',await sha256Hex(csrf),now,now,now+60000);
    assert.equal((await resolveAccountSession(db,token,now)).accountId,'alice');
    assert.equal(await resolveAccountSession(db,'not-a-valid-token',now),null);
    assert.equal(await resolveAccountSession(db,token,now+60001),null);
    sqlite.prepare("UPDATE accounts SET status='SUSPENDED' WHERE id='alice'").run();
    assert.equal(await resolveAccountSession(db,token,now),null);
    sqlite.prepare("UPDATE accounts SET status='ACTIVE' WHERE id='alice'").run();
    sqlite.prepare('UPDATE account_sessions SET revoked_at=? WHERE token_hash=?').run(now,hash);
    assert.equal(await resolveAccountSession(db,token,now),null);
  } finally { sqlite.close(); }
});

test('workspace membership enforces tenant boundaries and role permissions', async () => {
  const {sqlite,db}=setup();
  try {
    assert.equal(await authorizeWorkspace(db,'alice','team-a','OWNER'),true);
    assert.equal(await authorizeWorkspace(db,'alice','team-b','VIEWER'),false);
    assert.equal(await authorizeWorkspace(db,'bob','team-a','VIEWER'),true);
    assert.equal(await authorizeWorkspace(db,'bob','team-a','MEMBER'),false);
    assert.equal(await authorizeWorkspace(db,'bob','team-a','INVALID'),false);
    sqlite.prepare("UPDATE workspace_memberships SET status='REVOKED' WHERE account_id='bob' AND workspace_id='team-a'").run();
    assert.equal(await authorizeWorkspace(db,'bob','team-a','VIEWER'),false);
    sqlite.prepare("UPDATE account_workspaces SET status='SUSPENDED' WHERE id='team-b'").run();
    assert.equal(await authorizeWorkspace(db,'bob','team-b','OWNER'),false);
  } finally { sqlite.close(); }
});
