import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { apiDelete, apiGet, apiPatch, apiPost } from "../lib/api";
import { appShellStyle, glowPageStyle } from "../styles/pageStyles";
import "../styles/management-os.css";

const emptyItem = {
  name: "",
  shortDescription: "",
  description: "",
  price: "",
  category: "",
  preparationArea: "kitchen",
  imageUrl: "",
  allergens: "",
  sortOrder: 0,
  vatRate: 10,
  isAvailable: true,
  isFeatured: false,
};

const emptyTable = {
  name: "",
  code: "",
  seats: 4,
  zone: "Sala",
  sortOrder: 0,
};

const emptyUser = {
  name: "",
  email: "",
  password: "",
  role: "kitchen",
};

const CATEGORY_PRESETS = ["Antipasti", "Primi", "Secondi", "Contorni", "Dolci", "Bevande"];

function hasText(value) {
  return String(value || "").trim().length > 0;
}

function getMenuQualityStats(items) {
  const total = items.length;
  const online = items.filter((item) => item.isAvailable).length;
  const missingPhoto = items.filter((item) => !hasText(item.imageUrl)).length;
  const missingDescription = items.filter((item) => !hasText(item.shortDescription) && !hasText(item.description)).length;
  const missingCategory = items.filter((item) => !hasText(item.category)).length;
  const featured = items.filter((item) => item.isFeatured).length;
  const avgPrice = total
    ? items.reduce((sum, item) => sum + Number(item.price || 0), 0) / total
    : 0;

  return { total, online, missingPhoto, missingDescription, missingCategory, featured, avgPrice };
}

function formatEuro(value) {
  const amount = Number(value || 0);
  return `€ ${amount.toFixed(2)}`;
}

function bySortThenName(a, b) {
  const sortA = Number(a?.sortOrder ?? 0);
  const sortB = Number(b?.sortOrder ?? 0);
  if (sortA !== sortB) return sortA - sortB;
  return String(a?.name || a?.code || "").localeCompare(String(b?.name || b?.code || ""), "it", { numeric: true });
}

function roleLabel(role) {
  if (role === "kitchen") return "Cucina";
  if (role === "bar") return "Bar";
  if (role === "cashier") return "Cassa";
  if (role === "admin") return "Admin";
  return role || "Staff";
}

function SectionHead({ title, subtitle, action }) {
  return (
    <div className="management-section-head">
      <div>
        <h2 className="management-title">{title}</h2>
        {subtitle ? <p className="management-subtitle">{subtitle}</p> : null}
      </div>
      {action || null}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="management-label">
      {label}
      {children}
    </label>
  );
}

function TextInput(props) {
  return <input className="management-input" {...props} />;
}

function SelectInput(props) {
  return <select className="management-select" {...props} />;
}

function TextArea(props) {
  return <textarea className="management-textarea" {...props} />;
}

