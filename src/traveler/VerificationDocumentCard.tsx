import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { roleColors } from "../ui/RoleTheme";

export const documentLabels = {
  front: {
    title: "ID front",
    description: "Show the full front of your government-issued ID.",
  },
  back: { title: "ID back", description: "Show the full back of the same ID." },
  selfie: {
    title: "Selfie",
    description: "Use a clear, current photo of your face.",
  },
};

export type DocumentUpload = {
  preview: string;
  percentage: number;
  error?: string;
};

export function VerificationDocumentCard({
  title,
  description,
  saved,
  preview,
  upload,
  canEdit,
  disabled,
  onChoose,
  onRetry,
  onDiscard,
}: {
  title: string;
  description: string;
  saved: boolean;
  preview?: string;
  upload?: DocumentUpload;
  canEdit: boolean;
  disabled: boolean;
  onChoose: () => void;
  onRetry: () => void;
  onDiscard: () => void;
}) {
  const imageUri = upload?.preview || preview;
  const [failedImage, setFailedImage] = useState<string>();
  const uploading = Boolean(upload && !upload.error);
  const percentage = upload?.percentage ?? 0;
  const badge = upload?.error
    ? "Upload failed"
    : uploading
      ? "Uploading"
      : saved
        ? "Uploaded"
        : "Required";

  return (
    <View style={card.surface}>
      <View style={card.row}>
        <View style={card.thumb}>
          {imageUri && failedImage !== imageUri ? (
            <Image
              source={{ uri: imageUri }}
              resizeMode="contain"
              style={card.image}
              accessibilityLabel={`${title} thumbnail`}
              onError={() => setFailedImage(imageUri)}
            />
          ) : (
            <Text style={card.thumbText}>
              {saved ? "Preview unavailable" : "No image"}
            </Text>
          )}
        </View>
        <View style={card.details}>
          <Text style={card.title}>{title}</Text>
          <Text style={card.description}>{description}</Text>
          <Text
            style={[
              card.badge,
              saved && !upload && card.saved,
              upload?.error && card.failed,
            ]}
          >
            {badge}
          </Text>
        </View>
      </View>
      {uploading && (
        <View style={card.progressSection}>
          <View style={card.progressLabel}>
            <Text style={card.helper}>
              {percentage === 100 ? "Saving document…" : "Uploading image"}
            </Text>
            <Text style={card.percent}>{percentage}%</Text>
          </View>
          <View
            accessibilityRole="progressbar"
            accessibilityLabel={`${title} upload progress`}
            accessibilityValue={{ min: 0, max: 100, now: percentage }}
            style={card.progress}
          >
            <View style={[card.fill, { width: `${percentage}%` }]} />
          </View>
        </View>
      )}
      {upload?.error && (
        <Text accessibilityLiveRegion="polite" style={card.error}>
          {upload.error}
        </Text>
      )}
      {canEdit && (
        <View style={card.actions}>
          {upload?.error && (
            <Pressable
              accessibilityRole="button"
              onPress={onRetry}
              disabled={disabled}
              style={card.button}
            >
              <Text style={card.buttonText}>Retry upload</Text>
            </Pressable>
          )}
          {upload?.error && (
            <Pressable
              accessibilityRole="button"
              onPress={onDiscard}
              disabled={disabled}
              style={card.button}
            >
              <Text style={card.buttonText}>Discard failed upload</Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${saved || upload?.error ? "Replace" : "Choose"} ${title}`}
            onPress={onChoose}
            disabled={disabled}
            style={[card.button, disabled && card.disabled]}
          >
            <Text style={card.buttonText}>
              {upload?.error
                ? "Choose another image"
                : saved
                  ? "Replace image"
                  : "Choose image"}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const card = StyleSheet.create({
  surface: {
    padding: 14,
    borderWidth: 1,
    borderColor: "#dce6df",
    borderRadius: 14,
    backgroundColor: "#fff",
    gap: 11,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  thumb: {
    width: 92,
    height: 72,
    borderRadius: 8,
    backgroundColor: "#eef5f0",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  image: { width: "100%", height: "100%" },
  thumbText: {
    color: "#526458",
    fontSize: 11,
    textAlign: "center",
    paddingHorizontal: 6,
  },
  details: { flex: 1, alignItems: "flex-start", gap: 4 },
  title: { fontSize: 16, fontWeight: "700", color: "#142e22" },
  description: { fontSize: 13, lineHeight: 18, color: "#526458" },
  badge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4d5b53",
    backgroundColor: "#edf1ee",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    overflow: "hidden",
  },
  saved: { color: "#086537", backgroundColor: "#e4f4e9" },
  failed: { color: "#92252d", backgroundColor: "#ffedef" },
  progressSection: { gap: 6 },
  progressLabel: { flexDirection: "row", justifyContent: "space-between" },
  helper: { fontSize: 13, color: "#526458" },
  percent: { fontSize: 13, fontWeight: "700", color: roleColors.traveler },
  progress: {
    height: 7,
    borderRadius: 5,
    backgroundColor: "#dce9e0",
    overflow: "hidden",
  },
  fill: { height: "100%", backgroundColor: roleColors.traveler },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  button: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: "#b8d8c4",
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  buttonText: { color: roleColors.traveler, fontSize: 13, fontWeight: "700" },
  disabled: { opacity: 0.5 },
  error: { color: "#92252d", fontSize: 13 },
});
