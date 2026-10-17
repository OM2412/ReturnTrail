package com.returntrail.api;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
/** Production history-router fallback, limited to known app routes, never /api or OAuth callbacks. */
@Controller
public class SpaController {
    @GetMapping("/about")
    public String about(){return "forward:/index.html";}
    @GetMapping({"/signin","/login","/account","/cases","/case","/case/**"})
    public String app(HttpServletResponse response){
        response.setHeader("X-Robots-Tag","noindex, nofollow");
        return "forward:/index.html";
    }
}
