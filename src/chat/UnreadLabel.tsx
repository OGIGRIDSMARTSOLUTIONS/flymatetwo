import { StyleSheet, Text } from "react-native";

export function UnreadLabel({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Text
      accessibilityLabel={`${count} unread conversations`}
      style={styles.badge}
    >
      {count > 99 ? "99+" : count}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: "#ad2036",
    color: "#fff",
    borderRadius: 9,
    overflow: "hidden",
    minWidth: 18,
    paddingHorizontal: 4,
    fontSize: 10,
    textAlign: "center",
    fontWeight: "700",
  },
});
