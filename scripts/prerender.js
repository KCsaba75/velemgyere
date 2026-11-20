#!/usr/bin/env node
// Eleni #244 audit (dev homokozo), 3. pont [E, SEO/AI]: a JS-t nem futtato crawlerek
// (GPTBot/ClaudeBot/PerplexityBot/CCBot -- robots.txt explicit meghivja oket) a nyers
// index.html-t kapjak, ami MINDEN route-on azonos cim/leiras/canonical, es a canonical
// MINDIG a fooldalra mutat. Ez a script build utan per-route statikus .html fajlokat ir
// a dist/-be a helyes <title>/meta description/canonical/OG/Twitter/JSON-LD tartalommal,
// ugyanazzal a mintaval mint a testver-projekt (vellionation_blog/scripts/prerender.js).
// Vercel a statikus fajlt returnolja a request path alapjan MIELOTT a vercel.json
// catch-all rewrite-ja (SPA fallback index.html-re) lefutna, igy a valodi bongeszok
// (JS-t futtato Googlebot is) a megszokott SPA-t kapjak, csak a nyers HTML valtozik.
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const SITE_URL = 'https://velemgyere.hu';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ygdvpnxtxdnueoizltzk.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZHZwbnh0eGRudWVvaXpsdHprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxMzIyODUsImV4cCI6MjEwNzcwODI4NX0.HaRHhVqmTKmAIzwnZTMVNCuZEmKUGPyBwpoaTALRWR4';
const DEFAULT_OG_IMAGE = `${SITE_URL}/brand/velemgyere-logo-wide-v2.jpg`;
const DIST_DIR = path.resolve(process.cwd(), 'dist');
const TEMPLATE_PATH = path.join(DIST_DIR, 'index.html');
const PLACEHOLDER_RE = /<!--PRERENDER:SEO-->[\s\S]*?<!--\/PRERENDER:SEO-->/;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(str, max = 160) {
  const s = String(str ?? '').trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

function jsonLdScript(data) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
  return `<script type="application/ld+json" data-prerender="true">${json}</script>`;
}

function buildSeoBlock({
  title,
  description,
  canonical,
  ogType = 'website',
  ogImage = DEFAULT_OG_IMAGE,
  jsonLd = [],
}) {
  const lines = [];
  lines.push('<!--PRERENDER:SEO-->');
  lines.push(`<title data-prerender="true">${escapeHtml(title)}</title>`);
  lines.push(
    `<meta data-prerender="true" name="description" content="${escapeHtml(description)}" />`,
  );
  lines.push(`<link data-prerender="true" rel="canonical" href="${escapeHtml(canonical)}" />`);
  lines.push(
    `<meta data-prerender="true" property="og:type" content="${escapeHtml(ogType)}" />`,
  );
  lines.push(
    `<meta data-prerender="true" property="og:site_name" content="Velem Gyere" />`,
  );
  lines.push(`<meta data-prerender="true" property="og:locale" content="hu_HU" />`);
  lines.push(`<meta data-prerender="true" property="og:url" content="${escapeHtml(canonical)}" />`);
  lines.push(`<meta data-prerender="true" property="og:title" content="${escapeHtml(title)}" />`);
  lines.push(
    `<meta data-prerender="true" property="og:description" content="${escapeHtml(description)}" />`,
  );
  lines.push(`<meta data-prerender="true" property="og:image" content="${escapeHtml(ogImage)}" />`);
  lines.push(`<meta data-prerender="true" name="twitter:card" content="summary_large_image" />`);
  lines.push(`<meta data-prerender="true" name="twitter:title" content="${escapeHtml(title)}" />`);
  lines.push(
    `<meta data-prerender="true" name="twitter:description" content="${escapeHtml(description)}" />`,
  );
  lines.push(`<meta data-prerender="true" name="twitter:image" content="${escapeHtml(ogImage)}" />`);
  for (const entry of jsonLd) {
    lines.push(jsonLdScript(entry));
  }
  lines.push('<!--/PRERENDER:SEO-->');
  return lines.join('\n\t\t');
}

function injectSeo(template, seoBlock) {
  if (!PLACEHOLDER_RE.test(template)) {
    throw new Error('SEO placeholder not found in template index.html');
  }
  return template.replace(PLACEHOLDER_RE, seoBlock);
}

