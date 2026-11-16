import { Image, Pressable, StyleSheet, Text } from "react-native";
import { styles } from "../ui/styles";

export function ProfileAvatar({
  photo,
  initial = "A",
  onPress,
}: {
  photo: string;
  initial?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={photo ? "Change profile photo" : "Add profile photo"}
      onPress={onPress}
      style={[styles.avatar, avatarStyles.content]}
    >
      {photo ? (
        <Image source={{ uri: photo }} style={avatarStyles.image} />
      ) : (
        <Text style={styles.cardTitle}>{initial}</Text>
      )}
    </Pressable>
  );
}

const avatarStyles = StyleSheet.create({
  content: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
});
