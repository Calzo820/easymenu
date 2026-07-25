import { useEffect, useMemo, useState } from "react";
import AuthActionCard from "../components/AuthActionCard.jsx";
import { publicApiPost } from "../lib/api.js";

export default function VerifyEmail() {
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token") || "", []);
  const [message, setMessage] = useState(token ? "Verifico l'indirizzo..." : "");
  const [error, setError] = useState(token ? "" : "Link di verifica incompleto.");

  useEffect(() => {
    if (!token) return;
    let active = true;
    publicApiPost("/auth/verify-email", { token })
      .then((result) => {
        if (!active) return;
        setMessage(result?.message || "Email verificata.");
        setError("");
      })
      .catch((requestError) => {
        if (!active) return;
        setMessage("");
        setError(requestError.message || "Il link non è più valido.");
      });
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <AuthActionCard
      eyebrow="Verifica email"
      title={error ? "Non siamo riusciti a verificare l'email" : "Conferma in corso"}
      description="La verifica protegge l'account e rende affidabili le comunicazioni di servizio."
    >
      {message ? <div className="auth-action-status success" role="status">{message}</div> : null}
      {error ? <div className="auth-action-status error" role="alert">{error}</div> : null}
    </AuthActionCard>
  );
}
