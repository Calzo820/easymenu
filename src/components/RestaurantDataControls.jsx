import { useMemo, useState } from "react";
import { apiFetch, apiGet, clearAuthSession } from "../lib/api.js";

export default function RestaurantDataControls() {
  const restaurant = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("auth_restaurant") || "null");
    } catch {
      return null;
    }
  }, []);
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("auth_user") || "null");
    } catch {
      return null;
    }
  }, []);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  if (!restaurant || user?.role !== "owner" || user?.isImpersonating) return null;

  async function exportData() {
    try {
      setBusy("export");
      setError("");
      const payload = await apiGet("/restaurants/me/export");
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ordynora-${restaurant.slug || "ristorante"}-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage("Esportazione completata.");
    } catch (requestError) {
      setError(requestError.message || "Esportazione non riuscita.");
    } finally {
      setBusy("");
    }
  }

  async function deleteAccount(event) {
    event.preventDefault();
    try {
      setBusy("delete");
      setError("");
      await apiFetch("/restaurants/me", {
        method: "DELETE",
        body: JSON.stringify({ password, confirmation }),
      });
      clearAuthSession();
      window.location.href = "/";
    } catch (requestError) {
      setError(requestError.message || "Eliminazione non riuscita.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="legal-data-controls">
      <div>
        <span>I tuoi dati</span>
        <h2>Esporta o elimina l'account</h2>
        <p>L'esportazione include profilo, menu, tavoli, prenotazioni e ordini. Password e token di sicurezza non vengono inclusi.</p>
        <button type="button" onClick={exportData} disabled={Boolean(busy)}>
          {busy === "export" ? "Preparo il file..." : "Scarica i miei dati"}
        </button>
      </div>
      <form onSubmit={deleteAccount}>
        <b>Elimina definitivamente</b>
        <p>L'abbonamento Stripe viene annullato prima della cancellazione. L'operazione non può essere annullata.</p>
        <label>
          Nome ristorante
          <input required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={restaurant.name} />
        </label>
        <label>
          Password owner
          <input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <button type="submit" className="danger" disabled={Boolean(busy) || confirmation !== restaurant.name}>
          {busy === "delete" ? "Elimino..." : "Elimina account"}
        </button>
      </form>
      {message ? <div className="legal-data-message success">{message}</div> : null}
      {error ? <div className="legal-data-message error">{error}</div> : null}
    </section>
  );
}
