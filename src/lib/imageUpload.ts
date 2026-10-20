import { SupabaseClient } from '@supabase/supabase-js';

export async function uploadProgramImage(
  supabase: SupabaseClient,
  providerId: string,
  file: File
): Promise<{ url: string; thumbUrl?: string }> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${providerId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `programs/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('program-photos')
      .upload(filePath, file, { cacheControl: '3600', upsert: true });

    if (uploadError) {
      console.warn('Supabase storage upload fallback to ObjectURL:', uploadError.message);
      const objectUrl = URL.createObjectURL(file);
      return { url: objectUrl, thumbUrl: objectUrl };
    }

    const { data } = supabase.storage.from('program-photos').getPublicUrl(filePath);
    return { url: data.publicUrl, thumbUrl: data.publicUrl };
  } catch (err) {
    console.warn('Error in uploadProgramImage:', err);
    const objectUrl = URL.createObjectURL(file);
    return { url: objectUrl, thumbUrl: objectUrl };
  }
}
