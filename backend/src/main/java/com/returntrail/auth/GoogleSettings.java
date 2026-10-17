package com.returntrail.auth;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
@Component
public record GoogleSettings(String clientId, String clientSecret) {
    public GoogleSettings(@Value("${returntrail.auth.google.client-id:}") String clientId,
                          @Value("${returntrail.auth.google.client-secret:}") String clientSecret) {
        this.clientId=clientId.trim(); this.clientSecret=clientSecret.trim();
    }
    public boolean configured(){return !clientId.isBlank() && !clientSecret.isBlank();}
}
