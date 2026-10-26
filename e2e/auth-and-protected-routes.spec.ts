// Kanban 866cb61a (teszt-strategia, 3. kategoria: E2E, Playwright).
// A LOKALIS Supabase CLI stacket celozza (lasd playwright.config.ts +
// .env.e2e.local) -- SOHA production ellen nem futtatando.
//
// Lefedi Csaba 3. kategoria kereset az "auth flow" + "protected routes" reszben:
// regisztracio (email-megerositessel kikapcsolva lokalisan -> azonnali
// bejelentkezes), kijelentkezes, protected route redirect, session-perzisztencia
// reload utan. A fajl-/kep-feltoltes CRUD resz KIHAGYVA -- a projektben jelenleg
// 0 storage bucket letezik (lasd kanban-komment), nincs mit vegponttol-vegpontig
// tesztelni, amig Csaba nem dont a Storage-infrastruktura megepiteserol.
import { test, expect } from '@playwright/test';

function uniqueEmail() {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 100000)}@test.local`;
}

test.describe('Auth flow -- regisztracio, bejelentkezes, kijelentkezes', () => {
  test('uj visitor regisztracioja utan a Navbar bejelentkezett allapotot mutat, majd kijelentkezes utan visszaall', async ({ page }) => {
    const email = uniqueEmail();
    const name = 'E2E Teszt Látogató';
    const password = 'e2e-test-pw-123456';

    await page.goto('/');

    await page.getByRole('button', { name: 'Belépés / Regisztráció' }).click();
    await page.getByRole('button', { name: 'Regisztráció', exact: true }).click();

    await page.getByPlaceholder('Pl. Kovács Anna').fill(name);
    await page.getByPlaceholder('pl. anna@pelda.hu').fill(email);
    await page.getByPlaceholder('••••••••').fill(password);
    await page.getByRole('button', { name: /Regisztráció E-maillel/i }).click();

    await expect(page.getByText('Sikeres regisztráció és bejelentkezés!')).toBeVisible();

    // Modal bezarasa (sima "X" gomb), utana a Navbar-nak mar a bejelentkezett
    // profil-gombot kell mutatnia, nem a "Belépés / Regisztráció"-t.
    await page.locator('button:has-text("✕")').click();
    await expect(page.getByRole('button', { name: 'Belépés / Regisztráció' })).not.toBeVisible();
    await expect(page.getByTitle(`Profil: ${name}`)).toBeVisible();

    // Kijelentkezes a Sajat fiokom oldalrol.
    await page.getByTitle(`Profil: ${name}`).click();
    await expect(page).toHaveURL(/\/sajat-fiokom/);
    await expect(page.getByRole('heading', { name: 'Saját fiókom' })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();

    await page.getByRole('button', { name: 'Kijelentkezés' }).click();
    await expect(page.getByRole('button', { name: 'Belépés / Regisztráció' })).toBeVisible();
  });

  test('bejelentkezes utan reload-ra is megmarad a session (perzisztencia)', async ({ page }) => {
    const email = uniqueEmail();
    const name = 'E2E Perzisztencia Teszt';
    const password = 'e2e-test-pw-654321';

    await page.goto('/');
    await page.getByRole('button', { name: 'Belépés / Regisztráció' }).click();
    await page.getByRole('button', { name: 'Regisztráció', exact: true }).click();
    await page.getByPlaceholder('Pl. Kovács Anna').fill(name);
    await page.getByPlaceholder('pl. anna@pelda.hu').fill(email);
    await page.getByPlaceholder('••••••••').fill(password);
    await page.getByRole('button', { name: /Regisztráció E-maillel/i }).click();
    await expect(page.getByText('Sikeres regisztráció és bejelentkezés!')).toBeVisible();
    await page.locator('button:has-text("✕")').click();
    await expect(page.getByTitle(`Profil: ${name}`)).toBeVisible();

    await page.reload();

    await expect(page.getByTitle(`Profil: ${name}`)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Belépés / Regisztráció' })).not.toBeVisible();
  });
});

test.describe('Protected routes', () => {
  test('kijelentkezve a /sajat-fiokom-ra navigalva a kezdolapra (/) iranyit', async ({ page }) => {
    await page.goto('/sajat-fiokom');
    await expect(page).toHaveURL('/');
  });

  test('kijelentkezve a /admin-ra navigalva is a kezdolapra iranyit', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL('/');
  });
});
