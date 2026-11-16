import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { accountApi, type Session } from "./accountApi";
import { Action, Field } from "../ui/controls";
import { RoleTheme, roleColors } from "../ui/RoleTheme";
import { styles } from "../ui/styles";
import type { Role } from "../sender/deliveryApi";

export function AccountScreen({
  onSession,
  onDevelopment,
  initialSignUp = false,
  initialRole = "sender",
}: {
  onSession: (session: Session) => void;
  onDevelopment: () => void;
  initialSignUp?: boolean;
  initialRole?: Role;
}) {
  const [role, setRole] = useState<Role>(initialRole);
  const [signUp, setSignUp] = useState(initialSignUp);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const primary = roleColors[role];

  async function submit() {
    if (submitting.current) return;
    const credentials = { email: email.trim(), password };
    if (!credentials.email || !password) {
      setError("Enter your email and password.");
      return;
    }
    if (signUp && password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const session = signUp
        ? await accountApi.register({
            ...credentials,
            role,
            name,
            phone: phone.replace(/[\s()-]/g, ""),
          })
        : await accountApi.login(credentials);
      onSession(session);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not connect to FlyMate.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <RoleTheme.Provider value={role}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={accountStyles.brand}>
            <Text style={[accountStyles.logo, { color: primary }]}>
              ✈ FlyMate
            </Text>
            <Text accessibilityRole="header" style={styles.title}>
              {signUp ? "Create account" : "Log in"}
            </Text>
          </View>
          <View style={accountStyles.roles}>
            {(["sender", "traveler"] as const).map((option) => (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: option === role }}
                disabled={busy}
                onPress={() => setRole(option)}
                style={[
                  accountStyles.role,
                  option === role && { backgroundColor: roleColors[option] },
                ]}
              >
                <Text
                  style={[
                    accountStyles.roleText,
                    { color: option === role ? "#fff" : roleColors[option] },
                  ]}
                >
                  {option === "sender" ? "Sender" : "Traveler"}
                </Text>
              </Pressable>
            ))}
          </View>
          {signUp && (
            <Field
              label="Full name"
              placeholder="Enter your full name"
              value={name}
              onChange={setName}
              autoComplete="name"
              autoCapitalize="words"
              editable={!busy}
            />
          )}
          <Field
            label="Email address"
            placeholder="you@example.com"
            value={email}
            onChange={setEmail}
            keyboardType="email-address"
            autoComplete="email"
            autoCapitalize="none"
            editable={!busy}
          />
          {signUp && (
            <Field
              label="Phone number"
              placeholder="+234 800 000 0000"
              value={phone}
              onChange={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              editable={!busy}
            />
          )}
          <Field
            label="Password"
            placeholder={
              signUp ? "At least 12 characters" : "Enter your password"
            }
            value={password}
            onChange={setPassword}
            autoComplete={signUp ? "new-password" : "current-password"}
            secureTextEntry={!visible}
            autoCapitalize="none"
            editable={!busy}
          />
          {signUp && (
            <Field
              label="Confirm password"
              placeholder="Enter your password again"
              value={confirmation}
              onChange={setConfirmation}
              secureTextEntry={!visible}
              autoCapitalize="none"
              editable={!busy}
            />
          )}
          <Pressable
            accessibilityRole="button"
            onPress={() => setVisible((current) => !current)}
          >
            <Text style={{ color: primary }}>
              {visible ? "Hide password" : "Show password"}
            </Text>
          </Pressable>
          {error !== "" && (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              {error}
            </Text>
          )}
          <Action
            label={busy ? "Please wait…" : signUp ? "Sign up" : "Log in"}
            onPress={submit}
            disabled={busy}
          />
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              setError("");
              setPassword("");
              setConfirmation("");
              setVisible(false);
              setSignUp(!signUp);
            }}
          >
            <Text style={[accountStyles.center, { color: primary }]}>
              {signUp
                ? "Already have an account? Log in"
                : "New to FlyMate? Sign up"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={onDevelopment}
          >
            <Text style={[styles.label, accountStyles.center]}>
              Development token sign-in
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </RoleTheme.Provider>
  );
}

const accountStyles = StyleSheet.create({
  brand: { alignItems: "center", gap: 12, marginTop: 22, marginBottom: 8 },
  logo: { fontSize: 30, fontWeight: "800" },
  roles: {
    flexDirection: "row",
    backgroundColor: "#eff2f6",
    padding: 4,
    borderRadius: 24,
  },
  role: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    borderRadius: 22,
  },
  roleText: { fontWeight: "700", fontSize: 14 },
  center: { textAlign: "center", paddingVertical: 8 },
});
