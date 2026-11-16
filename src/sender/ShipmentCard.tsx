import { Text, View } from "react-native";
import { styles } from "../ui/styles";
import type { ShipmentSummary } from "./sampleShipments";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeZone: "UTC",
});

export function ShipmentCard({ shipment }: { shipment: ShipmentSummary }) {
  const delivered = shipment.deliveredAt
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: shipment.destinationTimeZone ?? "UTC",
      }).format(new Date(shipment.deliveredAt))
    : null;

  return (
    <View style={styles.card}>
      <View style={styles.route}>
        <View style={styles.dot} />
        <View style={styles.dash} />
        <Text style={styles.label}>{shipment.route}</Text>
      </View>
      <Text style={styles.cardTitle}>{shipment.title}</Text>
      <Text style={[styles.badge, { backgroundColor: shipment.tint }]}>
        {shipment.status}
      </Text>
      {shipment.detail && <Text style={styles.detail}>{shipment.detail}</Text>}
      <Text style={styles.label}>
        Expected delivery · {dateFormat.format(new Date(shipment.expectedDate))}
      </Text>
      {delivered && (
        <Text style={styles.label}>
          Delivered on · {delivered} (local time)
        </Text>
      )}
    </View>
  );
}
