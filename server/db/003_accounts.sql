CREATE TABLE IF NOT EXISTS flymate_accounts (
  id uuid PRIMARY KEY,
  role text NOT NULL CHECK (role IN ('sender', 'traveler')),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS flymate_sessions (
  token_hash text PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES flymate_accounts(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS flymate_sessions_expiry_idx ON flymate_sessions (expires_at);
