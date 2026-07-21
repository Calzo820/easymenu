import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  apiPost,
  getAuthToken,
  publicApiGet,
  publicApiPost,
  setAuthToken,
} from "../lib/api";

function getDashboardPathByRole(role) {
  const normalized = String(role || "").toLowerCase();

  if (normalized === "owner" || normalized === "admin") return "/dashboard";
  if (normalized === "kitchen") return "/cucina";
  if (normalized === "bar") return "/bar";
  if (normalized === "cashier") return "/cassa";

  return "/dashboard";
}

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errore, setErrore] = useState("");
  const [successo, setSuccesso] = useState("");
  const [avviso, setAvviso] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const emailValida = useMemo(() => {
    return /\S+@\S+\.\S+/.test(form.email.trim());
  }, [form.email]);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      // Non faccio redirect automatico forte qui,
      // così non ti incasino durante lo sviluppo.
      // Se vuoi, dopo possiamo validarlo con /auth/me.
    }

    let cancelled = false;
    async function wakeBackend() {
      try {
        await publicApiGet("/health", {}, { timeoutMs: 60000 });
        if (!cancelled) setAvviso("");
      } catch {
        if (!cancelled) {
          setAvviso("Sto preparando il server. Se Render era fermo, il primo accesso può richiedere 30-60 secondi.");
        }
      }
    }
    wakeBackend();

    return () => {
      cancelled = true;
    };
  }, []);

  function showError(error, fallback) {
    const message = error?.message || fallback || "Operazione non riuscita.";
    if (/server.*avviando|server in avvio|temporaneamente non disponibile|render|riprova tra qualche secondo/i.test(message)) {
      setErrore("");
      setAvviso("Il server si sta avviando. Attendi qualche secondo e riprova: non è un problema delle credenziali.");
      return;
    }
    setAvviso("");
    setErrore(message);
  }

  function updateField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errore) setErrore("");
    if (successo) setSuccesso("");
    if (avviso) setAvviso("");
  }

  async function loginWithCredentials(email, password) {
    try {
      setLoading(true);
      setAvviso("");

      const data = await apiPost("/auth/login", {
        email,
        password,
      });

      if (!data?.token) {
        throw new Error("Token non ricevuto dal server.");
      }

      setAuthToken(data.token);

      if (data.user) {
        localStorage.setItem("auth_user", JSON.stringify(data.user));
      }

      if (data.restaurant) {
        localStorage.setItem("auth_restaurant", JSON.stringify(data.restaurant));
        localStorage.setItem("ristorante_attivo", data.restaurant.name || "");
        localStorage.setItem("restaurant_slug", data.restaurant.slug || "");
        localStorage.setItem("restaurant_id", data.restaurant.id || "");
      } else {
        localStorage.removeItem("auth_restaurant");
        localStorage.removeItem("ristorante_attivo");
        localStorage.removeItem("restaurant_slug");
        localStorage.removeItem("restaurant_id");
      }

      setSuccesso("Login effettuato con successo.");

      const redirectPath = data?.user?.isSuperAdmin
        ? "/super-admin"
        : getDashboardPathByRole(data?.user?.role || "owner");

      setTimeout(() => {
        navigate(redirectPath);
      }, 500);
    } catch (error) {
      showError(error, "Errore durante il login.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setErrore("");
    setSuccesso("");
    setAvviso("");

    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!email || !password) {
      setErrore("Inserisci email e password.");
      return;
    }

    if (!emailValida) {
      setErrore("Inserisci un'email valida.");
      return;
    }

    if (password.length < 6) {
      setErrore("La password deve avere almeno 6 caratteri.");
      return;
    }

    await loginWithCredentials(email, password);
  }

  async function handleDemoLogin() {
    try {
      setDemoLoading(true);
      setErrore("");
      setAvviso("");
      setSuccesso("Preparo la demo completa: logo, tavoli, menu, ordini e storico...");
      await publicApiPost("/demo/ensure", {}, {}, { timeoutMs: 120000 });
      setForm({ email: "owner@demo.test", password: "EasyMenu2026!" });
      setSuccesso("Demo completa pronta. Accesso in corso...");
      await loginWithCredentials("owner@demo.test", "EasyMenu2026!");
    } catch (error) {
      showError(error, "Non sono riuscito a preparare la demo completa.");
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%)",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "28px 16px 40px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 0.9fr",
            gap: 22,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              padding: 30,
              borderRadius: 30,
              background: "#ffffff",
              border: "1px solid #e5edf8",
              boxShadow: "0 24px 60px rgba(15,23,42,0.08)",
              color: "#07111f",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderRadius: 999,
                background: "#eef6ff",
                color: "#123b6b",
                fontWeight: 800,
                marginBottom: 18,
              }}
            >
              Accesso staff
            </div>

            <h1 style={{ margin: 0, fontSize: 42, lineHeight: 1.08 }}>
              Entra nel tuo ristorante
            </h1>

            <p
              style={{
                marginTop: 14,
                maxWidth: 640,
                color: "#475569",
                lineHeight: 1.7,
                fontSize: 16,
              }}
            >
              Accedi alla dashboard, alla cucina, al bar o alla cassa con il tuo account.
              Il login salva il token automaticamente e collega il frontend al backend reale.
            </p>

            <div
              style={{
                marginTop: 22,
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <div
                style={{
                  background: "#f8fbff",
                  border: "1px solid #e5edf8",
                  borderRadius: 18,
                  padding: 16,
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 22 }}>QR</div>
                <div style={{ marginTop: 6, opacity: 0.92 }}>Ordini dal tavolo</div>
              </div>

              <div
                style={{
                  background: "#f8fbff",
                  border: "1px solid #e5edf8",
                  borderRadius: 18,
                  padding: 16,
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 22 }}>Kitchen</div>
                <div style={{ marginTop: 6, opacity: 0.92 }}>Stati ordine live</div>
              </div>

              <div
                style={{
                  background: "#f8fbff",
                  border: "1px solid #e5edf8",
                  borderRadius: 18,
                  padding: 16,
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 22 }}>SaaS</div>
                <div style={{ marginTop: 6, opacity: 0.92 }}>Backend e DB reali</div>
              </div>
            </div>
          </div>

          <div
            className="section-card"
            style={{
              background: "rgba(255,255,255,0.96)",
              padding: 24,
              borderRadius: 28,
            }}
          >
            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  color: "#64748b",
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: 0.5,
                }}
              >
                LOGIN
              </div>
              <h2 style={{ margin: "8px 0 0 0", color: "#0b2e59" }}>Bentornato</h2>
            </div>

            {errore ? (
              <div
                style={{
                  marginBottom: 14,
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#991b1b",
                  borderRadius: 14,
                  padding: 12,
                  fontWeight: 700,
                }}
              >
                {errore}
              </div>
            ) : null}

            {avviso ? (
              <div
                style={{
                  marginBottom: 14,
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  color: "#92400e",
                  borderRadius: 14,
                  padding: 12,
                  fontWeight: 800,
                  lineHeight: 1.45,
                }}
              >
                {avviso}
              </div>
            ) : null}

            {successo ? (
              <div
                style={{
                  marginBottom: 14,
                  background: "#ecfdf5",
                  border: "1px solid #bbf7d0",
                  color: "#166534",
                  borderRadius: 14,
                  padding: 12,
                  fontWeight: 700,
                }}
              >
                {successo}
              </div>
            ) : null}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontWeight: 800,
                    color: "#123b6b",
                  }}
                >
                  Email
                </label>

                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="esempio@ristorante.it"
                  autoComplete="email"
                  style={{
                    width: "100%",
                    borderRadius: 14,
                    border: "1px solid #d6e4f5",
                    padding: "13px 14px",
                    background: "white",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontWeight: 800,
                    color: "#123b6b",
                  }}
                >
                  Password
                </label>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    placeholder="Inserisci la password"
                    autoComplete="current-password"
                    style={{
                      width: "100%",
                      borderRadius: 14,
                      border: "1px solid #d6e4f5",
                      padding: "13px 14px",
                      background: "white",
                      outline: "none",
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    style={{
                      border: "1px solid #d6e4f5",
                      borderRadius: 14,
                      padding: "13px 14px",
                      background: "white",
                      fontWeight: 800,
                      color: "#123b6b",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {showPassword ? "Nascondi" : "Mostra"}
                  </button>
                </div>
              </div>


              <button
                type="submit"
                disabled={loading || demoLoading}
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: 16,
                  padding: "14px 18px",
                  background: "linear-gradient(135deg, #123b6b 0%, #2563eb 100%)",
                  color: "white",
                  fontWeight: 900,
                  fontSize: 16,
                  cursor: loading || demoLoading ? "not-allowed" : "pointer",
                  opacity: loading || demoLoading ? 0.7 : 1,
                  boxShadow: "0 16px 26px rgba(37,99,235,0.20)",
                }}
              >
                {loading ? "Accesso in corso..." : "Accedi"}
              </button>
            </form>

            <button
              type="button"
              disabled={loading || demoLoading}
              onClick={handleDemoLogin}
              style={{
                width: "100%",
                marginTop: 12,
                border: "1px solid #99f6e4",
                borderRadius: 16,
                padding: "14px 18px",
                background: "linear-gradient(135deg, #ecfeff 0%, #f0fdf4 100%)",
                color: "#064e3b",
                fontWeight: 900,
                fontSize: 16,
                cursor: loading || demoLoading ? "not-allowed" : "pointer",
                opacity: loading || demoLoading ? 0.7 : 1,
              }}
            >
              {demoLoading ? "Creo demo completa..." : "Entra nella demo completa"}
            </button>

            <div
              style={{
                marginTop: 10,
                color: "#64748b",
                fontSize: 13,
                fontWeight: 750,
                lineHeight: 1.45,
              }}
            >
              Crea o aggiorna automaticamente EasyMenu Demo Bistro con logo, 24 tavoli, menu con foto, ordini live e storico.
            </div>

            <div
              style={{
                marginTop: 18,
                paddingTop: 18,
                borderTop: "1px solid #e5edf8",
                color: "#64748b",
                fontSize: 14,
              }}
            >
              Non hai ancora un account?{" "}
              <Link
                to="/register?next=/billing&plan=starter"
                style={{
                  color: "#2563eb",
                  fontWeight: 800,
                  textDecoration: "none",
                }}
              >
Scegli un piano e registrati
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
