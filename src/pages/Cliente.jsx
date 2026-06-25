import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { API_URL } from "../lib/api";
import "../styles/customer-menu.css";

const DEMO_SLUG = "demo";
const LEGACY_DEMO_SLUG = "demo-restaurant";
const DEMO_TABLE_TOKEN = "demo-table-1";
const FEATURED_CATEGORY = "Consigliati";

const DEMO_MENU_ITEMS = [
  { id: "demo-antipasto-1", name: "Tartare mediterranea", shortDescription: "Manzo battuto, capperi, limone, olio EVO e chips croccanti", price: 14, category: "Antipasti", preparationArea: "kitchen", isFeatured: true, allergens: ["senape"] },
  { id: "demo-antipasto-2", name: "Burrata e pomodorini", shortDescription: "Burrata fresca, pomodorini confit, basilico e pane tostato", price: 11, category: "Antipasti", preparationArea: "kitchen", isFeatured: false, allergens: ["latte", "glutine"] },
  { id: "demo-primo-1", name: "Carbonara croccante", shortDescription: "Guanciale, pecorino romano, uovo e pepe tostato", price: 13, category: "Primi", preparationArea: "kitchen", isFeatured: true, allergens: ["glutine", "uova", "latte"] },
  { id: "demo-primo-2", name: "Risotto limone e gambero", shortDescription: "Riso mantecato, limone, gambero rosso e polvere di cappero", price: 18, category: "Primi", preparationArea: "kitchen", isFeatured: true, allergens: ["crostacei", "latte"] },
  { id: "demo-secondo-1", name: "Filetto al pepe verde", shortDescription: "Filetto di manzo, salsa al pepe verde e patata fondente", price: 24, category: "Secondi", preparationArea: "kitchen", isFeatured: true, allergens: ["latte"] },
  { id: "demo-secondo-2", name: "Branzino alle erbe", shortDescription: "Branzino, erbe fini, verdure arrosto e salsa agrumata", price: 21, category: "Secondi", preparationArea: "kitchen", isFeatured: true, allergens: ["pesce"] },
  { id: "demo-contorno-1", name: "Verdure di stagione", shortDescription: "Verdure grigliate, olio EVO e vinaigrette alle erbe", price: 6, category: "Contorni", preparationArea: "kitchen", isFeatured: false, allergens: [] },
  { id: "demo-dolce-1", name: "Tiramisu espresso", shortDescription: "Mascarpone, caffe espresso, cacao e biscotto leggero", price: 7, category: "Dolci", preparationArea: "kitchen", isFeatured: true, allergens: ["uova", "latte", "glutine"] },
  { id: "demo-bar-1", name: "Acqua frizzante", shortDescription: "Bottiglia 75cl", price: 2.5, category: "Bevande", preparationArea: "bar", isFeatured: false, allergens: [] },
  { id: "demo-bar-2", name: "Spritz Signature", shortDescription: "Aperol, prosecco, soda e arancia", price: 8, category: "Cocktail", preparationArea: "bar", isFeatured: true, allergens: ["solfiti"] },
  { id: "demo-vino-1", name: "Calice Etna rosso", shortDescription: "Selezione cantina, calice 12cl", price: 7, category: "Vini", preparationArea: "bar", isFeatured: false, allergens: ["solfiti"] },
];

function money(value) {
  const amount = Number(value || 0);
  return `€ ${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"}`;
}

function cartKey(slug, token) {
  return `cliente_cart_${slug}_${token}`;
}

function orderKey(slug, token) {
  return `cliente_order_${slug}_${token}`;
}

