import AsyncStorage from "@react-native-async-storage/async-storage";
import { initialDraft, type Draft } from "./draft";

export type SavedDraft = {
  id: string;
  savedAt: string;
  package: Draft;
};

const storageKey = "flymate:shipment-drafts:v1";

export async function loadDrafts(): Promise<SavedDraft[]> {
  const stored = await AsyncStorage.getItem(storageKey);
  const records = stored ? (JSON.parse(stored) as SavedDraft[]) : [];
  return records.map((record) => ({
    ...record,
    package: { ...initialDraft, ...record.package },
  }));
}

export async function saveDrafts(drafts: SavedDraft[]) {
  await AsyncStorage.setItem(storageKey, JSON.stringify(drafts));
}
