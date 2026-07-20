import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ServiceUnavailable from "./pages/ServiceUnavailable.jsx";

const AdminPanel = lazy(() => import("./pages/AdminPanel.jsx"));
const Bar = lazy(() => import("./pages/Bar.jsx"));
const Billing = lazy(() => import("./pages/Billing.jsx"));
const Cassa = lazy(() => import("./pages/Cassa.jsx"));
const Cliente = lazy(() => import("./pages/Cliente.jsx"));
const Contattaci = lazy(() => import("./pages/Contattaci.jsx"));
const Cucina = lazy(() => import("./pages/Cucina.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Demo = lazy(() => import("./pages/Demo.jsx"));
const Errori = lazy(() => import("./pages/Errori.jsx"));
const Integrazioni = lazy(() => import("./pages/Integrazioni.jsx"));
const Landing = lazy(() => import("./pages/Landing.jsx"));
const LegalPage = lazy(() => import("./pages/LegalPage.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Onboarding = lazy(() => import("./pages/Onboarding.jsx"));
const QRCodeTavoli = lazy(() => import("./pages/QRCodeTavoli.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const Statistiche = lazy(() => import("./pages/Statistiche.jsx"));
const Storico = lazy(() => import("./pages/Storico.jsx"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin.jsx"));
const Tavoli = lazy(() => import("./pages/Tavoli.jsx"));

function PageFallback() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f5f7fb", color: "#0f172a", fontWeight: 900 }}>
      Caricamento EasyMenu...
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/demo-ristorante" element={<Demo />} />
          <Route path="/demo-commerciale" element={<Demo />} />
          <Route path="/privacy" element={<LegalPage />} />
          <Route path="/termini" element={<LegalPage />} />
          <Route path="/cookie" element={<LegalPage />} />
          <Route path="/servizio-non-disponibile" element={<ServiceUnavailable />} />

          <Route path="/menu" element={<Cliente />} />
          <Route path="/menu/:tavolo" element={<Cliente />} />
          <Route path="/menu/:slug/:tableToken" element={<Cliente />} />
          <Route path="/cliente/menu" element={<Cliente />} />
          <Route path="/cliente/menu/:tavolo" element={<Cliente />} />

          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/onboarding" element={<ProtectedRoute roles={["owner", "admin"]}><Onboarding /></ProtectedRoute>} />
          <Route path="/setup" element={<ProtectedRoute roles={["owner", "admin"]}><Onboarding /></ProtectedRoute>} />
          <Route path="/billing" element={<ProtectedRoute roles={["owner", "admin"]}><Billing /></ProtectedRoute>} />
          <Route path="/contattaci" element={<ProtectedRoute roles={["owner", "admin"]}><Contattaci /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute roles={["owner", "admin"]}><AdminPanel /></ProtectedRoute>} />
          <Route path="/super-admin" element={<ProtectedRoute roles={["superadmin"]}><SuperAdmin /></ProtectedRoute>} />
          <Route path="/cucina" element={<ProtectedRoute roles={["owner", "admin", "kitchen"]}><Cucina /></ProtectedRoute>} />
          <Route path="/bar" element={<ProtectedRoute roles={["owner", "admin", "bar"]}><Bar /></ProtectedRoute>} />
          <Route path="/cassa" element={<ProtectedRoute roles={["owner", "admin", "cashier"]}><Cassa /></ProtectedRoute>} />
          <Route path="/tavoli" element={<ProtectedRoute roles={["owner", "admin", "cashier"]}><Tavoli /></ProtectedRoute>} />
          <Route path="/qr" element={<ProtectedRoute roles={["owner", "admin"]}><QRCodeTavoli /></ProtectedRoute>} />
          <Route path="/storico" element={<ProtectedRoute roles={["owner", "admin"]}><Storico /></ProtectedRoute>} />
          <Route path="/statistiche" element={<ProtectedRoute roles={["owner", "admin"]}><Statistiche /></ProtectedRoute>} />
          <Route path="/integrazioni" element={<ProtectedRoute roles={["owner", "admin"]}><Integrazioni /></ProtectedRoute>} />
          <Route path="/errori" element={<ProtectedRoute roles={["owner", "admin"]}><Errori /></ProtectedRoute>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
