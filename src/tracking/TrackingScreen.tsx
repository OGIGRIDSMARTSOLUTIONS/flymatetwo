import { useState } from "react";
import { Text } from "react-native";
import { Action, Card, Field } from "../ui/components";
import { styles } from "../ui/styles";
import { sampleRef } from "../tracking/data";
import type { Shipment } from "./data";

export function TrackingScreen({ selected, shipment, delivered, onSearch, onDeliver }: {
  selected: string; shipment?: Shipment; delivered: boolean;
  onSearch: (reference: string) => void; onDeliver: () => void;
}) {
  const [reference, setReference] = useState(selected);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");

  function confirmReceipt() {
    if (code.trim() !== "4826") {
      setCodeError("Incorrect code. Try the sample code shown above.");
      return;
    }
    setCodeError("");
    onDeliver();
  }

  return (
    <>
    <Text style={styles.title}>Track shipment</Text>
    <Card title="Find a shipment">
      <Field label="Tracking reference" value={reference} onChangeText={setReference}
        autoCapitalize="characters" autoCorrect={false} />
      <Action onPress={() => onSearch(reference.trim().toUpperCase())}>Find shipment</Action>
    </Card>
    {!shipment && <Text style={styles.error}>Shipment not found. Try {sampleRef}.</Text>}
    {shipment && (
      <>
        <Card title={shipment.route}>
          <Text style={styles.muted}>{selected} · {shipment.goods}</Text>
        </Card>
        <Card title="Shipment timeline">
          {shipment.events.map((event) => (
            <Text key={event} style={styles.event}>✓  {event}</Text>
          ))}
          {selected === sampleRef && delivered && (
            <Text style={styles.event}>✓  Recipient confirmed receipt</Text>
          )}
        </Card>
        {selected === sampleRef && !delivered && (
          <Card title="Recipient handoff">
            <Text style={styles.muted}>Enter sample code 4826 to simulate receipt.</Text>
            <Field label="One-time code" value={code} onChangeText={setCode}
              keyboardType="number-pad" maxLength={4} />
            {!!codeError && <Text accessibilityRole="alert" style={styles.error}>{codeError}</Text>}
            <Action onPress={confirmReceipt}>Confirm receipt</Action>
          </Card>
        )}
      </>
    )}
  </>
  );
}
