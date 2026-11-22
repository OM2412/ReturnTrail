import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { prepareSeed } from "../src/seed.js";
import { listEvidence, proof } from "../src/caseRead.js";
import { caseSnapshot } from "../src/snapshot.js";
import { findingUuid, evidenceRevision } from "../src/findings.js";
import worker from "../src/worker.js";

test("real SQLite enforces workspace-scoped seed relationships", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec(readFileSync(new URL("../migrations/0001_core.sql", import.meta.url), "utf8"));
    sqlite.exec(readFileSync(new URL("../migrations/0002_workflow_parity.sql", import.meta.url), "utf8"));
    const adapter = {
      prepare(sql) {
        const stmt = sqlite.prepare(sql);
        return { bind: (...values) => ({
          run: () => stmt.run(...values),
          first: async () => stmt.get(...values) ?? null,
          all: async () => ({ results: stmt.all(...values) }),
        }) };
      },
    };
    for (const workspace of ["guest-a", "guest-b"]) {
      for (const statement of prepareSeed(adapter, workspace, Date.now())) statement.run();
    }
    const guestCookie = "11111111-1111-4111-8111-111111111111";
    for (const statement of prepareSeed(adapter, guestCookie, Date.now())) statement.run();
    sqlite.prepare(`INSERT INTO guest_sessions(id,csrf_token,workspace_reference,created_at,expires_at)
      VALUES(?,?,?,?,?)`).run(guestCookie,"csrf","public-reference",Date.now(),Date.now()+60000);
    // The session reference cannot grant access to another workspace.
    const response = await worker.fetch(new Request("https://example.com/api/cases/CASE-001/snapshot", {
      headers: { cookie: `RTSESSION=${guestCookie}` },
    }), { DB: adapter });
    assert.equal(response.status,200);
    assert.equal((await response.json()).assessment,"NEEDS_CLARIFICATION");
    const evidenceA = await listEvidence(adapter, "guest-a", "CASE-001");
    assert.deepEqual(evidenceA.map(e => e.evidenceId), ["DOC-001", "DOC-002"]);
    assert.equal((await listEvidence(adapter, "guest-b", "CASE-002")).length, 2);
    assert.equal(await listEvidence(adapter, "guest-c", "CASE-001"), null);
    const p = await proof(adapter, "guest-a", "CASE-001");
    assert.equal(p.paths.length, 2);
    assert.equal(p.nodes.length, 9);
    assert.equal(p.edges.length, 9);
    assert.equal(p.paths[0].nodeKeys[0], "Case:CASE-001");
    assert.equal(findingUuid("CASE-004|PICKUP-004|PICKUP_REASON_DISAGREEMENT"),
      "4443b749-d75b-3221-b6a5-77b4133e1afe");
    assert.equal(await evidenceRevision(await listEvidence(adapter,"guest-a","CASE-004")),
      "ed1fe2c8adc6dc84b2dd81874faa56a4a52890fff3055a940eceb91abba553bb");
    const snapshots = await Promise.all(["CASE-001","CASE-002","CASE-003","CASE-004"]
      .map(id => caseSnapshot(adapter,"guest-a",id)));
    assert.deepEqual(snapshots.map(s => s.assessment),
      ["NEEDS_CLARIFICATION","NO_DISAGREEMENT_DETECTED","MISSING_CONTEXT","FOLLOWUP_RECORDED"]);
    assert.deepEqual(snapshots.map(s => s.pendingFindings.length), [1,0,1,0]);
    assert.deepEqual(snapshots.map(s => s.findings.length), [1,0,1,1]);
    assert.equal(snapshots[3].actions[0].status,"RESOLVED");
    assert.equal(snapshots[3].clarifications[0].outcome,"EXPLANATION_PROVIDED");
    assert.equal(await caseSnapshot(adapter,"guest-c","CASE-001"),null);
    const count = (table, workspace) => sqlite.prepare(`SELECT COUNT(*) AS total FROM ${table} WHERE workspace_id = ?`).get(workspace).total;
    for (const workspace of ["guest-a", "guest-b"]) {
      assert.equal(count("cases", workspace), 4);
      assert.equal(count("evidence", workspace), 7);
      assert.equal(count("case_actions", workspace), 1);
      assert.equal(count("clarifications", workspace), 1);
    }
    assert.throws(() => sqlite.prepare("DELETE FROM cases WHERE workspace_id = ? AND id = ?").run("guest-a", "CASE-001"),
      /FOREIGN KEY constraint failed/);
  } finally {
    sqlite.close();
  }
});
