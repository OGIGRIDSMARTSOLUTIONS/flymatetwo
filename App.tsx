import React, { useState } from "react";
import {
  Pressable, ScrollView, StatusBar, Text, View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { Action, Card } from "./src/ui/components";
import { styles } from "./src/ui/styles";
import { initialShipments, sampleRef, type Shipment } from "./src/tracking/data";
import { TrackingScreen } from "./src/tracking/TrackingScreen";
import { BookingScreen } from "./src/booking/BookingScreen";
import { VerificationScreen } from "./src/verification/VerificationScreen";

const tabs = [["⌂", "Home"], ["＋", "Book"], ["◎", "Track"], ["◇", "Verify"]] as const;
type Tab = typeof tabs[number][1];

function Dashboard() {
  const [tab, setTab] = useState<Tab>("Home");
  const [shipments, setShipments] = useState(initialShipments);
  const [selected, setSelected] = useState(sampleRef);
  const [delivered, setDelivered] = useState(false);

  function openTracking(reference: string) {
    setSelected(reference);
    setTab("Track");
  }

  function bookShipment(shipment: Shipment) {
    const reference = "FM-" + (24018 + Object.keys(shipments).length);
    setShipments((current) => ({ ...current, [reference]: shipment }));
    openTracking(reference);
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

        {tab === "Book" && <BookingScreen onBook={bookShipment} />}
        {tab === "Track" && (
          <TrackingScreen selected={selected} shipment={shipments[selected]}
            delivered={delivered} onSearch={setSelected} onDeliver={() => setDelivered(true)} />
        )}
        {tab === "Verify" && (
          <VerificationScreen delivered={delivered} onTrack={() => openTracking(sampleRef)} />
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
