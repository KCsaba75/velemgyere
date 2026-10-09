import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { HomePage } from './components/HomePage';
import { ProgramsPage } from './components/ProgramsPage';
import { ProgramDetailView } from './components/ProgramDetailView';
import { ProviderLanding } from './components/ProviderLanding';
import { ProviderDashboard } from './components/ProviderDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { CategoriesView } from './components/CategoriesView';
import { LoginModal } from './components/LoginModal';
import { ProviderRegisterModal } from './components/ProviderRegisterModal';
import { NewProgramModal } from './components/NewProgramModal';
import { Footer } from './components/Footer';
import { MyAccountView } from './components/MyAccountView';
import { FavoritesView } from './components/FavoritesView';
import { FavoriteFolderModal } from './components/FavoriteFolderModal';
import { FavoriteToast } from './components/FavoriteToast';
import { UserRole } from './types/database';

// 16241c32: gates a route behind auth/role, redirecting home instead of rendering a
// dashboard with no data a logged-out visitor (or a provider on the admin route)
// couldn't actually use anyway.
const ProtectedRoute: React.FC<{ allow: UserRole[]; children: React.ReactNode }> = ({ allow, children }) => {
  const { isAuthenticated, currentUser } = useApp();
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
    <div className="min-h-screen flex flex-col bg-stone-50 font-sans selection:bg-emerald-500 selection:text-white pb-16 md:pb-0">
      {/* Sticky Main Navigation */}
      <Navbar
        onOpenLogin={() => openLoginModal()}
        onOpenNewProgram={() => setNewProgramModalOpen(true)}
      />

      {/* Routes */}
      <main className="flex-1">
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
                <ProviderDashboard onOpenNewProgram={() => setNewProgramModalOpen(true)} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allow={['admin']}>
                <AdminDashboard />
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
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
