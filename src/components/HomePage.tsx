import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Hero } from './Hero';
import { FilterBar } from './FilterBar';
import { ProgramList } from './ProgramList';

// No useDocumentMeta call here: the site default (set in index.html) is already
// correct for the home page, and every other route's own unmount cleanup already
// restores it on the way back -- nothing to override.
export const HomePage: React.FC = () => {
  const { isAuthenticated } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/programok', { replace: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isAuthenticated, navigate]);

  // Mobile filter drawer (kanban e0ee8b7e): lifted here because FilterBar
  // (the drawer) and ProgramList (the trigger button, next to its h2) are
  // siblings below.
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  if (isAuthenticated) {
    return null;
  }

  return (
    <div>
      <Hero />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <FilterBar mobileOpen={mobileFiltersOpen} onCloseMobile={() => setMobileFiltersOpen(false)} />
        <ProgramList onOpenMobileFilters={() => setMobileFiltersOpen(true)} />
      </div>
    </div>
  );
};
