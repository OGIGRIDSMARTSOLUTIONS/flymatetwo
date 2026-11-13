import { useState } from "react";
import { Text, View } from "react-native";
import { getRate } from "../rates/client";
import type { RateQuote, ShipmentType, WeightUnit } from "../rates/types";
import type { Shipment } from "../tracking/data";
import { Action, Card, Field } from "../ui/components";
import { styles } from "../ui/styles";

const fields = [
  ["origin", "Pickup city", "Lagos"],
  ["destination", "Destination city", "London"],
  ["goods", "Goods description", "Printed brochures"],
  ["weight", "Actual weight", "2.5"],
  ["length", "Length (cm, optional)", "40"],
  ["width", "Width (cm, optional)", "30"],
  ["height", "Height (cm, optional)", "20"],
] as const;

function measurement(value: string): number {
  const normalized = value.trim().replace(",", ".");
  return /^\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : NaN;
}

export function BookingScreen({ onBook }: { onBook: (shipment: Shipment) => void }) {
  const [form, setForm] = useState({
    origin: "", destination: "", goods: "", weight: "", length: "", width: "", height: "",
  });
  const [unit, setUnit] = useState<WeightUnit>("kg");
  const [shipmentType, setShipmentType] = useState<ShipmentType>("international");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<{ input: string; rate: RateQuote }>();
  const input = JSON.stringify([form, unit, shipmentType]);
  const currentRate = quote?.input === input ? quote.rate : undefined;

  async function requestQuote() {
    if (loading) return;
    setError("");
    setQuote(undefined);

    const origin = form.origin.trim();
    const destination = form.destination.trim();
    const weight = measurement(form.weight);
    const dimensionsEntered = [form.length, form.width, form.height].some((value) => value.trim());
    const dimensionsCm = dimensionsEntered ? {
      length: measurement(form.length),
      width: measurement(form.width),
      height: measurement(form.height),
    } : undefined;

    if (!origin || !destination || !Number.isFinite(weight) || weight <= 0 || weight > 10000) {
      setError("Enter both cities and an actual weight above 0 and up to 10,000.");
      return;
    }
    if (dimensionsCm && Object.values(dimensionsCm).some((value) => !Number.isFinite(value) || value <= 0 || value > 500)) {
      setError("Enter all three dimensions above 0 and up to 500 cm, or leave them blank.");
      return;
    }

    setLoading(true);
    try {
      const rate = await getRate({ origin, destination, weight, unit, shipmentType, dimensionsCm });
      setQuote({ input, rate });
    } catch (failure) {
      setError(failure instanceof Error && failure.name !== "AbortError"
        ? failure.message
        : "The quote request timed out. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function bookShipment() {
    const weight = measurement(form.weight);
    if (!form.origin.trim() || !form.destination.trim() || !form.goods.trim()
      || !Number.isFinite(weight) || weight <= 0 || weight > 10000) {
      setError("Enter both cities, a goods description, and a valid actual weight.");
      return;
    }
    const estimate = currentRate ? " · Demo quote ₦" + currentRate.amount.toLocaleString("en-NG") : "";
    onBook({
      route: form.origin.trim() + " → " + form.destination.trim(),
      goods: form.goods.trim() + " · " + weight + " " + unit + " · " + shipmentType + estimate,
      events: ["Demo booking created", "Awaiting courier assignment"],
    });
  }

  return (
    <>
      <Text style={styles.title}>Book a delivery</Text>
      <Text style={styles.muted}>Use fictional details to create a demo shipment.</Text>
      <Card title="Shipment details">
        {fields.map(([key, label, placeholder], index) => (
          <Field key={key} label={label} placeholder={placeholder}
            value={form[key]} maxLength={index >= 3 ? 10 : 100}
            keyboardType={index >= 3 ? "decimal-pad" : "default"}
            onChangeText={(value) => {
              setError("");
              setForm((current) => ({ ...current, [key]: value }));
            }} />
        ))}
        <Text style={styles.label}>Weight unit · {unit}</Text>
        <View style={styles.options}>
          <Action secondary onPress={() => setUnit("kg")}>Kilograms</Action>
          <Action secondary onPress={() => setUnit("lb")}>Pounds</Action>
        </View>
        <Text style={styles.label}>Shipment type · {shipmentType}</Text>
        <View style={styles.options}>
          <Action secondary onPress={() => setShipmentType("international")}>International</Action>
          <Action secondary onPress={() => setShipmentType("domestic")}>Domestic</Action>
        </View>
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <Action secondary onPress={requestQuote}>{loading ? "Getting quote…" : "Get demo rate"}</Action>
        {currentRate && (
          <Card title={"Demo estimate · ₦" + currentRate.amount.toLocaleString("en-NG")}>
            <Text style={styles.muted}>
              Actual: {currentRate.actualKg.toFixed(2)} kg
              {currentRate.volumetricKg !== null
                ? " · Volumetric: " + currentRate.volumetricKg.toFixed(2) + " kg"
                : ""}
              {" · Billable: " + currentRate.billableKg.toFixed(2) + " kg"}
            </Text>
          </Card>
        )}
        <Action onPress={bookShipment}>Create demo shipment</Action>
      </Card>
    </>
  );
}
