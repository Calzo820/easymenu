import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { apiDelete, apiGet, apiPatch, apiPost } from "../lib/api";
import { appShellStyle, glowPageStyle } from "../styles/pageStyles";

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
  zone: "",
  sortOrder: 0,
};

const emptyUser = {
  name: "",
  email: "",
  password: "",
  role: "kitchen",
};

function formatEuro(value) {
  const amount = Number(value || 0);
  return `€ ${amount.toFixed(2)}`;
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
    const confirmed = window.confirm("Eliminare questo prodotto?");
    if (!confirmed) return;

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

  function handleEditItem(item) {
    setEditingItemId(item.id);
    setItemForm({
      name: item.name || "",
      shortDescription: item.shortDescription || "",
      description: item.description || "",
      price: item.price ?? "",
      category: item.category || "",
      preparationArea: item.preparationArea || "kitchen",
      imageUrl: item.imageUrl || "",
      allergens: Array.isArray(item.allergens) ? item.allergens.join(", ") : "",
      sortOrder: item.sortOrder ?? 0,
      vatRate: item.vatRate ?? 10,
      isAvailable: Boolean(item.isAvailable),
      isFeatured: Boolean(item.isFeatured),
    });
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
    const confirmed = window.confirm(`Eliminare l'utente ${user.email}?`);
    if (!confirmed) return;

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

  return (
    <div style={embedded ? { marginBottom: 16 } : glowPageStyle}>
      {!embedded ? <Navbar /> : null}
      <div style={embedded ? { padding: 0 } : appShellStyle}>
        <div className="app-shell" style={{ display: "grid", gap: 18 }}>
          <div className="glass-hero" style={{ padding: 24 }}>
            <div className="topbar-chip" style={{ marginBottom: 12 }}>Gestione ristorante</div>
            <h1 style={{ margin: 0, fontSize: 38, lineHeight: 1.05 }}>Menu, tavoli, staff e impostazioni</h1>
            <p style={{ marginTop: 12, marginBottom: 0, color: "rgba(255,255,255,0.9)", maxWidth: 760, lineHeight: 1.7 }}>
              Modifica la configurazione del ristorante senza uscire dalla dashboard principale.
            </p>
          </div>

          {error ? <div className="section-card" style={{ border: "1px solid #fecaca", color: "#b91c1c" }}>{error}</div> : null}
          {success ? <div className="section-card" style={{ border: "1px solid #bbf7d0", color: "#166534" }}>{success}</div> : null}

          {loading ? (
            <div className="section-card">Caricamento pannello admin...</div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 18 }}>
                <form className="section-card" onSubmit={handleRestaurantSubmit} style={{ display: "grid", gap: 14 }}>
                  <div className="panel-title">Impostazioni ristorante</div>
                  <label>
                    <div>Nome ristorante</div>
                    <input value={restaurantForm.name} onChange={(e) => setRestaurantForm((prev) => ({ ...prev, name: e.target.value }))} style={{ width: "100%" }} />
                  </label>
                  <label>
                    <div>Colore primario</div>
                    <input value={restaurantForm.primaryColor} onChange={(e) => setRestaurantForm((prev) => ({ ...prev, primaryColor: e.target.value }))} style={{ width: "100%" }} />
                  </label>
                  <label>
                    <div>Logo URL</div>
                    <input value={restaurantForm.logoUrl} onChange={(e) => setRestaurantForm((prev) => ({ ...prev, logoUrl: e.target.value }))} style={{ width: "100%" }} />
                  </label>
                  <label>
                    <div>Valuta</div>
                    <input value={restaurantForm.currency} onChange={(e) => setRestaurantForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))} style={{ width: "100%" }} />
                  </label>
                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="checkbox" checked={restaurantForm.isActive} onChange={(e) => setRestaurantForm((prev) => ({ ...prev, isActive: e.target.checked }))} />
                    Ristorante attivo
                  </label>
                  <button type="submit" disabled={savingRestaurant}>{savingRestaurant ? "Salvataggio..." : "Salva impostazioni"}</button>
                </form>

                <div className="section-card" style={{ display: "grid", gap: 12 }}>
                  <div className="panel-title">Snapshot rapido</div>
                  <div>Slug: <b>{restaurant?.slug || "-"}</b></div>
                  <div>Piano: <b>{restaurant?.plan || "starter"}</b></div>
                  <div>Prodotti menu: <b>{menuItems.length}</b></div>
                  <div>Tavoli: <b>{tables.length}</b></div>
                  <div>Categorie: <b>{categories.length}</b></div>
                </div>
              </div>



              <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 18 }}>
                <form className="section-card" onSubmit={handleUserSubmit} style={{ display: "grid", gap: 12 }}>
                  <div className="panel-title">Nuovo utente staff</div>
                  <p style={{ margin: 0, color: "#64748b", lineHeight: 1.6 }}>
                    Crea accessi separati per cucina, bar e cassa. Ogni utente resta legato solo a questo ristorante.
                  </p>
                  <input placeholder="Nome" value={userForm.name} onChange={(e) => setUserForm((prev) => ({ ...prev, name: e.target.value }))} />
                  <input placeholder="Email" type="email" value={userForm.email} onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))} />
                  <input placeholder="Password temporanea" type="password" value={userForm.password} onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))} />
                  <select value={userForm.role} onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value }))}>
                    <option value="kitchen">Cucina</option>
                    <option value="bar">Bar</option>
                    <option value="cashier">Cassa</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button type="submit" disabled={savingUser}>{savingUser ? "Creazione..." : "Crea utente"}</button>
                </form>

                <div className="section-card" style={{ display: "grid", gap: 12 }}>
                  <div className="panel-title">Utenti ristorante</div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {staffUsers.map((user) => (
                      <div key={user.id} style={{ padding: 14, border: "1px solid #e5e7eb", borderRadius: 16, background: "white", display: "grid", gap: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: 900 }}>{user.name}</div>
                            <div style={{ color: "#64748b", fontSize: 14 }}>{user.email} · {user.role}</div>
                          </div>
                          <div style={{ fontWeight: 800, color: user.isActive ? "#15803d" : "#b91c1c" }}>{user.isActive ? "Attivo" : "Disattivo"}</div>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button type="button" onClick={() => toggleUser(user)}>{user.isActive ? "Disattiva" : "Riattiva"}</button>
                          <button type="button" onClick={() => deleteUser(user)}>Elimina</button>
                        </div>
                      </div>
                    ))}
                    {staffUsers.length === 0 ? <div>Nessun utente staff creato.</div> : null}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <form className="section-card" onSubmit={handleItemSubmit} style={{ display: "grid", gap: 12 }}>
                  <div className="panel-title">{editingItemId ? "Modifica prodotto" : "Nuovo prodotto"}</div>
                  <input placeholder="Nome" value={itemForm.name} onChange={(e) => setItemForm((prev) => ({ ...prev, name: e.target.value }))} />
                  <input placeholder="Categoria" value={itemForm.category} onChange={(e) => setItemForm((prev) => ({ ...prev, category: e.target.value }))} />
                  <input placeholder="Prezzo" type="number" step="0.01" value={itemForm.price} onChange={(e) => setItemForm((prev) => ({ ...prev, price: e.target.value }))} />
                  <select value={itemForm.preparationArea} onChange={(e) => setItemForm((prev) => ({ ...prev, preparationArea: e.target.value }))}>
                    <option value="kitchen">Kitchen</option>
                    <option value="bar">Bar</option>
                  </select>
                  <input placeholder="Descrizione breve" value={itemForm.shortDescription} onChange={(e) => setItemForm((prev) => ({ ...prev, shortDescription: e.target.value }))} />
                  <textarea placeholder="Descrizione" value={itemForm.description} onChange={(e) => setItemForm((prev) => ({ ...prev, description: e.target.value }))} />
                  <input placeholder="URL immagine" value={itemForm.imageUrl} onChange={(e) => setItemForm((prev) => ({ ...prev, imageUrl: e.target.value }))} />
                  <input placeholder="Allergeni separati da virgola" value={itemForm.allergens} onChange={(e) => setItemForm((prev) => ({ ...prev, allergens: e.target.value }))} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <input placeholder="Ordine" type="number" value={itemForm.sortOrder} onChange={(e) => setItemForm((prev) => ({ ...prev, sortOrder: e.target.value }))} />
                    <input placeholder="IVA" type="number" step="0.01" value={itemForm.vatRate} onChange={(e) => setItemForm((prev) => ({ ...prev, vatRate: e.target.value }))} />
                  </div>
                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="checkbox" checked={itemForm.isAvailable} onChange={(e) => setItemForm((prev) => ({ ...prev, isAvailable: e.target.checked }))} />
                    Disponibile
                  </label>
                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="checkbox" checked={itemForm.isFeatured} onChange={(e) => setItemForm((prev) => ({ ...prev, isFeatured: e.target.checked }))} />
                    In evidenza
                  </label>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button type="submit" disabled={savingItem}>{savingItem ? "Salvataggio..." : editingItemId ? "Aggiorna prodotto" : "Crea prodotto"}</button>
                    {editingItemId ? <button type="button" onClick={() => { setEditingItemId(""); setItemForm(emptyItem); }}>Annulla</button> : null}
                  </div>
                </form>

                <div className="section-card" style={{ display: "grid", gap: 12 }}>
                  <div className="panel-title">Catalogo menu</div>
                  <div style={{ maxHeight: 640, overflow: "auto", display: "grid", gap: 10 }}>
                    {menuItems.map((item) => (
                      <div key={item.id} style={{ padding: 14, border: "1px solid #e5e7eb", borderRadius: 16, background: "white" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <div>
                            <div style={{ fontWeight: 900 }}>{item.name}</div>
                            <div style={{ color: "#64748b", fontSize: 14 }}>{item.category || "Senza categoria"} · {item.preparationArea}</div>
                            <div style={{ marginTop: 6 }}>{formatEuro(item.price)}</div>
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "start" }}>
                            <button type="button" onClick={() => handleEditItem(item)}>Modifica</button>
                            <button type="button" onClick={() => handleDeleteItem(item.id)}>Elimina</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {menuItems.length === 0 ? <div>Nessun prodotto ancora creato.</div> : null}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 18 }}>
                <form className="section-card" onSubmit={handleTableSubmit} style={{ display: "grid", gap: 12 }}>
                  <div className="panel-title">Nuovo tavolo</div>
                  <input placeholder="Nome tavolo" value={tableForm.name} onChange={(e) => setTableForm((prev) => ({ ...prev, name: e.target.value }))} />
                  <input placeholder="Codice" value={tableForm.code} onChange={(e) => setTableForm((prev) => ({ ...prev, code: e.target.value }))} />
                  <input placeholder="Coperti" type="number" value={tableForm.seats} onChange={(e) => setTableForm((prev) => ({ ...prev, seats: e.target.value }))} />
                  <input placeholder="Zona" value={tableForm.zone} onChange={(e) => setTableForm((prev) => ({ ...prev, zone: e.target.value }))} />
                  <input placeholder="Ordine visualizzazione" type="number" value={tableForm.sortOrder} onChange={(e) => setTableForm((prev) => ({ ...prev, sortOrder: e.target.value }))} />
                  <button type="submit" disabled={savingTable}>{savingTable ? "Creazione..." : "Crea tavolo"}</button>
                </form>

                <div className="section-card" style={{ display: "grid", gap: 12 }}>
                  <div className="panel-title">Tavoli</div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {tables.map((table) => (
                      <div key={table.id} style={{ padding: 14, border: "1px solid #e5e7eb", borderRadius: 16, display: "grid", gap: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: 900 }}>{table.name}</div>
                            <div style={{ color: "#64748b", fontSize: 14 }}>Codice {table.code} · {table.seats} coperti · {table.zone || "Sala"}</div>
                          </div>
                          <div style={{ fontWeight: 800, color: table.isActive ? "#15803d" : "#b91c1c" }}>{table.isActive ? "Attivo" : "Disattivo"}</div>
                        </div>
                        <div style={{ fontSize: 13, color: "#64748b", wordBreak: "break-all" }}>QR token: {table.qrToken}</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button type="button" onClick={() => toggleTable(table)}>{table.isActive ? "Disattiva" : "Attiva"}</button>
                          <button type="button" onClick={() => regenerateQr(table)}>Rigenera QR</button>
                        </div>
                      </div>
                    ))}
                    {tables.length === 0 ? <div>Nessun tavolo presente.</div> : null}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
