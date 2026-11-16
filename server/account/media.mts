import type { VerificationState } from "../../shared/operations.ts";
import type { Pool, PoolClient } from "pg";
import { RequestError } from "../http/request.mts";
import type { PhotoAsset } from "../drafts/types.mts";
import type { PhotoFolder } from "../photos/cloudinaryPackagePhotos.mts";

export const documentSlots = ["front", "back", "selfie"] as const;
export type DocumentSlot = (typeof documentSlots)[number];
type Verification = {
  documents: Partial<Record<DocumentSlot, PhotoAsset>>;
  submitted_at: Date | null;
  review_state: VerificationState;
  review_reason: string | null;
  changed_since_review: boolean;
};

export function createAccountMedia({
  pool,
  upload,
  remove,
  sign,
  verificationEnabled,
}: {
  pool: Pool;
  upload: (data: Buffer, folder: PhotoFolder) => Promise<PhotoAsset>;
  remove: (asset: PhotoAsset) => Promise<void>;
  sign: (asset: PhotoAsset, lifetimeSeconds?: number) => string;
  verificationEnabled: boolean;
}) {
  const labels: Record<VerificationState, string> = {
    draft: "Not submitted",
    pending: "Submitted for review",
    needs_resubmission: "New upload requested",
    approved: "Identity approved",
    rejected: "Identity rejected",
  };

  function present(row?: Verification) {
    const state = row?.review_state ?? "draft";
    const uploaded = documentSlots.filter((slot) =>
      Boolean(row?.documents[slot]),
    );
    const canEdit =
      verificationEnabled &&
      (state === "draft" || state === "needs_resubmission");
    const previewUrls: Partial<Record<DocumentSlot, string>> = {};
    for (const slot of uploaded) {
      const asset = row?.documents[slot];
      if (asset) {
        try {
          previewUrls[slot] = sign(asset, 120);
        } catch {
          console.error("Could not sign a traveler document preview.");
        }
      }
    }
    return {
      enabled: verificationEnabled,
      previewUrls,
      uploaded,
      state,
      canEdit,
      canSubmit:
        canEdit &&
        uploaded.length === documentSlots.length &&
        (state === "draft" || Boolean(row?.changed_since_review)),
      reason: row?.review_reason ?? null,
      submittedAt: row?.submitted_at ?? null,
      identityStatus: labels[state],
      backgroundStatus: "Not started",
    };
  }

  async function cleanup(asset: PhotoAsset) {
    await remove(asset).catch(() =>
      console.error("Could not remove a superseded account asset."),
    );
  }

  async function replace(
    id: string,
    input: Buffer,
    folder: PhotoFolder,
    update: (
      client: PoolClient,
      asset: PhotoAsset,
    ) => Promise<PhotoAsset | undefined>,
  ) {
    const client = await pool.connect();
    let asset: PhotoAsset | undefined;
    let committing = false;
    try {
      await client.query("BEGIN");
      await client.query(
        "SELECT id FROM flymate_accounts WHERE id = $1 FOR UPDATE",
        [id],
      );
      asset = await upload(input, folder);
      const prior = await update(client, asset);
      committing = true;
      await client.query("COMMIT");
      if (prior) await cleanup(prior);
      return asset;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      if (asset && !committing) await cleanup(asset);
      throw error;
    } finally {
      client.release();
    }
  }

  return {
    async earnings(id: string) {
      const {
        rows: [total],
      } = await pool.query<{ amount: string }>(
        `SELECT COALESCE(sum((delivery->>'offerMinor')::bigint), 0)::text AS amount
         FROM shipment_drafts WHERE delivery->>'travelerId' = $1 AND delivery->>'status' = 'Delivered'`,
        [id],
      );
      const { rows: items } = await pool.query(
        `SELECT id, (delivery->>'offerMinor')::integer AS amount,
           delivery->'timeline'->-1->>'at' AS at, package->>'destination' AS destination
         FROM shipment_drafts WHERE delivery->>'travelerId' = $1 AND delivery->>'status' = 'Delivered'
         ORDER BY (delivery->'timeline'->-1->>'at') DESC LIMIT 100`,
        [id],
      );
      return { totalMinor: Number(total?.amount ?? 0), items };
    },
    async profile(id: string) {
      const {
        rows: [row],
      } = await pool.query<{ profile_photo: PhotoAsset | null }>(
        "SELECT profile_photo FROM flymate_accounts WHERE id = $1",
        [id],
      );
      return { photoUrl: row?.profile_photo ? sign(row.profile_photo) : "" };
    },
    async saveProfile(id: string, input: Buffer) {
      const asset = await replace(
        id,
        input,
        "profile-photos",
        async (client, photo) => {
          const {
            rows: [row],
          } = await client.query<{ profile_photo: PhotoAsset | null }>(
            "SELECT profile_photo FROM flymate_accounts WHERE id = $1",
            [id],
          );
          await client.query(
            "UPDATE flymate_accounts SET profile_photo = $2 WHERE id = $1",
            [id, photo],
          );
          return row?.profile_photo ?? undefined;
        },
      );
      return { photoUrl: sign(asset) };
    },
    async verification(id: string) {
      const {
        rows: [row],
      } = await pool.query<Verification>(
        "SELECT documents, submitted_at, review_state, review_reason, changed_since_review FROM flymate_traveler_verification WHERE account_id = $1",
        [id],
      );
      return present(row);
    },
    async saveDocument(id: string, slot: DocumentSlot, input: Buffer) {
      if (!verificationEnabled)
        throw new RequestError(
          503,
          "Document submissions are currently disabled.",
        );
      await replace(
        id,
        input,
        "verification-documents",
        async (client, photo) => {
          const {
            rows: [row],
          } = await client.query<Verification>(
            "SELECT documents, submitted_at, review_state, review_reason, changed_since_review FROM flymate_traveler_verification WHERE account_id = $1",
            [id],
          );
          if (
            row &&
            row.review_state !== "draft" &&
            row.review_state !== "needs_resubmission"
          )
            throw new RequestError(409, "This submission is locked.");
          await client.query(
            `INSERT INTO flymate_traveler_verification (account_id, documents) VALUES ($1, $2)
           ON CONFLICT (account_id) DO UPDATE SET documents = EXCLUDED.documents, changed_since_review = true`,
            [id, { ...row?.documents, [slot]: photo }],
          );
          return row?.documents[slot];
        },
      );
      return this.verification(id);
    },
    async submit(id: string) {
      if (!verificationEnabled)
        throw new RequestError(
          503,
          "Document submissions are currently disabled.",
        );
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          "SELECT id FROM flymate_accounts WHERE id = $1 FOR UPDATE",
          [id],
        );
        const {
          rows: [row],
        } = await client.query<Verification>(
          `UPDATE flymate_traveler_verification
           SET submitted_at = now(), review_state = 'pending',
               review_revision = review_revision + 1,
               changed_since_review = false, review_reason = NULL
           WHERE account_id = $1 AND documents ?& ARRAY['front', 'back', 'selfie']
             AND (review_state = 'draft' OR (review_state = 'needs_resubmission' AND changed_since_review))
           RETURNING documents, submitted_at, review_state, review_reason, changed_since_review`,
          [id],
        );
        if (!row) {
          const {
            rows: [existing],
          } = await client.query<Verification>(
            "SELECT documents, submitted_at, review_state, review_reason, changed_since_review FROM flymate_traveler_verification WHERE account_id = $1",
            [id],
          );
          if (existing?.review_state === "pending") {
            await client.query("COMMIT");
            return present(existing);
          }
          if (existing?.review_state === "needs_resubmission") {
            throw new RequestError(
              422,
              "Replace at least one document before resubmitting.",
            );
          }
          throw new RequestError(
            422,
            "This case is closed or has missing documents.",
          );
        }
        await client.query("COMMIT");
        return present(row);
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
