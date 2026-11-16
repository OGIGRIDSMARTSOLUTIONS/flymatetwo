ALTER TABLE flymate_accounts ADD COLUMN IF NOT EXISTS profile_photo jsonb;

CREATE TABLE IF NOT EXISTS flymate_traveler_verification (
  account_id uuid PRIMARY KEY REFERENCES flymate_accounts(id) ON DELETE CASCADE,
  documents jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz
);
