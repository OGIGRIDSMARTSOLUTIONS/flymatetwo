CREATE TABLE IF NOT EXISTS shipment_drafts (
  id uuid PRIMARY KEY,
  sender_id text NOT NULL,
  package jsonb NOT NULL,
  photo jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shipment_drafts_sender_updated_idx
  ON shipment_drafts (sender_id, updated_at DESC, id DESC);
