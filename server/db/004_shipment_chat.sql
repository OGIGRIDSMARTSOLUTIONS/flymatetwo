CREATE TABLE IF NOT EXISTS flymate_shipment_messages (
  id uuid PRIMARY KEY,
  shipment_id uuid NOT NULL REFERENCES shipment_drafts(id) ON DELETE CASCADE,
  author_id text NOT NULL,
  author_role text NOT NULL CHECK (author_role IN ('sender', 'traveler')),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS flymate_messages_thread_idx
  ON flymate_shipment_messages (shipment_id, sent_at DESC, id DESC);
