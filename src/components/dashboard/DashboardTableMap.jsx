import DashboardEmptyState from "./DashboardEmptyState.jsx";

export default function DashboardTableMap({ tables = [], totalTables = 0 }) {
  const displayTables = tables.length
    ? tables
    : Array.from({ length: Math.min(Number(totalTables) || 0, 18) }, (_, index) => ({ id: `free-${index}`, name: `T${index + 1}`, isPlaceholder: true }));

  return (
    <section className="dash-panel dash-table-map">
      <div className="dash-panel-head">
        <div>
          <span>Sala</span>
          <h2>Mappa rapida</h2>
        </div>
      </div>
      {displayTables.length ? (
        <div className="dash-table-grid">
          {displayTables.map((table, index) => {
            const occupied = Boolean(table.isOccupied);
            return (
              <div className={occupied ? "dash-table-seat dash-table-seat--busy" : "dash-table-seat"} key={table.id || table.name || index}>
                <b>{table.name || table.code || `T${index + 1}`}</b>
                <span>{occupied ? "occupato" : "libero"}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <DashboardEmptyState title="Sala non configurata" text="Aggiungi i tavoli e genera i QR dalla gestione sala." />
      )}
    </section>
  );
}
