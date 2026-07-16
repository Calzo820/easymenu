import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { apiDelete, apiGet, apiPatch, apiPost } from "../lib/api";
import { imageFileToDataUrl } from "../lib/imageFiles";
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
  sortOrder: 0,
};

const emptyUser = {
  name: "",
  email: "",
  password: "",
  role: "kitchen",
};

const CATEGORY_PRESETS = ["Antipasti", "Primi", "Secondi", "Contorni", "Dolci", "Bevande"];
const SUPPORT_EMAIL = "easy.menu.service@gmail.com";
const SUPPORT_PHONE = "+39 324 046 7723";
const supportWhatsAppUrl = `https://wa.me/393240467723?text=${encodeURIComponent("Ciao, ho bisogno di supporto per EasyMenu.")}`;

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
  const unavailable = total - online;

  return { total, online, unavailable, missingPhoto, missingDescription, missingCategory, featured };
}

function formatEuro(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number.isFinite(amount) ? amount : 0);
}

function bySortThenName(a, b) {
  const sortA = Number(a?.sortOrder ?? 0);
  const sortB = Number(b?.sortOrder ?? 0);
  if (sortA !== sortB) return sortA - sortB;
  return String(a?.name || a?.code || "").localeCompare(String(b?.name || b?.code || ""), "it", { numeric: true });
}


