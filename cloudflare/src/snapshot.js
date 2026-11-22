import { proof } from "./caseRead.js";
import { detectFindings } from "./findings.js";

export async function caseSnapshot(db, workspaceId, caseId) {
  const info = await db.prepare(`SELECT id AS caseId,title,scenario,description,lesson,
    evidence_version AS evidenceVersion,workflow_version AS workflowVersion
    FROM cases WHERE workspace_id = ? AND id = ?`).bind(workspaceId,caseId).first();
  if (!info) return null;
  const graph = await proof(db,workspaceId,caseId);
  const evidence = graph.evidence;
  const findings = await detectFindings(evidence);
  const { results: actionRows } = await db.prepare(`SELECT * FROM case_actions
    WHERE workspace_id = ? AND case_id = ? ORDER BY id`).bind(workspaceId,caseId).all();
  const actions = actionRows.map(row => ({
    actionId: row.id, status: row.status, question: row.question, createdAt: row.created_at_iso,
    findingId: row.finding_id, evidenceRevision: row.evidence_revision, pickupId: row.pickup_id,
    evidenceIds: JSON.parse(row.evidence_ids),
  }));
  const { results: noteRows } = await db.prepare(`SELECT n.*,a.evidence_revision FROM clarifications n
    JOIN case_actions a ON a.workspace_id=n.workspace_id AND a.case_id=n.case_id AND a.id=n.action_id
    WHERE n.workspace_id = ? AND n.case_id = ? ORDER BY n.id`).bind(workspaceId,caseId).all();
  const clarifications = noteRows.map(row => ({
    actionId: row.action_id, findingId: row.finding_id,
    status: row.outcome === "EXPLANATION_PROVIDED" ? "RESOLVED" : "OPEN",
    clarificationId: row.id, note: row.note, source: row.source,
    recordedAt: row.recorded_at_iso, evidenceRevision: row.evidence_revision, outcome: row.outcome,
  }));
  const resolved = new Set(clarifications.filter(c => c.status === "RESOLVED")
    .map(c => `${c.findingId}|${c.evidenceRevision}`));
  const pendingFindings = findings.filter(f => !resolved.has(`${f.findingId}|${f.evidenceRevision}`));
  const assessment = evidence.length === 0 ? "NO_EVIDENCE" :
    pendingFindings.some(f => f.type === "PICKUP_CONTEXT_INCOMPLETE") ? "MISSING_CONTEXT" :
    pendingFindings.length ? "NEEDS_CLARIFICATION" :
    findings.length ? "FOLLOWUP_RECORDED" : "NO_DISAGREEMENT_DETECTED";
  const after = await db.prepare(`SELECT evidence_version AS evidenceVersion,
    workflow_version AS workflowVersion FROM cases WHERE workspace_id = ? AND id = ?`)
    .bind(workspaceId,caseId).first();
  if (!after || info.evidenceVersion !== after.evidenceVersion || info.workflowVersion !== after.workflowVersion)
    throw new Error("Case changed during snapshot");
  return { caseId, synthetic: true, caseInfo: info, assessment, evidence,
    findings, pendingFindings, actions, clarifications, graph,
    evidenceVersion: info.evidenceVersion, workflowVersion: info.workflowVersion,
    changes: {
      latestEvidenceIds: evidence.filter(e => e.addedVersion > 0 && e.addedVersion === info.evidenceVersion)
        .map(e => e.evidenceId),
      earlierTaskIds: actions.filter(a => findings.some(f => f.findingId === a.findingId &&
        f.evidenceRevision !== a.evidenceRevision)).map(a => a.actionId),
    },
  };
}
