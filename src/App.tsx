import React, { useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { ProviderRegisterModal } from './components/ProviderRegisterModal';
import { TermsConsentModal } from './components/TermsConsentModal';
import { ProgramEditorModal } from './components/ProgramEditorModal';
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
// Kanban 4aac8eda (Csaba, 2026-11-11): bal oldali, sotet temaju sidebar-nav
// minden szolgaltatoi oldal korul -- lasd ProviderSidebarLayout.tsx.
const ProviderSidebarLayout = lazy(() => import('./components/ProviderSidebarLayout').then(m => ({ default: m.ProviderSidebarLayout })));
const ProviderOverviewPage = lazy(() => import('./components/ProviderOverviewPage').then(m => ({ default: m.ProviderOverviewPage })));
const ProviderDashboard = lazy(() => import('./components/ProviderDashboard').then(m => ({ default: m.ProviderDashboard })));
const ProviderProgramsPage = lazy(() => import('./components/ProviderProgramsPage').then(m => ({ default: m.ProviderProgramsPage })));
const ProviderScheduleDashboardPage = lazy(() => import('./components/ProviderScheduleDashboardPage').then(m => ({ default: m.ProviderScheduleDashboardPage })));
const ProviderGuestsPage = lazy(() => import('./components/ProviderGuestsPage').then(m => ({ default: m.ProviderGuestsPage })));
const ProviderFinancesPage = lazy(() => import('./components/ProviderFinancesPage').then(m => ({ default: m.ProviderFinancesPage })));
const ProviderReviewsPage = lazy(() => import('./components/ProviderReviewsPage').then(m => ({ default: m.ProviderReviewsPage })));
const ProviderBookedListPage = lazy(() => import('./components/ProviderBookedListPage').then(m => ({ default: m.ProviderBookedListPage })));
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
const MyAccountView = lazy(() => import('./components/MyAccountView').then(m => ({ default: m.MyAccountView })));
const FavoritesView = lazy(() => import('./components/FavoritesView').then(m => ({ default: m.FavoritesView })));
const BookingsView = lazy(() => import('./components/BookingsView').then(m => ({ default: m.BookingsView })));
const AuthCallback = lazy(() => import('./components/AuthCallback').then(m => ({ default: m.AuthCallback })));
const ResetPasswordPage = lazy(() => import('./components/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
// Kanban 71915a0a (4-6. pont): uj "Platform" + "Ugyfelszolgalat" publikus
// aloldalak, admin-szerkesztheto tartalommal (lasd AppContext `pages`).
const HowItWorksPage = lazy(() => import('./components/pages/HowItWorksPage').then(m => ({ default: m.HowItWorksPage })));
const AboutUsPage = lazy(() => import('./components/pages/AboutUsPage').then(m => ({ default: m.AboutUsPage })));
const PricingInfoPage = lazy(() => import('./components/pages/PricingInfoPage').then(m => ({ default: m.PricingInfoPage })));
const FaqPage = lazy(() => import('./components/pages/FaqPage').then(m => ({ default: m.FaqPage })));
const ContactInfoPage = lazy(() => import('./components/pages/ContactInfoPage').then(m => ({ default: m.ContactInfoPage })));
const TermsPage = lazy(() => import('./components/pages/TermsPage').then(m => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import('./components/pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));

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
  // Kanban 4aac8eda (2026-11-11 kiegeszites): a provider mobil also-nav mostantol
  // mindenkivel egyutt a Navbar.tsx fix also savaban renderelodik (a korabbi sajat
  // hamburger+drawer torolve), ezert az also-ter-fenntartas mar providerre is kell.

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 font-sans selection:bg-emerald-500 selection:text-white overflow-x-clip w-full pb-20 md:pb-0">
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
          {/* Kanban 6f9ad755 (Csaba, 2026-11-02): a "Kategoriak" hub-oldal/nav-cel
              megszunt -- a bare /kategoriak most mar csak a /programok-ra
              redirectel. A /kategoriak/:slug deep linkek (korabbi megosztott
              linkek, esetleges SEO-indexeles) tovabbra is mukodnek -- ha a
              slug epp a travel-kategoria, a ProgramsPage maga redirectel
              /utazasok-ra (lasd ProgramsPage.tsx). */}
          <Route path="/kategoriak" element={<Navigate to="/programok" replace />} />
          <Route path="/kategoriak/:slug" element={<ProgramsPage filterType="category" />} />
          <Route path="/regiok/:slug" element={<ProgramsPage filterType="region" />} />
          <Route path="/utazasok" element={<ProgramsPage travelOnly />} />
          <Route
            path="/szolgaltatoknak"
            element={
              <ProviderLanding
                onOpenRegister={() => setRegisterModalOpen(true)}
                onOpenLogin={() => openLoginModal()}
              />
            }
          />
          {/* Kanban 4aac8eda (Csaba, 2026-11-11): minden szolgaltatoi oldal a
              ProviderSidebarLayout-ba van csomagolva -- ez adja az allando,
              bal oldali, sotet temaju navigaciot (lasd a komponens fejlec-
              kommentjet a sidebar/tartalom temavalasztas inditekarol). */}
          <Route
            path="/szolgaltato/attekintes"
            element={
              <ProtectedRoute allow={['provider', 'admin']}>
                <ProviderSidebarLayout>
                  <ProviderOverviewPage />
                </ProviderSidebarLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/szolgaltato/dashboard"
            element={
              <ProtectedRoute allow={['provider', 'admin']}>
                <ProviderSidebarLayout>
                  <ProviderDashboard />
                </ProviderSidebarLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/szolgaltato/programjaim"
            element={
              <ProtectedRoute allow={['provider', 'admin']}>
                <ProviderSidebarLayout>
                  <ProviderProgramsPage onOpenNewProgram={() => setNewProgramModalOpen(true)} />
                </ProviderSidebarLayout>
              </ProtectedRoute>
            }
          />
          {/* Kanban 4230d70e: uj program-utemezo Iranyitopult -- a /szolgaltato/dashboard
              mar foglalt (kanban 5a3a8dd8 ota csak Fiokadatok), ezert uj route. Kanban
              4aac8eda ota ez a sidebar "Foglalasok" celpontja (lasd
              ProviderSidebarLayout.tsx dontes-kommentjet). */}
          <Route
            path="/szolgaltato/iranyitopult"
            element={
              <ProtectedRoute allow={['provider', 'admin']}>
                <ProviderSidebarLayout>
                  <ProviderScheduleDashboardPage />
                </ProviderSidebarLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/szolgaltato/vendegeim"
            element={
              <ProtectedRoute allow={['provider', 'admin']}>
                <ProviderSidebarLayout>
                  <ProviderGuestsPage />
                </ProviderSidebarLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/szolgaltato/penzugyek"
            element={
              <ProtectedRoute allow={['provider', 'admin']}>
                <ProviderSidebarLayout>
                  <ProviderFinancesPage />
                </ProviderSidebarLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/szolgaltato/ertekeleseim"
            element={
              <ProtectedRoute allow={['provider', 'admin']}>
                <ProviderSidebarLayout>
                  <ProviderReviewsPage />
                </ProviderSidebarLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/szolgaltato/foglaltlista"
            element={
              <ProtectedRoute allow={['provider', 'admin']}>
                <ProviderSidebarLayout>
                  <ProviderBookedListPage />
                </ProviderSidebarLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/szolgaltato/uzeneteim"
            element={
              <ProtectedRoute allow={['provider', 'admin']}>
                <ProviderSidebarLayout>
                  <ProviderMessagesPage />
                </ProviderSidebarLayout>
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
          {/* Kanban dc9d85fb: a foglalas-visszaigazolo email linkje egy konkret
              foglalasra mutat (booking_reference vagy id), ugyanaz a komponens
              olvassa ki useParams-szal es nyitja meg a reszletek-modalt. */}
          <Route path="/foglalasaim/:ref" element={<BookingsView />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/jelszo-visszaallitas" element={<ResetPasswordPage />} />
          <Route path="/hogyan-mukodik" element={<HowItWorksPage />} />
          <Route path="/rolunk" element={<AboutUsPage />} />
          <Route path="/arazas-es-fizetes" element={<PricingInfoPage />} />
          <Route path="/gyik" element={<FaqPage />} />
          <Route path="/kapcsolat" element={<ContactInfoPage />} />
          <Route path="/aszf" element={<TermsPage />} />
          <Route path="/adatkezeles" element={<PrivacyPage />} />
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

      {/* Kanban 32ad8a91: globalisan mountolva, pendingTermsConsent allapot vezerli --
          barmelyik route-on felbukkanhat egy friss Google-regisztracio utan. */}
      <TermsConsentModal />

      <ProviderRegisterModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
      />

      <ProgramEditorModal
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
