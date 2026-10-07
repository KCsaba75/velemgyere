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
  // contact_name/email/phone/website (kanban fbf552b2 point 3, tightened 2026-10-07):
  // the `providers` table's column-grant is teaser-only for BOTH anon and authenticated
  // now (id/company_name/description/status/user_id) -- these never come back from a
  // plain select anymore, only from the targeted RPCs (get_my_provider_profile for your
  // own provider row, get_provider_contact_for_order for a buyer with a confirmed order,
  // admin_list_providers for admins). See schema.sql.
  contact_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  description: string;
  status: ProviderStatus;
  created_at?: string;
  // Stripe Connect prep (kanban 71215856 point 5) -- columns only, no Stripe
  // logic wired up yet. onsite_only is the only mode currently in use.
  stripe_account_id?: string | null;
  payouts_enabled?: boolean;
  payment_mode?: 'onsite_only' | 'online_stripe';
  // Accepted on-site payment methods (kanban cfa4b20a point 3) -- inherited by every
  // one of this provider's programs, not a per-program field. At least one required
  // (DB check constraint), defaults to ['cash'] for providers who registered before
  // this existed. Restricts which OnsitePaymentMethod a buyer can pick at checkout,
  // enforced server-side too via the orders_payment_method_check trigger.
  accepted_payment_methods: OnsitePaymentMethod[];
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
  // description/departure_location (kanban fbf552b2 point 1): PUBLIC since 2026-10-07,
  // present for anon too via `programs_public` (see schema.sql). start_time/end_time/
  // included/not_included/max_participants stay detail-only -- only present when
  // fetched from the full `programs` table (authenticated); anon's `programs_public`
  // doesn't carry them, ProgramDetailView gates those sections behind isAuthenticated.
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

export type OnsitePaymentMethod = 'cash' | 'revolut';

export interface Order {
  id: string;
  program_id: string;
  user_id: string;
  participants_count: number;
  // Server-computed, NOT the client's insert input (see set_order_booking_fee
  // trigger): net_amount (program.price * participants_count) + booking_fee.
  total_price: number;
  // Deposit-like fee due online now, separate from the onsite amount. Server-set
  // from app_settings.fee_percentage/fee_minimum_eur at insert time -- the
  // client can't set or influence it (see set_order_booking_fee trigger).
  booking_fee: number;
  // Amount due at the in-person meeting (= net_amount, what the provider
  // receives). Server-set alongside booking_fee, same trust boundary.
  onsite_amount: number;
  // Buyer's chosen payment method for the onsite_amount (kanban fbf552b2 point 5a) --
  // a plain preference, not a trusted monetary amount, so the client sets it directly
  // (unlike booking_fee/onsite_amount above).
  onsite_payment_method?: OnsitePaymentMethod | null;
  currency: string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  // Joined field for display convenience
  program?: Program;
}

// Returned by the get_provider_contact_for_order RPC (kanban fbf552b2 point 3): the
// provider's contact details, only resolvable server-side for the buyer's OWN
// confirmed order -- see schema.sql. Empty/undefined until then.
export interface OrderProviderContact {
  contact_name: string;
  email: string;
  phone: string;
  website: string | null;
}

// Returned by the get_order_buyer_info RPC (kanban fbf552b2 point 5b): the buyer's
// name/email, only resolvable server-side for the provider's (or admin's) OWN program.
export interface OrderBuyerInfo {
  name: string;
  email: string;
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

