import { StyleSheet, Text, View } from "react-native";
import { roleColors } from "../ui/RoleTheme";

const steps = ["Details", "Pickup", "Review", "Publish"];
export function ShipmentProgress({ step }: { step: number }) {
  return (
    <View
      style={style.row}
      accessibilityLabel={`Step ${step} of 4, ${steps[step - 1]}`}
    >
      {steps.map((name, index) => (
        <View key={name} style={style.step}>
          <Text style={[style.dot, index < step && style.active]}>
            {index + 1}
          </Text>
          <Text style={style.label}>{name}</Text>
        </View>
      ))}
    </View>
  );
}

const style = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-around" },
  step: { alignItems: "center", gap: 5 },
  dot: {
    width: 30,
    height: 30,
    lineHeight: 30,
    textAlign: "center",
    borderRadius: 15,
    backgroundColor: "#edf2fb",
    color: "#334158",
    fontWeight: "700",
  },
  active: { backgroundColor: roleColors.sender, color: "#fff" },
  label: { fontSize: 11, color: "#334158" },
});
