import { resolveAccountSession,authorizeWorkspace,sha256Hex } from './accountFoundation.js';
import { caseSnapshot } from './snapshot.js';
import { listEvidence } from './caseRead.js';
import { captureEvidence } from './evidenceImport.js';

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
  const match=new URL(request.url).pathname.match(/^\/api\/account\/workspaces\/([^/]+)\/cases(?:\/([^/]+)\/(snapshot|evidence))?$/);
  if (!match)return null;
  if (!['GET','POST'].includes(request.method))return send({error:'Method not allowed'},405);
  const [,workspaceId,caseId,resource]=match;
  if (!UUID.test(workspaceId)||(caseId&&!CASE.test(caseId)))return send({error:'Not found'},404);
  const token=accountToken(request);
  const current=token?await resolveAccountSession(db,token):null;
  if (!current)return send({error:'Authentication required'},401);
  if (!(await authorizeWorkspace(db,current.accountId,workspaceId,'VIEWER')))
    return send({error:'Workspace not found'},404);
  if (request.method==='POST') {
    if (resource!=='evidence')return send({error:'Method not allowed'},405);
    if (!(await authorizeWorkspace(db,current.accountId,workspaceId,'MEMBER')))
      return send({error:'Write access denied'},403);
    if (request.headers.get('origin')!==new URL(request.url).origin)
      return send({error:'Forbidden origin'},403);
    const csrf=request.headers.get('x-csrf-token');
    if (!csrf||!/^[A-Za-z0-9_-]{43}$/.test(csrf)||await sha256Hex(csrf)!==current.csrfHash)
      return send({error:'Invalid CSRF token'},403);
    if (Number(request.headers.get('content-length'))>8192)
      return send({error:'Request too large'},413);
    let text,body;
    try {
      text=await request.text();
      if (new TextEncoder().encode(text).length>8192)return send({error:'Request too large'},413);
      body=JSON.parse(text);
    } catch {return send({error:'Malformed JSON'},400);}
    const saved=await captureEvidence(db,workspaceId,caseId,body);
    return send(saved.value,saved.status);
  }
  if (resource==='evidence') {
    const evidence=await listEvidence(db,workspaceId,caseId);
    return evidence===null?send({error:'Case not found'},404)
      :send({caseId,synthetic:true,source:'D1',count:evidence.length,evidence});
  }
  if (caseId) {
    const snapshot=await caseSnapshot(db,workspaceId,caseId);
    return snapshot?send(snapshot):send({error:'Case not found'},404);
  }
  const {results}=await db.prepare(`SELECT id AS caseId,title,scenario,description,lesson,
    evidence_version AS evidenceVersion,workflow_version AS workflowVersion
    FROM cases WHERE workspace_id=? ORDER BY id`).bind(workspaceId).all();
  return send({synthetic:true,count:results.length,cases:results});
}
