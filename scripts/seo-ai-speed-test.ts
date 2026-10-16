/**
 * Velem Gyere – Sebesség, SEO és AI Keresés (LLMO / GEO) Rendszerteszt
 * 
 * Átfogó automatizált ellenőrző csomag a modern webes és mesterséges intelligencia keresési
 * követelmények (Perplexity, SearchGPT, Google AI Overviews, Gemini, Lighthouse Web Vitals) szerint.
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  category: 'SPEED' | 'SEO' | 'AI_SEARCH';
  name: string;
  passed: boolean;
  message?: string;
  durationMs: number;
}

const results: TestResult[] = [];

function recordTest(
  category: 'SPEED' | 'SEO' | 'AI_SEARCH',
  name: string,
  passed: boolean,
  message?: string,
  startMs: number = Date.now()
) {
  const durationMs = Date.now() - startMs;
  results.push({ category, name, passed, message, durationMs });
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} [${category}] ${name} (${durationMs}ms)`);
  if (!passed && message) {
    console.log(`     Hiba / Megjegyzés: ${message}`);
  }
}

export async function runSeoAiSpeedTests() {
  console.log('\n======================================================');
  console.log('🚀 SEBESSÉG, SEO ÉS AI KERESÉS RENDSZERTESZT');
  console.log('======================================================');

  // ------------------------------------------------------------------
  // 1. SEBESSÉG ÉS TELJESÍTMÉNY TESZTEK (SPEED & WEB VITALS)
  // ------------------------------------------------------------------
  console.log('\n--- 1. SEBESSÉG ÉS TELJESÍTMÉNY (Speed & Core Web Vitals) ---');

  // Test 1.1: Production build és asset chunk struktúra
  let tStart = Date.now();
  const distDir = path.resolve('dist');
  const distExists = fs.existsSync(distDir);
  let hasChunks = false;
  let totalJsSizeKb = 0;
  let vendorReactFound = false;
  let vendorSupabaseFound = false;

  if (distExists) {
    const assetsDir = path.join(distDir, 'assets');
    if (fs.existsSync(assetsDir)) {
      const files = fs.readdirSync(assetsDir);
      hasChunks = files.some(f => f.endsWith('.js'));
      files.forEach(f => {
        if (f.endsWith('.js')) {
          const stats = fs.statSync(path.join(assetsDir, f));
          totalJsSizeKb += stats.size / 1024;
          if (f.startsWith('vendor-react')) vendorReactFound = true;
          if (f.startsWith('vendor-supabase')) vendorSupabaseFound = true;
        }
      });
    }
  }

  recordTest(
    'SPEED',
    'Gyártási csomagméret és modularizált kód-szétválasztás (Vite Code Splitting)',
    distExists && hasChunks && vendorReactFound && vendorSupabaseFound,
    `Megosztott chunkok: React vendor: ${vendorReactFound}, Supabase vendor: ${vendorSupabaseFound}, Összes JS méret: ${totalJsSizeKb.toFixed(1)} KB`,
    tStart
  );

  // Test 1.2: Preconnect és DNS Prefetch direktívák ellenőrzése
  tStart = Date.now();
  const indexHtmlPath = path.resolve('index.html');
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

  const hasGFontsPreconnect = indexHtml.includes('https://fonts.googleapis.com') && indexHtml.includes('rel="preconnect"');
  const hasGStaticPreconnect = indexHtml.includes('https://fonts.gstatic.com') && indexHtml.includes('crossorigin');
  const hasSupabasePreconnect = indexHtml.includes('https://ygdvpnxtxdnueoizltzk.supabase.co') && indexHtml.includes('rel="preconnect"');
  const hasSupabaseDnsPrefetch = indexHtml.includes('rel="dns-prefetch"');

  recordTest(
    'SPEED',
    'Kritikus hálózati erőforrás-kapcsolatok (DNS Prefetch & Preconnect a betűtípusokhoz és Supabase-hez)',
    hasGFontsPreconnect && hasGStaticPreconnect && hasSupabasePreconnect && hasSupabaseDnsPrefetch,
    'Hiányzik valamelyik preconnect vagy dns-prefetch bejegyzés a HTML fejrészből',
    tStart
  );

  // Test 1.3: Font-display swap a szöveg villogás (FOIT) elkerülésére
  tStart = Date.now();
  const hasFontDisplaySwap = indexHtml.includes('display=swap');
  recordTest(
    'SPEED',
    'Betűtípus betöltési optimalizáció (font-display=swap az FCP és LCP gyorsításához)',
    hasFontDisplaySwap,
    'Google Fonts link nem tartalmaz display=swap paramétert',
    tStart
  );

  // Test 1.4: Képek aszinkron és lusta betöltése (Lazy Loading & Async Decoding)
  tStart = Date.now();
  const programCardPath = path.resolve('src/components/ProgramCard.tsx');
  const programCardContent = fs.readFileSync(programCardPath, 'utf8');
  const hasLazyLoad = programCardContent.includes('loading="lazy"');
  const hasAsyncDecoding = programCardContent.includes('decoding="async"');

  recordTest(
    'SPEED',
    'Képek aszinkronizációja és késleltetett betöltése (loading="lazy" és decoding="async")',
    hasLazyLoad && hasAsyncDecoding,
    'A programkártyák képei nem rendelkeznek a megfelelő lazy/async attribútumokkal',
    tStart
  );


  // ------------------------------------------------------------------
  // 2. SEO (KERESŐOPTIMALIZÁLÁS) TESZTEK
  // ------------------------------------------------------------------
  console.log('\n--- 2. SEO (Search Engine Optimization) ---');

  // Test 2.1: Page Title hossz és márkanév ellenőrzése
  tStart = Date.now();
  const titleMatch = indexHtml.match(/<title>(.*?)<\/title>/);
  const pageTitle = titleMatch ? titleMatch[1] : '';
  const titleValidLength = pageTitle.length >= 30 && pageTitle.length <= 80;
  const titleHasBrand = pageTitle.includes('Velem Gyere');

  recordTest(
    'SEO',
    `Oldalcím (Page Title) optimalizált formátuma (${pageTitle.length} karakter, márkanévvel)`,
    titleValidLength && titleHasBrand,
    `Cím: "${pageTitle}" (${pageTitle.length} char)`,
    tStart
  );

  // Test 2.2: Meta Description hossza és vonzereje (120-160 char)
  tStart = Date.now();
  const descMatch = indexHtml.match(/<meta\s+name="description"\s+content="(.*?)"\s*\/?>/);
  const metaDesc = descMatch ? descMatch[1] : '';
  const descValidLength = metaDesc.length >= 100 && metaDesc.length <= 180;

  recordTest(
    'SEO',
    `Meta leírás (Meta Description) SERP megjelenéshez (${metaDesc.length} karakter)`,
    descValidLength,
    `Leírás hossza: ${metaDesc.length} karakter ("${metaDesc}")`,
    tStart
  );

  // Test 2.3: OpenGraph közösségi meta adatok teljessége
  tStart = Date.now();
  const hasOgTitle = indexHtml.includes('property="og:title"');
  const hasOgDesc = indexHtml.includes('property="og:description"');
  const hasOgImage = indexHtml.includes('property="og:image"');
  const hasOgUrl = indexHtml.includes('property="og:url"');
  const hasOgType = indexHtml.includes('property="og:type"');
  const hasOgLocale = indexHtml.includes('property="og:locale"');
  const hasOgSiteName = indexHtml.includes('property="og:site_name"');

  const ogComplete = hasOgTitle && hasOgDesc && hasOgImage && hasOgUrl && hasOgType && hasOgLocale && hasOgSiteName;
  recordTest(
    'SEO',
    'OpenGraph (Facebook / LinkedIn / Slack / iMessage) megosztási címkék',
    ogComplete,
    'Hiányzó OpenGraph címkék',
    tStart
  );

  // Test 2.4: Twitter / X Card meta adatok
  tStart = Date.now();
  const hasTwCard = indexHtml.includes('name="twitter:card"');
  const hasTwTitle = indexHtml.includes('name="twitter:title"');
  const hasTwDesc = indexHtml.includes('name="twitter:description"');
  const hasTwImage = indexHtml.includes('name="twitter:image"');

  recordTest(
    'SEO',
    'Twitter / X Card kártyák beállítása (summary_large_image)',
    hasTwCard && hasTwTitle && hasTwDesc && hasTwImage,
    'Hiányzó Twitter card címkék',
    tStart
  );

  // Test 2.5: Canonical link tag és Robots meta
  tStart = Date.now();
  const hasCanonical = indexHtml.includes('rel="canonical"');
  const hasRobotsMeta = indexHtml.includes('name="robots"');

  recordTest(
    'SEO',
    'Kánonikus URL (<link rel="canonical">) és Robot direktívák (<meta name="robots">)',
    hasCanonical && hasRobotsMeta,
    'Hiányzó kánonikus link vagy robots meta tag',
    tStart
  );

  // Test 2.6: Sitemap.xml és Robots.txt fájlok megléte és szintaktikája
  tStart = Date.now();
  const robotsTxtPath = path.resolve('public/robots.txt');
  const sitemapXmlPath = path.resolve('public/sitemap.xml');
  const robotsExists = fs.existsSync(robotsTxtPath);
  const sitemapExists = fs.existsSync(sitemapXmlPath);

  let robotsValid = false;
  let sitemapValid = false;

  if (robotsExists) {
    const robotsContent = fs.readFileSync(robotsTxtPath, 'utf8');
    robotsValid = robotsContent.includes('User-agent:') && robotsContent.includes('Sitemap:');
  }

  if (sitemapExists) {
    const sitemapContent = fs.readFileSync(sitemapXmlPath, 'utf8');
    sitemapValid = sitemapContent.includes('<urlset') && sitemapContent.includes('<loc>https://velemgyere.hu');
  }

  recordTest(
    'SEO',
    'Keresőrobot térkép és protokollfájlok (public/robots.txt és public/sitemap.xml)',
    robotsValid && sitemapValid,
    `robots.txt: ${robotsValid}, sitemap.xml: ${sitemapValid}`,
    tStart
  );


  // ------------------------------------------------------------------
  // 3. AI KERESÉS ÉS LLM OPTIMALIZÁLÁS (AI SEARCH / LLMO / GEO)
  // ------------------------------------------------------------------
  console.log('\n--- 3. AI KERESÉS ÉS LLM OPTIMALIZÁLÁS (GEO & LLMO) ---');

  // Test 3.1: public/llms.txt jelenléte és formátuma
  tStart = Date.now();
  const llmsTxtPath = path.resolve('public/llms.txt');
  const llmsExists = fs.existsSync(llmsTxtPath);
  let llmsFormatValid = false;

  if (llmsExists) {
    const llmsContent = fs.readFileSync(llmsTxtPath, 'utf8');
    llmsFormatValid = llmsContent.startsWith('# ') && llmsContent.includes('## ') && llmsContent.includes('> ');
  }

  recordTest(
    'AI_SEARCH',
    'Hivatalos llms.txt specifikáció (Perplexity, SearchGPT, Claude és Gemini számára)',
    llmsExists && llmsFormatValid,
    'A public/llms.txt nem létezik vagy nem követi a H1 + blockquote + szekciók formátumot',
    tStart
  );

  // Test 3.2: public/llms-full.txt mély tudásbázis
  tStart = Date.now();
  const llmsFullTxtPath = path.resolve('public/llms-full.txt');
  const llmsFullExists = fs.existsSync(llmsFullTxtPath);
  let llmsFullHasFaqAndModel = false;

  if (llmsFullExists) {
    const fullContent = fs.readFileSync(llmsFullTxtPath, 'utf8');
    llmsFullHasFaqAndModel = fullContent.includes('Gyakran Ismételt Kérdések') && 
      (fullContent.toLowerCase().includes('foglalási és fizetési') || fullContent.toLowerCase().includes('fizetési és foglalási'));
  }

  recordTest(
    'AI_SEARCH',
    'Részletes AI tudásbázis (public/llms-full.txt GYIK-kel és működési modellel)',
    llmsFullExists && llmsFullHasFaqAndModel,
    'Hiányzó vagy hiányos llms-full.txt',
    tStart
  );

  // Test 3.3: AI Crawler direktívák a robots.txt-ben
  tStart = Date.now();
  let aiCrawlersConfigured = false;
  if (robotsExists) {
    const robotsContent = fs.readFileSync(robotsTxtPath, 'utf8');
    aiCrawlersConfigured = robotsContent.includes('GPTBot') && 
                           robotsContent.includes('PerplexityBot') && 
                           robotsContent.includes('ClaudeBot') &&
                           robotsContent.includes('Google-Extended');
  }

  recordTest(
    'AI_SEARCH',
    'AI keresőbotok (GPTBot, PerplexityBot, ClaudeBot, Google-Extended) hozzáférése a robots.txt-ben',
    aiCrawlersConfigured,
    'A robots.txt nem tartalmazza az AI keresőmotorok nevesített direktíváit',
    tStart
  );

  // Test 3.4: Schema.org JSON-LD strukturált adat validáció
  tStart = Date.now();
  let jsonLdValid = false;
  let hasOrganization = false;
  let hasSearchAction = false;

  const jsonLdMatches = indexHtml.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
  for (const match of jsonLdMatches) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed['@context'] === 'https://schema.org') {
        jsonLdValid = true;
        const graph = parsed['@graph'] || [parsed];
        hasOrganization = graph.some((item: any) => item['@type'] === 'Organization');
        hasSearchAction = graph.some((item: any) => item['@type'] === 'WebSite' && item['potentialAction']);
      }
    } catch {
      // invalid json
    }
  }

  recordTest(
    'AI_SEARCH',
    'Schema.org JSON-LD strukturált szemantika (Organization + WebSite SearchAction az AI kivonatoláshoz)',
    jsonLdValid && hasOrganization && hasSearchAction,
    `JSON-LD valid: ${jsonLdValid}, Organization: ${hasOrganization}, SearchAction: ${hasSearchAction}`,
    tStart
  );

  // Test 3.5: Dinamikus útvonalankénti strukturált adatkezelés (useDocumentMeta hook kiterjesztés)
  tStart = Date.now();
  const useDocMetaPath = path.resolve('src/hooks/useDocumentMeta.ts');
  const useDocMetaContent = fs.readFileSync(useDocMetaPath, 'utf8');
  const supportsDynamicJsonLd = useDocMetaContent.includes('application/ld+json') && useDocMetaContent.includes('og:image');

  const progDetailPath = path.resolve('src/components/ProgramDetailView.tsx');
  const progDetailContent = fs.readFileSync(progDetailPath, 'utf8');
  const progDetailEmitsTouristTrip = progDetailContent.includes('TouristTrip') && progDetailContent.includes('AggregateRating');

  recordTest(
    'AI_SEARCH',
    'Dinamikus program részletező Schema.org entitás (TouristTrip, jegyárak, értékelések, szolgáltató)',
    supportsDynamicJsonLd && progDetailEmitsTouristTrip,
    'A ProgramDetailView nem generál dinamikus TouristTrip és AggregateRating JSON-LD sémát',
    tStart
  );

  // ------------------------------------------------------------------
  // ÖSSZESÍTÉS
  // ------------------------------------------------------------------
  console.log('\n======================================================');
  console.log('SEBESSÉG, SEO ÉS AI KERESÉS TESZT ÖSSZESÍTŐ');
  console.log('======================================================');

  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);

  console.log(`Összes teszt:   ${total}`);
  console.log(`Sikeres:        ${passed} ✅`);
  console.log(`Sikertelen:     ${failed} ❌`);
  console.log(`Összidő:        ${(totalDuration / 1000).toFixed(2)}s\n`);

  if (failed > 0) {
    console.error(`FIGYELEM: ${failed} teszt nem felelt meg az elvárásoknak!`);
    return false;
  } else {
    console.log('MINDEN SEBESSÉG, SEO ÉS AI KERESÉS TESZT KIVÁLÓAN SIKERÜLT! 🚀🏆');
    return true;
  }
}

// Ha közvetlenül futtatják
if (import.meta.url === `file://${process.argv[1]}`) {
  runSeoAiSpeedTests().then(ok => {
    if (!ok) process.exit(1);
  }).catch(err => {
    console.error('Kritikus hiba a teszt futtatása közben:', err);
    process.exit(1);
  });
}
