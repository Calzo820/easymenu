import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  apiPost,
  setAuthToken,
} from "../lib/api";

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const [form, setForm] = useState({
    restaurantName: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errore, setErrore] = useState("");
  const [successo, setSuccesso] = useState("");
  const [loading, setLoading] = useState(false);

  const emailValida = useMemo(() => {
    return /\S+@\S+\.\S+/.test(form.email.trim());
  }, [form.email]);

  function updateField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errore) setErrore("");
    if (successo) setSuccesso("");
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setErrore("");
    setSuccesso("");

    const restaurantName = form.restaurantName.trim();
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password;
    const confirmPassword = form.confirmPassword;

    if (!restaurantName || !name || !email || !password || !confirmPassword) {
      setErrore("Compila tutti i campi.");
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

    if (password !== confirmPassword) {
      setErrore("Le password non coincidono.");
      return;
    }

    try {
      setLoading(true);

      const data = await apiPost("/auth/register", {
        restaurantName,
        name,
        email,
        password,
      });

      if (!data?.token) {
        throw new Error("Registrazione completata ma token non ricevuto.");
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
      }

      setSuccesso("Registrazione completata con successo.");

      setTimeout(() => {
        const next = queryParams.get("next");
        const plan = queryParams.get("plan");
        if (next) {
          navigate(`${next}${plan ? `?plan=${encodeURIComponent(plan)}` : ""}`, { replace: true });
          return;
        }
        navigate("/dashboard");
      }, 600);
    } catch (error) {
      setErrore(error.message || "Errore durante la registrazione.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #eef6ff 0%, #eaf4ff 35%, #f7fbff 100%)",
      }}
    >
      <Navbar />

      <div
        style={{
          maxWidth: 1150,
          margin: "0 auto",
          padding: "28px 16px 40px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.05fr 0.95fr",
            gap: 22,
            alignItems: "stretch",
          }}
        >
          <div
            className="glass-hero"
            style={{
              padding: 28,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.15)",
                color: "white",
                fontWeight: 800,
                marginBottom: 18,
              }}
            >
              Crea il tuo ristorante
            </div>

            <h1 style={{ margin: 0, fontSize: 42, lineHeight: 1.08 }}>
              Parti con il tuo account owner
            </h1>

            <p
              style={{
                marginTop: 14,
                maxWidth: 660,
                opacity: 0.95,
                lineHeight: 1.7,
                fontSize: 16,
              }}
            >
              Registra il ristorante, crea il proprietario e accedi subito alla dashboard.
              Dopo potrai aggiungere menu, tavoli QR, cucina, bar e cassa.
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
                  background: "rgba(255,255,255,0.14)",
                  borderRadius: 18,
                  padding: 16,
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 22 }}>1</div>
                <div style={{ marginTop: 6, opacity: 0.92 }}>Crea ristorante</div>
              </div>

              <div
                style={{
                  background: "rgba(255,255,255,0.14)",
                  borderRadius: 18,
                  padding: 16,
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 22 }}>2</div>
                <div style={{ marginTop: 6, opacity: 0.92 }}>Accedi subito</div>
              </div>

              <div
                style={{
                  background: "rgba(255,255,255,0.14)",
                  borderRadius: 18,
                  padding: 16,
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 22 }}>3</div>
                <div style={{ marginTop: 6, opacity: 0.92 }}>Configura il locale</div>
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
                REGISTRAZIONE
              </div>
              <h2 style={{ margin: "8px 0 0 0", color: "#0b2e59" }}>
                Crea il tuo account
              </h2>
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
                  Nome ristorante
                </label>

                <input
                  type="text"
                  value={form.restaurantName}
                  onChange={(e) => updateField("restaurantName", e.target.value)}
                  placeholder="Es. Pizzeria Bella Napoli"
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
                  Nome proprietario
                </label>

                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Es. Mario Rossi"
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
                    placeholder="Almeno 6 caratteri"
                    autoComplete="new-password"
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

              <div style={{ marginBottom: 18 }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontWeight: 800,
                    color: "#123b6b",
                  }}
                >
                  Conferma password
                </label>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={(e) => updateField("confirmPassword", e.target.value)}
                    placeholder="Ripeti la password"
                    autoComplete="new-password"
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
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
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
                    {showConfirmPassword ? "Nascondi" : "Mostra"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: 16,
                  padding: "14px 18px",
                  background: "linear-gradient(135deg, #123b6b 0%, #2563eb 100%)",
                  color: "white",
                  fontWeight: 900,
                  fontSize: 16,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  boxShadow: "0 16px 26px rgba(37,99,235,0.20)",
                }}
              >
                {loading ? "Registrazione in corso..." : "Crea account"}
              </button>
            </form>

            <div
              style={{
                marginTop: 18,
                paddingTop: 18,
                borderTop: "1px solid #e5edf8",
                color: "#64748b",
                fontSize: 14,
              }}
            >
              Hai già un account?{" "}
              <Link
                to="/login"
                style={{
                  color: "#2563eb",
                  fontWeight: 800,
                  textDecoration: "none",
                }}
              >
                Accedi
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}