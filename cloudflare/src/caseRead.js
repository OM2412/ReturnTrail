const CASE_ID = /^CASE-[0-9]{3}$/;

const rowToEvidence = row => ({
  caseId: row.case_id,
  pickupId: row.pickup_id,
  claimedStatus: row.claimed_status,
  statement: row.statement,
  evidenceId: row.id,
  sourceType: row.source_type,
  sourceLabel: row.source_label,
  originalText: row.original_text,
  recordedAt: row.recorded_at,
  addedVersion: row.added_version,
  origin: row.origin,
});

export async function loadCaseEvidence(db, workspaceId, caseId, excluded = "") {
  if (!CASE_ID.test(caseId)) return null;
  const owner = await db.prepare("SELECT id FROM cases WHERE workspace_id = ? AND id = ?")
    .bind(workspaceId, caseId).first();
  if (!owner) return null;
  const { results } = await db.prepare(`SELECT * FROM evidence
    WHERE workspace_id = ? AND case_id = ? AND id <> ? ORDER BY id,statement_id`)
    .bind(workspaceId, caseId, excluded).all();
  return results;
}

export async function listEvidence(db, workspaceId, caseId) {
  const rows = await loadCaseEvidence(db, workspaceId, caseId);
  return rows === null ? null : rows.map(rowToEvidence);
}

export async function proof(db, workspaceId, caseId, excluded = "") {
  const rows = await loadCaseEvidence(db, workspaceId, caseId, excluded);
  if (rows === null) return null;
  const nodes = new Map();
  const edges = new Map();
  const paths = [];
  const node = (label, id) => ({ key: `${label}:${id}`, id, label });
  const edge = (from, to, type) => ({
    key: `${from.key}|${type}|${to.key}`,
    source: from.key, target: to.key, type,
  });
  for (const row of rows) {
    const [c,o,i,r,p,s,d] = [
      node("Case", row.case_id), node("Order", row.order_id),
      node("Item", row.item_id), node("ReturnRequest", row.return_id),
      node("PickupAttempt", row.pickup_id), node("SupportStatement", row.statement_id),
      node("EvidenceDocument", row.id),
    ];
    const pathNodes = [c,o,i,r,p,s,d];
    const pathEdges = [edge(c,o,"HAS_ORDER"),edge(o,i,"CONTAINS"),
      edge(c,r,"HAS_RETURN"),edge(r,i,"RETURNS"),edge(p,r,"ATTEMPTS"),
      edge(s,p,"ABOUT"),edge(s,d,"RECORDED_IN")];
    for (const n of pathNodes) nodes.set(n.key,n);
    for (const e of pathEdges) edges.set(e.key,e);
    paths.push({ evidenceId: row.id, statementId: row.statement_id,
      pickupId: row.pickup_id, sourceType: row.source_type,
      nodeKeys: pathNodes.map(n=>n.key), edgeKeys: pathEdges.map(e=>e.key) });
  }
  return { caseId, source: "D1_QUERY_PATHS", evidence: rows.map(rowToEvidence),
    nodes: [...nodes.values()], edges: [...edges.values()], paths };
}
