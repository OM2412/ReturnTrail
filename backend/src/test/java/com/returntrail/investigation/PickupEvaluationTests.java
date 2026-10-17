package com.returntrail.investigation;

import com.returntrail.graph.CaseEvidenceRepository.EvidenceRow;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Stream;
import static org.junit.jupiter.api.Assertions.*;

class PickupEvaluationTests {
    @TestFactory
    Stream<DynamicTest> labelledSyntheticCases() throws Exception {
        String text;
        try (var input = getClass().getResourceAsStream("/evaluation/pickup-scenarios.tsv")) {
            text = new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
        return text.lines().filter(line -> !line.startsWith("#") && !line.isBlank()).map(line -> {
            String[] parts = line.split("\t");
            return DynamicTest.dynamicTest(parts[0], () -> {
                List<EvidenceRow> rows = "-".equals(parts[2]) ? List.of() : Arrays.stream(parts[2].split(";")).map(entry -> {
                    var value = entry.split(":");
                    return new EvidenceRow("CASE-TEST", value[0], value[1], "Synthetic test statement", value[2]);
                }).toList();
                var findings = new PickupConflictDetector().detect(rows);
                if ("NONE".equals(parts[1])) assertTrue(findings.isEmpty());
                else { assertEquals(1, findings.size()); assertEquals(parts[1], findings.get(0).type()); }
            });
        });
    }
}