// Kanban b3387cba (004ea321 audit, SEO szekcio): a korabbi public/sitemap.xml
// kezzel irt, statikus volt -- fix 2026-10-15 lastmod-dal es EGYETLEN tenyleges
// program-oldal nelkul (csak a kategoria-gyorslinkeket tartalmazta). Ez a
// fuggveny a build-time allRoutes listabol (ugyanaz, amit a prerenderelt HTML-ek
// is hasznalnak) generalja a sitemapot, igy uj program/kategoria/regio automatikusan
// bekerul, kiszedett/torolt pedig automatikusan kikerul -- nincs kulon karbantartas.
function writeSitemap(entries) {
  const today = new Date().toISOString().split('T')[0];
  const body = entries
    .map(
      (e) =>
        `  <url>\n    <loc>${SITE_URL}${e.path}</loc>\n    <lastmod>${e.lastmod || today}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`,
    )
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), xml, 'utf8');
  return entries.length;
}

function writeHtml(routePath, html) {
  let outPath;
  if (routePath === '/') {
    outPath = path.join(DIST_DIR, 'index.html');
  } else {
    const trimmed = routePath.replace(/^\/|\/$/g, '');
    outPath = path.join(DIST_DIR, trimmed, 'index.html');
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, 'utf8');
  return path.relative(DIST_DIR, outPath);
}

function staticRoutes() {
  return [
    {
      path: '/',
      seo: {
        title: 'Velem Gyere – Kirándulások, Élmények és Magyar Nyelvű Vezetések Külföldön',
        description:
          'Fedezd fel a legizgalmasabb külföldi magyar nyelvű élménytúrákat, városnézéseket és reptéri transzfereket megbízható helyi szolgáltatóktól!',
        canonical: `${SITE_URL}/`,
      },
    },
    {
      path: '/programok',
      seo: {
        title: 'Összes Program | Velem Gyere',
        description:
          'Böngéssz a külföldi magyar nyelvű élménytúrák, városnézések és reptéri transzferek teljes katalógusában.',
        canonical: `${SITE_URL}/programok`,
      },
    },
    // Kanban 6f9ad755 (Csaba, 2026-11-02): a korabbi "/kategoriak" hub-oldal
    // megszunt (most csak kliens-oldalon redirectel /programok-ra -- egy
    // redirectelo oldalnak nincs mit prerenderelni/indexelni, lasd lejjebb a
    // requiredStatic listaban is), helyette "/utazasok" -- az a DINAMIKUS
    // route-ok kozott kapja meg a sajat SEO-jat lejjebb (travelSeo), mert a
    // nevet/leirasat a tenyleges travel-kategoriabol (is_travel_category)
    // tudjuk csak kitolteni.
    // Kanban 71915a0a (4-6. pont): uj Platform/Ugyfelszolgalat aloldalak --
    // a tenyleges szoveg/kep admin-szerkesztheto (public.pages tabla) es
    // kliens-oldalon hidratalodik, ez a statikus SEO-cim/leiras csak a
    // kezdeti crawler-megjelenesert van, nem kell DB-fuggonek lennie.
    {
      path: '/hogyan-mukodik',
      seo: {
        title: 'Hogyan Működik? | Velem Gyere',
        description: 'Programvadászként és szolgáltatóként is -- így működik a Velem Gyere.',
        canonical: `${SITE_URL}/hogyan-mukodik`,
      },
    },
    {
      path: '/rolunk',
      seo: {
        title: 'Rólunk | Velem Gyere',
        description: 'Ismerd meg a Velem Gyere csapatát és a kezdetek történetét.',
        canonical: `${SITE_URL}/rolunk`,
      },
    },
    {
      path: '/arazas-es-fizetes',
      seo: {
        title: 'Árazás és Fizetés | Velem Gyere',
        description: 'Hogyan épül fel a Velem Gyere foglalási díja, és hogyan történik a fizetés.',
        canonical: `${SITE_URL}/arazas-es-fizetes`,
      },
    },
    {
      path: '/kapcsolat',
      seo: {
        title: 'Kapcsolat | Velem Gyere',
        description: 'Lépj kapcsolatba a Velem Gyere csapatával.',
        canonical: `${SITE_URL}/kapcsolat`,
      },
    },
    {
      path: '/aszf',
      seo: {
        title: 'Általános Szerződési Feltételek | Velem Gyere',
        description: 'A Velem Gyere platform Általános Szerződési Feltételei.',
        canonical: `${SITE_URL}/aszf`,
      },
    },
    {
      path: '/adatkezeles',
      seo: {
        title: 'Adatkezelési Tájékoztató | Velem Gyere',
        description: 'A Velem Gyere platform adatkezelési tájékoztatója.',
        canonical: `${SITE_URL}/adatkezeles`,
      },
    },
  ];
}

