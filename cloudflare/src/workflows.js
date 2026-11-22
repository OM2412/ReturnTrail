import { caseSnapshot } from "./snapshot.js";

const actionResponse = (caseId, actions) => ({ caseId, synthetic: true, count: actions.length, actions });
const clarificationResponse = (caseId, clarifications) => ({ caseId, synthetic: true, count: clarifications.length, clarifications });

export async function readActions(db, workspace, caseId) {
  const snapshot = await caseSnapshot(db, workspace, caseId);
  return snapshot ? actionResponse(caseId, snapshot.actions) : null;
}

export async function readClarifications(db, workspace, caseId) {
  const snapshot = await caseSnapshot(db, workspace, caseId);
  return snapshot ? clarificationResponse(caseId, snapshot.clarifications) : null;
}

export async function createFollowups(db, workspace, caseId) {
  const snapshot = await caseSnapshot(db, workspace, caseId);
  if (!snapshot) return { status: 404, value: { error: "Case not found" } };
  const saved = [];
  for (const finding of snapshot.pendingFindings) {
    const actionId = `FOLLOWUP-${finding.findingId}-${finding.evidenceRevision.slice(0,16)}`;
    const createdAt = new Date().toISOString();
    // The insert and version update share one D1 batch transaction. If source
    // revision changed, no task is created; retries cannot duplicate it.
    const [insert] = await db.batch([
      db.prepare(`INSERT OR IGNORE INTO case_actions
        (workspace_id,case_id,id,status,evidence_revision,created_at,finding_id,pickup_id,question,evidence_ids,created_at_iso)
        SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS (
          SELECT 1 FROM cases WHERE workspace_id=? AND id=? AND evidence_version=?)`)
        .bind(workspace,caseId,actionId,"OPEN",finding.evidenceRevision,Date.now(),
          finding.findingId,finding.pickupId,finding.questionToAsk,
          JSON.stringify(finding.evidence.map(e=>e.evidenceId)),createdAt,
          workspace,caseId,snapshot.evidenceVersion),
      db.prepare(`UPDATE cases SET workflow_version=workflow_version+changes()
        WHERE workspace_id=? AND id=?`).bind(workspace,caseId),
    ]);
    const savedRow = await db.prepare(`SELECT * FROM case_actions
      WHERE workspace_id=? AND case_id=? AND id=?`).bind(workspace,caseId,actionId).first();
    if (!savedRow) return { status: 409, value: { error: "Evidence changed. Refresh before creating follow-ups." } };
    saved.push({ actionId:savedRow.id,status:savedRow.status,question:savedRow.question,
      createdAt:savedRow.created_at_iso,findingId:savedRow.finding_id,
      evidenceRevision:savedRow.evidence_revision,pickupId:savedRow.pickup_id,
      evidenceIds:JSON.parse(savedRow.evidence_ids) });
    // If an existing ID was returned, it is deliberately not counted as a new write.
    if (!insert.success) return { status:503, value:{ error:"Could not save follow-up" } };
  }
  return { status:200, value:actionResponse(caseId,saved) };
}

const UUID4 = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const REV = /^[a-f0-9]{64}$/;

export function validClarification(input) {
  return input && typeof input === "object" && typeof input.actionId === "string" &&
    input.actionId.trim().length > 0 && input.actionId.length <= 120 &&
    typeof input.note === "string" && input.note.trim().length > 0 && input.note.length <= 2000 &&
    ["EXPLANATION_PROVIDED","STILL_UNKNOWN"].includes(input.outcome) &&
    typeof input.requestId === "string" && UUID4.test(input.requestId) &&
    typeof input.evidenceRevision === "string" && REV.test(input.evidenceRevision) &&
    Number.isSafeInteger(input.expectedVersion) && input.expectedVersion >= 0;
}

export async function saveClarification(db, workspace, caseId, input) {
  if (!validClarification(input)) return { status:400, value:{ error:"Invalid clarification input" } };
  const snapshot = await caseSnapshot(db,workspace,caseId);
  if (!snapshot) return { status:404, value:{ error:"Case not found" } };
  const actionId = input.actionId.trim();
  const action = snapshot.actions.find(a=>a.actionId===actionId);
  if (!action) return { status:404, value:{ error:"Task not found in this case" } };
  const clarificationId = `CLARIFICATION-${actionId}-${input.requestId}`;
  const existing = snapshot.clarifications.find(c=>c.clarificationId===clarificationId);
  const note = input.note.trim();
  if (existing) return existing.note===note && existing.outcome===input.outcome &&
      existing.evidenceRevision===input.evidenceRevision
    ? { status:200, value:existing }
    : { status:409, value:{ error:"Reply reference already used for different contents" } };
  const finding = snapshot.findings.find(f=>f.findingId===action.findingId &&
    f.evidenceRevision===action.evidenceRevision);
  if (!finding || snapshot.evidenceVersion !== input.expectedVersion ||
    input.evidenceRevision !== action.evidenceRevision)
    return { status:409, value:{ error:"New evidence needs review. Refresh current follow-up" } };
  const createdAt = new Date().toISOString();
  await db.batch([
    db.prepare(`INSERT OR IGNORE INTO clarifications
      (workspace_id,case_id,id,action_id,note,outcome,request_id,created_at,finding_id,source,recorded_at_iso)
      SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS (
        SELECT 1 FROM case_actions a JOIN cases c ON a.workspace_id=c.workspace_id AND a.case_id=c.id
        WHERE a.workspace_id=? AND a.case_id=? AND a.id=? AND a.status='OPEN'
          AND a.evidence_revision=? AND c.evidence_version=?)`)
      .bind(workspace,caseId,clarificationId,actionId,note,input.outcome,input.requestId,
        Date.now(),action.findingId,"MANUAL_SYNTHETIC_CLARIFICATION",createdAt,
        workspace,caseId,actionId,input.evidenceRevision,input.expectedVersion),
    db.prepare(`UPDATE cases SET workflow_version=workflow_version+changes()
      WHERE workspace_id=? AND id=?`).bind(workspace,caseId),
    db.prepare(`UPDATE case_actions SET status='RESOLVED'
      WHERE workspace_id=? AND case_id=? AND id=? AND evidence_revision=?
        AND EXISTS (SELECT 1 FROM clarifications WHERE workspace_id=? AND case_id=?
          AND id=? AND outcome='EXPLANATION_PROVIDED')`)
      .bind(workspace,caseId,actionId,input.evidenceRevision,
        workspace,caseId,clarificationId),
  ]);
  const stored = await db.prepare(`SELECT * FROM clarifications WHERE workspace_id=? AND case_id=? AND id=?`)
    .bind(workspace,caseId,clarificationId).first();
  if (!stored) return { status:409, value:{ error:"Task changed or reply reference already used" } };
  if (stored.note!==note || stored.outcome!==input.outcome)
    return { status:409, value:{ error:"Reply reference already used for different contents" } };
  return { status:200, value:{actionId,findingId:action.findingId,
    status:input.outcome==="EXPLANATION_PROVIDED" ? "RESOLVED" : "OPEN",
    clarificationId,note,source:"MANUAL_SYNTHETIC_CLARIFICATION",recordedAt:stored.recorded_at_iso,
    evidenceRevision:input.evidenceRevision,outcome:input.outcome} };
}
