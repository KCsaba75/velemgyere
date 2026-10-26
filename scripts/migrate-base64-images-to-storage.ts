/**
 * Kanban f2d93218, pont 5: egyszeri migracios script a MAR LETEZO,
 * base64-be-egetett program_images.image_url sorok feltoltesere a valodi
 * 'program-images' Storage bucketbe, es a DB-sor URL-re cserelesere.
 *
 * STATUS (2026-10-16, production): 0 base64-kodolt sor letezik jelenleg --
 * SELECT count(*) FILTER (WHERE image_url LIKE 'data:%') FROM program_images
 * = 0, mind a 16 meglevo sor mar kulso URL (Unsplash placeholder vagy korabbi
 * manualis URL-feltoltes). A script tehat jelenleg NO-OP-kent futna, de a
 * kepesseg megmarad a jovore, ha valaha (pl. a "egyedi URL" mezon keresztul,
 * ami nem szur ki data: URI-kat szigoruan) base64 kerulne be.
 *
 * Hasznalat: SUPABASE_SERVICE_ROLE_KEY env var kell (service-role, nem anon --
 * RLS-t at kell hogy ugorja a provider-tulajdonos ellenorzes nelkul is irhasson
 * barmelyik sort), es SUPABASE_URL. `npx tsx scripts/migrate-base64-images-to-storage.ts`
 * (--dry-run flaggel csak listazza, nem ir).
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.argv.includes('--dry-run');
const BUCKET = 'program-images';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Hianyzo env var: SUPABASE_URL es SUPABASE_SERVICE_ROLE_KEY kell.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; contentType: string } {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error('Nem data:-URL formatumu kep');
  const [, contentType, base64] = match;
  return { buffer: Buffer.from(base64, 'base64'), contentType };
}

async function main() {
  // provider_id-t is lekerjuk (programs.provider_id-n at), mert az UJ feltoltesek
  // storage-utvonala <provider_id>/<fajl> alaku (lasd lib/imageUpload.ts +
  // a storage.objects RLS policy-k) -- a migralt fajloknak UGYANEZT a mintat
  // kell kovetniuk, kulonben a provider/admin kesobbi UPDATE/DELETE-je (a
  // normal, authenticated uton, nem service_role-lal) nem talalna ra az RLS
  // tulajdonjog-ellenorzeseben.
  const { data: rows, error } = await supabase
    .from('program_images')
    .select('id, image_url, programs!inner(id, provider_id)')
    .like('image_url', 'data:%');

  if (error) throw error;
  if (!rows || rows.length === 0) {
    console.log('Nincs base64-kodolt program_images sor -- nincs mit migralni.');
    return;
  }

  console.log(`${rows.length} base64-kodolt sor talalva.`);

  for (const row of rows as any[]) {
    const { buffer, contentType } = dataUrlToBuffer(row.image_url);
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const providerId = row.programs?.provider_id;
    if (!providerId) {
      console.error(`Kihagyva (${row.id}): nem talalhato provider_id a programhoz.`);
      continue;
    }
    const path = `${providerId}/migrated-${row.id}.${ext}`;

    if (DRY_RUN) {
      console.log(`[dry-run] ${row.id} -> ${path} (${buffer.length} byte, ${contentType})`);
      continue;
    }

    const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType });
    if (uploadErr) {
      console.error(`Feltoltes sikertelen (${row.id}):`, uploadErr.message);
      continue;
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const { error: updateErr } = await supabase
      .from('program_images')
      .update({ image_url: urlData.publicUrl })
      .eq('id', row.id);

    if (updateErr) {
      console.error(`DB-sor frissitese sikertelen (${row.id}):`, updateErr.message);
      continue;
    }

    console.log(`OK: ${row.id} -> ${urlData.publicUrl}`);
  }
}

main().catch((err) => {
  console.error('Migracios script hiba:', err);
  process.exit(1);
});