async function fetchPrograms(supabase) {
  const { data, error } = await supabase
    .from('programs')
    .select(
      `
      id,
      slug,
      title,
      short_description,
      description,
      location,
      country,
      price,
      currency,
      updated_at,
      providers ( status, company_name ),
      program_images ( image_url, is_cover )
    `,
    )
    .eq('status', 'published');
  if (error) throw new Error(`Failed to fetch programs: ${error.message}`);
  return (data || []).filter((p) => p.providers?.status === 'approved');
}

// AI-SEO (kanban b3387cba, 004ea051 audit 5. szekcio): a program-oldalak JSON-LD-je
// eddig nem tartalmazott offers/aggregateRating-et -- egy LLM/AI-SEO crawler csak az
// itt leirt adatbol tud arat/ertekelest ajanlani anelkul, hogy JS-t futtatna. Csak a
// PUBLIKUS, publikalt ertekelesek szamitanak bele (lasd supabase-anon-key-hides-drafts-rls
// memoria -- az anon kulcs ugyis csak ezeket latja, a szures itt csak dokumentacio).
async function fetchReviewStats(supabase) {
  const { data, error } = await supabase.from('reviews').select('program_id, rating').eq('status', 'published');
  if (error) throw new Error(`Failed to fetch review stats: ${error.message}`);
  const byProgram = new Map();
  for (const row of data || []) {
    const entry = byProgram.get(row.program_id) || { sum: 0, count: 0 };
    entry.sum += Number(row.rating) || 0;
    entry.count += 1;
    byProgram.set(row.program_id, entry);
  }
  return byProgram;
}

async function fetchCategories(supabase) {
  const { data, error } = await supabase
    .from('categories')
    .select('slug, name, is_travel_category')
    .eq('active', true);
  if (error) throw new Error(`Failed to fetch categories: ${error.message}`);
  return data || [];
}

async function fetchRegions(supabase) {
  const { data, error } = await supabase
    .from('regions')
    .select('slug, name, country, description')
    .eq('active', true);
  if (error) throw new Error(`Failed to fetch regions: ${error.message}`);
  return data || [];
}

async function fetchFaqPage(supabase) {
  const { data, error } = await supabase.from('pages').select('title, content').eq('slug', 'faq').maybeSingle();
  if (error) throw new Error(`Failed to fetch FAQ page: ${error.message}`);
  return data || null;
}

// AI-SEO (kanban b3387cba, 004ea051 audit 5. szekcio): FAQPage JSON-LD CSAK ha van
// valodi admin-szerkesztett tartalom (content.items) -- a kliens-oldali DRAFT_FAQ_ITEMS
// egy sima placeholder ("admin tolti majd ki"), azt hamis strukturalt adatkent kiadni
// a Google szerint tiltott placeholder/spam markup lenne.
function faqSeo(page) {
  const items = page?.content?.items;
  if (!Array.isArray(items) || items.length === 0) return null;
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: stripHtml(item.question),
      acceptedAnswer: {
        '@type': 'Answer',
        text: stripHtml(item.answer),
      },
    })),
  };
  return {
    path: '/gyik',
    seo: {
      title: `${page.title?.trim() || 'Gyakran Ismételt Kérdések'} | Velem Gyere`,
      description: 'A Velem Gyere platformmal kapcsolatos leggyakoribb kérdések és válaszok.',
      canonical: `${SITE_URL}/gyik`,
      jsonLd: [faqLd],
    },
  };
}

