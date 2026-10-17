package com.returntrail.investigation;

import com.returntrail.graph.CaseClarificationRepository.ClarificationRow;
import com.returntrail.investigation.PickupConflictDetector.Finding;
import java.util.List;
import java.util.stream.Collectors;

public final class FindingPolicy {
    private FindingPolicy() {}
    public static List<Finding> pending(List<Finding> findings, List<ClarificationRow> notes) {
        var resolved = notes.stream().filter(n -> "RESOLVED".equals(n.status()))
                .map(n -> n.findingId() + "|" + n.evidenceRevision()).collect(Collectors.toSet());
        return findings.stream().filter(f -> !resolved.contains(f.findingId() + "|" + f.evidenceRevision())).toList();
    }
}
