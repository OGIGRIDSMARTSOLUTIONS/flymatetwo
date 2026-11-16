import { useState } from "react";
import type { VerificationQueueItem } from "../../shared/operations";
import { VerificationReview } from "./VerificationReview";
import { verificationBadge, verificationLabels } from "./verificationLabels";

export function VerificationQueue({
  rows,
  uploadsEnabled,
  token,
  onDecision,
}: {
  rows: VerificationQueueItem[];
  uploadsEnabled: boolean;
  token: string;
  onDecision: () => void;
}) {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const term = search.trim().toLowerCase();
  const visible = rows.filter(
    (row) =>
      (status === "all" || row.state === status) &&
      (row.name.toLowerCase().includes(term) ||
        row.email.toLowerCase().includes(term)),
  );

  return (
    <div className="stack">
      {!uploadsEnabled && (
        <p className="notice">
          New identity document uploads are disabled in this environment.
        </p>
      )}
      {selectedId && (
        <VerificationReview
          key={selectedId}
          token={token}
          id={selectedId}
          onClose={() => setSelectedId("")}
          onDecision={onDecision}
        />
      )}
      <section className="panel">
        <div className="toolbar">
          <label>
            Find traveler
            <input
              type="search"
              placeholder="Name or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label>
            Submission status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">All travelers</option>
              {Object.entries(verificationLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="table-wrap">
          <table>
            <caption className="sr-only">Traveler verification queue</caption>
            <thead>
              <tr>
                <th>Traveler</th>
                <th>Documents</th>
                <th>Identity status</th>
                <th>Submitted</th>
                <th>Background check</th>
                <th>Case</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.name}</strong>
                    <small>{row.email}</small>
                  </td>
                  <td>{row.uploaded} / 3</td>
                  <td>
                    <span className={`badge ${verificationBadge[row.state]}`}>
                      {verificationLabels[row.state]}
                    </span>
                  </td>
                  <td>
                    {row.submittedAt
                      ? new Date(row.submittedAt).toLocaleString()
                      : "—"}
                  </td>
                  <td>Not started</td>
                  <td>
                    {row.submittedAt && (
                      <button
                        type="button"
                        onClick={() => setSelectedId(row.id)}
                      >
                        Open case
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    No travelers match these filters.
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