function programSeo(program, reviewStatsByProgramId) {
  if (!program.slug) return null;
  const url = `${SITE_URL}/programok/${program.slug}`;
  const title = `${program.title} | Velem Gyere`;
  const rawDescription = program.short_description || program.description || '';
  const description = truncate(stripHtml(rawDescription), 200);
  const cover = (program.program_images || []).find((img) => img.is_cover) || program.program_images?.[0];
  const image = cover?.image_url || DEFAULT_OG_IMAGE;

  const tripLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: program.title,
    description: stripHtml(rawDescription),
    image,
    touristType: 'Magyar nyelvű utazók',
    itinerary: {
      '@type': 'Place',
      name: [program.location, program.country].filter(Boolean).join(', '),
    },
  };

  if (program.price != null && program.currency) {
    tripLd.offers = {
      '@type': 'Offer',
      price: String(program.price),
      priceCurrency: program.currency === 'Ft' ? 'HUF' : program.currency,
      url,
      availability: 'https://schema.org/InStock',
    };
  }
  if (program.providers?.company_name) {
    tripLd.provider = {
      '@type': 'Organization',
      name: program.providers.company_name,
    };
  }
  const stats = reviewStatsByProgramId?.get(program.id);
  if (stats && stats.count > 0) {
    tripLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: (stats.sum / stats.count).toFixed(1),
      reviewCount: stats.count,
      bestRating: '5',
      worstRating: '1',
    };
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Főoldal', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Programok', item: `${SITE_URL}/programok` },
      { '@type': 'ListItem', position: 3, name: program.title },
    ],
  };

  return {
    path: `/programok/${program.slug}`,
    seo: { title, description, canonical: url, ogType: 'article', ogImage: image, jsonLd: [tripLd, breadcrumbLd] },
  };
}

function categorySeo(category) {
  if (!category.slug) return null;
  const url = `${SITE_URL}/kategoriak/${category.slug}`;
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Főoldal', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Programok', item: `${SITE_URL}/programok` },
      { '@type': 'ListItem', position: 3, name: category.name },
    ],
  };
  return {
    path: `/kategoriak/${category.slug}`,
    seo: {
      title: `${category.name} programok | Velem Gyere`,
      description: `Nézd át a ${category.name} kategória összes külföldi magyar nyelvű programját.`,
      canonical: url,
      jsonLd: [breadcrumbLd],
    },
  };
}

// Kanban 6f9ad755: /utazasok -- fixed to whichever category has
// is_travel_category=true (the slug itself differs between environments,
// see is_travel_category comment in src/types/database.ts). Deliberately its
// own canonical URL, not a /kategoriak/<slug> one -- that old path now just
// redirects here client-side (ProgramsPage.tsx), so it isn't prerendered at
// all (see the categories loop in main() skipping this category).
function travelSeo(category) {
  const url = `${SITE_URL}/utazasok`;
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Főoldal', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: category.name },
    ],
  };
  return {
    path: '/utazasok',
    seo: {
      title: `${category.name} | Velem Gyere`,
      description: `Magyar nyelvű, Magyarországról induló utazások és kirándulások: ${category.name.toLowerCase()}.`,
      canonical: url,
      jsonLd: [breadcrumbLd],
    },
  };
}

function regionSeo(region) {
  if (!region.slug) return null;
  const url = `${SITE_URL}/regiok/${region.slug}`;
  const description = region.description
    ? truncate(stripHtml(region.description), 200)
    : `Fedezd fel a ${region.name} (${region.country}) területen elérhető magyar nyelvű programokat.`;
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Főoldal', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Programok', item: `${SITE_URL}/programok` },
      { '@type': 'ListItem', position: 3, name: region.name },
    ],
  };
  return {
    path: `/regiok/${region.slug}`,
    seo: {
      title: `${region.name} – Programok | Velem Gyere`,
      description,
      canonical: url,
      jsonLd: [breadcrumbLd],
    },
  };
}

