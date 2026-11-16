import { useUnreadChats } from "../chat/useUnreadChats";
import { UnreadLabel } from "../chat/UnreadLabel";
import { PickupDatePicker } from "../sender/PickupDatePicker";
import { TravelerVerification } from "./TravelerVerification";
import { TravelerEarnings } from "./TravelerEarnings";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DeliveryBoard } from "../sender/DeliveryBoard";
import { Action, Field } from "../ui/controls";
import { roleColors } from "../ui/RoleTheme";
import { styles } from "../ui/styles";

const tabs = ["Board", "My Trips", "Earnings", "Profile"] as const;
type Tab = (typeof tabs)[number];

export function TravelerHome({
  token,
  name,
  legacy,
  onSignOut,
}: {
  token: string;
  name?: string;
  legacy: boolean;
  onSignOut: () => void;
}) {
  const unreadChats = useUnreadChats(token);
  const [tab, setTab] = useState<Tab>("Board");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ from: "", to: "", date: "" });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [profileView, setProfileView] = useState<
    "profile" | "identity" | "background"
  >("profile");
  const [completed, setCompleted] = useState(false);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          {tab === "Board"
            ? "Load board"
            : tab === "Profile" && profileView !== "profile"
              ? profileView === "identity"
                ? "Identity verification"
                : "Background check"
              : tab}
        </Text>
      </View>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          key={tab}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {tab === "Earnings" ? (
            legacy ? (
              <Text style={styles.label}>
                Sign in with a Traveler email account to view earnings.
              </Text>
            ) : (
              <TravelerEarnings token={token} />
            )
          ) : tab === "Profile" && profileView !== "profile" ? (
            <>
              <Action
                label="Back to profile"
                onPress={() => setProfileView("profile")}
              />
              <TravelerVerification
                token={token}
                background={profileView === "background"}
                onBackground={() => setProfileView("background")}
              />
            </>
          ) : tab === "Profile" ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {name ?? "Development traveler"}
              </Text>
              <Text style={styles.label}>Traveler account</Text>
              {!legacy && (
                <Action
                  label="Identity verification"
                  onPress={() => setProfileView("identity")}
                />
              )}
              {!legacy && (
                <Action
                  label="Background check"
                  onPress={() => setProfileView("background")}
                />
              )}
              <Action label="Sign out" onPress={onSignOut} />
            </View>
          ) : (
            <>
              {tab === "Board" ? (
                <>
                  <Field
                    label="Search shipments"
                    placeholder="City, route or package contents"
                    value={query}
                    onChange={setQuery}
                    autoCapitalize="none"
                  />
                  <Action
                    label={
                      filtersOpen ? "Hide filters" : "Filter by route and date"
                    }
                    onPress={() => setFiltersOpen(!filtersOpen)}
                  />
                  {filtersOpen && (
                    <View style={styles.card}>
                      <View style={styles.row}>
                        <Field
                          inRow
                          label="From"
                          placeholder="Any origin"
                          value={filters.from}
                          onChange={(from) => setFilters({ ...filters, from })}
                        />
                        <Field
                          inRow
                          label="To"
                          placeholder="Any destination"
                          value={filters.to}
                          onChange={(to) => setFilters({ ...filters, to })}
                        />
                      </View>
                      <PickupDatePicker
                        label="Pickup day"
                        value={filters.date}
                        onChange={(date) => setFilters({ ...filters, date })}
                      />
                      <Action
                        label="Clear filters"
                        onPress={() =>
                          setFilters({ from: "", to: "", date: "" })
                        }
                      />
                    </View>
                  )}
                </>
              ) : (
                <View style={travelerStyles.segments}>
                  {[false, true].map((showCompleted) => {
                    const selected = completed === showCompleted;
                    return (
                      <Pressable
                        key={String(showCompleted)}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => setCompleted(showCompleted)}
                        style={[
                          travelerStyles.segment,
                          selected && travelerStyles.selected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.label,
                            selected && travelerStyles.selectedText,
                          ]}
                        >
                          {showCompleted ? "Completed" : "Active"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
              <DeliveryBoard
                token={token}
                role="traveler"
                travelerView={
                  tab === "Board" ? "board" : completed ? "completed" : "active"
                }
                query={query}
                routeFilters={filters}
                unreadIds={unreadChats}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <View accessibilityRole="tablist" style={styles.nav}>
        {tabs.map((item) => (
          <Pressable
            key={item}
            accessibilityRole="tab"
            accessibilityLabel={
              item === "My Trips" && unreadChats.length
                ? `My Trips, ${unreadChats.length} unread conversations`
                : item
            }
            accessibilityState={{ selected: item === tab }}
            onPress={() => {
              setProfileView("profile");
              setTab(item);
            }}
            style={styles.navItem}
          >
            <Text
              style={[styles.label, item === tab && travelerStyles.activeTab]}
            >
              {item}
            </Text>
            {item === "My Trips" && <UnreadLabel count={unreadChats.length} />}
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const travelerStyles = StyleSheet.create({
  segments: {
    flexDirection: "row",
    gap: 8,
    padding: 4,
    borderRadius: 12,
    backgroundColor: "#edf4ef",
  },
  segment: {
    flex: 1,
    minHeight: 42,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  selected: { backgroundColor: roleColors.traveler },
  selectedText: { color: "#fff", fontWeight: "700" },
  activeTab: { color: roleColors.traveler, fontWeight: "700" },
});
