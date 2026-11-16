import { useUnreadChats } from "./chat/useUnreadChats";
import { UnreadLabel } from "./chat/UnreadLabel";
import { mediaApi } from "./account/mediaApi";
import { SenderChatList } from "./chat/SenderChatList";
import { PackageLogistics } from "./sender/PackageLogistics";
import { ReviewShipment } from "./sender/ReviewShipment";
import { SenderWelcome } from "./sender/SenderWelcome";
import { ShipmentProgress } from "./sender/ShipmentProgress";
import { ShipmentTabs } from "./sender/ShipmentTabs";
import type { ShipmentTab } from "./sender/shipmentStatus";
import { TravelerHome } from "./traveler/TravelerHome";
import { AccountScreen } from "./auth/AccountScreen";
import { accountApi, type Session } from "./auth/accountApi";
import { RoleTheme, useRoleColor } from "./ui/RoleTheme";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { randomUUID } from "expo-crypto";
import * as ImagePicker from "expo-image-picker";
import { sampleShipments } from "./sender/sampleShipments";
import { ShipmentCard } from "./sender/ShipmentCard";
import { ProfileAvatar } from "./sender/ProfileAvatar";
import { Action } from "./ui/controls";
import { styles } from "./ui/styles";
import {
  initialDraft,
  hasValidDimensions,
  isCalendarDate,
  parseOffer,
  parseWeight,
  type Draft,
} from "./sender/draft";
import { PackageDetails } from "./sender/PackageDetails";
import { loadDrafts, saveDrafts, type SavedDraft } from "./sender/draftStorage";

import { createDraftApi, draftApiUrl } from "./sender/draftApi";
import { DeliveryBoard } from "./sender/DeliveryBoard";
import { createDeliveryApi, type Role } from "./sender/deliveryApi";
import { DevelopmentSignIn } from "./sender/DevelopmentSignIn";

type Screen = "home" | "details" | "logistics" | "review";
type Tab = "Home" | "Chat" | "Shipments" | "Profile";
const tabs: Tab[] = ["Home", "Shipments", "Chat", "Profile"];

