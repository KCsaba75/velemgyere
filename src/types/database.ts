export type UserRole = 'admin' | 'provider' | 'visitor';

export type ProviderStatus = 'pending' | 'approved' | 'suspended';

export type ProgramStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived';

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Provider {
  id: string;
  user_id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  website?: string;
  description: string;
  status: ProviderStatus;
  created_at: string;
}

export interface Region {
  id: string;
  country: string;
  name: string; // e.g. "Barcelona", "Málaga", "Mallorca", "Róma", "Isztambul", "Ciprus", "Málta"
  slug: string;
  flag_emoji?: string;
  description?: string;
  image_url?: string;
  active: boolean;
}

export interface Category {
  id: string;
  name: string; // e.g. "Kirándulás", "Városnézés", "Transzfer", "Hajókirándulás", "Gasztro"
  slug: string;
  icon: string;
  active: boolean;
}

// Alias for service type
export type ServiceType = Category;

export interface Program {
  id: string;
  provider_id: string;
  category_id: string;
  region_id?: string;
  title: string;
  slug: string;
  short_description: string;
  description: string;
  location: string; // e.g. "Barcelona, Spanyolország"
  country?: string;
  departure_location: string; // e.g. "Barcelona Placa de Catalunya vagy szállodai transzfer"
  event_date: string;
  start_time: string;
  end_time: string;
  duration: string;
  price: number;
  currency: string; // 'EUR' or 'Ft'
  language: string; // default: "Magyar nyelvű vezetés"
  included: string[];
  not_included: string[];
  max_participants?: number;
  status: ProgramStatus;
  featured: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields for display convenience
  category?: Category;
  region?: Region;
  provider?: Provider;
  images?: ProgramImage[];
}

export interface ProgramImage {
  id: string;
  program_id: string;
  image_url: string;
  is_cover: boolean;
  sort_order: number;
}

export interface Inquiry {
  id: string;
  program_id: string;
  provider_id: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  created_at: string;
  // Joined fields for admin / provider view
  program_title?: string;
  provider_name?: string;
}

