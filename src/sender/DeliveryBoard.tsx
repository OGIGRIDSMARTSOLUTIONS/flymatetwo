import { TestCheckout } from "../payments/TestCheckout";
import { ShipmentChat } from "../chat/ShipmentChat";
import { ShipmentDetails } from "./ShipmentDetails";
import { shipmentTab, type ShipmentTab } from "./shipmentStatus";
import { colors } from "../theme";
import {
  filterDeliveries,
  type TravelerView,
  type RouteFilters,
} from "../traveler/filterDeliveries";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Action, Field } from "../ui/controls";
import { styles } from "../ui/styles";
import { parseOffer } from "./draft";
import {
  createDeliveryApi,
  type Delivery,
  type DeliveryCommand,
  type Role,
} from "./deliveryApi";

function DeliveryCard({
  shipment,
  role,
  run,
  busy,
  token,
  onPaymentConfirmed,
}: {
  shipment: Delivery;
  role: Role;
  run: (command: DeliveryCommand) => void;
  busy: boolean;
  token: string;
  onPaymentConfirmed: () => void;
}) {
  const [input, setInput] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const { delivery, package: parcel } = shipment;
  const traveler = role === "traveler";
  const offer = parseOffer(input);
  const handoff = delivery.status === "Matched" ? "pickup" : "deliver";

  if (chatOpen)
    return (
      <ShipmentChat
        token={token}
        id={shipment.id}
        role={role}
        onClose={() => setChatOpen(false)}
      />
    );

  return (
    <View style={styles.card}>
      {parcel.title && <Text style={styles.cardTitle}>{parcel.title}</Text>}
      <Text style={parcel.title ? styles.label : styles.cardTitle}>
        {parcel.origin} → {parcel.destination}
      </Text>
      <Text style={styles.label}>{parcel.contents}</Text>
      <Text style={styles.label}>
        Listed reward · USD {(parcel.offerMinor / 100).toFixed(2)}
      </Text>
      {delivery.offerMinor !== undefined && (
        <Text style={styles.label}>
          Traveler offer · USD {(delivery.offerMinor / 100).toFixed(2)}
        </Text>
      )}
      {parcel.weight !== undefined && (
        <Text style={styles.label}>
          {parcel.category} · {parcel.weight} {parcel.weightUnit} ·{" "}
          {parcel.size}
        </Text>
      )}
      {parcel.pickupMethod && (
        <Text style={styles.label}>
          Pickup ·{" "}
          {parcel.pickupMethod === "airport" ? "Airport" : "Public spot"}
        </Text>
      )}
      {parcel.preferredDate && (
        <Text style={styles.label}>
          Preferred date · {parcel.preferredDate}
        </Text>
      )}
      {!traveler && delivery.paymentRequired && (
        <TestCheckout
          token={token}
          id={shipment.id}
          delivered={delivery.status === "Delivered"}
          onConfirmed={onPaymentConfirmed}
        />
      )}
      {traveler &&
        delivery.paymentRequired &&
        delivery.status === "Matched" &&
        !shipment.testPaymentConfirmed && (
          <Text style={styles.label}>
            Awaiting the sender’s test payment. Refresh the shipment after they
            verify it.
          </Text>
        )}
      <Text style={styles.cardTitle}>Tracking timeline</Text>
      {delivery.timeline.map((event) => (
        <Text key={event.status} style={styles.label}>
          {event.status} · {new Date(event.at).toLocaleString()}
        </Text>
      ))}
      {shipment.code && (
        <Text selectable style={styles.cardTitle}>
          {handoff === "pickup"
            ? "Sender pickup code"
            : "Receiver delivery code"}{" "}
          · {shipment.code}
        </Text>
      )}
      {delivery.status !== "Published" && (
        <Action
          label={traveler ? "Chat with sender" : "Chat with traveler"}
          onPress={() => setChatOpen(true)}
        />
      )}
      {!traveler &&
        delivery.status === "Published" &&
        Object.entries(
          delivery.offers ??
            (delivery.offerMinor === undefined
              ? {}
              : {
                  "legacy-traveler": {
                    amount: delivery.offerMinor,
                    name: "Development traveler",
                  },
                }),
        ).map(([travelerId, bid]) => (
          <Action
            key={travelerId}
            disabled={busy}
            label={`Accept ${bid.name ?? "traveler"} · USD ${(bid.amount / 100).toFixed(2)}`}
            onPress={() =>
              run({ action: "accept", amount: bid.amount, travelerId })
            }
          />
        ))}
      {!traveler && delivery.attempts >= 5 && (
        <Action
          label="Unlock handoff attempts"
          onPress={() => run({ action: "resetAttempts" })}
        />
      )}
      {traveler && delivery.status === "Published" && (
        <>
          <Field
            label="Your offer (USD)"
            value={input}
            onChange={setInput}
            placeholder="Enter amount"
            keyboardType="decimal-pad"
          />
          <Action
            label={busy ? "Please wait…" : "Make offer"}
            disabled={busy || offer === null}
            onPress={() => {
              if (offer !== null)
                run({ action: "offer", amount: Math.round(offer * 100) });
            }}
          />
        </>
      )}
      {traveler &&
        ((delivery.status === "Matched" &&
          (!delivery.paymentRequired || shipment.testPaymentConfirmed)) ||
          delivery.status === "In transit") && (
          <>
            <Field
              key={handoff}
              label="Handoff code"
              value={input}
              onChange={setInput}
              placeholder="Enter the 8-character code"
            />
            <Action
              label={
                handoff === "pickup" ? "Confirm pickup" : "Confirm delivery"
              }
              onPress={() => run({ action: handoff, code: input })}
            />
          </>
        )}
      {traveler && delivery.status === "Picked up" && (
        <Action
          label="Mark in transit"
          onPress={() => {
            setInput("");
            run({ action: "transit" });
          }}
        />
      )}
    </View>
  );
}

