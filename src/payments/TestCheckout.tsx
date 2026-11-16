import { useEffect, useRef, useState } from "react";
import { Linking, Text, View } from "react-native";
import { draftApiUrl } from "../sender/draftApi";
import { Action } from "../ui/controls";
import { styles } from "../ui/styles";

type Payment = {
  reward: number;
  fee: number;
  total: number;
  status: "unpaid" | "pending" | "confirmed";
  eligible: boolean;
  checkoutUrl?: string;
};

const usd = (amount: number) => `USD ${(amount / 100).toFixed(2)}`;

async function request(
  token: string,
  id: string,
  action?: "checkout" | "confirm",
  signal?: AbortSignal,
) {
  const response = await fetch(
    `${draftApiUrl}/api/payments/${id}${action ? "/" + action : ""}`,
    {
      method: action ? "POST" : "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal,
    },
  );
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Could not load payment.");
  return result as Payment;
}

export function TestCheckout({
  token,
  id,
  delivered,
  onConfirmed,
}: {
  token: string;
  id: string;
  delivered: boolean;
  onConfirmed: () => void;
}) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const lock = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    request(token, id, undefined, controller.signal).then(
      (result) => {
        if (!controller.signal.aborted) setPayment(result);
      },
      (cause) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load the payment.",
          );
      },
    );
    return () => controller.abort();
  }, [token, id, delivered]);

  async function update(action: "checkout" | "confirm") {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const next = await request(token, id, action);
      setPayment(next);
      if (next.status === "confirmed") {
        onConfirmed();
      } else if (next.checkoutUrl) {
        setNotice("Finish test checkout, then return here to verify payment.");
      } else {
        setNotice("Stripe hasn’t confirmed payment yet.");
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not update payment.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Test checkout</Text>
      {payment && (
        <>
          <Text style={styles.label}>
            Traveler reward · {usd(payment.reward)}
          </Text>
          <Text style={styles.label}>
            FlyMate service fee · {usd(payment.fee)}
          </Text>
          <Text style={styles.cardTitle}>Total · {usd(payment.total)}</Text>
          <Text style={styles.label}>
            {payment.eligible
              ? "Eligible for settlement · No payout issued"
              : payment.status === "confirmed"
                ? "Test payment verified"
                : payment.status === "pending"
                  ? "Awaiting payment confirmation"
                  : "Payment required before pickup"}
          </Text>
        </>
      )}
      {payment?.status !== "confirmed" && !delivered && (
        <>
          {payment?.checkoutUrl ? (
            <Action
              label="Open Stripe test checkout"
              disabled={busy}
              onPress={() => {
                const url = payment.checkoutUrl;
                if (url)
                  void Linking.openURL(url).catch(() =>
                    setError("Could not open Stripe checkout."),
                  );
              }}
            />
          ) : (
            <Action
              label="Prepare test checkout"
              onPress={() => void update("checkout")}
              disabled={busy}
            />
          )}
          <Action
            label="Verify test payment"
            onPress={() => void update("confirm")}
            disabled={busy}
          />
          {payment?.checkoutUrl && (
            <Action
              label="Get a new checkout link"
              onPress={() => void update("checkout")}
              disabled={busy}
            />
          )}
        </>
      )}
      {notice && (
        <Text accessibilityLiveRegion="polite" style={styles.label}>
          {notice}
        </Text>
      )}
      {error && (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}
