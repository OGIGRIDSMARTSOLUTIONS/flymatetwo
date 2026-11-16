import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  documentSlots,
  mediaApi,
  type DocumentSlot,
  type Verification,
} from "../account/mediaApi";
import { Action } from "../ui/controls";
import { styles } from "../ui/styles";
import {
  documentLabels,
  VerificationDocumentCard,
  type DocumentUpload,
} from "./VerificationDocumentCard";

export function TravelerVerification({
  token,
  background,
  onBackground,
}: {
  token: string;
  background: boolean;
  onBackground: () => void;
}) {
  const [status, setStatus] = useState<Verification | null>(null);
  const [uploads, setUploads] = useState<
    Partial<Record<DocumentSlot, DocumentUpload>>
  >({});
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(true);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const activeUpload = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const lock = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      activeUpload.current?.abort();
    };
  }, []);

  useEffect(() => {
    let active = true;
    mediaApi
      .verification(token)
      .then(
        (value) => {
          if (active) {
            setStatus(value);
            setError("");
          }
        },
        () => {
          if (active) setError("Could not load verification.");
        },
      )
      .finally(() => {
        if (active) setRefreshing(false);
      });
    return () => {
      active = false;
    };
  }, [token, revision]);

  async function update(slot?: DocumentSlot, retryUri?: string) {
    if (lock.current || refreshing) return;
    lock.current = true;
    setBusy(true);
    setError("");
    let uri = retryUri;
    try {
      if (!slot) {
        const submitted = await mediaApi.submit(token);
        if (mounted.current) {
          setStatus(submitted);
          onBackground();
        }
        return;
      }

      if (!uri) {
        const picker = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.85,
        });
        if (picker.canceled || !picker.assets[0]) return;
        uri = picker.assets[0].uri;
      }
      if (!mounted.current) return;
      const preview = uri;
      const controller = new AbortController();
      activeUpload.current = controller;
      setUploads((previous) => ({
        ...previous,
        [slot]: { preview, percentage: 0 },
      }));
      const saved = await mediaApi.uploadDocument(
        token,
        slot,
        preview,
        controller.signal,
        (percentage) => {
          if (!controller.signal.aborted && mounted.current) {
            setUploads((previous) => ({
              ...previous,
              [slot]: { preview, percentage },
            }));
          }
        },
      );
      if (!mounted.current) return;
      setStatus(saved);
      setUploads((previous) => ({ ...previous, [slot]: undefined }));
    } catch (cause) {
      if (!mounted.current) return;
      const message =
        cause instanceof Error
          ? cause.message
          : "Could not update verification.";
      if (slot && uri) {
        const preview = uri;
        setUploads((previous) => ({
          ...previous,
          [slot]: {
            preview,
            percentage: previous[slot]?.percentage ?? 0,
            error: message,
          },
        }));
      } else {
        setError(message);
      }
    } finally {
      activeUpload.current = null;
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  const failedUploads = documentSlots.some((slot) =>
    Boolean(uploads[slot]?.error),
  );
  const disabled = busy || refreshing;

  return (
    <>
      <View style={[styles.card, local.status]}>
        <Text style={local.title}>
          {background ? "Background check" : "Identity verification"}
        </Text>
        {status && (
          <>
            <Text style={local.identity}>{status.identityStatus}</Text>
            {!background && (
              <Text style={local.description}>
                {status.uploaded.length} of {documentSlots.length} documents
                uploaded
              </Text>
            )}
            {status.reason && (
              <Text style={local.description}>
                Staff note · {status.reason}
              </Text>
            )}
            {!background && status.state === "needs_resubmission" && (
              <Text style={local.description}>
                Replace at least one requested image before resubmitting.
              </Text>
            )}
            {background && (
              <Text style={local.description}>
                Background check · {status.backgroundStatus}. A screening
                provider hasn’t been connected yet.
              </Text>
            )}
            {!background && !status.enabled && (
              <Text style={local.description}>
                Document submission is disabled in this environment.
              </Text>
            )}
          </>
        )}
        {refreshing && (
          <Text style={local.description}>Loading verification…</Text>
        )}
      </View>
      {error !== "" && (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      )}
      {!background &&
        status &&
        (status.canEdit || status.uploaded.length > 0) && (
          <>
            {documentSlots.map((slot) => (
              <VerificationDocumentCard
                key={slot}
                {...documentLabels[slot]}
                saved={status.uploaded.includes(slot)}
                preview={status.previewUrls?.[slot]}
                upload={uploads[slot]}
                canEdit={status.canEdit}
                disabled={disabled}
                onChoose={() => void update(slot)}
                onDiscard={() =>
                  setUploads((previous) => ({ ...previous, [slot]: undefined }))
                }
                onRetry={() => void update(slot, uploads[slot]?.preview)}
              />
            ))}
            {status.canEdit && (
              <Action
                label={
                  status.state === "needs_resubmission"
                    ? "Resubmit verification"
                    : "Submit & continue"
                }
                disabled={disabled || !status.canSubmit || failedUploads}
                onPress={() => void update()}
              />
            )}
          </>
        )}
      <Action
        label="Refresh review status"
        disabled={disabled}
        onPress={() => {
          setRefreshing(true);
          setRevision((value) => value + 1);
        }}
      />
    </>
  );
}

const local = StyleSheet.create({
  status: { backgroundColor: "#edf6ef", borderColor: "#d5e8da", padding: 16 },
  title: { color: "#153d28", fontSize: 19, fontWeight: "800" },
  identity: { color: "#086537", fontWeight: "700", fontSize: 15 },
  description: { color: "#385748", fontSize: 13, lineHeight: 19 },
});
