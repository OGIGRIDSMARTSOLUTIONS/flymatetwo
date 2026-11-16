import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { mediaApi, type Earnings } from "../account/mediaApi";
import { Action } from "../ui/controls";
import { roleColors } from "../ui/RoleTheme";
import { styles } from "../ui/styles";

const usd = (value: number) => `USD ${(value / 100).toFixed(2)}`;

export function TravelerEarnings({ token }: { token: string }) {
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    mediaApi.earnings(token).then(
      (result) => {
        if (active) setEarnings(result);
      },
      () => {
        if (active) setError(true);
      },
    );
    return () => {
      active = false;
    };
  }, [token, revision]);

  return (
    <>
      {error && <Text style={styles.error}>Could not load earnings.</Text>}
      {!error && earnings === null && (
        <Text style={styles.label}>Loading earnings…</Text>
      )}
      {earnings && (
        <>
          <View style={[styles.card, local.total]}>
            <Text style={local.label}>
              Agreed rewards on delivered shipments
            </Text>
            <Text style={local.amount}>{usd(earnings.totalMinor)}</Text>
          </View>
          <Text style={styles.label}>
            Payouts are not connected. These amounts are agreed delivery
            rewards.
          </Text>
          {earnings.items.length === 0 && (
            <Text style={styles.label}>No completed deliveries yet.</Text>
          )}
          {earnings.items.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.cardTitle}>
                {item.destination} · {usd(item.amount)}
              </Text>
              <Text style={styles.label}>
                {new Date(item.at).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </>
      )}
      <Action
        label="Refresh earnings"
        onPress={() => {
          setError(false);
          setRevision((number) => number + 1);
        }}
      />
    </>
  );
}

const local = StyleSheet.create({
  total: {
    backgroundColor: roleColors.traveler,
    borderColor: roleColors.traveler,
  },
  label: { color: "#fff", fontWeight: "600" },
  amount: { color: "#fff", fontWeight: "800", fontSize: 32 },
});
