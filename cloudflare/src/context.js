import { caseSnapshot } from "./snapshot.js";
import { loadCaseEvidence,proof } from "./caseRead.js";
import { detectFindings,evidenceRevision } from "./findings.js";

const rule = finding => ({pickupId:finding.pickupId,type:finding.type,
  question:finding.questionToAsk,
  evidenceIds:[...new Set(finding.evidence.map(e=>e.evidenceId))].sort()});

function assessment(evidence,findings) {
  return {state:evidence.length===0 ? "NO_SOURCE_EVIDENCE" :
    findings.some(f=>f.type==="PICKUP_REASON_DISAGREEMENT") ? "SUPPORTED_DISAGREEMENT" :
    findings.length===0 ? "NO_SUPPORTED_FINDING" : "MISSING_CONTEXT",
    sourceCount:evidence.length,findingCount:findings.length,findings:findings.map(rule)};
}

export async function contextView(db,workspace,caseId,exclude="") {
  if (exclude.length>160) return {status:400,value:{error:"Source reference is too long"}};
  const snap=await caseSnapshot(db,workspace,caseId);
  if (!snap) return {status:404,value:{error:"Case not found"}};
  if (exclude && !snap.evidence.some(e=>e.evidenceId===exclude))
    return {status:404,value:{error:"Source is not part of this case"}};
  const graph=exclude ? await proofExcluding(db,workspace,caseId,exclude) : snap.graph;
  const previewFindings=await detectFindings(graph.evidence);
  const memories=[];
  for(const action of snap.actions) {
    const current=snap.evidence.filter(e=>e.pickupId===action.pickupId);
    const ids=[...new Set(current.map(e=>e.evidenceId))].sort();
    const reviewed=[...new Set(action.evidenceIds)].sort();
    const replies=snap.clarifications.filter(note=>note.actionId===action.actionId)
      .sort((a,b)=>b.recordedAt.localeCompare(a.recordedAt));
    memories.push({actionId:action.actionId,pickupId:action.pickupId,taskStatus:action.status,
      reviewedEvidenceIds:reviewed,currentEvidenceIds:ids,
      addedSinceReview:ids.filter(id=>!reviewed.includes(id)),
      noLongerPresent:reviewed.filter(id=>!ids.includes(id)),
      coversCurrentSourceSet:ids.length>0 && JSON.stringify(ids)===JSON.stringify(reviewed) &&
        action.evidenceRevision===await evidenceRevision(current),
      reviewedRevision:action.evidenceRevision,noteCount:replies.length,
      latestNoteAt:replies[0]?.recordedAt??null,latestOutcome:replies[0]?.outcome??null});
  }
  const signature=items=>items.map(f=>`${f.pickupId}|${f.type}`).sort().join(";");
  const after=await db.prepare(`SELECT evidence_version AS evidenceVersion,
    workflow_version AS workflowVersion FROM cases WHERE workspace_id=? AND id=?`)
    .bind(workspace,caseId).first();
  if (!after || after.evidenceVersion!==snap.evidenceVersion || after.workflowVersion!==snap.workflowVersion)
    return {status:409,value:{error:"Case changed during context read"}};
  return {status:200,value:{caseId,synthetic:true,method:"D1_READ_ONLY_CONTEXT",
    evidenceVersion:snap.evidenceVersion,workflowVersion:snap.workflowVersion,memories,
    current:assessment(snap.evidence,snap.findings),
    preview:{excludedEvidenceId:exclude||null,assessment:assessment(graph.evidence,previewFindings),
      ruleOutcomeChanged:signature(snap.findings)!==signature(previewFindings),graph},
    limitation:"Preview only. Excluding a source does not refute it, verify another claim, resolve a task or change saved data."}};
}

async function proofExcluding(db,workspace,caseId,excluded) {
  // Path construction is shared with the ordinary proof reader.
  // This counterfactual is read-only: no evidence row is deleted.
  const rows=await loadCaseEvidence(db,workspace,caseId,excluded);
  if (rows===null) return null;
  return proof(db,workspace,caseId,excluded);
}
