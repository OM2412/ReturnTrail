package com.returntrail.investigation;

import com.returntrail.graph.CaseEvidenceRepository.EvidenceRow;
import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;

/** Identity of the immutable source set reviewed for one pickup. */
public final class EvidenceRevision {
    private EvidenceRevision() {}
    public static String of(List<EvidenceRow> evidence) {
        var rows = evidence.stream().distinct().sorted(Comparator.comparing(EvidenceRow::caseId)
                .thenComparing(EvidenceRow::pickupId).thenComparing(EvidenceRow::evidenceId)
                .thenComparing(EvidenceRow::claimedStatus).thenComparing(EvidenceRow::statement)
                .thenComparing(EvidenceRow::originalText)).toList();
        try {
            var bytes = new ByteArrayOutputStream();
            var output = new DataOutputStream(bytes);
            for (var row : rows) for (String value : List.of(row.caseId(), row.pickupId(), row.evidenceId(),
                    row.claimedStatus(), row.statement(), row.originalText())) {
                byte[] utf8 = value.getBytes(StandardCharsets.UTF_8);
                output.writeInt(utf8.length); output.write(utf8);
            }
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes.toByteArray()));
        } catch (Exception exception) { throw new IllegalStateException("Could not identify the source revision", exception); }
    }
}
