package com.returntrail.session;

import com.falkordb.Driver;
import com.falkordb.GraphContextGenerator;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GuestGraphLifecycleTests {

    private final Driver driver = mock(Driver.class);
    private final GraphContextGenerator graph =
            mock(GraphContextGenerator.class);
    private final AtomicLong clock = new AtomicLong();

    private final String name = "returntrail_guest_" + "a".repeat(32);

    private final GuestGraphLifecycle lifecycle = new GuestGraphLifecycle(
            driver, clock::get, Duration.ofHours(2));

    @Test
    void expiredGraphWaitsForActiveRequestToFinish() {
        when(driver.listGraphs()).thenReturn(List.of(name));
        when(driver.graph(name)).thenReturn(graph);

        lifecycle.register(name);
        var lease = lifecycle.acquire(name);
        assertNotNull(lease);

        lifecycle.expire(name);
        assertNull(lifecycle.acquire(name));

        lifecycle.sweep();
        verify(graph, never()).deleteGraph();

        lease.close();
        lifecycle.sweep();

        verify(graph, times(1)).deleteGraph();
    }

    @Test
    void liveSessionGraphIsPreserved() {
        when(driver.listGraphs()).thenReturn(List.of(name));

        lifecycle.register(name);
        clock.set(Duration.ofHours(10).toNanos());

        lifecycle.sweep();

        verify(driver, never()).graph(anyString());
    }

    @Test
    void orphanGetsGracePeriodAndDevelopmentGraphIsExcluded() {
        when(driver.listGraphs()).thenReturn(List.of(name, "returntrail_dev"));
        when(driver.graph(name)).thenReturn(graph);

        lifecycle.sweep();
        verify(graph, never()).deleteGraph();

        clock.set(Duration.ofHours(2).toNanos() - 1);
        lifecycle.sweep();
        verify(graph, never()).deleteGraph();

        clock.incrementAndGet();
        lifecycle.sweep();

        verify(graph, times(1)).deleteGraph();
        verify(driver, never()).graph("returntrail_dev");
    }

    @Test
    void failedDeletionIsRetried() {
        when(driver.listGraphs()).thenReturn(List.of(name));
        when(driver.graph(name)).thenReturn(graph);
        when(graph.deleteGraph())
                .thenThrow(new IllegalStateException("Temporary failure"))
                .thenReturn("Graph removed");

        lifecycle.register(name);
        lifecycle.expire(name);

        lifecycle.sweep();
        lifecycle.sweep();

        verify(graph, times(2)).deleteGraph();
    }

    @Test
    void sharedGraphCannotBeRegisteredForCleanup() {
        assertThrows(IllegalArgumentException.class,
                () -> lifecycle.register("returntrail_dev"));

        lifecycle.expire("returntrail_dev");
        when(driver.listGraphs()).thenReturn(List.of("returntrail_dev"));

        lifecycle.sweep();

        verify(driver, never()).graph(anyString());
    }
}
