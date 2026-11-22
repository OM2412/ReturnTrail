const UUID4 = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const CLAIMS = new Set(["CUSTOMER_CANCELLED", "COURIER_UNAVAILABLE", "UNKNOWN"]);
const SOURCES = new Set(["COURIER_STATUS", "SUPPORT_REPLY", "CUSTOMER_NOTE", "DEMO_NOTE"]);
const encoder = new TextEncoder();

export function validCapture(input) {
  return input && typeof input === "object" &&
    typeof input.pickupId === "string" && input.pickupId.trim().length > 0 && input.pickupId.length <= 100 &&
    typeof input.sourceLabel === "string" && input.sourceLabel.trim().length > 0 && input.sourceLabel.length <= 80 &&
    SOURCES.has(input.sourceType) &&
    typeof input.originalText === "string" && input.originalText.trim().length > 0 && input.originalText.length <= 4000 &&
    typeof input.quote === "string" && input.quote.trim().length > 0 && input.quote.length <= 500 &&
    CLAIMS.has(input.claimedStatus) && input.synthetic === true &&
    Number.isSafeInteger(input.expectedVersion) && input.expectedVersion >= 0 &&
    typeof input.requestId === "string" && UUID4.test(input.requestId);
}

export async function payloadHash(input) {
  const values = [input.pickupId,input.sourceLabel.trim(),input.sourceType,
    input.originalText,input.quote,input.claimedStatus];
  const parts = [];
  for (const value of values) {
    const bytes = encoder.encode(value);
    const length = new Uint8Array(4);
    new DataView(length.buffer).setUint32(0,bytes.length);
    parts.push(length,bytes);
  }
  const joined = new Uint8Array(parts.reduce((size,p)=>size+p.length,0));
  let offset=0;
  for (const part of parts) { joined.set(part,offset);offset+=part.length; }
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256",joined));
  return [...hash].map(byte=>byte.toString(16).padStart(2,"0")).join("");
}

export async function captureEvidence(db,workspace,caseId,input) {
  if (!validCapture(input)) return { status:400,value:{error:"Invalid synthetic evidence input"} };
  if (!input.originalText.includes(input.quote))
    return { status:400,value:{error:"Supporting quote must appear exactly in original text"} };
  const caseRow = await db.prepare(`SELECT evidence_version AS evidenceVersion FROM cases
    WHERE workspace_id=? AND id=?`).bind(workspace,caseId).first();
  if (!caseRow) return {status:404,value:{error:"Case not found"}};
  const id = `DOC-${input.requestId}`;
  const hash = await payloadHash(input);
  const existing = await db.prepare(`SELECT payload_hash,added_version,recorded_at FROM evidence
    WHERE workspace_id=? AND case_id=? AND id=?`).bind(workspace,caseId,id).first();
  const receipt = (row,created,currentVersion) => ({caseId,evidenceId:id,pickupId:input.pickupId,
    addedVersion:row.added_version,currentVersion,recordedAt:row.recorded_at,created});
  if (existing) return existing.payload_hash===hash
    ? {status:200,value:receipt(existing,false,caseRow.evidenceVersion)}
    : {status:409,value:{error:"Request ID already used for different evidence"}};
  const pickup = await db.prepare(`SELECT order_id,item_id,return_id FROM evidence
    WHERE workspace_id=? AND case_id=? AND pickup_id=? LIMIT 1`)
    .bind(workspace,caseId,input.pickupId).first();
  if (!pickup) return {status:409,value:{error:"Pickup is not part of the case"}};
  const timestamp = new Date().toISOString();
  const [insertion] = await db.batch([
    db.prepare(`INSERT OR IGNORE INTO evidence
      (workspace_id,case_id,id,order_id,item_id,return_id,statement_id,pickup_id,
       source_label,source_type,original_text,quote,claimed_status,statement,
       recorded_at,added_version,origin,synthetic,created_at,payload_hash)
      SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'MANUAL_SYNTHETIC_EVIDENCE',1,?,?
      WHERE EXISTS (SELECT 1 FROM cases WHERE workspace_id=? AND id=? AND evidence_version=?)
        AND EXISTS (SELECT 1 FROM evidence WHERE workspace_id=? AND case_id=? AND pickup_id=?)
        AND (SELECT COUNT(*) FROM evidence WHERE workspace_id=? AND case_id=?) < 30`)
      .bind(workspace,caseId,id,pickup.order_id,pickup.item_id,pickup.return_id,
        `STATEMENT-${input.requestId}`,input.pickupId,input.sourceLabel.trim(),input.sourceType,
        input.originalText,input.quote,input.claimedStatus,input.quote,timestamp,
        input.expectedVersion+1,Date.now(),hash,
        workspace,caseId,input.expectedVersion,
        workspace,caseId,input.pickupId,workspace,caseId),
    db.prepare(`UPDATE cases SET evidence_version=evidence_version+changes(),
      workflow_version=workflow_version+changes() WHERE workspace_id=? AND id=?`)
      .bind(workspace,caseId),
  ]);
  const saved = await db.prepare(`SELECT payload_hash,added_version,recorded_at FROM evidence
    WHERE workspace_id=? AND case_id=? AND id=?`).bind(workspace,caseId,id).first();
  if (!saved || saved.payload_hash!==hash)
    return {status:409,value:{error:"Evidence changed, pickup unavailable, or 30-record limit reached"}};
  const after = await db.prepare(`SELECT evidence_version AS evidenceVersion FROM cases
    WHERE workspace_id=? AND id=?`).bind(workspace,caseId).first();
  return {status:200,value:receipt(saved,insertion.meta?.changes===1,after.evidenceVersion)};
}