export default function AdminPanel({ embedded = false } = {}) {
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingRestaurant, setSavingRestaurant] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [savingTable, setSavingTable] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("menu");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [restaurantForm, setRestaurantForm] = useState({
    name: "",
    primaryColor: "#1d4ed8",
    logoUrl: "",
    currency: "EUR",
    isActive: true,
  });
  const [itemForm, setItemForm] = useState(emptyItem);
  const [editingItemId, setEditingItemId] = useState("");
  const [tableForm, setTableForm] = useState(emptyTable);
  const [userForm, setUserForm] = useState(emptyUser);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const [restaurantData, menuData, tablesData, usersData] = await Promise.all([
        apiGet("/restaurants/me"),
        apiGet("/menu"),
        apiGet("/tables"),
        apiGet("/users"),
      ]);

      setRestaurant(restaurantData);
      setRestaurantForm({
        name: restaurantData?.name || "",
        primaryColor: restaurantData?.primaryColor || "#1d4ed8",
        logoUrl: restaurantData?.logoUrl || "",
        currency: restaurantData?.currency || "EUR",
        isActive: Boolean(restaurantData?.isActive),
      });
      setMenuItems(Array.isArray(menuData) ? menuData : []);
      setTables(Array.isArray(tablesData) ? tablesData : []);
      setStaffUsers(Array.isArray(usersData) ? usersData : []);
    } catch (err) {
      setError(err.message || "Errore nel caricamento dati admin");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const categories = useMemo(() => {
    const found = [...new Set(menuItems.map((item) => item.category).filter(Boolean))];
    return found.sort((a, b) => a.localeCompare(b));
  }, [menuItems]);

  const categorySuggestions = useMemo(() => {
    return [...new Set([...CATEGORY_PRESETS, ...categories])];
  }, [categories]);

  const menuQuality = useMemo(() => getMenuQualityStats(menuItems), [menuItems]);

  const filteredMenu = useMemo(() => {
    const term = query.trim().toLowerCase();
    return [...menuItems]
      .sort(bySortThenName)
      .filter((item) => {
        if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
        if (areaFilter !== "all" && item.preparationArea !== areaFilter) return false;
        if (!term) return true;
        return [item.name, item.category, item.preparationArea, item.shortDescription, item.description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term);
      });
  }, [menuItems, query, categoryFilter, areaFilter]);

  const tablesByZone = useMemo(() => {
    const map = new Map();
    [...tables].sort(bySortThenName).forEach((table) => {
      const zone = table.zone || "Sala";
      if (!map.has(zone)) map.set(zone, []);
      map.get(zone).push(table);
    });
    return [...map.entries()];
  }, [tables]);

  const activeTables = tables.filter((table) => table.isActive).length;
  const availableItems = menuItems.filter((item) => item.isAvailable).length;
  const barItems = menuItems.filter((item) => item.preparationArea === "bar").length;
  const kitchenItems = menuItems.filter((item) => item.preparationArea !== "bar").length;

  async function handleRestaurantSubmit(event) {
    event.preventDefault();
    try {
      setSavingRestaurant(true);
      setError("");
      setSuccess("");
      const response = await apiPatch("/restaurants/me", restaurantForm);
      setRestaurant(response.restaurant);
      localStorage.setItem("auth_restaurant", JSON.stringify(response.restaurant));
      localStorage.setItem("ristorante_attivo", response.restaurant.name || "");
      localStorage.setItem("restaurant_slug", response.restaurant.slug || "");
      setSuccess("Impostazioni ristorante aggiornate");
    } catch (err) {
      setError(err.message || "Errore nel salvataggio del ristorante");
    } finally {
      setSavingRestaurant(false);
    }
  }

  async function handleItemSubmit(event) {
    event.preventDefault();
    try {
      setSavingItem(true);
      setError("");
      setSuccess("");
      const payload = {
        ...itemForm,
        price: Number(itemForm.price),
        sortOrder: Number(itemForm.sortOrder || 0),
        vatRate: Number(itemForm.vatRate || 10),
        allergens: itemForm.allergens,
      };

      if (editingItemId) {
        await apiPatch(`/menu/${editingItemId}`, payload);
        setSuccess("Prodotto aggiornato");
      } else {
        await apiPost("/menu", payload);
        setSuccess("Prodotto creato");
      }

      setItemForm(emptyItem);
      setEditingItemId("");
      await loadData();
    } catch (err) {
      setError(err.message || "Errore salvataggio prodotto");
    } finally {
      setSavingItem(false);
    }
  }

  async function handleDeleteItem(id) {
    if (!window.confirm("Eliminare questo prodotto?")) return;
    try {
      setError("");
      setSuccess("");
      await apiDelete(`/menu/${id}`);
      setSuccess("Prodotto eliminato");
      await loadData();
    } catch (err) {
      setError(err.message || "Errore eliminazione prodotto");
    }
  }

  async function duplicateItem(item) {
    try {
      setError("");
      setSuccess("");
      await apiPost("/menu", {
        name: `${item.name || "Prodotto"} copia`,
        shortDescription: item.shortDescription || "",
        description: item.description || "",
        price: Number(item.price || 1),
        category: item.category || "",
        preparationArea: item.preparationArea || "kitchen",
        imageUrl: item.imageUrl || "",
        allergens: Array.isArray(item.allergens) ? item.allergens.join(", ") : item.allergens || "",
        sortOrder: Number(item.sortOrder || 0) + 1,
        vatRate: Number(item.vatRate || 10),
        isAvailable: false,
        isFeatured: false,
      });
      setSuccess("Prodotto duplicato come bozza offline");
      await loadData();
    } catch (err) {
      setError(err.message || "Errore duplicazione prodotto");
    }
  }

  function handleEditItem(item) {
    setActiveTab("menu");
    setEditingItemId(item.id);
    setItemForm({
      name: item.name || "",
      shortDescription: item.shortDescription || "",
      description: item.description || "",
      price: item.price ?? "",
      category: item.category || "",
      preparationArea: item.preparationArea || "kitchen",
      imageUrl: item.imageUrl || "",
      allergens: Array.isArray(item.allergens) ? item.allergens.join(", ") : item.allergens || "",
      sortOrder: item.sortOrder ?? 0,
      vatRate: item.vatRate ?? 10,
      isAvailable: Boolean(item.isAvailable),
      isFeatured: Boolean(item.isFeatured),
    });
  }

  async function toggleItemAvailability(item) {
    try {
      setError("");
      setSuccess("");
      await apiPatch(`/menu/${item.id}`, { isAvailable: !item.isAvailable });
      await loadData();
    } catch (err) {
      setError(err.message || "Errore aggiornamento disponibilità");
    }
  }

  async function handleTableSubmit(event) {
    event.preventDefault();
    try {
      setSavingTable(true);
      setError("");
      setSuccess("");
      await apiPost("/tables", {
        ...tableForm,
        seats: Number(tableForm.seats || 4),
        sortOrder: Number(tableForm.sortOrder || 0),
      });
      setTableForm(emptyTable);
      setSuccess("Tavolo creato");
      await loadData();
    } catch (err) {
      setError(err.message || "Errore creazione tavolo");
    } finally {
      setSavingTable(false);
    }
  }

  async function toggleTable(table) {
    try {
      await apiPatch(`/tables/${table.id}`, { isActive: !table.isActive });
      await loadData();
    } catch (err) {
      setError(err.message || "Errore aggiornamento tavolo");
    }
  }

  async function regenerateQr(table) {
    try {
      await apiPatch(`/tables/${table.id}`, { regenerateQrToken: true });
      setSuccess(`QR rigenerato per ${table.name}`);
      await loadData();
    } catch (err) {
      setError(err.message || "Errore rigenerazione QR");
    }
  }

  async function handleUserSubmit(event) {
    event.preventDefault();
    try {
      setSavingUser(true);
      setError("");
      setSuccess("");
      await apiPost("/users", {
        name: userForm.name.trim(),
        email: userForm.email.trim().toLowerCase(),
        password: userForm.password,
        role: userForm.role,
      });
      setUserForm(emptyUser);
      setSuccess("Utente staff creato");
      await loadData();
    } catch (err) {
      setError(err.message || "Errore creazione utente");
    } finally {
      setSavingUser(false);
    }
  }

  async function toggleUser(user) {
    try {
      setError("");
      setSuccess("");
      await apiPatch(`/users/${user.id}`, { isActive: !user.isActive });
      setSuccess(user.isActive ? "Utente disattivato" : "Utente riattivato");
      await loadData();
    } catch (err) {
      setError(err.message || "Errore aggiornamento utente");
    }
  }

  async function deleteUser(user) {
    if (!window.confirm(`Eliminare l'utente ${user.email}?`)) return;
    try {
      setError("");
      setSuccess("");
      await apiDelete(`/users/${user.id}`);
      setSuccess("Utente eliminato");
      await loadData();
    } catch (err) {
      setError(err.message || "Errore eliminazione utente");
    }
  }

  const tabs = [
    { id: "menu", title: "Menu", subtitle: "Prodotti e prezzi" },
    { id: "tables", title: "Tavoli", subtitle: "Sala e QR" },
    { id: "staff", title: "Staff", subtitle: "Accessi rapidi" },
    { id: "settings", title: "Impostazioni", subtitle: "Brand e piano" },
  ];

  function renderMenu() {
    return (
      <>
      <div className="menu-health-grid">
        <div className="management-card menu-health-main">
          <SectionHead
            title="Qualita menu"
            subtitle="Controllo rapido di cio che incide su vendite, chiarezza per il cliente e ordine in cucina."
          />
          <div className="menu-health-metrics">
            <div><span>Prodotti</span><strong>{menuQuality.total}</strong></div>
            <div><span>Online</span><strong>{menuQuality.online}</strong></div>
            <div><span>Foto mancanti</span><strong>{menuQuality.missingPhoto}</strong></div>
            <div><span>Descrizioni mancanti</span><strong>{menuQuality.missingDescription}</strong></div>
            <div><span>Senza categoria</span><strong>{menuQuality.missingCategory}</strong></div>
            <div><span>In evidenza</span><strong>{menuQuality.featured}</strong></div>
          </div>
        </div>
        <div className="management-card menu-health-side">
          <div className="management-row-title">Prezzo medio</div>
          <div className="menu-health-price">{formatEuro(menuQuality.avgPrice)}</div>
          <p className="management-subtitle">Usalo come spia veloce: se cambia troppo dopo nuove aggiunte, ricontrolla prezzi e porzioni.</p>
        </div>
      </div>

      <div className="management-grid-2">
        <form className="management-card management-form" onSubmit={handleItemSubmit}>
          <SectionHead
            title={editingItemId ? "Modifica prodotto" : "Nuovo prodotto"}
            subtitle="Campi essenziali in alto. Dettagli opzionali solo se servono al menu cliente."
          />
          <Field label="Nome"><TextInput placeholder="Es. Carbonara" value={itemForm.name} onChange={(e) => setItemForm((prev) => ({ ...prev, name: e.target.value }))} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 130px", gap: 10 }}>
            <Field label="Categoria"><TextInput placeholder="Primi" list="menu-categories" value={itemForm.category} onChange={(e) => setItemForm((prev) => ({ ...prev, category: e.target.value }))} /></Field>
            <Field label="Prezzo"><TextInput placeholder="12.00" type="number" step="0.01" value={itemForm.price} onChange={(e) => setItemForm((prev) => ({ ...prev, price: e.target.value }))} /></Field>
          </div>
          <datalist id="menu-categories">{categorySuggestions.map((category) => <option key={category} value={category} />)}</datalist>
          <Field label="Preparazione">
            <SelectInput value={itemForm.preparationArea} onChange={(e) => setItemForm((prev) => ({ ...prev, preparationArea: e.target.value }))}>
              <option value="kitchen">Cucina</option>
              <option value="bar">Bar</option>
            </SelectInput>
          </Field>
          <Field label="Descrizione breve"><TextInput placeholder="Una riga sul menu" value={itemForm.shortDescription} onChange={(e) => setItemForm((prev) => ({ ...prev, shortDescription: e.target.value }))} /></Field>
          <Field label="Ingredienti / descrizione"><TextArea placeholder="Ingredienti, preparazione, dettagli utili al cliente" value={itemForm.description} onChange={(e) => setItemForm((prev) => ({ ...prev, description: e.target.value }))} /></Field>
          <Field label="Allergeni"><TextInput placeholder="Glutine, lattosio, frutta a guscio" value={itemForm.allergens} onChange={(e) => setItemForm((prev) => ({ ...prev, allergens: e.target.value }))} /></Field>
          <Field label="Immagine URL"><TextInput placeholder="https://..." value={itemForm.imageUrl} onChange={(e) => setItemForm((prev) => ({ ...prev, imageUrl: e.target.value }))} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Ordine"><TextInput type="number" value={itemForm.sortOrder} onChange={(e) => setItemForm((prev) => ({ ...prev, sortOrder: e.target.value }))} /></Field>
            <Field label="IVA"><TextInput type="number" step="0.01" value={itemForm.vatRate} onChange={(e) => setItemForm((prev) => ({ ...prev, vatRate: e.target.value }))} /></Field>
          </div>
          <div className="management-row">
            <label className="management-badge green"><input type="checkbox" checked={itemForm.isAvailable} onChange={(e) => setItemForm((prev) => ({ ...prev, isAvailable: e.target.checked }))} /> Disponibile</label>
            <label className="management-badge"><input type="checkbox" checked={itemForm.isFeatured} onChange={(e) => setItemForm((prev) => ({ ...prev, isFeatured: e.target.checked }))} /> In evidenza</label>
          </div>
          <div className="management-row">
            <button className="management-btn" type="submit" disabled={savingItem}>{savingItem ? "Salvataggio..." : editingItemId ? "Salva modifica" : "Aggiungi prodotto"}</button>
            {editingItemId ? <button className="management-btn secondary" type="button" onClick={() => { setEditingItemId(""); setItemForm(emptyItem); }}>Annulla</button> : null}
          </div>
        </form>

        <div className="management-card">
          <SectionHead
            title="Catalogo"
            subtitle={`${filteredMenu.length} prodotti visibili. Azioni rapide senza aprire modali.`}
            action={
              <div className="management-inline-tools">
                <TextInput placeholder="Cerca prodotto" value={query} onChange={(e) => setQuery(e.target.value)} />
                <SelectInput value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="all">Tutte le categorie</option>
                  {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                </SelectInput>
                <SelectInput value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
                  <option value="all">Tutti i reparti</option>
                  <option value="kitchen">Cucina</option>
                  <option value="bar">Bar</option>
                </SelectInput>
              </div>
            }
          />
          <div className="management-list">
            {filteredMenu.map((item) => (
              <div key={item.id} className="management-list-row">
                <div>
                  <div className="management-row-title">{item.name}</div>
                  <div className="management-row-meta">{item.category || "Senza categoria"} · {item.preparationArea === "bar" ? "Bar" : "Cucina"}</div>
                  <div className="management-price">{formatEuro(item.price)}</div>
                  <div className="management-row" style={{ marginTop: 8 }}>
                    {item.isFeatured ? <span className="management-badge">In evidenza</span> : null}
                    {!item.imageUrl ? <span className="management-badge gray">Foto mancante</span> : null}
                    {!hasText(item.shortDescription) && !hasText(item.description) ? <span className="management-badge red">Descrizione mancante</span> : null}
                  </div>
                </div>
                <div className="management-row" style={{ justifyContent: "flex-end" }}>
                  <span className={`management-badge ${item.isAvailable ? "green" : "red"}`}>{item.isAvailable ? "Online" : "Esaurito"}</span>
                  <button className="management-btn secondary" type="button" onClick={() => toggleItemAvailability(item)}>{item.isAvailable ? "Esaurisci" : "Rimetti"}</button>
                  <button className="management-btn secondary" type="button" onClick={() => duplicateItem(item)}>Duplica</button>
                  <button className="management-btn secondary" type="button" onClick={() => handleEditItem(item)}>Modifica</button>
                  <button className="management-btn danger" type="button" onClick={() => handleDeleteItem(item.id)}>Elimina</button>
                </div>
              </div>
            ))}
            {filteredMenu.length === 0 ? <div className="management-subtitle">Nessun prodotto trovato.</div> : null}
          </div>
        </div>
      </div>
      </>
    );
  }

  function renderTables() {
    return (
      <div className="management-grid-2">
        <form className="management-card management-form" onSubmit={handleTableSubmit}>
          <SectionHead title="Nuovo tavolo" subtitle="Creazione veloce per sala, terrazza, privé o dehors." />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Nome"><TextInput placeholder="Tavolo 24" value={tableForm.name} onChange={(e) => setTableForm((prev) => ({ ...prev, name: e.target.value }))} /></Field>
            <Field label="Codice"><TextInput placeholder="24" value={tableForm.code} onChange={(e) => setTableForm((prev) => ({ ...prev, code: e.target.value }))} /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Zona"><TextInput placeholder="Sala" value={tableForm.zone} onChange={(e) => setTableForm((prev) => ({ ...prev, zone: e.target.value }))} /></Field>
            <Field label="Coperti"><TextInput type="number" value={tableForm.seats} onChange={(e) => setTableForm((prev) => ({ ...prev, seats: e.target.value }))} /></Field>
          </div>
          <Field label="Ordine mappa"><TextInput type="number" value={tableForm.sortOrder} onChange={(e) => setTableForm((prev) => ({ ...prev, sortOrder: e.target.value }))} /></Field>
          <button className="management-btn" type="submit" disabled={savingTable}>{savingTable ? "Creazione..." : "Crea tavolo"}</button>
          <button className="management-btn secondary" type="button" onClick={() => window.location.href = "/tavoli"}>Apri sala operativa</button>
        </form>

        <div className="management-card">
          <SectionHead title="Mappa configurazione" subtitle="Vista per zone: gestibile anche con centinaia di tavoli." action={<button className="management-btn secondary" onClick={() => window.location.href = "/qr"}>QR massivi</button>} />
          <div className="management-list">
            {tablesByZone.map(([zone, zoneTables]) => (
              <div key={zone}>
                <div className="management-row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
                  <div className="management-row-title">{zone}</div>
                  <span className="management-badge gray">{zoneTables.length} tavoli</span>
                </div>
                <div className="table-planner-grid">
                  {zoneTables.map((table) => (
                    <div key={table.id} className={`table-planner-seat ${table.isActive ? "" : "off"}`}>
                      <strong>{table.code || table.name}</strong>
                      <span>{table.seats || 0} coperti</span>
                      <div className="management-row" style={{ gap: 6 }}>
                        <button className="management-btn secondary" type="button" style={{ padding: "7px 9px", minHeight: 0, fontSize: 12 }} onClick={() => toggleTable(table)}>{table.isActive ? "Off" : "On"}</button>
                        <button className="management-btn secondary" type="button" style={{ padding: "7px 9px", minHeight: 0, fontSize: 12 }} onClick={() => regenerateQr(table)}>QR</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {tables.length === 0 ? <div className="management-subtitle">Nessun tavolo presente.</div> : null}
          </div>
        </div>
      </div>
    );
  }

  function renderStaff() {
    return (
      <div className="management-grid-2">
        <form className="management-card management-form" onSubmit={handleUserSubmit}>
          <SectionHead title="Nuovo accesso" subtitle="Ruoli separati: ogni operatore vede solo la schermata utile al suo lavoro." />
          <Field label="Nome"><TextInput placeholder="Mario" value={userForm.name} onChange={(e) => setUserForm((prev) => ({ ...prev, name: e.target.value }))} /></Field>
          <Field label="Email"><TextInput placeholder="mario@ristorante.it" type="email" value={userForm.email} onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))} /></Field>
          <Field label="Password temporanea"><TextInput placeholder="Password" type="password" value={userForm.password} onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))} /></Field>
          <Field label="Ruolo">
            <SelectInput value={userForm.role} onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value }))}>
              <option value="kitchen">Cucina</option>
              <option value="bar">Bar</option>
              <option value="cashier">Cassa</option>
              <option value="admin">Admin</option>
            </SelectInput>
          </Field>
          <button className="management-btn" type="submit" disabled={savingUser}>{savingUser ? "Creazione..." : "Crea accesso"}</button>
        </form>

        <div className="management-card">
          <SectionHead title="Team" subtitle="Controllo rapido degli accessi attivi." />
          <div className="management-list">
            {staffUsers.map((user) => (
              <div key={user.id} className="management-list-row">
                <div>
                  <div className="management-row-title">{user.name || user.email}</div>
                  <div className="management-row-meta">{user.email} · {roleLabel(user.role)}</div>
                </div>
                <div className="management-row" style={{ justifyContent: "flex-end" }}>
                  <span className={`management-badge ${user.isActive ? "green" : "red"}`}>{user.isActive ? "Attivo" : "Disattivo"}</span>
                  <button className="management-btn secondary" type="button" onClick={() => toggleUser(user)}>{user.isActive ? "Disattiva" : "Riattiva"}</button>
                  <button className="management-btn danger" type="button" onClick={() => deleteUser(user)}>Elimina</button>
                </div>
              </div>
            ))}
            {staffUsers.length === 0 ? <div className="management-subtitle">Nessun utente staff creato.</div> : null}
          </div>
        </div>
      </div>
    );
  }

  function renderSettings() {
    return (
      <div className="management-grid-2">
        <form className="management-card management-form" onSubmit={handleRestaurantSubmit}>
          <SectionHead title="Brand ristorante" subtitle="Nome, logo e colore usati su menu cliente, dashboard e QR." />
          <Field label="Nome ristorante"><TextInput value={restaurantForm.name} onChange={(e) => setRestaurantForm((prev) => ({ ...prev, name: e.target.value }))} /></Field>
          <Field label="Colore primario"><TextInput value={restaurantForm.primaryColor} onChange={(e) => setRestaurantForm((prev) => ({ ...prev, primaryColor: e.target.value }))} /></Field>
          <Field label="Logo URL"><TextInput value={restaurantForm.logoUrl} onChange={(e) => setRestaurantForm((prev) => ({ ...prev, logoUrl: e.target.value }))} /></Field>
          <Field label="Valuta"><TextInput value={restaurantForm.currency} onChange={(e) => setRestaurantForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))} /></Field>
          <label className="management-badge green" style={{ width: "fit-content" }}><input type="checkbox" checked={restaurantForm.isActive} onChange={(e) => setRestaurantForm((prev) => ({ ...prev, isActive: e.target.checked }))} /> Ristorante attivo</label>
          <button className="management-btn" type="submit" disabled={savingRestaurant}>{savingRestaurant ? "Salvataggio..." : "Salva impostazioni"}</button>
        </form>

        <div className="management-card">
          <SectionHead title="Centro controllo" subtitle="Le funzioni avanzate restano raggiungibili, ma fuori dal flusso quotidiano." />
          <div className="management-list">
            <div className="management-list-row"><div><div className="management-row-title">QR tavoli</div><div className="management-row-meta">Stampa e rigenera QR quando serve.</div></div><button className="management-btn secondary" onClick={() => window.location.href = "/qr"}>Apri</button></div>
            <div className="management-list-row"><div><div className="management-row-title">Abbonamento</div><div className="management-row-meta">Piano attuale: {restaurant?.plan || "starter"}</div></div><button className="management-btn secondary" onClick={() => window.location.href = "/billing"}>Gestisci</button></div>
            <div className="management-list-row"><div><div className="management-row-title">Storico ordini</div><div className="management-row-meta">Archivio completo fuori dalla dashboard.</div></div><button className="management-btn secondary" onClick={() => window.location.href = "/storico"}>Apri</button></div>
            <div className="management-list-row"><div><div className="management-row-title">Alert tecnici</div><div className="management-row-meta">Errori e diagnostica avanzata.</div></div><button className="management-btn secondary" onClick={() => window.location.href = "/errori"}>Apri</button></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={embedded ? { marginBottom: 16 } : glowPageStyle}>
      {!embedded ? <Navbar /> : null}
      <div style={embedded ? { padding: 0 } : appShellStyle}>
        <div className="app-shell management-os">
          <div className="management-hero">
            <div className="management-hero-main">
              <div className="management-kicker">EasyMenu · gestione</div>
              <h1 className="management-hero-title">Meno pagine, più controllo.</h1>
              <p className="management-hero-subtitle">
                Menu, sala, staff e impostazioni in un unico hub. Le funzioni che usi ogni giorno sono davanti, quelle rare restano ordinate nelle impostazioni.
              </p>
            </div>
            <div className="management-card">
              <SectionHead title={restaurant?.name || "Ristorante"} subtitle={`Slug: ${restaurant?.slug || "-"}`} />
              <div className="management-stats">
                <div className="management-stat"><span>Prodotti</span><strong>{menuItems.length}</strong></div>
                <div className="management-stat"><span>Online</span><strong>{availableItems}</strong></div>
                <div className="management-stat"><span>Tavoli</span><strong>{activeTables}</strong></div>
                <div className="management-stat"><span>Staff</span><strong>{staffUsers.length}</strong></div>
              </div>
            </div>
          </div>

          {error ? <div className="management-card" style={{ borderColor: "#fecaca", color: "#b91c1c" }}>{error}</div> : null}
          {success ? <div className="management-card" style={{ borderColor: "#bbf7d0", color: "#166534" }}>{success}</div> : null}

          <div className="management-tabs">
            {tabs.map((tab) => (
              <button key={tab.id} className={`management-tab ${activeTab === tab.id ? "is-active" : ""}`} type="button" onClick={() => setActiveTab(tab.id)}>
                <strong>{tab.title}</strong>
                <span>{tab.subtitle}</span>
              </button>
            ))}
          </div>

          {loading ? <div className="management-card">Caricamento gestione...</div> : null}
          {!loading && activeTab === "menu" ? renderMenu() : null}
          {!loading && activeTab === "tables" ? renderTables() : null}
          {!loading && activeTab === "staff" ? renderStaff() : null}
          {!loading && activeTab === "settings" ? renderSettings() : null}
        </div>
      </div>
    </div>
  );
}
