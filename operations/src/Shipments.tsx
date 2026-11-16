import { useState } from "react";
import type { OperationShipment, ShipmentStage } from "../../shared/operations";
import { shipmentAttention } from "./shipmentAttention";

const stages: ShipmentStage[] = [
  "Published",
  "Matched",
  "Picked up",
  "In transit",
  "Delivered",
];
const paymentLabels = {
  unpaid: "Test payment required",
  pending: "Test checkout pending",
  confirmed: "Test payment verified",
  eligible: "Settlement eligible · no payout",
};
const when = (value: string) => new Date(value).toLocaleString();

export function Shipments({
  rows,
  observedAt,
}: {
  rows: OperationShipment[];
  observedAt: string;
}) {
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("all");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const now = Date.parse(observedAt);
  const term = search.trim().toLowerCase();
  const visible = rows.filter(
    (row) =>
      (stage === "all" || stage === row.status) &&
      (!attentionOnly || shipmentAttention(row, now).length > 0) &&
      [
        row.title,
        row.origin,
        row.destination,
        row.sender,
        row.traveler ?? "",
        row.id,
      ].some((value) => value.toLowerCase().includes(term)),
  );
  const selected = rows.find((row) => row.id === selectedId);

  return (
    <div className="stack">
      {selected && (
        <section className="panel detail" aria-label="Shipment details">
          <div className="detail-heading">
            <h2>{selected.title}</h2>
            <button type="button" onClick={() => setSelectedId("")}>
              Close details
            </button>
          </div>
          <dl>
            <div>
              <dt>Shipment ID</dt>
              <dd>{selected.id}</dd>
            </div>
            <div>
              <dt>Route</dt>
              <dd>
                {selected.origin} → {selected.destination}
              </dd>
            </div>
            <div>
              <dt>Sender</dt>
              <dd>{selected.sender}</dd>
            </div>
            <div>
              <dt>Preferred pickup</dt>
              <dd>{selected.preferredDate ?? "Unspecified"}</dd>
            </div>
          </dl>
          {shipmentAttention(selected, now).map((reason) => (
            <p key={reason} className="notice">
              {reason}
            </p>
          ))}
          {selected.testPayment && (
            <p className="notice">{paymentLabels[selected.testPayment]}</p>
          )}
          <h3>Tracking timeline</h3>
          <ol className="timeline">
            {selected.timeline.map(({ status, at }) => (
              <li key={status}>
                <strong>{status}</strong>
                <small>{when(at)}</small>
              </li>
            ))}
          </ol>
        </section>
      )}
      <section className="panel">
        <div className="toolbar">
          <label>
            Search shipments
            <input
              type="search"
              placeholder="Route, name or shipment ID"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label>
            Stage
            <select
              value={stage}
              onChange={(event) => setStage(event.target.value)}
            >
              <option value="all">All stages</option>
              {stages.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={attentionOnly}
              onChange={(event) => setAttentionOnly(event.target.checked)}
            />{" "}
            Needs attention
          </label>
        </div>
        <div className="table-wrap">
          <table>
            <caption className="sr-only">
              Published shipments and delivery status
            </caption>
            <thead>
              <tr>
                <th>Shipment</th>
                <th>Route</th>
                <th>Traveler</th>
                <th>Status</th>
                <th>Test payment</th>
                <th>Attention</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const reasons = shipmentAttention(row, now);
                return (
                  <tr key={row.id}>
                    <td>
                      <button
                        className="table-link"
                        type="button"
                        onClick={() => setSelectedId(row.id)}
                      >
                        {row.title}
                      </button>
                      <small>{row.sender}</small>
                    </td>
                    <td>
                      {row.origin} → {row.destination}
                    </td>
                    <td>{row.traveler ?? "Awaiting match"}</td>
                    <td>
                      <span
                        className={`badge ${row.status === "Delivered" ? "success" : "blue"}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td>
                      {row.testPayment ? paymentLabels[row.testPayment] : "—"}
                    </td>
                    <td>
                      {reasons.length ? (
                        <span className="badge amber">{reasons[0]}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    No shipments match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
