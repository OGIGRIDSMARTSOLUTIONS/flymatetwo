import { Pressable, StyleSheet, Text, View } from "react-native";
import { roleColors } from "../ui/RoleTheme";
import { shipmentTabs, type ShipmentTab } from "./shipmentStatus";

export function ShipmentTabs({
  selected,
  onChange,
}: {
  selected: ShipmentTab;
  onChange: (tab: ShipmentTab) => void;
}) {
  return (
    <View accessibilityRole="tablist" style={styles.list}>
      {shipmentTabs.map((tab) => {
        const active = tab === selected;
        return (
          <Pressable
            key={tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(tab)}
            style={[styles.tab, active && styles.active]}
          >
            <Text style={[styles.label, active && styles.activeLabel]}>
              {tab}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    flexDirection: "row",
    gap: 4,
    padding: 4,
    borderRadius: 12,
    backgroundColor: "#edf2fb",
  },
  tab: {
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  active: { backgroundColor: roleColors.sender },
  label: {
    color: roleColors.sender,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  activeLabel: { color: "#fff" },
});
