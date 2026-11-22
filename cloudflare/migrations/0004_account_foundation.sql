-- Additive account foundation. No OAuth endpoint may mint account sessions until
-- verified provider-token validation and session rotation are implemented.
-- Guest case data remains isolated by its existing session-derived workspace_id.

CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','DELETED')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE account_identities (
  provider TEXT NOT NULL CHECK (provider IN ('GITHUB','GOOGLE')),
  provider_subject TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  email TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0 CHECK (email_verified IN (0,1)),
  linked_at INTEGER NOT NULL,
  PRIMARY KEY (provider,provider_subject)
);
CREATE INDEX account_identities_account_idx ON account_identities(account_id);

CREATE TABLE account_workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED')),
  created_at INTEGER NOT NULL
);

CREATE TABLE workspace_memberships (
  workspace_id TEXT NOT NULL REFERENCES account_workspaces(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('OWNER','ADMIN','MEMBER','VIEWER')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REVOKED')),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (workspace_id,account_id)
);
CREATE INDEX workspace_memberships_account_idx ON workspace_memberships(account_id,status);

-- Store a digest of a random 256-bit cookie, never the bearer token itself.
CREATE TABLE account_sessions (
  token_hash TEXT PRIMARY KEY CHECK (length(token_hash) = 64),
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  csrf_hash TEXT NOT NULL CHECK (length(csrf_hash) = 64),
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  CHECK (expires_at > created_at)
);
CREATE INDEX account_sessions_expiry_idx ON account_sessions(expires_at);
CREATE INDEX account_sessions_account_idx ON account_sessions(account_id,revoked_at);

-- Metadata only; never store full provider tokens or raw customer evidence here.
CREATE TABLE account_audit_events (
  id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  workspace_id TEXT REFERENCES account_workspaces(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX account_audit_time_idx ON account_audit_events(created_at);
