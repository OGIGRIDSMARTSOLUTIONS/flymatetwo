import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { Action, Field } from "../ui/controls";
import { styles } from "../ui/styles";
import { createDeliveryApi, type Role } from "./deliveryApi";
import { createDraftApi } from "./draftApi";
import type { SavedDraft } from "./draftStorage";

export function DevelopmentSignIn({
  onConnect,
}: {
  onConnect: (token: string, records: SavedDraft[], role: Role) => void;
}) {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);

  async function connect() {
    if (connecting || !token.trim()) return;
    setConnecting(true);
    setError("");
    try {
      const cleanToken = token.trim();
      const { role } = await createDeliveryApi(cleanToken).list();
      const records =
        role === "sender" ? await createDraftApi(cleanToken).list() : [];
      onConnect(cleanToken, records, role);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not connect to FlyMate.",
      );
    } finally {
      setConnecting(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text accessibilityRole="header" style={styles.title}>
        Connect to FlyMate
      </Text>
      <Field
        label="Development access token"
        placeholder="Enter your server access token"
        value={token}
        onChange={setToken}
        secureTextEntry
      />
      {error !== "" && (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      )}
      <Action
        label={connecting ? "Connecting…" : "Connect"}
        onPress={connect}
      />
    </ScrollView>
  );
}
