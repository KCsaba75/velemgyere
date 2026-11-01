// Kanban f2d93218: program-kepek valodi Supabase Storage-ba toltese, kliens-
// oldali atmeretezessel + WebP-konverzioval feltoltes elott (canvas-szal) --
// ez adja a legnagyobb sebesseg-nyereseget, mert a nyers telefonos fenykepek
// tobb MB-osak lehetnek, es korabban EGYENESEN base64-kent kerultek be a DB
// sorba (lasd 866cb61a audit, NewProgramModal.tsx regi handleFileUpload-ja).
//
// Kanban 9689af86: 2026-10-20-i commit (89842f98) veletlenul felulirta ezt a
// fajlt egy 'program-photos' bucket-re hivatkozo + silent-fallback (blob:
// object-URL a DB-be irva) verzioval. A valodi bucket 'program-images'
// (lasd migraciok + storage RLS), a 'program-photos' soha nem letezett --
// minden eles feltoltes elbukott, es a blob URL csak a feltolto bongeszo
// adott lapbetoltesen beul volt ervenyes. Visszaallitva az eredeti, helyes
// verziora.
import type { SupabaseClient } from '@supabase/supabase-js';

export const PROGRAM_IMAGES_BUCKET = 'program-images';
const FULL_MAX_WIDTH = 1600;
const THUMB_MAX_WIDTH = 480;
const WEBP_QUALITY = 0.82;
const THUMB_WEBP_QUALITY = 0.75;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

function resizeToWebp(img: HTMLImageElement, maxWidth: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxWidth / img.naturalWidth);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Canvas 2D context nem elerheto'));
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('canvas.toBlob sikertelen'))),
      'image/webp',
      quality
    );
  });
}

export interface UploadedProgramImage {
  url: string;
  thumbUrl: string;
}

/**
 * Egy nyers feltoltott fajlbol (telefon/kamera fenykep, akar tobb MB) ket
 * WebP meretet general (1600px teljes + 480px thumbnail lista-nezethez),
 * feltolti mindket meretet a provider sajat Storage-mappajaba
 * (`<providerId>/<uuid>.webp` / `<uuid>_thumb.webp`), es visszaadja a ket
 * publikus URL-t. A mappa-eloszveg (providerId) a storage.objects RLS
 * policy alapja -- lasd supabase/migrations/20261016020000_program_images_storage.sql.
 */
export async function uploadProgramImage(
  supabase: SupabaseClient,
  providerId: string,
  file: File
): Promise<UploadedProgramImage> {
  const img = await loadImage(file);
  const [fullBlob, thumbBlob] = await Promise.all([
    resizeToWebp(img, FULL_MAX_WIDTH, WEBP_QUALITY),
    resizeToWebp(img, THUMB_MAX_WIDTH, THUMB_WEBP_QUALITY),
  ]);

  const id = crypto.randomUUID();
  const fullPath = `${providerId}/${id}.webp`;
  const thumbPath = `${providerId}/${id}_thumb.webp`;

  const { error: fullErr } = await supabase.storage
    .from(PROGRAM_IMAGES_BUCKET)
    .upload(fullPath, fullBlob, { contentType: 'image/webp' });
  if (fullErr) throw fullErr;

  const { error: thumbErr } = await supabase.storage
    .from(PROGRAM_IMAGES_BUCKET)
    .upload(thumbPath, thumbBlob, { contentType: 'image/webp' });
  if (thumbErr) throw thumbErr;

  const fullUrl = supabase.storage.from(PROGRAM_IMAGES_BUCKET).getPublicUrl(fullPath).data.publicUrl;
  const thumbUrl = supabase.storage.from(PROGRAM_IMAGES_BUCKET).getPublicUrl(thumbPath).data.publicUrl;

  return { url: fullUrl, thumbUrl };
}
