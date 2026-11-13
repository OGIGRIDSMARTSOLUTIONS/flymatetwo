import React, { useState } from "react";
import {
  Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const sampleRef = "FM-24018";
const initialShipments = {
  [sampleRef]: {
    route: "Lagos → London",
    goods: "Printed brochures · 2.5 kg · International",
    events: [
      "Booking confirmed",
      "Courier identity verified",
      "Parcel picked up",
      "Export clearance recorded",
      "Arrived at destination",
      "Ready for recipient handoff",
    ],
  },
};
const emptyBooking = { origin: "", destination: "", goods: "", weight: "" };
const tabs = [["⌂", "Home"], ["＋", "Book"], ["◎", "Track"], ["◇", "Verify"]];

function Action({ children, onPress, secondary = false }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={[styles.button, secondary && styles.secondary]}>
      <Text style={styles.buttonText}>{children}</Text>
    </Pressable>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={label} placeholderTextColor="#52685e"
        style={styles.input} {...props} />
    </View>
  );
}

function Card({ title, children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{title}</Text>
      {children}
    </View>
  );
}

function Dashboard() {
  const [tab, setTab] = useState("Home");
  const [shipments, setShipments] = useState(initialShipments);
  const [reference, setReference] = useState(sampleRef);
  const [selected, setSelected] = useState(sampleRef);
  const [booking, setBooking] = useState(emptyBooking);
  const [bookingError, setBookingError] = useState("");
  const [international, setInternational] = useState(true);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [delivered, setDelivered] = useState(false);
  const shipment = shipments[selected];

  function openTracking(id) {
    setReference(id);
    setSelected(id);
    setTab("Track");
  }

  function bookShipment() {
    const origin = booking.origin.trim();
    const destination = booking.destination.trim();
    const goods = booking.goods.trim();
    const weight = Number(booking.weight.trim().replace(",", "."));
    if (!origin || !destination || !goods || !Number.isFinite(weight) || weight <= 0) {
      setBookingError("Enter both cities, a description, and a weight above zero.");
      return;
    }

    const id = "FM-" + (24018 + Object.keys(shipments).length);
    setShipments({
      ...shipments,
      [id]: {
        route: origin + " → " + destination,
        goods: goods + " · " + weight + " kg · " + (international ? "International" : "Domestic"),
        events: ["Demo booking created", "Awaiting courier assignment"],
      },
    });
    setBooking(emptyBooking);
    setBookingError("");
    openTracking(id);
  }

  function confirmReceipt() {
    if (code.trim() !== "4826") {
      setCodeError("Incorrect code. Try the sample code shown above.");
      return;
    }

    setCodeError("");
    setDelivered(true);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#122c25" />
      <View style={styles.header}>
        <Text style={styles.brand}><Text style={styles.brandMark}>↗ </Text>FlyMate</Text>
        <Text style={styles.demo}>DEMO MODE</Text>
      </View>

      <ScrollView key={tab} style={styles.body} contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        {tab === "Home" && (
          <>
            <Text style={styles.title}>Ship with confidence.</Text>
            <Text style={styles.muted}>Follow your goods from pickup to handoff.</Text>
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>SAMPLE SHIPMENT · {sampleRef}</Text>
              <Text style={styles.route}>LOS  ╌ ✈ ╌  LHR</Text>
              <Text style={styles.heroNote}>Lagos to London</Text>
              <Action onPress={() => openTracking(sampleRef)}>Track shipment</Action>
            </View>
            <Action secondary onPress={() => setTab("Book")}>Book a delivery</Action>
            <Card title="Shipment checks">
              <Text style={styles.muted}>Review courier identity, export documents, and recipient confirmation.</Text>
              <Action secondary onPress={() => setTab("Verify")}>View verification</Action>
            </Card>
          </>
        )}

        {tab === "Book" && (
          <>
            <Text style={styles.title}>Book a delivery</Text>
            <Text style={styles.muted}>Use fictional details to create a demo shipment.</Text>
            <Card title="Shipment details">
              {[
                ["origin", "Pickup city", "Lagos, Nigeria"],
                ["destination", "Destination city", "London, UK"],
                ["goods", "Goods description", "Printed brochures"],
                ["weight", "Weight in kg", "2.5"],
              ].map(([key, label, placeholder]) => (
                <Field key={key} label={label} placeholder={placeholder}
                  value={booking[key]} maxLength={key === "weight" ? 10 : 100}
                  keyboardType={key === "weight" ? "decimal-pad" : "default"}
                  onChangeText={(value) => setBooking({ ...booking, [key]: value })} />
              ))}
              <Text style={styles.label}>Shipment type</Text>
              <View style={styles.options}>
                {[true, false].map((option) => (
                  <Pressable key={String(option)} accessibilityRole="button"
                    accessibilityState={{ selected: international === option }}
                    onPress={() => setInternational(option)}
                    style={[styles.option, international === option && styles.selected]}>
                    <Text style={styles.buttonText}>{option ? "International" : "Domestic"}</Text>
                  </Pressable>
                ))}
              </View>
              {!!bookingError && <Text accessibilityRole="alert" style={styles.error}>{bookingError}</Text>}
              <Action onPress={bookShipment}>Create demo shipment</Action>
            </Card>
          </>
        )}

        {tab === "Track" && (
          <>
            <Text style={styles.title}>Track shipment</Text>
            <Card title="Find a shipment">
              <Field label="Tracking reference" value={reference} onChangeText={setReference}
                autoCapitalize="characters" autoCorrect={false} />
              <Action onPress={() => setSelected(reference.trim().toUpperCase())}>Find shipment</Action>
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
        )}

        {tab === "Verify" && (
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
              <Action secondary onPress={() => openTracking(sampleRef)}>Open tracking</Action>
            </Card>
          </>
        )}
      </ScrollView>

      <View style={styles.nav}>
        {tabs.map(([icon, label]) => (
          <Pressable key={label} accessibilityRole="tab"
            accessibilityState={{ selected: tab === label }}
            onPress={() => setTab(label)}
            style={[styles.tab, tab === label && styles.selected]}>
            <Text style={styles.tabIcon}>{icon}</Text>
            <Text style={styles.tabLabel}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return <SafeAreaProvider><Dashboard /></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#122c25" },
  header: { paddingHorizontal: 20, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { color: "#fff", fontSize: 27, fontWeight: "800", letterSpacing: -1 },
  brandMark: { color: "#d9fc91" },
  demo: { color: "#d9fc91", fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  body: { flex: 1, backgroundColor: "#eef2ea" },
  content: { padding: 20, gap: 12, width: "100%", maxWidth: 640, alignSelf: "center" },
  title: { fontSize: 36, lineHeight: 40, fontWeight: "800", color: "#142c26", letterSpacing: -1.5 },
  heading: { fontSize: 19, fontWeight: "800", color: "#142c26" },
  muted: { fontSize: 15, color: "#52685e", lineHeight: 22 },
  hero: { backgroundColor: "#17392e", padding: 22, borderRadius: 24, gap: 10 },
  eyebrow: { color: "#c7eaa1", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  route: { color: "white", fontSize: 32, fontWeight: "800" },
  heroNote: { color: "#c1d5c8", fontSize: 15 },
  button: { borderRadius: 12, minHeight: 46, justifyContent: "center", alignItems: "center", padding: 10, backgroundColor: "#d9fc91" },
  secondary: { backgroundColor: "#e6efe1" },
  buttonText: { fontWeight: "800", fontSize: 15, color: "#17392e", textAlign: "center" },
  card: { backgroundColor: "white", borderRadius: 17, padding: 17, gap: 10, borderWidth: 1, borderColor: "#dbe5da" },
  field: { gap: 4 },
  label: { fontSize: 14, fontWeight: "700", color: "#142c26" },
  input: { paddingHorizontal: 12, minHeight: 46, borderRadius: 9, borderWidth: 1, borderColor: "#acbfb0", color: "#142c26" },
  options: { flexDirection: "row", gap: 8 },
  option: { flex: 1, padding: 10, minHeight: 44, borderRadius: 10, backgroundColor: "#f2f5f0" },
  selected: { backgroundColor: "#dcebcf" },
  error: { color: "#9d211c", fontSize: 14 },
  event: { color: "#245038", fontSize: 15 },
  nav: { flexDirection: "row", backgroundColor: "white", padding: 8, gap: 4 },
  tab: { flex: 1, alignItems: "center", borderRadius: 10, paddingVertical: 5, minHeight: 48 },
  tabIcon: { color: "#17392e", fontSize: 19 },
  tabLabel: { color: "#17392e", fontSize: 13, fontWeight: "700" },
});
