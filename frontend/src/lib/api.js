let sessionCheck = null;
export function resetSessionCheck() {
  sessionCheck = null;
}
async function csrfHeader() {
  if (!sessionCheck)
    sessionCheck = request("/api/auth/csrf", { timeout: 15000 })
      .then((value) => {
        if (
          value?.headerName !== "X-CSRF-TOKEN" ||
          typeof value.token !== "string"
        )
          throw new ApiError(
            "The session check was incomplete. Refresh before retrying.",
          );
        return { [value.headerName]: value.token };
      })
      .catch((error) => {
        sessionCheck = null;
        throw error;
      });
  return sessionCheck;
}
export class ApiError extends Error {
  constructor(message, status = 0, retryAfter = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.retryAfter = retryAfter;
  }
}
async function request(path, { timeout = 450000, ...options } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const csrf =
      options.method && !["GET", "HEAD", "OPTIONS"].includes(options.method)
        ? await csrfHeader()
        : {};
    const response = await fetch(path, {
      ...options,
      credentials: "same-origin",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...csrf,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        throw new ApiError(
          "The server returned an unexpected response.",
          response.status,
        );
      }
    }
    if (!response.ok) {
      if ([401, 403].includes(response.status)) resetSessionCheck();
      const message =
        response.status === 401
          ? "Your workspace session has expired. Sign in again or start a fresh guest demo."
          : response.status === 429
            ? "The demo has reached its request limit. Please retry after the waiting period."
            : response.status >= 500
              ? "We could not complete this case request. Please try again in a moment."
              : data?.message ||
                data?.error ||
                `Request failed (${response.status}).`;
      throw new ApiError(
        message,
        response.status,
        response.headers.get("Retry-After"),
      );
    }
    if (
      path === "/api/auth/logout" ||
      (path === "/api/guest-sessions" && options.method === "DELETE")
    )
      resetSessionCheck();
    return data;
  } catch (error) {
    if (error.name === "AbortError")
      throw new ApiError(
        "The request timed out. An action may already have been saved; refresh the case before retrying.",
      );
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "We could not connect. Check your internet connection, then try again.",
    );
  } finally {
    clearTimeout(timer);
  }
}
const root = (caseId = "CASE-001") =>
  `/api/cases/${encodeURIComponent(caseId)}`;
export const api = {
  session: () => request("/api/auth/session", { timeout: 15000 }),
  logout: () => request("/api/auth/logout", { method: "POST", timeout: 15000 }),
  createSession: () =>
    request("/api/guest-sessions", { method: "POST", timeout: 45000 }),
  endSession: () =>
    request("/api/guest-sessions", { method: "DELETE", timeout: 45000 }),
  cases: () => request("/api/cases", { timeout: 45000 }),
  snapshot: (caseId) => request(`${root(caseId)}/snapshot`, { timeout: 45000 }),
  brief: (caseId) => request(`${root(caseId)}/brief`, { timeout: 45000 }),
  ingest: (caseId, body) =>
    request(`${root(caseId)}/evidence`, {
      method: "POST",
      body: JSON.stringify(body),
      timeout: 45000,
    }),
  context: (caseId, exclude = "") => request(`${root(caseId)}/context?exclude=${encodeURIComponent(exclude)}`, { timeout: 45000 }),
  prepareRules: (caseId) => request(`${root(caseId)}/actions`, { method: "POST", timeout: 45000 }),
  proof: (caseId) => request(`${root(caseId)}/proof`, { timeout: 45000 }),
  evidence: (caseId) => request(`${root(caseId)}/evidence`, { timeout: 45000 }),
  findings: (caseId) => request(`${root(caseId)}/findings`, { timeout: 45000 }),
  actions: (caseId) => request(`${root(caseId)}/actions`, { timeout: 45000 }),
  clarifications: (caseId) =>
    request(`${root(caseId)}/clarifications`, { timeout: 45000 }),
  investigate: (caseId) =>
    request(`${root(caseId)}/investigate`, { method: "POST" }),
  clarify: (
    caseId,
    actionId,
    note,
    outcome,
    requestId,
    evidenceRevision,
    expectedVersion,
  ) =>
    request(`${root(caseId)}/actions/clarification`, {
      method: "POST",
      body: JSON.stringify({
        actionId,
        note,
        outcome,
        requestId,
        evidenceRevision,
        expectedVersion,
      }),
      timeout: 45000,
    }),
};
