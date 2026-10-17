package com.returntrail.session;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.*;
import java.nio.charset.StandardCharsets;

@Component
@Order(-70)
public class EvidenceBodyLimit extends OncePerRequestFilter {
    @Override protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"POST".equals(request.getMethod()) || !request.getServletPath().matches("/api/cases/CASE-[0-9]{3}/evidence");
    }
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)
            throws IOException,ServletException {
        byte[] body=request.getInputStream().readNBytes(20001);
        if(body.length>20000) {
            response.setStatus(413);response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Use a short synthetic text record (maximum request size: 20 KB).\"}");return;
        }
        chain.doFilter(new HttpServletRequestWrapper(request) {
            @Override public ServletInputStream getInputStream() {
                var input=new ByteArrayInputStream(body);
                return new ServletInputStream() {
                    public int read(){return input.read();}
                    public int read(byte[] b,int off,int len){return input.read(b,off,len);}
                    public boolean isFinished(){return input.available()==0;}
                    public boolean isReady(){return true;}
                    public void setReadListener(ReadListener listener){throw new IllegalStateException("Synchronous JSON endpoint");}
                };
            }
            @Override public BufferedReader getReader(){return new BufferedReader(new InputStreamReader(getInputStream(),StandardCharsets.UTF_8));}
        },response);
    }
}
