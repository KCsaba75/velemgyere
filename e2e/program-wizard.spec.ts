// Kanban 6171b71e -- UJ program letrehozasa varazslo-folyammal
// (ProgramEditorModal.tsx). A seedelt e2e-provider@test.local fiokkal
// bejelentkezve vegigmegy az 5 wizard-lepesen, es ellenorzi:
// - a lepes-sorrendet es a Vissza/Elore navigaciot
// - hogy occurrence nelkul a "Mentes es kozzetetel" gomb letiltott (Zora
//   dontese A), de a "Mentes piszkozatkent" mindig elerheto
// - hogy a meglevo program szerkesztesenel (ProviderProgramsPage "Szerkesztes")
//   a REGI, szabadon ugralhato fules nezet marad -- nincs wizard-progress sav.
import { test, expect } from '@playwright/test';

async function loginAsE2eProvider(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Belépés / Regisztráció' }).click();
  await page.getByPlaceholder('pl. anna@pelda.hu').fill('e2e-provider@test.local');
  await page.getByPlaceholder('••••••••').fill('e2e-test-pw-123');
  await page.getByRole('button', { name: /Belépés E-maillel/i }).click();
  await expect(page.getByRole('button', { name: 'Belépés / Regisztráció' })).not.toBeVisible();
}

test('uj program wizard: lepesenkenti navigacio + occurrence-gate a zaro lepesen', async ({ page }) => {
  await loginAsE2eProvider(page);

  await page.goto('/szolgaltato/programjaim');
  await page.getByRole('button', { name: '+ Új program', exact: true }).click();

  // 1. lepes: Alapadatok -- wizard-progress sav lathato, nem a regi kattinthato tab-sav.
  await expect(page.getByTestId('wizard-progress')).toBeVisible();
  await expect(page.getByTestId('editor-tab-basic')).not.toBeVisible();

  await page.getByPlaceholder('Pl. Troodos-hegység & Kykkos kolostor kirándulás magyarul').fill('E2E Wizard Teszt Program');
  await page.getByPlaceholder('1-2 mondatos kedvcsináló a külföldi élményről...').fill('E2E wizard rövid leírás.');
  await page.getByPlaceholder('Írd le a teljes útitervet, megállókat, praktikus tudnivalókat...').fill('E2E wizard részletes leírás.');
  await page.getByPlaceholder('Pl. Barcelona, Spanyolország vagy Ayia Napa, Ciprus').fill('E2E Teszt Helyszín');
  await page.getByPlaceholder('Pl. Szállodai felvétel vagy Sagrada Família bejárat').fill('E2E Teszt Találkozási pont');

  await page.getByRole('button', { name: 'Tovább', exact: true }).click();

  // 2. lepes: Arazas -- a draft mar letrejott, a lepes-fej jelzi az 1. lepest kesznek.
  await expect(page.getByTestId('wizard-step-pricing')).toBeVisible();
  await page.getByRole('button', { name: 'Tovább', exact: true }).click();

  // 3. lepes: Idopontok -- occurrence nelkul is tovabb lehet lepni (Zora dontes A).
  await expect(page.getByTestId('wizard-step-occurrences')).toBeVisible();
  await page.getByRole('button', { name: 'Tovább', exact: true }).click();

  // 4. lepes: Elonezet -- statikus ProgramCard-stilusu kartya, a bevitt cimmel.
  await expect(page.getByTestId('wizard-step-preview')).toBeVisible();
  await expect(page.getByText('E2E Wizard Teszt Program')).toBeVisible();
  await expect(page.getByText('ELŐNÉZET', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tovább', exact: true }).click();

  // 5. lepes: Zaro dontes -- publikalas gomb letiltva occurrence nelkul, piszkozat nem.
  await expect(page.getByTestId('wizard-step-confirm')).toBeVisible();
  const publishBtn = page.getByRole('button', { name: 'Mentés és közzététel' });
  const draftBtn = page.getByRole('button', { name: 'Mentés piszkozatként' });
  await expect(publishBtn).toBeDisabled();
  await expect(draftBtn).toBeEnabled();

  // Vissza az Idopontok lepesre, generaljunk 1 idopontot, majd ujra elore a zaro lepesig.
  await page.getByRole('button', { name: 'Vissza', exact: true }).click();
  await page.getByRole('button', { name: 'Vissza', exact: true }).click();
  await expect(page.getByTestId('wizard-step-occurrences')).toBeVisible();

  await page.getByRole('button', { name: 'H', exact: true }).click();
  await page.getByRole('button', { name: 'Időpontok legenerálása' }).click();
  await expect(page.getByText(/Meglévő időpontok \([1-9]/)).toBeVisible();

  await page.getByRole('button', { name: 'Tovább', exact: true }).click();
  await page.getByRole('button', { name: 'Tovább', exact: true }).click();
  await expect(page.getByTestId('wizard-step-confirm')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mentés és közzététel' })).toBeEnabled();

  await page.getByRole('button', { name: 'Mentés piszkozatként' }).click();
  await expect(page.getByRole('heading', { name: 'Új Külföldi Program / Transzfer Létrehozása' })).not.toBeVisible();

  // A mentett program piszkozat statuszu -- az alapertelmezett "Aktiv" szuro
  // alatt nem latszik, at kell valtani a "Piszkozat" fulre.
  await page.getByRole('button', { name: /^Piszkozat \(/ }).click();
  await expect(page.getByText('E2E Wizard Teszt Program').first()).toBeVisible();
});

test('meglevo program szerkesztese: a regi szabadon ugralhato fules nezet marad, nincs wizard', async ({ page }) => {
  await loginAsE2eProvider(page);
  await page.goto('/szolgaltato/programjaim');

  // Alapertelmezett szuro "Aktiv (published)" -- a seedelt e2e-teszt-program-troodos
  // az egyetlen publikalt program, a wizard-teszt sajat piszkozatkent menti a sajatjat,
  // ezert itt az elso Szerkesztes gomb biztosan a seedelt programra mutat.
  // exact:true KOTELEZO -- enelkul a sidebar "Programjaim" navigacios gomb
  // alcime ("Uj program, szerkesztes, arak...") is illeszkedik case-insensitive
  // substring-kent, es .first() azt a (rossz) gombot valasztja a kartya-gomb helyett.
  await page.getByRole('button', { name: 'Szerkesztés', exact: true }).first().click();

  await expect(page.getByTestId('editor-tab-basic')).toBeVisible();
  await expect(page.getByTestId('editor-tab-pricing')).toBeVisible();
  await expect(page.getByTestId('editor-tab-occurrences')).toBeVisible();
  await expect(page.getByTestId('wizard-progress')).not.toBeVisible();

  await page.getByTestId('editor-tab-pricing').click();
  await expect(page.getByRole('heading', { name: 'Árazási mód' })).toBeVisible();
  await page.getByTestId('editor-tab-basic').click();
  await expect(page.getByText('6. Státusz és közzététel')).toBeVisible();
});
