import { useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import type { StaffSession } from "../../shared/operations";
import { operationsApi } from "./api";
import { Dashboard } from "./Dashboard";
import { SignIn } from "./SignIn";
import "./styles.css";

function Operations() {
  const [session, setSession] = useState<StaffSession | null>(null);
  const [notice, setNotice] = useState("");

  const signOut = useCallback(
    (expired?: boolean) => {
      if (session && !expired)
        void operationsApi.logout(session.token).catch(() => {});
      setSession(null);
      setNotice(expired ? "Your staff session expired. Sign in again." : "");
    },
    [session],
  );

  return session ? (
    <Dashboard session={session} onSignOut={signOut} />
  ) : (
    <SignIn onSignIn={setSession} notice={notice} />
  );
}

createRoot(document.getElementById("root")!).render(<Operations />);
