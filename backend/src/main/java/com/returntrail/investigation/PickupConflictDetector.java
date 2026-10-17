package com.returntrail.investigation;

import com.returntrail.graph.CaseEvidenceRepository.EvidenceRow;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

@Service
public class PickupConflictDetector {

    public List<Finding> detect(List<EvidenceRow> evidence) {
        Map<String, List<EvidenceRow>> groups = new TreeMap<>();

        for (EvidenceRow row : evidence) {
            if (row.caseId() == null || row.pickupId() == null
                    || row.evidenceId() == null || row.claimedStatus() == null) {
                continue;
            }

            String key = row.caseId() + "|" + row.pickupId();
            groups.computeIfAbsent(key, ignored -> new ArrayList<>()).add(row);
        }

        List<Finding> findings = new ArrayList<>();

        for (List<EvidenceRow> rows : groups.values()) {
            List<EvidenceRow> customerClaims = rows.stream()
                    .filter(r -> "CUSTOMER_CANCELLED".equals(r.claimedStatus()))
                    .toList();

            List<EvidenceRow> courierClaims = rows.stream()
                    .filter(r -> "COURIER_UNAVAILABLE".equals(r.claimedStatus()))
                    .toList();

            if (customerClaims.isEmpty() || courierClaims.isEmpty()) {
                var unknown = rows.stream().filter(r -> "UNKNOWN".equals(r.claimedStatus())).toList();
                if (!unknown.isEmpty()) {
                    var first = unknown.get(0);
                    String identity = first.caseId() + "|" + first.pickupId() + "|PICKUP_CONTEXT_INCOMPLETE";
                    findings.add(new Finding(UUID.nameUUIDFromBytes(identity.getBytes(StandardCharsets.UTF_8)).toString(),
                            first.caseId(), first.pickupId(), "PICKUP_CONTEXT_INCOMPLETE", "REQUIRES_CLARIFICATION",
                            "The pickup record does not include a failure reason.",
                            "Please provide the missing recorded reason for pickup " + first.pickupId() + ".",
                            rows.stream().distinct().sorted(java.util.Comparator.comparing(EvidenceRow::evidenceId)).toList()));
                }
                continue;
            }

            List<EvidenceRow> relevant = rows.stream()
                    .distinct()
                    .sorted(java.util.Comparator.comparing(EvidenceRow::evidenceId)
                            .thenComparing(EvidenceRow::claimedStatus))
                    .toList();

            EvidenceRow first = relevant.get(0);
            String identity = first.caseId() + "|" + first.pickupId()
                    + "|PICKUP_REASON_DISAGREEMENT";

            String findingId = UUID.nameUUIDFromBytes(
                    identity.getBytes(StandardCharsets.UTF_8)).toString();

            findings.add(new Finding(
                    findingId,
                    first.caseId(),
                    first.pickupId(),
                    "PICKUP_REASON_DISAGREEMENT",
                    "REQUIRES_CLARIFICATION",
                    "Records give different reasons for the same pickup failure.",
                    "Please confirm why pickup " + first.pickupId()
                            + " failed and explain the conflicting recorded reasons.",
                    relevant));
        }

        return List.copyOf(findings);
    }

    public record Finding(
            String findingId,
            String caseId,
            String pickupId,
            String type,
            String status,
            String summary,
            String questionToAsk,
            List<EvidenceRow> evidence, String evidenceRevision) {
        public Finding(String findingId, String caseId, String pickupId, String type, String status,
                String summary, String questionToAsk, List<EvidenceRow> evidence) {
            this(findingId, caseId, pickupId, type, status, summary, questionToAsk,
                    List.copyOf(evidence), EvidenceRevision.of(evidence));
        }
    }
}
