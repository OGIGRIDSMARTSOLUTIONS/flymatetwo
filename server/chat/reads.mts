import type { Pool } from "pg";
import type { Principal } from "../auth/accounts.mts";

export const participantFilter = `
  (d.delivery->>'status' IN ('Matched', 'Picked up', 'In transit', 'Delivered')
   AND ($2 = 'sender' AND d.sender_id = $3
     OR $2 = 'traveler' AND COALESCE(d.delivery->>'travelerId', 'legacy-traveler') = $3))
`;

export async function unreadShipments(pool: Pool, user: Principal) {
  const { rows } = await pool.query<{ id: string }>(
    `SELECT d.id FROM shipment_drafts d
     LEFT JOIN flymate_shipment_reads r ON r.shipment_id = d.id AND r.reader_role = $2 AND r.reader_id = $3
     WHERE ($1::uuid IS NULL OR d.id = $1) AND ${participantFilter}
       AND EXISTS (
         SELECT 1 FROM flymate_shipment_messages m
         WHERE m.shipment_id = d.id AND m.author_role <> $2
           AND (r.last_message_id IS NULL OR (m.sent_at, m.id) > (r.last_sent_at, r.last_message_id))
       ) ORDER BY d.id`,
    [null, user.role, user.id],
  );
  return rows.map(({ id }) => id);
}

export async function markShipmentRead(
  pool: Pool,
  shipmentId: string,
  user: Principal,
  messageId: string,
) {
  await pool.query(
    `INSERT INTO flymate_shipment_reads (shipment_id, reader_role, reader_id, last_message_id, last_sent_at)
     SELECT shipment_id, $2, $3, id, sent_at FROM flymate_shipment_messages WHERE shipment_id = $1 AND id = $4
     ON CONFLICT (shipment_id, reader_id, reader_role) DO UPDATE SET
       last_message_id = EXCLUDED.last_message_id, last_sent_at = EXCLUDED.last_sent_at
     WHERE (flymate_shipment_reads.last_sent_at, flymate_shipment_reads.last_message_id)
         < (EXCLUDED.last_sent_at, EXCLUDED.last_message_id)`,
    [shipmentId, user.role, user.id, messageId],
  );
}
