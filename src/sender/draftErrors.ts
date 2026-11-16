const fieldLabels: Record<string, string> = {
  title: "Package title",
  origin: "Origin",
  destination: "Destination",
  category: "Category",
  contents: "Package description",
  weight: "Weight",
  weightUnit: "Weight unit",
  size: "Dimensions",
  offerMinor: "Offered amount",
  currency: "Currency",
  pickupMethod: "Pickup preference",
  preferredDate: "Preferred pickup date",
};

export function draftErrorMessage(status: number, payload: unknown) {
  if (!payload || typeof payload !== "object")
    return `Request failed (${status}).`;

  const error =
    "error" in payload && typeof payload.error === "string"
      ? payload.error
      : "";
  if (status !== 422 || error !== "Check the shipment details.") {
    return error || `Request failed (${status}).`;
  }

  const fields =
    "fields" in payload && payload.fields && typeof payload.fields === "object"
      ? Object.keys(payload.fields)
      : [];
  if (fields.length > 0) {
    return `Edit these shipment fields: ${fields.map((field) => fieldLabels[field] ?? field).join(", ")}.`;
  }

  return "The server rejected the shipment format. Restart the backend from the same FlyMate build as this app.";
}
