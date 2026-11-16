import { useEffect, useState, type FormEvent } from "react";
import type {
  VerificationCase,
  VerificationDecision,
} from "../../shared/operations";
import { ApiError, operationsApi } from "./api";
import { verificationBadge, verificationLabels } from "./verificationLabels";

const slots = { front: "Front of ID", back: "Back of ID", selfie: "Selfie" };

export function VerificationReview({
  token,
  id,
  onClose,
  onDecision,
}: {
  token: string;
  id: string;
  onClose: () => void;
  onDecision: () => void;
}) {
  const [record, setRecord] = useState<VerificationCase | null>(null);
  const [decision, setDecision] = useState<VerificationDecision | "">("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    operationsApi
      .verification(token, id, controller.signal)
      .then(
        (value) => {
          if (!controller.signal.aborted) setRecord(value);
        },
        (cause) => {
          if (!controller.signal.aborted)
            setError(
              cause instanceof Error
                ? cause.message
                : "Could not load the case.",
            );
        },
      )
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, token, version]);

  function refresh() {
    setError("");
    setLoading(true);
    setRecord(null);
    setDecision("");
    setReason("");
    setVersion((value) => value + 1);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!decision || !record || saving) return;
    if (decision !== "approved" && !reason.trim()) {
      setError(
        "Explain what the traveler should correct or why the submission was rejected.",
      );
      return;
    }
    setError("");
    setSaving(true);
    try {
      await operationsApi.decide(token, id, {
        revision: record.revision,
        decision,
        reason: reason.trim() || undefined,
      });
      onDecision();
      refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save the decision.",
      );
      if (cause instanceof ApiError && cause.status === 409) setRecord(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel detail" aria-label="Verification review">
      <div className="detail-heading">
        <h2>{record ? record.name : "Verification case"}</h2>
        <button type="button" onClick={onClose} disabled={saving}>
          Close case
        </button>
      </div>
      {loading && <p role="status">Loading case…</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!loading && !record && (
        <button type="button" onClick={refresh}>
          Reload case
        </button>
      )}
      {record && (
        <>
          <div className="case-summary">
            <span>{record.email}</span>
            <span className={`badge ${verificationBadge[record.state]}`}>
              {verificationLabels[record.state]}
            </span>
          </div>
          <p>
            Submission {record.revision} ·{" "}
            {new Date(record.submittedAt).toLocaleString()}
          </p>
          {record.documents.length > 0 && (
            <>
              <div className="verification-documents">
                {record.documents.map(({ slot, url }) => (
                  <figure key={slot}>
                    <img
                      alt={slots[slot]}
                      src={url}
                      referrerPolicy="no-referrer"
                    />
                    <figcaption>
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        Open {slots[slot].toLowerCase()}
                      </a>
                    </figcaption>
                  </figure>
                ))}
              </div>
              <button type="button" onClick={refresh} disabled={saving}>
                Refresh document links
              </button>
            </>
          )}
          {record.state === "pending" && (
            <form className="review-form" onSubmit={submit}>
              <label>
                Decision
                <select
                  required
                  value={decision}
                  disabled={saving}
                  onChange={(event) =>
                    setDecision(event.target.value as VerificationDecision | "")
                  }
                >
                  <option value="">Select decision</option>
                  <option
                    value="approved"
                    disabled={record.documents.length !== 3}
                  >
                    Approve identity
                  </option>
                  <option value="needs_resubmission">
                    Request a new upload
                  </option>
                  <option value="rejected">Reject submission</option>
                </select>
              </label>
              <label>
                Reason shown to the traveler
                <textarea
                  rows={3}
                  maxLength={1000}
                  disabled={saving}
                  required={
                    decision === "rejected" || decision === "needs_resubmission"
                  }
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
              <button
                className="primary"
                type="submit"
                disabled={saving || !decision}
              >
                {saving ? "Saving…" : "Record decision"}
              </button>
            </form>
          )}
          {record.history.length > 0 && (
            <>
              <h3>Decision history</h3>
              <ol className="timeline">
                {record.history.map((item) => (
                  <li key={item.revision}>
                    <strong>{verificationLabels[item.decision]}</strong>
                    <small>
                      {item.reviewer} · {new Date(item.at).toLocaleString()} ·
                      Submission {item.revision}
                    </small>
                    {item.reason && <p>{item.reason}</p>}
                  </li>
                ))}
              </ol>
            </>
          )}
        </>
      )}
    </section>
  );
}
