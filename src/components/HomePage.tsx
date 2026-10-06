import React from 'react';
import { Hero } from './Hero';
import { FilterBar } from './FilterBar';
import { ProgramList } from './ProgramList';

// No useDocumentMeta call here: the site default (set in index.html) is already
// correct for the home page, and every other route's own unmount cleanup already
// restores it on the way back -- nothing to override.
export const HomePage: React.FC = () => {
  return (
    <div>
      <Hero />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <FilterBar />
        <ProgramList />
      </div>
    </div>
  );
};
