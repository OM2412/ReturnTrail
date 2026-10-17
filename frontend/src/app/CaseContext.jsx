import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";
const CaseContext = createContext(null);
const initial = {
  phase: "idle",
  data: null,
  cases: [],
  error: null,
  working: null,
  run: null,
  lastImport: null,
  needsRefresh: false,
};
function validate(data, caseId) {
  if (
    data.caseId !== caseId ||
    ![
      data.evidence,
      data.findings,
      data.actions,
      data.clarifications,
      data.pendingFindings,
      data.graph?.paths,
    ].every(Array.isArray)
  ) {
    throw new Error(
      "The case response was incomplete. Please refresh the case.",
    );
  }
  return data;
}
export function CaseProvider({ children }) {
  const { session: auth, refresh: refreshAuth } = useAuth();
  const [state, setState] = useState(initial);
  const inFlight = useRef(null);
  const activeCase = useRef("CASE-001");
  const catalogCache = useRef(null);
  const current = useRef(state);
  current.current = state;
  const transact = useCallback((name, job) => {
    if (inFlight.current) return inFlight.current;
    setState((old) => ({ ...old, working: name, error: null }));
    const promise = (async () => {
      try {
        await job();
        return true;
      } catch (error) {
        if (error.status === 401) catalogCache.current = null;
        setState((old) => ({
          ...old,
          phase: error.status === 401 ? "expired" : "error",
          data: error.status === 401 ? null : old.data,
          cases: error.status === 401 ? [] : old.cases,
          run: error.status === 401 ? null : old.run,
          error: {
            message: current.current.needsRefresh
              ? "The save completed, but the case could not be refreshed. Refresh before making another change."
              : error.message || "The request failed.",
            status: error.status,
            retryAfter: error.retryAfter,
          },
        }));
        return false;
      } finally {
        inFlight.current = null;
        setState((old) => ({ ...old, working: null }));
      }
    })();
    inFlight.current = promise;
    return promise;
  }, []);
  const load = useCallback(async (caseId) => {
    const [snapshot, catalog] = await Promise.all([
      api.snapshot(caseId),
      catalogCache.current
        ? Promise.resolve(catalogCache.current)
        : api.cases(),
    ]);
    const data = validate(snapshot, caseId);
    if (!Array.isArray(catalog.cases))
      throw new Error("The case library could not be read.");
    catalogCache.current = catalog;
    activeCase.current = caseId;
    setState((old) => ({
      ...old,
      phase: "ready",
      data,
      cases: catalog.cases,
      error: null,
      run: null,
      lastImport: old.data?.caseId === caseId ? old.lastImport : null,
      needsRefresh: false,
    }));
  }, []);
  const refresh = useCallback(
    (caseId = activeCase.current) => transact("refresh", () => load(caseId)),
    [transact, load],
  );
  const start = useCallback(
    () =>
      transact("start", async () => {
        const session = auth.authenticated
          ? { initializedNow: false }
          : await api.createSession();
        if (!auth.authenticated) await refreshAuth();
        if (session.initializedNow) catalogCache.current = null;
        if (session.initializedNow)
          setState((old) => ({ ...old, data: null, run: null, cases: [] }));
        await load("CASE-001");
      }),
    [transact, load, auth.authenticated, refreshAuth],
  );
  const reset = useCallback(
    () =>
      transact("reset", async () => {
        await api.endSession();
        catalogCache.current = null;
        setState((old) => ({ ...old, data: null, run: null, cases: [] }));
        await api.createSession();
        await load("CASE-001");
      }),
    [transact, load],
  );
  const investigate = useCallback(
    () =>
      transact("investigate", async () => {
        const id = activeCase.current;
        const run = await api.investigate(id);
        if (
          run.caseId !== id ||
          !Array.isArray(run.toolTrace) ||
          !Array.isArray(run.pendingFindings) ||
          typeof run.summary !== "string"
        ) {
          throw new Error(
            "The investigation response was incomplete. Refresh before retrying.",
          );
        }
        const data = validate(await api.snapshot(id), id);
        setState((old) => ({ ...old, phase: "ready", data, run, error: null }));
      }),
    [transact],
  );
  const reviewRules = useCallback(
    () => transact("reviewRules", async () => {
      const id = activeCase.current;
      await api.prepareRules(id);
      current.current = { ...current.current, needsRefresh: true };
      setState((old) => ({ ...old, run: null, needsRefresh: true }));
      const data = validate(await api.snapshot(id), id);
      setState((old) => ({ ...old, phase: "ready", data, run: null, error: null, needsRefresh: false }));
    }), [transact],
  );
  const clarify = useCallback(
    (actionId, note, outcome, requestId) =>
      transact("clarify", async () => {
        const id = activeCase.current;
        const snapshot = current.current.data;
        const action = snapshot.actions.find(
          (row) => row.actionId === actionId,
        );
        await api.clarify(
          id,
          actionId,
          note.trim(),
          outcome,
          requestId,
          action?.evidenceRevision,
          snapshot.evidenceVersion,
        );
        current.current = { ...current.current, needsRefresh: true };
        setState((old) => ({ ...old, run: null, needsRefresh: true }));
        const data = validate(await api.snapshot(id), id);
        setState((old) => ({
          ...old,
          phase: "ready",
          data,
          error: null,
          needsRefresh: false,
        }));
      }),
    [transact],
  );
  const ingest = useCallback(
    (body) =>
      transact("ingest", async () => {
        const id = activeCase.current;
        const receipt = await api.ingest(id, body);
        if (receipt.caseId !== id || typeof receipt.evidenceId !== "string")
          throw new Error(
            "The save response was incomplete. Refresh before retrying.",
          );
        // Commit acknowledgement survives a failed read so a saved record is never presented as unsaved.
        current.current = { ...current.current, needsRefresh: true };
        setState((old) => ({
          ...old,
          run: null,
          lastImport: { ...receipt, requestId: body.requestId },
          needsRefresh: true,
        }));
        const data = validate(await api.snapshot(id), id);
        setState((old) => ({
          ...old,
          phase: "ready",
          data,
          error: null,
          needsRefresh: false,
        }));
      }),
    [transact],
  );
  return (
    <CaseContext.Provider
      value={{ ...state, refresh, start, reset, investigate, reviewRules, clarify, ingest }}
    >
      {children}
    </CaseContext.Provider>
  );
}
// eslint-disable-next-line react-refresh/only-export-components
export function useCase() {
  const value = useContext(CaseContext);
  if (!value) throw new Error("CaseProvider is required");
  return value;
}
