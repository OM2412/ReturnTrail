package com.returntrail.ai;

import com.returntrail.graph.CaseActionRepository.ActionRow;
import com.returntrail.graph.CaseClarificationRepository.ClarificationRow;
import com.returntrail.graph.CaseEvidenceRepository.EvidenceRow;
import com.returntrail.investigation.PickupConflictDetector.Finding;

import java.util.List;

public final class CaseSummaryRenderer {

    private CaseSummaryRenderer() {
    }

    public static String render(
            List<EvidenceRow> evidence,
            List<Finding> findings,
            List<Finding> pendingFindings,
            List<ClarificationRow> clarifications,
            List<ActionRow> actions) {

        if (evidence.isEmpty()) {
            return "No source evidence was returned. This case cannot be assessed.";
        }

        StringBuilder text = new StringBuilder("Original evidence:\n");

        for (EvidenceRow row : evidence) {
            text.append("- ").append(row.evidenceId())
                    .append(": pickup ").append(row.pickupId())
                    .append("; recorded claim: ").append(row.claimedStatus())
                    .append(".\n");
        }

        text.append("\nHistorical disagreements: ")
                .append(findings.size()).append(".\n");

        if (!findings.isEmpty()) {
            text.append("These disagreements remain in the original evidence.\n");
        }

        if (!clarifications.isEmpty()) {
            text.append("\nSaved manual clarifications:\n");

            for (ClarificationRow row : clarifications) {
                text.append("- ").append(row.clarificationId())
                        .append(" is linked to follow-up task ")
                        .append(row.actionId())
                        .append("; task status: ").append(row.status())
                        .append(".\n");
            }

            text.append("Clarification contents are manually recorded and ")
                    .append("not independently verified. ")
                    .append("Task status does not establish whole-case resolution.\n");
        }

        text.append("\nPending follow-up findings: ")
                .append(pendingFindings.size()).append(".\n");

        for (Finding finding : pendingFindings) {
            text.append("- ").append(finding.questionToAsk()).append("\n");
        }

        if (actions.isEmpty()) {
            text.append("No follow-up task was prepared during this investigation.");
        } else {
            text.append("Follow-up tasks saved or reused during this investigation:\n");

            for (ActionRow action : actions) {
                text.append("- ").append(action.actionId())
                        .append("; status: ").append(action.status())
                        .append(".\n");
            }
        }

        return text.toString().trim();
    }
}
