import type { Delivery } from "../sender/deliveryApi";

export type TravelerView = "board" | "active" | "completed";

export type RouteFilters = { from: string; to: string; date: string };

export function filterDeliveries(
  shipments: Delivery[],
  view: TravelerView,
  query: string,
  filters?: RouteFilters,
) {
  const search = query.trim().toLowerCase();
  return shipments.filter(({ package: parcel, delivery }) => {
    if (view === "completed") return delivery.status === "Delivered";
    if (view === "active") {
      return (
        delivery.status === "Matched" ||
        delivery.status === "Picked up" ||
        delivery.status === "In transit"
      );
    }
    if (delivery.status !== "Published") return false;
    if (
      filters &&
      (!parcel.origin
        .toLowerCase()
        .includes(filters.from.trim().toLowerCase()) ||
        !parcel.destination
          .toLowerCase()
          .includes(filters.to.trim().toLowerCase()) ||
        (filters.date && parcel.preferredDate !== filters.date))
    )
      return false;
    return search
      .split(/\s+/)
      .every((word) =>
        [
          parcel.origin,
          parcel.destination,
          parcel.contents,
          parcel.title ?? "",
        ].some((value) => value.toLowerCase().includes(word)),
      );
  });
}
