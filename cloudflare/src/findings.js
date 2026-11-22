// Mirrors PickupConflictDetector + EvidenceRevision (Java). No AI-generated verdicts.
const digest = globalThis.crypto.subtle;
const encoder = new TextEncoder();

// Java UUID.nameUUIDFromBytes uses MD5, not UUIDv5/SHA-1.
// This implementation operates on UTF-8 bytes with RFC 1321 little-endian words.
function md5(bytes) {
  const length = bytes.length;
  const padded = new Uint8Array(((length + 8) >>> 6) * 64 + 64);
  padded.set(bytes);
  padded[length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, (length * 8) >>> 0, true);
  view.setUint32(padded.length - 4, Math.floor(length / 0x20000000), true);
  const shifts = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  const table = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0);
  const state = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
  for (let offset = 0; offset < padded.length; offset += 64) {
    let [a,b,c,d] = state;
    for (let i = 0; i < 64; i++) {
      let f, g;
      if (i < 16) { f = (b & c) | (~b & d); g = i; }
      else if (i < 32) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16; }
      else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
      else { f = c ^ (b | ~d); g = (7 * i) % 16; }
      const n = (a + f + table[i] + view.getUint32(offset + 4 * g, true)) >>> 0;
      const shift = shifts[(i >>> 4) * 4 + (i % 4)];
      [a,d,c,b] = [d,c,b,(b + ((n << shift) | (n >>> (32 - shift)))) >>> 0];
    }
    state[0] = (state[0] + a) >>> 0;
    state[1] = (state[1] + b) >>> 0;
    state[2] = (state[2] + c) >>> 0;
    state[3] = (state[3] + d) >>> 0;
  }
  const out = new Uint8Array(16);
  const result = new DataView(out.buffer);
  state.forEach((word, i) => result.setUint32(i * 4, word, true));
  return out;
}

export function findingUuid(identity) {
  const bytes = md5(encoder.encode(identity));
  bytes[6] = (bytes[6] & 0x0f) | 0x30;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

export async function evidenceRevision(rows) {
  const fields = r => [r.caseId, r.pickupId, r.evidenceId, r.claimedStatus, r.statement, r.originalText];
  const unique = new Map(rows.map(row => [JSON.stringify(Object.values(row)), row]));
  const sorted = [...unique.values()].sort((a,b) => {
    const aa = fields(a), bb = fields(b);
    for (let i = 0; i < aa.length; i++) {
      if (aa[i] < bb[i]) return -1;
      if (aa[i] > bb[i]) return 1;
    }
    return 0;
  });
  const parts = [];
  for (const row of sorted) for (const value of fields(row)) {
    const bytes = encoder.encode(value);
    const size = new Uint8Array(4);
    new DataView(size.buffer).setUint32(0, bytes.length);
    parts.push(size, bytes);
  }
  const total = parts.reduce((n,p) => n + p.length, 0);
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) { joined.set(part, offset); offset += part.length; }
  const hash = new Uint8Array(await digest.digest("SHA-256", joined));
  return [...hash].map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function detectFindings(evidence) {
  const groups = new Map();
  for (const row of evidence) {
    if (!row.caseId || !row.pickupId || !row.evidenceId || !row.claimedStatus) continue;
    const key = `${row.caseId}|${row.pickupId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const findings = [];
  for (const key of [...groups.keys()].sort()) {
    const rows = groups.get(key);
    const hasCustomer = rows.some(r => r.claimedStatus === "CUSTOMER_CANCELLED");
    const hasCourier = rows.some(r => r.claimedStatus === "COURIER_UNAVAILABLE");
    const unknown = rows.find(r => r.claimedStatus === "UNKNOWN");
    if (!(hasCustomer && hasCourier) && !unknown) continue;
    const type = hasCustomer && hasCourier ? "PICKUP_REASON_DISAGREEMENT" : "PICKUP_CONTEXT_INCOMPLETE";
    const relevant = [...new Map(rows.map(r => [JSON.stringify(r),r])).values()]
      .sort((a,b) => a.evidenceId.localeCompare(b.evidenceId) || a.claimedStatus.localeCompare(b.claimedStatus));
    const first = type === "PICKUP_CONTEXT_INCOMPLETE" ? unknown : relevant[0];
    findings.push({
      findingId: findingUuid(`${first.caseId}|${first.pickupId}|${type}`),
      caseId: first.caseId, pickupId: first.pickupId, type, status: "REQUIRES_CLARIFICATION",
      summary: type === "PICKUP_REASON_DISAGREEMENT"
        ? "Records give different reasons for the same pickup failure."
        : "The pickup record does not include a failure reason.",
      questionToAsk: type === "PICKUP_REASON_DISAGREEMENT"
        ? `Please confirm why pickup ${first.pickupId} failed and explain the conflicting recorded reasons.`
        : `Please provide the missing recorded reason for pickup ${first.pickupId}.`,
      evidence: relevant, evidenceRevision: await evidenceRevision(relevant),
    });
  }
  return findings;
}
