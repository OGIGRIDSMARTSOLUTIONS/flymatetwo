import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Action } from "../ui/controls";
import { styles } from "../ui/styles";
import { parseOffer, parseWeight, type Draft } from "./draft";
import { ShipmentProgress } from "./ShipmentProgress";

export function ReviewShipment({
  draft,
  connected,
  busy,
  error,
  canSave,
  onSave,
  onPublish,
  onEdit,
}: {
  draft: Draft;
  connected: boolean;
  busy: boolean;
  error: string;
  canSave: boolean;
  onSave: () => void;
  onPublish: () => void;
  onEdit: () => void;
}) {
  const [agreed, setAgreed] = useState(false);
  const weight = parseWeight(draft.weight);
  const offer = parseOffer(draft.offer);
  const rows = [
    ["Title", draft.title],
    ["Route", `${draft.origin} → ${draft.destination}`],
    ["Category", draft.category],
    ["Description", draft.contents],
    ["Weight", weight ? `${weight.value} ${weight.unit}` : ""],
    ["Size", draft.size],
    ["Offer", `USD ${offer?.toFixed(2) ?? ""}`],
    ["Pickup", draft.pickupMethod === "airport" ? "Airport" : "Public spot"],
    ["Preferred date", draft.preferredDate],
  ];
  return (
    <>
      <ShipmentProgress step={agreed || busy ? 4 : 3} />
      {draft.photo !== "" && (
        <Image
          source={{ uri: draft.photo }}
          style={styles.preview}
          accessibilityLabel="Package photo"
        />
      )}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Shipment summary</Text>
        {rows.map(([label, value]) => (
          <Text key={label} style={styles.label}>
            {label} · {value}
          </Text>
        ))}
      </View>
      {connected && (
        <>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
            disabled={busy}
            onPress={() => setAgreed(!agreed)}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>
              {agreed ? "☑" : "☐"} I confirm the shipment details
            </Text>
            <Text style={styles.label}>
              The contents are accurately described. My listing will be visible
              to travelers.
            </Text>
          </Pressable>
          <Action
            label={busy ? "Please wait…" : "Publish request"}
            onPress={onPublish}
            disabled={busy || !canSave || !agreed}
          />
        </>
      )}
      {!connected && draft.photo !== "" && (
        <Text style={styles.label}>
          Photos are preview-only in offline mode.
        </Text>
      )}
      <Action label="Save draft" onPress={onSave} disabled={busy || !canSave} />
      {error !== "" && (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      )}
      <Action label="Edit package" onPress={onEdit} disabled={busy} />
    </>
  );
}
