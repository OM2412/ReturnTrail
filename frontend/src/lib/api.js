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
    const response = await fetch(path, {
      ...options,
      credentials: "same-origin",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
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
      const message =
        response.status === 401
          ? "Your demo session has expired. Start a fresh demo to continue."
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
const root = "/api/cases/CASE-001";
export const api = {
  createSession: () =>
    request("/api/guest-sessions", { method: "POST", timeout: 45000 }),
  endSession: () =>
    request("/api/guest-sessions", { method: "DELETE", timeout: 45000 }),
  evidence: () => request(`${root}/evidence`, { timeout: 45000 }),
  findings: () => request(`${root}/findings`, { timeout: 45000 }),
  actions: () => request(`${root}/actions`, { timeout: 45000 }),
  clarifications: () => request(`${root}/clarifications`, { timeout: 45000 }),
  investigate: () => request(`${root}/investigate`, { method: "POST" }),
  clarify: (actionId, note) =>
    request(`${root}/actions/clarification`, {
      method: "POST",
      body: JSON.stringify({ actionId, note }),
      timeout: 45000,
    }),
};
