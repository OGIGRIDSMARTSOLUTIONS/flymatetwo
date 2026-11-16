import {
  Pressable,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from "react-native";
import { colors } from "../theme";
import { useRoleColor } from "./RoleTheme";
import { styles } from "./styles";

export function Action({
  label,
  onPress,
  amber = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  amber?: boolean;
  disabled?: boolean;
}) {
  const accent = useRoleColor();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.action,
        amber && !accent && styles.amber,
        accent && { backgroundColor: accent },
        disabled && styles.pressed,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.actionText, amber && !accent && styles.amberText]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  multiline,
  inRow = false,
  secureTextEntry,
  autoCapitalize,
  autoComplete,
  editable,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  inRow?: boolean;
  secureTextEntry?: boolean;
  autoCapitalize?: React.ComponentProps<typeof TextInput>["autoCapitalize"];
  autoComplete?: React.ComponentProps<typeof TextInput>["autoComplete"];
  editable?: boolean;
}) {
  return (
    <View style={[styles.fieldGroup, inRow && styles.rowField]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        editable={editable}
        style={[styles.field, multiline && styles.multiline]}
      />
    </View>
  );
}
