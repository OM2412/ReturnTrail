-- Short-lived one-time authorization handshakes; no provider access tokens.
CREATE TABLE oauth_transactions (
  state_hash TEXT PRIMARY KEY CHECK(length(state_hash)=64),
  provider TEXT NOT NULL CHECK(provider IN ('GOOGLE','GITHUB')),
  pkce_verifier TEXT NOT NULL CHECK(length(pkce_verifier) BETWEEN 43 AND 128),
  nonce TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  CHECK(expires_at>created_at)
);
CREATE INDEX oauth_transactions_expiry_idx ON oauth_transactions(expires_at);
