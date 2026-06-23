import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { API_URL } from "../lib/api";
import placeholderFood from "../assets/placeholder-food.png";

function carrelloKey(slug, tavoloToken) {
  return `carrello_${slug}_${tavoloToken}`;
}

function ordineConfermatoKey(slug, tavoloToken) {
  return `ordine_confermato_${slug}_${tavoloToken}`;
}

function ordiniKey(nome) {
  return `ordini_${nome}`;
}

function parsePrezzo(value) {
  const numero = Number(value);
  return Number.isFinite(numero) ? numero : 0;
}

function formatEuro(value) {
  return parsePrezzo(value).toFixed(2);
}

const FEATURED_CATEGORY = "Consigliati";

const DEMO_SLUG = "demo-restaurant";
const DEMO_TABLE_TOKEN = "demo-table-1";

const DEMO_MENU_ITEMS = [
  {
    id: "demo-antipasto-1",
    nome: "Tagliere della casa",
    ingredienti: "Salumi, formaggi, focaccia calda e confettura",
    prezzo: 12,
    categoria: "Antipasti",
    categoriaBackend: "Antipasti",
    preparationArea: "kitchen",
    isFeatured: true,
    allergens: ["glutine", "lattosio"],
    img: "",
  },
  {
    id: "demo-primo-1",
    nome: "Carbonara",
    ingredienti: "Guanciale croccante, pecorino romano, uovo e pepe",
    prezzo: 12,
    categoria: "Primi",
    categoriaBackend: "Primi",
    preparationArea: "kitchen",
    isFeatured: true,
    allergens: ["glutine", "uova", "lattosio"],
    img: "",
  },
  {
    id: "demo-secondo-1",
    nome: "Burger EasyMenu",
    ingredienti: "Pane artigianale, manzo, cheddar, bacon e salsa della casa",
    prezzo: 15,
    categoria: "Secondi",
    categoriaBackend: "Secondi",
    preparationArea: "kitchen",
    isFeatured: false,
    allergens: ["glutine", "lattosio"],
    img: "",
  },
  {
    id: "demo-dolce-1",
    nome: "Tiramisù",
    ingredienti: "Mascarpone, caffè espresso e cacao",
    prezzo: 6,
    categoria: "Dolci",
    categoriaBackend: "Dolci",
    preparationArea: "kitchen",
    isFeatured: true,
    allergens: ["uova", "lattosio"],
    img: "",
  },
  {
    id: "demo-bevanda-1",
    nome: "Acqua frizzante",
    ingredienti: "Bottiglia 75cl",
    prezzo: 2,
    categoria: "Bevande",
    categoriaBackend: "Bevande",
    preparationArea: "bar",
    isFeatured: false,
    allergens: [],
    img: "",
  },
  {
    id: "demo-bevanda-2",
    nome: "Spritz",
    ingredienti: "Aperol, prosecco, soda e arancia",
    prezzo: 7,
    categoria: "Bevande",
    categoriaBackend: "Bevande",
    preparationArea: "bar",
    isFeatured: true,
    allergens: [],
    img: "",
  },
];

function normalizeCategorieOrdine(list) {
  return [...new Set((list || []).map((x) => String(x || "").trim()).filter(Boolean))];
}

function getOrderedCategories(menu, ordineCategorie) {
  const presentiNelMenu = [
    ...new Set(menu.map((p) => String(p.categoria || "").trim()).filter(Boolean)),
  ];
  const ordinePulito = normalizeCategorieOrdine(ordineCategorie);

  const ordinate = ordinePulito.filter((cat) => presentiNelMenu.includes(cat));
  const restanti = presentiNelMenu.filter((cat) => !ordinate.includes(cat));

  const base = [...ordinate, ...restanti];
  const hasFeatured = menu.some((p) => p.isFeatured);
  if (!hasFeatured || base.includes(FEATURED_CATEGORY)) return base;
  return [FEATURED_CATEGORY, ...base];
}

function mapBackendStatusToUi(status, items = []) {
  if (!status) {
    return {
      label: "Nessun ordine attivo",
      bg: "linear-gradient(135deg, #64748b 0%, #475569 100%)",
      detail: "Non ci sono ordini in lavorazione per questo tavolo.",
    };
  }

  if (status === "pending") {
    return {
      label: "Ordine ricevuto",
      bg: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
      detail: "L’ordine è stato inviato correttamente.",
    };
  }

  if (status === "in_progress") {
    return {
      label: "In preparazione",
      bg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
      detail: "La cucina sta lavorando sull’ordine.",
    };
  }

  if (status === "ready") {
    return {
      label: "Pronto",
      bg: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
      detail: "Il tavolo può essere servito.",
    };
  }

  if (status === "served") {
    return {
      label: "Servito",
      bg: "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
      detail: "L’ordine è stato servito.",
    };
  }

  if (status === "cancelled") {
    return {
      label: "Annullato",
      bg: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
      detail: "L’ordine è stato annullato.",
    };
  }

  const piattiCucina = items.filter(
    (p) => (p.preparationArea || "").toLowerCase().trim() !== "bar"
  );

  if (items.length > 0 && piattiCucina.length === 0) {
    return {
      label: "Solo bevande",
      bg: "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
      detail: "Ordine attivo senza passaggi cucina.",
    };
  }

  return {
    label: "Attivo",
    bg: "linear-gradient(135deg, #475569 0%, #334155 100%)",
    detail: "Ordine attualmente aperto.",
  };
}

