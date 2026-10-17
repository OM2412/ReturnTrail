export function supportDraft(snapshot) {
  const lines = [
    "FICTIONAL PRACTICE CASE — review before using any wording elsewhere.",
    `Subject: Clarification requested for ${snapshot.caseId}`,
    "",
    "Hello, please clarify the recorded pickup information below.",
    "These are recorded claims, not independently verified facts.",
    "",
    ...snapshot.evidence.map((row) => `[${row.evidenceId}] ${row.pickupId}: “${row.statement}”`),
    "",
    "Questions under the supported check:",
    ...(snapshot.pendingFindings.length
      ? snapshot.pendingFindings.map((finding) => `- ${finding.questionToAsk} Sources: ${finding.evidence.map((e) => e.evidenceId).join(", ")}.`)
      : ["No question is pending under the supported check. This does not establish that the case is resolved."]),
    "",
    `${snapshot.clarifications.length} manual note(s) are retained in the attached case brief. They are not independently verified.`,
    `Evidence version ${snapshot.evidenceVersion}; workflow version ${snapshot.workflowVersion}.`,
    "Please explain any conflicting records and provide the relevant supporting information.",
    "",
    "Prepared locally with ReturnTrail. No message has been sent and no refund decision has been made.",
  ];
  return lines.join("\n");
}
