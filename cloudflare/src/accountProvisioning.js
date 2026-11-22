// Explicit trusted-admin customer provisioning only. Never call directly from
// public signup, OAuth callback, or an unverified request body.
import {prepareSeed} from './seed.js';
const PROVIDERS=new Set(['GOOGLE','GITHUB']);

export async function provisionCustomerAccountByAdmin(db,{provider,subject,workspaceName,now=Date.now()}) {
  if (!PROVIDERS.has(provider)||typeof subject!=='string'||!subject||subject.length>255||
      typeof workspaceName!=='string'||!workspaceName.trim()||workspaceName.length>100)
    throw new Error('Invalid provisioning request');
  const existing=await db.prepare(`SELECT account_id AS accountId FROM account_identities
    WHERE provider=? AND provider_subject=?`).bind(provider,subject).first();
  // Preserve existing accounts; never silently reassign an identity.
  if (existing)return {created:false,accountId:existing.accountId};
  const accountId=crypto.randomUUID(),workspaceId=crypto.randomUUID();
  // D1 batch is a transaction. Unique provider identity prevents two accounts
  // claiming the same identity even if two requests race.
  await db.batch([
    db.prepare('INSERT INTO accounts(id,created_at,updated_at) VALUES(?,?,?)').bind(accountId,now,now),
    db.prepare(`INSERT INTO account_identities(provider,provider_subject,account_id,linked_at)
      VALUES(?,?,?,?)`).bind(provider,subject,accountId,now),
    db.prepare('INSERT INTO account_workspaces(id,name,created_at) VALUES(?,?,?)')
      .bind(workspaceId,workspaceName.trim(),now),
    db.prepare(`INSERT INTO workspace_memberships(workspace_id,account_id,role,created_at)
      VALUES(?,?,?,?)`).bind(workspaceId,accountId,'OWNER',now),
    // Only fictional demo cases. A fresh account gets the same four known
    // scenarios as the original Java demo, atomically with its workspace.
    ...prepareSeed(db,workspaceId,now),
  ]);
  return {created:true,accountId,workspaceId,seededDemo:true};
}
