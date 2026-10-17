import test from "node:test";
import assert from "node:assert/strict";
import { supportDraft } from "../src/lib/supportDraft.js";
const snapshot = {
  caseId: "CASE-004", evidenceVersion: 2, workflowVersion: 3,
  evidence: [{ evidenceId: "DOC-007", pickupId: "PICKUP-004", statement: "Courier unavailable. <script>not code</script>" }],
  pendingFindings: [], clarifications: [{ status: "RESOLVED" }],
};
test("draft identifies the current case, preserves source text and does not equate no pending question with case resolution", () => {
  const draft = supportDraft(snapshot);
  assert.match(draft, /Subject: Clarification requested for CASE-004/);
  assert.match(draft, /\[DOC-007\] PICKUP-004: “Courier unavailable\. <script>not code<\/script>”/);
  assert.match(draft, /does not establish that the case is resolved/);
  assert.match(draft, /No message has been sent/);
  assert.match(draft, /FICTIONAL PRACTICE CASE/);
});
test("pending questions retain their specific evidence references and version context", () => {
  const draft = supportDraft({ ...snapshot, pendingFindings: [{ questionToAsk: "Please explain this difference.", evidence: [{ evidenceId: "DOC-007" }] }] });
  assert.match(draft, /Please explain this difference\. Sources: DOC-007/);
  assert.match(draft, /Evidence version 2; workflow version 3/);
});
