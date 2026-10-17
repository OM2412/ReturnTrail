package com.returntrail.api;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import java.io.IOException;
@Controller
public class DisabledLoginController {
    @GetMapping({"/oauth2/authorization/github","/oauth2/authorization/google"})
    public void disabled(HttpServletResponse response) throws IOException {
        response.setStatus(302);response.setHeader("Location","/signin?error=not_configured");
    }
}
