// Kanban f2d93218 (kepek atheylezese valodi Storage-ba + sebesseg-optimalizalas).
// Igazolja, hogy egy valodi fajl-feltoltes a NewProgramModal-ban mar NEM base64
// data-URL-t general (a korabbi FileReader.readAsDataURL viselkedes), hanem a
// valodi Supabase Storage-ba toltodik fel (kliens-oldali resize+WebP-konverzio
// utan), es a preview <img> src-je egy valodi http(s) Storage-URL, nem "data:".
import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function uniqueEmail() {
  return `e2e-imgupload-${Date.now()}@test.local`;
}

test('program-kep feltoltese a NewProgramModal-ban valodi Storage URL-t ad, nem base64 data-URL-t', async ({ page }) => {
  // Friss szolgaltatoi regisztracio az UI-n keresztul (nem elore-seedelt auth
  // user -- annak a jelszo-hash-e nem bizonyult GoTrue-kompatibilisnek direkt
  // SQL-beszurasnal). Lokalisan az email-megerosites ki van kapcsolva, igy a
  // registerProvider() azonnali session-t ad, es a b9f12422-es signup-trigger
  // rogton letrehozza a providers/profiles sort.
  await page.goto('/');
  await page.getByRole('button', { name: 'Belépés / Regisztráció' }).click();
  await page.getByRole('button', { name: 'Szolgáltatói regisztráció' }).click();
  // A "Szolgáltatói regisztráció" link csak a provider-landing nezetre visz --
  // onnan egy MASIK, "Regisztráció" gomb nyitja meg a tenyleges urlapot.
  await page.getByRole('button', { name: 'Regisztráció', exact: true }).click();

  await page.getByPlaceholder('Pl. Mecsek Kalandorok Kft.').fill('E2E Kep Teszt Kft');
  await page.getByPlaceholder('Pl. Kis Tamás').fill('E2E Teszt Kontakt');
  await page.getByPlaceholder('info@kalandorok.hu').fill(uniqueEmail());
  await page.getByPlaceholder('+36 30 123 4567').fill('+36301234567');
  await page.getByPlaceholder('Milyen kirándulásokat, túrákat vagy élményeket szerveztek, mióta tevékenykedtek a területen?').fill('E2E teszt leiras a kep-feltoltes tesztjehez.');
  await page.getByPlaceholder('••••••••').fill('e2e-test-pw-imgupload1');
  await page.getByRole('button', { name: 'Szolgáltatói regisztráció elküldése' }).click();

  // A gomb csak a sikeres-regisztracio modalt zarja, nem navigal onmagatol --
  // a dashboardra explicit navigalunk, de ELOSZOR megvarjuk hogy a profil-
  // allapot (currentUser.role==='provider') tenyleg beallt-e, kulonben a
  // ProtectedRoute meg regi (visitor) szereppel latja es elutasitja.
  await page.getByRole('button', { name: 'Belépés a Szolgáltatói Dashboardra' }).click();
  await expect(page.getByRole('button', { name: 'Belépés / Regisztráció' })).not.toBeVisible({ timeout: 15_000 });

  // A Navbar "Dashboard" gombjaval navigalunk (nem kozvetlen URL-re), igy az
  // app sajat view-allapota es a ProtectedRoute szerep-ellenorzese konzisztens
  // uton mukodik, nem fut bele semmilyen kulon kliens-oldali redirect-logikaba.
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await expect(page).toHaveURL(/\/szolgaltato\/dashboard/, { timeout: 10_000 });
  await page.getByRole('button', { name: '+ Új program' }).first().click();

  const fileInput = page.locator('input[type="file"][accept="image/*"]');
  await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'test-upload-image.png'));

  // A feltoltes-folyamat alatt megjelenik a "Kép feltöltése és optimalizálása"
  // allapot-jelzes, majd egy uj preview <img> kerul a listaba Storage URL-lel.
  const previewImages = page.locator('img[alt=""]');
  await expect
    .poll(async () => {
      const count = await previewImages.count();
      for (let i = 0; i < count; i++) {
        const src = await previewImages.nth(i).getAttribute('src');
        if (src && src.includes('/storage/v1/object/public/program-images/')) return true;
      }
      return false;
    }, { timeout: 15_000 })
    .toBe(true);

  // Semelyik preview kep se maradjon base64 data-URL (a regi, javitando viselkedes).
  const count = await previewImages.count();
  for (let i = 0; i < count; i++) {
    const src = await previewImages.nth(i).getAttribute('src');
    expect(src?.startsWith('data:')).toBe(false);
  }
});
