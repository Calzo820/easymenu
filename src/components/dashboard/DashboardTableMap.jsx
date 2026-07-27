import DashboardEmptyState from "./DashboardEmptyState.jsx";

function getTableNumber(table) {
  const candidates = [table?.number, table?.tableNumber, table?.code, table?.name];
  for (const value of candidates) {
    const match = String(value ?? "").trim().match(/^(?:T(?:AVOLO)?\s*)?0*(\d+)$/i);
    if (match) return Number(match[1]);
  }
  return null;
}

function normalizeTables(tables) {
  const byIdentity = new Map();

  tables.forEach((table, index) => {
    const number = getTableNumber(table);
    const fallback = String(table?.code || table?.name || table?.id || index).trim().toLowerCase();
    const identity = number !== null ? `number:${number}` : `table:${fallback}`;
    const normalized = {
      ...table,
      dashboardIdentity: identity,
      dashboardNumber: number,
      dashboardLabel: number !== null ? `T${number}` : table?.name || table?.code || `T${index + 1}`,
      dashboardOccupied: Boolean(table?.isOccupied),
    };
    const current = byIdentity.get(identity);

    if (!current || (!current.dashboardOccupied && normalized.dashboardOccupied)) {
      byIdentity.set(identity, normalized);
    }
  });

  return [...byIdentity.values()].sort((a, b) => {
    if (a.dashboardNumber !== null && b.dashboardNumber !== null) return a.dashboardNumber - b.dashboardNumber;
    if (a.dashboardNumber !== null) return -1;
    if (b.dashboardNumber !== null) return 1;
    return a.dashboardLabel.localeCompare(b.dashboardLabel, "it", { numeric: true });
  });
}

export default function DashboardTableMap({ tables = [], totalTables = 0 }) {
  const sourceTables = tables.length
    ? tables
    : Array.from({ length: Math.min(Number(totalTables) || 0, 20) }, (_, index) => ({
        id: `free-${index}`,
        name: `Tavolo ${index + 1}`,
        code: `T${index + 1}`,
        isPlaceholder: true,
      }));
  const displayTables = normalizeTables(sourceTables).slice(0, 20);

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
          {displayTables.map((table) => {
            const occupied = table.dashboardOccupied;
            return (
              <div className={occupied ? "dash-table-seat dash-table-seat--busy" : "dash-table-seat"} key={table.dashboardIdentity}>
                <b>{table.dashboardLabel}</b>
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
