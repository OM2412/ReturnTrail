package com.returntrail.investigation;

import com.returntrail.graph.CaseActionRepository.ActionRow;
import com.returntrail.graph.CaseClarificationRepository.ClarificationRow;
import com.returntrail.graph.CaseEvidenceRepository.EvidenceRow;
import java.util.Comparator;
import java.util.List;

/** Explain stored graph REFERENCES edges against the current pickup's source set. */
public final class ContextCoverage {
    private ContextCoverage() {}
    public static List<MemoryCoverage> compare(List<EvidenceRow> evidence, List<ActionRow> actions,
                                              List<ClarificationRow> notes) {
        return actions.stream().map(action -> {
            var current = evidence.stream().filter(e -> e.pickupId().equals(action.pickupId())).toList();
            var ids = current.stream().map(EvidenceRow::evidenceId).distinct().sorted().toList();
            var reviewed = action.evidenceIds().stream().distinct().sorted().toList();
            var added = ids.stream().filter(id -> !reviewed.contains(id)).toList();
            var absent = reviewed.stream().filter(id -> !ids.contains(id)).toList();
            var replies = notes.stream().filter(n -> n.actionId().equals(action.actionId()))
                    .sorted(Comparator.comparing(ClarificationRow::recordedAt).reversed()).toList();
            boolean covers = !current.isEmpty() && ids.equals(reviewed)
                    && action.evidenceRevision().equals(EvidenceRevision.of(current));
            return new MemoryCoverage(action.actionId(), action.pickupId(), action.status(), reviewed,
                    ids, added, absent, covers, action.evidenceRevision(), replies.size(),
                    replies.isEmpty() ? null : replies.get(0).recordedAt(),
                    replies.isEmpty() ? null : replies.get(0).outcome());
        }).toList();
    }
    public record MemoryCoverage(String actionId, String pickupId, String taskStatus,
            List<String> reviewedEvidenceIds, List<String> currentEvidenceIds,
            List<String> addedSinceReview, List<String> noLongerPresent, boolean coversCurrentSourceSet,
            String reviewedRevision, int noteCount, String latestNoteAt, String latestOutcome) {}
}