function ProductSheet({
  piatto,
  qtyDraft,
  setQtyDraft,
  servizioDraft,
  setServizioDraft,
  onClose,
  onConfirm,
}) {
  if (!piatto) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.42)",
        zIndex: 2000,
        display: "flex",
        alignItems: "flex-end",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 620,
          margin: "0 auto",
          background: "rgba(255,255,255,0.98)",
          borderTopLeftRadius: 30,
          borderTopRightRadius: 30,
          padding: 18,
          boxShadow: "0 -18px 40px rgba(18,59,107,0.18)",
          border: "1px solid rgba(255,255,255,0.78)",
        }}
      >
        <div
          style={{
            width: 56,
            height: 6,
            borderRadius: 999,
            background: "#cbd5e1",
            margin: "0 auto 16px auto",
          }}
        />

        <img
          src={piatto.img || placeholderFood}
          alt={piatto.nome}
          style={{
            width: "100%",
            height: 230,
            objectFit: "cover",
            borderRadius: 22,
          }}
        />

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#0b2e59" }}>
            {piatto.nome}
          </div>

          {piatto.ingredienti ? (
            <div style={{ marginTop: 8, color: "#5a7497", lineHeight: 1.5 }}>
              {piatto.ingredienti}
            </div>
          ) : null}

          {Array.isArray(piatto.allergens) && piatto.allergens.length > 0 ? (
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {piatto.allergens.map((allergen) => (
                <span
                  key={allergen}
                  style={{
                    borderRadius: 999,
                    padding: "6px 10px",
                    background: "#fff7ed",
                    color: "#9a3412",
                    fontWeight: 800,
                    fontSize: 12,
                  }}
                >
                  {allergen}
                </span>
              ))}
            </div>
          ) : null}

          <div style={{ marginTop: 12, fontSize: 23, fontWeight: 900, color: "#123b6b" }}>
            € {formatEuro(piatto.prezzo)}
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            background: "#f4f9ff",
            borderRadius: 18,
            padding: 14,
            border: "1px solid #dbe7f5",
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 10, color: "#123b6b" }}>
            Quando portarlo?
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => setServizioDraft("subito")}
              style={{
                border: "none",
                borderRadius: 999,
                padding: "10px 16px",
                background:
                  servizioDraft === "subito"
                    ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)"
                    : "#e2e8f0",
                color: servizioDraft === "subito" ? "white" : "#123b6b",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Porta subito
            </button>

            <button
              onClick={() => setServizioDraft("dopo")}
              style={{
                border: "none",
                borderRadius: 999,
                padding: "10px 16px",
                background:
                  servizioDraft === "dopo"
                    ? "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)"
                    : "#e2e8f0",
                color: servizioDraft === "dopo" ? "white" : "#123b6b",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Porta dopo
            </button>
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "#eef6ff",
              borderRadius: 999,
              padding: "8px 12px",
              border: "1px solid #d8e7fa",
            }}
          >
            <button
              onClick={() => setQtyDraft(Math.max(1, qtyDraft - 1))}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: "none",
                background: "white",
                fontSize: 20,
                fontWeight: 700,
                cursor: "pointer",
                color: "#123b6b",
              }}
            >
              −
            </button>

            <div style={{ minWidth: 28, textAlign: "center", fontWeight: 900, fontSize: 18 }}>
              {qtyDraft}
            </div>

            <button
              onClick={() => setQtyDraft(qtyDraft + 1)}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: "none",
                background: "white",
                fontSize: 20,
                fontWeight: 700,
                cursor: "pointer",
                color: "#123b6b",
              }}
            >
              +
            </button>
          </div>

          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              border: "none",
              borderRadius: 18,
              padding: "16px 18px",
              background: "linear-gradient(135deg, #123b6b 0%, #2563eb 100%)",
              color: "white",
              fontWeight: 900,
              fontSize: 16,
              cursor: "pointer",
              boxShadow: "0 14px 24px rgba(37,99,235,0.20)",
            }}
          >
            Aggiungi · € {formatEuro(parsePrezzo(piatto.prezzo) * qtyDraft)}
          </button>
        </div>
      </div>
    </div>
  );
}

