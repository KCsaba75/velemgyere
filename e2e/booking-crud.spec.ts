// Kanban 866cb61a (teszt-strategia, 3. kategoria: E2E CRUD). Végponttól
// végpontig foglalás (orders INSERT) a seedelt e2e-teszt-program-troodos
// programra: regisztracio -> elerhetoseg-ellenorzes -> foglalas-urlap ->
// checkout-modal "Tovabb a megerositeshez" -> "Foglalas sikeres!" + a
// foglalas megjelenik a Foglalasaim (/foglalasaim) listaban.
import { test, expect } from '@playwright/test';

function uniqueEmail() {
  return `e2e-booking-${Date.now()}-${Math.floor(Math.random() * 100000)}@test.local`;
}

test('bejelentkezett visitor vegig tudja vinni egy program lefoglalasat (CRUD: orders INSERT)', async ({ page }) => {
  const email = uniqueEmail();
  const name = 'E2E Foglalo Teszt';
  const password = 'e2e-test-pw-booking1';

  await page.goto('/');
  await page.getByRole('button', { name: 'Belépés / Regisztráció' }).click();
  await page.getByRole('button', { name: 'Regisztráció', exact: true }).click();
  await page.getByPlaceholder('Pl. Kovács Anna').fill(name);
  await page.getByPlaceholder('pl. anna@pelda.hu').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: /Regisztráció E-maillel/i }).click();
  await expect(page.getByText('Sikeres regisztráció és bejelentkezés!')).toBeVisible();
  await page.locator('button:has-text("✕")').click();

  await page.goto('/programok/e2e-teszt-program-troodos');
  await expect(page.getByRole('heading', { name: 'E2E Teszt Program - Troodos Tura' })).toBeVisible();

  // A seedelt programhoz nincs kulon idopont (program_occurrences sor), ezert a
  // reszvetel-folyam a program-szintu "Van meg szabad hely?" elerhetoseg-
  // ellenorzesen megy, nem az idopont-valasztason.
  await page.getByRole('button', { name: 'Van még szabad hely?' }).click();
  await expect(page.getByText(/szabad hely van|nincs létszámkorlát/i)).toBeVisible();

  await page.getByRole('button', { name: 'Érdekel a Program!' }).click();

  await expect(page.getByRole('heading', { name: 'Foglalás véglegesítése' })).toBeVisible();
  await page.getByRole('button', { name: 'Tovább a megerősítéshez' }).click();

  await expect(page.getByRole('heading', { name: 'Foglalás és fizetés megerősítve' })).toBeVisible();
  await expect(page.getByText('Foglalás sikeres!')).toBeVisible();

  await page.getByRole('button', { name: /Bezárás/i }).click();
  await page.goto('/foglalasaim');
  await expect(page.getByText('E2E Teszt Program - Troodos Tura')).toBeVisible();
});
