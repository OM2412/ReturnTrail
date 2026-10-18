package com.returntrail.graph;

import java.net.ConnectException;
import java.net.UnknownHostException;
import javax.net.ssl.SSLHandshakeException;
import org.junit.jupiter.api.Test;
import redis.clients.jedis.exceptions.JedisConnectionException;
import static org.junit.jupiter.api.Assertions.*;

class GraphFailureDiagnosticsTests {
    @Test void includesSuppressedConnectionFailuresWithoutCredentialMessages() {
        var failure = new JedisConnectionException("redis://private-user:private-password@private-host");
        var connect = new ConnectException("private-password");
        connect.initCause(new UnknownHostException("private-host"));
        failure.addSuppressed(connect);
        failure.addSuppressed(new SSLHandshakeException("private certificate data"));
        String result = GraphFailureDiagnostics.types(failure);
        assertTrue(result.contains("JedisConnectionException"));
        assertTrue(result.contains("ConnectException"));
        assertTrue(result.contains("UnknownHostException"));
        assertTrue(result.contains("SSLHandshakeException"));
        assertFalse(result.contains("private"));
        assertFalse(result.contains("redis://"));
    }

    @Test void circularExceptionLinksTerminate() {
        var first = new IllegalStateException("secret");
        var second = new IllegalArgumentException("secret");
        first.initCause(second);
        second.initCause(first);
        assertEquals("IllegalStateException -> IllegalArgumentException", GraphFailureDiagnostics.types(first));
        assertEquals("UnknownFailure", GraphFailureDiagnostics.types(null));
    }
}
