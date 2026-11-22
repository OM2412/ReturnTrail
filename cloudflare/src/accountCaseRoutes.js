import { resolveAccountSession,authorizeWorkspace } from './accountFoundation.js';
import { caseSnapshot } from './snapshot.js';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CASE=/^CASE-[0-9]{3}$/;
const send=(body,status=200)=>new Response(JSON.stringify(body),{status,
  headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});

function accountToken(request) {
  return request.headers.get('cookie')?.match(/(?:^|;\s*)__Host-RTACCOUNT=([A-Za-z0-9_-]{43})(?:;|$)/)?.[1]??null;
}

// This endpoint deliberately does not fall back to the guest workspace.
// All queries are parameterized and workspace-scoped; persona alone never
// grants access to another customer's cases.
export async function handleAccountCaseRoute(request,db) {
  const match=new URL(request.url).pathname.match(/^\/api\/account\/workspaces\/([^/]+)\/cases(?:\/([^/]+)\/snapshot)?$/);
  if (!match)return null;
  if (request.method!=='GET')return send({error:'Method not allowed'},405);
  const [,workspaceId,caseId]=match;
  if (!UUID.test(workspaceId)||(caseId&&!CASE.test(caseId)))return send({error:'Not found'},404);
  const token=accountToken(request);
  const current=token?await resolveAccountSession(db,token):null;
  if (!current)return send({error:'Authentication required'},401);
  if (!(await authorizeWorkspace(db,current.accountId,workspaceId,'VIEWER')))
    return send({error:'Workspace not found'},404);
  if (caseId) {
    const snapshot=await caseSnapshot(db,workspaceId,caseId);
    return snapshot?send(snapshot):send({error:'Case not found'},404);
  }
  const {results}=await db.prepare(`SELECT id AS caseId,title,scenario,description,lesson,
    evidence_version AS evidenceVersion,workflow_version AS workflowVersion
    FROM cases WHERE workspace_id=? ORDER BY id`).bind(workspaceId).all();
  return send({synthetic:true,count:results.length,cases:results});
}
