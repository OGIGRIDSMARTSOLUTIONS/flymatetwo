import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Action, Field } from "../ui/controls";
import { roleColors } from "../ui/RoleTheme";
import { styles } from "../ui/styles";
import { categories, splitDimensions, type Draft } from "./draft";
import type { UpdateDraft } from "./PackageLogistics";

export function PackageDetails({
  draft,
  error,
  update,
  next,
}: {
  draft: Draft;
  error: string;
  update: UpdateDraft;
  next: () => void;
}) {
  const [categoryOpen, setCategoryOpen] = useState(false);
  const dimensions = splitDimensions(draft.size);
  const axes = ["Length", "Width", "Height"];

  function updateDimension(index: number, value: string) {
    const next = [...dimensions];
    next[index] = value;
    update("size", next.every((part) => !part) ? "" : next.join("×") + " in");
  }

  return (
    <>
      <Text accessibilityRole="header" style={styles.cardTitle}>
        Package Details
      </Text>
      <Field
        label="Title / Item Name"
        value={draft.title}
        placeholder="e.g. Wedding gifts"
        onChange={(value) => update("title", value)}
      />
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Category</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: categoryOpen }}
          accessibilityLabel={`Category, ${draft.category || "Select category"}`}
          onPress={() => setCategoryOpen(!categoryOpen)}
          style={styles.field}
        >
          <Text style={styles.label}>
            {draft.category || "Select Category"} ▾
          </Text>
        </Pressable>
        {categoryOpen && (
          <View style={styles.card}>
            {categories.map((category) => (
              <Pressable
                key={category}
                accessibilityRole="button"
                accessibilityState={{ selected: draft.category === category }}
                style={{ minHeight: 38, justifyContent: "center" }}
                onPress={() => {
                  update("category", category);
                  setCategoryOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.label,
                    draft.category === category && {
                      color: roleColors.sender,
                      fontWeight: "700",
                    },
                  ]}
                >
                  {category}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
      <Field
        label="Description of Item"
        value={draft.contents}
        multiline
        placeholder="Describe the contents of the package"
        onChange={(value) => update("contents", value)}
      />
      <View style={styles.row}>
        <Field
          inRow
          label="From"
          value={draft.origin}
          placeholder="Origin city"
          onChange={(value) => update("origin", value)}
        />
        <Field
          inRow
          label="To"
          value={draft.destination}
          placeholder="Destination city"
          onChange={(value) => update("destination", value)}
        />
      </View>
      <Field
        label="Weight (kg or lbs)"
        value={draft.weight}
        placeholder="e.g. 4.5 kg"
        onChange={(value) => update("weight", value)}
      />
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Size (inches)</Text>
        <View style={styles.row}>
          {axes.map((axis, index) => (
            <Field
              key={axis}
              inRow
              label={axis}
              value={dimensions[index] ?? ""}
              placeholder={axis[0]}
              keyboardType="decimal-pad"
              onChange={(value) => updateDimension(index, value)}
            />
          ))}
        </View>
      </View>
      {error !== "" && (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      )}
      <Action label="Next" onPress={next} />
    </>
  );
}
