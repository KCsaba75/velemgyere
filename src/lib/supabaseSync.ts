import { supabase } from './supabase';
import { 
  INITIAL_CATEGORIES, 
  INITIAL_REGIONS, 
  INITIAL_PROVIDERS, 
  INITIAL_PROFILES, 
  INITIAL_PROGRAMS, 
  INITIAL_PROGRAM_IMAGES, 
  INITIAL_INQUIRIES 
} from '../data/seedData';
import { Region, Category, Program, Provider, Inquiry } from '../types/database';

export interface SupabaseStatus {
  connected: boolean;
  tablesReady: boolean;
  message: string;
}

/**
 * Checks whether the Supabase database is connected and tables exist.
 */
export async function testSupabaseConnection(): Promise<SupabaseStatus> {
  try {
    const { data, error } = await supabase.from('regions').select('id').limit(1);

    if (error) {
      // 42P01: relation "public.regions" does not exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return {
          connected: true,
          tablesReady: false,
          message: 'A Supabase kapcsolat él, de az SQL táblák még nincsenek létrehozva a Supabase projektben.',
        };
      }
      return {
        connected: false,
        tablesReady: false,
        message: `Supabase hiba: ${error.message} (${error.code || ''})`,
      };
    }

    return {
      connected: true,
      tablesReady: true,
      message: 'Sikeresen kapcsolódva a felhőbeli Supabase adatbázishoz!',
    };
  } catch (err: any) {
    return {
      connected: false,
      tablesReady: false,
      message: `Hálózati hiba a Supabase elérésekor: ${err?.message || ''}`,
    };
  }
}

/**
 * Uploads initial seed data (regions, categories, providers, programs, images) to the user's Supabase instance.
 */
export async function seedSupabaseDatabase(): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Seed Categories (Service Types)
    const { error: catErr } = await supabase.from('categories').upsert(
      INITIAL_CATEGORIES.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        icon: c.icon,
        active: c.active
      })),
      { onConflict: 'id' }
    );
    if (catErr) throw new Error(`Kategóriák feltöltési hiba: ${catErr.message}`);

    // 2. Seed Regions (Destinations)
    const { error: regErr } = await supabase.from('regions').upsert(
      INITIAL_REGIONS.map(r => ({
        id: r.id,
        country: r.country,
        name: r.name,
        slug: r.slug,
        flag_emoji: r.flag_emoji,
        description: r.description,
        image_url: r.image_url,
        active: r.active
      })),
      { onConflict: 'id' }
    );
    if (regErr) throw new Error(`Régiók feltöltési hiba: ${regErr.message}`);

    // 3. Seed Providers
    const { error: provErr } = await supabase.from('providers').upsert(
      INITIAL_PROVIDERS.map(p => ({
        id: p.id,
        user_id: p.user_id || null,
        company_name: p.company_name,
        contact_name: p.contact_name,
        email: p.email,
        phone: p.phone,
        website: p.website,
        description: p.description,
        status: p.status
      })),
      { onConflict: 'id' }
    );
    if (provErr) throw new Error(`Szolgáltatók feltöltési hiba: ${provErr.message}`);

    // 4. Seed Programs
    const { error: progErr } = await supabase.from('programs').upsert(
      INITIAL_PROGRAMS.map(p => ({
        id: p.id,
        provider_id: p.provider_id,
        category_id: p.category_id,
        region_id: p.region_id,
        title: p.title,
        slug: p.slug,
        short_description: p.short_description,
        description: p.description,
        location: p.location,
        country: p.country,
        departure_location: p.departure_location,
        event_date: p.event_date,
        start_time: p.start_time,
        end_time: p.end_time,
        duration: p.duration,
        price: p.price,
        currency: p.currency,
        language: p.language,
        included: p.included,
        not_included: p.not_included,
        max_participants: p.max_participants,
        status: p.status,
        featured: p.featured
      })),
      { onConflict: 'id' }
    );
    if (progErr) throw new Error(`Programok feltöltési hiba: ${progErr.message}`);

    // 5. Seed Images
    const { error: imgErr } = await supabase.from('program_images').upsert(
      INITIAL_PROGRAM_IMAGES.map(img => ({
        id: img.id,
        program_id: img.program_id,
        image_url: img.image_url,
        is_cover: img.is_cover,
        sort_order: img.sort_order
      })),
      { onConflict: 'id' }
    );
    if (imgErr) throw new Error(`Képek feltöltési hiba: ${imgErr.message}`);

    // 6. Seed Inquiries
    const { error: inqErr } = await supabase.from('inquiries').upsert(
      INITIAL_INQUIRIES.map(inq => ({
        id: inq.id,
        program_id: inq.program_id,
        provider_id: inq.provider_id,
        name: inq.name,
        email: inq.email,
        phone: inq.phone,
        message: inq.message
      })),
      { onConflict: 'id' }
    );
    if (inqErr) throw new Error(`Érdeklődések feltöltési hiba: ${inqErr.message}`);

    // 7. Seed Profiles (opcionális profilok)
    try {
      const { error: profErr } = await supabase.from('profiles').upsert(
        INITIAL_PROFILES.map(prof => ({
          id: prof.id,
          user_id: prof.user_id || null,
          name: prof.name,
          email: prof.email,
          role: prof.role
        })),
        { onConflict: 'id' }
      );
      if (profErr) {
        console.warn('Profilok mentése figyelmeztetés (auth.users fkey):', profErr.message);
      }
    } catch (e) {
      console.warn('Profilok kihagyva:', e);
    }

    return { 
      success: true, 
      message: 'Minden tesztadat sikeresen feltöltve a Supabase felhő adatbázisodba!' 
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Nem sikerült az adatok szinkronizálása a Supabase-be.',
    };
  }
}
