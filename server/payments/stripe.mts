import { RequestError } from "../http/request.mts";
import { z } from "zod";

const stripeSession = z.object({
  id: z.string().startsWith("cs_test_"),
  url: z.string().nullable(),
  livemode: z.literal(false),
  currency: z.string().nullable(),
  client_reference_id: z.string().nullable(),
  amount_total: z.number().nullable(),
  status: z.enum(["open", "complete", "expired"]),
  payment_status: z.enum(["paid", "unpaid", "no_payment_required"]),
});

export type StripeSession = z.infer<typeof stripeSession>;

export function createStripeTestCheckout(key: string, returnUrl: string) {
  if (!key.startsWith("sk_test_"))
    throw new Error("STRIPE_TEST_SECRET_KEY must be a Stripe test key.");

  async function request(
    path: string,
    body?: URLSearchParams,
    idempotencyKey?: string,
  ) {
    const headers: Record<string, string> = { Authorization: `Bearer ${key}` };
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
    try {
      const response = await fetch(
        "https://api.stripe.com/v1/checkout/sessions" + path,
        {
          method: body ? "POST" : "GET",
          headers,
          body,
          signal: AbortSignal.timeout(12_000),
        },
      );
      if (!response.ok) throw new Error("Checkout API rejected the request.");
      return stripeSession.parse(await response.json());
    } catch {
      throw new RequestError(
        502,
        "Stripe test checkout is unavailable. Try again.",
      );
    }
  }

  return {
    lookup: (id: string) => request("/" + encodeURIComponent(id)),
    create({
      id,
      reward,
      fee,
      attempt,
    }: {
      id: string;
      reward: number;
      fee: number;
      attempt: number;
    }) {
      const form = new URLSearchParams({
        mode: "payment",
        client_reference_id: id,
        success_url: returnUrl,
        cancel_url: returnUrl,
        "payment_method_types[0]": "card",
      });
      const items = [{ name: "Traveler delivery reward", amount: reward }];
      if (fee) items.push({ name: "FlyMate service fee", amount: fee });
      items.forEach(({ name, amount }, index) => {
        form.set(`line_items[${index}][price_data][currency]`, "usd");
        form.set(`line_items[${index}][price_data][product_data][name]`, name);
        form.set(
          `line_items[${index}][price_data][unit_amount]`,
          String(amount),
        );
        form.set(`line_items[${index}][quantity]`, "1");
      });
      return request("", form, `flymate:test:${id}:${attempt}`);
    },
  };
}
