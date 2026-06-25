import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import logoEasyMenu from "../assets/logo-easymenu.png";
import placeholderFood from "../assets/placeholder-food.png";
import "../styles/demo.css";

const tableStatuses = {
  free: { label: "Libero", tone: "free" },
  occupied: { label: "Occupato", tone: "occupied" },
  ready: { label: "Pronto", tone: "ready" },
  bill: { label: "Conto", tone: "bill" },
  reserved: { label: "Prenotato", tone: "reserved" },
};

const demoTables = Array.from({ length: 20 }, (_, index) => {
  const tableNumber = index + 1;
  const status =
    [2, 5, 9, 14, 18].includes(tableNumber)
      ? "occupied"
      : [3, 12].includes(tableNumber)
        ? "ready"
        : [7, 16].includes(tableNumber)
          ? "bill"
          : [11, 20].includes(tableNumber)
            ? "reserved"
            : "free";

  return {
    id: tableNumber,
    name: `T${tableNumber}`,
    seats: tableNumber % 5 === 0 ? 6 : tableNumber % 3 === 0 ? 2 : 4,
    status,
    total: status === "free" || status === "reserved" ? 0 : 18 + tableNumber * 4.5,
    time: status === "free" ? "-" : `${12 + tableNumber} min`,
  };
});

const demoMenu = [
  { name: "Tartare mediterranea", category: "Antipasti", price: 14, allergens: "pesce, sedano", featured: true },
  { name: "Risotto limone e gambero", category: "Primi", price: 18, allergens: "crostacei, latte", featured: true },
  { name: "Carbonara croccante", category: "Primi", price: 13, allergens: "glutine, uova, latte", featured: false },
  { name: "Filetto al pepe verde", category: "Secondi", price: 24, allergens: "latte", featured: true },
  { name: "Parmigiana leggera", category: "Vegetariano", price: 12, allergens: "latte", featured: false },
  { name: "Tiramisu espresso", category: "Dolci", price: 7, allergens: "uova, latte, glutine", featured: true },
  { name: "Spritz Signature", category: "Bar", price: 8, allergens: "solfiti", featured: true },
  { name: "Calice Etna rosso", category: "Vini", price: 7, allergens: "solfiti", featured: false },
];

const demoOrders = [
  { table: "T2", area: "Cucina", time: "03:12", status: "Nuovo", items: ["Risotto limone e gambero", "Filetto al pepe verde"] },
  { table: "T5", area: "Bar", time: "05:40", status: "In lavorazione", items: ["Spritz Signature x2", "Acqua frizzante"] },
  { table: "T9", area: "Cucina", time: "11:06", status: "Pronto", items: ["Carbonara croccante", "Parmigiana leggera"] },
  { table: "T12", area: "Bar", time: "02:18", status: "Pronto", items: ["Calice Etna rosso x2"] },
];

const demoLogins = [
  ["Owner", "owner@demo.test"],
  ["Cucina", "cucina@demo.test"],
  ["Bar", "bar@demo.test"],
  ["Cassa", "cassa@demo.test"],
];

function DemoTable({ table }) {
  const meta = tableStatuses[table.status] || tableStatuses.free;

  return (
    <article className={`demo-table-card ${meta.tone}`}>
      <div>
        <strong>{table.name}</strong>
        <span>{table.seats} coperti</span>
      </div>
      <div className="demo-table-bottom">
        <span>{meta.label}</span>
        <b>{table.total ? `EUR ${table.total.toFixed(2)}` : table.time}</b>
      </div>
    </article>
  );
}

function DemoMenuCard({ item }) {
  return (
    <article className="demo-menu-card">
      <img src={placeholderFood} alt="" />
      <div>
        <div className="demo-menu-meta">
          <span>{item.category}</span>
          {item.featured ? <b>Consigliato</b> : null}
        </div>
        <h3>{item.name}</h3>
        <p>Allergeni: {item.allergens}</p>
        <strong>EUR {item.price.toFixed(2)}</strong>
      </div>
    </article>
  );
}

