package com.returntrail.api;

import com.returntrail.graph.CaseCatalogRepository;
import com.returntrail.graph.EvidenceCaptureRepository;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class EvidenceCaptureControllerTests {
    private final CaseCatalogRepository catalog=mock(CaseCatalogRepository.class);
    private final EvidenceCaptureRepository repository=mock(EvidenceCaptureRepository.class);
    private final EvidenceCaptureController controller=new EvidenceCaptureController(catalog,repository);
    private EvidenceCaptureController.CaptureRequest request(String text,String quote,boolean synthetic,long version) {
        return new EvidenceCaptureController.CaptureRequest("P","Demo note",EvidenceCaptureController.Source.DEMO_NOTE,
                text,quote,EvidenceCaptureController.Claim.UNKNOWN,synthetic,version,"a8535329-e894-400b-b3bd-0ce6bcbb03b0");
    }
    @Test void aParaphraseCannotBePresentedAsAnExactQuote() {
        assertEquals(400,assertThrows(ResponseStatusException.class,()->controller.capture("C",request("No reason given.","reason missing",true,0))).getStatusCode().value());
        verifyNoInteractions(repository);
    }
    @Test void hashingCoversRawSourceButNotRetryVersion() {
        assertEquals(EvidenceCaptureController.payloadHash(request("No reason given.","No reason",true,0)),
                EvidenceCaptureController.payloadHash(request("No reason given.","No reason",true,9)));
        assertNotEquals(EvidenceCaptureController.payloadHash(request("No reason given.","No reason",true,0)),
                EvidenceCaptureController.payloadHash(request("No reason given. Extra context.","No reason",true,0)));
    }
    @Test void fictionalConfirmationAndSizeLimitsAreEnforced() {
        try(var factory=Validation.buildDefaultValidatorFactory()) {
            assertTrue(factory.getValidator().validate(request("Text","Text",false,0)).stream().anyMatch(v->v.getPropertyPath().toString().equals("synthetic")));
            assertTrue(factory.getValidator().validate(request("a".repeat(4001),"a",true,0)).stream().anyMatch(v->v.getPropertyPath().toString().equals("originalText")));
            assertTrue(factory.getValidator().validate(request("Text","Text",true,-1)).stream().anyMatch(v->v.getPropertyPath().toString().equals("expectedVersion")));
        }
    }
}
