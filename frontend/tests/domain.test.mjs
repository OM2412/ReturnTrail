import test from "node:test";
import assert from "node:assert/strict";
import { pendingFindings, workflowEvents } from "../src/lib/domain.js";
import { api, ApiError, resetSessionCheck } from "../src/lib/api.js";

test("resolution removes only its linked pending finding and preserves history", () => {
  const findings = [
    { findingId: "F1", status: "REQUIRES_CLARIFICATION" },
    { findingId: "F2", status: "REQUIRES_CLARIFICATION" },
  ];
  const result = pendingFindings(findings, [
    { findingId: "F1", status: "RESOLVED" },
    { findingId: "F2", status: "OPEN" },
  ]);
  assert.deepEqual(
    result.map((row) => row.findingId),
    ["F2"],
  );
  assert.equal(findings[0].status, "REQUIRES_CLARIFICATION");
});

test("unrelated clarification cannot suppress a finding", () => {
  assert.equal(
    pendingFindings(
      [{ findingId: "F1" }],
      [{ findingId: "OTHER", status: "RESOLVED" }],
    ).length,
    1,
  );
});

test("workflow events use saved timestamps and chronological order", () => {
  const events = workflowEvents(
    [
      {
        actionId: "A1",
        question: "Clarify",
        createdAt: "2026-10-16T01:00:00Z",
      },
    ],
    [
      {
        actionId: "A1",
        clarificationId: "N1",
        status: "RESOLVED",
        note: "Manual",
        recordedAt: "2026-10-16T02:00:00Z",
      },
    ],
  );
  assert.deepEqual(
    events.map((row) => row.kind),
    ["task", "clarification"],
  );
  assert.equal(events[0].at, "2026-10-16T01:00:00Z");
});

test("API sends same-origin credentials and never retries a failed write", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  resetSessionCheck();
  globalThis.fetch = async (_url, options) => {
    if (_url === "/api/auth/csrf")
      return new Response(
        JSON.stringify({ headerName: "X-CSRF-TOKEN", token: "test-token" }),
      );
    calls++;
    assert.equal(options.credentials, "same-origin");
    assert.equal(options.method, "POST");
    return new Response('{"error":"limited"}', {
      status: 429,
      headers: { "Retry-After": "300" },
    });
  };
  try {
    await assert.rejects(
      api.investigate(),
      (error) =>
        error instanceof ApiError &&
        error.status === 429 &&
        error.retryAfter === "300",
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test("API handles empty 204 response for ending a session", async () => {
  const original = globalThis.fetch;
  resetSessionCheck();
  globalThis.fetch = async (url) =>
    url === "/api/auth/csrf"
      ? new Response(
          JSON.stringify({ headerName: "X-CSRF-TOKEN", token: "test-token" }),
        )
      : new Response(null, { status: 204 });
  try {
    assert.equal(await api.endSession(), null);
  } finally {
    globalThis.fetch = original;
  }
});

test("API preserves a session-expiry status without creating a new session", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response('{"error":"expired"}', { status: 401 });
  };
  try {
    await assert.rejects(
      api.evidence(),
      (error) => error instanceof ApiError && error.status === 401,
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test("new source revision keeps the disagreement pending while preserving earlier reply", () => {
  const finding = { findingId: "F1", evidenceRevision: "new" };
  const old = { findingId: "F1", evidenceRevision: "old", status: "RESOLVED" };
  assert.deepEqual(pendingFindings([finding], [old]), [finding]);
  assert.deepEqual(
    pendingFindings([finding], [{ ...old, evidenceRevision: "new" }]),
    [],
  );
});

test("timeline includes source additions and keeps unknown replies OPEN", () => {
  const events = workflowEvents(
    [],
    [
      {
        actionId: "A",
        clarificationId: "N",
        status: "OPEN",
        note: "Unknown",
        recordedAt: "2026-10-17T02:00:00Z",
      },
    ],
    [
      {
        evidenceId: "D",
        sourceLabel: "Original note",
        recordedAt: "2026-10-17T01:00:00Z",
        origin: "MANUAL_SYNTHETIC_EVIDENCE",
        addedVersion: 1,
      },
    ],
  );
  assert.deepEqual(
    events.map((e) => e.kind),
    ["evidence", "clarification"],
  );
  assert.match(events[1].title, /OPEN at recording/);
  assert.equal(events[0].revision, 1);
});

test("session checks are shared across writes and renewed after logout", async () => {
  const original = globalThis.fetch;
  resetSessionCheck();
  let checks = 0,
    writes = 0;
  globalThis.fetch = async (url, options) => {
    if (url === "/api/auth/csrf")
      return new Response(
        JSON.stringify({
          headerName: "X-CSRF-TOKEN",
          token: `check-${++checks}`,
        }),
      );
    writes++;
    assert.equal(options.headers["X-CSRF-TOKEN"], `check-${checks}`);
    return url === "/api/auth/logout"
      ? new Response(null, { status: 204 })
      : new Response("{}");
  };
  try {
    await api.investigate();
    await api.investigate();
    assert.equal(checks, 1);
    await api.logout();
    await api.investigate();
    assert.equal(checks, 2);
    assert.equal(writes, 4);
  } finally {
    globalThis.fetch = original;
    resetSessionCheck();
  }
});

test("a rejected session check never retries the write automatically", async () => {
  const original = globalThis.fetch;
  resetSessionCheck();
  let writes = 0,
    checks = 0;
  globalThis.fetch = async (url) =>
    url === "/api/auth/csrf"
      ? (checks++,
        new Response(
          JSON.stringify({ headerName: "X-CSRF-TOKEN", token: "check" }),
        ))
      : (writes++, new Response('{"error":"expired check"}', { status: 403 }));
  try {
    await assert.rejects(api.investigate(), (e) => e.status === 403);
    assert.equal(writes, 1);
    await assert.rejects(api.investigate(), (e) => e.status === 403);
    assert.equal(checks, 2);
    assert.equal(writes, 2);
  } finally {
    globalThis.fetch = original;
    resetSessionCheck();
  }
});
