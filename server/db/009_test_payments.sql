CREATE TABLE IF NOT EXISTS flymate_test_payments (
  shipment_id uuid PRIMARY KEY REFERENCES shipment_drafts(id),
  reward_minor integer NOT NULL CHECK (reward_minor > 0),
  fee_minor integer NOT NULL CHECK (fee_minor >= 0),
  attempt integer NOT NULL DEFAULT 1 CHECK (attempt > 0),
  stripe_session_id text UNIQUE,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'confirmed')),
  paid_at timestamptz,
  settlement_eligible_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
