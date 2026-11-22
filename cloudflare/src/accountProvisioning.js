// Explicit trusted-admin provisioning only. Never call directly from public
// signup, OAuth callback, or an unverified request body.
const PERSONAS=new Set(['CUSTOMER','SUPPORT_AGENT']);
const PROVIDERS=new Set(['GOOGLE','GITHUB']);

export async function provisionAccountByAdmin(db,{provider,subject,persona,workspaceName,now=Date.now()}) {
  if (!PROVIDERS.has(provider)||typeof subject!=='string'||!subject||subject.length>255||
      !PERSONAS.has(persona)||typeof workspaceName!=='string'||!workspaceName.trim()||workspaceName.length>100)
    throw new Error('Invalid provisioning request');
  const existing=await db.prepare(`SELECT account_id AS accountId FROM account_identities
    WHERE provider=? AND provider_subject=?`).bind(provider,subject).first();
  // Preserve existing customer/agent accounts; never silently change personas.
  if (existing)return {created:false,accountId:existing.accountId};
  const accountId=crypto.randomUUID(),workspaceId=crypto.randomUUID();
  // D1 batch is a transaction. Unique provider identity prevents two accounts
  // claiming the same identity even if two requests race.
  await db.batch([
    db.prepare('INSERT INTO accounts(id,created_at,updated_at) VALUES(?,?,?)').bind(accountId,now,now),
    db.prepare(`INSERT INTO account_identities(provider,provider_subject,account_id,linked_at)
      VALUES(?,?,?,?)`).bind(provider,subject,accountId,now),
    db.prepare('INSERT INTO account_personas(account_id,persona,created_at) VALUES(?,?,?)')
      .bind(accountId,persona,now),
    db.prepare('INSERT INTO account_workspaces(id,name,created_at) VALUES(?,?,?)')
      .bind(workspaceId,workspaceName.trim(),now),
    db.prepare(`INSERT INTO workspace_memberships(workspace_id,account_id,role,created_at)
      VALUES(?,?,?,?)`).bind(workspaceId,accountId,'OWNER',now),
  ]);
  return {created:true,accountId,workspaceId,persona};
}

// Workspace access for a support agent must be granted explicitly, not by
// becoming SUPPORT_AGENT or sharing an email domain.
export async function grantSupportWorkspaceAccess(db,{agentAccountId,workspaceId,now=Date.now()}) {
  if (typeof agentAccountId!=='string'||!agentAccountId||typeof workspaceId!=='string'||!workspaceId)
    throw new Error('Invalid agent grant');
  const target=await db.prepare(`SELECT p.persona FROM account_personas p
    JOIN accounts a ON a.id=p.account_id
    JOIN account_workspaces w ON w.id=?
    WHERE p.account_id=? AND a.status='ACTIVE' AND w.status='ACTIVE'`)
    .bind(workspaceId,agentAccountId).first();
  if (target?.persona!=='SUPPORT_AGENT')throw new Error('Active support agent and workspace required');
  return db.prepare(`INSERT INTO workspace_memberships(workspace_id,account_id,role,created_at)
    VALUES(?,?,?,?) ON CONFLICT(workspace_id,account_id) DO NOTHING`)
    .bind(workspaceId,agentAccountId,'MEMBER',now).run();
}
