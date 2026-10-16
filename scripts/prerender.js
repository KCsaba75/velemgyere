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

function writeHtml(routePath, html) {
  let outPath;
  if (routePath === '/') {
    outPath = path.join(DIST_DIR, 'index.html');
  } else {
    const trimmed = routePath.replace(/^\/|\/$/g, '');
    outPath = path.join(DIST_DIR, `${trimmed}.html`);
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
    {
      path: '/kategoriak',
      seo: {
        title: 'Kategóriák | Velem Gyere',
        description: 'Fedezd fel a programokat kategória szerint -- városnézés, túra, transzfer és más élmények.',
        canonical: `${SITE_URL}/kategoriak`,
      },
    },
  ];
}

async function fetchPrograms(supabase) {
  const { data, error } = await supabase
    .from('programs')
    .select(
      `
      slug,
      title,
      short_description,
      description,
      location,
      country,
      updated_at,
      providers ( status ),
      program_images ( image_url, is_cover )
    `,
    )
    .eq('status', 'published');
  if (error) throw new Error(`Failed to fetch programs: ${error.message}`);
  return (data || []).filter((p) => p.providers?.status === 'approved');
}

async function fetchCategories(supabase) {
  const { data, error } = await supabase.from('categories').select('slug, name').eq('active', true);
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

function programSeo(program) {
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
  return {
    path: `/kategoriak/${category.slug}`,
    seo: {
      title: `${category.name} programok | Velem Gyere`,
      description: `Nézd át a ${category.name} kategória összes külföldi magyar nyelvű programját.`,
      canonical: url,
    },
  };
}

function regionSeo(region) {
  if (!region.slug) return null;
  const url = `${SITE_URL}/regiok/${region.slug}`;
  const description = region.description
    ? truncate(stripHtml(region.description), 200)
    : `Fedezd fel a ${region.name} (${region.country}) területen elérhető magyar nyelvű programokat.`;
  return {
    path: `/regiok/${region.slug}`,
    seo: {
      title: `${region.name} – Programok | Velem Gyere`,
      description,
      canonical: url,
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

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });

  const [programs, categories, regions] = await Promise.all([
    fetchPrograms(supabase),
    fetchCategories(supabase),
    fetchRegions(supabase),
  ]);

  for (const program of programs) {
    const route = programSeo(program);
    if (route) {
      allRoutes.push(route);
      dynamicCount++;
    }
  }
  for (const category of categories) {
    const route = categorySeo(category);
    if (route) {
      allRoutes.push(route);
      dynamicCount++;
    }
  }
  for (const region of regions) {
    const route = regionSeo(region);
    if (route) {
      allRoutes.push(route);
      dynamicCount++;
    }
  }

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

  const requiredStatic = ['/', '/programok', '/kategoriak'];
  const missing = [];
  for (const p of requiredStatic) {
    if (!staticPaths.includes(p)) continue;
    const expected = p === '/' ? path.join(DIST_DIR, 'index.html') : path.join(DIST_DIR, `${p.replace(/^\//, '')}.html`);
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