function getInitialTab(search = window.location.search) {
  const tab = new URLSearchParams(search || "").get("tab") || "menu";
  return ["menu", "staff"].includes(tab) ? tab : "menu";
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


function SettingsCard({ icon, title, subtitle, action, tone = "default", onClick }) {
  return (
    <button type="button" className={`settings-card ${tone}`} onClick={onClick}>
      <span className="settings-card-icon">{icon}</span>
      <span className="settings-card-copy">
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </span>
      <span className="settings-card-action">{action || "Apri"}</span>
    </button>
  );
}

export default function AdminPanel({ embedded = false } = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingRestaurant, setSavingRestaurant] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [savingTable, setSavingTable] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [uploadingItemImage, setUploadingItemImage] = useState(false);
  const [uploadingRestaurantLogo, setUploadingRestaurantLogo] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState(() => getInitialTab(location.search));
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [qualityFilter, setQualityFilter] = useState("all");
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

  useEffect(() => {
    setActiveTab(getInitialTab(location.search));
  }, [location.search]);

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
        if (qualityFilter === "missingPhoto" && hasText(item.imageUrl)) return false;
        if (qualityFilter === "missingDescription" && (hasText(item.shortDescription) || hasText(item.description))) return false;
        if (qualityFilter === "missingCategory" && hasText(item.category)) return false;
        if (qualityFilter === "offline" && item.isAvailable) return false;
        if (qualityFilter === "featured" && !item.isFeatured) return false;
        if (!term) return true;
        return [item.name, item.category, item.preparationArea, item.shortDescription, item.description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term);
      });
  }, [menuItems, query, categoryFilter, areaFilter, qualityFilter]);

  const tablesByZone = useMemo(() => {
    const map = new Map();
    [...tables].sort(bySortThenName).forEach((table) => {
      const zone = table.zone || "Sala";
      if (!map.has(zone)) map.set(zone, []);
      map.get(zone).push(table);
    });
    return [...map.entries()];
  }, [tables]);

  const firstCustomerTable = tables.find((table) => table.isActive && table.qrToken);
  const customerMenuLink = restaurant?.slug && firstCustomerTable?.qrToken
    ? `/menu/${restaurant.slug}/${firstCustomerTable.qrToken}`
    : "";
  const pageTitle = activeTab === "settings" ? "Impostazioni ristorante" : activeTab === "staff" ? "Staff opzionale" : "Menu del ristorante";
  const pageSubtitle = activeTab === "settings"
    ? "Profilo, abbonamento, privacy e supporto in un posto solo."
    : activeTab === "staff"
      ? "Puoi partire con un solo account owner e aggiungere ruoli separati quando servono davvero."
      : "Prodotti, prezzi, disponibilita e anteprima cliente senza funzioni duplicate.";

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

  async function handleItemImageFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setUploadingItemImage(true);
      setError("");
      const imageUrl = await imageFileToDataUrl(file, { maxWidth: 1400, maxHeight: 1000, quality: 0.82 });
      setItemForm((prev) => ({ ...prev, imageUrl }));
      setSuccess("Immagine piatto caricata. Salva il prodotto per pubblicarla.");
    } catch (err) {
      setError(err.message || "Errore caricamento immagine");
    } finally {
      setUploadingItemImage(false);
      event.target.value = "";
    }
  }

  async function handleRestaurantLogoFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setUploadingRestaurantLogo(true);
      setError("");
      const logoUrl = await imageFileToDataUrl(file, { maxWidth: 900, maxHeight: 900, quality: 0.84 });
      setRestaurantForm((prev) => ({ ...prev, logoUrl }));
      setSuccess("Logo caricato. Salva il profilo ristorante per pubblicarlo.");
    } catch (err) {
      setError(err.message || "Errore caricamento logo");
    } finally {
      setUploadingRestaurantLogo(false);
      event.target.value = "";
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
      setError(err.message || "Errore aggiornamento disponibilita");
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

  function renderMenu() {
    return (
      <>
      <div className="menu-health-grid">
        <div className="management-card menu-health-main">
          <SectionHead
            title="Stato menu"
            subtitle="Controllo essenziale di cio che il cliente puo ordinare dal tavolo."
          />
          <div className="menu-health-metrics">
            <div><span>Prodotti</span><strong>{menuQuality.total}</strong></div>
            <div><span>Online</span><strong>{menuQuality.online}</strong></div>
            <div><span>Non disponibili</span><strong>{menuQuality.unavailable}</strong></div>
            <div><span>In evidenza</span><strong>{menuQuality.featured}</strong></div>
          </div>
        </div>
      </div>

      {customerMenuLink ? (
        <a className="menu-customer-strip" href={customerMenuLink} target="_blank" rel="noreferrer">
          <span>Menu cliente</span>
          <strong>Visualizza cio che vede il cliente</strong>
          <small>Apri l'anteprima reale collegata al primo QR tavolo attivo.</small>
        </a>
      ) : (
        <button type="button" className="menu-customer-strip" onClick={() => { window.location.href = "/tavoli"; }}>
          <span>Menu cliente</span>
          <strong>Crea un tavolo per vedere il menu cliente</strong>
          <small>Il menu pubblico funziona tramite QR tavolo.</small>
        </button>
      )}

      <div className="menu-action-board">
        {[
          ["offline", "Non disponibili", menuQuality.unavailable, "Controlla cosa il cliente non puo ordinare."],
          ["featured", "In evidenza", menuQuality.featured, "Piatti da spingere nel menu cliente."],
        ].map(([filter, title, value, hint]) => (
          <button
            key={filter}
            type="button"
            className={qualityFilter === filter ? "is-active" : ""}
            onClick={() => setQualityFilter(qualityFilter === filter ? "all" : filter)}
          >
            <span>{title}</span>
            <b>{value}</b>
            <small>{hint}</small>
          </button>
        ))}
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
          <Field label="Immagine piatto">
            <div className="management-upload-row">
              <TextInput placeholder="URL immagine oppure carica da PC" value={itemForm.imageUrl} onChange={(e) => setItemForm((prev) => ({ ...prev, imageUrl: e.target.value }))} />
              <label className="management-file-button">
                {uploadingItemImage ? "Carico..." : "Da PC"}
                <input type="file" accept="image/*" onChange={handleItemImageFile} disabled={uploadingItemImage} />
              </label>
            </div>
            {itemForm.imageUrl ? (
              <div className="management-image-preview">
                <img src={itemForm.imageUrl} alt="Anteprima piatto" />
                <button type="button" onClick={() => setItemForm((prev) => ({ ...prev, imageUrl: "" }))}>Rimuovi</button>
              </div>
            ) : null}
          </Field>
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
            subtitle={`${filteredMenu.length} prodotti visibili. Modifica disponibilita, prezzo e dettagli senza cambiare pagina.`}
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
                <SelectInput value={qualityFilter} onChange={(e) => setQualityFilter(e.target.value)}>
                  <option value="all">Stato: tutti</option>
                  <option value="offline">Non disponibili</option>
                  <option value="featured">In evidenza</option>
                </SelectInput>
              </div>
            }
          />
          <div className="management-list">
            {filteredMenu.map((item) => (
              <div key={item.id} className="management-list-row">
                <div>
                  <div className="management-row-title">{item.name}</div>
                  <div className="management-row-meta">{item.category || "Senza categoria"} - {item.preparationArea === "bar" ? "Bar" : "Cucina"}</div>
                  <div className="management-price">{formatEuro(item.price)}</div>
                  <div className="management-row" style={{ marginTop: 8 }}>
                    {item.isFeatured ? <span className="management-badge">In evidenza</span> : null}
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
          <SectionHead title="Nuovo tavolo" subtitle="Creazione veloce: basta numero tavolo e ordine mappa." />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Nome"><TextInput placeholder="Tavolo 24" value={tableForm.name} onChange={(e) => setTableForm((prev) => ({ ...prev, name: e.target.value }))} /></Field>
            <Field label="Codice"><TextInput placeholder="24" value={tableForm.code} onChange={(e) => setTableForm((prev) => ({ ...prev, code: e.target.value }))} /></Field>
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
                      <span>{table.isActive ? "Attivo" : "Nascosto"}</span>
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
                  <div className="management-row-meta">{user.email} - {roleLabel(user.role)}</div>
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
    const privacyItems = [
      "SuperAdmin: dati economici nascosti in modalita assistenza",
      "Accesso al ristorante solo con motivo supporto o consenso",
      "Pagine pubbliche privacy, termini e cookie gia disponibili",
    ];

    return (
      <div className="settings-os-grid">
        <form className="management-card management-form settings-brand-panel" onSubmit={handleRestaurantSubmit}>
          <SectionHead
            title="Profilo ristorante"
            subtitle="Identita pubblica, brand, valuta e stato del locale."
          />
          <Field label="Nome ristorante"><TextInput value={restaurantForm.name} onChange={(e) => setRestaurantForm((prev) => ({ ...prev, name: e.target.value }))} /></Field>
          <div className="settings-brand-row">
            <Field label="Colore primario"><TextInput value={restaurantForm.primaryColor} onChange={(e) => setRestaurantForm((prev) => ({ ...prev, primaryColor: e.target.value }))} /></Field>
            <Field label="Valuta"><TextInput value={restaurantForm.currency} onChange={(e) => setRestaurantForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))} /></Field>
          </div>
          <Field label="Logo ristorante">
            <div className="management-upload-row">
              <TextInput value={restaurantForm.logoUrl} onChange={(e) => setRestaurantForm((prev) => ({ ...prev, logoUrl: e.target.value }))} />
              <label className="management-file-button">
                {uploadingRestaurantLogo ? "Carico..." : "Da PC"}
                <input type="file" accept="image/*" onChange={handleRestaurantLogoFile} disabled={uploadingRestaurantLogo} />
              </label>
            </div>
            {restaurantForm.logoUrl ? (
              <div className="management-logo-preview">
                <img src={restaurantForm.logoUrl} alt="Logo ristorante" />
              </div>
            ) : null}
          </Field>
          <label className="management-badge green" style={{ width: "fit-content" }}><input type="checkbox" checked={restaurantForm.isActive} onChange={(e) => setRestaurantForm((prev) => ({ ...prev, isActive: e.target.checked }))} /> Ristorante attivo</label>
          <button className="management-btn" type="submit" disabled={savingRestaurant}>{savingRestaurant ? "Salvataggio..." : "Salva profilo"}</button>
        </form>

        <div className="settings-os-stack">
          <div className="management-card settings-group-card">
            <SectionHead
              title="Configurazione essenziale"
              subtitle="Poche sezioni chiare: profilo, setup e integrazioni. Menu e tavoli restano nelle loro pagine dedicate."
            />
            <div className="settings-card-grid">
              <SettingsCard icon="SET" title="Setup guidato" subtitle="Completa EasyMenu passo passo." action="Apri" onClick={() => window.location.href = "/onboarding"} />
              <SettingsCard icon="BRD" title="Brand e colori" subtitle="Logo, colore primario e valuta del menu." action="Modifica" onClick={() => document.querySelector(".settings-brand-panel")?.scrollIntoView({ behavior: "smooth" })} />
              <SettingsCard icon="INT" title="Integrazioni" subtitle="POS, stampanti, delivery e prenotazioni." action="Apri" onClick={() => window.location.href = "/integrazioni"} />
            </div>
          </div>

          <div className="management-card settings-staff-note">
            <SectionHead title="Staff opzionale" subtitle="Non e obbligatorio registrare subito piu email o piu personale." />
            <p>
              Il ristorante puo partire con un solo account owner. Gli accessi separati per cucina, bar e cassa servono solo
              se il locale vuole tablet o operatori dedicati.
            </p>
            <button className="management-btn secondary" type="button" onClick={() => { setActiveTab("staff"); navigate("/admin?tab=staff", { replace: true }); }}>
              Configura staff piu avanti
            </button>
          </div>

          <div className="management-card settings-group-card">
            <SectionHead title="Amministrazione" subtitle="Piano, documenti e assistenza: solo cio che serve per gestire il locale." />
            <div className="settings-card-grid two">
              <SettingsCard icon="PAY" title="Abbonamento" subtitle={`Piano attuale: ${restaurant?.plan || "mensile"}`} action="Gestisci" tone="billing" onClick={() => window.location.href = "/billing"} />
              <SettingsCard icon="DOC" title="Privacy e documenti" subtitle="Policy, termini, cookie e trattamento dati." action="Apri" onClick={() => document.querySelector(".settings-privacy-panel")?.scrollIntoView({ behavior: "smooth" })} />
              <SettingsCard icon="SOS" title="Contattaci" subtitle="Problemi tecnici o dubbi operativi. Risposta entro 24h." action="Assistenza" tone="support" onClick={() => document.querySelector(".settings-support-panel")?.scrollIntoView({ behavior: "smooth" })} />
            </div>
          </div>

          <div className="management-card settings-support-panel">
            <SectionHead title="Contattaci" subtitle="Se il ristorante riscontra un problema, EasyMenu risponde entro 24 ore lavorative." />
            <div className="settings-support-grid">
              <a href={supportWhatsAppUrl} target="_blank" rel="noreferrer">
                <strong>WhatsApp</strong>
                <span>{SUPPORT_PHONE}</span>
                <small>Per problemi durante il servizio o richieste urgenti.</small>
              </a>
              <a href={`mailto:${SUPPORT_EMAIL}?subject=Supporto EasyMenu`}>
                <strong>Email supporto</strong>
                <span>{SUPPORT_EMAIL}</span>
                <small>Per domande su account, abbonamento, QR o configurazione.</small>
              </a>
              <button type="button" onClick={() => window.location.href = "/errori"}>
                <strong>Diagnostica</strong>
                <span>Apri errori e log</span>
                <small>Utile se serve allegare dettagli tecnici alla richiesta.</small>
              </button>
            </div>
          </div>

          <div className="management-card settings-privacy-panel">
            <SectionHead title="Privacy e documenti" subtitle="Prima della vendita pubblica serve separare supporto tecnico, dati cliente e documentazione legale." />
            <div className="settings-privacy-layout">
              <div>
                <div className="settings-privacy-title">Privacy mode attivo</div>
                <p className="management-subtitle">Quando accedi come SuperAdmin dentro un ristorante, i valori economici sono oscurati per ridurre l'accesso non necessario ai dati operativi.</p>
                <ul className="settings-checklist">
                  {privacyItems.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <div className="settings-doc-list">
                <div><strong>Privacy Policy</strong><span><a href="/privacy" target="_blank" rel="noreferrer">Apri pagina pubblica</a></span></div>
                <div><strong>Termini di servizio</strong><span><a href="/termini" target="_blank" rel="noreferrer">Apri pagina pubblica</a></span></div>
                <div><strong>DPA / Nomina responsabile</strong><span>Bozza in docs/legal da validare</span></div>
                <div><strong>Cookie policy</strong><span><a href="/cookie" target="_blank" rel="noreferrer">Apri pagina pubblica</a></span></div>
              </div>
            </div>
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
              <div className="management-kicker">EasyMenu - gestione</div>
              <h1 className="management-hero-title">{pageTitle}</h1>
              <p className="management-hero-subtitle">{pageSubtitle}</p>
            </div>
          </div>

          {error ? <div className="management-card" style={{ borderColor: "#fecaca", color: "#b91c1c" }}>{error}</div> : null}
          {success ? <div className="management-card" style={{ borderColor: "#bbf7d0", color: "#166534" }}>{success}</div> : null}

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
