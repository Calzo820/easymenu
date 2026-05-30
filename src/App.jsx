import { BrowserRouter, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";
import Bar from "./pages/Bar.jsx";
import Billing from "./pages/Billing.jsx";
import Cassa from "./pages/Cassa.jsx";
import Cliente from "./pages/Cliente.jsx";
import Cucina from "./pages/Cucina.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Errori from "./pages/Errori.jsx";
import DemoCommerciale from "./pages/DemoCommerciale.jsx";
import DemoRestaurantGuide from "./components/DemoRestaurantGuide.jsx";
import Landing from "./pages/Landing.jsx";
import Integrazioni from "./pages/Integrazioni.jsx";
import Login from "./pages/Login.jsx";
import QRCodeTavoli from "./pages/QRCodeTavoli.jsx";
import Register from "./pages/Register.jsx";
import Statistiche from "./pages/Statistiche.jsx";
import Storico from "./pages/Storico.jsx";
import Tavoli from "./pages/Tavoli.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/demo-ristorante" element={<DemoRestaurantGuide />} />
        <Route path="/demo-commerciale" element={<DemoCommerciale />} />

        <Route path="/menu" element={<Cliente />} />
        <Route path="/menu/:tavolo" element={<Cliente />} />
        <Route path="/menu/:slug/:tableToken" element={<Cliente />} />
        <Route path="/cliente/menu" element={<Cliente />} />
        <Route path="/cliente/menu/:tavolo" element={<Cliente />} />

        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/billing" element={<ProtectedRoute roles={["owner", "admin"]}><Billing /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute roles={["owner", "admin"]}><AdminPanel /></ProtectedRoute>} />
        <Route path="/cucina" element={<ProtectedRoute roles={["owner", "admin", "kitchen"]}><Cucina /></ProtectedRoute>} />
        <Route path="/bar" element={<ProtectedRoute roles={["owner", "admin", "bar"]}><Bar /></ProtectedRoute>} />
        <Route path="/cassa" element={<ProtectedRoute roles={["owner", "admin", "cashier"]}><Cassa /></ProtectedRoute>} />
        <Route path="/tavoli" element={<ProtectedRoute roles={["owner", "admin", "cashier"]}><Tavoli /></ProtectedRoute>} />
        <Route path="/qr" element={<ProtectedRoute roles={["owner", "admin"]}><QRCodeTavoli /></ProtectedRoute>} />
        <Route path="/storico" element={<ProtectedRoute roles={["owner", "admin"]}><Storico /></ProtectedRoute>} />
        <Route path="/statistiche" element={<ProtectedRoute roles={["owner", "admin"]}><Statistiche /></ProtectedRoute>} />
        <Route path="/errori" element={<ProtectedRoute roles={["owner", "admin"]}><Errori /></ProtectedRoute>} />
        <Route path="/integrazioni" element={<ProtectedRoute roles={["owner", "admin"]}><Integrazioni /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
