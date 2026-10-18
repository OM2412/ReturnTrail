package com.returntrail.graph;

import java.util.ArrayDeque;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.LinkedHashSet;
import java.util.Set;

/** Log exception types only: driver messages can contain endpoints or credentials. */
public final class GraphFailureDiagnostics {
    private GraphFailureDiagnostics() {}

    public static String types(Throwable failure) {
        if (failure == null) return "UnknownFailure";
        var pending = new ArrayDeque<Throwable>();
        Set<Throwable> visited = Collections.newSetFromMap(new IdentityHashMap<>());
        var types = new LinkedHashSet<String>();
        pending.add(failure);
        while (!pending.isEmpty() && visited.size() < 16) {
            var current = pending.removeFirst();
            if (!visited.add(current)) continue;
            types.add(current.getClass().getSimpleName());
            if (current.getCause() != null && !visited.contains(current.getCause())) {
                pending.addLast(current.getCause());
            }
            for (var suppressed : current.getSuppressed()) {
                if (pending.size() >= 16) break;
                if (!visited.contains(suppressed)) pending.addLast(suppressed);
            }
        }
        return String.join(" -> ", types);
    }
}
