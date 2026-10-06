import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { FilterBar } from './components/FilterBar';
import { ProgramList } from './components/ProgramList';
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

const AppContent: React.FC = () => {
  const { currentView } = useApp();

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [newProgramModalOpen, setNewProgramModalOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Sticky Main Navigation */}
      <Navbar
        onOpenLogin={() => setLoginModalOpen(true)}
        onOpenNewProgram={() => setNewProgramModalOpen(true)}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {currentView === 'home' && (
          <div>
            <Hero />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
              <FilterBar />
              <ProgramList />
            </div>
          </div>
        )}

        {currentView === 'programs' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <FilterBar />
            <ProgramList />
          </div>
        )}

        {currentView === 'categories' && (
          <CategoriesView />
        )}

        {currentView === 'program-detail' && (
          <ProgramDetailView />
        )}

        {currentView === 'provider-landing' && (
          <ProviderLanding
            onOpenRegister={() => setRegisterModalOpen(true)}
            onOpenLogin={() => setLoginModalOpen(true)}
          />
        )}

        {currentView === 'provider-dashboard' && (
          <ProviderDashboard
            onOpenNewProgram={() => setNewProgramModalOpen(true)}
          />
        )}

        {currentView === 'admin-dashboard' && (
          <AdminDashboard />
        )}

        {currentView === 'my-account' && (
          <MyAccountView />
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Global Interactive Modals */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />

      <ProviderRegisterModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
      />

      <NewProgramModal
        isOpen={newProgramModalOpen}
        onClose={() => setNewProgramModalOpen(false)}
      />
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
