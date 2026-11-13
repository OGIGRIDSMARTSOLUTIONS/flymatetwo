import { Text } from "react-native";
import { Action, Card } from "../ui/components";
import { styles } from "../ui/styles";
import { sampleRef } from "../tracking/data";

export function VerificationScreen({ delivered, onTrack }: { delivered: boolean; onTrack: () => void }) {
  return (
    <>
    <Text style={styles.title}>Verification</Text>
    <Text style={styles.muted}>Sample records for {sampleRef}.</Text>
    <Card title="Courier identity">
      <Text style={styles.muted}>Amara O. · Demo identity check recorded before pickup.</Text>
    </Card>
    <Card title="Export customs documents">
      <Text style={styles.muted}>Sample invoice, packing list, and fictional clearance reference DEMO-EX-1048.</Text>
    </Card>
    <Card title="Recipient handoff">
      <Text style={styles.muted}>{delivered ? "Receipt confirmed." : "Awaiting one-time code confirmation."}</Text>
      <Action secondary onPress={onTrack}>Open tracking</Action>
    </Card>
  </>
  );
}
