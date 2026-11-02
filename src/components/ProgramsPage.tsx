import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { FilterBar } from './FilterBar';
import { ProgramList } from './ProgramList';

interface ProgramsPageProps {
  filterType?: 'category' | 'region';
  // Kanban 6f9ad755: /utazasok -- a fixed single-category view (the category
  // flagged is_travel_category=true), separate from the general "Programok"
  // catalog. Takes priority over filterType/slug when true.
  travelOnly?: boolean;
}

/**
 * Shared by /programok, /kategoriak/:slug, /regiok/:slug (16241c32) and /utazasok
 * (6f9ad755) -- syncs the selected category/region filter from the URL param on
 * mount and whenever the slug changes, so a direct link or an F5 refresh on a
 * filtered URL shows the right list immediately instead of resetting to the
 * unfiltered catalog.
 *
 * Plain /programok (filterType undefined, travelOnly false) has no slug to sync
 * FROM, so it must leave the existing filter state alone (kanban 79568288) -- this
 * route remounts every time the user navigates away and back (e.g. opening a
 * program's detail view, or clicking another nav item), and forcing a reset here
 * used to wipe out whatever the user had picked in the FilterBar. "Szűrők törlése"
 * (resetFilters) is the only intended way to clear a filter now.
 *
 * Kanban 6f9ad755 ("Programok" vs "Utazások" split): the travel category's slug
 * differs between dev-sandbox and PROD (see Category.is_travel_category comment
 * in types/database.ts), so it's located by the flag, never by slug. Every
 * NON-travelOnly render of this page (plain /programok, /regiok/:slug, and any
 * /kategoriak/:slug other than the travel one) excludes that category from the
 * results and hides it from the FilterBar dropdown -- "Programok" means
 * everything EXCEPT Utazások. A /kategoriak/:slug deep link that happens to BE
 * the travel category's slug redirects to the canonical /utazasok instead.
 */
export const ProgramsPage: React.FC<ProgramsPageProps> = ({ filterType, travelOnly }) => {
  const { slug } = useParams<{ slug: string }>();
  const { categories, regions, setSelectedCategory, setSelectedRegion } = useApp();
  const travelCategory = categories.find(c => c.is_travel_category);

  const isTravelSlugDeepLink = !travelOnly && filterType === 'category' && !!travelCategory && slug === travelCategory.slug;

  useEffect(() => {
    if (isTravelSlugDeepLink) {
      // Redirecting below -- don't also touch filter state for a page that
      // won't render.
      return;
    }
    if (travelOnly) {
      setSelectedCategory(travelCategory?.slug || null);
      setSelectedRegion(null);
    } else if (filterType === 'category') {
      setSelectedCategory(slug || null);
      setSelectedRegion(null);
    } else if (filterType === 'region') {
      setSelectedRegion(slug || null);
      setSelectedCategory(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, slug, travelOnly, travelCategory?.slug, isTravelSlugDeepLink]);

  const category = filterType === 'category' ? categories.find(c => c.slug === slug) : undefined;
  const region = filterType === 'region' ? regions.find(r => r.slug === slug) : undefined;

  const title = travelOnly
    ? (travelCategory?.name || 'Utazások Magyarországról')
    : category
      ? `${category.name} programok`
      : region
        ? `${region.name} programok`
        : 'Összes program';
  const description = travelOnly
    ? 'Magyar nyelvű, Magyarországról induló utazások és kirándulások.'
    : category
      ? `Magyar nyelvű ${category.name.toLowerCase()} programok és szolgáltatások külföldön.`
      : region
        ? `Magyar nyelvű programok és szolgáltatások ${region.name}-n.`
        : 'Böngéssz a teljes magyar nyelvű külföldi programkatalógusban: kirándulások, transzferek és élmények.';

  useDocumentMeta(title, description);

  // Mobile filter drawer (kanban e0ee8b7e): lifted here, same reasoning as
  // HomePage -- FilterBar (the drawer) and ProgramList (the trigger button)
  // are siblings below.
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  if (isTravelSlugDeepLink) {
    return <Navigate to="/utazasok" replace />;
  }

  const excludeCategorySlug = !travelOnly ? travelCategory?.slug : undefined;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-8 sm:pb-12">
      <FilterBar
        mobileOpen={mobileFiltersOpen}
        onCloseMobile={() => setMobileFiltersOpen(false)}
        hideCategorySlug={excludeCategorySlug}
        hideCategoryFilter={travelOnly}
      />
      <ProgramList onOpenMobileFilters={() => setMobileFiltersOpen(true)} excludeCategorySlug={excludeCategorySlug} travelOnly={travelOnly} />
    </div>
  );
};
