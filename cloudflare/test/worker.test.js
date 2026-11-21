import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/worker.js";

class FakeDb {
  sessions = new Map();
  prepare(sql) {
    return {
      bind: (...args) => ({
        first: async () => {
          if (!sql.startsWith("SELECT")) throw new Error("Unexpected query");
          const row = this.sessions.get(args[0]);
          return row?.expires_at > args[1] ? row : null;
        },
        run: async () => {
          if (sql.startsWith("INSERT")) this.sessions.set(args[0], {
            id: args[0], csrf_token: args[1], workspace_reference: args[2],
            created_at: args[3], expires_at: args[4],
          });
          else if (sql.startsWith("DELETE")) this.sessions.delete(args[0]);
          else throw new Error("Unexpected query");
        },
      }),
    };
  }
}

function req(path, options = {}) {
  return new Request(`https://example.com${path}`, options);
}

test("CSRF pre-session token is required and guest data stays isolated", async () => {
  const env = { DB: new FakeDb() };
  const csrfResponse = await worker.fetch(req("/api/auth/csrf"), env);
  assert.equal(csrfResponse.status, 200);
  const { token } = await csrfResponse.json();
  const csrfCookie = csrfResponse.headers.get("set-cookie").split(";")[0];

  const rejected = await worker.fetch(req("/api/guest-sessions", {
    method: "POST", headers: { origin: "https://example.com" },
  }), env);
  assert.equal(rejected.status, 403);

  const created = await worker.fetch(req("/api/guest-sessions", {
    method: "POST", headers: {
      origin: "https://example.com", cookie: csrfCookie,
      "x-csrf-token": token,
    },
  }), env);
  assert.equal(created.status, 202);
  assert.equal((await created.json()).status, "PREPARING");
  const sessionCookie = created.headers.get("set-cookie").split(";")[0];
  assert.match(created.headers.get("set-cookie"), /HttpOnly; Secure; SameSite=Lax/);

  const guest = await worker.fetch(req("/api/auth/session", {
    headers: { cookie: sessionCookie },
  }), env);
  assert.equal((await guest.json()).workspaceMode, "GUEST");
  const stranger = await worker.fetch(req("/api/auth/session"), env);
  assert.equal((await stranger.json()).workspaceMode, "NONE");

  const deleteRejected = await worker.fetch(req("/api/guest-sessions", {
    method: "DELETE", headers: { origin: "https://example.com", cookie: sessionCookie },
  }), env);
  assert.equal(deleteRejected.status, 403);

  const activeCsrf = await worker.fetch(req("/api/auth/csrf", {
    headers: { cookie: sessionCookie },
  }), env);
  const { token: activeToken } = await activeCsrf.json();
  const deleted = await worker.fetch(req("/api/guest-sessions", {
    method: "DELETE", headers: {
      origin: "https://example.com", cookie: sessionCookie, "x-csrf-token": activeToken,
    },
  }), env);
  assert.equal(deleted.status, 204);
  assert.equal(env.DB.sessions.size, 0);
});

test("unported endpoints fail explicitly instead of returning fake case data", async () => {
  const result = await worker.fetch(req("/api/cases/CASE-001/snapshot"), { DB: new FakeDb() });
  assert.equal(result.status, 501);
});
