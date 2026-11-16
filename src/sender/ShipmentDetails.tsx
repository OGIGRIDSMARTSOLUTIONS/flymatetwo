import { useEffect, useState, type ReactNode } from "react";
import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Action } from "../ui/controls";
import { styles } from "../ui/styles";
import { createDeliveryApi, type Delivery } from "./deliveryApi";

export function ShipmentDetails({
  token,
  shipment,
  busy,
  onClose,
  onRefresh,
  children,
}: {
  token: string;
  shipment: Delivery;
  busy: boolean;
  onClose: () => void;
  onRefresh: () => void;
  children: ReactNode;
}) {
  const [photo, setPhoto] = useState("");
  const [photoError, setPhotoError] = useState(false);

  useEffect(() => {
    let active = true;
    createDeliveryApi(token)
      .open(shipment.id)
      .then(
        (result) => {
          if (active) setPhoto(result.photoUrl ?? "");
        },
        () => {
          if (active) setPhotoError(true);
        },
      );
    return () => {
      active = false;
    };
  }, [token, shipment.id]);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to shipments"
            hitSlop={8}
            onPress={onClose}
            style={styles.back}
          >
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <Text
            accessibilityRole="header"
            style={[styles.title, styles.centerTitle]}
          >
            Shipment details
          </Text>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          {photo !== "" && !photoError && (
            <Image
              source={{ uri: photo }}
              style={styles.preview}
              accessibilityLabel="Package photo"
              onError={() => setPhotoError(true)}
            />
          )}
          {photoError && (
            <Text style={styles.label}>Package photo could not be loaded.</Text>
          )}
          {children}
          <Action
            label={busy ? "Refreshing…" : "Refresh shipment"}
            onPress={onRefresh}
            disabled={busy}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
