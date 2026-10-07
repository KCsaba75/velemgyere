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
  // contact_name/email/phone: only present when fetched from the full `providers`
  // table (authenticated). Anonymous visitors get `providers_public`
  // (id/company_name/description/status only) -- see kanban 71215856 point 4.
  contact_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  description: string;
  status: ProviderStatus;
  created_at?: string;
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
  location: string; // e.g. "Barcelona, Spanyolország" -- public teaser field
  country?: string;
  event_date: string;
  duration: string; // public teaser field (shown on catalog cards)
  price: number;
  currency: string; // 'EUR' or 'Ft'
  language: string; // default: "Magyar nyelvű vezetés" -- public teaser field
  status: ProgramStatus;
  featured: boolean;
  created_at: string;
  updated_at: string;
  // Detail-only fields (kanban 71215856 point 4): only present when fetched from the
  // full `programs` table (authenticated). Anonymous visitors get `programs_public`
  // (teaser columns only) and these come back undefined -- ProgramDetailView gates
  // the sections that use them behind isAuthenticated.
  description?: string;
  departure_location?: string; // e.g. "Barcelona Placa de Catalunya vagy szállodai transzfer"
  start_time?: string;
  end_time?: string;
  included?: string[];
  not_included?: string[];
  max_participants?: number;
  // Joined fields for display convenience
  category?: Category;
  region?: Region;
  provider?: Provider;
  images?: ProgramImage[];
}

export type OrderStatus = 'pending' | 'confirmed' | 'cancelled';

export interface Order {
  id: string;
  program_id: string;
  user_id: string;
  participants_count: number;
  total_price: number;
  currency: string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  // Joined field for display convenience
  program?: Program;
}

export type CreditTransactionType = 'signup_bonus' | 'refund' | 'usage' | 'manual_payout';

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  type: CreditTransactionType;
  order_id?: string;
  note?: string;
  created_by?: string;
  created_at: string;
}

export interface ProgramAvailability {
  max_participants: number | null;
  booked: number;
  available: number | null; // null = no capacity limit set on the program
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

