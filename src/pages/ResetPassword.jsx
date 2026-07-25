import { useMemo, useState } from "react";
import AuthActionCard from "../components/AuthActionCard.jsx";
import { publicApiPost } from "../lib/api.js";

export default function ResetPassword() {
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token") || "", []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (password.length < 8) return setError("La password deve avere almeno 8 caratteri.");
    if (password !== confirmPassword) return setError("Le password non coincidono.");

    try {
      setLoading(true);
      setError("");
      const result = await publicApiPost("/auth/reset-password", { token, password });
      setMessage(result?.message || "Password aggiornata.");
      setPassword("");
      setConfirmPassword("");
    } catch (requestError) {
      setError(requestError.message || "Il link non è più valido.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthActionCard
      eyebrow="Nuova password"
      title="Proteggi di nuovo il tuo account"
      description="Scegli una password di almeno 8 caratteri. Tutte le vecchie sessioni verranno disconnesse."
    >
      {!token ? <div className="auth-action-status error" role="alert">Link incompleto: richiedine uno nuovo.</div> : null}
      {message ? <div className="auth-action-status success" role="status">{message}</div> : null}
      {error ? <div className="auth-action-status error" role="alert">{error}</div> : null}
      <form className="auth-action-form" onSubmit={submit}>
        <label>Nuova password<input type="password" required minLength="8" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <label>Conferma password<input type="password" required minLength="8" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
        <button type="submit" disabled={loading || !token}>{loading ? "Aggiorno..." : "Aggiorna password"}</button>
      </form>
    </AuthActionCard>
  );
}
