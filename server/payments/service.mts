import type { Pool } from "pg";
import { RequestError } from "../http/request.mts";
import type { createStripeTestCheckout, StripeSession } from "./stripe.mts";

type Payment = {
  reward_minor: number;
  fee_minor: number;
  stripe_session_id: string | null;
  attempt: number;
  payment_status: "pending" | "confirmed";
  settlement_eligible_at: Date | null;
};

type DeliveryRow = {
  delivery: {
    status: string;
    offerMinor?: number;
    paymentRequired?: boolean;
  } | null;
};

const quote = (reward: number) => ({ reward, fee: Math.round(reward * 0.15) });

export function createPaymentService(
  pool: Pool,
  stripe?: ReturnType<typeof createStripeTestCheckout>,
) {
  function view(reward: number, payment?: Payment, checkoutUrl?: string) {
    const amount = payment
      ? { reward: payment.reward_minor, fee: payment.fee_minor }
      : quote(reward);
    return {
      ...amount,
      total: amount.reward + amount.fee,
      currency: "USD",
      status: payment?.payment_status ?? "unpaid",
      eligible: Boolean(payment?.settlement_eligible_at),
      checkoutUrl,
    };
  }

  return async function payment(
    senderId: string,
    id: string,
    action: "status" | "checkout" | "confirm",
  ) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const {
        rows: [shipment],
      } = await client.query<DeliveryRow>(
        "SELECT delivery FROM shipment_drafts WHERE id = $1 AND sender_id = $2 FOR UPDATE",
        [id, senderId],
      );
      if (!shipment) throw new RequestError(404, "Shipment not found.");
      const delivery = shipment.delivery;
      const reward = delivery?.offerMinor;
      if (!delivery?.paymentRequired || !reward)
        throw new RequestError(
          409,
          "Test checkout is not enabled for this shipment.",
        );
      const {
        rows: [existing],
      } = await client.query<Payment>(
        "SELECT * FROM flymate_test_payments WHERE shipment_id = $1",
        [id],
      );
      let result = view(reward, existing);
      if (action !== "status" && existing?.payment_status !== "confirmed") {
        if (!stripe)
          throw new RequestError(
            503,
            "Stripe test checkout has not been configured.",
          );
        if (delivery.status !== "Matched")
          throw new RequestError(
            409,
            "Checkout requires a matched shipment awaiting pickup.",
          );

        let session = existing?.stripe_session_id
          ? await stripe.lookup(existing.stripe_session_id)
          : undefined;
        const matches = (item: StripeSession, payment: Payment) =>
          !item.livemode &&
          item.id === payment.stripe_session_id &&
          item.currency === "usd" &&
          item.client_reference_id === id &&
          item.amount_total === payment.reward_minor + payment.fee_minor;

        if (session && existing && !matches(session, existing)) {
          throw new RequestError(
            409,
            "Checkout details did not match this shipment.",
          );
        }
        if (
          session?.status === "complete" &&
          session.payment_status === "paid" &&
          existing
        ) {
          await client.query(
            `UPDATE flymate_test_payments SET payment_status = 'confirmed', paid_at = now(), updated_at = now()
             WHERE shipment_id = $1`,
            [id],
          );
          result = view(reward, { ...existing, payment_status: "confirmed" });
        } else if (action === "checkout") {
          let attempt = existing?.attempt ?? 1;
          const fee = existing?.fee_minor ?? quote(reward).fee;
          if (!session || session.status === "expired") {
            if (session?.status === "expired") attempt++;
            if (reward + fee < 50)
              throw new RequestError(
                422,
                "The checkout total must be at least USD 0.50.",
              );
            session = await stripe.create({ id, reward, fee, attempt });
          }
          if (
            session.status !== "open" ||
            !session.url ||
            !/^https:\/\/checkout\.stripe\.com\//.test(session.url)
          ) {
            throw new RequestError(
              409,
              "This session is not available for checkout. Check payment status.",
            );
          }
          const {
            rows: [registered],
          } = await client.query<Payment>(
            `INSERT INTO flymate_test_payments (shipment_id, reward_minor, fee_minor, stripe_session_id, attempt)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (shipment_id) DO UPDATE SET stripe_session_id = EXCLUDED.stripe_session_id,
               attempt = EXCLUDED.attempt, updated_at = now() RETURNING *`,
            [id, reward, fee, session.id, attempt],
          );
          if (!matches(session, registered))
            throw new RequestError(
              409,
              "Checkout details did not match this shipment.",
            );
          result = view(reward, registered, session.url);
        }
      }
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  };
}
