import type { Role } from "./deliveryApi";
import { useRef, useState } from "react";
import {
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Action } from "../ui/controls";
import { RoleTheme, roleColors } from "../ui/RoleTheme";
import { styles } from "../ui/styles";

const senderSlides = [
  {
    title: "Send a package with FlyMate",
    description:
      "List what you’re sending, where it’s going, and how you’d like to hand it over.",
    image: require("../../assets/onboarding/send.webp"),
  },
  {
    title: "Find a traveler on your route",
    description:
      "Travelers can make offers on your shipment. Compare the offers, choose a traveler, and arrange pickup in chat.",
    image: require("../../assets/onboarding/match.webp"),
  },
  {
    title: "Track it through delivery",
    description:
      "Follow each shipment milestone. Separate pickup and delivery codes confirm the two handoffs.",
    image: require("../../assets/onboarding/track.webp"),
  },
];

const travelerSlides = [
  {
    ...senderSlides[0],
    title: "Earn while you travel",
    description: "Find parcels going where you’re already headed.",
  },
  {
    ...senderSlides[1],
    title: "Find shipments on your route",
    description:
      "Browse the Load Board, make an offer, and arrange pickup with the sender.",
  },
  {
    ...senderSlides[2],
    title: "Confirm both handoffs",
    description:
      "Use separate pickup and delivery codes, then find the completed shipment under My Trips.",
  },
];

export function SenderWelcome({
  onContinue,
}: {
  onContinue: (signUp: boolean, role: Role) => void;
}) {
  const [page, setPage] = useState(0);
  const [role, setRole] = useState<Role>("sender");
  const slides = role === "sender" ? senderSlides : travelerSlides;
  const accent = roleColors[role];
  const slide = slides[page];
  const lastPage = slides.length - 1;
  const swipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy) * 1.4,
      onPanResponderRelease: (_, { dx }) => {
        if (Math.abs(dx) < 40) return;
        setPage((current) =>
          Math.max(0, Math.min(lastPage, current + (dx < 0 ? 1 : -1))),
        );
      },
    }),
  ).current;

  return (
    <RoleTheme.Provider value={role}>
      <ScrollView contentContainerStyle={[styles.content, welcome.content]}>
        <Text
          accessibilityRole="header"
          style={[welcome.wordmark, { color: accent }]}
        >
          FlyMate
        </Text>
        <View style={welcome.pages}>
          {(["sender", "traveler"] as const).map((option) => (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: role === option }}
              onPress={() => {
                setPage(0);
                setRole(option);
              }}
              style={[
                welcome.role,
                role === option && { backgroundColor: accent },
              ]}
            >
              <Text
                style={{
                  color: role === option ? "#fff" : roleColors[option],
                  fontWeight: "700",
                }}
              >
                {option === "sender" ? "Sender" : "Traveler"}
              </Text>
            </Pressable>
          ))}
        </View>
        <View {...swipe.panHandlers} style={welcome.hero}>
          <Image
            source={slide.image}
            accessible={false}
            resizeMode="contain"
            style={welcome.illustration}
          />
          <Text
            accessibilityRole="header"
            accessibilityLiveRegion="polite"
            style={welcome.subtitle}
          >
            {slide.title}
          </Text>
          <Text style={welcome.description}>{slide.description}</Text>
        </View>
        <View style={welcome.pages} accessibilityLabel="Onboarding pages">
          {slides.map(({ title }, index) => (
            <Pressable
              key={title}
              accessibilityRole="button"
              accessibilityLabel={`Page ${index + 1}: ${title}`}
              accessibilityState={{ selected: page === index }}
              onPress={() => setPage(index)}
              style={welcome.pageTarget}
            >
              <View
                style={[
                  welcome.dot,
                  index === page && { backgroundColor: accent },
                ]}
              />
            </Pressable>
          ))}
        </View>
        <Action
          label={page === lastPage ? "Get started" : "Next"}
          onPress={() =>
            page === lastPage ? onContinue(true, role) : setPage(page + 1)
          }
        />
        {page < lastPage && (
          <Pressable
            accessibilityRole="button"
            onPress={() => onContinue(true, role)}
            style={welcome.secondary}
          >
            <Text style={[welcome.secondaryText, { color: accent }]}>
              Get started
            </Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => onContinue(false, role)}
          style={[welcome.login, { borderColor: accent }]}
        >
          <Text style={[welcome.secondaryText, { color: accent }]}>Login</Text>
        </Pressable>
      </ScrollView>
    </RoleTheme.Provider>
  );
}

const welcome = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: "center" },
  hero: { alignItems: "center", gap: 12, paddingHorizontal: 12 },
  wordmark: {
    fontSize: 40,
    fontWeight: "800",
    color: roleColors.sender,
    textAlign: "center",
  },
  illustration: { width: "100%", maxWidth: 360, height: 225, borderRadius: 18 },
  subtitle: {
    textAlign: "center",
    fontSize: 23,
    fontWeight: "700",
    color: "#192746",
  },
  description: {
    textAlign: "center",
    fontSize: 15,
    lineHeight: 23,
    color: "#44536b",
    minHeight: 60,
  },
  pages: { flexDirection: "row", justifyContent: "center" },
  pageTarget: {
    width: 44,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#c4d2e7" },
  role: {
    minHeight: 44,
    minWidth: 108,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  secondary: { minHeight: 35, alignItems: "center", justifyContent: "center" },
  login: {
    borderColor: roleColors.sender,
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: roleColors.sender, fontSize: 16, fontWeight: "700" },
});