async function main() {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error(`Prerender skipped: ${TEMPLATE_PATH} not found. Run vite build first.`);
    process.exit(0);
  }

  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  if (!PLACEHOLDER_RE.test(template)) {
    console.error('Prerender skipped: <!--PRERENDER:SEO--> placeholder missing from index.html template.');
    process.exit(0);
  }

  const allRoutes = [...staticRoutes()];
  const staticPaths = allRoutes.map((r) => r.path);
  let dynamicCount = 0;

  const HOME_OR_CATALOG_PRIORITY = { '/': '1.0', '/programok': '0.9' };
  const sitemapEntries = staticPaths.map((p) => ({
    path: p,
    priority: HOME_OR_CATALOG_PRIORITY[p] || '0.5',
    changefreq: HOME_OR_CATALOG_PRIORITY[p] ? 'daily' : 'monthly',
  }));

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });

  const [programs, categories, regions, reviewStatsByProgramId, faqPage] = await Promise.all([
    fetchPrograms(supabase),
    fetchCategories(supabase),
    fetchRegions(supabase),
    fetchReviewStats(supabase),
    fetchFaqPage(supabase),
  ]);

  // /gyik always gets a prerendered page -- with FAQPage JSON-LD once real admin
  // content exists (faqSeo returns null on the placeholder-only draft state).
  const faqRoute = faqSeo(faqPage) || {
    path: '/gyik',
    seo: {
      title: 'Gyakran Ismételt Kérdések | Velem Gyere',
      description: 'A Velem Gyere platformmal kapcsolatos leggyakoribb kérdések és válaszok.',
      canonical: `${SITE_URL}/gyik`,
    },
  };
  allRoutes.push(faqRoute);
  dynamicCount++;
  sitemapEntries.push({ path: faqRoute.path, priority: '0.5', changefreq: 'monthly' });

  for (const program of programs) {
    const route = programSeo(program, reviewStatsByProgramId);
    if (route) {
      allRoutes.push(route);
      dynamicCount++;
      sitemapEntries.push({
        path: route.path,
        priority: '0.7',
        changefreq: 'weekly',
        lastmod: program.updated_at ? String(program.updated_at).split('T')[0] : undefined,
      });
    }
  }
  // Kanban 6f9ad755: the travel category gets its own canonical route
  // (/utazasok, via travelSeo) instead of the generic /kategoriak/<slug> --
  // skip it in the normal category loop so it isn't prerendered twice under
  // two different URLs.
  const travelCategory = categories.find((c) => c.is_travel_category);
  const nonTravelCategories = categories.filter((c) => !c.is_travel_category);

  for (const category of nonTravelCategories) {
    const route = categorySeo(category);
    if (route) {
      allRoutes.push(route);
      dynamicCount++;
      sitemapEntries.push({ path: route.path, priority: '0.8', changefreq: 'weekly' });
    }
  }
  if (travelCategory) {
    const route = travelSeo(travelCategory);
    allRoutes.push(route);
    dynamicCount++;
    sitemapEntries.push({ path: route.path, priority: '0.8', changefreq: 'weekly' });
  } else {
    // Not fatal -- PROD doesn't have is_travel_category set yet as of
    // 2026-11-02 (kanban 6f9ad755 built/tested in dev-sandbox only so far;
    // the one-time `UPDATE categories SET is_travel_category = true WHERE
    // slug = '<prod travel category slug>'` is a manual pre-promotion step).
    // The live /utazasok route still works via the SPA fallback either way,
    // it just won't have its own prerendered HTML/SEO until that step runs.
    console.warn('Prerender warning: no category has is_travel_category=true -- /utazasok will not get a dedicated prerendered page.');
  }
  for (const region of regions) {
    const route = regionSeo(region);
    if (route) {
      allRoutes.push(route);
      dynamicCount++;
      sitemapEntries.push({ path: route.path, priority: '0.8', changefreq: 'weekly' });
    }
  }

  const sitemapCount = writeSitemap(sitemapEntries);
  console.log(`Sitemap written: ${sitemapCount} URLs → dist/sitemap.xml`);

  let written = 0;
  let failed = 0;
  for (const route of allRoutes) {
    try {
      const seoBlock = buildSeoBlock(route.seo);
      const html = injectSeo(template, seoBlock);
      const rel = writeHtml(route.path, html);
      written++;
      console.log(`  ✓ ${route.path.padEnd(40)} → ${rel}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${route.path}: ${err.message}`);
    }
  }

  console.log(`Prerender complete: ${written} routes written (${dynamicCount} dynamic), ${failed} failed.`);

  const requiredStatic = ['/', '/programok'];
  const missing = [];
  for (const p of requiredStatic) {
    if (!staticPaths.includes(p)) continue;
    const expected = p === '/' ? path.join(DIST_DIR, 'index.html') : path.join(DIST_DIR, p.replace(/^\//, ''), 'index.html');
    if (!fs.existsSync(expected)) missing.push(`${p} → ${expected}`);
  }
  if (missing.length > 0) {
    console.error('Prerender verification FAILED — missing critical files:');
    for (const m of missing) console.error(`  - ${m}`);
    process.exit(1);
  }

  if (failed > 0) process.exit(1);

  if (dynamicCount === 0 && process.env.PRERENDER_ALLOW_EMPTY !== '1') {
    console.error(
      'Prerender verification FAILED — zero dynamic routes generated (no published programs/categories/regions). ' +
        'Set PRERENDER_ALLOW_EMPTY=1 to bypass (e.g. empty dev sandbox).',
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Prerender failed:', err);
  process.exit(1);
});
