ALTER TABLE flymate_traveler_verification
  ADD COLUMN IF NOT EXISTS review_state text NOT NULL DEFAULT 'draft'
    CHECK (review_state IN ('draft', 'pending', 'needs_resubmission', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS review_revision integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS changed_since_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_reason text;

UPDATE flymate_traveler_verification
SET review_state = 'pending', review_revision = 1
WHERE submitted_at IS NOT NULL AND review_state = 'draft';

CREATE TABLE IF NOT EXISTS flymate_verification_decisions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES flymate_traveler_verification(account_id),
  revision integer NOT NULL,
  staff_id uuid NOT NULL REFERENCES flymate_staff(id),
  decision text NOT NULL CHECK (decision IN ('needs_resubmission', 'approved', 'rejected')),
  reason text,
  decided_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, revision)
);
