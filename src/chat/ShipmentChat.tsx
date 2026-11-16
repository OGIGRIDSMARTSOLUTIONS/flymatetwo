import { randomUUID } from "expo-crypto";
import { useRef, useState } from "react";
import { Text, View } from "react-native";
import { Action, Field } from "../ui/controls";
import { styles } from "../ui/styles";
import { chatApi, type PendingMessage } from "./chatApi";
import { useShipmentMessages } from "./useShipmentMessages";
import type { Role } from "../sender/deliveryApi";

export function ShipmentChat({
  token,
  id,
  role,
  onClose,
}: {
  token: string;
  id: string;
  role: Role;
  onClose: () => void;
}) {
  const { messages, status, append } = useShipmentMessages(token, id);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const pending = useRef<PendingMessage | null>(null);

  async function send() {
    const body = text.trim();
    if (lock.current || !body || body.length > 1000) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const outgoing =
        pending.current?.body === body
          ? pending.current
          : { id: randomUUID(), body };
      pending.current = outgoing;
      append(await chatApi.send(token, id, outgoing));
      setText("");
      pending.current = null;
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not send the message.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <Text accessibilityRole="header" style={styles.title}>
        Shipment chat
      </Text>
      <Action label="Back to shipment" onPress={onClose} />
      {status !== "" && (
        <Text accessibilityLiveRegion="polite" style={styles.label}>
          {status}
        </Text>
      )}
      {messages.map((message) => (
        <View key={message.id} style={styles.card}>
          <Text style={styles.label}>
            {message.author_role === role
              ? "You"
              : role === "sender"
                ? "Traveler"
                : "Sender"}{" "}
            · {new Date(message.sent_at).toLocaleString()}
          </Text>
          <Text style={styles.cardTitle}>{message.body}</Text>
        </View>
      ))}
      {error !== "" && (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      )}
      <Field
        label="Message"
        placeholder="Write a message"
        value={text}
        onChange={setText}
        multiline
        editable={!busy}
      />
      <Action
        label="Send message"
        onPress={() => void send()}
        disabled={busy || !text.trim() || text.trim().length > 1000}
      />
    </>
  );
}
