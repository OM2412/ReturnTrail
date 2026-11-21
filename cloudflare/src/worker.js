// Initial migration slice: guest-session parity only. All case endpoints remain
// deliberately unavailable until the Cypher-to-SQL parity tests are complete.
const DAY_MS = 24 * 60 * 60 * 1000;
const COOKIE = "RTSESSION";

function json(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

function cookieValue(request) {
  const match = request.headers.get("cookie")?.match(/(?:^|;\s*)RTSESSION=([a-f0-9-]{36})(?:;|$)/);
  return match?.[1] ?? null;
}

function preSessionCsrf(request) {
  return request.headers.get("cookie")?.match(/(?:^|;\s*)RTCSRF=([a-f0-9-]{36})(?:;|$)/)?.[1] ?? null;
}

async function session(db, request) {
  const id = cookieValue(request);
  if (!id) return null;
  return db.prepare("SELECT id, csrf_token, workspace_reference FROM guest_sessions WHERE id = ? AND expires_at > ?")
    .bind(id, Date.now()).first();
}

function requireSameOrigin(request) {
  const origin = request.headers.get("origin");
  return origin && origin === new URL(request.url).origin;
}

async function checkMutation(request, db) {
  if (!requireSameOrigin(request)) return false;
  const userSession = await session(db, request);
  // First session creation uses a pre-session anti-CSRF cookie, not a bypass.
  if (!userSession) return false;
  return request.headers.get("x-csrf-token") === userSession.csrf_token;
}

export default {
  async fetch(request, env) {
    if (!env.DB) return json({ error: "D1 database is not configured" }, 503);
    const { pathname } = new URL(request.url);
    const method = request.method;
    if (method === "GET" && pathname === "/api/auth/session") {
      const current = await session(env.DB, request);
      return json({ authenticated: false, githubConfigured: false, googleConfigured: false,
        workspaceMode: current ? "GUEST" : "NONE", profile: null,
        workspaceReference: current?.workspace_reference ?? null });
    }
    if (method === "GET" && pathname === "/api/auth/csrf") {
      const current = await session(env.DB, request);
      if (current) return json({ headerName: "X-CSRF-TOKEN", token: current.csrf_token });
      const token = crypto.randomUUID();
      return json({ headerName: "X-CSRF-TOKEN", token }, 200,
        { "set-cookie": `RTCSRF=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=900` });
    }
    if (method === "POST" && pathname === "/api/guest-sessions") {
      if (!requireSameOrigin(request)) return json({ error: "Origin validation failed" }, 403);
      const current = await session(env.DB, request);
      if (current) {
        if (request.headers.get("x-csrf-token") !== current.csrf_token)
          return json({ error: "CSRF validation failed" }, 403);
        return json({ status: "PREPARING", caseId: null, synthetic: true, initializedNow: false }, 202);
      }
      if (!preSessionCsrf(request) || request.headers.get("x-csrf-token") !== preSessionCsrf(request))
        return json({ error: "CSRF validation failed" }, 403);
      const id = crypto.randomUUID();
      const csrf = crypto.randomUUID();
      const reference = crypto.randomUUID();
      const now = Date.now();
      await env.DB.prepare("INSERT INTO guest_sessions (id, csrf_token, workspace_reference, created_at, expires_at) VALUES (?, ?, ?, ?, ?)")
        .bind(id, csrf, reference, now, now + DAY_MS).run();
      // Do not advertise READY before cases are seeded: existing UI expects graph data.
      return json({ status: "PREPARING", caseId: null, synthetic: true, initializedNow: true }, 202,
        { "set-cookie": `${COOKIE}=${id}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400` });
    }
    if (method === "DELETE" && pathname === "/api/guest-sessions") {
      if (!(await checkMutation(request, env.DB))) return json({ error: "Forbidden" }, 403);
      await env.DB.prepare("DELETE FROM guest_sessions WHERE id = ?").bind(cookieValue(request)).run();
      return new Response(null, { status: 204,
        headers: { "set-cookie": `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`, "cache-control": "no-store" } });
    }
    if (pathname.startsWith("/api/"))
      return json({ error: "Endpoint awaiting verified backend parity; original Java API remains the reference" }, 501);
    return json({ error: "Not found" }, 404);
  },
};
