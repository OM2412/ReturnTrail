-- Idempotent import identity. Existing seed rows intentionally have no payload hash.
ALTER TABLE evidence ADD COLUMN payload_hash TEXT NOT NULL DEFAULT '';
