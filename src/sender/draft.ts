export const categories = [
  "Gift",
  "Clothing",
  "Documents",
  "Electronics",
  "Food",
  "Other",
] as const;
type Category = (typeof categories)[number];

export const initialDraft = {
  title: "",
  pickupMethod: "" as "" | "airport" | "public-spot",
  preferredDate: "",
  origin: "",
  destination: "",
  weight: "",
  size: "",
  category: "" as Category | "",
  contents: "",
  offer: "",
  photo: "",
};
export type Draft = typeof initialDraft;

export function parseWeight(input: string) {
  const match = /^(\d+(?:[.,]\d+)?)\s*(kg|kgs|lb|lbs)?$/i.exec(input.trim());
  if (!match) return null;

  const value = Number(match[1].replace(",", "."));
  if (!Number.isFinite(value) || value <= 0) return null;

  return {
    value,
    unit: match[2]?.toLowerCase().startsWith("kg") ? "kg" : "lbs",
  };
}

export function parseOffer(input: string) {
  const match = /^\$?\s*(\d+(?:[.,]\d{1,2})?)$/.exec(input.trim());
  if (!match) return null;

  const value = Number(match[1].replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function splitDimensions(value: string) {
  const parts = value
    .trim()
    .replace(/\s*(?:inches|in)$/i, "")
    .split(/\s*[×x]\s*/i);
  if (parts.length === 3) return parts;
  return [value, "", ""];
}

export function hasValidDimensions(value: string) {
  return splitDimensions(value).every(
    (part) =>
      /^\d+(?:[.,]\d+)?$/.test(part) &&
      Number.isFinite(Number(part.replace(",", "."))) &&
      Number(part.replace(",", ".")) > 0,
  );
}