export default function Demo() {
  const [view, setView] = useState("tavoli");

  const stats = useMemo(() => {
    const occupied = demoTables.filter((table) => ["occupied", "ready", "bill"].includes(table.status)).length;
    const total = demoTables.reduce((sum, table) => sum + table.total, 0);
    return { occupied, total };
  }, []);

  return (
    <main className="demo-page">
      <header className="demo-topbar">
        <Link to="/" className="demo-brand">
          <img src={logoEasyMenu} alt="EasyMenu" />
          <span>EasyMenu Demo</span>
        </Link>
        <div className="demo-actions">
          <Link to="/menu/demo/demo-table-1">Prova cliente</Link>
          <button type="button" onClick={() => setView("cucina")}>Prova cucina</button>
          <button type="button" onClick={() => setView("cassa")}>Prova cassa</button>
        </div>
      </header>

      <section className="demo-hero">
        <div>
          <span className="demo-kicker">Prova pubblica</span>
          <h1>Ristorante demo pronto per sala, cucina, bar e cassa.</h1>
          <p className="demo-hero-copy">Tre percorsi, zero registrazione: scegli come cliente, guarda la cucina, controlla la cassa.</p>
        </div>
        <div className="demo-kpis">
          <div><span>Tavoli</span><strong>20</strong></div>
          <div><span>Occupati</span><strong>{stats.occupied}</strong></div>
          <div><span>Ordini</span><strong>{demoOrders.length}</strong></div>
          <div><span>Totale live</span><strong>EUR {stats.total.toFixed(0)}</strong></div>
        </div>
      </section>

      <section className="demo-choice-grid" aria-label="Percorsi demo">
        <Link to="/menu/demo/demo-table-1">
          <span>1</span>
          <strong>Prova come cliente</strong>
          <small>Menu QR, prodotti, allergeni e ordine dal tavolo.</small>
        </Link>
        <button type="button" onClick={() => setView("cucina")}>
          <span>2</span>
          <strong>Prova cucina</strong>
          <small>Comande live divise tra cucina e bar.</small>
        </button>
        <button type="button" onClick={() => setView("cassa")}>
          <span>3</span>
          <strong>Prova cassa</strong>
          <small>Tavoli colorati, preconto e incasso.</small>
        </button>
      </section>

      <nav className="demo-tabs" aria-label="Viste demo">
        {[
          ["tavoli", "Tavoli"],
          ["menu", "Menu cliente"],
          ["cucina", "Cucina e bar"],
          ["cassa", "Cassa"],
        ].map(([id, label]) => (
          <button key={id} type="button" className={view === id ? "is-active" : ""} onClick={() => setView(id)}>
            {label}
          </button>
        ))}
      </nav>

      {view === "tavoli" ? (
        <section className="demo-table-grid">
          {demoTables.map((table) => <DemoTable key={table.id} table={table} />)}
        </section>
      ) : null}

      {view === "menu" ? (
        <section className="demo-split">
          <div className="demo-menu-grid">
            {demoMenu.map((item) => <DemoMenuCard key={item.name} item={item} />)}
          </div>
          <aside className="demo-side-panel">
            <h2>Carrello demo</h2>
            <div className="demo-check-row"><span>Risotto limone e gambero</span><b>EUR 18.00</b></div>
            <div className="demo-check-row"><span>Spritz Signature</span><b>EUR 8.00</b></div>
            <div className="demo-total"><span>Totale</span><strong>EUR 26.00</strong></div>
            <Link className="demo-primary" to="/menu/demo/demo-table-1">Apri menu tavolo 1</Link>
          </aside>
        </section>
      ) : null}

      {view === "cucina" ? (
        <section className="demo-orders-grid">
          {demoOrders.map((order) => (
            <article key={`${order.table}-${order.time}`} className={`demo-order-card ${order.status === "Pronto" ? "ready" : ""}`}>
              <div className="demo-order-head">
                <div><strong>{order.table}</strong><span>{order.area}</span></div>
                <b>{order.time}</b>
              </div>
              <ul>
                {order.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <span className="demo-order-status">{order.status}</span>
            </article>
          ))}
        </section>
      ) : null}

      {view === "cassa" ? (
        <section className="demo-split">
          <div className="demo-cash-list">
            {demoTables.filter((table) => table.total > 0).map((table) => (
              <article key={table.id} className="demo-cash-row">
                <div><strong>{table.name}</strong><span>{tableStatuses[table.status].label} da {table.time}</span></div>
                <b>EUR {table.total.toFixed(2)}</b>
                <button type="button">Preconto</button>
              </article>
            ))}
          </div>
          <aside className="demo-side-panel dark">
            <h2>Accessi demo</h2>
            {demoLogins.map(([role, email]) => (
              <div className="demo-login-row" key={email}>
                <span>{role}</span>
                <b>{email}</b>
              </div>
            ))}
            <p>Password: EasyMenu2026!</p>
            <Link className="demo-primary light" to="/login">Entra nella demo reale</Link>
          </aside>
        </section>
      ) : null}
    </main>
  );
}
