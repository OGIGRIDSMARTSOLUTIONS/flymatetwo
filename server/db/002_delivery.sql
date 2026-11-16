ALTER TABLE shipment_drafts ADD COLUMN IF NOT EXISTS delivery jsonb;

CREATE INDEX IF NOT EXISTS shipment_drafts_delivery_status_idx
  ON shipment_drafts ((delivery->>'status')) WHERE delivery IS NOT NULL;
