package com.returntrail.session;

import com.falkordb.Driver;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.function.LongSupplier;

@Service
public class GuestGraphLifecycle {

    private static final Logger log =
            LoggerFactory.getLogger(GuestGraphLifecycle.class);

    private final Driver driver;
    private final LongSupplier clock;
    private final long orphanGraceNanos;
    private final Map<String, Entry> entries = new HashMap<>();

    @Autowired
    public GuestGraphLifecycle(Driver driver) {
        this(driver, System::nanoTime, Duration.ofHours(2));
    }

    GuestGraphLifecycle(
            Driver driver, LongSupplier clock, Duration orphanGrace) {
        this.driver = driver;
        this.clock = clock;
        this.orphanGraceNanos = orphanGrace.toNanos();
    }

    public static boolean isGuestGraph(String graph) {
        return graph != null
                && graph.matches("returntrail_guest_[a-f0-9]{32}");
    }

    public synchronized void register(String graph) {
        if (!isGuestGraph(graph)) {
            throw new IllegalArgumentException("Not a guest graph");
        }

        Entry entry = entries.computeIfAbsent(graph, ignored -> new Entry());
        entry.liveSession = true;
    }

    public synchronized Lease acquire(String graph) {
        if (!isGuestGraph(graph)) {
            return null;
        }

        Entry entry = entries.get(graph);

        if (entry == null || !entry.liveSession) {
            return null;
        }

        entry.activeRequests++;
        return new Lease(entry);
    }

    public synchronized void expire(String graph) {
        if (!isGuestGraph(graph)) {
            return;
        }

        Entry entry = entries.computeIfAbsent(graph, ignored -> new Entry());
        entry.liveSession = false;
        entry.deleteAfter = clock.getAsLong();
    }

    @Scheduled(
            initialDelayString = "${returntrail.cleanup.initial-delay-ms:60000}",
            fixedDelayString = "${returntrail.cleanup.delay-ms:60000}")
    public synchronized void sweep() {
        final HashSet<String> existing;

        try {
            existing = new HashSet<>(driver.listGraphs());
        } catch (RuntimeException exception) {
            log.warn("Guest graph scan failed: {}",
                    exception.getClass().getSimpleName());
            return;
        }

        long now = clock.getAsLong();

        for (String graph : existing) {
            if (isGuestGraph(graph) && !entries.containsKey(graph)) {
                Entry orphan = new Entry();
                orphan.deleteAfter = now + orphanGraceNanos;
                entries.put(graph, orphan);
            }
        }

        var iterator = entries.entrySet().iterator();

        while (iterator.hasNext()) {
            var candidate = iterator.next();
            Entry entry = candidate.getValue();

            if (entry.liveSession || entry.activeRequests > 0
                    || now - entry.deleteAfter < 0) {
                continue;
            }

            try {
                if (existing.contains(candidate.getKey())) {
                    driver.graph(candidate.getKey()).deleteGraph();
                    log.info("Deleted expired guest graph {}", candidate.getKey());
                }

                iterator.remove();
            } catch (RuntimeException exception) {
                log.warn("Guest graph deletion failed; will retry: {}",
                        exception.getClass().getSimpleName());
            }
        }
    }

    private static final class Entry {
        private boolean liveSession;
        private int activeRequests;
        private long deleteAfter;
    }

    public final class Lease implements AutoCloseable {

        private final Entry entry;
        private boolean closed;

        private Lease(Entry entry) {
            this.entry = entry;
        }

        @Override
        public void close() {
            synchronized (GuestGraphLifecycle.this) {
                if (!closed) {
                    entry.activeRequests--;
                    closed = true;
                }
            }
        }
    }
}
