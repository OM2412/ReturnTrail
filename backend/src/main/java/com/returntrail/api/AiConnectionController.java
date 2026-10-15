package com.returntrail.api;

import com.returntrail.ai.GroqClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class AiConnectionController {

    private static final Logger log =
            LoggerFactory.getLogger(AiConnectionController.class);

    private final GroqClient groq;

    public AiConnectionController(GroqClient groq) {
        this.groq = groq;
    }

    @PostMapping("/api/ai/check")
    public ConnectionResponse check() {
        try {
            String reply = groq.checkConnection();

            return new ConnectionResponse(
                    "GROQ",
                    groq.model(),
                    "ReturnTrail connection OK".equals(reply.trim()),
                    reply);
        } catch (RuntimeException exception) {
            log.warn("Groq connection check failed: {}",
                    exception.getClass().getSimpleName());

            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "AI connection failed. Check the backend environment and Groq account.");
        }
    }

    public record ConnectionResponse(
            String provider,
            String model,
            boolean expectedReply,
            String reply) {
    }
}
