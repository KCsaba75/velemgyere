import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { FilterBar } from './FilterBar';
import { ProgramList } from './ProgramList';

interface ProgramsPageProps {
  filterType?: 'category' | 'region';
}

/**
 * Shared by /programok, /kategoriak/:slug and /regiok/:slug (16241c32) -- syncs the
 * selected category/region filter from the URL param on mount and whenever the slug
 * changes, so a direct link or an F5 refresh on a filtered URL shows the right list
 * immediately instead of resetting to the unfiltered catalog.
 */
export const ProgramsPage: React.FC<ProgramsPageProps> = ({ filterType }) => {
  const { slug } = useParams<{ slug: string }>();
  const { categories, regions, setSelectedCategory, setSelectedRegion } = useApp();

  useEffect(() => {
    if (filterType === 'category') {
      setSelectedCategory(slug || null);
      setSelectedRegion(null);
    } else if (filterType === 'region') {
      setSelectedRegion(slug || null);
      setSelectedCategory(null);
    } else {
      setSelectedCategory(null);
      setSelectedRegion(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, slug]);

  const category = filterType === 'category' ? categories.find(c => c.slug === slug) : undefined;
  const region = filterType === 'region' ? regions.find(r => r.slug === slug) : undefined;

  const title = category ? `${category.name} programok` : region ? `${region.name} programok` : 'Összes program';
  const description = category
    ? `Magyar nyelvű ${category.name.toLowerCase()} programok és szolgáltatások külföldön.`
    : region
      ? `Magyar nyelvű programok és szolgáltatások ${region.name}-n.`
      : 'Böngéssz a teljes magyar nyelvű külföldi programkatalógusban: kirándulások, transzferek és élmények.';

  useDocumentMeta(title, description);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <FilterBar />
      <ProgramList />
    </div>
  );
};
