package com.returntrail.api;

import com.returntrail.ai.CaseInvestigationAgent;
import com.returntrail.ai.CaseInvestigationAgent.InvestigationResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class CaseInvestigationController {

    private static final Logger log =
            LoggerFactory.getLogger(CaseInvestigationController.class);

    private final CaseInvestigationAgent agent;

    public CaseInvestigationController(CaseInvestigationAgent agent) {
        this.agent = agent;
        log.info("INVESTIGATION DIAGNOSTICS V2 ENABLED");
    }

    @PostMapping("/api/cases/CASE-001/investigate")
    public InvestigationResponse investigate() {
        try {
            return agent.investigate();
        } catch (RuntimeException exception) {
            if (exception instanceof IllegalStateException) {
                log.warn("Case investigation failed: {} reason={}",
                        exception.getClass().getSimpleName(),
                        exception.getMessage());
            } else if (exception instanceof RestClientResponseException upstream) {
                log.warn("Case investigation failed: {} providerStatus={}",
                        exception.getClass().getSimpleName(),
                        upstream.getStatusCode().value());
            } else {
                log.warn("Case investigation failed: {}",
                        exception.getClass().getSimpleName());
            }

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Investigation did not complete. Check backend logs.");
        }
    }
}
