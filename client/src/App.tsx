import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireRole } from './components/RequireRole';
import { SiteLayout } from './components/SiteLayout';
import { AccountPage } from './pages/AccountPage';
import { AdminClientsPage } from './pages/admin/AdminClientsPage';
import { AdminCouriersPage } from './pages/admin/AdminCouriersPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminDishesPage } from './pages/admin/AdminDishesPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { CartPage } from './pages/CartPage';
import { CourierMissionsPage } from './pages/courier/CourierMissionsPage';
import { LoginPage } from './pages/LoginPage';
import { MenuPage } from './pages/MenuPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OrdersPage } from './pages/OrdersPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { RegisterPage } from './pages/RegisterPage';
import { TrackingPage } from './pages/TrackingPage';

/** Des URL lisibles : chaque adresse dit ce que la page représente. */
export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/menu" replace />} />
      <Route path="/connexion" element={<LoginPage />} />
      <Route path="/inscription" element={<RegisterPage />} />

      <Route element={<SiteLayout />}>
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/panier" element={<CartPage />} />
        <Route path="/confidentialite" element={<PrivacyPage />} />
        <Route
          path="/commandes"
          element={
            <RequireRole role="client">
              <OrdersPage />
            </RequireRole>
          }
        />
        <Route
          path="/commandes/:numero/suivi"
          element={
            <RequireRole role="client">
              <TrackingPage />
            </RequireRole>
          }
        />
        <Route
          path="/compte"
          element={
            <RequireRole role="client">
              <AccountPage />
            </RequireRole>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route
        path="/livreur/missions"
        element={
          <RequireRole role="livreur">
            <CourierMissionsPage />
          </RequireRole>
        }
      />

      <Route
        path="/admin"
        element={
          <RequireRole role="admin">
            <AdminLayout />
          </RequireRole>
        }
      >
        <Route index element={<Navigate to="/admin/tableau-de-bord" replace />} />
        <Route path="tableau-de-bord" element={<AdminDashboardPage />} />
        <Route path="plats" element={<AdminDishesPage />} />
        <Route path="commandes" element={<AdminOrdersPage />} />
        <Route path="livreurs" element={<AdminCouriersPage />} />
        <Route path="clients" element={<AdminClientsPage />} />
      </Route>
    </Routes>
  );
}
