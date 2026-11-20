// Kanban ca9129b7 -- Erdeklodesek lap torlese + uj Foglaltlista lap.
// Zora dontesek: A) cancelled kimarad, B) kozos-modal bulk-uzenet, C) tobb-
// mailto-ra bontas, D) orders.attended rendeles-szinten.
// A szukseges idopont+manualis foglalas a e2e/fixtures/seed-local.sql-ben
// van (e2e00000-0000-4000-8000-000000000005/000006) -- nem kell a tesztben
// uj idopontot generalni, igy ez a suite CSAK a Foglaltlista oldal sajat
// logikajat vizsgalja (mar masutt igazolt idopont-generalas helyett).
import { test, expect } from '@playwright/test';

async function loginAsE2eProvider(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Belépés / Regisztráció' }).click();
  await page.getByPlaceholder('pl. anna@pelda.hu').fill('e2e-provider@test.local');
  await page.getByPlaceholder('••••••••').fill('e2e-test-pw-123');
  await page.getByRole('button', { name: /Belépés E-maillel/i }).click();
  await expect(page.getByRole('button', { name: 'Belépés / Regisztráció' })).not.toBeVisible();
}

test('sidebar + attekintes a Foglaltlistat mutatja, nem a torolt Erdeklodeseket', async ({ page }) => {
  await loginAsE2eProvider(page);
  await page.goto('/szolgaltato/attekintes');
  await expect(page.getByRole('button', { name: 'Foglaltlista' }).first()).toBeVisible();
  await expect(page.getByText('Érdeklődések')).toHaveCount(0);
});

test('foglaltlista: manualis foglalas megjelenik, megjelent-jeloles perzisztens, mailto es print-viselkedes helyes', async ({ page }) => {
  await loginAsE2eProvider(page);
  await page.goto('/szolgaltato/foglaltlista');
  await page.getByRole('combobox').first().selectOption({ label: 'E2E Foglaltlista Teszt Program' });

  await expect(page.getByText('E2E Foglaltlista Teszt Vendég')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('e2e-vendeg@test.local')).toBeVisible();
  await expect(page.getByText('+36301234567')).toBeVisible();
  await expect(page.getByText(/Összlétszám: \d+ fő/)).toBeVisible();

  // Megjelent-jeloles -- perzisztens (reload utan is megmarad).
  const row = page.locator('tbody tr', { hasText: 'E2E Foglaltlista Teszt Vendég' });
  const attendedBtn = row.getByRole('button', { name: /megjelen/i });
  await attendedBtn.click();
  await page.waitForTimeout(500);
  await page.reload();
  await page.getByRole('combobox').first().selectOption({ label: 'E2E Foglaltlista Teszt Program' });
  await expect(page.getByText('E2E Foglaltlista Teszt Vendég')).toBeVisible({ timeout: 10000 });
  const rowAfterReload = page.locator('tbody tr', { hasText: 'E2E Foglaltlista Teszt Vendég' });
  await expect(rowAfterReload.getByRole('button', { name: 'Megjelent -- kattints a visszavonáshoz' })).toBeVisible();
  // Vissza-allitom, hogy a kovetkezo teszt-futas ugyanonnan induljon.
  await rowAfterReload.getByRole('button', { name: 'Megjelent -- kattints a visszavonáshoz' }).click();

  // Soronkenti Email gomb -- mailto: href a sorhoz tartozo cimre.
  await expect(rowAfterReload.locator('a[href="mailto:e2e-vendeg@test.local"]')).toBeVisible();

  // Manualis foglalasnal nincs Uzenet gomb (nincs valodi felhasznaloi fiok mogotte).
  await expect(rowAfterReload.getByTitle('Üzenet küldése')).toHaveCount(0);

  // Print-nezetben a gomb-oszlopok eltunnek, a jelolonegyzet-oszlop marad.
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('button', { name: 'Üzenet mindenkinek' })).not.toBeVisible();
  await expect(rowAfterReload.locator('a[href="mailto:e2e-vendeg@test.local"]')).not.toBeVisible();
  await expect(rowAfterReload.getByRole('button', { name: /megjelen/i })).toBeVisible();
  await page.emulateMedia({ media: 'screen' });
});

test('foglaltlista: "Email mindenkinek" mailto BCC-linket ad', async ({ page }) => {
  await loginAsE2eProvider(page);
  await page.goto('/szolgaltato/foglaltlista');
  await page.getByRole('combobox').first().selectOption({ label: 'E2E Foglaltlista Teszt Program' });
  await expect(page.getByText('E2E Foglaltlista Teszt Vendég')).toBeVisible({ timeout: 10000 });
  const emailAllLink = page.getByRole('link', { name: /Email mindenkinek/ });
  await expect(emailAllLink).toBeVisible();
  const href = await emailAllLink.getAttribute('href');
  expect(href).toContain('mailto:?bcc=');
  expect(href).toContain(encodeURIComponent('e2e-vendeg@test.local'));
});

test('foglaltlista: "Uzenet mindenkinek" modal nyilik es bezarhato', async ({ page }) => {
  await loginAsE2eProvider(page);
  await page.goto('/szolgaltato/foglaltlista');
  await page.getByRole('combobox').first().selectOption({ label: 'E2E Foglaltlista Teszt Program' });
  await expect(page.getByText('E2E Foglaltlista Teszt Vendég')).toBeVisible({ timeout: 10000 });

  await page.getByRole('button', { name: 'Üzenet mindenkinek' }).click();
  await expect(page.getByRole('heading', { name: 'Üzenet mindenkinek' })).toBeVisible();
  await page.getByRole('button', { name: 'Bezárás' }).click();
  await expect(page.getByRole('heading', { name: 'Üzenet mindenkinek' })).not.toBeVisible();
});

test('foglaltlista: platform-foglalasnal van Uzenet gomb, es a bulk-uzenet tenylegesen elmegy hozza', async ({ page }) => {
  await loginAsE2eProvider(page);
  await page.goto('/szolgaltato/foglaltlista');
  await page.getByRole('combobox').first().selectOption({ label: 'E2E Foglaltlista Teszt Program' });

  // A platform-eredetu sor (profiles.name a seedbol: "e2e-provider") VAN
  // Uzenet gombja, a manualis sornak NINCS.
  const platformRow = page.locator('tbody tr', { hasText: 'e2e-provider' });
  await expect(platformRow).toBeVisible({ timeout: 10000 });
  await expect(platformRow.getByTitle('Üzenet küldése')).toBeVisible();

  await page.getByRole('button', { name: 'Üzenet mindenkinek' }).click();
  await page.getByPlaceholder('Írd ide az üzenetet...').fill('E2E bulk teszt üzenet');
  await page.getByRole('button', { name: 'Küldés', exact: true }).click();
  await expect(page.getByText(/1 foglalónak elküldve/)).toBeVisible({ timeout: 10000 });

  // A sajat (BookingDetailModal-beli) uzenofolyamban is megjelenik -- a panel
  // alapertelmezetten osszecsukva nyilik, elobb ki kell nyitni.
  await page.getByRole('button', { name: 'Bezárás' }).click();
  await platformRow.getByTitle('Üzenet küldése').click();
  await page.getByRole('button', { name: /Üzenet (az igénybevevőnek|a szolgáltatónak)/ }).click();
  await expect(page.getByText('E2E bulk teszt üzenet').first()).toBeVisible({ timeout: 10000 });
});
