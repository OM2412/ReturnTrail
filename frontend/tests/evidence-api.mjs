import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const base = process.env.API_URL || "http://127.0.0.1:8085";
function client() {
  let cookie = "";
  return async (
    path,
    body,
    expected = 200,
    method = body === undefined ? "GET" : "POST",
  ) => {
    const headers = { "Content-Type": "application/json", Cookie: cookie };
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      const check = await fetch(base + "/api/auth/csrf", {
        headers: { Cookie: cookie },
      });
      assert.equal(check.status, 200);
      if (check.headers.has("set-cookie"))
        cookie = check.headers.get("set-cookie").split(";")[0];
      headers.Cookie = cookie;
      headers["X-CSRF-TOKEN"] = (await check.json()).token;
    }
    const response = await fetch(base + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.headers.has("set-cookie"))
      cookie = response.headers.get("set-cookie").split(";")[0];
    const text = await response.text();
    assert.equal(response.status, expected, `${method} ${path}: ${text}`);
    return text ? JSON.parse(text) : null;
  };
}
const a = client(),
  b = client(),
  c = "/api/cases/CASE-004";
const source = (version = 0, extra = {}) => ({
  pickupId: "PICKUP-004",
  sourceLabel: "Fictional API fixture",
  sourceType: "DEMO_NOTE",
  originalText:
    "Fictional reply: courier unavailable. Original context retained.",
  quote: "courier unavailable",
  claimedStatus: "COURIER_UNAVAILABLE",
  synthetic: true,
  expectedVersion: version,
  requestId: randomUUID(),
  ...extra,
});
const pass = (name) => console.log("PASS " + name);
await a("/api/guest-sessions", undefined, 200, "POST");
await b("/api/guest-sessions", undefined, 200, "POST");
const initial = await a(c + "/snapshot");
assert.equal(initial.pendingFindings.length, 0);
const old = initial.actions[0],
  payload = source(),
  saved = await a(c + "/evidence", payload);
assert.equal(saved.currentVersion, 1);
assert.equal((await a(c + "/evidence", payload)).created, false);
await a(c + "/evidence", { ...payload, quote: "courier" }, 409);
let snap = await a(c + "/snapshot");
assert.equal(snap.evidence.length, 3);
assert.equal(snap.pendingFindings.length, 1);
assert.equal(snap.actions[0].status, "RESOLVED");
pass(
  "Immutable import retry preserves one source; new evidence requires fresh review without rewriting history",
);
await a(
  c + "/actions/clarification",
  {
    actionId: old.actionId,
    note: "Old context",
    outcome: "EXPLANATION_PROVIDED",
    requestId: randomUUID(),
    evidenceRevision: old.evidenceRevision,
    expectedVersion: 1,
  },
  409,
);
const task = (await a(c + "/actions", undefined, 200, "POST")).actions[0];
assert.notEqual(task.actionId, old.actionId);
assert.equal(task.evidenceIds.length, 3);
const reply = {
  actionId: task.actionId,
  note: "Still unknown in this fictional demo.",
  outcome: "STILL_UNKNOWN",
  requestId: randomUUID(),
  evidenceRevision: task.evidenceRevision,
  expectedVersion: 1,
};
const note = await a(c + "/actions/clarification", reply);
assert.equal(note.status, "OPEN");
assert.equal((await a(c + "/snapshot")).pendingFindings.length, 1);
const explanation = {
  ...reply,
  note: "Fictional manual explanation; not independently verified.",
  outcome: "EXPLANATION_PROVIDED",
  requestId: randomUUID(),
};
await a(c + "/actions/clarification", explanation);
assert.equal((await a(c + "/snapshot")).pendingFindings.length, 0);
assert.deepEqual(await a(c + "/actions/clarification", reply), note);
await a(c + "/actions/clarification", { ...reply, note: "Changed retry" }, 409);
pass(
  "Revision checks reject stale tasks; unknown and explanation outcomes retain immutable note history",
);
await a(c + "/evidence", source(0), 409);
await a(c + "/evidence", source(1, { pickupId: "PICKUP-001" }), 409);
await a(c + "/evidence", source(1, { quote: "a paraphrase" }), 400);
await a(c + "/evidence", source(1, { synthetic: false }), 400);
await a(
  c + "/evidence",
  source(1, { originalText: "x".repeat(21000), quote: "x" }),
  413,
);
assert.equal((await a(c + "/snapshot")).evidence.length, 3);
pass(
  "Invalid ownership, stale version, paraphrase, missing fictional consent and oversized body cannot write",
);
const results = await Promise.allSettled([
  a(c + "/evidence", source(1)),
  a(c + "/evidence", source(1)),
]);
assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
assert.equal(
  results.filter((r) => r.status === "rejected" && r.reason.actual === 409)
    .length,
  1,
);
snap = await a(c + "/snapshot");
assert.equal(snap.evidenceVersion, 2);
assert.equal(snap.evidence.length, 4);
assert.deepEqual(await a(c + "/actions/clarification", reply), note);
pass(
  "Two concurrent imports allow one commit; earlier identical note retry remains safe",
);
const brief = await a(c + "/brief"),
  other = await b(c + "/snapshot");
assert.equal(other.evidence.length, 2);
assert.equal(other.pendingFindings.length, 0);
assert.equal(brief.snapshot.evidenceVersion, 2);
const record = brief.snapshot.evidence.find(
  (e) => e.evidenceId === saved.evidenceId,
);
assert.equal(record.originalText, payload.originalText);
assert.equal(record.statement, payload.quote);
const path = brief.snapshot.graph.paths.find(
  (p) => p.evidenceId === saved.evidenceId,
);
assert.equal(path.edgeKeys.length, 7);
assert.equal(path.nodeKeys.length, 7);
pass(
  "Fresh brief carries exact source and proof, isolated from a second guest",
);
await a("/api/guest-sessions", undefined, 204, "DELETE");
await b("/api/guest-sessions", undefined, 204, "DELETE");
console.log("5 API workflow groups passed; zero model calls.");
