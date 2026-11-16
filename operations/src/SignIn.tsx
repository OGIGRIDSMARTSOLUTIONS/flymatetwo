import { useState, type FormEvent } from "react";
import type { StaffSession } from "../../shared/operations";
import { operationsApi } from "./api";

export function SignIn({
  onSignIn,
  notice,
}: {
  onSignIn: (session: StaffSession) => void;
  notice: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      onSignIn(await operationsApi.login(email, password));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-shell">
      <form className="login" onSubmit={submit}>
        <p className="brand">
          FlyMate <span>Operations</span>
        </p>
        <h1>Staff sign-in</h1>
        {(error || notice) && (
          <p role="alert" className="error">
            {error || notice}
          </p>
        )}
        <label>
          Staff email
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <button className="primary" disabled={busy} type="submit">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
