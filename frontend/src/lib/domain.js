export const statusText = (status = "") => status.replaceAll("_", " ");
export const claimLabel = (status = "") =>
  ({
    CUSTOMER_CANCELLED: "Customer cancelled",
    COURIER_UNAVAILABLE: "Courier unavailable",
    UNKNOWN: "Reason not recorded",
  })[status] || statusText(status);
export const plural = (count, singular, multiple = `${singular}s`) =>
  `${count} ${count === 1 ? singular : multiple}`;
export function pendingFindings(findings, clarifications) {
  const resolved = new Set(
    clarifications
      .filter((row) => row.status === "RESOLVED")
      .map((row) => `${row.findingId}|${row.evidenceRevision || ""}`),
  );
  return findings.filter(
    (row) => !resolved.has(`${row.findingId}|${row.evidenceRevision || ""}`),
  );
}
export function timestamp(value) {
  if (!value) return "Time unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Time unavailable"
    : date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
}
export function workflowEvents(actions, clarifications, evidence = []) {
  return [
    ...evidence
      .filter(
        (row) => row.recordedAt && row.origin === "MANUAL_SYNTHETIC_EVIDENCE",
      )
      .map((row) => ({
        id: `evidence-${row.evidenceId}`,
        kind: "evidence",
        title: "Synthetic source added",
        at: row.recordedAt,
        reference: row.evidenceId,
        body: row.sourceLabel,
        to: `/case/evidence?doc=${encodeURIComponent(row.evidenceId)}`,
        status: "SOURCE_ADDED",
        revision: row.addedVersion,
      })),
    ...actions.map((row) => ({
      id: `created-${row.actionId}`,
      kind: "task",
      title: "Follow-up task created",
      at: row.createdAt,
      reference: row.actionId,
      body: row.question,
      to: "/case/tasks",
    })),
    ...clarifications.map((row) => ({
      id: row.clarificationId,
      kind: "clarification",
      status: row.status,
      title: `Manual reply recorded · task ${row.status} at recording`,
      at: row.recordedAt,
      reference: row.actionId,
      body: row.note,
      to: "/case/tasks",
    })),
  ].sort((a, b) => (Date.parse(a.at) || 0) - (Date.parse(b.at) || 0));
}
