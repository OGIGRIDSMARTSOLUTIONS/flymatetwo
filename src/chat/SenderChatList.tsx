import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Action } from "../ui/controls";
import { styles } from "../ui/styles";
import { createDeliveryApi, type Delivery } from "../sender/deliveryApi";
import { ShipmentChat } from "./ShipmentChat";

export function SenderChatList({
  token,
  unreadIds,
}: {
  token: string;
  unreadIds: string[];
}) {
  const [rows, setRows] = useState<Delivery[] | null>(null);
  const [error, setError] = useState(false);
  const [selection, setSelection] = useState("");
  const [revision, setRevision] = useState(0);
  const unreadKey = unreadIds.join(",");

  useEffect(() => {
    let active = true;
    createDeliveryApi(token)
      .list()
      .then(
        ({ shipments }) => {
          if (active)
            setRows(
              shipments.filter(
                ({ delivery }) => delivery.status !== "Published",
              ),
            );
        },
        () => {
          if (active) setError(true);
        },
      );
    return () => {
      active = false;
    };
  }, [token, revision, unreadKey]);

  if (selection)
    return (
      <ShipmentChat
        key={selection}
        token={token}
        id={selection}
        role="sender"
        onClose={() => setSelection("")}
      />
    );
  return (
    <>
      <Action
        label="Refresh conversations"
        onPress={() => {
          setError(false);
          setRevision((value) => value + 1);
        }}
      />
      {error && <Text style={styles.error}>Could not load conversations.</Text>}
      {!error && rows === null && (
        <Text style={styles.label}>Loading conversations…</Text>
      )}
      {!error && rows?.length === 0 && (
        <Text style={styles.label}>
          Conversations appear after you accept a traveler’s offer.
        </Text>
      )}
      {rows?.map((row) => (
        <View key={row.id} style={styles.card}>
          <Text style={styles.cardTitle}>
            {row.package.title ?? row.package.contents}
          </Text>
          <Text style={styles.label}>
            {row.package.origin} → {row.package.destination}
          </Text>
          {unreadIds.includes(row.id) && (
            <Text style={styles.label}>New message</Text>
          )}
          <Action
            label="Chat with traveler"
            onPress={() => setSelection(row.id)}
          />
        </View>
      ))}
    </>
  );
}
