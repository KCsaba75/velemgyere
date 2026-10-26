/**
 * Kanban 866cb61a (teszt-strategia, 4. kategoria: "Lighthouse/Web Vitals (FCP,
 * LCP, SEO, a11y)"). A korabbi scripts/seo-ai-speed-test.ts ezt CSAK statikus
 * fajl-heurisztikaval "mérte" (van-e vendor-react chunk, van-e robots.txt) --
 * soha nem futtatott VALODI Lighthouse-t, nem merte a tenyleges FCP/LCP-t vagy
 * a11y pontszamot. Ez a script tenyleges Lighthouse auditot futtat egy mar
 * elinditott `vite preview` (production build) szerver ellen -- a `vite dev`
 * ellen futtatva irrelevans, 25-50 masodperces FCP/LCP ertekeket adna
 * (unbundled, on-demand modul-transzformacio miatt), lasd a DEFAULT_URLS
 * kommentjet.
 *
 * NEM a chrome-launcher csomag sajat launch()-jat hasznalja: az `is-wsl`
 * detektalja ezt a gepet WSL-kent, es a makeTmpDir()/platform-agazata ilyenkor
 * egy Windows %LOCALAPPDATA%-utat probal epiteni a PATH-bol (amin itt nincs
 * ilyen minta), es ha ezt explicit userDataDir-rel meg is kerultuk, a
 * tavoli-debug portjat is mashogy, megbizhatatlanul kezeli WSL-en -- ECONNREFUSED-
 * et adott kozvetlenul a sajat maga inditotta Chrome-hoz is. A Chrome-ot ezert
 * KEZZEL inditjuk, fix debug-porttal, es csak a portot adjuk at a lighthouse-nak.
 *
 * Hasznalat: elobb `npm run build && npm run preview` egy masik terminalban/
 * backgroundban, majd `npm run test:lighthouse` (opcionalisan egy URL
 * argumentummal, ha mas portot/oldalt akarsz meresre).
 */
import * as fs from 'fs';
import { spawn, execSync, type ChildProcess } from 'child_process';

const DEBUG_PORT = 9322;

function findChromePath(): string {
  const result = execSync(
    `find "${process.env.HOME}/.cache/ms-playwright" -maxdepth 4 -type f -name chrome | head -1`
  ).toString().trim();
  if (!result) throw new Error('Nem talalhato Chromium binaris -- futtasd: npx playwright install chromium');
  return result;
}

async function waitForDebugPort(port: number, timeoutMs = 10_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return;
    } catch {
      // meg nem all keszen, probaljuk ujra
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Chrome debug port (${port}) nem allt keszen ${timeoutMs}ms alatt.`);
}

function launchChrome(): ChildProcess {
  const chromePath = findChromePath();
  // Egyedi profil-mappa minden inditashoz (nem ujrahasznositott fix ut) --
  // ismetelt futasoknal az előző Chrome kilovese utan meg nehany fajl-leiro
  // nyitva maradhat egy pillanatra, es egy megosztott fix mappa torlese
  // ilyenkor ENOTEMPTY-vel elszallhat.
  const profileDir = fs.mkdtempSync('/tmp/lighthouse-chrome-profile-');
  return spawn(
    chromePath,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${profileDir}`,
      'about:blank',
    ],
    { stdio: 'ignore' }
  );
}

// Alapertelmezett kulcs-oldalak, ha nincs explicit URL argumentum -- a kezdolap
// (katalogus) es egy program-reszletezo oldal (az utobbi azert fontos kulon,
// mert a kanban 866cb61a kritikus crash-fixje pont itt volt, lasd commit
// 400ac1e -- erdemes kulon latni hogy ez az oldal is egeszseges).
//
// FONTOS: ezek a `vite preview` szervert celozzak (alapertelmezett port 4173),
// NEM a `vite dev`-et. A dev-szerver unbundled, on-demand modul-transzformacioja
// miatt a Performance-meres ott iranyadohoz kepest teljesen irrelevans (25-50
// MASODPERCES FCP/LCP-t adott, szemben a preview/production build ~2-4
// masodperces, realisztikus ertekevel) -- eloszor futtasd: `npm run build &&
// npm run preview`.
const DEFAULT_URLS = ['http://127.0.0.1:4173/', 'http://127.0.0.1:4173/programok/e2e-teszt-program-troodos'];

async function auditOne(lighthouse: typeof import('lighthouse').default, url: string): Promise<boolean> {
  const chromeProcess = launchChrome();
  try {
    await waitForDebugPort(DEBUG_PORT);

    const result = await lighthouse(url, {
      port: DEBUG_PORT,
      output: 'json',
      onlyCategories: ['performance', 'accessibility', 'seo', 'best-practices'],
    });

    if (!result) {
      console.error('Lighthouse nem adott eredmenyt.');
      return false;
    }

    const lhr = result.lhr;
    if (lhr.runtimeError) {
      console.error('Lighthouse runtime hiba:', lhr.runtimeError.code, lhr.runtimeError.message);
      return false;
    }

    const categories = lhr.categories;
    const audits = lhr.audits;

    const scores = {
      performance: Math.round((categories.performance?.score || 0) * 100),
      accessibility: Math.round((categories.accessibility?.score || 0) * 100),
      seo: Math.round((categories.seo?.score || 0) * 100),
      bestPractices: Math.round((categories['best-practices']?.score || 0) * 100),
    };

    const fcp = audits['first-contentful-paint']?.numericValue;
    const lcp = audits['largest-contentful-paint']?.numericValue;

    console.log(`\nURL: ${url}`);
    console.log(`Performance:     ${scores.performance}/100`);
    console.log(`Accessibility:   ${scores.accessibility}/100`);
    console.log(`SEO:             ${scores.seo}/100`);
    console.log(`Best Practices:  ${scores.bestPractices}/100`);
    console.log(`FCP:             ${fcp ? Math.round(fcp) + 'ms' : 'n/a'}`);
    console.log(`LCP:             ${lcp ? Math.round(lcp) + 'ms' : 'n/a'}`);

    fs.mkdirSync('lighthouse-reports', { recursive: true });
    const safeName = new URL(url).pathname.replace(/\//g, '_') || 'home';
    const reportPath = `lighthouse-reports/${safeName}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(lhr, null, 2));
    console.log(`Teljes riport: ${reportPath}`);

    const MIN = { performance: 50, accessibility: 80, seo: 80, bestPractices: 70 };
    const failures = Object.entries(MIN).filter(([key, min]) => scores[key as keyof typeof scores] < min);

    if (failures.length > 0) {
      console.error('❌ Küszöb alatt:', failures.map(([k, min]) => `${k} (${scores[k as keyof typeof scores]} < ${min})`).join(', '));
      return false;
    }
    console.log('✅ Minden kategoria a minimum-kuszob felett.');
    return true;
  } finally {
    chromeProcess.kill();
  }
}

async function main() {
  const { default: lighthouse } = await import('lighthouse');
  const urls = process.argv[2] ? [process.argv[2]] : DEFAULT_URLS;

  let allOk = true;
  for (const url of urls) {
    const ok = await auditOne(lighthouse, url);
    allOk = allOk && ok;
    console.log('------------------------------------------------------------');
  }
  process.exitCode = allOk ? 0 : 1;
}

main().catch((err) => {
  console.error('Lighthouse audit hiba:', err);
  process.exit(1);
});
