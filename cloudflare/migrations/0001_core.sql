-- Server-side records only. Never place OAuth tokens or raw private contracts here.
PRAGMA foreign_keys = ON;

CREATE TABLE guest_sessions (
  id TEXT PRIMARY KEY,
  csrf_token TEXT NOT NULL,
  workspace_reference TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX guest_sessions_expiry ON guest_sessions(expires_at);

CREATE TABLE cases (
  workspace_id TEXT NOT NULL,
  id TEXT NOT NULL,
  title TEXT NOT NULL,
  case_version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (workspace_id, id)
);

CREATE TABLE evidence (
  workspace_id TEXT NOT NULL,
  case_id TEXT NOT NULL,
  id TEXT NOT NULL,
  pickup_id TEXT NOT NULL,
  source_label TEXT NOT NULL,
  source_type TEXT NOT NULL,
  original_text TEXT NOT NULL,
  quote TEXT NOT NULL,
  claimed_status TEXT NOT NULL,
  synthetic INTEGER NOT NULL CHECK(synthetic = 1),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (workspace_id, case_id, id),
  FOREIGN KEY (workspace_id, case_id) REFERENCES cases(workspace_id, id)
);

CREATE TABLE evidence_relationships (
  workspace_id TEXT NOT NULL,
  case_id TEXT NOT NULL,
  from_evidence_id TEXT NOT NULL,
  to_evidence_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL,
  PRIMARY KEY (workspace_id, case_id, from_evidence_id, to_evidence_id, relationship_type),
  FOREIGN KEY (workspace_id, case_id, from_evidence_id) REFERENCES evidence(workspace_id, case_id, id),
  FOREIGN KEY (workspace_id, case_id, to_evidence_id) REFERENCES evidence(workspace_id, case_id, id)
);

CREATE TABLE case_actions (
  workspace_id TEXT NOT NULL,
  case_id TEXT NOT NULL,
  id TEXT NOT NULL,
  status TEXT NOT NULL,
  evidence_revision TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (workspace_id, case_id, id),
  FOREIGN KEY (workspace_id, case_id) REFERENCES cases(workspace_id, id)
);

CREATE TABLE clarifications (
  workspace_id TEXT NOT NULL,
  case_id TEXT NOT NULL,
  id TEXT NOT NULL,
  action_id TEXT NOT NULL,
  note TEXT NOT NULL,
  outcome TEXT NOT NULL,
  request_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (workspace_id, case_id, id),
  UNIQUE (workspace_id, case_id, request_id),
  FOREIGN KEY (workspace_id, case_id, action_id) REFERENCES case_actions(workspace_id, case_id, id)
);
