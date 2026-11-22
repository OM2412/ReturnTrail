// Experimental guest-only migration; account OAuth and AI investigation are not ported.
import { prepareSeed } from "./seed.js";
import { listEvidence, proof } from "./caseRead.js";
import { caseSnapshot } from "./snapshot.js";
import { readActions,readClarifications,createFollowups,saveClarification } from "./workflows.js";
import { captureEvidence } from "./evidenceImport.js";
import { contextView } from "./context.js";
const DAY_MS = 24 * 60 * 60 * 1000;
const COOKIE = "RTSESSION";

function json(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store",
      "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", ...headers },
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
    if (method === "GET" && pathname === "/api/health") {
      try {
        const result = await env.DB.prepare("SELECT 1 AS ok").first();
        return result?.ok === 1
          ? json({ status: "ok", database: "ready", mode: "guest-preview" })
          : json({ status: "unavailable" }, 503);
      } catch {
        return json({ status: "unavailable" }, 503);
      }
    }
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
        return json({ status: "READY", caseId: "CASE-001", synthetic: true, initializedNow: false });
      }
      if (!preSessionCsrf(request) || request.headers.get("x-csrf-token") !== preSessionCsrf(request))
        return json({ error: "CSRF validation failed" }, 403);
      const id = crypto.randomUUID();
      const csrf = crypto.randomUUID();
      const reference = crypto.randomUUID();
      const now = Date.now();
      // D1 batch executes within a transaction. Never issue a session cookie
      // before all four cases and seven evidence rows have been committed.
      await env.DB.batch([
        env.DB.prepare("INSERT INTO guest_sessions (id, csrf_token, workspace_reference, created_at, expires_at) VALUES (?, ?, ?, ?, ?)")
          .bind(id, csrf, reference, now, now + DAY_MS),
        ...prepareSeed(env.DB, id, now),
      ]);
      return json({ status: "READY", caseId: "CASE-001", synthetic: true, initializedNow: true }, 200,
        { "set-cookie": `${COOKIE}=${id}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400` });
    }
    if (method === "GET" && pathname === "/api/cases") {
      const current = await session(env.DB, request);
      if (!current) return json({ error: "Guest workspace required" }, 401);
      const { results } = await env.DB.prepare(`SELECT id AS caseId,title,scenario,description,lesson,
        evidence_version AS evidenceVersion, workflow_version AS workflowVersion
        FROM cases WHERE workspace_id = ? ORDER BY id`).bind(current.id).all();
      return json({ synthetic: true, count: results.length, cases: results });
    }
    const match = pathname.match(/^\/api\/cases\/(CASE-[0-9]{3})\/(evidence|proof)$/);
    if (method === "GET" && match) {
      const current = await session(env.DB, request);
      if (!current) return json({ error: "Guest workspace required" }, 401);
      const result = match[2] === "evidence"
        ? await listEvidence(env.DB, current.id, match[1])
        : await proof(env.DB, current.id, match[1]);
      if (result === null) return json({ error:"Case not found" },404);
      return match[2] === "evidence" ? json({caseId:match[1],synthetic:true,source:"D1",
        count:result.length,evidence:result}) : json(result);
    }
    if (method === "POST" && match?.[2] === "evidence") {
      const current = await session(env.DB,request);
      if (!current) return json({error:"Guest workspace required"},401);
      if (!(await checkMutation(request,env.DB))) return json({error:"Forbidden"},403);
      if (Number(request.headers.get("content-length")) > 8192)
        return json({error:"Request too large"},413);
      let input;
      try { input = await request.json(); } catch {return json({error:"Malformed JSON"},400);}
      const result = await captureEvidence(env.DB,current.id,match[1],input);
      return json(result.value,result.status);
    }
    const inspectMatch = pathname.match(/^\/api\/cases\/(CASE-[0-9]{3})\/(findings|context)$/);
    if (method === "GET" && inspectMatch) {
      const current = await session(env.DB,request);
      if (!current) return json({error:"Guest workspace required"},401);
      const caseId = inspectMatch[1];
      if (inspectMatch[2] === "context") {
        const result = await contextView(env.DB,current.id,caseId,new URL(request.url).searchParams.get("exclude")??"");
        return json(result.value,result.status);
      }
      const snapshot = await caseSnapshot(env.DB,current.id,caseId);
      return snapshot ? json({caseId,synthetic:true,method:"DETERMINISTIC_VALIDATION",
        count:snapshot.findings.length,findings:snapshot.findings})
        : json({error:"Case not found"},404);
    }
    const workspaceMatch = pathname.match(/^\/api\/cases\/(CASE-[0-9]{3})\/(snapshot|brief)$/);
    if (method === "GET" && workspaceMatch) {
      const current = await session(env.DB, request);
      if (!current) return json({ error: "Guest workspace required" }, 401);
      try {
        const snapshot = await caseSnapshot(env.DB,current.id,workspaceMatch[1]);
        if (!snapshot) return json({ error: "Case not found" }, 404);
        return json(workspaceMatch[2] === "snapshot" ? snapshot : {
          schemaVersion: "returntrail.case-brief.v1", generatedAt: new Date().toISOString(),
          verification: "Synthetic sources and manual notes. Not independently verified; no refund decision.",
          snapshot,
        });
      } catch (error) {
        if (error.message === "Case changed during snapshot")
          return json({ error: "Case changed during read. Refresh and retry." }, 409);
        throw error;
      }
    }
    const actionsMatch = pathname.match(/^\/api\/cases\/(CASE-[0-9]{3})\/(actions|clarifications|actions\/clarification)$/);
    if (actionsMatch && ["GET","POST"].includes(method)) {
      const current = await session(env.DB,request);
      if (!current) return json({ error:"Guest workspace required" },401);
      const caseId = actionsMatch[1];
      const kind = actionsMatch[2];
      if (method === "GET" && kind !== "actions/clarification") {
        const value = kind === "actions" ? await readActions(env.DB,current.id,caseId)
          : await readClarifications(env.DB,current.id,caseId);
        return value ? json(value) : json({error:"Case not found"},404);
      }
      if (method === "POST" && kind !== "clarifications") {
        if (!(await checkMutation(request,env.DB))) return json({error:"Forbidden"},403);
        if (kind === "actions") {
          const result = await createFollowups(env.DB,current.id,caseId);
          return json(result.value,result.status);
        }
        if (Number(request.headers.get("content-length")) > 8192)
          return json({error:"Request too large"},413);
        let input;
        try { input = await request.json(); } catch { return json({error:"Malformed JSON"},400); }
        const result = await saveClarification(env.DB,current.id,caseId,input);
        return json(result.value,result.status);
      }
    }
    if ((method === "DELETE" && pathname === "/api/guest-sessions") ||
        (method === "POST" && pathname === "/api/auth/logout")) {
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
