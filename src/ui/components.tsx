import type { ReactNode } from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";
import { styles } from "./styles";

export function Action({ children, onPress, secondary = false }: { children: ReactNode; onPress: () => void; secondary?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={[styles.button, secondary && styles.secondary]}>
      <Text style={styles.buttonText}>{children}</Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={label} placeholderTextColor="#52685e"
        style={styles.input} {...props} />
    </View>
  );
}

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{title}</Text>
      {children}
    </View>
  );
}
