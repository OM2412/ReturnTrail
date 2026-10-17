package com.returntrail.auth;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
/** Only the verified OAuth principal may select a saved account workspace. */
public record WorkspaceIdentity(String subject, String login, String displayName, String provider) {
    public WorkspaceIdentity(String subject,String login,String displayName){this(subject,login,displayName,"github");}
    public String key(){return provider+":"+subject;}
    public static WorkspaceIdentity from(Authentication authentication) {
        if(!(authentication instanceof OAuth2AuthenticationToken token) || !token.isAuthenticated()) return null;
        String provider=token.getAuthorizedClientRegistrationId();
        if("google".equals(provider)) {
            if(!(token.getPrincipal() instanceof org.springframework.security.oauth2.core.oidc.user.OidcUser oidc))return null;
            String subject=oidc.getSubject();
            if(subject==null || !subject.matches("[A-Za-z0-9_.-]{1,255}"))return null;
            return new WorkspaceIdentity(subject,"Google member",limited(oidc.getFullName(),"Google member"),"google");
        }
        if(!"github".equals(provider))return null;
        Object raw=token.getPrincipal().getAttribute("id");
        if(raw==null || !raw.toString().matches("[0-9]{1,20}")) return null;
        String login=limited(token.getPrincipal().getAttribute("login"), "GitHub member");
        return new WorkspaceIdentity(raw.toString(),login,limited(token.getPrincipal().getAttribute("name"),login));
    }
    private static String limited(Object value,String fallback) {
        String text=value==null?"":value.toString().trim();
        return text.isBlank()?fallback:text.substring(0,Math.min(80,text.length()));
    }
}