function Cliente() {
  const { slug: slugParam, tableToken: tableTokenParam, tavolo: tavoloParam } = useParams();

  const params = new URLSearchParams(window.location.search);

  const slug =
    slugParam ||
    params.get("slug") ||
    params.get("restaurantSlug") ||
    localStorage.getItem("restaurant_slug") ||
    "";

  const tableToken =
    tableTokenParam ||
    params.get("token") ||
    params.get("tableToken") ||
    (slugParam && tavoloParam ? tavoloParam : "") ||
    "";

  const tavoloFallback = tavoloParam || params.get("tavolo") || "1";
  const tavolo = tavoloFallback;

  const activeSlug = slug || DEMO_SLUG;
  const activeTableToken = tableToken || DEMO_TABLE_TOKEN;
  const isDemoMode = activeSlug === DEMO_SLUG && activeTableToken === DEMO_TABLE_TOKEN;

  const [menu, setMenu] = useState([]);
  const [ordineCategorie, setOrdineCategorie] = useState([]);
  const [categoria, setCategoria] = useState("Primi");
  const [selezionati, setSelezionati] = useState([]);
  const [nota, setNota] = useState("");
  const [ordineInviato, setOrdineInviato] = useState(null);
  const [ordineAttivo, setOrdineAttivo] = useState(null);
  const [logoRistorante, setLogoRistorante] = useState("");
  const [sfondoMenu] = useState(
    "linear-gradient(180deg, #eef6ff 0%, #e4f0ff 34%, #edf6ff 100%)"
  );
  const [ricerca, setRicerca] = useState("");
  const [sheetPiatto, setSheetPiatto] = useState(null);
  const [qtyDraft, setQtyDraft] = useState(1);
  const [servizioDraft, setServizioDraft] = useState("subito");
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState("");
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [sending, setSending] = useState(false);
  const [richiestaConto, setRichiestaConto] = useState({
    loading: false,
    inviata: false,
    errore: "",
  });
  const [richiestaCameriere, setRichiestaCameriere] = useState({
    loading: false,
    inviata: false,
    errore: "",
  });
  const [pagamento, setPagamento] = useState({
    loading: false,
    errore: "",
    splitCount: 1,
    summary: null,
    copiedLink: "",
  });

  const tavoloVisuale =
    ordineAttivo?.table?.name ||
    ordineAttivo?.tableName ||
    ordineInviato?.tableName ||
    `Tavolo ${tavoloFallback}`;

  const ristoranteAttivo =
    ordineAttivo?.restaurantName ||
    ordineInviato?.restaurantName ||
    slug ||
    "Ristorante";

  useEffect(() => {
    async function caricaMenu() {
      try {
        setLoading(true);
        setErrore("");

        const response = await fetch(
          `${API_URL}/tables/public/${encodeURIComponent(activeSlug)}/${encodeURIComponent(activeTableToken)}`
        );

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          if (isDemoMode) {
            const categorieDemo = [...new Set(DEMO_MENU_ITEMS.map((p) => p.categoria).filter(Boolean))];
            setMenu(DEMO_MENU_ITEMS);
            setOrdineCategorie(categorieDemo);
            if (categorieDemo.length > 0) setCategoria(categorieDemo[0]);
            setLogoRistorante("");

            const carrelloSalvatoDemo = localStorage.getItem(carrelloKey(activeSlug, activeTableToken));
            if (carrelloSalvatoDemo) {
              try {
                const parsed = JSON.parse(carrelloSalvatoDemo);
                setSelezionati(Array.isArray(parsed) ? parsed : []);
              } catch {
                setSelezionati([]);
              }
            } else {
              setSelezionati([]);
            }

            const ordineConfermatoDemo = localStorage.getItem(
              ordineConfermatoKey(activeSlug, activeTableToken)
            );

            if (ordineConfermatoDemo) {
              try {
                const parsed = JSON.parse(ordineConfermatoDemo);
                setOrdineInviato(parsed);
              } catch {
                setOrdineInviato(null);
              }
            } else {
              setOrdineInviato(null);
            }

            return;
          }

          throw new Error(data?.message || "Errore nel caricamento del menu");
        }

        const items = Array.isArray(data?.items) ? data.items : [];

        const menuMapped = items.map((item) => ({
          id: item.id,
          nome: item.name,
          ingredienti: item.ingredients || item.description || item.shortDescription || "",
          prezzo: item.price,
          categoria: item.category || "Altro",
          categoriaBackend: item.category || "Altro",
          preparationArea: item.preparationArea,
          isFeatured: Boolean(item.isFeatured),
          allergens: Array.isArray(item.allergens) ? item.allergens : [],
          img: item.imageUrl || "",
        }));

        setMenu(menuMapped);

        const categorie = [...new Set(menuMapped.map((p) => p.categoria).filter(Boolean))];
        setOrdineCategorie(categorie);

        if (categorie.length > 0) {
          setCategoria(categorie[0]);
        }

        const carrelloSalvato = localStorage.getItem(carrelloKey(activeSlug, activeTableToken));
        if (carrelloSalvato) {
          try {
            const parsed = JSON.parse(carrelloSalvato);
            setSelezionati(Array.isArray(parsed) ? parsed : []);
          } catch {
            setSelezionati([]);
          }
        } else {
          setSelezionati([]);
        }

        const ordineConfermatoSalvato = localStorage.getItem(
          ordineConfermatoKey(activeSlug, activeTableToken)
        );

        if (ordineConfermatoSalvato) {
          try {
            const parsed = JSON.parse(ordineConfermatoSalvato);
            setOrdineInviato(parsed);
          } catch {
            setOrdineInviato(null);
          }
        } else {
          setOrdineInviato(null);
        }

        setLogoRistorante(data.restaurant?.logoUrl || "");
      } catch (err) {
        setErrore(err.message || "Errore nel caricamento del menu");
      } finally {
        setLoading(false);
      }
    }

    caricaMenu();
  }, [activeSlug, activeTableToken, isDemoMode]);

  useEffect(() => {
    if (!activeSlug || !activeTableToken) return;
    localStorage.setItem(carrelloKey(activeSlug, activeTableToken), JSON.stringify(selezionati));
  }, [selezionati, activeSlug, activeTableToken]);

  useEffect(() => {
    if (!activeSlug || !activeTableToken || !ordineInviato) return;

    let timer;

    const syncOrdineAttivo = async () => {
      try {
        const publicToken = ordineInviato.publicToken;
        const orderId = ordineInviato.id;

        const candidates = [
          publicToken ? `${API_URL}/orders/public/${encodeURIComponent(publicToken)}` : null,
          orderId ? `${API_URL}/orders/public/${encodeURIComponent(orderId)}` : null,
        ].filter(Boolean);

        for (const endpoint of candidates) {
          const response = await fetch(endpoint);
          const data = await response.json().catch(() => null);

          if (!response.ok || !data) {
            continue;
          }

          setOrdineAttivo({
            ...data,
            restaurantName: data.restaurantName || activeSlug,
          });

          if (["served", "cancelled"].includes(data.status)) {
            clearInterval(timer);
          }
          return;
        }
      } catch {
        // silenzioso
      }
    };

    syncOrdineAttivo();
    timer = setInterval(syncOrdineAttivo, 4000);

    return () => clearInterval(timer);
  }, [ordineInviato, activeSlug, activeTableToken]);

  useEffect(() => {
    const token = ordineAttivo?.publicToken || ordineInviato?.publicToken || ordineInviato?.id;
    if (!token) return;

    let active = true;

    async function syncPagamenti() {
      try {
        const response = await fetch(`${API_URL}/payments/public/${encodeURIComponent(token)}/summary`);
        const data = await response.json().catch(() => null);
        if (!response.ok || !data || !active) return;
        setPagamento((prev) => ({ ...prev, summary: data }));
      } catch {
        // Non blocco la pagina cliente se il modulo pagamenti non è raggiungibile.
      }
    }

    syncPagamenti();
    const timer = setInterval(syncPagamenti, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [ordineAttivo?.publicToken, ordineInviato?.publicToken, ordineInviato?.id]);

  const categorieDisponibili = useMemo(() => {
    return getOrderedCategories(menu, ordineCategorie);
  }, [menu, ordineCategorie]);

  useEffect(() => {
    if (!categorieDisponibili.includes(categoria) && categorieDisponibili.length > 0) {
      setCategoria(categorieDisponibili[0]);
    }
  }, [categorieDisponibili, categoria]);

  function aggiungiPiattoCustom(piatto, qty, servizio) {
    const esiste = selezionati.find(
      (x) => x.id === piatto.id && x.categoria === piatto.categoria && x.servizio === servizio
    );

    if (esiste) {
      setSelezionati(
        selezionati.map((x) =>
          x.id === piatto.id && x.categoria === piatto.categoria && x.servizio === servizio
            ? { ...x, qty: x.qty + qty }
            : x
        )
      );
    } else {
      setSelezionati([
        ...selezionati,
        {
          id: piatto.id,
          nome: piatto.nome,
          prezzo: parsePrezzo(piatto.prezzo),
          qty,
          servizio,
          categoria: piatto.categoria,
          preparationArea: piatto.preparationArea,
        },
      ]);
    }
  }

  function riduciPiatto(id, categoriaPiatto, servizio) {
    const esiste = selezionati.find(
      (x) => x.id === id && x.categoria === categoriaPiatto && x.servizio === servizio
    );

    if (!esiste) return;

    if (esiste.qty === 1) {
      setSelezionati(
        selezionati.filter(
          (x) => !(x.id === id && x.categoria === categoriaPiatto && x.servizio === servizio)
        )
      );
    } else {
      setSelezionati(
        selezionati.map((x) =>
          x.id === id && x.categoria === categoriaPiatto && x.servizio === servizio
            ? { ...x, qty: x.qty - 1 }
            : x
        )
      );
    }
  }

  function cambiaServizio(id, categoriaPiatto, servizioPrecedente, servizioNuovo) {
    const item = selezionati.find(
      (x) => x.id === id && x.categoria === categoriaPiatto && x.servizio === servizioPrecedente
    );

    if (!item) return;

    const senzaOriginale = selezionati.filter(
      (x) => !(x.id === id && x.categoria === categoriaPiatto && x.servizio === servizioPrecedente)
    );

    const giaEsistente = senzaOriginale.find(
      (x) => x.id === id && x.categoria === categoriaPiatto && x.servizio === servizioNuovo
    );

    if (giaEsistente) {
      setSelezionati(
        senzaOriginale.map((x) =>
          x.id === id && x.categoria === categoriaPiatto && x.servizio === servizioNuovo
            ? { ...x, qty: x.qty + item.qty }
            : x
        )
      );
      return;
    }

    setSelezionati([
      ...senzaOriginale,
      {
        ...item,
        servizio: servizioNuovo,
      },
    ]);
  }

  function svuotaOrdine() {
    setSelezionati([]);
    setNota("");
  }

  function totale() {
    return selezionati.reduce((acc, p) => acc + parsePrezzo(p.prezzo) * Number(p.qty || 0), 0);
  }

  function totalePezzi() {
    return selezionati.reduce((acc, p) => acc + Number(p.qty || 0), 0);
  }

  function apriSchedaPiatto(piatto) {
    setSheetPiatto(piatto);
    setQtyDraft(1);
    setServizioDraft("subito");
  }

  function confermaDaScheda() {
    if (!sheetPiatto) return;
    aggiungiPiattoCustom(sheetPiatto, qtyDraft, servizioDraft);
    setSheetPiatto(null);
    setQtyDraft(1);
    setServizioDraft("subito");
  }

  async function ordina() {
    if (!ristoranteAttivo || selezionati.length === 0 || sending) return;

    try {
      setSending(true);

      const paramsOrdine = new URLSearchParams(window.location.search);

      const restaurantSlug =
        paramsOrdine.get("slug") ||
        paramsOrdine.get("restaurantSlug") ||
        activeSlug ||
        DEMO_SLUG;

      const tableTokenFinal =
        paramsOrdine.get("token") ||
        paramsOrdine.get("tableToken") ||
        activeTableToken ||
        DEMO_TABLE_TOKEN;

      const itemsPayload = selezionati.map((p) => {
        const menuItemMatch = menu.find((m) => m.id === p.id);

        return {
          menuItemId: menuItemMatch?.id,
          quantity: Number(p.qty || 0),
          notes: p.servizio === "dopo" ? "porta dopo" : "porta subito",
        };
      });

      const validItemsPayload = itemsPayload.filter(
        (item) => item.menuItemId && item.quantity > 0
      );

      let backendOrder = null;

      if (restaurantSlug && tableTokenFinal && validItemsPayload.length > 0) {
        const clientRequestId = `${restaurantSlug}:${tableTokenFinal}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
        const response = await fetch(`${API_URL}/orders/public`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurantSlug,
            tableToken: tableTokenFinal,
            customerName: "",
            notes: nota.trim(),
            clientRequestId,
            items: validItemsPayload,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message || "Errore creazione ordine backend");
        }

        backendOrder = data.order || data;
      }

      const key = ordiniKey(ristoranteAttivo);
      const ordini = JSON.parse(localStorage.getItem(key) || "[]");
      const ordineEsistente = ordini.find((o) => String(o.tavolo) === String(tavolo));

      const nuoviPiatti = selezionati.map((p) => ({
        nome: p.nome,
        prezzo: parsePrezzo(p.prezzo),
        qty: Number(p.qty || 0),
        stato: "nuovo",
        servizio: p.servizio || "subito",
        categoria: p.categoria || "",
        preparationArea: p.preparationArea || "",
      }));

      if (ordineEsistente) {
        nuoviPiatti.forEach((nuovoPiatto) => {
          const trovato = ordineEsistente.piatti.find(
            (piatto) =>
              piatto.nome === nuovoPiatto.nome &&
              piatto.servizio === nuovoPiatto.servizio &&
              piatto.categoria === nuovoPiatto.categoria &&
              piatto.stato !== "pronto"
          );

          if (trovato) {
            trovato.qty += nuovoPiatto.qty;
          } else {
            ordineEsistente.piatti.push(nuovoPiatto);
          }
        });

        if (nota.trim()) {
          ordineEsistente.nota = ordineEsistente.nota
            ? `${ordineEsistente.nota} | ${nota.trim()}`
            : nota.trim();
        }

        ordineEsistente.time = Date.now();
        ordineEsistente.stato = "aperto";

        if (backendOrder?.id) {
          ordineEsistente.backendId = backendOrder.id;
        }
      } else {
        ordini.push({
          tavolo: String(tavolo),
          piatti: nuoviPiatti,
          nota: nota.trim(),
          time: Date.now(),
          stato: "aperto",
          backendId: backendOrder?.id || null,
          publicToken: backendOrder?.publicToken || null,
        });
      }

      localStorage.setItem(key, JSON.stringify(ordini));

      const riepilogo = {
        id: backendOrder?.id || null,
        publicToken: backendOrder?.publicToken || null,
        tavolo,
        tableName:
          backendOrder?.table?.name ||
          backendOrder?.tableName ||
          `Tavolo ${tavolo}`,
        restaurantName:
          backendOrder?.restaurantName ||
          backendOrder?.restaurant?.name ||
          ristoranteAttivo,
        piatti: selezionati,
        nota: nota.trim(),
        totale: formatEuro(totale()),
        pezzi: totalePezzi(),
        timestamp: Date.now(),
        backendId: backendOrder?.id || null,
      };

      setOrdineInviato(riepilogo);

      localStorage.setItem(
        ordineConfermatoKey(activeSlug, activeTableToken),
        JSON.stringify(riepilogo)
      );

      setSelezionati([]);
      setNota("");
      localStorage.removeItem(carrelloKey(activeSlug, activeTableToken));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Errore invio ordine:", error);
      setFeedback({ type: "error", text: error.message || "Errore durante l'invio dell'ordine" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSending(false);
    }
  }


  async function inviaRichiestaCliente(tipo) {
    const token = ordineAttivo?.publicToken || ordineInviato?.publicToken || ordineInviato?.id;
    const isConto = tipo === "conto";
    const current = isConto ? richiestaConto : richiestaCameriere;

    if (!token || current.loading) return;

    const setter = isConto ? setRichiestaConto : setRichiestaCameriere;
    const endpoint = isConto ? "request-bill" : "call-staff";
    const defaultError = isConto
      ? "Impossibile inviare la richiesta conto"
      : "Impossibile chiamare il cameriere";

    try {
      setter({ loading: true, inviata: false, errore: "" });

      const response = await fetch(
        `${API_URL}/orders/public/${encodeURIComponent(token)}/${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: isConto ? "conto" : "assistenza al tavolo" }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || defaultError);
      }

      setter({ loading: false, inviata: true, errore: "" });
    } catch (error) {
      setter({
        loading: false,
        inviata: false,
        errore: error.message || defaultError,
      });
    }
  }

  async function creaCheckoutPagamento(payerIndex = 1) {
    const token = ordineAttivo?.publicToken || ordineInviato?.publicToken || ordineInviato?.id;
    if (!token) throw new Error("Ordine non ancora disponibile per il pagamento");

    const response = await fetch(`${API_URL}/payments/public/${encodeURIComponent(token)}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        splitCount: pagamento.splitCount,
        payerIndex,
      }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message || "Impossibile avviare il pagamento");
    if (!data?.checkoutUrl) throw new Error("Checkout Stripe non disponibile");
    return data.checkoutUrl;
  }

  async function pagaOnline() {
    if (pagamento.loading) return;

    try {
      setPagamento((prev) => ({ ...prev, loading: true, errore: "", copiedLink: "" }));
      const checkoutUrl = await creaCheckoutPagamento(1);
      window.location.href = checkoutUrl;
    } catch (error) {
      setPagamento((prev) => ({
        ...prev,
        loading: false,
        errore: error.message || "Errore durante apertura pagamento",
      }));
    }
  }

  async function copiaLinkQuota(payerIndex) {
    if (pagamento.loading) return;

    try {
      setPagamento((prev) => ({ ...prev, loading: true, errore: "", copiedLink: "" }));
      const checkoutUrl = await creaCheckoutPagamento(payerIndex);
      await navigator.clipboard.writeText(checkoutUrl);
      setPagamento((prev) => ({ ...prev, loading: false, copiedLink: `Quota ${payerIndex} copiata` }));
    } catch (error) {
      setPagamento((prev) => ({
        ...prev,
        loading: false,
        errore: error.message || "Impossibile copiare il link quota",
      }));
    }
  }

  function richiediConto() {
    return inviaRichiestaCliente("conto");
  }

  function chiamaCameriere() {
    return inviaRichiestaCliente("cameriere");
  }

  const piatti = menu.filter((p) => {
    const stessaCategoria = categoria === FEATURED_CATEGORY ? p.isFeatured : p.categoria === categoria;
    const matchRicerca =
      ricerca.trim() === "" ||
      (p.nome || "").toLowerCase().includes(ricerca.toLowerCase()) ||
      (p.ingredienti || "").toLowerCase().includes(ricerca.toLowerCase()) ||
      (Array.isArray(p.allergens) ? p.allergens.join(" ") : "").toLowerCase().includes(ricerca.toLowerCase());

    return stessaCategoria && matchRicerca;
  });

  const piattiSubito = selezionati.filter((p) => p.servizio === "subito");
  const piattiDopo = selezionati.filter((p) => p.servizio === "dopo");
  const statoOrdine = mapBackendStatusToUi(ordineAttivo?.status, ordineAttivo?.items || []);
  const totalePagamento = pagamento.summary?.totalAmount ?? parsePrezzo(ordineInviato?.totale);
  const residuoPagamento = pagamento.summary?.remainingAmount ?? totalePagamento;
  const giaPagatoOnline = pagamento.summary?.paymentStatus === "paid" || residuoPagamento <= 0.01;
  const paymentResult = params.get("payment");

  const suggerimentiUpsell = useMemo(() => {
    const selezionatiIds = new Set(selezionati.map((item) => item.id));
    const categorieCarrello = selezionati.map((item) => String(item.categoria || "").toLowerCase());
    const haBevande = categorieCarrello.some((cat) => cat.includes("bev") || cat.includes("drink") || cat.includes("vino") || cat.includes("bar"));
    const haDolce = categorieCarrello.some((cat) => cat.includes("dolc") || cat.includes("dessert"));

    return menu
      .filter((item) => !selezionatiIds.has(item.id))
      .filter((item) => {
        const cat = String(item.categoria || "").toLowerCase();
        if (!haBevande && (cat.includes("bev") || cat.includes("drink") || cat.includes("vino") || cat.includes("bar"))) return true;
        if (!haDolce && (cat.includes("dolc") || cat.includes("dessert"))) return true;
        return false;
      })
      .slice(0, 3);
  }, [menu, selezionati]);

  if (loading) {
    return (
      <div>
        <Navbar />
        <div style={{ maxWidth: 700, margin: "30px auto", padding: 20 }}>
          <div className="section-card" style={{ background: "rgba(255,255,255,0.94)" }}>
            <h1 style={{ color: "#0b2e59" }}>Caricamento menu...</h1>
          </div>
        </div>
      </div>
    );
  }

  if (errore && menu.length === 0) {
    return (
      <div>
        <Navbar />
        <div style={{ maxWidth: 700, margin: "30px auto", padding: 20 }}>
          <div className="section-card" style={{ background: "rgba(255,255,255,0.94)" }}>
            <h1 style={{ color: "#0b2e59" }}>Errore</h1>
            <p>{errore}</p>
            <p>Apri il menu da un QR valido.</p>
          </div>
        </div>
      </div>
    );
  }

  if (ordineInviato) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(180deg, #edf6ff 0%, #e4f0ff 36%, #f4f9ff 100%)",
        }}
      >
        <Navbar />
        <div style={{ maxWidth: 760, margin: "30px auto", padding: 20 }}>
          <div
            className="section-card"
            style={{
              background: "rgba(255,255,255,0.96)",
            }}
          >
            <h1 style={{ color: "#2563eb" }}>Ordine confermato</h1>
            {paymentResult === "success" ? (
              <div style={{ marginBottom: 14, background: "#ecfdf5", color: "#166534", border: "1px solid #bbf7d0", borderRadius: 14, padding: 12, fontWeight: 900 }}>
                Pagamento ricevuto. Grazie!
              </div>
            ) : paymentResult === "cancelled" ? (
              <div style={{ marginBottom: 14, background: "#fff7ed", color: "#9a3412", border: "1px solid #fed7aa", borderRadius: 14, padding: 12, fontWeight: 900 }}>
                Pagamento annullato. Puoi riprovare quando vuoi.
              </div>
            ) : null}
            <p>
              Il tuo ordine per il tavolo <b>{ordineInviato.tavolo}</b> è arrivato correttamente.
            </p>
            <p>
              Totale articoli: <b>{ordineInviato.pezzi}</b>
            </p>

            <div
              style={{
                marginTop: 18,
                background: statoOrdine.bg,
                color: "white",
                borderRadius: 18,
                padding: 16,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 18 }}>{statoOrdine.label}</div>
              <div style={{ marginTop: 6, opacity: 0.95 }}>{statoOrdine.detail}</div>
            </div>

            <div
              style={{
                marginTop: 18,
                background: giaPagatoOnline ? "#ecfdf5" : "#f8fafc",
                border: giaPagatoOnline ? "1px solid #bbf7d0" : "1px solid #dbe7f5",
                borderRadius: 18,
                padding: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 900, color: giaPagatoOnline ? "#166534" : "#123b6b" }}>
                    {giaPagatoOnline ? "Pagamento completato" : "Paga online dal tavolo"}
                  </div>
                  <div style={{ marginTop: 4, color: "#64748b" }}>
                    Totale € {formatEuro(totalePagamento)} · Residuo € {formatEuro(residuoPagamento)}
                  </div>
                </div>

                {!giaPagatoOnline ? (
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <label style={{ fontWeight: 800, color: "#123b6b" }}>
                      Dividi in
                      <select
                        value={pagamento.splitCount}
                        onChange={(event) => setPagamento((prev) => ({ ...prev, splitCount: Number(event.target.value) }))}
                        style={{ marginLeft: 8, borderRadius: 10, padding: "8px 10px", border: "1px solid #cbd5e1" }}
                      >
                        {[1, 2, 3, 4, 5, 6, 8, 10].map((value) => (
                          <option key={value} value={value}>{value}</option>
                        ))}
                      </select>
                    </label>
                    <button
                      onClick={pagaOnline}
                      disabled={pagamento.loading || !(ordineAttivo?.publicToken || ordineInviato?.publicToken || ordineInviato?.id)}
                      style={{
                        border: "none",
                        borderRadius: 12,
                        padding: "12px 18px",
                        background: pagamento.loading ? "#94a3b8" : "linear-gradient(135deg, #0f172a 0%, #2563eb 100%)",
                        color: "white",
                        fontWeight: 900,
                        cursor: pagamento.loading ? "not-allowed" : "pointer",
                      }}
                    >
                      {pagamento.loading ? "Apertura Stripe..." : `Paga € ${formatEuro(residuoPagamento / Math.max(1, pagamento.splitCount))}`}
                    </button>
                  </div>
                ) : null}
              </div>
              {pagamento.errore ? (
                <div style={{ marginTop: 10, color: "#991b1b", fontWeight: 800 }}>{pagamento.errore}</div>
              ) : null}
              {pagamento.copiedLink ? (
                <div style={{ marginTop: 10, color: "#166534", fontWeight: 900 }}>{pagamento.copiedLink}</div>
              ) : null}
              {!giaPagatoOnline && pagamento.splitCount > 1 ? (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 900, color: "#123b6b", marginBottom: 8 }}>Link quota da condividere</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {Array.from({ length: pagamento.splitCount }).map((_, index) => (
                      <button
                        key={`quota-${index + 1}`}
                        onClick={() => copiaLinkQuota(index + 1)}
                        disabled={pagamento.loading}
                        style={{ border: "1px solid #cbd5e1", background: "white", borderRadius: 999, padding: "8px 12px", fontWeight: 800, cursor: pagamento.loading ? "not-allowed" : "pointer", color: "#123b6b" }}
                      >
                        Copia quota {index + 1}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div
              style={{
                marginTop: 18,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <div style={{ background: "#eff6ff", padding: 14, borderRadius: 14 }}>
                <h4 style={{ color: "#123b6b" }}>Da portare subito</h4>
                {ordineInviato.piatti.filter((p) => p.servizio === "subito").length === 0 ? (
                  <p>Nessun piatto.</p>
                ) : (
                  ordineInviato.piatti
                    .filter((p) => p.servizio === "subito")
                    .map((p, index) => (
                      <div key={`subito-${p.nome}-${p.categoria}-${p.servizio}-${index}`}>
                        {p.nome} x{p.qty}
                      </div>
                    ))
                )}
              </div>

              <div style={{ background: "#f5f3ff", padding: 14, borderRadius: 14 }}>
                <h4 style={{ color: "#4c1d95" }}>Da portare dopo</h4>
                {ordineInviato.piatti.filter((p) => p.servizio === "dopo").length === 0 ? (
                  <p>Nessun piatto.</p>
                ) : (
                  ordineInviato.piatti
                    .filter((p) => p.servizio === "dopo")
                    .map((p, index) => (
                      <div key={`dopo-${p.nome}-${p.categoria}-${p.servizio}-${index}`}>
                        {p.nome} x{p.qty}
                      </div>
                    ))
                )}
              </div>
            </div>

            {ordineInviato.nota ? (
              <div
                style={{
                  marginTop: 16,
                  background: "#eff6ff",
                  padding: 12,
                  borderRadius: 12,
                }}
              >
                <b>Nota:</b> {ordineInviato.nota}
              </div>
            ) : null}

            <h3 style={{ marginTop: 20, color: "#123b6b" }}>Totale € {ordineInviato.totale}</h3>

            {(ordineAttivo?.publicToken || ordineInviato?.publicToken || ordineInviato?.id) ? (
              <a href={`${API_URL}/payments/public/${encodeURIComponent(ordineAttivo?.publicToken || ordineInviato?.publicToken || ordineInviato?.id)}/receipt`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", marginTop: 8, textDecoration: "none", borderRadius: 999, padding: "10px 14px", background: "#f8fafc", border: "1px solid #cbd5e1", color: "#123b6b", fontWeight: 900 }}>Apri ricevuta / preconto</a>
            ) : null}

            <div
              style={{
                marginTop: 14,
                background: richiestaConto.inviata ? "#ecfdf5" : "#f8fafc",
                border: richiestaConto.inviata ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                color: richiestaConto.inviata ? "#166534" : "#334155",
                borderRadius: 14,
                padding: 14,
              }}
            >
              {richiestaConto.inviata ? (
                <b>Richiesta conto inviata alla cassa.</b>
              ) : (
                <span>Quando hai finito puoi richiedere il conto direttamente da qui.</span>
              )}

              {richiestaConto.errore ? (
                <div style={{ marginTop: 8, color: "#991b1b", fontWeight: 800 }}>
                  {richiestaConto.errore}
                </div>
              ) : null}
            </div>

            <div
              style={{
                marginTop: 12,
                background: richiestaCameriere.inviata ? "#eff6ff" : "#fff7ed",
                border: richiestaCameriere.inviata ? "1px solid #bfdbfe" : "1px solid #fed7aa",
                color: richiestaCameriere.inviata ? "#1d4ed8" : "#9a3412",
                borderRadius: 14,
                padding: 14,
              }}
            >
              {richiestaCameriere.inviata ? (
                <b>Richiesta cameriere inviata allo staff.</b>
              ) : (
                <span>Hai bisogno di acqua, pane o assistenza? Chiama il cameriere senza alzarti.</span>
              )}

              {richiestaCameriere.errore ? (
                <div style={{ marginTop: 8, color: "#991b1b", fontWeight: 800 }}>
                  {richiestaCameriere.errore}
                </div>
              ) : null}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
              <button
                onClick={chiamaCameriere}
                disabled={
                  richiestaCameriere.loading ||
                  richiestaCameriere.inviata ||
                  !(ordineAttivo?.publicToken || ordineInviato?.publicToken || ordineInviato?.id)
                }
                style={{
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 18px",
                  background:
                    richiestaCameriere.loading || richiestaCameriere.inviata
                      ? "#94a3b8"
                      : "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                  color: "white",
                  fontWeight: 900,
                  cursor:
                    richiestaCameriere.loading || richiestaCameriere.inviata
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {richiestaCameriere.loading
                  ? "Invio richiesta..."
                  : richiestaCameriere.inviata
                  ? "Cameriere chiamato"
                  : "Chiama cameriere"}
              </button>

              <button
                onClick={richiediConto}
                disabled={
                  richiestaConto.loading ||
                  richiestaConto.inviata ||
                  !(ordineAttivo?.publicToken || ordineInviato?.publicToken || ordineInviato?.id)
                }
                style={{
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 18px",
                  background:
                    richiestaConto.loading || richiestaConto.inviata
                      ? "#94a3b8"
                      : "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                  color: "white",
                  fontWeight: 900,
                  cursor: richiestaConto.loading || richiestaConto.inviata ? "not-allowed" : "pointer",
                }}
              >
                {richiestaConto.loading
                  ? "Invio richiesta..."
                  : richiestaConto.inviata
                  ? "Conto richiesto"
                  : "Richiedi conto"}
              </button>

              <button
                onClick={() => setOrdineInviato(null)}
                style={{
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 18px",
                  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                  color: "white",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Torna al menu
              </button>

              <button
                onClick={() => {
                  localStorage.removeItem(ordineConfermatoKey(activeSlug, activeTableToken));
                  setOrdineInviato(null);
                }}
                style={{
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 18px",
                  background: "linear-gradient(135deg, #123b6b 0%, #0891b2 100%)",
                  color: "white",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Continua ad ordinare
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `
          radial-gradient(circle at 10% 0%, rgba(37,99,235,0.12), transparent 22%),
          radial-gradient(circle at 100% 0%, rgba(14,165,233,0.10), transparent 22%),
          radial-gradient(circle at 50% 100%, rgba(16,185,129,0.06), transparent 22%),
          ${sfondoMenu}
        `,
      }}
    >
      <Navbar />

      <div
        className="app-shell"
        style={{ padding: "24px 16px 120px", maxWidth: 1180, margin: "0 auto" }}
      >
        {feedback.text ? (
          <div style={{ marginBottom: 14, borderRadius: 18, padding: 14, fontWeight: 900, background: feedback.type === "error" ? "#fef2f2" : "#ecfdf5", color: feedback.type === "error" ? "#991b1b" : "#166534", border: feedback.type === "error" ? "1px solid #fecaca" : "1px solid #bbf7d0" }}>
            {feedback.text}
          </div>
        ) : null}
        <div
          style={{
            marginBottom: 18,
            display: "grid",
            gridTemplateColumns: "1.15fr 0.85fr",
            gap: 18,
            alignItems: "stretch",
          }}
        >
          <div
            className="glass-hero"
            style={{
              padding: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
              {logoRistorante ? (
                <img
                  src={logoRistorante}
                  alt={ristoranteAttivo}
                  style={{
                    width: 84,
                    height: 84,
                    objectFit: "contain",
                    borderRadius: 18,
                    background: "white",
                    padding: 8,
                  }}
                />
              ) : null}

              <div>
                <h1 style={{ margin: 0, fontSize: 36 }}>{ristoranteAttivo}</h1>
                <p style={{ marginTop: 8, opacity: 0.95, fontSize: 16 }}>{tavoloVisuale}</p>
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 18,
                padding: 16,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 18 }}>Ordina dal tavolo in pochi secondi</div>
              <div style={{ marginTop: 6, opacity: 0.92, lineHeight: 1.6 }}>
                Seleziona i piatti, scegli se portarli subito o dopo e invia l’ordine direttamente a cucina e bar.
              </div>
            </div>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.90)",
              border: "1px solid rgba(255,255,255,0.78)",
              borderRadius: 28,
              padding: 20,
              boxShadow: "0 18px 34px rgba(18,59,107,0.10)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div
              style={{
                background: statoOrdine.bg,
                color: "white",
                borderRadius: 18,
                padding: 16,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 18 }}>{statoOrdine.label}</div>
              <div style={{ marginTop: 6, opacity: 0.94, fontSize: 14 }}>{statoOrdine.detail}</div>
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div
                style={{
                  background: "#eff6ff",
                  borderRadius: 16,
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 12, color: "#6480a6", fontWeight: 800 }}>Articoli</div>
                <div style={{ marginTop: 6, fontSize: 28, fontWeight: 900, color: "#123b6b" }}>
                  {totalePezzi()}
                </div>
              </div>

              <div
                style={{
                  background: "#ecfdf5",
                  borderRadius: 16,
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 12, color: "#64806a", fontWeight: 800 }}>Totale</div>
                <div style={{ marginTop: 6, fontSize: 28, fontWeight: 900, color: "#123b6b" }}>
                  € {formatEuro(totale())}
                </div>
              </div>
            </div>
          </div>
        </div>

        {errore ? (
          <div
            className="section-card"
            style={{
              marginBottom: 16,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
            }}
          >
            {errore}
          </div>
        ) : null}

        <div
          className="section-card"
          style={{
            marginBottom: 16,
            background: "rgba(255,255,255,0.92)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "nowrap",
                overflowX: "auto",
                paddingBottom: 6,
                maxWidth: "100%",
              }}
            >
              {categorieDisponibili.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoria(c)}
                  style={{
                    border: "none",
                    borderRadius: 999,
                    padding: "12px 18px",
                    background:
                      categoria === c
                        ? "linear-gradient(135deg, #123b6b 0%, #2563eb 100%)"
                        : "#ffffff",
                    color: categoria === c ? "white" : "#123b6b",
                    fontWeight: 900,
                    whiteSpace: "nowrap",
                    boxShadow:
                      categoria === c
                        ? "0 12px 20px rgba(37,99,235,0.18)"
                        : "0 8px 16px rgba(18,59,107,0.05)",
                    border: categoria === c ? "none" : "1px solid #dbe7f5",
                    cursor: "pointer",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Cerca un piatto..."
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              style={{
                minWidth: 240,
                flex: 1,
                maxWidth: 320,
                borderRadius: 14,
                border: "1px solid #d6e4f5",
                padding: "12px 14px",
                background: "white",
              }}
            />
          </div>
        </div>

        <div
          className="section-card"
          style={{
            paddingTop: 8,
            background: "rgba(255,255,255,0.92)",
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 10, color: "#0b2e59" }}>
            {categoria}
          </div>

          {piatti.length === 0 ? (
            <div style={{ color: "#6480a6" }}>Nessun piatto trovato.</div>
          ) : (
            piatti.map((p, i) => {
              const selezionato = selezionati.find(
                (x) => x.id === p.id && x.categoria === p.categoria
              );
              const quantitaTotalePiatto = selezionati
                .filter((x) => x.id === p.id && x.categoria === p.categoria)
                .reduce((acc, item) => acc + item.qty, 0);

              return (
                <div
                  key={`${p.id}-${i}`}
                  onClick={() => apriSchedaPiatto(p)}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 14,
                    padding: "14px 0",
                    borderBottom: i === piatti.length - 1 ? "none" : "1px solid #e8eef7",
                    cursor: "pointer",
                    alignItems: "center",
                  }}
                >
                  <img
                    src={p.img || placeholderFood}
                    alt={p.nome}
                    style={{
                      width: "clamp(72px, 22vw, 96px)",
                      height: "clamp(72px, 22vw, 96px)",
                      objectFit: "cover",
                      borderRadius: 18,
                      flexShrink: 0,
                      boxShadow: "0 12px 22px rgba(18,59,107,0.10)",
                    }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 900,
                        fontSize: "clamp(17px, 4.8vw, 19px)",
                        color: "#123b6b",
                        lineHeight: 1.2,
                      }}
                    >
                      {p.nome}
                    </div>

                    {p.ingredienti ? (
                      <div
                        style={{
                          marginTop: 6,
                          color: "#5a7497",
                          lineHeight: 1.45,
                          fontSize: 14,
                        }}
                      >
                        {p.ingredienti}
                      </div>
                    ) : null}

                    {(p.isFeatured || (Array.isArray(p.allergens) && p.allergens.length > 0)) ? (
                      <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {p.isFeatured ? (
                          <span
                            style={{
                              borderRadius: 999,
                              padding: "5px 9px",
                              background: "#ecfdf5",
                              color: "#047857",
                              fontWeight: 900,
                              fontSize: 12,
                            }}
                          >
                            Consigliato
                          </span>
                        ) : null}
                        {Array.isArray(p.allergens) ? p.allergens.slice(0, 3).map((allergen) => (
                          <span
                            key={allergen}
                            style={{
                              borderRadius: 999,
                              padding: "5px 9px",
                              background: "#fff7ed",
                              color: "#9a3412",
                              fontWeight: 800,
                              fontSize: 12,
                            }}
                          >
                            {allergen}
                          </span>
                        )) : null}
                      </div>
                    ) : null}

                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ fontWeight: 900, fontSize: 17, color: "#0b2e59" }}>
                        € {formatEuro(p.prezzo)}
                      </div>

                      {selezionato ? (
                        <div
                          style={{
                            background: "#dbeafe",
                            color: "#1d4ed8",
                            borderRadius: 999,
                            padding: "6px 10px",
                            fontWeight: 800,
                            fontSize: 13,
                          }}
                        >
                          Nel carrello: {quantitaTotalePiatto}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #123b6b 0%, #2563eb 100%)",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 24,
                      fontWeight: 700,
                      flexShrink: 0,
                      boxShadow: "0 12px 20px rgba(37,99,235,0.18)",
                    }}
                  >
                    +
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div
          id="riepilogo-ordine-anchor"
          className="section-card"
          style={{
            marginTop: 20,
            background: "rgba(255,255,255,0.94)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <h2 style={{ margin: 0, color: "#0b2e59" }}>Riepilogo ordine</h2>
            <div style={{ fontWeight: 900, color: "#6480a6" }}>{totalePezzi()} articoli</div>
          </div>

          {selezionati.length === 0 ? (
            <p>Nessun piatto selezionato.</p>
          ) : (
            selezionati.map((p, idx) => (
              <div
                key={`${p.id}-${p.categoria}-${p.servizio}-${idx}`}
                style={{
                  padding: "14px 0",
                  borderBottom: "1px solid #e8eef7",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 10,
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div style={{ color: "#123b6b" }}>
                      <b>{p.nome}</b> x{p.qty}
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        display: "inline-flex",
                        padding: "5px 10px",
                        borderRadius: 999,
                        background: p.servizio === "subito" ? "#dbeafe" : "#ede9fe",
                        color: p.servizio === "subito" ? "#1d4ed8" : "#6d28d9",
                        fontWeight: 800,
                        fontSize: 12,
                      }}
                    >
                      {p.servizio === "subito" ? "Porta subito" : "Porta dopo"}
                    </div>
                  </div>

                  <span style={{ fontWeight: 900, color: "#123b6b" }}>
                    € {formatEuro(parsePrezzo(p.prezzo) * p.qty)}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <button
                    onClick={() => riduciPiatto(p.id, p.categoria, p.servizio)}
                    style={{
                      border: "none",
                      borderRadius: 12,
                      padding: "8px 12px",
                      background: "#ef4444",
                      color: "white",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    −
                  </button>

                  <button
                    onClick={() =>
                      aggiungiPiattoCustom(
                        {
                          id: p.id,
                          nome: p.nome,
                          prezzo: p.prezzo,
                          categoria: p.categoria,
                          preparationArea: p.preparationArea,
                        },
                        1,
                        p.servizio
                      )
                    }
                    style={{
                      border: "none",
                      borderRadius: 12,
                      padding: "8px 12px",
                      background: "#16a34a",
                      color: "white",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    +
                  </button>

                  <button
                    onClick={() => cambiaServizio(p.id, p.categoria, p.servizio, "subito")}
                    style={{
                      border: "none",
                      borderRadius: 12,
                      padding: "8px 12px",
                      background:
                        p.servizio === "subito"
                          ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)"
                          : "#e5e7eb",
                      color: p.servizio === "subito" ? "white" : "#123b6b",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Porta subito
                  </button>

                  <button
                    onClick={() => cambiaServizio(p.id, p.categoria, p.servizio, "dopo")}
                    style={{
                      border: "none",
                      borderRadius: 12,
                      padding: "8px 12px",
                      background:
                        p.servizio === "dopo"
                          ? "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)"
                          : "#e5e7eb",
                      color: p.servizio === "dopo" ? "white" : "#123b6b",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Porta dopo
                  </button>
                </div>
              </div>
            ))
          )}

          {selezionati.length > 0 ? (
            <div
              style={{
                marginTop: 18,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <div style={{ background: "#eff6ff", padding: 14, borderRadius: 14 }}>
                <h4 style={{ color: "#123b6b" }}>Subito</h4>
                {piattiSubito.length === 0 ? (
                  <p>Nessun piatto.</p>
                ) : (
                  piattiSubito.map((p, idx) => (
                    <div key={`s-${p.id}-${p.servizio}-${idx}`}>
                      {p.nome} x{p.qty}
                    </div>
                  ))
                )}
              </div>

              <div style={{ background: "#f5f3ff", padding: 14, borderRadius: 14 }}>
                <h4 style={{ color: "#4c1d95" }}>Dopo</h4>
                {piattiDopo.length === 0 ? (
                  <p>Nessun piatto.</p>
                ) : (
                  piattiDopo.map((p, idx) => (
                    <div key={`d-${p.id}-${p.servizio}-${idx}`}>
                      {p.nome} x{p.qty}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}

          <textarea
            placeholder="Note per la cucina"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            style={{
              width: "100%",
              marginTop: 16,
              minHeight: 90,
              borderRadius: 14,
              border: "1px solid #d6e4f5",
              padding: 12,
              background: "white",
            }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
              marginTop: 16,
            }}
          >
            <h3 style={{ margin: 0, color: "#0b2e59" }}>Totale € {formatEuro(totale())}</h3>

            <button
              onClick={svuotaOrdine}
              style={{
                border: "none",
                borderRadius: 12,
                padding: "12px 16px",
                background: "#64748b",
                color: "white",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Svuota ordine
            </button>
          </div>

          <button
            onClick={ordina}
            disabled={sending}
            style={{
              width: "100%",
              border: "none",
              borderRadius: 16,
              padding: "15px 18px",
              background: "linear-gradient(135deg, #123b6b 0%, #2563eb 100%)",
              color: "white",
              fontWeight: 900,
              fontSize: 16,
              marginTop: 12,
              cursor: sending ? "not-allowed" : "pointer",
              opacity: sending ? 0.6 : 1,
              boxShadow: "0 16px 26px rgba(37,99,235,0.20)",
            }}
          >
            {sending ? "Invio in corso..." : "Invia ordine"}
          </button>
        </div>
      </div>

      {selezionati.length > 0 ? (
        <div
          style={{
            position: "fixed",
            left: 16,
            right: 16,
            bottom: 16,
            zIndex: 1200,
            maxWidth: 760,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(18,59,107,0.96) 0%, rgba(37,99,235,0.92) 100%)",
              color: "white",
              borderRadius: 22,
              padding: "14px 16px",
              boxShadow: "0 18px 34px rgba(18,59,107,0.22)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <div>
              <div style={{ fontWeight: 900 }}>{totalePezzi()} articoli nel carrello</div>
              <div style={{ opacity: 0.92 }}>Totale € {formatEuro(totale())}</div>
            </div>

            <button
              onClick={() => {
                const riepilogo = document.getElementById("riepilogo-ordine-anchor");
                if (riepilogo) riepilogo.scrollIntoView({ behavior: "smooth" });
              }}
              style={{
                border: "none",
                borderRadius: 14,
                padding: "12px 16px",
                background: "white",
                color: "#123b6b",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Vedi ordine
            </button>
          </div>
        </div>
      ) : null}

      <ProductSheet
        piatto={sheetPiatto}
        qtyDraft={qtyDraft}
        setQtyDraft={setQtyDraft}
        servizioDraft={servizioDraft}
        setServizioDraft={setServizioDraft}
        onClose={() => setSheetPiatto(null)}
        onConfirm={confermaDaScheda}
      />
    </div>
  );
}

export default Cliente;
