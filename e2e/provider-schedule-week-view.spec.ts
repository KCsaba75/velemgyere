// Kanban fe350dd4 -- Iranyitopult: Napi nezet torlese + Heti nezet vegtelen
// gorgetesse (1 honap elore), rogzitett fejlec/szuro. Zora A/B/C dontese:
// A) csak elore-iranyu vegtelen gorgetes, B) kezdetben ~4 het majd 2-esevel,
// felso korlat ~12 het, C) a het-nav+program-szuro sav es a dashboard fejlec
// egyutt sticky marad gorgetes kozben.
import { test, expect } from '@playwright/test';

async function loginAsE2eProvider(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Belépés / Regisztráció' }).click();
  await page.getByPlaceholder('pl. anna@pelda.hu').fill('e2e-provider@test.local');
  await page.getByPlaceholder('••••••••').fill('e2e-test-pw-123');
  await page.getByRole('button', { name: /Belépés E-maillel/i }).click();
  await expect(page.getByRole('button', { name: 'Belépés / Regisztráció' })).not.toBeVisible();
}

test('a Nap nezet gomb el van tavolitva a nezet-valtobol', async ({ page }) => {
  await loginAsE2eProvider(page);
  await page.goto('/szolgaltato/iranyitopult');
  await expect(page.getByRole('button', { name: 'Havi nézet' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hét nézet', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lista nézet' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nap nézet' })).toHaveCount(0);
});

test('mobilon (uj latogato, nincs mentett nezet) a Het nezet az alapertelmezett, nem a torolt Nap nezet', async ({ page }) => {
  await loginAsE2eProvider(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/szolgaltato/iranyitopult');
  await expect(page.getByRole('button', { name: 'Hét nézet', exact: true })).toHaveClass(/bg-white/);
});

test('het nezet: az aktualis het es az aktualis nap megkulonboztetve kiemelve', async ({ page }) => {
  await loginAsE2eProvider(page);
  await page.goto('/szolgaltato/iranyitopult');
  await page.getByRole('button', { name: 'Hét nézet', exact: true }).click();

  // Het-szintu kiemeles: az "Ez a het" jelzo-badge (nem a nav-gomb) csak az
  // elso (aktualis) het-szekcion jelenik meg.
  await expect(page.locator('span.bg-emerald-600', { hasText: 'Ez a hét' })).toBeVisible();
  // Nap-szintu kiemeles: a mai oszlop a sajat kis emerald pöttyel kulonul el
  // a het tobbi (nem-mai) napjatol -- lasd DayColumn isToday jelzese.
  await expect(page.locator('span.bg-emerald-500.rounded-full').first()).toBeVisible();
});

test('het nezet: lefele gorgetve tobb het toltodik be (vegtelen gorgetes elore)', async ({ page }) => {
  await loginAsE2eProvider(page);
  await page.goto('/szolgaltato/iranyitopult');
  await page.getByRole('button', { name: 'Hét nézet', exact: true }).click();
  await page.waitForTimeout(300);

  const weekSections = page.locator('[class*="scroll-mt-"]');
  const initialCount = await weekSections.count();
  expect(initialCount).toBeGreaterThanOrEqual(4);

  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, 3000);
    await page.waitForTimeout(300);
  }

  const afterScrollCount = await weekSections.count();
  expect(afterScrollCount).toBeGreaterThan(initialCount);
});

test('het nezet: Elozo/Kovetkezo/Ez a het gombok a megfelelo het-szekciora navigalnak, Elozo az elso hetnel tiltott', async ({ page }) => {
  await loginAsE2eProvider(page);
  await page.goto('/szolgaltato/iranyitopult');
  await page.getByRole('button', { name: 'Hét nézet', exact: true }).click();
  await page.waitForTimeout(300);

  const prevBtn = page.getByRole('button', { name: 'Előző hét' });
  const nextBtn = page.getByRole('button', { name: 'Következő hét' });
  const weekLabel = page.locator('span.font-display');

  await expect(prevBtn).toBeDisabled();
  const firstLabel = (await weekLabel.textContent())?.trim();

  await nextBtn.click();
  await page.waitForTimeout(600);
  await expect(prevBtn).toBeEnabled();
  const secondLabel = (await weekLabel.textContent())?.trim();
  expect(secondLabel).not.toEqual(firstLabel);

  await page.getByRole('button', { name: 'Ez a hét', exact: true }).click();
  await page.waitForTimeout(600);
  await expect(prevBtn).toBeDisabled();
  const backToFirstLabel = (await weekLabel.textContent())?.trim();
  expect(backToFirstLabel).toEqual(firstLabel);
});

test('het nezet: a het-nav+szuro sav es a dashboard fejlec sticky marad gorgetes kozben', async ({ page }) => {
  await loginAsE2eProvider(page);
  await page.goto('/szolgaltato/iranyitopult');
  await page.getByRole('button', { name: 'Hét nézet', exact: true }).click();
  await page.waitForTimeout(300);

  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(400);

  const dashHeader = await page.getByTestId('week-sticky-header').boundingBox();
  const weekNav = await page.getByTestId('week-sticky-navbar').boundingBox();
  expect(dashHeader).not.toBeNull();
  expect(weekNav).not.toBeNull();
  // Sticky elemek gorgetes utan is a viewport tetejehez kozeli, rogzitett
  // pozicioban maradnak (nem a dokumentum-folyasbeli, lefele tolodott helyen).
  expect(dashHeader!.y).toBeLessThan(150);
  expect(weekNav!.y).toBeLessThan(250);
  // A ket sticky sav nem fedi egymast (weekNav a dashHeader ALATT kezdodik).
  expect(weekNav!.y).toBeGreaterThanOrEqual(dashHeader!.y + dashHeader!.height - 2);
});

test('havi nezet (default desktop) erintetlen marad -- nincs het-specifikus sticky elem', async ({ page }) => {
  await loginAsE2eProvider(page);
  await page.goto('/szolgaltato/iranyitopult');
  await expect(page.getByRole('button', { name: 'Havi nézet' })).toHaveClass(/bg-white/);
  // A het-nezet sticky fejlece/szuro-savja csak viewMode==='week'-ben renderelodik.
  await expect(page.getByTestId('week-sticky-header')).toHaveCount(0);
  await expect(page.getByTestId('week-sticky-navbar')).toHaveCount(0);
});
