export const statusText = (status = "") => status.replaceAll("_", " ");
export const claimLabel = (status = "") =>
  ({
    CUSTOMER_CANCELLED: "Customer cancelled",
    COURIER_UNAVAILABLE: "Courier unavailable",
  })[status] || statusText(status);
export const plural = (count, singular, multiple = `${singular}s`) =>
  `${count} ${count === 1 ? singular : multiple}`;
export function pendingFindings(findings, clarifications) {
  const resolved = new Set(
    clarifications
      .filter((row) => row.status === "RESOLVED")
      .map((row) => row.findingId),
  );
  return findings.filter((row) => !resolved.has(row.findingId));
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
export function workflowEvents(actions, clarifications) {
  return [
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
      title: `Manual clarification recorded · task ${row.status}`,
      at: row.recordedAt,
      reference: row.actionId,
      body: row.note,
      to: "/case/tasks",
    })),
  ].sort((a, b) => (Date.parse(a.at) || 0) - (Date.parse(b.at) || 0));
}
