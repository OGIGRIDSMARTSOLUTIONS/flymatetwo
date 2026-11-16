import { useEffect, useState } from "react";
import type { OperationsSnapshot, StaffSession } from "../../shared/operations";
import { ApiError, operationsApi } from "./api";
import { Shipments } from "./Shipments";
import { VerificationQueue } from "./VerificationQueue";

type View = "Shipments" | "Verification queue";
const views: View[] = ["Shipments", "Verification queue"];

export function Dashboard({
  session,
  onSignOut,
}: {
  session: StaffSession;
  onSignOut: (expired?: boolean) => void;
}) {
  const [view, setView] = useState<View>("Shipments");
  const [snapshot, setSnapshot] = useState<OperationsSnapshot | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let next: ReturnType<typeof setTimeout> | undefined;
    async function update() {
      if (document.visibilityState === "visible") {
        setLoading(true);
        try {
          const result = await operationsApi.overview(
            session.token,
            controller.signal,
          );
          if (controller.signal.aborted) return;
          setSnapshot(result);
          setError("");
        } catch (cause) {
          if (controller.signal.aborted) return;
          if (cause instanceof ApiError && cause.status === 401) {
            onSignOut(true);
            return;
          }
          setError("Could not refresh live data. The dashboard will retry.");
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      }
      if (!controller.signal.aborted) next = setTimeout(update, 15_000);
    }
    void update();
    return () => {
      controller.abort();
      clearTimeout(next);
    };
  }, [session.token, refresh, onSignOut]);

  return (
    <div className="layout">
      <aside className="sidebar">
        <p className="brand">
          FlyMate <span>Operations</span>
        </p>
        <nav aria-label="Operations">
          {views.map((item) => (
            <button
              key={item}
              type="button"
              aria-current={view === item ? "page" : undefined}
              onClick={() => setView(item)}
            >
              {item}
            </button>
          ))}
        </nav>
        <div className="staff">
          <strong>{session.staff.name}</strong>
          <button type="button" onClick={() => onSignOut()}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="workspace">
        <header className="page-heading">
          <div>
            <h1>{view}</h1>
            <p>
              {snapshot
                ? `Last updated ${new Date(snapshot.observedAt).toLocaleTimeString()}`
                : "Waiting for the first update"}
            </p>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => setRefresh((value) => value + 1)}
          >
            {loading ? "Refreshing…" : "Refresh now"}
          </button>
        </header>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {snapshot && (
          <>
            <div className="metrics" aria-label="Operations totals">
              <div className="panel metric">
                <span>Active shipments</span>
                <strong>{snapshot.totals.active.toLocaleString()}</strong>
              </div>
              <div className="panel metric">
                <span>Delivered</span>
                <strong>{snapshot.totals.delivered.toLocaleString()}</strong>
              </div>
              <div className="panel metric">
                <span>Awaiting verification</span>
                <strong>
                  {snapshot.totals.pendingVerification.toLocaleString()}
                </strong>
              </div>
            </div>
            {view === "Shipments" ? (
              <Shipments
                rows={snapshot.shipments}
                observedAt={snapshot.observedAt}
              />
            ) : (
              <VerificationQueue
                rows={snapshot.verification}
                uploadsEnabled={snapshot.documentUploadsEnabled}
                token={session.token}
                onDecision={() => setRefresh((value) => value + 1)}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
