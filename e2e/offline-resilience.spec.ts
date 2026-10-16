// Kanban 866cb61a (teszt-strategia, 4. kategoria): "Offline/reconnect
// szimulacio". A helyfoglalas elerhetoseg-ellenorzese (checkProgramAvailability)
// halozati hiba eseten NEM dob kivetelt a hivonak -- a supabase-js .rpc() a
// hibat {error} objektumkent adja vissza, amit az AppContext mar elkap es
// null-ra bont -- de ezt korabban soha senki nem igazolta VALODI offline
// szimulacioval, csak a kod olvasasbol kovetkeztettunk ra.
import { test, expect } from '@playwright/test';

test('offline allapotban az elerhetoseg-ellenorzes barati hibauzenetet ad, nem fagy le/crashel, es online visszateresnel ujra mukodik', async ({ page, context }) => {
  const email = `e2e-offline-${Date.now()}@test.local`;
  const name = 'E2E Offline Teszt';
  const password = 'e2e-test-pw-offline1';

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

  // Halozat megszakitasa, MIELOTT az elerhetoseg-ellenorzest elinditanank.
  await context.setOffline(true);

  await page.getByRole('button', { name: 'Van még szabad hely?' }).click();

  // Barati hibauzenet, NEM white-screen/crash, NEM vegtelen "Ellenőrzés..." pörgés.
  await expect(page.getByText('Nem sikerült lekérni az elérhetőséget, próbáld újra.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'E2E Teszt Program - Troodos Tura' })).toBeVisible();

  // Halozat visszaall, uj proba (page reload-dal, mert az aktualis render-fa
  // az egyszer mar lezart availabilityChecked miatt nem ad ujra gombot --
  // ez kulon finomitasi lehetoseg, lasd kanban-komment).
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'E2E Teszt Program - Troodos Tura' })).toBeVisible();
  await page.getByRole('button', { name: 'Van még szabad hely?' }).click();
  await expect(page.getByText(/szabad hely van|nincs létszámkorlát/i)).toBeVisible();
});
