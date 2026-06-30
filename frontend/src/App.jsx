import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import AppAmbient from './components/AppAmbient.jsx';
import Protected from './components/Protected.jsx';

import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import UserDashboard from './pages/UserDashboard.jsx';
import UserProfile from './pages/UserProfile.jsx';
import VisitSuggestionsPage from './pages/VisitSuggestionsPage.jsx';
import PaymentCheckout from './pages/PaymentCheckout.jsx';
import CartPage from './pages/CartPage.jsx';
import NurseDashboard from './pages/NurseDashboard.jsx';
import NurseProfile from './pages/NurseProfile.jsx';
import NurseSettings from './pages/NurseSettings.jsx';
import NursePayment from './pages/NursePayment.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import AdminHome from './pages/admin/AdminHome.jsx';
import AdminActivityFeed from './pages/admin/AdminActivityFeed.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import AdminVisitOptions from './pages/admin/AdminVisitOptions.jsx';
import AdminServices from './pages/admin/AdminServices.jsx';
import AdminRevenue from './pages/admin/AdminRevenue.jsx';
import FallAlertsShell from './components/FallAlertsShell.jsx';
import CartAddressShell from './components/CartAddressShell.jsx';
import FallAlertsDashboard from './pages/FallAlertsDashboard.jsx';
import NotFound from './pages/NotFound.jsx';

const App = () => {
  const { pathname } = useLocation();
  const fullScreenRegister = pathname === '/register';
  const isHome = pathname === '/';

  return (
    <div
      className={`min-h-screen flex flex-col bg-canvas text-foreground transition-colors duration-300 overflow-x-hidden ${
        fullScreenRegister ? 'h-dvh overflow-hidden' : ''
      }`}
    >
      {!isHome && <AppAmbient />}
      {!isHome && <Navbar />}
      {!isHome && <FallAlertsShell />}
      {!isHome && <CartAddressShell />}
      <main className={fullScreenRegister ? 'flex-1 min-h-0 overflow-hidden' : 'flex-1'}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <Protected role="user">
                <UserDashboard />
              </Protected>
            }
          />
          <Route
            path="/dashboard/payment"
            element={
              <Protected role="user">
                <PaymentCheckout />
              </Protected>
            }
          />
          <Route
            path="/dashboard/cart"
            element={
              <Protected role="user">
                <CartPage />
              </Protected>
            }
          />
          <Route
            path="/dashboard/profile"
            element={
              <Protected role="user">
                <UserProfile />
              </Protected>
            }
          />
          <Route
            path="/dashboard/alerts"
            element={
              <Protected role="user">
                <div className="app-page max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                  <FallAlertsDashboard />
                </div>
              </Protected>
            }
          />
          <Route
            path="/nurse/alerts"
            element={
              <Protected role="nurse">
                <div className="app-page max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                  <FallAlertsDashboard />
                </div>
              </Protected>
            }
          />
          <Route
            path="/dashboard/suggestions"
            element={
              <Protected role="user">
                <VisitSuggestionsPage />
              </Protected>
            }
          />
          <Route
            path="/nurse"
            element={
              <Protected role="nurse">
                <NurseDashboard />
              </Protected>
            }
          />
          <Route
            path="/nurse/profile"
            element={
              <Protected role="nurse">
                <NurseProfile />
              </Protected>
            }
          />
          <Route
            path="/nurse/settings"
            element={
              <Protected role="nurse">
                <NurseSettings />
              </Protected>
            }
          />
          <Route
            path="/nurse/payment"
            element={
              <Protected role="nurse">
                <NursePayment />
              </Protected>
            }
          />
          <Route
            path="/admin"
            element={
              <Protected role="admin">
                <AdminLayout />
              </Protected>
            }
          >
            <Route index element={<AdminHome />} />
            <Route path="activity" element={<AdminActivityFeed />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="services" element={<AdminServices />} />
            <Route path="revenue" element={<AdminRevenue />} />
            <Route path="visit-options" element={<AdminVisitOptions />} />
            <Route path="alerts" element={<FallAlertsDashboard />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {isHome && <Footer />}
    </div>
  );
};

export default App;
