-- Product-level personas are distinct from workspace authorization roles.
-- No existing account is modified or automatically linked by email.
CREATE TABLE account_personas (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  persona TEXT NOT NULL CHECK(persona IN ('CUSTOMER','SUPPORT_AGENT')),
  created_at INTEGER NOT NULL
);
CREATE INDEX account_personas_persona_idx ON account_personas(persona);
