import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Action } from "../ui/controls";
import { roleColors } from "../ui/RoleTheme";
import { styles } from "../ui/styles";
import { isCalendarDate } from "./draft";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthLabel = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const fullDate = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "full",
  timeZone: "UTC",
});

function toPickerDate(value: string) {
  const today = new Date();
  return isCalendarDate(value)
    ? new Date(value + "T00:00:00Z")
    : new Date(
        Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
      );
}

export function PickupDatePicker({
  value,
  onChange,
  label = "Preferred pickup date",
}: {
  value: string;
  onChange: (date: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => toPickerDate(value));
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const firstWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  function moveMonth(offset: number) {
    setMonth(new Date(Date.UTC(year, monthIndex + offset, 1)));
  }

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          value
            ? `Change ${label.toLowerCase()}, ${fullDate.format(toPickerDate(value))}`
            : `Choose ${label.toLowerCase()}`
        }
        onPress={() => {
          setMonth(toPickerDate(value));
          setOpen(true);
        }}
        style={[styles.field, calendar.launch]}
      >
        <Text style={styles.label}>
          {value ? fullDate.format(toPickerDate(value)) : "Select date"}
        </Text>
        <Text style={calendar.chevron}>▾</Text>
      </Pressable>
      {open && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setOpen(false)}
        >
          <View style={calendar.overlay}>
            <View accessibilityViewIsModal style={calendar.dialog}>
              <Text accessibilityRole="header" style={styles.cardTitle}>
                {label}
              </Text>
              <View style={calendar.navigation}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous month"
                  onPress={() => moveMonth(-1)}
                  style={calendar.arrow}
                >
                  <Text style={calendar.chevron}>‹</Text>
                </Pressable>
                <Text accessibilityLiveRegion="polite" style={styles.cardTitle}>
                  {monthLabel.format(month)}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next month"
                  onPress={() => moveMonth(1)}
                  style={calendar.arrow}
                >
                  <Text style={calendar.chevron}>›</Text>
                </Pressable>
              </View>
              <View style={calendar.grid}>
                {weekdays.map((day) => (
                  <View key={day} style={calendar.cell}>
                    <Text style={calendar.weekday}>{day}</Text>
                  </View>
                ))}
                {Array.from({ length: firstWeekday + days }, (_, index) => {
                  const day = index - firstWeekday + 1;
                  if (day < 1)
                    return <View key={index} style={calendar.cell} />;
                  const date = new Date(Date.UTC(year, monthIndex, day));
                  const iso = date.toISOString().slice(0, 10);
                  return (
                    <Pressable
                      key={index}
                      accessibilityRole="button"
                      accessibilityLabel={fullDate.format(date)}
                      accessibilityState={{ selected: value === iso }}
                      style={calendar.cell}
                      onPress={() => {
                        onChange(iso);
                        setOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          calendar.day,
                          value === iso && calendar.selected,
                        ]}
                      >
                        {day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Action label="Cancel" onPress={() => setOpen(false)} />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const calendar = StyleSheet.create({
  launch: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#15243b66",
  },
  dialog: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 18,
    backgroundColor: "#fff",
    padding: 16,
    gap: 10,
  },
  navigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  arrow: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  chevron: { color: roleColors.sender, fontSize: 22 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: "14.28%",
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  weekday: { color: "#526077", fontSize: 11, fontWeight: "700" },
  day: {
    color: "#192746",
    width: 32,
    lineHeight: 32,
    borderRadius: 16,
    overflow: "hidden",
    textAlign: "center",
  },
  selected: { backgroundColor: roleColors.sender, color: "#fff" },
});