function SenderApp({
  token,
  accountName,
  initialRecords = [],
  disconnect,
}: {
  token?: string;
  accountName?: string;
  initialRecords?: SavedDraft[];
  disconnect?: () => void;
}) {
  const roleColor = useRoleColor();
  const unreadChats = useUnreadChats(token);
  const api = token ? createDraftApi(token) : null;
  const [localPhoto, setLocalPhoto] = useState("");
  const [openingError, setOpeningError] = useState("");
  const [revision, setRevision] = useState(0);
  const [opening, setOpening] = useState(false);
  const openLock = useRef(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [tab, setTab] = useState<Tab>("Home");
  const [shipmentFilter, setShipmentFilter] = useState<ShipmentTab>("Active");
  const showDrafts =
    tab === "Shipments" && (!token || shipmentFilter === "Active");
  const [draft, setDraft] = useState(initialDraft);
  const [error, setError] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const profilePhotoLock = useRef(false);
  const [profilePhotoStatus, setProfilePhotoStatus] = useState("");

  useEffect(() => {
    if (!token || !accountName) return;
    let active = true;
    mediaApi.profile(token).then(
      ({ photoUrl }) => {
        if (active && !profilePhotoLock.current)
          setProfilePhoto((current) => current || photoUrl);
      },
      () => {},
    );
    return () => {
      active = false;
    };
  }, [accountName, token]);

  const [savedDrafts, setSavedDrafts] = useState<SavedDraft[]>(initialRecords);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [storageStatus, setStorageStatus] = useState<
    "loading" | "ready" | "failed"
  >("loading");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const preparedPublish = useRef<{ draft: Draft; saved: SavedDraft } | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    const loading = token ? createDraftApi(token).list() : loadDrafts();
    loading.then(
      (records) => {
        if (!active) return;
        setSavedDrafts(records);
        setStorageStatus("ready");
      },
      () => {
        if (active) setStorageStatus("failed");
      },
    );

    return () => {
      active = false;
    };
  }, [token]);

  async function openDraft(record: SavedDraft) {
    if (openLock.current) return;
    openLock.current = true;
    setOpening(true);
    setOpeningError("");
    try {
      if (api) record = await api.open(record.id);
    } catch (error) {
      setOpeningError(
        error instanceof Error ? error.message : "Could not open the draft.",
      );
      return;
    } finally {
      openLock.current = false;
      setOpening(false);
    }
    setLocalPhoto("");
    setDraftId(record.id);
    setDraft(record.package);
    setError("");
    setSaveError("");
    setScreen("details");
  }

  function startDraft() {
    setLocalPhoto("");
    setDraftId(null);
    setDraft(initialDraft);
    setError("");
    setSaveError("");
    setScreen("details");
  }

  async function saveReviewedDraft(publish = false) {
    if (saveLock.current || storageStatus !== "ready") return;

    saveLock.current = true;
    setSaving(true);
    setSaveError("");
    const record = {
      id: draftId ?? randomUUID(),
      savedAt: new Date().toISOString(),
      package: { ...draft, photo: "" },
    };
    setDraftId(record.id);
    try {
      const prepared = preparedPublish.current;
      const saved =
        publish && prepared?.draft === draft && prepared.saved.id === record.id
          ? prepared.saved
          : api
            ? await api.save(record.id, draft, localPhoto)
            : record;
      const next = [
        saved,
        ...savedDrafts.filter((item) => item.id !== saved.id),
      ];
      if (!api) await saveDrafts(next);
      setSavedDrafts(next);
      if (publish && token) {
        preparedPublish.current = { draft, saved };
        await createDeliveryApi(token).act(saved.id, {
          action: "publish",
          confirmed: true,
        });
        setSavedDrafts((current) =>
          current.filter(({ id }) => id !== saved.id),
        );
        preparedPublish.current = null;
        setRevision((value) => value + 1);
      }
      setShipmentFilter("Active");
      setTab("Shipments");
      setScreen("home");
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Could not save the draft. Please try again.",
      );
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError("");
  }

  async function pickPhoto(target: "package" | "profile") {
    if (target === "profile" && profilePhotoLock.current) return;
    if (target === "profile") {
      profilePhotoLock.current = true;
      setProfilePhotoStatus("");
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const { uri } = result.assets[0];
        if (target === "profile") {
          if (token && accountName) {
            setProfilePhotoStatus("Saving profile photo…");
            const { photoUrl } = await mediaApi.uploadProfile(token, uri);
            setProfilePhoto(photoUrl);
            setProfilePhotoStatus("Profile photo saved.");
          } else {
            setProfilePhoto(uri);
          }
        } else {
          setLocalPhoto(uri);
          update("photo", uri);
        }
      }
    } catch (error) {
      if (target === "profile") {
        setProfilePhotoStatus(
          error instanceof Error
            ? error.message
            : "Could not save profile photo.",
        );
        return;
      }
      Alert.alert(
        "Photo unavailable",
        error instanceof Error
          ? error.message
          : "Try choosing the photo again.",
      );
    } finally {
      if (target === "profile") profilePhotoLock.current = false;
    }
  }

  function nextDetails() {
    if (!draft.title.trim() || draft.title.trim().length > 120) {
      setError("Enter a package title of up to 120 characters.");
      return;
    }
    if (
      !draft.origin.trim() ||
      !draft.destination.trim() ||
      !draft.size.trim() ||
      !draft.category ||
      !draft.contents.trim()
    ) {
      setError("Enter the route, package size, category and contents.");
      return;
    }
    if (!hasValidDimensions(draft.size)) {
      setError("Enter a positive length, width and height in inches.");
      return;
    }
    const weight = parseWeight(draft.weight);
    if (!weight || weight.value > 10000) {
      setError("Enter a valid weight, such as 4.5 kg.");
      return;
    }
    setError("");
    setScreen("logistics");
  }

  function review() {
    const offer = parseOffer(draft.offer);
    if (offer === null || offer > 1_000_000) {
      setError("Enter a valid traveler offer in USD.");
      return;
    }
    if (!draft.pickupMethod || !isCalendarDate(draft.preferredDate)) {
      setError("Choose a pickup method and select a preferred pickup date.");
      return;
    }
    setError("");
    setScreen("review");
  }

  const title =
    screen === "home"
      ? tab === "Home"
        ? token
          ? accountName
            ? `Hi, ${accountName.split(/\s+/)[0]}`
            : "Sender Home"
          : "Hi, Amara"
        : tab === "Shipments" && token
          ? "My shipments"
          : tab
      : screen === "review"
        ? "Review & publish"
        : "Create shipment";

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        {screen !== "home" && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
            disabled={saving}
            onPress={() => {
              setError("");
              setScreen(
                screen === "review"
                  ? "logistics"
                  : screen === "logistics"
                    ? "details"
                    : "home",
              );
            }}
            style={styles.back}
          >
            <Text style={styles.backText}>←</Text>
          </Pressable>
        )}
        <Text
          accessibilityRole="header"
          style={[styles.title, screen !== "home" && styles.centerTitle]}
        >
          {title}
        </Text>
        {screen === "home" && tab === "Home" && (
          <ProfileAvatar
            photo={profilePhoto}
            initial={accountName?.[0]?.toUpperCase()}
            onPress={() => pickPhoto("profile")}
          />
        )}
      </View>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          key={screen + tab}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          {screen === "home" && (tab === "Home" || tab === "Shipments") && (
            <>
              {tab === "Home" && profilePhotoStatus !== "" && (
                <Text accessibilityLiveRegion="polite" style={styles.label}>
                  {profilePhotoStatus}
                </Text>
              )}
              {tab === "Home" && (
                <Action amber label="+ Send a package" onPress={startDraft} />
              )}
              {token && tab === "Shipments" ? (
                <ShipmentTabs
                  selected={shipmentFilter}
                  onChange={setShipmentFilter}
                />
              ) : (
                <Text style={styles.label}>Your shipments</Text>
              )}
              {showDrafts && storageStatus === "loading" && (
                <Text style={styles.label}>Loading saved drafts…</Text>
              )}
              {showDrafts && storageStatus === "failed" && (
                <Text style={styles.error}>
                  Could not load saved drafts. Restart FlyMate to try again.
                </Text>
              )}
              {showDrafts && openingError !== "" && (
                <Text accessibilityLiveRegion="polite" style={styles.error}>
                  {openingError}
                </Text>
              )}
              {showDrafts && opening && (
                <Text style={styles.label}>Opening draft…</Text>
              )}
              {showDrafts &&
                savedDrafts.map((record) => (
                  <View key={record.id} style={styles.card}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => openDraft(record)}
                    >
                      <Text style={styles.cardTitle}>
                        {record.package.title ||
                          `${record.package.origin} → ${record.package.destination}`}
                      </Text>
                      <Text style={styles.label}>
                        Draft · Saved{" "}
                        {new Date(record.savedAt).toLocaleDateString()}
                      </Text>
                      <Text style={styles.label}>
                        {record.package.contents}
                      </Text>
                    </Pressable>
                  </View>
                ))}

              {token && tab === "Shipments" && (
                <DeliveryBoard
                  token={token}
                  role="sender"
                  revision={revision}
                  senderView={shipmentFilter}
                />
              )}
              {!api &&
                sampleShipments.map((shipment) => (
                  <ShipmentCard key={shipment.title} shipment={shipment} />
                ))}
            </>
          )}
          {screen === "home" &&
            tab === "Chat" &&
            (token ? (
              <SenderChatList token={token} unreadIds={unreadChats} />
            ) : (
              <Text style={styles.label}>
                Connect to FlyMate to chat with a matched traveler.
              </Text>
            ))}
          {screen === "home" && tab === "Profile" && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {accountName ?? "Sender profile"}
              </Text>
              <ProfileAvatar
                photo={profilePhoto}
                initial={accountName?.[0]?.toUpperCase()}
                onPress={() => pickPhoto("profile")}
              />
              {profilePhotoStatus !== "" && (
                <Text accessibilityLiveRegion="polite" style={styles.label}>
                  {profilePhotoStatus}
                </Text>
              )}
              <Action
                label="Change profile photo"
                onPress={() => pickPhoto("profile")}
              />
            </View>
          )}
          {screen === "home" && tab === "Profile" && disconnect && (
            <Action label="Sign out" onPress={disconnect} />
          )}
          {screen === "details" && (
            <>
              <ShipmentProgress step={1} />
              <PackageDetails
                draft={draft}
                error={error}
                update={update}
                next={nextDetails}
              />
            </>
          )}
          {screen === "logistics" && (
            <>
              <ShipmentProgress step={2} />
              <PackageLogistics
                draft={draft}
                error={error}
                update={update}
                pickPhoto={
                  api && draft.photo && !localPhoto
                    ? undefined
                    : () => pickPhoto("package")
                }
                onNext={review}
              />
            </>
          )}
          {screen === "review" && (
            <ReviewShipment
              draft={draft}
              connected={Boolean(token)}
              busy={saving}
              error={
                saveError ||
                (storageStatus === "failed"
                  ? "Draft storage is unavailable."
                  : "")
              }
              canSave={storageStatus === "ready"}
              onSave={() => void saveReviewedDraft()}
              onPublish={() => void saveReviewedDraft(true)}
              onEdit={() => setScreen("details")}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      {screen === "home" && (
        <View accessibilityRole="tablist" style={styles.nav}>
          {tabs.map((item) => (
            <Pressable
              key={item}
              disabled={opening}
              onPress={() => setTab(item)}
              accessibilityRole="tab"
              accessibilityLabel={
                item === "Chat" && unreadChats.length
                  ? `Chat, ${unreadChats.length} unread conversations`
                  : item
              }
              accessibilityState={{ selected: tab === item }}
              style={styles.navItem}
            >
              <Text
                style={[
                  styles.label,
                  styles.tabText,
                  tab === item && styles.activeTab,
                  tab === item && roleColor && { color: roleColor },
                ]}
              >
                {item}
              </Text>
              {item === "Chat" && <UnreadLabel count={unreadChats.length} />}
            </Pressable>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

export default function App() {
  const [entry, setEntry] = useState<"welcome" | "signup" | "login">("welcome");
  const [entryRole, setEntryRole] = useState<Role>("sender");
  const [development, setDevelopment] = useState(false);
  const [connection, setConnection] = useState<{
    token: string;
    records?: SavedDraft[];
    role: Role;
    name?: string;
  } | null>(null);

  function connect(session: Session) {
    setConnection({
      token: session.token,
      role: session.account.role,
      name: session.account.name,
    });
  }

  function signOut() {
    if (connection?.name)
      void accountApi.logout(connection.token).catch(() => {});
    setConnection(null);
    setDevelopment(false);
    setEntry("welcome");
  }

  return (
    <SafeAreaProvider>
      <RoleTheme.Provider value={connection?.role}>
        {draftApiUrl && !connection ? (
          <SafeAreaView style={styles.safe}>
            {development ? (
              <>
                <Action
                  label="Back to account login"
                  onPress={() => setDevelopment(false)}
                />
                <DevelopmentSignIn
                  onConnect={(token, records, role) =>
                    setConnection({ token, records, role })
                  }
                />
              </>
            ) : entry === "welcome" ? (
              <SenderWelcome
                onContinue={(signUp, role) => {
                  setEntryRole(role);
                  setEntry(signUp ? "signup" : "login");
                }}
              />
            ) : (
              <AccountScreen
                initialSignUp={entry === "signup"}
                initialRole={entryRole}
                onSession={connect}
                onDevelopment={() => setDevelopment(true)}
              />
            )}
          </SafeAreaView>
        ) : connection?.role === "traveler" ? (
          <TravelerHome
            token={connection.token}
            name={connection.name}
            legacy={!connection.name}
            onSignOut={signOut}
          />
        ) : (
          <SenderApp
            token={connection?.token}
            initialRecords={connection?.records}
            accountName={connection?.name}
            disconnect={connection ? signOut : undefined}
          />
        )}
      </RoleTheme.Provider>
    </SafeAreaProvider>
  );
}
