package com.returntrail.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
public class GroqClient {

    private final RestClient client;
    private final String apiKey;
    private final String model;

    public GroqClient(
            @Value("${GROQ_API_KEY:}") String apiKey,
            @Value("${GROQ_MODEL:openai/gpt-oss-120b}") String model) {

        this.apiKey = apiKey;
        this.model = model;

        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();

        JdkClientHttpRequestFactory factory =
                new JdkClientHttpRequestFactory(httpClient);

        factory.setReadTimeout(Duration.ofSeconds(60));

        this.client = RestClient.builder()
                .baseUrl("https://api.groq.com/openai/v1")
                .requestFactory(factory)
                .build();
    }

    public String model() {
        return model;
    }

    public Map<String, Object> complete(Map<String, Object> request) {
        if (apiKey.isBlank()) {
            throw new IllegalStateException(
                    "GROQ_API_KEY is missing from the backend environment");
        }

        Map<String, Object> response = client.post()
                .uri("/chat/completions")
                .headers(headers -> headers.setBearerAuth(apiKey))
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {});

        if (response == null) {
            throw new IllegalStateException("Groq returned an empty response");
        }

        return response;
    }

    public String checkConnection() {
        Map<String, Object> response = complete(Map.of(
                "model", model,
                "messages", List.of(Map.of(
                        "role", "user",
                        "content", "Reply with exactly: ReturnTrail connection OK")),
                "reasoning_effort", "low",
                "max_completion_tokens", 512));

        Object choicesValue = response.get("choices");

        if (!(choicesValue instanceof List<?> choices) || choices.isEmpty()
                || !(choices.get(0) instanceof Map<?, ?> choice)
                || !(choice.get("message") instanceof Map<?, ?> message)
                || !(message.get("content") instanceof String content)
                || content.isBlank()) {
            throw new IllegalStateException("Groq response has no message content");
        }

        return content;
    }
}
