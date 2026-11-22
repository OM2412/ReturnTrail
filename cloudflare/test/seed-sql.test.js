import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { prepareSeed } from "../src/seed.js";
import { listEvidence, proof } from "../src/caseRead.js";

test("real SQLite enforces workspace-scoped seed relationships", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec(readFileSync(new URL("../migrations/0001_core.sql", import.meta.url), "utf8"));
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
    const evidenceA = await listEvidence(adapter, "guest-a", "CASE-001");
    assert.deepEqual(evidenceA.map(e => e.evidenceId), ["DOC-001", "DOC-002"]);
    assert.equal((await listEvidence(adapter, "guest-b", "CASE-002")).length, 2);
    assert.equal(await listEvidence(adapter, "guest-c", "CASE-001"), null);
    const p = await proof(adapter, "guest-a", "CASE-001");
    assert.equal(p.paths.length, 2);
    assert.equal(p.nodes.length, 9);
    assert.equal(p.edges.length, 9);
    assert.equal(p.paths[0].nodeKeys[0], "Case:CASE-001");
    const count = (table, workspace) => sqlite.prepare(`SELECT COUNT(*) AS total FROM ${table} WHERE workspace_id = ?`).get(workspace).total;
    for (const workspace of ["guest-a", "guest-b"]) {
      assert.equal(count("cases", workspace), 4);
      assert.equal(count("evidence", workspace), 7);
    }
    assert.throws(() => sqlite.prepare("DELETE FROM cases WHERE workspace_id = ? AND id = ?").run("guest-a", "CASE-001"),
      /FOREIGN KEY constraint failed/);
  } finally {
    sqlite.close();
  }
});
