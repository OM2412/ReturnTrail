// Source of truth for these examples: backend/src/main/resources/graph/seed-demo-workspace.cypher.
// All content is fictional. The IDs are preserved for frontend/API contract parity.
export const DEMO_CASES = Object.freeze([
  ["CASE-001", "Pickup cancellation disagreement", "PICKUP_DISAGREEMENT",
    "Two records disagree about the same pickup.", "Compare records about the same attempt before asking for an explanation."],
  ["CASE-002", "Different attempts, different outcomes", "SEPARATE_ATTEMPTS",
    "Similar words, but two separate pickup attempts.", "Different attempts are kept separate. No supported disagreement is detected."],
  ["CASE-003", "The missing piece", "MISSING_CONTEXT",
    "A pickup failure was recorded without an explanation.", "An unknown reason needs context; it is not proof of customer or courier fault."],
  ["CASE-004", "A reply, with history kept", "SAVED_CLARIFICATION",
    "A synthetic manual reply is already attached to the follow-up.", "A resolved follow-up does not erase original records or verify the whole case."],
]);

export const DEMO_EVIDENCE = Object.freeze([
  ["CASE-001", "DOC-001", "PICKUP-001", "STATEMENT-001", "COURIER_STATUS", "CUSTOMER_CANCELLED", "Pickup cancelled by customer."],
  ["CASE-001", "DOC-002", "PICKUP-001", "STATEMENT-002", "SUPPORT_REPLY", "COURIER_UNAVAILABLE", "Pickup failed because the courier was unavailable."],
  ["CASE-002", "DOC-003", "PICKUP-002-A", "STATEMENT-003", "COURIER_STATUS", "CUSTOMER_CANCELLED", "The customer cancelled pickup attempt A."],
  ["CASE-002", "DOC-004", "PICKUP-002-B", "STATEMENT-004", "SUPPORT_REPLY", "COURIER_UNAVAILABLE", "No courier was available for pickup attempt B."],
  ["CASE-003", "DOC-005", "PICKUP-003", "STATEMENT-005", "COURIER_STATUS", "UNKNOWN", "Pickup failed. No reason was recorded."],
  ["CASE-004", "DOC-006", "PICKUP-004", "STATEMENT-006", "COURIER_STATUS", "CUSTOMER_CANCELLED", "Pickup cancelled by customer."],
  ["CASE-004", "DOC-007", "PICKUP-004", "STATEMENT-007", "SUPPORT_REPLY", "COURIER_UNAVAILABLE", "Pickup failed because the courier was unavailable."],
]);

export function prepareSeed(db, workspaceId, now) {
  const cases = DEMO_CASES.map(([id, title, scenario, description, lesson]) =>
    db.prepare(`INSERT INTO cases (workspace_id,id,title,scenario,description,lesson,created_at)
                VALUES (?,?,?,?,?,?,?)`)
      .bind(workspaceId, id, title, scenario, description, lesson, now));
  const evidence = DEMO_EVIDENCE.map(([caseId, id, pickupId, statementId, sourceType, claimedStatus, statement]) => {
    const suffix = caseId.slice(-3);
    return db.prepare(`INSERT INTO evidence
      (workspace_id,case_id,id,order_id,item_id,return_id,statement_id,pickup_id,
       source_label,source_type,original_text,quote,claimed_status,statement,synthetic,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?)`)
      .bind(workspaceId, caseId, id, `ORDER-${suffix}`, `ITEM-${suffix}`,
        `RETURN-${suffix}`, statementId, pickupId, id, sourceType, statement, statement,
        claimedStatus, statement, now);
  });
  // CASE-004 is the intentionally resolved synthetic example in the Java seed.
  const revision = "ed1fe2c8adc6dc84b2dd81874faa56a4a52890fff3055a940eceb91abba553bb";
  const findingId = "4443b749-d75b-3221-b6a5-77b4133e1afe";
  const actionId = `FOLLOWUP-${findingId}`;
  const action = db.prepare(`INSERT INTO case_actions
    (workspace_id,case_id,id,status,evidence_revision,created_at,finding_id,pickup_id,question,evidence_ids,created_at_iso)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(workspaceId, "CASE-004", actionId, "RESOLVED", revision,
      now, findingId, "PICKUP-004",
      "Please confirm why pickup PICKUP-004 failed and explain the conflicting recorded reasons.",
      JSON.stringify(["DOC-006", "DOC-007"]), "2026-10-15T09:00:00Z");
  const clarification = db.prepare(`INSERT INTO clarifications
    (workspace_id,case_id,id,action_id,note,outcome,request_id,created_at,finding_id,source,recorded_at_iso)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(workspaceId,"CASE-004",`CLARIFICATION-${actionId}`,
      actionId, "Seeded synthetic example: a manual reply reports that the courier was unavailable. Not independently verified.",
      "EXPLANATION_PROVIDED", "seeded", now, findingId,
      "SEEDED_SYNTHETIC_CLARIFICATION", "2026-10-15T09:15:00Z");
  return [...cases, ...evidence, action, clarification];
}