function normalizeAllergens(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeItem(item) {
  return {
    id: item.id,
    name: item.name || item.nome || "Prodotto",
    description: item.shortDescription || item.description || item.ingredienti || "",
    price: Number(item.price ?? item.prezzo ?? 0),
    category: item.category || item.categoria || "Menu",
    imageUrl: item.imageUrl || item.img || "",
    allergens: normalizeAllergens(item.allergens || item.allergeni),
    isFeatured: Boolean(item.isFeatured),
    preparationArea: item.preparationArea || "kitchen",
  };
}

function statusCopy(status) {
  if (status === "in_progress") return ["In preparazione", "La cucina sta lavorando sull'ordine."];
  if (status === "ready") return ["Pronto", "Il tuo ordine sta arrivando al tavolo."];
  if (status === "served") return ["Servito", "Ordine servito."];
  if (status === "cancelled") return ["Annullato", "Ordine annullato dal ristorante."];
  return ["Ordine ricevuto", "Il ristorante ha ricevuto la comanda."];
}

function getCategories(items) {
  const base = [...new Set(items.map((item) => item.category).filter(Boolean))];
  return items.some((item) => item.isFeatured) ? [FEATURED_CATEGORY, ...base] : base;
}

function ProductCard({ item, quantity, onAdd, onRemove }) {
  const hasImage = Boolean(item.imageUrl);

  return (
    <article className={`cm-product ${hasImage ? "with-image" : ""}`}>
      {hasImage ? <img className="cm-product-image" src={item.imageUrl} alt={item.name} /> : null}
      <div className="cm-product-body">
        <div className="cm-product-top">
          <div>
            <h3>{item.name}</h3>
            {item.description ? <p>{item.description}</p> : null}
          </div>
          <strong>{money(item.price)}</strong>
        </div>

        {item.allergens.length ? (
          <div className="cm-allergens" aria-label="Allergeni">
            {item.allergens.slice(0, 5).map((allergen) => <span key={allergen}>{allergen}</span>)}
          </div>
        ) : null}

        <div className="cm-product-actions">
          {quantity > 0 ? (
            <div className="cm-qty">
              <button type="button" onClick={() => onRemove(item.id)} aria-label={`Rimuovi ${item.name}`}>-</button>
              <span>{quantity}</span>
            </div>
          ) : <span className="cm-light-note">{item.isFeatured ? "Consigliato" : item.category}</span>}
          <button className="cm-add" type="button" onClick={() => onAdd(item.id)}>
            {quantity > 0 ? "Aggiungi ancora" : "Aggiungi"}
          </button>
        </div>
      </div>
    </article>
  );
}

function CartBar({ totalItems, totalAmount, loading, onOrder, onToggle, open }) {
  if (totalItems <= 0) return null;

  return (
    <div className="cm-cartbar">
      <button className="cm-cart-summary" type="button" onClick={onToggle}>
        <span>{totalItems} prodotti</span>
        <strong>{money(totalAmount)}</strong>
      </button>
      <button className="cm-order-button" type="button" disabled={loading} onClick={onOrder}>
        {loading ? "Invio..." : open ? "Ordina adesso" : "Ordina"}
      </button>
    </div>
  );
}

export default function Cliente() {
  const params = useParams();
  const search = new URLSearchParams(window.location.search);

  const slug =
    params.slug ||
    search.get("slug") ||
    search.get("restaurantSlug") ||
    localStorage.getItem("restaurant_slug") ||
    DEMO_SLUG;

  const tableToken =
    params.tableToken ||
    search.get("token") ||
    search.get("tableToken") ||
    params.tavolo ||
    DEMO_TABLE_TOKEN;

  const isDemo = [DEMO_SLUG, LEGACY_DEMO_SLUG].includes(slug) && String(tableToken).startsWith("demo-table");

  const [restaurant, setRestaurant] = useState({ name: isDemo ? "EasyMenu Demo" : "Ristorante", slug, logoUrl: "", primaryColor: "#0f172a" });
  const [table, setTable] = useState({ name: `Tavolo ${params.tavolo || "1"}`, qrToken: tableToken });
  const [items, setItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState(FEATURED_CATEGORY);
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [order, setOrder] = useState(null);
  const [payment, setPayment] = useState({ loading: false, error: "" });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadMenu() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`${API_URL}/tables/public/${encodeURIComponent(slug)}/${encodeURIComponent(tableToken)}`);
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          if (!isDemo) throw new Error(data?.message || "Menu non disponibile");
          const demoItems = DEMO_MENU_ITEMS.map(normalizeItem);
          if (!active) return;
          setRestaurant({ name: "EasyMenu Demo", slug: DEMO_SLUG, logoUrl: "", primaryColor: "#0f172a" });
          setTable({ name: `Tavolo ${String(tableToken).replace("demo-table-", "") || "1"}`, qrToken: tableToken });
          setItems(demoItems);
          setActiveCategory(getCategories(demoItems)[0] || "Menu");
          return;
        }

        const mapped = (data?.items || []).map(normalizeItem);
        if (!active) return;
        setRestaurant(data.restaurant || { name: "Ristorante", slug, logoUrl: "", primaryColor: "#0f172a" });
        setTable(data.table || { name: "Tavolo", qrToken: tableToken });
        setItems(mapped);
        setActiveCategory(getCategories(mapped)[0] || "Menu");
      } catch (err) {
        if (active) setError(err.message || "Menu non disponibile");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadMenu();
    return () => {
      active = false;
    };
  }, [slug, tableToken, isDemo]);

  useEffect(() => {
    try {
      const savedCart = JSON.parse(localStorage.getItem(cartKey(slug, tableToken)) || "{}");
      setCart(savedCart && typeof savedCart === "object" ? savedCart : {});
      const savedOrder = JSON.parse(localStorage.getItem(orderKey(slug, tableToken)) || "null");
      if (savedOrder?.items) setOrder(savedOrder);
    } catch {
      setCart({});
    }
  }, [slug, tableToken]);

  useEffect(() => {
    localStorage.setItem(cartKey(slug, tableToken), JSON.stringify(cart));
  }, [cart, slug, tableToken]);

  useEffect(() => {
    const token = order?.publicToken || order?.id;
    if (!token) return undefined;

    let active = true;
    const sync = async () => {
      try {
        const response = await fetch(`${API_URL}/orders/public/${encodeURIComponent(token)}`);
        const data = await response.json().catch(() => null);
        if (response.ok && data && active) {
          setOrder((prev) => {
            const next = { ...(prev || {}), ...data };
            localStorage.setItem(orderKey(slug, tableToken), JSON.stringify(next));
            return next;
          });
        }
      } catch {
        // La pagina cliente deve restare usabile anche se il backend si risveglia lentamente.
      }
    };

    sync();
    const timer = setInterval(sync, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [order?.id, order?.publicToken, slug, tableToken]);

  const categories = useMemo(() => getCategories(items), [items]);

  const visibleItems = useMemo(() => {
    if (activeCategory === FEATURED_CATEGORY) return items.filter((item) => item.isFeatured);
    return items.filter((item) => item.category === activeCategory);
  }, [activeCategory, items]);

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([id, quantity]) => {
        const item = items.find((product) => product.id === id);
        return item ? { ...item, quantity: Number(quantity || 0) } : null;
      })
      .filter((item) => item && item.quantity > 0);
  }, [cart, items]);

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cartItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const [statusTitle, statusText] = statusCopy(order?.status);

  function addItem(id) {
    setCart((prev) => ({ ...prev, [id]: Number(prev[id] || 0) + 1 }));
  }

  function removeItem(id) {
    setCart((prev) => {
      const nextQty = Number(prev[id] || 0) - 1;
      const next = { ...prev };
      if (nextQty <= 0) delete next[id];
      else next[id] = nextQty;
      return next;
    });
  }

  async function submitOrder() {
    if (sending || cartItems.length === 0) return;

    try {
      setSending(true);
      setError("");
      const payload = {
        restaurantSlug: slug,
        tableToken,
        customerName: "",
        notes: "",
        clientRequestId: `${slug}:${tableToken}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
        items: cartItems.map((item) => ({ menuItemId: item.id, quantity: item.quantity, notes: "" })),
      };

      let createdOrder = null;

      try {
        const response = await fetch(`${API_URL}/orders/public`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.message || "Ordine non inviato");
        createdOrder = data.order || data;
      } catch (err) {
        if (!isDemo) throw err;
        createdOrder = {
          id: `demo-${Date.now()}`,
          publicToken: "",
          status: "pending",
          orderNumber: "DEMO",
          restaurantName: restaurant.name,
          tableName: table.name,
          totalAmount,
          createdAt: new Date().toISOString(),
        };
      }

      const nextOrder = {
        ...createdOrder,
        items: cartItems.map((item) => ({
          id: item.id,
          nameSnapshot: item.name,
          quantity: item.quantity,
          priceSnapshot: item.price,
          categorySnapshot: item.category,
        })),
        restaurantName: createdOrder.restaurantName || restaurant.name,
        tableName: createdOrder.tableName || table.name,
        totalAmount: Number(createdOrder.totalAmount || totalAmount),
      };

      setOrder(nextOrder);
      setCart({});
      setCartOpen(false);
      localStorage.removeItem(cartKey(slug, tableToken));
      localStorage.setItem(orderKey(slug, tableToken), JSON.stringify(nextOrder));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message || "Impossibile inviare l'ordine");
    } finally {
      setSending(false);
    }
  }

  async function payOnline() {
    const token = order?.publicToken || order?.id;
    if (!token || payment.loading) return;

    try {
      setPayment({ loading: true, error: "" });
      const response = await fetch(`${API_URL}/payments/public/${encodeURIComponent(token)}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ splitCount: 1, payerIndex: 1 }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.checkoutUrl) throw new Error(data?.message || "Pagamento non disponibile");
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setPayment({ loading: false, error: err.message || "Pagamento non disponibile" });
    }
  }

  if (loading) {
    return (
      <main className="cm-page">
        <section className="cm-empty">
          <h1>Caricamento menu</h1>
          <p>Stiamo aprendo il menu del tavolo.</p>
        </section>
      </main>
    );
  }

  if (error && items.length === 0) {
    return (
      <main className="cm-page">
        <section className="cm-empty">
          <h1>Menu non disponibile</h1>
          <p>{error}</p>
        </section>
      </main>
    );
  }

  if (order) {
    return (
      <main className="cm-page">
        <header className="cm-header compact">
          {restaurant.logoUrl ? <img src={restaurant.logoUrl} alt={restaurant.name} /> : <div className="cm-logo-fallback">{restaurant.name?.slice(0, 1) || "E"}</div>}
          <div>
            <strong>{restaurant.name}</strong>
            <span>{order.tableName || table.name}</span>
          </div>
        </header>

        <section className="cm-confirmation">
          <span className="cm-status-pill">{order.orderNumber || "Ordine"}</span>
          <h1>{statusTitle}</h1>
          <p>{statusText}</p>

          <div className="cm-order-lines">
            {(order.items || []).map((item, index) => (
              <div key={`${item.id || item.nameSnapshot}-${index}`}>
                <span>{item.nameSnapshot || item.name} x{item.quantity}</span>
                <strong>{money(Number(item.priceSnapshot || item.price || 0) * Number(item.quantity || 1))}</strong>
              </div>
            ))}
          </div>

          <div className="cm-confirm-total">
            <span>Totale</span>
            <strong>{money(order.totalAmount)}</strong>
          </div>

          {payment.error ? <div className="cm-error">{payment.error}</div> : null}

          <div className="cm-confirm-actions">
            {(order.publicToken || (!isDemo && order.id)) ? (
              <button type="button" onClick={payOnline} disabled={payment.loading}>
                {payment.loading ? "Apro pagamento..." : "Paga online"}
              </button>
            ) : null}
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setOrder(null);
                localStorage.removeItem(orderKey(slug, tableToken));
              }}
            >
              Continua a ordinare
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="cm-page" style={{ "--cm-accent": restaurant.primaryColor || "#0f172a" }}>
      <header className="cm-header">
        {restaurant.logoUrl ? <img src={restaurant.logoUrl} alt={restaurant.name} /> : <div className="cm-logo-fallback">{restaurant.name?.slice(0, 1) || "E"}</div>}
        <div>
          <strong>{restaurant.name}</strong>
          <span>{table.name || "Tavolo"}</span>
        </div>
      </header>

      <nav className="cm-categories" aria-label="Categorie menu">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={category === activeCategory ? "active" : ""}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </nav>

      {error ? <div className="cm-error">{error}</div> : null}

      <section className="cm-products" aria-label={activeCategory}>
        {visibleItems.length ? visibleItems.map((item) => (
          <ProductCard
            key={item.id}
            item={item}
            quantity={Number(cart[item.id] || 0)}
            onAdd={addItem}
            onRemove={removeItem}
          />
        )) : (
          <div className="cm-empty small">Nessun prodotto in questa categoria.</div>
        )}
      </section>

      {cartOpen ? (
        <section className="cm-cart-detail">
          <div className="cm-cart-head">
            <strong>Carrello</strong>
            <button type="button" onClick={() => setCartOpen(false)}>Chiudi</button>
          </div>
          {cartItems.map((item) => (
            <div className="cm-cart-line" key={item.id}>
              <span>{item.name}</span>
              <div>
                <button type="button" onClick={() => removeItem(item.id)}>-</button>
                <b>{item.quantity}</b>
                <button type="button" onClick={() => addItem(item.id)}>+</button>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <CartBar
        totalItems={totalItems}
        totalAmount={totalAmount}
        loading={sending}
        open={cartOpen}
        onToggle={() => setCartOpen((value) => !value)}
        onOrder={submitOrder}
      />
    </main>
  );
}
