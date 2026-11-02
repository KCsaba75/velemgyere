import React, { useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { ProviderRegisterModal } from './components/ProviderRegisterModal';
import { NewProgramModal } from './components/NewProgramModal';
import { Footer } from './components/Footer';
import { FavoriteFolderModal } from './components/FavoriteFolderModal';
import { FavoriteToast } from './components/FavoriteToast';
import { UserRole } from './types/database';

// Kanban 8ab468bb (sebesseg-optimalizacio): route-szintu code-splitting -- korabban
// MINDEN route (katalogus + szolgaltatoi dashboard + admin) egyetlen ~607KB JS
// bundle-ben ment, egy anonim latogato is letoltotte az admin/provider kodot. A
// mindig-renderelt "shell" (Navbar, modalok, Footer) fent marad eager-importkent,
// csak a route-tartalom lesz lazy -- a nevezett (nem default) exportokat a
// .then(m => ({ default: m.X })) adapterrel kell lazy()-nek adni.
const HomePage = lazy(() => import('./components/HomePage').then(m => ({ default: m.HomePage })));
const ProgramsPage = lazy(() => import('./components/ProgramsPage').then(m => ({ default: m.ProgramsPage })));
const ProgramDetailView = lazy(() => import('./components/ProgramDetailView').then(m => ({ default: m.ProgramDetailView })));
const ProviderLanding = lazy(() => import('./components/ProviderLanding').then(m => ({ default: m.ProviderLanding })));
const ProviderDashboard = lazy(() => import('./components/ProviderDashboard').then(m => ({ default: m.ProviderDashboard })));
const ProviderProgramsPage = lazy(() => import('./components/ProviderProgramsPage').then(m => ({ default: m.ProviderProgramsPage })));
const ProviderBookingsPage = lazy(() => import('./components/ProviderBookingsPage').then(m => ({ default: m.ProviderBookingsPage })));
const ProviderReviewsPage = lazy(() => import('./components/ProviderReviewsPage').then(m => ({ default: m.ProviderReviewsPage })));
const ProviderInquiriesPage = lazy(() => import('./components/ProviderInquiriesPage').then(m => ({ default: m.ProviderInquiriesPage })));
const ProviderMessagesPage = lazy(() => import('./components/ProviderMessagesPage').then(m => ({ default: m.ProviderMessagesPage })));
// Kanban 653c7577 (Csaba, teljes admin-nav atszervezes): nincs tobbe kozos
// AdminDashboard hub -- minden admin-alfunkcio onallo top-level route/lazy
// chunk (lasd Navbar.tsx admin-nav agat es AppContext VIEW_TO_PATH-et).
const AdminProgramsPage = lazy(() => import('./components/AdminProgramsPage').then(m => ({ default: m.AdminProgramsPage })));
const AdminCategoriesPage = lazy(() => import('./components/AdminCategoriesPage').then(m => ({ default: m.AdminCategoriesPage })));
const AdminUsersPage = lazy(() => import('./components/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })));
const AdminReviewsPage = lazy(() => import('./components/AdminReviewsPage').then(m => ({ default: m.AdminReviewsPage })));
const AdminBookingsPage = lazy(() => import('./components/AdminBookingsPage').then(m => ({ default: m.AdminBookingsPage })));
const AdminSettingsPage = lazy(() => import('./components/AdminSettingsPage').then(m => ({ default: m.AdminSettingsPage })));
const CategoriesView = lazy(() => import('./components/CategoriesView').then(m => ({ default: m.CategoriesView })));
const MyAccountView = lazy(() => import('./components/MyAccountView').then(m => ({ default: m.MyAccountView })));
const FavoritesView = lazy(() => import('./components/FavoritesView').then(m => ({ default: m.FavoritesView })));
const BookingsView = lazy(() => import('./components/BookingsView').then(m => ({ default: m.BookingsView })));
const AuthCallback = lazy(() => import('./components/AuthCallback').then(m => ({ default: m.AuthCallback })));
const ResetPasswordPage = lazy(() => import('./components/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));

// Rovid, nem-zavaro fallback a chunk-betoltes ideje alatt (tipikusan szazmasodperces
// nagysagrend egy mar megnyitott kapcsolat utan) -- ugyanaz a Loader2 minta, amit az
// app mar mashol (AuthCallback, BookingCheckoutModal) hasznal, igy vizualisan konzisztens.
const RouteFallback: React.FC = () => (
  <div className="flex items-center justify-center py-24">
    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
  </div>
);

// 16241c32: gates a route behind auth/role, redirecting home instead of rendering a
// dashboard with no data a logged-out visitor (or a provider on the admin route)
// couldn't actually use anyway.
// Kanban ac237ca9: isAuthenticated starts false on every fresh page load/full reload,
// before the async session-restore resolves -- redirecting immediately on that false
// would bounce an already-logged-in visitor away from a direct URL (e.g. reloading
// /sajat-fiokom) before their session even had a chance to load. Wait for authChecked
// first; show the same route fallback the lazy-loaded chunks already use meanwhile.
const ProtectedRoute: React.FC<{ allow: UserRole[]; children: React.ReactNode }> = ({ allow, children }) => {
  const { isAuthenticated, currentUser, authChecked } = useApp();
  if (!authChecked) {
    return <RouteFallback />;
  }
  if (!isAuthenticated || !allow.includes(currentUser.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { isLoginModalOpen, openLoginModal, closeLoginModal } = useApp();
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [newProgramModalOpen, setNewProgramModalOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 font-sans selection:bg-emerald-500 selection:text-white pb-20 md:pb-0 overflow-x-clip w-full">
      {/* Sticky Main Navigation */}
      <Navbar
        onOpenLogin={() => openLoginModal(undefined, 'programs')}
        onOpenNewProgram={() => setNewProgramModalOpen(true)}
      />

      {/* Routes */}
      <main className="flex-1">
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/programok" element={<ProgramsPage />} />
          <Route path="/programok/:slug" element={<ProgramDetailView />} />
          <Route path="/kategoriak" element={<CategoriesView />} />
          <Route path="/kategoriak/:slug" element={<ProgramsPage filterType="category" />} />
          <Route path="/regiok/:slug" element={<ProgramsPage filterType="region" />} />
          <Route
            path="/szolgaltatoknak"
            element={
              <ProviderLanding
                onOpenRegister={() => setRegisterModalOpen(true)}
                onOpenLogin={() => openLoginModal()}
              />
            }
          />
          <Route
            path="/szolgaltato/dashboard"
            element={
              <ProtectedRoute allow={['provider', 'admin']}>
                <ProviderDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/szolgaltato/programjaim"
            element={
              <ProtectedRoute allow={['provider', 'admin']}>
                <ProviderProgramsPage onOpenNewProgram={() => setNewProgramModalOpen(true)} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/szolgaltato/foglalasaim"
            element={
              <ProtectedRoute allow={['provider', 'admin']}>
                <ProviderBookingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/szolgaltato/ertekeleseim"
            element={
              <ProtectedRoute allow={['provider', 'admin']}>
                <ProviderReviewsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/szolgaltato/erdeklodeseim"
            element={
              <ProtectedRoute allow={['provider', 'admin']}>
                <ProviderInquiriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/szolgaltato/uzeneteim"
            element={
              <ProtectedRoute allow={['provider', 'admin']}>
                <ProviderMessagesPage />
              </ProtectedRoute>
            }
          />
          {/* Kanban 653c7577: a bare /admin-nek nincs tobbe sajat hub-tartalma --
              a Programok az elso targymenu Csaba felsorolasaban, igy az a
              sensible default landing. */}
          <Route path="/admin" element={<Navigate to="/admin/programok" replace />} />
          <Route
            path="/admin/programok"
            element={
              <ProtectedRoute allow={['admin']}>
                <AdminProgramsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/kategoriak"
            element={
              <ProtectedRoute allow={['admin']}>
                <AdminCategoriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/felhasznalok"
            element={
              <ProtectedRoute allow={['admin']}>
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />
          {/* Legacy deep-link (a8676c22, korabban AdminProvidersPage) -- a
              Felhasznalok HUB-ra iranyit, szolgaltatok szegmenssel (default). */}
          <Route path="/admin/szolgaltatok" element={<Navigate to="/admin/felhasznalok" replace />} />
          <Route
            path="/admin/ertekelesek"
            element={
              <ProtectedRoute allow={['admin']}>
                <AdminReviewsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/foglalasok"
            element={
              <ProtectedRoute allow={['admin']}>
                <AdminBookingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/beallitasok"
            element={
              <ProtectedRoute allow={['admin']}>
                <AdminSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sajat-fiokom"
            element={
              <ProtectedRoute allow={['visitor', 'provider', 'admin']}>
                <MyAccountView />
              </ProtectedRoute>
            }
          />
          <Route path="/kedvencek" element={<FavoritesView />} />
          <Route path="/foglalasaim" element={<BookingsView />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/jelszo-visszaallitas" element={<ResetPasswordPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </main>

      {/* Footer */}
      <Footer />

      {/* Global Interactive Modals */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={closeLoginModal}
      />

      <ProviderRegisterModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
      />

      <NewProgramModal
        isOpen={newProgramModalOpen}
        onClose={() => setNewProgramModalOpen(false)}
      />

      {/* Favorites / Wishlist Modal & Toast */}
      <FavoriteFolderModal />
      <FavoriteToast />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
