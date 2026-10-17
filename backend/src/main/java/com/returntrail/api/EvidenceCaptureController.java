package com.returntrail.api;

import com.returntrail.graph.CaseCatalogRepository;
import com.returntrail.graph.EvidenceCaptureRepository;
import com.returntrail.graph.EvidenceCaptureRepository.CaptureReceipt;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;

@RestController
public class EvidenceCaptureController {
    private final CaseCatalogRepository catalog; private final EvidenceCaptureRepository repository;
    public EvidenceCaptureController(CaseCatalogRepository catalog,EvidenceCaptureRepository repository) {
        this.catalog=catalog;this.repository=repository;
    }
    @PostMapping("/api/cases/{caseId}/evidence")
    public CaptureReceipt capture(@PathVariable String caseId,@Valid @RequestBody CaptureRequest request) {
        catalog.requireCase(caseId);
        if(!request.originalText().contains(request.quote())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "The supporting quote must appear exactly in the original text.");
        var receipt=repository.save(caseId,request.pickupId(),"DOC-"+request.requestId(),request.requestId(),
                request.sourceLabel().trim(),request.sourceType().name(),request.originalText(),request.quote(),
                request.claimedStatus().name(),payloadHash(request),request.expectedVersion(),Instant.now().toString());
        if(receipt==null) throw new ResponseStatusException(HttpStatus.CONFLICT,
                "The case changed, the pickup is unavailable, the reply reference was reused, or the 30-record limit was reached. Refresh and review before saving.");
        return receipt;
    }
    static String payloadHash(CaptureRequest r) {
        try {
            var bytes=new ByteArrayOutputStream();var out=new DataOutputStream(bytes);
            for(String field:List.of(r.pickupId(),r.sourceLabel().trim(),r.sourceType().name(),
                    r.originalText(),r.quote(),r.claimedStatus().name())) {
                byte[] value=field.getBytes(StandardCharsets.UTF_8);out.writeInt(value.length);out.write(value);
            }
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes.toByteArray()));
        } catch(Exception e) {throw new IllegalStateException("Could not identify evidence import",e);}
    }
    public enum Claim { CUSTOMER_CANCELLED, COURIER_UNAVAILABLE, UNKNOWN }
    public enum Source { COURIER_STATUS, SUPPORT_REPLY, CUSTOMER_NOTE, DEMO_NOTE }
    public record CaptureRequest(@NotBlank @Size(max=100) String pickupId,
        @NotBlank @Size(max=80) String sourceLabel,@NotNull Source sourceType,
        @NotBlank @Size(max=4000) String originalText,@NotBlank @Size(max=500) String quote,
        @NotNull Claim claimedStatus,@AssertTrue boolean synthetic,
        @NotNull @Min(0) Long expectedVersion,
        @NotBlank @Pattern(regexp="[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}") String requestId) {}
}