export function DeliveryBoard({
  token,
  role,
  revision = 0,
  travelerView,
  query = "",
  senderView,
  routeFilters,
  unreadIds = [],
}: {
  token: string;
  role: Role;
  revision?: number;
  travelerView?: TravelerView;
  query?: string;
  senderView?: ShipmentTab;
  routeFilters?: RouteFilters;
  unreadIds?: string[];
}) {
  const [shipments, setShipments] = useState<Delivery[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = shipments.find(({ id }) => id === selectedId);
  const visible = travelerView
    ? filterDeliveries(shipments, travelerView, query, routeFilters)
    : senderView
      ? shipments.filter(
          ({ delivery }) => shipmentTab(delivery.status) === senderView,
        )
      : shipments;
  const emptyMessage = senderView
    ? senderView === "Active"
      ? "No active published shipments."
      : senderView === "In Transit"
        ? "No shipments in transit."
        : "No completed shipments."
    : travelerView === "active"
      ? "No active trips yet."
      : travelerView === "completed"
        ? "No completed trips yet."
        : query.trim()
          ? "No published shipments match your search."
          : "No published shipments yet.";

  const refresh = useCallback(async () => {
    const result = await createDeliveryApi(token).list();
    setShipments(result.shipments);
  }, [token]);

  useEffect(() => {
    let active = true;
    createDeliveryApi(token)
      .list()
      .then(
        (result) => {
          if (active) {
            setShipments(result.shipments);
            setLoading(false);
          }
        },
        () => {
          if (active) {
            setError("Could not load deliveries.");
            setLoading(false);
          }
        },
      );
    return () => {
      active = false;
    };
  }, [token, revision]);

  async function run(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
      await refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not update the delivery.",
      );
      await refresh().catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Action
        label={busy ? "Please wait…" : "Refresh deliveries"}
        onPress={() => run(async () => {})}
        disabled={busy || loading}
      />
      {error !== "" && !selected && (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      )}
      {loading && (
        <Text accessibilityLiveRegion="polite" style={styles.label}>
          Loading deliveries…
        </Text>
      )}
      {!loading && error === "" && visible.length === 0 && (
        <Text style={styles.label}>{emptyMessage}</Text>
      )}
      {visible.map((shipment) =>
        senderView || travelerView ? (
          <Pressable
            key={shipment.id}
            accessibilityRole="button"
            accessibilityLabel={`View shipment from ${shipment.package.origin} to ${shipment.package.destination}`}
            style={styles.card}
            onPress={() => setSelectedId(shipment.id)}
          >
            <Text style={styles.cardTitle}>
              {shipment.package.title ??
                `${shipment.package.origin} → ${shipment.package.destination}`}
            </Text>
            {shipment.package.title && (
              <Text style={styles.label}>
                {shipment.package.origin} → {shipment.package.destination}
              </Text>
            )}
            <Text
              style={[
                styles.badge,
                {
                  backgroundColor:
                    travelerView || shipment.delivery.status === "Delivered"
                      ? colors.greenTint
                      : colors.blueTint,
                },
              ]}
            >
              {shipment.delivery.status}
            </Text>
            {unreadIds.includes(shipment.id) && (
              <Text style={styles.label}>New message</Text>
            )}
            <Text style={styles.label} numberOfLines={2}>
              {shipment.package.contents}
            </Text>
            <Text style={styles.label}>
              Updated{" "}
              {new Date(shipment.delivery.timeline.at(-1)!.at).toLocaleString()}
            </Text>
          </Pressable>
        ) : (
          <DeliveryCard
            key={`${shipment.id}:${shipment.delivery.status}`}
            shipment={shipment}
            role={role}
            token={token}
            onPaymentConfirmed={() => void run(async () => {})}
            busy={busy}
            run={(command) =>
              run(() => createDeliveryApi(token).act(shipment.id, command))
            }
          />
        ),
      )}
      {selected && (
        <ShipmentDetails
          key={selected.id}
          token={token}
          shipment={selected}
          busy={busy}
          onClose={() => {
            setError("");
            setSelectedId(null);
          }}
          onRefresh={() => run(async () => {})}
        >
          {error !== "" && (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              {error}
            </Text>
          )}
          <DeliveryCard
            shipment={selected}
            role={role}
            token={token}
            onPaymentConfirmed={() => void run(async () => {})}
            busy={busy}
            run={(command) =>
              run(() => createDeliveryApi(token).act(selected.id, command))
            }
          />
        </ShipmentDetails>
      )}
    </>
  );
}
