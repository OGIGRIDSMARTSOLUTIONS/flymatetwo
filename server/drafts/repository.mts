import type { Pool } from "pg";
import type { DraftRow, PackageDetails, PhotoAsset } from "./types.mts";

const columns = "id, package, photo, created_at, updated_at";

export function createDraftRepository(pool: Pool) {
  return {
    async list(senderId: string) {
      const result = await pool.query<DraftRow>(
        `SELECT ${columns} FROM shipment_drafts
         WHERE sender_id = $1 AND delivery IS NULL ORDER BY updated_at DESC, id DESC LIMIT 100`,
        [senderId],
      );
      return result.rows;
    },

    async find(senderId: string, id: string) {
      const result = await pool.query<DraftRow>(
        `SELECT ${columns} FROM shipment_drafts WHERE sender_id = $1 AND id = $2`,
        [senderId, id],
      );
      return result.rows[0];
    },

    async save(senderId: string, id: string, details: PackageDetails) {
      const result = await pool.query<DraftRow>(
        `INSERT INTO shipment_drafts (id, sender_id, package) VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET package = EXCLUDED.package, updated_at = now()
         WHERE shipment_drafts.sender_id = EXCLUDED.sender_id
           AND shipment_drafts.delivery IS NULL
         RETURNING ${columns}`,
        [id, senderId, details],
      );
      return result.rows[0];
    },

    async attachPhoto(
      senderId: string,
      id: string,
      upload: () => Promise<PhotoAsset>,
    ) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const existing = await client.query<DraftRow>(
          `SELECT ${columns} FROM shipment_drafts
           WHERE sender_id = $1 AND id = $2 AND delivery IS NULL FOR UPDATE`,
          [senderId, id],
        );
        const draft = existing.rows[0];
        if (!draft || draft.photo) {
          await client.query("COMMIT");
          return draft;
        }

        const asset = await upload();
        const result = await client.query<DraftRow>(
          `UPDATE shipment_drafts SET photo = $3, updated_at = now()
           WHERE sender_id = $1 AND id = $2 RETURNING ${columns}`,
          [senderId, id, asset],
        );
        await client.query("COMMIT");
        return result.rows[0];
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
