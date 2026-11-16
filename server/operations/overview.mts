import type { Pool } from "pg";
import type {
  OperationShipment,
  OperationsSnapshot,
  VerificationQueueItem,
} from "../../shared/operations.ts";

export async function loadOperationsSnapshot(
  pool: Pool,
  documentUploadsEnabled: boolean,
): Promise<OperationsSnapshot> {
  const [shipments, verification, deliveryTotals, verificationTotals] =
    await Promise.all([
      pool.query<OperationShipment>(
        `SELECT d.id, COALESCE(d.package->>'title', d.package->>'contents') AS title,
         d.package->>'origin' AS origin, d.package->>'destination' AS destination,
         COALESCE(s.name, 'Development sender') AS sender,
         COALESCE(t.name, CASE WHEN d.delivery->>'travelerId' = 'legacy-traveler' THEN 'Development traveler' END) AS traveler,
         d.delivery->>'status' AS status, d.package->>'preferredDate' AS "preferredDate",
         d.delivery->'timeline' AS timeline, COALESCE((d.delivery->>'attempts')::int >= 5, false) AS "handoffLocked",
         CASE WHEN p.settlement_eligible_at IS NOT NULL THEN 'eligible'
              WHEN p.payment_status IS NOT NULL THEN p.payment_status
              WHEN d.delivery->>'paymentRequired' = 'true' THEN 'unpaid' END AS "testPayment"
       FROM shipment_drafts d
       LEFT JOIN flymate_accounts s ON s.id::text = d.sender_id
       LEFT JOIN flymate_accounts t ON t.id::text = d.delivery->>'travelerId'
       LEFT JOIN flymate_test_payments p ON p.shipment_id = d.id
       WHERE d.delivery IS NOT NULL
       ORDER BY (d.delivery->>'status' = 'Delivered'), d.updated_at DESC, d.id DESC LIMIT 200`,
      ),
      pool.query<VerificationQueueItem>(
        `SELECT a.id, a.name, a.email,
         ((COALESCE(v.documents ? 'front', false))::int +
          (COALESCE(v.documents ? 'back', false))::int +
          (COALESCE(v.documents ? 'selfie', false))::int) AS uploaded,
         v.submitted_at AS "submittedAt", COALESCE(v.review_state, 'draft') AS state
       FROM flymate_accounts a LEFT JOIN flymate_traveler_verification v ON v.account_id = a.id
       WHERE a.role = 'traveler'
       ORDER BY (COALESCE(v.review_state, 'draft') <> 'pending'), v.submitted_at IS NULL, v.submitted_at DESC, a.created_at DESC, a.id DESC LIMIT 200`,
      ),
      pool.query<{ active: number; delivered: number }>(
        `SELECT count(*) FILTER (WHERE delivery->>'status' <> 'Delivered')::int AS active,
         count(*) FILTER (WHERE delivery->>'status' = 'Delivered')::int AS delivered
       FROM shipment_drafts WHERE delivery IS NOT NULL`,
      ),
      pool.query<{ pending: number }>(
        "SELECT count(*)::int AS pending FROM flymate_traveler_verification WHERE review_state = 'pending'",
      ),
    ]);

  return {
    observedAt: new Date().toISOString(),
    shipments: shipments.rows,
    verification: verification.rows,
    totals: {
      ...deliveryTotals.rows[0],
      pendingVerification: verificationTotals.rows[0].pending,
    },
    documentUploadsEnabled,
  };
}
