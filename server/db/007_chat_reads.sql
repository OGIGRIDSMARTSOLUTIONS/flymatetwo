CREATE TABLE IF NOT EXISTS flymate_shipment_reads (
  shipment_id uuid NOT NULL REFERENCES shipment_drafts(id) ON DELETE CASCADE,
  reader_id text NOT NULL,
  reader_role text NOT NULL CHECK (reader_role IN ('sender', 'traveler')),
  last_message_id uuid NOT NULL,
  last_sent_at timestamptz NOT NULL,
  PRIMARY KEY (shipment_id, reader_id, reader_role)
);
