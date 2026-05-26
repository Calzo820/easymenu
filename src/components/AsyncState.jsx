export function LoadingState({ title = "Caricamento", message = "Sto aggiornando i dati del ristorante..." }) {
  return (
    <div className="state-card" role="status" aria-live="polite">
      <div className="spinner" />
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}

export function ErrorState({ title = "Qualcosa non ha funzionato", message, onRetry }) {
  return (
    <div className="state-card state-card-error" role="alert">
      <strong>{title}</strong>
      <p>{message || "Connessione instabile o server non raggiungibile."}</p>
      {onRetry ? <button type="button" onClick={onRetry}>Riprova</button> : null}
    </div>
  );
}
