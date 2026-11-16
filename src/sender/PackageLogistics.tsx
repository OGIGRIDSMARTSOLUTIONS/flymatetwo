import { PickupDatePicker } from "./PickupDatePicker";
import { Image, Pressable, Text, View } from "react-native";
import { Action, Field } from "../ui/controls";
import { roleColors } from "../ui/RoleTheme";
import { styles } from "../ui/styles";
import type { Draft } from "./draft";

export type UpdateDraft = <K extends keyof Draft>(
  key: K,
  value: Draft[K],
) => void;

const methods = [
  { id: "airport", label: "Airport" },
  { id: "public-spot", label: "Public spot" },
] as const;

export function PackageLogistics({
  draft,
  error,
  update,
  pickPhoto,
  onNext,
}: {
  draft: Draft;
  error: string;
  update: UpdateDraft;
  pickPhoto?: () => void;
  onNext: () => void;
}) {
  return (
    <>
      <Text style={styles.label}>Upload package photo</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose package photo"
        style={styles.photo}
        disabled={!pickPhoto}
        onPress={pickPhoto}
      >
        {draft.photo ? (
          <Image
            source={{ uri: draft.photo }}
            style={styles.photoImage}
            accessibilityLabel="Selected package photo"
          />
        ) : (
          <Text style={styles.label}>Tap to upload</Text>
        )}
      </Pressable>
      <Field
        label="Offered amount (USD)"
        value={draft.offer}
        placeholder="Enter amount"
        keyboardType="decimal-pad"
        onChange={(value) => update("offer", value)}
      />
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Pickup preference</Text>
        <View style={styles.chips}>
          {methods.map(({ id, label }) => {
            const selected = draft.pickupMethod === id;
            return (
              <Pressable
                key={id}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                style={[
                  styles.chip,
                  selected && {
                    backgroundColor: roleColors.sender,
                    borderColor: roleColors.sender,
                  },
                ]}
                onPress={() => update("pickupMethod", id)}
              >
                <Text style={[styles.label, selected && { color: "#fff" }]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <PickupDatePicker
        value={draft.preferredDate}
        onChange={(date) => update("preferredDate", date)}
      />
      {error !== "" && (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      )}
      <Action label="Next" onPress={onNext} />
    </>
  );
}
