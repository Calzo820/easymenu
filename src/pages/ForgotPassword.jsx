import { useState } from "react";
import AuthActionCard from "../components/AuthActionCard.jsx";
import { publicApiPost } from "../lib/api.js";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      const result = await publicApiPost("/auth/forgot-password", { email });
      setMessage(result?.message || "Controlla la posta per continuare.");
    } catch (requestError) {
      setError(requestError.message || "Richiesta non riuscita. Riprova tra poco.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthActionCard
      eyebrow="Recupero account"
      title="Hai dimenticato la password?"
      description="Inserisci l'email usata per EasyMenu. Se l'account esiste, riceverai un link valido per 60 minuti."
    >
      {message ? <div className="auth-action-status success" role="status">{message}</div> : null}
      {error ? <div className="auth-action-status error" role="alert">{error}</div> : null}
      <form className="auth-action-form" onSubmit={submit}>
        <label>Email<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <button type="submit" disabled={loading}>{loading ? "Invio..." : "Invia link di recupero"}</button>
      </form>
    </AuthActionCard>
  );
}
