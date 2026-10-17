package com.returntrail.auth;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.net.URI;
@Component
public class AuthSettings {
    private final String clientId, clientSecret, publicUrl;
    public AuthSettings(@Value("${returntrail.auth.github.client-id:}") String clientId,
                        @Value("${returntrail.auth.github.client-secret:}") String clientSecret,
                        @Value("${returntrail.public-url:http://127.0.0.1:5174}") String publicUrl) {
        this.clientId=clientId.trim(); this.clientSecret=clientSecret.trim();
        URI uri=URI.create(publicUrl.trim());
        boolean loopback="127.0.0.1".equals(uri.getHost()) || "localhost".equals(uri.getHost());
        if(uri.getHost()==null || uri.getUserInfo()!=null || uri.getQuery()!=null || uri.getFragment()!=null
                || !(uri.getPath().isEmpty() || uri.getPath().equals("/"))
                || !("https".equals(uri.getScheme()) || (loopback && "http".equals(uri.getScheme()))))
            throw new IllegalArgumentException("RETURNTRAIL_PUBLIC_URL must be an HTTPS origin (HTTP loopback is allowed locally).");
        this.publicUrl=publicUrl.trim().replaceAll("/$", "");
    }
    public boolean configured(){return !clientId.isBlank() && !clientSecret.isBlank();}
    public String clientId(){return clientId;}
    public String clientSecret(){return clientSecret;}
    public String redirectUri(){return redirectUri("github");}
    public String redirectUri(String provider){
        if(!java.util.Set.of("github","google").contains(provider))throw new IllegalArgumentException("Unsupported provider");
        return publicUrl+"/login/oauth2/code/"+provider;
    }
}
