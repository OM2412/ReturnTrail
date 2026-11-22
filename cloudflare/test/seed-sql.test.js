import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { prepareSeed } from "../src/seed.js";
import { listEvidence, proof } from "../src/caseRead.js";
import { caseSnapshot } from "../src/snapshot.js";
import { findingUuid, evidenceRevision } from "../src/findings.js";
import worker from "../src/worker.js";
import { createFollowups,saveClarification } from "../src/workflows.js";
import { captureEvidence,payloadHash } from "../src/evidenceImport.js";
import { contextView } from "../src/context.js";

test("real SQLite enforces workspace-scoped seed relationships", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec(readFileSync(new URL("../migrations/0001_core.sql", import.meta.url), "utf8"));
    sqlite.exec(readFileSync(new URL("../migrations/0002_workflow_parity.sql", import.meta.url), "utf8"));
    sqlite.exec(readFileSync(new URL("../migrations/0003_evidence_import.sql", import.meta.url), "utf8"));
    const adapter = {
      prepare(sql) {
        const stmt = sqlite.prepare(sql);
        return { bind: (...values) => ({
          run: () => stmt.run(...values),
          first: async () => stmt.get(...values) ?? null,
          all: async () => ({ results: stmt.all(...values) }),
        }) };
      },
      async batch(statements) {
        sqlite.exec("BEGIN");
        try {
          const result = statements.map(statement => {
            const run = statement.run();
            return { success: true, meta: { changes: run.changes } };
          });
          sqlite.exec("COMMIT");
          return result;
        } catch(error) { sqlite.exec("ROLLBACK"); throw error; }
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
    const forbidden = await worker.fetch(new Request("https://example.com/api/cases/CASE-001/actions",{
      method:"POST",headers:{cookie:`RTSESSION=${guestCookie}`,origin:"https://evil.example",
        "x-csrf-token":"csrf"},
    }),{DB:adapter});
    assert.equal(forbidden.status,403);
    const createdOverHttp = await worker.fetch(new Request("https://example.com/api/cases/CASE-003/actions",{
      method:"POST",headers:{cookie:`RTSESSION=${guestCookie}`,origin:"https://example.com",
        "x-csrf-token":"csrf"},
    }),{DB:adapter});
    assert.equal(createdOverHttp.status,200);
    assert.equal((await createdOverHttp.json()).actions[0].status,"OPEN");
    const blockedReply = await worker.fetch(new Request("https://example.com/api/cases/CASE-003/actions/clarification",{
      method:"POST",headers:{cookie:`RTSESSION=${guestCookie}`,origin:"https://example.com",
        "x-csrf-token":"bad","content-type":"application/json"},body:JSON.stringify({}),
    }),{DB:adapter});
    assert.equal(blockedReply.status,403);
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
    const firstFollowups = await createFollowups(adapter,"guest-a","CASE-001");
    assert.equal(firstFollowups.status,200);
    assert.equal(firstFollowups.value.count,1);
    const followup = firstFollowups.value.actions[0];
    assert.equal(followup.status,"OPEN");
    assert.equal((await caseSnapshot(adapter,"guest-a","CASE-001")).workflowVersion,1);
    const repeatedFollowups = await createFollowups(adapter,"guest-a","CASE-001");
    assert.equal(repeatedFollowups.value.actions[0].actionId,followup.actionId);
    assert.equal((await caseSnapshot(adapter,"guest-a","CASE-001")).workflowVersion,1);
    const request = {actionId:followup.actionId,note:"Confirmed from synthetic support.",
      outcome:"EXPLANATION_PROVIDED",requestId:"12345678-1234-4123-8123-123456789abc",
      evidenceRevision:followup.evidenceRevision,expectedVersion:0};
    const invalid = await saveClarification(adapter,"guest-a","CASE-001",{...request,expectedVersion:1});
    assert.equal(invalid.status,409);
    const clarified = await saveClarification(adapter,"guest-a","CASE-001",request);
    assert.equal(clarified.status,200);
    assert.equal(clarified.value.status,"RESOLVED");
    const repeatedClarification = await saveClarification(adapter,"guest-a","CASE-001",request);
    assert.equal(repeatedClarification.status,200);
    const conflicting = await saveClarification(adapter,"guest-a","CASE-001",{...request,note:"Different"});
    assert.equal(conflicting.status,409);
    const afterClarification = await caseSnapshot(adapter,"guest-a","CASE-001");
    assert.equal(afterClarification.assessment,"FOLLOWUP_RECORDED");
    assert.equal(afterClarification.workflowVersion,2);
    assert.equal((await createFollowups(adapter,"guest-b","CASE-001")).value.count,1);
    assert.equal((await caseSnapshot(adapter,"guest-b","CASE-001")).assessment,"NEEDS_CLARIFICATION");
    const capture = {pickupId:"PICKUP-002-A",sourceLabel:"Manual observation",
      sourceType:"CUSTOMER_NOTE",originalText:"The customer cancelled pickup attempt A.",
      quote:"customer cancelled",claimedStatus:"CUSTOMER_CANCELLED",synthetic:true,
      expectedVersion:0,requestId:"abcdef12-1234-4123-8123-123456789abc"};
    assert.match(await payloadHash(capture),/^[a-f0-9]{64}$/);
    assert.equal((await captureEvidence(adapter,"guest-a","CASE-002",{...capture,quote:"unrelated"})).status,400);
    assert.equal((await captureEvidence(adapter,"guest-a","CASE-002",{...capture,pickupId:"OTHER"})).status,409);
    const receipt = await captureEvidence(adapter,"guest-a","CASE-002",capture);
    assert.equal(receipt.status,200);
    assert.equal(receipt.value.created,true);
    assert.equal(receipt.value.currentVersion,1);
    assert.equal((await caseSnapshot(adapter,"guest-a","CASE-002")).changes.latestEvidenceIds[0],
      `DOC-${capture.requestId}`);
    const replay = await captureEvidence(adapter,"guest-a","CASE-002",capture);
    assert.equal(replay.status,200);
    assert.equal(replay.value.created,false);
    assert.equal(replay.value.currentVersion,1);
    assert.equal((await captureEvidence(adapter,"guest-a","CASE-002",{...capture,originalText:"customer cancelled"})).status,409);
    assert.equal((await captureEvidence(adapter,"guest-a","CASE-002",{...capture,
      requestId:"abcdef12-1234-4123-8123-123456789abd"})).status,409);
    assert.equal((await caseSnapshot(adapter,"guest-b","CASE-002")).evidenceVersion,0);
    const context = await contextView(adapter,"guest-a","CASE-001","DOC-002");
    assert.equal(context.status,200);
    assert.equal(context.value.current.state,"SUPPORTED_DISAGREEMENT");
    assert.equal(context.value.preview.assessment.state,"NO_SUPPORTED_FINDING");
    assert.equal(context.value.preview.ruleOutcomeChanged,true);
    assert.equal(context.value.preview.graph.evidence.length,1);
    assert.equal((await caseSnapshot(adapter,"guest-a","CASE-001")).evidence.length,2);
    assert.equal((await contextView(adapter,"guest-a","CASE-001","NOT-THERE")).status,404);
    assert.equal((await contextView(adapter,"guest-c","CASE-001")).status,404);
    const count = (table, workspace) => sqlite.prepare(`SELECT COUNT(*) AS total FROM ${table} WHERE workspace_id = ?`).get(workspace).total;
    for (const workspace of ["guest-a", "guest-b"]) {
      assert.equal(count("cases", workspace), 4);
      assert.equal(count("evidence", workspace), workspace==="guest-a" ? 8 : 7);
      assert.equal(count("case_actions", workspace), workspace==="guest-a" ? 2 : 2);
      assert.equal(count("clarifications", workspace), workspace==="guest-a" ? 2 : 1);
    }
    assert.throws(() => sqlite.prepare("DELETE FROM cases WHERE workspace_id = ? AND id = ?").run("guest-a", "CASE-001"),
      /FOREIGN KEY constraint failed/);
  } finally {
    sqlite.close();
  }
});
