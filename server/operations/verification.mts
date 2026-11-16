import type { Pool } from "pg";
import { z } from "zod";
import type {
  VerificationCase,
  VerificationState,
} from "../../shared/operations.ts";
import { documentSlots, type DocumentSlot } from "../account/media.mts";
import type { PhotoAsset } from "../drafts/types.mts";
import { RequestError } from "../http/request.mts";

export const reviewInput = z
  .strictObject({
    revision: z.number().int().positive(),
    decision: z.enum(["approved", "needs_resubmission", "rejected"]),
    reason: z.string().trim().max(1000).optional(),
  })
  .refine(
    ({ decision, reason }) => decision === "approved" || Boolean(reason),
    {
      message: "Enter a reason for a rejection or a new upload request.",
    },
  );

type CaseRow = {
  id: string;
  name: string;
  email: string;
  state: VerificationState;
  revision: number;
  submittedAt: Date;
  documents: Partial<Record<DocumentSlot, PhotoAsset>>;
};

export function createVerificationReview(
  pool: Pool,
  sign: (asset: PhotoAsset) => string,
) {
  return {
    async open(id: string): Promise<VerificationCase> {
      const {
        rows: [row],
      } = await pool.query<CaseRow>(
        `SELECT a.id, a.name, a.email, v.review_state AS state, v.review_revision AS revision,
           v.submitted_at AS "submittedAt", v.documents
         FROM flymate_traveler_verification v JOIN flymate_accounts a ON a.id = v.account_id
         WHERE v.account_id = $1 AND v.submitted_at IS NOT NULL AND a.role = 'traveler'`,
        [id],
      );
      if (!row) throw new RequestError(404, "Verification case not found.");
      const { rows: history } = await pool.query<
        VerificationCase["history"][number]
      >(
        `SELECT d.decision, d.reason, d.revision, d.decided_at AS at, s.name AS reviewer
         FROM flymate_verification_decisions d JOIN flymate_staff s ON s.id = d.staff_id
         WHERE d.account_id = $1 ORDER BY d.revision DESC`,
        [id],
      );
      const { documents, submittedAt, ...summary } = row;
      return {
        ...summary,
        submittedAt: submittedAt.toISOString(),
        // Closed or editable cases expose their decision history without issuing document links.
        documents:
          row.state === "pending"
            ? documentSlots.flatMap((slot) => {
                const asset = documents[slot];
                return asset ? [{ slot, url: sign(asset) }] : [];
              })
            : [],
        history,
      };
    },

    async decide(
      id: string,
      staffId: string,
      review: z.infer<typeof reviewInput>,
    ) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const { rowCount } = await client.query(
          `UPDATE flymate_traveler_verification
           SET review_state = $2, review_reason = $3, changed_since_review = false
           WHERE account_id = $1 AND review_state = 'pending' AND review_revision = $4
           AND ($2 <> 'approved' OR documents ?& ARRAY['front', 'back', 'selfie'])`,
          [id, review.decision, review.reason || null, review.revision],
        );
        if (!rowCount)
          throw new RequestError(
            409,
            "This submission changed. Reopen the case before reviewing.",
          );
        await client.query(
          `INSERT INTO flymate_verification_decisions (account_id, revision, staff_id, decision, reason)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            id,
            review.revision,
            staffId,
            review.decision,
            review.reason || null,
          ],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
