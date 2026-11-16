const columns = "id, package, photo, created_at, updated_at";

export function createDraftRepository(pool) {
  return {
    async list(senderId) {
      const result = await pool.query(
        `SELECT ${columns} FROM shipment_drafts
         WHERE sender_id = $1 ORDER BY updated_at DESC, id DESC LIMIT 100`,
        [senderId],
      );
      return result.rows;
    },

    async find(senderId, id) {
      const result = await pool.query(
        `SELECT ${columns} FROM shipment_drafts WHERE sender_id = $1 AND id = $2`,
        [senderId, id],
      );
      return result.rows[0];
    },

    async save(senderId, id, details) {
      const result = await pool.query(
        `INSERT INTO shipment_drafts (id, sender_id, package) VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET package = EXCLUDED.package, updated_at = now()
         WHERE shipment_drafts.sender_id = EXCLUDED.sender_id
         RETURNING ${columns}`,
        [id, senderId, details],
      );
      return result.rows[0];
    },

    async attachPhoto(senderId, id, upload) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const existing = await client.query(
          `SELECT ${columns} FROM shipment_drafts
           WHERE sender_id = $1 AND id = $2 FOR UPDATE`,
          [senderId, id],
        );
        const draft = existing.rows[0];
        if (!draft || draft.photo) {
          await client.query("COMMIT");
          return draft;
        }

        const asset = await upload();
        const result = await client.query(
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
