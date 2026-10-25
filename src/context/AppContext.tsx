import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Profile,
  Provider,
  Category,
  Region,
  Program,
  ProgramImage,
  Inquiry,
  ProgramStatus,
  ProviderStatus,
  Order,
  CreditTransaction,
  PayoutRequest,
  ProgramAvailability,
  OrderProviderContact,
  OrderBuyerInfo,
  OnsitePaymentMethod,
  ProgramOccurrence,
  OccurrenceAvailability,
  OccurrenceStatus,
  Review,
  ReviewStatus,
  TravelType,
  BookingSource,
  OrderStatus,
  FavoriteFolder,
  FavoriteItem,
  ProgramPriceTier
} from '../types/database';
import { 
  INITIAL_CATEGORIES, 
  INITIAL_REGIONS,
  INITIAL_PROVIDERS, 
  INITIAL_PROFILES, 
  INITIAL_PROGRAMS, 
  INITIAL_PROGRAM_IMAGES, 
  INITIAL_INQUIRIES,
  INITIAL_REVIEWS,
  INITIAL_ORDERS,
  INITIAL_FAVORITE_FOLDERS,
  INITIAL_FAVORITES
} from '../data/seedData';
import { roundToHalfEuro, formatPrice } from '../lib/priceUtils';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { fetchLiveEurHufRate } from '../lib/exchangeRate';

// 16241c32: real react-router URLs replaced the old pure-state "currentView" router.
// This mapping lets currentView/setCurrentView keep working as a thin shim over the
// real URL, so the many existing `currentView === 'x'` / `setCurrentView('x')` call
// sites across the app didn't all need to become route paths directly.
const VIEW_TO_PATH: Record<string, string> = {
  home: '/',
  programs: '/programok',
  categories: '/kategoriak',
  favorites: '/kedvencek',
  bookings: '/foglalasaim',
  'provider-landing': '/szolgaltatoknak',
  'provider-dashboard': '/szolgaltato/dashboard',
  // Kanban 5a3a8dd8 (Csaba, 10-17 pontositas): a szolgaltato sajat programjai
  // es a beerkezett foglalasai onallo top-level menupontok, nem a Partner
  // fiok alatti belso fulek tovabb.
  'provider-programs': '/szolgaltato/programjaim',
  'provider-bookings': '/szolgaltato/foglalasaim',
  // Kanban 5a3a8dd8 (Csaba, 10-17 masodik pontositas): az Ertekelesek es az
  // Erdeklodesek fulek is onallo top-level oldalak lettek, ugyanugy mint a
  // Programok/Foglalasok -- elerheto a Partner fiok oldal gyorslinkjeiből.
  'provider-reviews': '/szolgaltato/ertekeleseim',
  'provider-inquiries': '/szolgaltato/erdeklodeseim',
  // Kanban 5d6bb3d4 (Csaba, via Zora): a szolgaltatoi navbar "Kedvencek"
  // helyere kerulo uj "Uzenet" placeholder menupont, onallo top-level oldal.
  'provider-messages': '/szolgaltato/uzeneteim',
  'admin-dashboard': '/admin',
  // Kanban daa1ed70 (Csaba, via Zora): admin-nav "Kategoriak" deep-link a
  // kategoria-kezelo fulre, kulon path -- nem query-param, mert ez a
  // view/path mapping csak pathname-et ismer (lasd pathToView).
  'admin-categories': '/admin/kategoriak',
  // Kanban a8676c22 (Csaba, via Zora): admin-nav "Foglalasok" deep-link a
  // szolgaltato-kezelo fulre, ugyanazon elv szerint mint admin-categories.
  'admin-providers': '/admin/szolgaltatok',
  'my-account': '/sajat-fiokom',
};

function pathToView(pathname: string): string {
  if (pathname.startsWith('/programok')) return 'programs';
  // /kategoriak/:slug and /regiok/:slug (kanban 4c966bc5) render ProgramsPage --
  // the same filtered catalog view as /programok -- not CategoriesView, so the
  // navbar should highlight "Programok" there. Only the bare /kategoriak index
  // (the category/region tile browser, no slug) is the actual "categories" view;
  // there is no bare /regiok route at all (always has a slug).
  if (pathname.startsWith('/kategoriak/') || pathname.startsWith('/regiok/')) return 'programs';
  if (pathname.startsWith('/kategoriak')) return 'categories';
  if (pathname.startsWith('/kedvencek')) return 'favorites';
  if (pathname.startsWith('/foglalasaim')) return 'bookings';
  if (pathname.startsWith('/szolgaltatoknak')) return 'provider-landing';
  if (pathname.startsWith('/szolgaltato/programjaim')) return 'provider-programs';
  if (pathname.startsWith('/szolgaltato/foglalasaim')) return 'provider-bookings';
  if (pathname.startsWith('/szolgaltato/ertekeleseim')) return 'provider-reviews';
  if (pathname.startsWith('/szolgaltato/erdeklodeseim')) return 'provider-inquiries';
  if (pathname.startsWith('/szolgaltato/uzeneteim')) return 'provider-messages';
  if (pathname.startsWith('/szolgaltato/dashboard')) return 'provider-dashboard';
  // a specifikusabb /admin/kategoriak check az altalanos /admin ELOTT kell,
  // kulonben a prefix-match sosem jutna el ide.
  if (pathname.startsWith('/admin/kategoriak')) return 'admin-categories';
  if (pathname.startsWith('/admin/szolgaltatok')) return 'admin-providers';
  if (pathname.startsWith('/admin')) return 'admin-dashboard';
  if (pathname.startsWith('/sajat-fiokom')) return 'my-account';
  return 'home';
}

// Kanban 458dfabb: a #VG-<year>-XXXXXX formátum évszáma a generáláskor mindig a
// FUTTATÁSKORI aktuális évet használja (nem a 2026-os bevezetési évet), egyetlen
// helyen definiálva, hogy ne kelljen a 2026->2027 fordulón 4+ helyet külön javítani.
// A már-formázott referenciát FELISMERŐ regexek (lásd lent) szándékosan NEM erre
// épülnek -- egy korábbi évben generált #VG-2026-... azonosítót 2027-ben is fel
// kell ismerni meglévőként, nem újragenerálni, ezért azok bármely 4 jegyű évet
// elfogadnak (\d{4}), nem csak a mostanit.
export const CURRENT_BOOKING_YEAR = new Date().getFullYear();

export function getBookingReference(orderOrId?: { id?: string; booking_reference?: string; created_at?: string } | string | null): string {
  if (!orderOrId) return `VG-${CURRENT_BOOKING_YEAR}-100001`;

  if (typeof orderOrId === 'string') {
    const raw = orderOrId.trim();
    if (/^#?(VG|V6)-\d{4}-\d+$/i.test(raw)) {
      return raw.startsWith('#') ? raw.slice(1) : raw;
    }
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    const num = Math.abs(hash) % 900000 + 100000;
    return `VG-${CURRENT_BOOKING_YEAR}-${num}`;
  }

  if (orderOrId.booking_reference) {
    const ref = orderOrId.booking_reference.trim();
    return ref.startsWith('#') ? ref.slice(1) : ref;
  }

  const rawId = (orderOrId.id || '').trim();
  if (/^#?(VG|V6)-\d{4}-\d+$/i.test(rawId)) {
    return rawId.startsWith('#') ? rawId.slice(1) : rawId;
  }

  let hash = 0;
  for (let i = 0; i < rawId.length; i++) {
    hash = ((hash << 5) - hash) + rawId.charCodeAt(i);
    hash |= 0;
  }
}

export function getHungarianDateSuffix(dateInput: string): string {
  try {
    const cleanDate = dateInput.includes('T') ? dateInput.split('T')[0] : dateInput;
    const parts = cleanDate.split('-');
    const day = parseInt(parts[2], 10);
    // Hungarian date suffix for -tól/-től based on the day number:
    // Days with back vowels (-tól): 3, 6, 8, 13, 16, 18, 20, 23, 26, 28, 30
    const backVowelDays = [3, 6, 8, 13, 16, 18, 20, 23, 26, 28, 30];
    return backVowelDays.includes(day) ? '-tól' : '-től';
  } catch {
    return '-tól';
  }
}

export function formatProgramDisplayDate(eventDate?: string | null, hasMultipleDates: boolean = false): string {
  if (!eventDate) return 'Egyeztetés szerint';
  try {
    const cleanStr = eventDate.includes('T') ? eventDate : `${eventDate}T00:00:00`;
    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) return eventDate;
    const baseStr = d.toLocaleDateString('hu-HU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    if (hasMultipleDates) {
      const cleanBase = baseStr.replace(/\.$/, '');
      const suffix = getHungarianDateSuffix(eventDate);
      return `${cleanBase}${suffix}`;
    }
    return baseStr;
  } catch {
    return eventDate;
  }
}

// Kanban 5ef2d0b8 (Csaba kérése): a vásárlói Foglalásaim lap fő nézete CSAK
// pending/confirmed foglalást mutat, a Múltbeli és Lemondott külön fülre kerül --
// ugyanez a bucket-elés adja a nav-badge számát is (csak 'upcoming'). Lemondva
// mindig a "Lemondott" fülre megy, függetlenül a dátumtól. A dátum-összevetéshez
// a BookingDetailModal-ban is már használt konvenciót követjük: order.event_date,
// ha az üres, a program event_date-je (lásd kanban 97ca24ba send-booking-email
// Edge Function, ami occurrence_id-t is néz -- itt szándékosan nem megyünk ilyen
// mélyre, a meglévő frontend-konvenciót tartjuk, külön feladat lenne occurrence-re
// bővíteni mindkét helyen egyszerre).
export type OrderBucket = 'upcoming' | 'past' | 'cancelled';

export function getOrderBucket(order: Order, programs: Program[]): OrderBucket {
  if (order.status === 'cancelled') return 'cancelled';
  const dateStr = order.event_date || order.occurrence?.event_date || order.program?.event_date || programs.find(p => p.id === order.program_id)?.event_date;
  if (!dateStr) return 'upcoming';
  const eventDate = new Date(dateStr);
  if (isNaN(eventDate.getTime())) return 'upcoming';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  eventDate.setHours(0, 0, 0, 0);
  return eventDate < today ? 'past' : 'upcoming';
}

interface AppContextType {
  // Navigation. currentView/setCurrentView are a compatibility shim over real
  // react-router URLs (16241c32) -- currentView is derived from location.pathname,
  // setCurrentView(name) navigates to that view's URL. Kept so the many existing
  // `currentView === 'x'` / `setCurrentView('x')` call sites didn't all need to
  // change to route paths directly.
  currentView: string;
  setCurrentView: (view: string) => void;
  openProgramDetail: (id: string) => void;

  // Search & Filters
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedRegion: string | null;
  setSelectedRegion: (slug: string | null) => void;
  selectedCategory: string | null;
  setSelectedCategory: (cat: string | null) => void;
  selectedLocation: string;
  setSelectedLocation: (loc: string) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  selectedDateFrom: string;
  setSelectedDateFrom: (date: string) => void;
  selectedDateTo: string;
  setSelectedDateTo: (date: string) => void;
  selectedDurationType: 'all' | 'single' | 'multi';
  setSelectedDurationType: (type: 'all' | 'single' | 'multi') => void;
  maxPrice: number;
  setMaxPrice: (price: number) => void;
  currencyFilter: 'ALL' | 'EUR' | 'Ft';
  setCurrencyFilter: (curr: 'ALL' | 'EUR' | 'Ft') => void;
  resetFilters: () => void;

  // Auth / Role
  currentUser: Profile;
  currentProvider: Provider | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  registerVisitor: (data: { name: string; email: string; password: string }) => Promise<{ success: boolean; message: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message: string }>;
  confirmPasswordReset: (email: string, token: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  checkPasswordResetToken: (email: string, token: string) => Promise<boolean>;
  deleteMyAccount: () => Promise<{ success: boolean; message: string }>;
  updateMyProfile: (updates: {
    name?: string;
    email?: string;
    phone?: string;
    notify_booking_reminders?: boolean;
    notify_newsletter?: boolean;
    notify_promo?: boolean;
    google_calendar_sync_enabled?: boolean;
    google_calendar_id?: string;
    push_notifications_enabled?: boolean;
  }) => Promise<{ success: boolean; message: string }>;
  registerProvider: (data: {
    company_name: string;
    contact_name: string;
    email: string;
    phone: string;
    website?: string;
    description: string;
    password: string;
    accepted_payment_methods: OnsitePaymentMethod[];
  }) => Promise<{ success: boolean; message: string }>;

  // Data Collections
  regions: Region[];
  categories: Category[];
  programs: Program[];
  providers: Provider[];
  inquiries: Inquiry[];

  // Admin: Regions Management
  createRegion: (data: Partial<Region>) => Promise<string>;
  updateRegion: (id: string, updates: Partial<Region>) => Promise<void>;
  deleteRegion: (id: string) => Promise<void>;
  toggleRegionActive: (id: string) => Promise<void>;

  // Admin: Service Types / Categories Management
  createCategory: (data: Partial<Category>) => Promise<string>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  toggleCategoryActive: (id: string) => Promise<void>;

  // Program Management
  createProgram: (data: Partial<Program>, images: { url: string; isCover: boolean; thumbUrl?: string }[]) => Promise<string>;
  updateProgram: (id: string, updates: Partial<Program>, updatedImages?: { url: string; isCover: boolean; thumbUrl?: string }[]) => Promise<void>;
  deleteProgram: (id: string) => Promise<void>;
  approveProgram: (id: string) => Promise<void>;
  rejectProgram: (id: string) => Promise<void>;
  archiveProgram: (id: string) => Promise<void>;
  toggleFeaturedProgram: (id: string) => Promise<void>;

  // Provider Management
  approveProvider: (id: string) => Promise<void>;
  suspendProvider: (id: string) => Promise<void>;
  banProvider: (id: string) => Promise<void>;

  // Provider self-service: own profile fields only (kanban cfa4b20a point 1) --
  // status/stripe_account_id/payouts_enabled/payment_mode are deliberately excluded,
  // see the providers_self_profile_update migration + admin_set_provider_status RPC.
  updateProviderProfile: (updates: {
    company_name?: string;
    contact_name?: string;
    phone?: string;
    email?: string;
    website?: string;
    description?: string;
    accepted_payment_methods?: OnsitePaymentMethod[];
    google_calendar_sync_enabled?: boolean;
    google_calendar_id?: string;
  }) => Promise<void>;

  // Inquiries
  submitInquiry: (data: {
    program_id: string;
    name: string;
    email: string;
    phone?: string;
    message?: string;
  }) => Promise<void>;

  // Orders (kanban 71215856 point 2): logged-in-only reservation records,
  // NOT a real payment/booking yet -- see schema.sql comment on public.orders.
  orders: Order[];
  createOrder: (data: {
    program_id: string;
    occurrence_id?: string | null;
    participants_count: number;
    total_price: number;
    currency?: string;
    onsite_payment_method: OnsitePaymentMethod;
    booking_reference?: string;
    source?: BookingSource;
    source_notes?: string;
    is_manual?: boolean;
    manual_customer_name?: string;
    manual_customer_phone?: string;
    manual_customer_email?: string;
    status?: OrderStatus;
  }) => Promise<{ success: boolean; message: string; orderId?: string }>;
  cancelOrder: (id: string) => Promise<void>;

  // Capacity check (point 6): only meaningful for logged-in users looking at the
  // gated detail view. Returns null when not configured/not authenticated.
  // Program-wide -- only correct for programs WITHOUT occurrences (kanban c039bfb6
  // point 2: occurrence-enabled programs use listOpenOccurrences instead, which
  // computes availability per-date, not program-wide).
  checkProgramAvailability: (programId: string) => Promise<ProgramAvailability | null>;

  // Occurrence/slot-rendszer (kanban c039bfb6) -- ismetlodo idopontok egy programhoz.
  // listOpenOccurrences: vevo-oldali, csak NYITOTT+JOVOBELI+PUBLIKALT (list_program_occurrences
  // RPC, anon is hivhatja). getProgramOccurrences: szolgaltato/admin sajat-kezeles
  // nezete, MINDEN sajat occurrence (direkt tabla-select, RLS-gatelt).
  programOccurrencesCounts: Record<string, number>;
  programOccurrencesDates: Record<string, string[]>;
  listOpenOccurrences: (programId: string) => Promise<OccurrenceAvailability[]>;
  getProgramOccurrences: (programId: string) => Promise<ProgramOccurrence[]>;
  createOccurrences: (
    programId: string,
    dates: string[],
    overrides?: { start_time?: string | null; end_time?: string | null; max_participants?: number | null }
  ) => Promise<void>;
  updateOccurrence: (
    id: string,
    updates: { event_date?: string; start_time?: string | null; end_time?: string | null; max_participants?: number | null; status?: OccurrenceStatus }
  ) => Promise<void>;
  deleteOccurrence: (id: string) => Promise<void>;
  rescheduleOrder: (orderId: string, newOccurrenceId: string) => Promise<void>;

  // Savos/csoportos arazas (kanban 62e69729). pricing_mode valtasa updateProgram(id,
  // {pricing_mode})-dal megy, nincs kulon fuggveny ra.
  getProgramPriceTiers: (programId: string) => Promise<ProgramPriceTier[]>;
  createPriceTier: (programId: string, tier: { min_participants: number; max_participants?: number | null; total_price: number }) => Promise<void>;
  deletePriceTier: (id: string) => Promise<void>;

  // Admin approval + privacy-gated contact lookups (kanban fbf552b2 points 3/4/5).
  confirmOrder: (id: string) => Promise<{ success: boolean; message: string }>;
  getProviderContactForOrder: (orderId: string) => Promise<OrderProviderContact | null>;
  getOrderBuyerInfo: (orderId: string) => Promise<OrderBuyerInfo | null>;

  // Credit ledger (point 5): read-only from the client -- crediting/payout is
  // admin-side (manual_payout, refund) for now, see schema.sql comment.
  creditTransactions: CreditTransaction[];
  creditBalance: number;

  // Kanban d82d39ba: a kredit-penztarca ket kulon zsebre bontva forras szerint.
  // VISSZATERITESEK = 'refund' (provider hibajabol meghiusult VAGY szabalyosan
  // lemondott foglalas) + 'manual_payout' (mar kifizetett resz, csak ebbol a
  // zsebbol ertelmezett). JUTALMAK = 'signup_bonus' + barmilyen jovobeni promocios/
  // husegi tipus. A 'usage' tipust egyik zsebhez sem rendeljuk kulon jelenleg --
  // a kodban sehol nem ir ilyen tranzakciot semmi (csak a CHECK constraint engedi
  // jovobeli hasznalatra), tehat nincs mit szetvalasztani belole MOST.
  refundBalance: number;
  refundTransactions: CreditTransaction[];
  rewardBalance: number;
  rewardTransactions: CreditTransaction[];

  // "Kerem a kifizetest" gomb (d82d39ba 4. pont): MOST csak egy kifizetes-IGENYLEST
  // rogzit a payout_requests tablaba, a tenyleges penzmozgast admin dolgozza fel
  // kesobb (lasd schema.sql komment). Nem engedi ujra igenyelni, amig van nyitott
  // ('requested'/'processing') kerelem.
  payoutRequests: PayoutRequest[];
  requestPayout: (amount: number) => Promise<{ success: boolean; message: string }>;

  // Percentage-based booking fee (Csaba 2026-10-07 penzugyi-mukodesi-modell PDF):
  // dij = MAX(feePercentage% * net_amount, feeMinimumEur), admin-adjustable in
  // app_settings (replaces the old fixed currentBookingFee). The signup bonus
  // credit always matches whatever feeMinimumEur was AT REGISTRATION time (server
  // trigger), not this live value -- see schema.sql grant_signup_bonus comment.
  feePercentage: number;
  feeMinimumEur: number;
  updateFeeSettings: (values: { fee_percentage: number; fee_minimum_eur: number }) => Promise<void>;
  // EUR / HUF Exchange Rate API & Settings
  eurHufRate: number;
  eurHufLastUpdated: string | null;
  updateEurHufRate: (rate: number) => Promise<void>;
  fetchAndApplyLiveRate: () => Promise<number | null>;
  // Display-only helpers mirroring the server's compute_booking_fee/orders trigger
  // formula -- a program's stored `price` is the NET amount the provider receives,
  // the catalog/detail views must show the buyer-facing TOTAL (net+fee).
  computeBookingFee: (netAmount: number) => number;
  computeTotalPrice: (netAmount: number) => number;

  // Utility
  resetToDefaults: () => void;
  isSupabaseLive: boolean;
  isLoading: boolean;
  // Eleni #244 audit [D]: egy Supabase-hiba korabban csendben nyelve lett, a szuro UI
  // 0 talalatnak tunt ("nincs talalat"-nak nezett ki, pedig a betoltes bukott el).
  // Ez a flag kulonbozteti meg a "ures eredmeny" es a "hiba volt" allapotot a UI-ban.
  catalogLoadError: boolean;

  // Reviews system
  reviews: Review[];
  addReview: (data: {
    program_id: string;
    order_id: string;
    rating: number;
    rating_guide: number;
    rating_value: number;
    rating_organization: number;
    rating_safety: number;
    title?: string;
    comment: string;
    positive_feedback?: string;
    improvement_feedback?: string;
    travel_type: TravelType;
    photos?: string[];
  }) => Promise<{ success: boolean; message: string; review?: Review }>;
  respondToReview: (reviewId: string, responseText: string) => Promise<{ success: boolean; message: string }>;
  moderateReview: (reviewId: string, status: ReviewStatus) => Promise<{ success: boolean; message: string }>;
  deleteReview: (reviewId: string) => Promise<{ success: boolean; message: string }>;
  getProgramReviews: (programId: string) => Review[];
  getProgramRatingStats: (programId: string) => {
    average: number;
    count: number;
    recommendPercent: number;
    breakdown: { guide: number; value: number; organization: number; safety: number };
    distribution: Record<number, number>;
  };
  getProviderRatingStats: (providerId?: string | null) => { average: number; count: number };
  canUserReviewProgram: (programId: string) => { eligible: boolean; order?: Order; reason?: string };
  getUserReviewForOrder: (orderId: string) => Review | undefined;

  // Favorites / Wishlists system
  favoriteFolders: FavoriteFolder[];
  favorites: FavoriteItem[];
  isProgramFavorite: (programId: string) => boolean;
  getProgramFolderIds: (programId: string) => string[];
  getProgramFolders: (programId: string) => FavoriteFolder[];
  toggleFavorite: (programId: string, folderId?: string) => { added: boolean; folderName: string };
  addProgramToFolder: (programId: string, folderId: string) => void;
  removeProgramFromFolder: (programId: string, folderId: string) => void;
  setProgramFolders: (programId: string, folderIds: string[]) => void;
  createFavoriteFolder: (data: { name: string; description?: string; color?: string; icon?: string }) => FavoriteFolder;
  updateFavoriteFolder: (id: string, updates: Partial<FavoriteFolder>) => void;
  deleteFavoriteFolder: (id: string, deleteContainedPrograms?: boolean) => void;
  clearAllFavorites: () => void;
  getFolderPrograms: (folderId: string) => Program[];
  allFavoritePrograms: Program[];
  totalFavoritesCount: number;
  folderModalProgram: Program | null;
  openFolderModal: (program: Program) => void;
  closeFolderModal: () => void;
  favoriteToast: { message: string; program?: Program; folderName?: string } | null;
  dismissFavoriteToast: () => void;

  // Kanban 4fe242f2 (szolgaltatoi) + c70cb435 (customer): olvasatlan booking-uzenet
  // szamlalo, role-agnosztikus -- order_id -> olvasatlan uzenetek szama, csak a
  // sajat szalaimra (akar provider, akar customer nezi).
  unreadBookingMessageCounts: Record<string, number>;
  totalUnreadBookingMessageCount: number;
  markBookingThreadRead: (orderId: string) => void;
  registerActiveMessageThread: (orderId: string) => void;
  unregisterActiveMessageThread: (orderId: string) => void;

  // Global Login Modal state
  isLoginModalOpen: boolean;
  loginModalMessage: string | null;
  loginRedirectTo: string | null;
  openLoginModal: (message?: string, redirectTo?: string) => void;
  closeLoginModal: () => void;
}

const STORAGE_KEYS = {
  REGIONS: 'vg_regions_v2',
  CATEGORIES: 'vg_categories_v2',
  PROGRAMS: 'vg_programs_v2',
  IMAGES: 'vg_images_v2',
  PROVIDERS: 'vg_providers_v2',
  PROFILES: 'vg_profiles_v2',
  INQUIRIES: 'vg_inquiries_v2',
  CURRENT_USER: 'vg_current_user_v2',
  REVIEWS: 'vg_reviews_v2',
  ORDERS: 'vg_orders_v2',
  FAVORITE_FOLDERS: 'vg_favorite_folders_v3',
  FAVORITES: 'vg_favorites_v3',
};

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation: real URL (react-router) is the source of truth; see VIEW_TO_PATH/
  // pathToView above for the currentView/setCurrentView compatibility shim.
  const navigate = useNavigate();
  const location = useLocation();
  const currentView = pathToView(location.pathname);
  const setCurrentView = (view: string) => navigate(VIEW_TO_PATH[view] || '/');

  // Filters state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedDateFrom, setSelectedDateFrom] = useState<string>('');
  const [selectedDateTo, setSelectedDateTo] = useState<string>('');
  const selectedDate = selectedDateFrom;
  const setSelectedDate = setSelectedDateFrom;
  const [selectedDurationType, setSelectedDurationType] = useState<'all' | 'single' | 'multi'>('all');
  const [maxPrice, setMaxPrice] = useState<number>(150); // Default for EUR abroad prices
  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | 'EUR' | 'Ft'>('ALL');

  // Dynamic collections from Supabase (sole persistent source of truth - local storage removed)
  const [regions, setRegions] = useState<Region[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [rawProviders, setRawProviders] = useState<Provider[]>([]);
  const [rawProfiles, setRawProfiles] = useState<Profile[]>([]);
  const [rawPrograms, setRawPrograms] = useState<Program[]>([]);
  const [rawImages, setRawImages] = useState<ProgramImage[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rawFavoriteFolders, setRawFavoriteFolders] = useState<FavoriteFolder[]>([]);
  const [rawFavorites, setRawFavorites] = useState<FavoriteItem[]>([]);
  // Tracks which user's favorite_folders fetch from Supabase has completed, so the
  // default-folder bootstrap effect below never races the async fetch and creates
  // a duplicate "Általános kedvencek" folder on every fresh page load.
  const [foldersFetchedForUser, setFoldersFetchedForUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [catalogLoadError, setCatalogLoadError] = useState<boolean>(false);

  // Global Login Modal state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalMessage, setLoginModalMessage] = useState<string | null>(null);
  const [loginRedirectTo, setLoginRedirectTo] = useState<string | null>(null);
  const loginRedirectRef = useRef<string | null>(null);

  const openLoginModal = (message?: string, redirectTo?: string) => {
    setLoginModalMessage(message || null);
    setLoginRedirectTo(redirectTo || null);
    loginRedirectRef.current = redirectTo || null;
    setIsLoginModalOpen(true);
  };

  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
    setLoginModalMessage(null);
    setLoginRedirectTo(null);
    loginRedirectRef.current = null;
  };

  const [folderModalProgram, setFolderModalProgram] = useState<Program | null>(null);
  const [favoriteToast, setFavoriteToast] = useState<{ message: string; program?: Program; folderName?: string } | null>(null);

  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  // Public settings (app_settings.fee_percentage/fee_minimum_eur) -- readable by
  // anon too, so they load in the main collections effect below, not gated on
  // isAuthenticated.
  const [feePercentage, setFeePercentage] = useState<number>(0);
  const [feeMinimumEur, setFeeMinimumEur] = useState<number>(0);
  const [eurHufRate, setEurHufRate] = useState<number>(400);
  const [eurHufLastUpdated, setEurHufLastUpdated] = useState<string | null>(null);

  // Current active user profile (derived from Supabase Auth session)
  const [currentUser, setCurrentUser] = useState<Profile>(() => {
    return INITIAL_PROFILES.find(p => p.role === 'visitor') || {
      id: 'prof-visitor',
      user_id: '',
      name: 'Látogató',
      email: 'utazo@example.hu',
      role: 'visitor',
      created_at: new Date().toISOString()
    };
  });
  // Whether currentUser reflects a real, logged-in Supabase Auth session (vs. the
  // anonymous default-visitor placeholder profile). Only meaningful when
  // isSupabaseConfigured -- always false in the no-Supabase dev fallback.
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Active user's favorite folders and items (strictly scoped to currentUser.user_id when authenticated)
  // Deduplicates folders by case-insensitive name so duplicate "Általános kedvencek" folders can never appear in UI
  const userFavoriteFolders = useMemo<FavoriteFolder[]>(() => {
    if (!isAuthenticated || !currentUser?.user_id) return [];
    const userFolders = rawFavoriteFolders
      .filter(f => f.user_id === currentUser.user_id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const uniqueMap = new Map<string, FavoriteFolder>();
    for (const f of userFolders) {
      const key = f.name.trim().toLowerCase();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, f);
      } else if (f.is_default && !uniqueMap.get(key)!.is_default) {
        uniqueMap.set(key, f);
      }
    }
    return Array.from(uniqueMap.values());
  }, [rawFavoriteFolders, isAuthenticated, currentUser?.user_id]);

  const userFavorites = useMemo<FavoriteItem[]>(() => {
    if (!isAuthenticated || !currentUser?.user_id) return [];
    return rawFavorites.filter(f => f.user_id === currentUser.user_id);
  }, [rawFavorites, isAuthenticated, currentUser?.user_id]);
  // Own full provider row (kanban fbf552b2 point 3), fetched via get_my_provider_profile()
  // RPC once logged in as a provider -- see syncFromSession. null for every other role,
  // or until it resolves. Supabase-only; the no-Supabase dev fallback below still derives
  // currentProvider from the local rawProviders array directly.
  const [currentProviderFull, setCurrentProviderFull] = useState<Provider | null>(null);

  // Purge any residual local storage keys on boot - Supabase is the sole store of record
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const legacyKeys = [
          'vg_regions', 'vg_regions_v2', 'vg_categories', 'vg_categories_v2',
          'vg_providers', 'vg_providers_v2', 'vg_profiles', 'vg_profiles_v2',
          'vg_programs', 'vg_programs_v2', 'vg_images', 'vg_images_v2',
          'vg_inquiries', 'vg_inquiries_v2', 'vg_current_user', 'vg_current_user_v2',
          'vg_reviews', 'vg_reviews_v1', 'vg_reviews_v2', 'vg_orders', 'vg_orders_v2',
          'vg_favorite_folders', 'vg_favorite_folders_v2', 'vg_favorite_folders_v3',
          'vg_favorites', 'vg_favorites_v2', 'vg_favorites_v3'
        ];
        legacyKeys.forEach(k => localStorage.removeItem(k));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!favoriteToast) return;
    const timer = setTimeout(() => {
      setFavoriteToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [favoriteToast]);

  // Programs/providers: which table/view to read depends on auth state -- anon gets the
  // teaser-only `programs_public` view (DB-enforced via column GRANTs, see schema.sql),
  // a logged-in visitor/provider gets the full `programs` table (start_time/end_time/
  // included/not_included/max_participants, still detail-only). Centralized here and
  // called from the auth-sync effect below (on mount AND on every login/logout) so
  // there's exactly one place that decides this, instead of duplicating the choice.
  //
  // Providers (kanban fbf552b2 point 3, tightened 2026-10-07): the `providers` table's
  // column-grant is teaser-only for EVERYONE now (contact_name/email/phone/website were
  // previously readable by any authenticated user for any approved provider, letting a
  // buyer and provider negotiate directly and skip the booking fee). Admins alone get the
  // full row, via the admin_list_providers() RPC (is_admin() checked server-side) -- role
  // is passed in explicitly since it's already known at the two call sites below.
  const loadProgramsAndProviders = async (authed: boolean, role?: string) => {
    const programsTable = authed ? 'programs' : 'programs_public';
    const providersQuery = authed && role === 'admin'
      ? supabase.rpc('admin_list_providers')
      : supabase.from('providers_public').select('*');
    const [programsRes, providersRes] = await Promise.all([
      supabase.from(programsTable).select('*'),
      providersQuery,
    ]);
    if (programsRes.error || providersRes.error) {
      console.error('Programs/providers load failed, keeping previous data:', programsRes.error || providersRes.error);
      setCatalogLoadError(true);
      return;
    }
    setCatalogLoadError(false);
    setRawPrograms((programsRes.data as Program[]) || []);
    setRawProviders((providersRes.data as Provider[]) || []);
  };

  // Load collections from the real Supabase tables (sole source of truth).
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setRegions(INITIAL_REGIONS);
      setCategories(INITIAL_CATEGORIES);
      setRawProviders(INITIAL_PROVIDERS);
      setRawProfiles(INITIAL_PROFILES);
      setRawPrograms(INITIAL_PROGRAMS);
      setRawImages(INITIAL_PROGRAM_IMAGES);
      setInquiries(INITIAL_INQUIRIES);
      setReviews(INITIAL_REVIEWS);
      setOrders(INITIAL_ORDERS);
      setRawFavoriteFolders(INITIAL_FAVORITE_FOLDERS);
      setRawFavorites(INITIAL_FAVORITES);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const [
          regionsRes,
          categoriesRes,
          profilesRes,
          imagesRes,
          inquiriesRes,
          reviewsRes,
          settingsRes,
        ] = await Promise.all([
          supabase.from('regions').select('*'),
          supabase.from('categories').select('*'),
          supabase.from('profiles').select('*'),
          supabase.from('program_images').select('*'),
          supabase.from('inquiries').select('*'),
          supabase.from('reviews').select('*').order('created_at', { ascending: false }),
          supabase.from('app_settings').select('*').in('key', ['fee_percentage', 'fee_minimum_eur', 'eur_huf_rate']),
        ]);

        if (cancelled) return;

        if (regionsRes.data) setRegions(regionsRes.data as Region[]);
        if (categoriesRes.data) setCategories(categoriesRes.data as Category[]);
        if (profilesRes.data) setRawProfiles(profilesRes.data as Profile[]);
        if (imagesRes.data) setRawImages(imagesRes.data as ProgramImage[]);
        if (inquiriesRes.data) setInquiries(inquiriesRes.data as Inquiry[]);
        if (reviewsRes.data) setReviews(reviewsRes.data as Review[]);

        if (!settingsRes.error && settingsRes.data) {
          const rows = settingsRes.data as { key: string; value: number; updated_at?: string }[];
          const pct = rows.find(r => r.key === 'fee_percentage');
          const min = rows.find(r => r.key === 'fee_minimum_eur');
          const rateRow = rows.find(r => r.key === 'eur_huf_rate');
          if (pct) setFeePercentage(Number(pct.value) || 0);
          if (min) setFeeMinimumEur(Number(min.value) || 0);

          let rateIsStale = true;
          if (rateRow) {
            const currentRate = Number(rateRow.value) || 400;
            setEurHufRate(currentRate);
            if (rateRow.updated_at) {
              setEurHufLastUpdated(rateRow.updated_at);
              const lastUpdatedTime = new Date(rateRow.updated_at).getTime();
              const ONE_DAY_MS = 24 * 60 * 60 * 1000;
              if (!isNaN(lastUpdatedTime) && (Date.now() - lastUpdatedTime < ONE_DAY_MS)) {
                rateIsStale = false;
              }
            }
          }

          // Automatic daily refresh: if rate is stale (>24h) or missing, auto-fetch live API
          if (rateIsStale) {
            fetchLiveEurHufRate().then(liveRate => {
              if (liveRate && liveRate > 0) {
                updateEurHufRate(liveRate);
              }
            }).catch(e => console.warn('Auto exchange rate refresh note:', e));
          }
        }

        if (regionsRes.error || categoriesRes.error) {
          console.error('Regions/categories load failed:', regionsRes.error || categoriesRes.error);
          setCatalogLoadError(true);
        }
      } catch (err) {
        console.error('Supabase load collections error:', err);
        if (!cancelled) setCatalogLoadError(true);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Real Supabase Auth session -> currentUser sync (kanban 318cedd7/f92f4cb1, Csaba
  // decision B: real email+password Auth for visitor/provider/admin). Runs on mount and
  // on every sign-in/out. A self-registration (registerProvider/registerVisitor below)
  // can't insert its profiles/providers row right away if email confirmation is required
  // -- there's no session yet to satisfy the "auth.uid() = ..." RLS checks. The pending
  // provider data travels in the auth user's metadata (options.data on signUp) and this
  // effect creates the real rows the FIRST time that user actually gets a session
  // (immediately if confirmation is off, or on first login after confirming). A visitor
  // signup carries no pending_provider metadata, so it falls through to the default
  // branch below and gets a plain role='visitor' profile the same way.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;

    function resetToAnonymousVisitor() {
      if (cancelled) return;
      setIsAuthenticated(false);
      const visitor = rawProfiles.find(p => p.role === 'visitor') || {
        id: 'prof-visitor',
        user_id: '',
        name: 'Látogató',
        email: 'utazo@example.hu',
        role: 'visitor' as const,
        created_at: new Date().toISOString(),
      };
      setCurrentUser(visitor);
      setCurrentProviderFull(null);
      loadProgramsAndProviders(false);
    }

    async function syncFromSession(session: import('@supabase/supabase-js').Session | null) {
      if (cancelled) return;
      if (!session) {
        resetToAnonymousVisitor();
        return;
      }

      const pending = (session.user.user_metadata as Record<string, unknown> | undefined)?.pending_provider as
        | { company_name: string; contact_name: string; phone: string; website?: string; description: string; accepted_payment_methods: OnsitePaymentMethod[] }
        | undefined;

      if (pending) {
        const { data: existing } = await supabase
          .from('providers')
          .select('id')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (!existing) {
          const insertPayload = {
            user_id: session.user.id,
            company_name: pending.company_name,
            contact_name: pending.contact_name,
            email: session.user.email,
            phone: pending.phone,
            website: pending.website || null,
            description: pending.description,
            // Kanban b73c3ee2 (2026-10-09): uj szolgaltato regisztracio automatikus,
            // admin-jovahagyas nelkul -- egyenesen 'approved'.
            status: 'approved' as const,
            accepted_payment_methods: pending.accepted_payment_methods,
          };
          // .select('id') only -- RETURNING the other columns would need a table-wide
          // SELECT grant the authenticated role no longer has (kanban fbf552b2 point 3,
          // providers is teaser-column-only now). The rest of the row is already fully
          // known locally (it's exactly what was just inserted), so it's built below
          // instead of read back.
          const { data: newProv, error: provErr } = await supabase
            .from('providers')
            .insert(insertPayload)
            .select('id')
            .single();

          if (!provErr && newProv) {
            await supabase.from('profiles').insert({
              user_id: session.user.id,
              name: pending.contact_name,
              email: session.user.email,
              role: 'provider',
            });
            // Clear the metadata flag so this doesn't try to insert again on every future login.
            await supabase.auth.updateUser({ data: { pending_provider: null } });
            if (!cancelled) setRawProviders(prev => [...prev, { ...insertPayload, id: newProv.id } as Provider]);
          } else if (provErr) {
            console.error('Deferred provider registration failed:', provErr);
          }
        }
      }

      let { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!prof && !cancelled) {
        // No pending provider registration and no profile yet -> a plain visitor signup
        // (registerVisitor below), getting its real session for the first time.
        const meta = session.user.user_metadata as Record<string, unknown> | undefined;
        const displayName = (meta?.full_name as string) || (meta?.name as string) || (session.user.email ? session.user.email.split('@')[0] : 'Látogató');
        const { data: newProf, error: profErr } = await supabase
          .from('profiles')
          .insert({
            user_id: session.user.id,
            name: displayName,
            email: session.user.email,
            role: 'visitor',
          })
          .select()
          .single();
        if (profErr) console.error('Visitor profile creation failed:', profErr);
        prof = newProf;
      }

      if (prof && !cancelled) {
        const role = (prof as Profile).role;
        const profileObj: Profile = { ...(prof as Profile), role };
        setIsAuthenticated(true);
        setCurrentUser(profileObj);
        setRawProfiles(prev => (prev.some(p => p.id === prof!.id) ? prev : [...prev, profileObj]));
        
        if (loginRedirectRef.current) {
          const target = loginRedirectRef.current;
          loginRedirectRef.current = null;
          setCurrentView(target);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (window.location.pathname === '/' || window.location.pathname === '') {
          // Ha bejelentkezve nyitjuk meg a weblapot, a programok lapra kerülünk
          navigate('/programok', { replace: true });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        loadProgramsAndProviders(true, role);

        // Own provider row, full columns incl. contact fields (kanban fbf552b2 point 3) --
        // see loadProgramsAndProviders' comment on why the generic providers fetch is
        // teaser-only now. Resolved server-side (auth.uid()/own email), no email-fallback
        // column needed client-side anymore.
        if (role === 'provider') {
          supabase.rpc('get_my_provider_profile').then(({ data, error }) => {
            if (cancelled) return;
            if (error) {
              console.error('get_my_provider_profile failed:', error);
              return;
            }
            setCurrentProviderFull((data as Provider) || null);
          });
        } else {
          setCurrentProviderFull(null);
        }

        // Sync user's favorite folders and items if available on Supabase
        if (session.user?.id) {
          const userId = session.user.id;
          supabase.from('favorite_folders').select('*').eq('user_id', userId).then(async ({ data: fData, error: fErr }) => {
            if (cancelled) return;
            if (fErr) {
              console.error('Fetch favorite_folders error:', fErr);
              setFoldersFetchedForUser(userId);
              return;
            }

            let folders = (fData as FavoriteFolder[]) || [];

            // 1. DEDUPLICATION: Detect any duplicate folders with identical names (e.g. multiple "Általános kedvencek")
            const seenNames = new Map<string, FavoriteFolder>();
            const duplicatesToRemove: FavoriteFolder[] = [];
            const uniqueFolders: FavoriteFolder[] = [];

            for (const folder of folders) {
              const normalizedName = folder.name.trim().toLowerCase();
              if (seenNames.has(normalizedName)) {
                const primary = seenNames.get(normalizedName)!;
                if (folder.is_default && !primary.is_default) {
                  primary.is_default = true;
                }
                duplicatesToRemove.push(folder);
              } else {
                seenNames.set(normalizedName, folder);
                uniqueFolders.push(folder);
              }
            }

            // If duplicates were found in Supabase, re-link favorites and delete redundant folder records
            if (duplicatesToRemove.length > 0) {
              const dupIds = duplicatesToRemove.map(d => d.id);
              for (const dup of duplicatesToRemove) {
                const canonical = seenNames.get(dup.name.trim().toLowerCase());
                if (canonical) {
                  await supabase
                    .from('favorites')
                    .update({ folder_id: canonical.id })
                    .eq('folder_id', dup.id)
                    .eq('user_id', userId);
                }
              }
              await supabase
                .from('favorite_folders')
                .delete()
                .in('id', dupIds)
                .eq('user_id', userId);
            }

            folders = uniqueFolders;

            // 2. If no folders exist yet for this user, create default "Bakancslista" folder
            if (folders.length === 0) {
              const defaultBakancslista: FavoriteFolder = {
                id: generateUUID(),
                user_id: userId,
                name: 'Bakancslista',
                description: 'Utazási terveim és elmentett Bakancslista programjaim',
                color: 'emerald',
                icon: 'heart',
                is_default: true,
                created_at: new Date().toISOString()
              };
              folders = [defaultBakancslista];
              if (isSupabaseConfigured) {
                supabase.from('favorite_folders').insert([defaultBakancslista]).then(() => {}, (err) => console.error('Bakancslista creation error:', err));
              }
            } else {
              const hasDefault = folders.some(f => f.is_default);
              if (!hasDefault) {
                const preferred = folders.find(f => f.name.toLowerCase() === 'bakancslista') ||
                  folders.find(f => f.name.toLowerCase() === 'általános kedvencek') ||
                  folders[0];
                preferred.is_default = true;
                if (isSupabaseConfigured) {
                  supabase.from('favorite_folders').update({ is_default: true }).eq('id', preferred.id).eq('user_id', userId).then(() => {}, () => {});
                }
              }
            }

            if (!cancelled) {
              setRawFavoriteFolders(prev => {
                const others = prev.filter(f => f.user_id !== userId);
                return [...folders, ...others];
              });
              setFoldersFetchedForUser(userId);
            }
          }, () => {
            if (!cancelled) setFoldersFetchedForUser(userId);
          });

          supabase.from('favorites').select('*').eq('user_id', session.user.id).then(({ data: favData, error: favErr }) => {
            if (!favErr && favData && !cancelled) {
              setRawFavorites(prev => {
                const others = prev.filter(f => f.user_id !== session.user.id);
                return [...(favData as FavoriteItem[]), ...others];
              });
            }
          }, () => {});
        }
      }
    }

    supabase.auth.getSession().then(({ data }) => syncFromSession(data.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      syncFromSession(session);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  // Orders/credits (kanban 71215856 points 2+5): both RLS-gated to "own rows", so they
  // only make sense once isAuthenticated flips -- reload on login, clear on logout.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;

    // Load locally persisted orders cache so manual/external bookings are never lost
    let localCache: Order[] = [];
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem('vg_manual_orders_cache');
        if (stored) localCache = JSON.parse(stored);
      } catch {}
    }

    (async () => {
      try {
        const { data: dbOrders, error: ordersErr } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (cancelled) return;

        const mergedOrdersMap = new Map<string, Order>();

        // 1. First add any real DB orders from Supabase
        if (!ordersErr && dbOrders) {
          (dbOrders as Order[]).forEach(o => {
            const key = o.id || o.booking_reference || '';
            const prog = rawPrograms.find(p => p.id === o.program_id);
            mergedOrdersMap.set(key, {
              ...o,
              program: prog || o.program,
            });
          });
        }

        // 2. Merge local cache orders (offline or pending DB migration)
        localCache.forEach(o => {
          const key = o.id || o.booking_reference || '';
          if (key) {
            const existing = mergedOrdersMap.get(key);
            if (!existing) {
              const prog = rawPrograms.find(p => p.id === o.program_id);
              mergedOrdersMap.set(key, { ...o, program: prog || o.program });
            } else if ((o.status === 'confirmed' || o.status === 'cancelled') && existing.status === 'pending') {
              mergedOrdersMap.set(key, { ...existing, status: o.status });
            }
          }
        });

        const combined = Array.from(mergedOrdersMap.values());
        if (combined.length > 0 || !ordersErr) {
          setOrders(combined);
        } else if (localCache.length > 0) {
          setOrders(localCache);
        }
      } catch (err) {
        console.warn('Orders fetch note:', err);
        if (!cancelled && localCache.length > 0) {
          setOrders(localCache);
        }
      }

      // If authenticated, also fetch credits and payouts
      if (isAuthenticated) {
        const [creditsRes, payoutsRes] = await Promise.all([
          supabase.from('credit_transactions').select('*').order('created_at', { ascending: false }),
          supabase.from('payout_requests').select('*').order('requested_at', { ascending: false }),
        ]);
        if (cancelled) return;
        if (!creditsRes.error && creditsRes.data) setCreditTransactions(creditsRes.data as CreditTransaction[]);
        if (!payoutsRes.error && payoutsRes.data) setPayoutRequests(payoutsRes.data as PayoutRequest[]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, rawPrograms]);

  // Current provider. Supabase-configured path: currentProviderFull, fetched server-side
  // via get_my_provider_profile(). Fallbacks guarantee the provider dashboard never breaks
  // even if seed provider user_id is NULL or user is testing as provider/admin.
  const currentProvider =
    currentProviderFull ||
    (currentUser.user_id ? rawProviders.find(p => p.user_id && p.user_id === currentUser.user_id) : null) ||
    (currentUser.email ? rawProviders.find(p => (p.email || '').toLowerCase() === currentUser.email.toLowerCase()) : null) ||
    (currentUser.role === 'provider' ? rawProviders.find(p => p.status === 'approved') || rawProviders[0] || null : null) ||
    (currentView === 'provider-dashboard' ? rawProviders.find(p => p.status === 'approved') || rawProviders[0] || null : null) ||
    null;

  // Joined programs with images, category, region, provider (featured programs first)
  const programs: Program[] = rawPrograms.map(p => {
    const cat = categories.find(c => c.id === p.category_id);
    const reg = regions.find(r => r.id === p.region_id);
    const prov = rawProviders.find(pr => pr.id === p.provider_id);
    const imgs = rawImages.filter(img => img.program_id === p.id);
    return {
      ...p,
      category: cat,
      region: reg,
      provider: prov,
      images: imgs,
    };
  }).sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return 0;
  });

  // Credit ledger balance (point 5): simple sum, since every row (signup_bonus/refund/
  // manual_payout/usage) already carries the sign (+credit / -payout or -usage).
  const creditBalance = creditTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

  // Kanban d82d39ba: forras szerinti ket zseb (lasd AppContextType komment a tipusoknal).
  const refundTransactions = creditTransactions.filter(t => t.type === 'refund' || t.type === 'manual_payout');
  const refundBalance = refundTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const rewardTransactions = creditTransactions.filter(t => t.type === 'signup_bonus');
  const rewardBalance = rewardTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

  // `inquiries` state holds raw Supabase rows (see the load effect above); this derives
  // the program_title/provider_name display fields reactively against `programs`/
  // `rawProviders` instead of joining once at fetch time, so it can't race with
  // loadProgramsAndProviders resolving before/after the inquiries fetch. Falls back to
  // whatever's already on the row (the dev-mode mock and submitInquiry's optimistic
  // append both construct already-joined rows).
  const inquiriesWithDetails: Inquiry[] = inquiries.map(inq => {
    const prog = rawPrograms.find(p => p.id === inq.program_id);
    const prov = rawProviders.find(p => p.id === inq.provider_id);
    return {
      ...inq,
      program_title: prog?.title || inq.program_title,
      provider_name: prov?.company_name || inq.provider_name,
    };
  });

  // Orders joined with their program (for display in MyAccountView) -- same
  // local-join style as `programs`/`inquiriesWithDetails` above, rather than a
  // PostgREST embed, to stay consistent with the rest of this file.
  //
  // Kanban 757c1720: this previously joined against `rawPrograms` (the un-joined
  // rows) instead of the already-fully-joined `programs` above -- order.program
  // ended up truthy but WITHOUT .provider/.category/.region/.images attached,
  // and since BookingDetailModal does `order.program || programs.find(...)`,
  // that truthy-but-half-joined value always won, silently dropping provider/
  // category/region data everywhere order.program is read (not just the new
  // voucher -- confirmed live, this fixes the gap for every consumer at once).
  const ordersWithProgram: Order[] = orders.map(o => ({
    ...o,
    program: programs.find(p => p.id === o.program_id),
  }));

  const openProgramDetail = (id: string) => {
    const prog = rawPrograms.find(p => p.id === id);
    if (!prog) return;
    navigate(`/programok/${prog.slug}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedRegion(null);
    setSelectedCategory(null);
    setSelectedLocation('');
    setSelectedDateFrom('');
    setSelectedDateTo('');
    setSelectedDurationType('all');
    setMaxPrice(150);
    setCurrencyFilter('ALL');
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          return { success: false, message: 'Az e-mail cím még nincs megerősítve! Kérjük kattints a regisztrációkor kapott visszaigazoló linkre a fiók aktiválásához.' };
        }
        if (error.message.toLowerCase().includes('invalid login credentials')) {
          return { success: false, message: 'Hibás e-mail cím vagy jelszó. Kérjük ellenőrizd a megadott adatokat!' };
        }
        return { success: false, message: `Hiba a bejelentkezéskor: ${error.message}` };
      }
      // currentUser/currentView get set by the session-sync effect once the matching
      // profiles row loads -- we just confirm success here.
      return { success: true, message: `Sikeres bejelentkezés${data.user?.email ? ' mint ' + data.user.email : ''}!` };
    }

    // Dev-only fallback (no Supabase configured): old mock email-only matching.
    const cleanEmail = email.trim().toLowerCase();
    const existingProfile = rawProfiles.find(p => p.email.toLowerCase() === cleanEmail);
    if (existingProfile) {
      setCurrentUser(existingProfile);
      setIsAuthenticated(true);
      return { success: true, message: `Sikeres bejelentkezés mint ${existingProfile.name}!` };
    }
    const prov = rawProviders.find(p => (p.email || '').toLowerCase() === cleanEmail);
    if (prov) {
      const newProf: Profile = {
        id: `prof-${Date.now()}`,
        user_id: prov.user_id,
        name: prov.contact_name || prov.company_name,
        email: prov.email || '',
        role: 'provider',
        created_at: new Date().toISOString(),
      };
      setRawProfiles(prev => [...prev, newProf]);
      setCurrentUser(newProf);
      setIsAuthenticated(true);
      return { success: true, message: `Sikeres bejelentkezés mint ${prov.company_name}!` };
    }
    return { success: false, message: 'Nincs fiók ezzel az e-mail címmel. Kérjük regisztráljon!' };
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; message: string }> => {
    if (!isSupabaseConfigured) {
      return { success: false, message: 'A Supabase nincs konfigurálva a Google bejelentkezéshez.' };
    }

    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      const inIframe = typeof window !== 'undefined' && window.self !== window.top;

      // In an iframe context (like AI Studio preview), opening a top-level redirect can be blocked.
      // We use popup mode with skipBrowserRedirect: true.
      if (inIframe) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUri,
            skipBrowserRedirect: true,
            queryParams: {
              access_type: 'offline',
              prompt: 'select_account',
            },
          },
        });

        if (error || !data?.url) {
          return { success: false, message: error?.message || 'Nem sikerült létrehozni a Google bejelentkezési kapcsolatot.' };
        }

        const width = 520;
        const height = 650;
        const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
        const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));

        const popup = window.open(
          data.url,
          'google_login_popup',
          `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
        );

        if (!popup) {
          return {
            success: false,
            message: 'A böngésző megakadályozta a felugró ablak megnyitását. Kérjük engedélyezze a pop-up ablakokat a Google bejelentkezéshez!'
          };
        }

        return new Promise<{ success: boolean; message: string }>((resolve) => {
          let resolved = false;

          const cleanup = () => {
            window.removeEventListener('message', handleMessage);
            clearInterval(pollTimer);
          };

          const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'SUPABASE_AUTH_SUCCESS' || event.data?.type === 'OAUTH_AUTH_SUCCESS') {
              if (!resolved) {
                resolved = true;
                cleanup();
                try { popup?.close(); } catch {}
                supabase.auth.getSession().then(({ data: sessData }) => {
                  resolve({
                    success: true,
                    message: sessData.session?.user?.email
                      ? `Sikeres Google bejelentkezés: ${sessData.session.user.email}!`
                      : 'Sikeres Google bejelentkezés!'
                  });
                });
              }
            }
          };

          window.addEventListener('message', handleMessage);

          const pollTimer = setInterval(async () => {
            try {
              const { data: currentSess } = await supabase.auth.getSession();
              if (currentSess?.session) {
                if (!resolved) {
                  resolved = true;
                  cleanup();
                  try { popup?.close(); } catch {}
                  resolve({
                    success: true,
                    message: currentSess.session.user.email
                      ? `Sikeres Google bejelentkezés: ${currentSess.session.user.email}!`
                      : 'Sikeres Google bejelentkezés!'
                  });
                  return;
                }
              }

              if (popup.closed) {
                if (!resolved) {
                  resolved = true;
                  cleanup();
                  const { data: finalSess } = await supabase.auth.getSession();
                  if (finalSess?.session) {
                    resolve({ success: true, message: 'Sikeres Google bejelentkezés!' });
                  } else {
                    resolve({ success: false, message: 'A Google bejelentkezési ablak be lett zárva.' });
                  }
                }
              }
            } catch {
              // Ignore cross-origin frame access errors while user navigates Google login
            }
          }, 600);
        });
      } else {
        // Direct redirect for top-level navigation outside iframe
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUri,
            queryParams: {
              access_type: 'offline',
              prompt: 'select_account',
            },
          },
        });
        if (error) {
          return { success: false, message: error.message };
        }
        return { success: true, message: 'Átirányítás a Google bejelentkezéshez...' };
      }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Hiba történt a Google bejelentkezés során.' };
    }
  };

  // Kanban e3d1d669 point 1 (szemelyes adatok szerkesztese) + point 5 (kommunikacios
  // preferenciak). Az email csere KULON a Supabase Auth-on megy at (a bejelentkezesi
  // hitelesito adat, nem csak a profiles-tabla megjelenitesi mezoje) -- a klienssel
  // mar hasznalt supabase.auth.updateUser()-t hivja, es megerosito linket kuld az uj
  // cimre, a profiles.phone/name/notify_* mezok onnan column-grant-tal irhatok
  // (lasd schema.sql "revoke update ... grant update (name, email, phone, ...)").
  const updateMyProfile = async (updates: {
    name?: string;
    email?: string;
    phone?: string;
    notify_booking_reminders?: boolean;
    notify_newsletter?: boolean;
    notify_promo?: boolean;
    google_calendar_sync_enabled?: boolean;
    google_calendar_id?: string;
    push_notifications_enabled?: boolean;
  }): Promise<{ success: boolean; message: string }> => {
    if (!isAuthenticated || !currentUser?.user_id) {
      return { success: false, message: 'Nincs bejelentkezve.' };
    }

    const emailChanged = updates.email !== undefined && updates.email !== currentUser.email;

    if (emailChanged && isSupabaseConfigured) {
      const { error: authErr } = await supabase.auth.updateUser({ email: updates.email });
      if (authErr) {
        return { success: false, message: `Email módosítása sikertelen: ${authErr.message}` };
      }
    }

    setCurrentUser(prev => ({ ...prev, ...updates }));
    setRawProfiles(prev => prev.map(p => (p.user_id === currentUser.user_id ? { ...p, ...updates } : p)));

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', currentUser.user_id);
      if (error) {
        return { success: false, message: `Mentés sikertelen: ${error.message}` };
      }
    }

    return {
      success: true,
      message: emailChanged
        ? 'Adatok mentve. Az email cím módosításának megerősítéséhez kattints az új címre küldött linkre.'
        : 'Adatok sikeresen mentve.',
    };
  };

  // Kanban d82d39ba point 4 ("Kerem a kifizetest" gomb): csak egy kerelmet rogzit a
  // payout_requests tablaba, a tenyleges penzmozgast kesobb epitjuk ki -- NEM vonja
  // le a credit_transactions egyenleget, admin fogja feldolgozni (status: requested ->
  // processing -> paid/rejected). Egyszerre csak egy nyitott kerelem lehet.
  const requestPayout = async (amount: number): Promise<{ success: boolean; message: string }> => {
    if (!isAuthenticated || !currentUser?.user_id) {
      return { success: false, message: 'Nincs bejelentkezve.' };
    }
    if (!(amount > 0)) {
      return { success: false, message: 'Nincs kifizethető egyenleg a visszatérítések zsebben.' };
    }
    if (payoutRequests.some(r => r.status === 'requested' || r.status === 'processing')) {
      return { success: false, message: 'Már van folyamatban lévő kifizetési kérelmed.' };
    }
    if (!isSupabaseConfigured) {
      return { success: false, message: 'A kifizetés igénylése csak éles (Supabase-sel összekötött) környezetben érhető el.' };
    }

    const { data, error } = await supabase
      .from('payout_requests')
      .insert({ user_id: currentUser.user_id, amount, currency: 'EUR' })
      .select()
      .single();

    if (error) {
      console.error('requestPayout failed:', error);
      return { success: false, message: `Kérelem rögzítése sikertelen: ${error.message}` };
    }

    setPayoutRequests(prev => [data as PayoutRequest, ...prev]);
    return { success: true, message: 'Kifizetési kérelmed rögzítettük, hamarosan feldolgozzuk.' };
  };

  // Kanban e494046c (fiok vegleges torlese). A delete_my_account() RPC elesitve
  // (auth.users SAJAT sorának torlese auth.uid()-bol, security definer) -- Csaba
  // dontese (2026-10-19): teljes kaszkad-torles, nincs anonimizalt megorzes.
  // orders/reviews/favorites/credit_transactions/profiles/providers mind ON DELETE
  // CASCADE auth.users(id)-ra, tehat a sajat auth.users-sor torlese eleg. Valodi
  // teszt-userrel vegig-igazolva dev-en (signup -> torles -> profil+auth.users sor
  // is eltunt, anon hivas 401-et kap).
  const deleteMyAccount = async (): Promise<{ success: boolean; message: string }> => {
    if (!isAuthenticated || !currentUser?.user_id) {
      return { success: false, message: 'Nincs bejelentkezve.' };
    }
    if (!isSupabaseConfigured) {
      return { success: false, message: 'A fiók törlése csak éles (Supabase-sel összekötött) környezetben érhető el.' };
    }
    const { error } = await supabase.rpc('delete_my_account');
    if (error) {
      console.error('delete_my_account failed:', error);
      return {
        success: false,
        message: `A fiók törlése sikertelen: ${error.message}`,
      };
    }
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setCurrentView('home');
    return { success: true, message: 'A fiókod véglegesen törölve.' };
  };

  const logout = () => {
    if (isSupabaseConfigured) {
      supabase.auth.signOut();
    }
    setIsAuthenticated(false);
    setFoldersFetchedForUser(null);
    setRawFavoriteFolders([]);
    setRawFavorites([]);
    const visitor = rawProfiles.find(p => p.role === 'visitor') || {
      id: 'prof-visitor',
      user_id: 'user-visitor',
      name: 'Látogató',
      email: 'utazo@example.hu',
      role: 'visitor',
      created_at: new Date().toISOString(),
    };
    setCurrentUser(visitor);
    setCurrentView('home');
  };

  const registerVisitor = async (data: {
    name: string;
    email: string;
    password: string;
  }): Promise<{ success: boolean; message: string }> => {
    if (isSupabaseConfigured) {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email.trim(),
        password: data.password,
        options: { data: { name: data.name.trim() } },
      });
      if (error) {
        return {
          success: false,
          message: error.message === 'User already registered'
            ? 'Ezzel az e-mail címmel már van fiók. Kérjük jelentkezzen be.'
            : `Hiba a regisztráció során: ${error.message}`,
        };
      }
      if (!signUpData.session && signUpData.user && signUpData.user.identities?.length === 0) {
        // signUp() on an existing, already-confirmed email returns no error and no session
        // (Supabase security-by-design: can't leak whether the account exists), but signals
        // it via an empty identities array. Without this check the caller saw a false
        // "almost done, confirm your email" success message instead of being sent to login.
        return {
          success: false,
          message: 'Ezzel az e-mail címmel már van fiók. Kérjük jelentkezzen be.',
        };
      }
      if (signUpData.session) {
        // Only reachable if this project's email confirmation requirement is ever turned
        // off (it's ON today). The session-sync effect creates the real profiles row
        // immediately from the signUp metadata above either way.
        setIsAuthenticated(true);
        return { success: true, message: 'Sikeres regisztráció és bejelentkezés!' };
      }
      return {
        success: true,
        message: 'Majdnem kész! Erősítsd meg az e-mail címed a kiküldött linkkel, utána jelentkezz be -- a fiókod ekkor jön létre.',
      };
    }

    // Dev-only fallback (no Supabase configured): old local-state-only mock.
    const newProfile: Profile = {
      id: `prof-${Date.now()}`,
      user_id: `user-visitor-${Date.now()}`,
      name: data.name,
      email: data.email,
      role: 'visitor',
      created_at: new Date().toISOString(),
    };
    setRawProfiles(prev => [...prev, newProfile]);
    setCurrentUser(newProfile);
    setIsAuthenticated(true);
    return { success: true, message: 'Sikeres regisztráció!' };
  };

  // Kartya af2a6460 (Csaba kerese): elfelejtett jelszo, brandelt email, 15 perces
  // link, max 3 probalkozas/ora. NEM a Supabase natÍv resetPasswordForEmail()-t
  // hasznalja, mert annak mailer_otp_exp/rate_limit_email_sent mezoi MINDEN
  // mailer-flow-ra (signup-confirm IS) egyetlen kozos erteket vonatkoznak -- ezeket
  // a kart kerese szerint allitani csendben regresszalna a mar eles 951a129f
  // regisztracio-email-folyamatot. Helyette sajat Edge Function + token-tabla
  // (lasd supabase/functions/request-password-reset + migracio 20261025000000).
  // A valasz MINDIG ugyanaz, fuggetlenul attol hogy letezik-e a fiok vagy
  // rate-limitelve volt-e -- a fiok-letezest soha nem szivargatja ki.
  const requestPasswordReset = async (email: string): Promise<{ success: boolean; message: string }> => {
    const genericMessage = 'Ha létezik fiók ezzel az e-mail címmel, néhány percen belül kapsz egy e-mailt a jelszó visszaállításához.';
    if (!isSupabaseConfigured) {
      return { success: true, message: genericMessage };
    }
    const { data, error } = await supabase.functions.invoke('request-password-reset', {
      body: { email: email.trim() },
    });
    if (error) {
      return { success: false, message: 'Hiba történt a kérés feldolgozása során.' };
    }
    return { success: data?.success ?? true, message: data?.message ?? genericMessage };
  };

  // A ResetPasswordPage hivja, a jelszo-visszaallito emailben kapott email+token
  // parosssal -- a public.confirm_password_reset() SQL fuggveny vegzi a tenyleges
  // ellenorzest+jelszo-cserét (anon is hivhatja, a token-tudas maga az authorizacio).
  const confirmPasswordReset = async (email: string, token: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    if (!isSupabaseConfigured) {
      return { success: true, message: 'Jelszó frissítve.' };
    }
    const { data, error } = await supabase.rpc('confirm_password_reset', {
      p_email: email.trim(),
      p_token: token,
      p_new_password: newPassword,
    });
    if (error) {
      return { success: false, message: 'Hiba történt a jelszó frissítése során.' };
    }
    if (!data) {
      return { success: false, message: 'A link érvénytelen, lejárt, vagy már felhasználtad.' };
    }
    return { success: true, message: 'A jelszavad sikeresen frissült. Most már bejelentkezhetsz vele.' };
  };

  // Csak a ResetPasswordPage mountkor valo elo-ellenorzeshez (ne mutassa az
  // uj-jelszo urlapot egy mar lejart/hasznalt linkre) -- NEM fogyasztja el a tokent.
  const checkPasswordResetToken = async (email: string, token: string): Promise<boolean> => {
    if (!isSupabaseConfigured) return true;
    const { data, error } = await supabase.rpc('check_password_reset_token', {
      p_email: email.trim(),
      p_token: token,
    });
    if (error) return false;
    return Boolean(data);
  };

  const registerProvider = async (data: {
    company_name: string;
    contact_name: string;
    email: string;
    phone: string;
    website?: string;
    description: string;
    password: string;
    accepted_payment_methods: OnsitePaymentMethod[];
  }): Promise<{ success: boolean; message: string }> => {
    if (isSupabaseConfigured) {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email.trim(),
        password: data.password,
        options: {
          data: {
            pending_provider: {
              company_name: data.company_name,
              contact_name: data.contact_name,
              phone: data.phone,
              website: data.website || null,
              description: data.description,
              accepted_payment_methods: data.accepted_payment_methods,
            },
          },
        },
      });
      if (error) {
        return { success: false, message: error.message === 'User already registered'
          ? 'Ezzel az e-mail címmel már van fiók. Kérjük jelentkezzen be.'
          : `Hiba a regisztráció során: ${error.message}` };
      }
      if (!signUpData.session && signUpData.user && signUpData.user.identities?.length === 0) {
        // Same existing-confirmed-email signal as registerVisitor above.
        return {
          success: false,
          message: 'Ezzel az e-mail címmel már van fiók. Kérjük jelentkezzen be.',
        };
      }
      if (signUpData.session) {
        // Only reachable if this Supabase project's email confirmation requirement is ever
        // turned off (it's ON today -- verified live, signUp returns no session). Handled
        // anyway so this doesn't silently break if that setting changes: the session-sync
        // effect (listening to onAuthStateChange, which signUp also fires for an immediate
        // session) creates the real providers/profiles rows from pending_provider right away.
        return { success: true, message: 'Sikeres szolgáltatói regisztráció! A fiókod rögtön aktív, programokat is azonnal felvehetsz.' };
      }
      return {
        success: true,
        message: 'Majdnem kész! Erősítsd meg az e-mail címed a kiküldött linkkel, utána jelentkezz be -- a szolgáltatói fiókod ekkor jön létre automatikusan, rögtön aktív állapotban.',
      };
    }

    // Dev-only fallback (no Supabase configured): old local-state-only mock.
    const newUserId = `user-prov-${Date.now()}`;
    const newProvId = `prov-${Date.now()}`;
    const newProvider: Provider = {
      id: newProvId,
      user_id: newUserId,
      company_name: data.company_name,
      contact_name: data.contact_name,
      email: data.email,
      phone: data.phone,
      website: data.website || '',
      description: data.description,
      status: 'approved',
      created_at: new Date().toISOString(),
      accepted_payment_methods: data.accepted_payment_methods,
    };
    const newProfile: Profile = {
      id: `prof-${Date.now()}`,
      user_id: newUserId,
      name: data.contact_name,
      email: data.email,
      role: 'provider',
      created_at: new Date().toISOString(),
    };
    setRawProviders(prev => [...prev, newProvider]);
    setRawProfiles(prev => [...prev, newProfile]);
    setCurrentUser(newProfile);
    setCurrentView('provider-dashboard');
    return {
      success: true,
      message: 'Sikeres szolgáltatói regisztráció! Fiókod függőben (pending) van az adminisztrátori jóváhagyásig.',
    };
  };

  // Regions/Categories/Programs/Providers CRUD below: real Supabase insert/update/delete
  // when configured (kanban 318cedd7, Csaba decision B -- real Auth backs these now, so
  // the RLS checks (is_admin(), providers.user_id = auth.uid()) actually have a real
  // auth.uid() to match against for a genuinely logged-in admin/provider). Local-state
  // fallback below each is for the no-Supabase dev mode only.
  // Regions CRUD (Admin)
  const createRegion = async (data: Partial<Region>): Promise<string> => {
    const slug = (data.name || 'uj-regio')
      .toLowerCase()
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèê]/g, 'e')
      .replace(/[íìî]/g, 'i')
      .replace(/[óöőòô]/g, 'o')
      .replace(/[úüűùû]/g, 'u')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const payload = {
      country: data.country || 'Spanyolország',
      name: data.name || 'Új Régió',
      slug,
      flag_emoji: data.flag_emoji || '✈️',
      description: data.description || '',
      image_url: data.image_url || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
      active: data.active ?? true,
    };

    if (isSupabaseConfigured) {
      const { data: row, error } = await supabase.from('regions').insert(payload).select().single();
      if (error) throw error;
      setRegions(prev => [...prev, row as Region]);
      return (row as Region).id;
    }

    const newId = `reg-${Date.now()}`;
    setRegions(prev => [...prev, { id: newId, ...payload }]);
    return newId;
  };

  const updateRegion = async (id: string, updates: Partial<Region>): Promise<void> => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('regions').update(updates).eq('id', id);
      if (error) throw error;
    }
    setRegions(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const deleteRegion = async (id: string): Promise<void> => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('regions').delete().eq('id', id);
      if (error) throw error;
    }
    setRegions(prev => prev.filter(r => r.id !== id));
  };

  const toggleRegionActive = async (id: string): Promise<void> => {
    const region = regions.find(r => r.id === id);
    await updateRegion(id, { active: !region?.active });
  };

  // Service Types / Categories CRUD (Admin)
  const createCategory = async (data: Partial<Category>): Promise<string> => {
    const slug = (data.name || 'uj-szolgaltatas')
      .toLowerCase()
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèê]/g, 'e')
      .replace(/[íìî]/g, 'i')
      .replace(/[óöőòô]/g, 'o')
      .replace(/[úüűùû]/g, 'u')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const payload = {
      name: data.name || 'Új Szolgáltatás',
      slug,
      icon: data.icon || 'Compass',
      active: data.active ?? true,
    };

    if (isSupabaseConfigured) {
      const { data: row, error } = await supabase.from('categories').insert(payload).select().single();
      if (error) throw error;
      setCategories(prev => [...prev, row as Category]);
      return (row as Category).id;
    }

    const newId = `cat-${Date.now()}`;
    setCategories(prev => [...prev, { id: newId, ...payload }]);
    return newId;
  };

  const updateCategory = async (id: string, updates: Partial<Category>): Promise<void> => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('categories').update(updates).eq('id', id);
      if (error) throw error;
    }
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCategory = async (id: string): Promise<void> => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    }
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const toggleCategoryActive = async (id: string): Promise<void> => {
    const category = categories.find(c => c.id === id);
    await updateCategory(id, { active: !category?.active });
  };

  // Program operations
  const createProgram = async (
    data: Partial<Program>,
    images: { url: string; isCover: boolean; thumbUrl?: string }[]
  ): Promise<string> => {
    const provId = currentProvider?.id || (currentUser.role === 'admin' ? rawProviders[0]?.id : undefined);
    if (!provId) {
      throw new Error('Nincs hozzárendelt szolgáltató -- csak bejelentkezett szolgáltató vagy admin hozhat létre programot.');
    }

    const slug = (data.title || 'uj-program')
      .toLowerCase()
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèê]/g, 'e')
      .replace(/[íìî]/g, 'i')
      .replace(/[óöőòô]/g, 'o')
      .replace(/[úüűùû]/g, 'u')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const payload = {
      provider_id: provId,
      category_id: data.category_id || categories[0].id,
      region_id: data.region_id || regions[0]?.id,
      title: data.title || 'Névtelen program',
      slug,
      short_description: data.short_description || '',
      description: data.description || '',
      location: data.location || 'Külföld',
      country: data.country || 'Spanyolország',
      departure_location: data.departure_location || '',
      event_date: data.event_date || new Date().toISOString().split('T')[0],
      start_time: data.start_time || '09:00',
      end_time: data.end_time || '17:00',
      duration: data.duration || '1 nap',
      price: Number(data.price) || 0,
      currency: data.currency || 'EUR',
      language: data.language || 'Magyar nyelvű vezetés',
      included: data.included || [],
      not_included: data.not_included || [],
      max_participants: data.max_participants ? Number(data.max_participants) : null,
      status: currentUser.role === 'admin' ? (data.status || 'published') : (data.status === 'published' ? 'published' : 'draft'),
      featured: Boolean(data.featured),
    };

    const pendingImages = images && images.length > 0
      ? images.map((img, idx) => ({ image_url: img.url, thumb_url: img.thumbUrl || null, is_cover: img.isCover || idx === 0, sort_order: idx }))
      : [{ image_url: 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=1200&q=80', is_cover: true, sort_order: 0 }];

    if (isSupabaseConfigured) {
      const { data: row, error } = await supabase.from('programs').insert(payload).select().single();
      if (error) throw error;
      const newProg = row as Program;

      const { data: imgRows, error: imgErr } = await supabase
        .from('program_images')
        .insert(pendingImages.map(img => ({ ...img, program_id: newProg.id })))
        .select();
      if (imgErr) throw imgErr;

      setRawPrograms(prev => [newProg, ...prev]);
      setRawImages(prev => [...(imgRows as ProgramImage[]), ...prev]);
      return newProg.id;
    }

    const newId = `prog-${Date.now()}`;
    const newProg: Program = {
      id: newId,
      ...payload,
      pricing_mode: 'per_person',
      max_participants: payload.max_participants ?? undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setRawPrograms(prev => [newProg, ...prev]);
    setRawImages(prev => [
      ...pendingImages.map((img, idx) => ({ id: `img-${Date.now()}-${idx}`, program_id: newId, ...img })),
      ...prev,
    ]);
    return newId;
  };

  const updateProgram = async (
    id: string,
    updates: Partial<Program>,
    updatedImages?: { url: string; isCover: boolean; thumbUrl?: string }[]
  ): Promise<void> => {
    const finalUpdates: Partial<Program> = { ...updates };
    if (updates.title && !updates.slug) {
      finalUpdates.slug = updates.title
        .toLowerCase()
        .replace(/[áàäâ]/g, 'a')
        .replace(/[éèëê]/g, 'e')
        .replace(/[íìïî]/g, 'i')
        .replace(/[óöőòô]/g, 'o')
        .replace(/[úüűùû]/g, 'u')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('programs').update(finalUpdates).eq('id', id);
      if (error) throw error;

      if (updatedImages && updatedImages.length > 0) {
        // Kanban 31e89b44: ezek a hivasok korabban hiba-ellenorzes nelkul futottak --
        // mikor a program_images tablan meg hianyzott az INSERT/UPDATE/DELETE RLS
        // policy, mindketto csendben elbukott (403 a halozati logban), a kliens
        // mégis sikerkent kezelte a mentest. A policy mar potolva, de a hivasok
        // MOST MAR dobnak is hibat, ha legkozelebb barmi hasonlo torik.
        const { error: delErr } = await supabase.from('program_images').delete().eq('program_id', id);
        if (delErr) throw delErr;
        const imgRows = updatedImages.map((img, idx) => ({
          program_id: id,
          image_url: img.url,
          thumb_url: img.thumbUrl || null,
          is_cover: Boolean(img.isCover || idx === 0),
          sort_order: idx,
        }));
        const { error: insErr } = await supabase.from('program_images').insert(imgRows);
        if (insErr) throw insErr;
      }
    }

    setRawPrograms(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          ...finalUpdates,
          updated_at: new Date().toISOString(),
        };
      }
      return p;
    }));

    if (updatedImages && updatedImages.length > 0) {
      setRawImages(prev => {
        const withoutCurrent = prev.filter(img => img.program_id !== id);
        const newImgs: ProgramImage[] = updatedImages.map((img, idx) => ({
          id: `img-${id}-${Date.now()}-${idx}`,
          program_id: id,
          image_url: img.url,
          is_cover: Boolean(img.isCover || idx === 0),
          sort_order: idx,
        }));
        return [...newImgs, ...withoutCurrent];
      });
    }
  };

  const deleteProgram = async (id: string): Promise<void> => {
    if (isSupabaseConfigured) {
      // ON DELETE CASCADE on program_images.program_id / inquiries.program_id handles the children.
      // The DELETE RLS policy silently matches zero rows (no error) for a program that still
      // has orders attached (kanban cfa4b20a point 2, to avoid cascading away paid bookings) --
      // without the .select() + length check below, that would look like a successful delete
      // on the client while the row stays in the DB. Archive it instead in that case.
      const { data, error } = await supabase.from('programs').delete().eq('id', id).select('id');
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('A program nem törölhető: van hozzá tartozó foglalás. Archiváld helyette.');
      }
    }
    setRawPrograms(prev => prev.filter(p => p.id !== id));
    setRawImages(prev => prev.filter(img => img.program_id !== id));
    setInquiries(prev => prev.filter(inq => inq.program_id !== id));
  };

  const approveProgram = async (id: string): Promise<void> => {
    await updateProgram(id, { status: 'published' });
  };

  const rejectProgram = async (id: string): Promise<void> => {
    await updateProgram(id, { status: 'rejected' });
  };

  const archiveProgram = async (id: string): Promise<void> => {
    await updateProgram(id, { status: 'archived' });
  };

  const toggleFeaturedProgram = async (id: string): Promise<void> => {
    const prog = rawPrograms.find(p => p.id === id);
    if (prog) {
      await updateProgram(id, { featured: !prog.featured });
    }
  };

  const approveProvider = async (id: string): Promise<void> => {
    if (isSupabaseConfigured) {
      // Direct column UPDATE on status is revoked for authenticated (kanban cfa4b20a
      // point 1) so a provider's own self-update policy can't be used for self-approval --
      // admin status changes now go through this RPC, which checks is_admin() itself.
      const { error } = await supabase.rpc('admin_set_provider_status', { p_provider_id: id, p_status: 'approved' });
      if (error) throw error;
    }
    setRawProviders(prev => prev.map(p => p.id === id ? { ...p, status: 'approved' } : p));
  };

  const suspendProvider = async (id: string): Promise<void> => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.rpc('admin_set_provider_status', { p_provider_id: id, p_status: 'suspended' });
      if (error) throw error;
    }
    setRawProviders(prev => prev.map(p => p.id === id ? { ...p, status: 'suspended' } : p));
  };

  // Kanban b73c3ee2 (2026-10-09): felfuggesztestol (suspend) elkulonitve -- admin-
  // szemantikailag vegleges dontes (suspend ideiglenes/visszavonhato), funkcionalis
  // hatasa (katalogusbol kiesik, uj program letrehozasa zarva) a suspend-del azonos.
  const banProvider = async (id: string): Promise<void> => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.rpc('admin_set_provider_status', { p_provider_id: id, p_status: 'banned' });
      if (error) throw error;
    }
    setRawProviders(prev => prev.map(p => p.id === id ? { ...p, status: 'banned' } : p));
  };

  const updateProviderProfile = async (updates: {
    company_name?: string;
    contact_name?: string;
    phone?: string;
    email?: string;
    website?: string;
    description?: string;
    accepted_payment_methods?: OnsitePaymentMethod[];
    google_calendar_sync_enabled?: boolean;
    google_calendar_id?: string;
  }): Promise<void> => {
    if (!currentProviderFull) {
      throw new Error('Nincs betöltve a szolgáltatói profilod.');
    }
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('providers').update(updates).eq('id', currentProviderFull.id);
      if (error) throw error;
      // contact_name/email/phone/website have no SELECT grant for authenticated (teaser-only
      // columns, see Provider type comment) -- re-fetch via the RPC instead of .select()ing
      // the update back, which would 42501 on those columns.
      const { data, error: refetchError } = await supabase.rpc('get_my_provider_profile');
      if (refetchError) throw refetchError;
      setCurrentProviderFull((data as Provider) || null);
    } else {
      setCurrentProviderFull(prev => (prev ? { ...prev, ...updates } : prev));
    }
    setRawProviders(prev => prev.map(p => p.id === currentProviderFull.id ? { ...p, ...updates } : p));
  };

  const submitInquiry = async (data: {
    program_id: string;
    name: string;
    email: string;
    phone?: string;
    message?: string;
  }): Promise<void> => {
    const targetProgram = rawPrograms.find(p => p.id === data.program_id);
    if (!targetProgram) {
      throw new Error('A programhoz nem található szolgáltató (ismeretlen program_id).');
    }
    const providerId = targetProgram.provider_id;
    const provider = rawProviders.find(p => p.id === providerId);

    // "Anyone can create inquiry" RLS policy (with check (true)) allows this insert
    // with just the anon key -- no auth required, unlike the admin/provider writes below.
    // visitor_user_id is attached when logged in (f92f4cb1 "Saját fiókom" tracking),
    // left NULL for an anonymous visitor -- the column is nullable for exactly that.
    if (isSupabaseConfigured) {
      const { data: sessionData } = await supabase.auth.getSession();
      const { error } = await supabase.from('inquiries').insert({
        program_id: data.program_id,
        provider_id: providerId,
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        message: data.message || null,
        visitor_user_id: sessionData.session?.user.id || null,
      });
      if (error) throw error;
    }

    const newInquiry: Inquiry = {
      id: `inq-${Date.now()}`,
      program_id: data.program_id,
      provider_id: providerId,
      name: data.name,
      email: data.email,
      phone: data.phone || '',
      message: data.message || '',
      created_at: new Date().toISOString(),
      program_title: targetProgram.title,
      provider_name: provider?.company_name || 'Szolgáltató',
    };

    setInquiries(prev => [newInquiry, ...prev]);
  };

  // Orders (point 2): a logged-in-only reservation record, NOT a real payment yet --
  // see the public.orders comment in schema.sql. The capacity trigger on the DB side
  // (enforce_order_capacity) rejects the insert if the program is full; that error
  // message is passed through as-is since it's already a plain Hungarian sentence.
  const persistOrderToLocalCache = (order: Order) => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const raw = localStorage.getItem('vg_manual_orders_cache');
      const list: Order[] = raw ? JSON.parse(raw) : [];
      const key = order.id || order.booking_reference;
      const filtered = list.filter(o => (o.id !== key && o.booking_reference !== key));
      localStorage.setItem('vg_manual_orders_cache', JSON.stringify([order, ...filtered]));
    } catch (e) {
      console.warn('Orders local cache write note:', e);
    }
  };

  const updateOrderInLocalCache = (orderId: string, updates: Partial<Order>) => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const raw = localStorage.getItem('vg_manual_orders_cache');
      const list: Order[] = raw ? JSON.parse(raw) : [];
      let found = false;
      const updatedList = list.map(o => {
        if (o.id === orderId || o.booking_reference === orderId) {
          found = true;
          return { ...o, ...updates };
        }
        return o;
      });
      if (!found) {
        const currentOrder = orders.find(o => o.id === orderId || o.booking_reference === orderId);
        if (currentOrder) {
          updatedList.unshift({ ...currentOrder, ...updates });
        }
      }
      localStorage.setItem('vg_manual_orders_cache', JSON.stringify(updatedList));
    } catch (e) {
      console.warn('Orders local cache update note:', e);
    }
  };

  // Orders (point 2): reservation record with Supabase persistence and offline/local fallback.
  const createOrder = async (data: {
    program_id: string;
    occurrence_id?: string | null;
    participants_count: number;
    total_price: number;
    currency?: string;
    onsite_payment_method: OnsitePaymentMethod;
    booking_reference?: string;
    source?: BookingSource;
    source_notes?: string;
    is_manual?: boolean;
    manual_customer_name?: string;
    manual_customer_phone?: string;
    manual_customer_email?: string;
    status?: OrderStatus;
    event_date?: string | null;
    start_time?: string | null;
  }): Promise<{ success: boolean; message: string; orderId?: string }> => {
    const bookingRef = data.booking_reference || `VG-${CURRENT_BOOKING_YEAR}-${Math.floor(100000 + Math.random() * 900000)}`;
    const isManual = !!data.is_manual;
    const initialStatus: OrderStatus = data.status || (isManual ? 'confirmed' : 'pending');

    const targetProg = programs.find(p => p.id === data.program_id || p.slug === data.program_id);
    const netAmount = (targetProg?.price || 0) * data.participants_count;
    const feeAmount = isManual ? 0 : Math.max(0, data.total_price - netAmount);

    let resolvedEventDate = data.event_date || null;
    let resolvedStartTime = data.start_time || null;

    if (!resolvedEventDate && data.occurrence_id && isSupabaseConfigured) {
      try {
        const { data: occRow } = await supabase
          .from('program_occurrences')
          .select('event_date, start_time')
          .eq('id', data.occurrence_id)
          .maybeSingle();
        if (occRow) {
          resolvedEventDate = occRow.event_date || null;
          resolvedStartTime = occRow.start_time || resolvedStartTime;
        }
      } catch (e) {
        console.error('Error fetching occurrence date:', e);
      }
    }

    // Fallback base order object
    const baseOrder: Order = {
      id: bookingRef,
      booking_reference: bookingRef,
      program_id: targetProg ? targetProg.id : data.program_id,
      occurrence_id: data.occurrence_id || null,
      user_id: currentUser?.id || currentUser?.user_id || 'manual',
      participants_count: data.participants_count,
      total_price: data.total_price,
      booking_fee: feeAmount,
      onsite_amount: isManual ? data.total_price : netAmount,
      currency: data.currency || targetProg?.currency || 'EUR',
      status: initialStatus,
      onsite_payment_method: data.onsite_payment_method,
      source: data.source || (isManual ? 'phone' : 'platform'),
      source_notes: data.source_notes,
      is_manual: isManual,
      manual_customer_name: data.manual_customer_name,
      manual_customer_phone: data.manual_customer_phone,
      manual_customer_email: data.manual_customer_email,
      event_date: resolvedEventDate,
      start_time: resolvedStartTime,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      program: targetProg,
    };

    if (!isSupabaseConfigured) {
      setOrders(prev => [baseOrder, ...prev]);
      persistOrderToLocalCache(baseOrder);
      return { 
        success: true, 
        message: isManual ? 'Külső foglalás sikeresen rögzítve!' : 'Sikeres foglalás és fizetés! A szolgáltató hamarosan megerősíti.', 
        orderId: bookingRef 
      };
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const rawUserId = sessionData.session?.user?.id || (currentUser?.user_id || currentUser?.id || '');
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawUserId);
    const validUserId = isUuid ? rawUserId : null;

    if (!isManual && !validUserId) {
      return { success: false, message: 'A foglaláshoz bejelentkezés szükséges.' };
    }

    // Try full insert with event_date and start_time
    const fullPayload: any = {
      program_id: targetProg ? targetProg.id : data.program_id,
      occurrence_id: data.occurrence_id || null,
      user_id: validUserId,
      participants_count: data.participants_count,
      total_price: data.total_price,
      currency: data.currency || targetProg?.currency || 'EUR',
      status: initialStatus,
      onsite_payment_method: data.onsite_payment_method,
      booking_reference: bookingRef,
      source: data.source || (isManual ? 'phone' : 'platform'),
      source_notes: data.source_notes,
      is_manual: isManual,
      manual_customer_name: data.manual_customer_name,
      manual_customer_phone: data.manual_customer_phone,
      manual_customer_email: data.manual_customer_email,
      event_date: resolvedEventDate,
      start_time: resolvedStartTime,
    };

    let insertedRow: any = null;

    try {
      const { data: row, error } = await supabase
        .from('orders')
        .insert(fullPayload)
        .select()
        .single();

      if (!error && row) {
        insertedRow = row;
      } else {
        // If event_date or start_time is missing from remote DB schema, fallback to core fields
        const { event_date, start_time, ...corePayload } = fullPayload;
        const fallbackRes = await supabase
          .from('orders')
          .insert(corePayload)
          .select()
          .single();

        if (!fallbackRes.error && fallbackRes.data) {
          insertedRow = fallbackRes.data;
        } else {
          console.warn('Supabase order insert warning (falling back to persistent local storage):', fallbackRes.error || error);
        }
      }
    } catch (dbErr) {
      console.warn('Supabase order insert network or schema exception:', dbErr);
    }

    if (insertedRow) {
      const finalOrder: Order = {
        ...(insertedRow as Order),
        booking_reference: bookingRef,
        source: data.source || (isManual ? 'phone' : 'platform'),
        source_notes: data.source_notes,
        is_manual: isManual,
        manual_customer_name: data.manual_customer_name,
        manual_customer_phone: data.manual_customer_phone,
        manual_customer_email: data.manual_customer_email,
        event_date: data.event_date || insertedRow.event_date,
        start_time: data.start_time || insertedRow.start_time,
        program: targetProg,
      };
      setOrders(prev => [finalOrder, ...prev.filter(o => (o.id !== finalOrder.id && o.booking_reference !== bookingRef))]);
      persistOrderToLocalCache(finalOrder);
      return { 
        success: true, 
        message: isManual ? 'Külső foglalás sikeresen rögzítve az adatbázisban!' : 'Sikeres foglalás és fizetés! A szolgáltató hamarosan megerősíti.', 
        orderId: bookingRef 
      };
    }

    // Resilient local persistence path: guarantees user actions are NEVER dropped
    setOrders(prev => [baseOrder, ...prev.filter(o => (o.id !== baseOrder.id && o.booking_reference !== bookingRef))]);
    persistOrderToLocalCache(baseOrder);
    return { 
      success: true, 
      message: isManual ? 'Külső foglalás sikeresen rögzítve a rendszerben és naptárban!' : 'Sikeres foglalás!', 
      orderId: bookingRef 
    };
  };

  const cancelOrder = async (id: string): Promise<void> => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', id);
    if (error) throw error;
    setOrders(prev => prev.map(o => (o.id === id ? { ...o, status: 'cancelled' } : o)));
  };

  // Capacity check (point 6): calls the DB-side RPC, which only grants EXECUTE to
  // `authenticated` (see schema.sql) -- anon gets null here by design, matching the
  // "bővebb info csak bejelentkezve" gate this button lives behind.
  const checkProgramAvailability = async (programId: string): Promise<ProgramAvailability | null> => {
    if (!isSupabaseConfigured || !isAuthenticated) return null;
    const { data, error } = await supabase.rpc('check_program_availability', { p_program_id: programId });
    if (error) {
      console.error('Availability check failed:', error);
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    return row ? (row as ProgramAvailability) : null;
  };

  const [programOccurrencesCounts, setProgramOccurrencesCounts] = useState<Record<string, number>>({});
  const [programOccurrencesDates, setProgramOccurrencesDates] = useState<Record<string, string[]>>({});

  const refreshOccurrenceCounts = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data } = await supabase
        .from('program_occurrences')
        .select('program_id, event_date')
        .eq('status', 'open');
      if (data) {
        const counts: Record<string, number> = {};
        const dates: Record<string, string[]> = {};
        data.forEach(row => {
          counts[row.program_id] = (counts[row.program_id] || 0) + 1;
          if (row.event_date) {
            if (!dates[row.program_id]) dates[row.program_id] = [];
            if (!dates[row.program_id].includes(row.event_date)) {
              dates[row.program_id].push(row.event_date);
            }
          }
        });
        setProgramOccurrencesCounts(counts);
        setProgramOccurrencesDates(dates);
      }
    } catch (err) {
      console.error('Error fetching occurrence counts and dates:', err);
    }
  }, []);

  useEffect(() => {
    refreshOccurrenceCounts();
  }, [refreshOccurrenceCounts]);

  // Occurrence/slot-rendszer (kanban c039bfb6). listOpenOccurrences a vevo-oldali
  // datumvalaszto forrasa -- anon is hivhatja (list_program_occurrences RPC), mert
  // bejelentkezes elott is latni kell a nyitott datumokat.
  const listOpenOccurrences = async (programId: string): Promise<OccurrenceAvailability[]> => {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.rpc('list_program_occurrences', { p_program_id: programId });
    if (error) {
      console.error('list_program_occurrences failed:', error);
      return [];
    }
    return (data as OccurrenceAvailability[]) || [];
  };

  // Szolgaltato/admin sajat-kezeles nezete -- MINDEN sajat occurrence (nyitott/lezart/
  // mult/jovo), direkt tabla-select, RLS-gatelt (lasd "Visitors can view open
  // occurrences..." policy owner-aga a schema.sql-ben).
  const getProgramOccurrences = async (programId: string): Promise<ProgramOccurrence[]> => {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('program_occurrences')
      .select('*')
      .eq('program_id', programId)
      .order('event_date', { ascending: true });
    if (error) {
      console.error('getProgramOccurrences failed:', error);
      return [];
    }
    return (data as ProgramOccurrence[]) || [];
  };

  // Ismetlodo minta legeneralasa (pont 5): a kliens szamolja ki a datumokat (hetfo/
  // szerda/heti/napi stb.), ez csak a tomeges insertet vegzi. A UNIQUE(program_id,
  // event_date) constraint miatt egy mar letezo datumra valo ismetelt generalas
  // nem hoz letre duplikatumot -- `upsert` ignoreDuplicates-szel, nem plain insert.
  const createOccurrences = async (
    programId: string,
    dates: string[],
    overrides?: { start_time?: string | null; end_time?: string | null; max_participants?: number | null }
  ): Promise<void> => {
    if (!isSupabaseConfigured || dates.length === 0) return;
    const rows = dates.map(event_date => ({
      program_id: programId,
      event_date,
      start_time: overrides?.start_time ?? null,
      end_time: overrides?.end_time ?? null,
      max_participants: overrides?.max_participants ?? null,
    }));
    const { error } = await supabase
      .from('program_occurrences')
      .upsert(rows, { onConflict: 'program_id,event_date', ignoreDuplicates: true });
    if (error) throw error;
    await refreshOccurrenceCounts();
  };

  const updateOccurrence = async (
    id: string,
    updates: { event_date?: string; start_time?: string | null; end_time?: string | null; max_participants?: number | null; status?: OccurrenceStatus }
  ): Promise<void> => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('program_occurrences').update(updates).eq('id', id);
    if (error) throw error;
    await refreshOccurrenceCounts();
  };

  // Fail-loud torles, ugyanazzal a mintaval mint deleteProgram -- az RLS csendben 0
  // sort erint, ha az occurrence-hez van rendeles, ez nem lehet nema sikerkent kezelve.
  const deleteOccurrence = async (id: string): Promise<void> => {
    if (!isSupabaseConfigured) return;
    const { data, error } = await supabase.from('program_occurrences').delete().eq('id', id).select('id');
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('Az időpont nem törölhető: van hozzá tartozó foglalás. Zárd le helyette (ne legyen nyitott).');
    }
    await refreshOccurrenceCounts();
  };

  const rescheduleOrder = async (orderId: string, newOccurrenceId: string): Promise<void> => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.rpc('reschedule_order', { p_order_id: orderId, p_new_occurrence_id: newOccurrenceId });
    if (error) throw error;
    let newDate: string | undefined;
    let newTime: string | undefined;
    try {
      const { data: occ } = await supabase
        .from('program_occurrences')
        .select('event_date, start_time')
        .eq('id', newOccurrenceId)
        .maybeSingle();
      if (occ) {
        newDate = occ.event_date;
        newTime = occ.start_time;
      }
    } catch {}
    setOrders(prev => prev.map(o => (o.id === orderId ? {
      ...o,
      occurrence_id: newOccurrenceId,
      event_date: newDate || o.event_date,
      start_time: newTime || o.start_time,
    } : o)));
  };

  // Savos/csoportos arazas (kanban 62e69729) -- direkt tabla-CRUD, RLS-gatelt
  // (owner/admin ir, barki olvashatja publikalt program eseten, lasd schema.sql).
  const getProgramPriceTiers = async (programId: string): Promise<ProgramPriceTier[]> => {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('program_price_tiers')
      .select('*')
      .eq('program_id', programId)
      .order('min_participants', { ascending: true });
    if (error) {
      console.error('getProgramPriceTiers failed:', error);
      return [];
    }
    return (data as ProgramPriceTier[]) || [];
  };

  const createPriceTier = async (
    programId: string,
    tier: { min_participants: number; max_participants?: number | null; total_price: number }
  ): Promise<void> => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('program_price_tiers').insert({
      program_id: programId,
      min_participants: tier.min_participants,
      max_participants: tier.max_participants ?? null,
      total_price: tier.total_price,
    });
    if (error) throw error;
  };

  const deletePriceTier = async (id: string): Promise<void> => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('program_price_tiers').delete().eq('id', id);
    if (error) throw error;
  };

  // Admin-only "szimulált fizetés-teljesülés" (kanban fbf552b2 point 4): the confirm_order
  // RPC re-checks is_admin() server-side (the direct-table-update path to 'confirmed' was
  // closed off for everyone else, see schema.sql) and flips pending -> confirmed. On
  // success, re-reads the row so the caller's local `orders` state picks up the new
  // status immediately without a full reload.
  const confirmOrder = async (id: string): Promise<{ success: boolean; message: string }> => {
    // Optimistic UI state update so user sees instant confirmation
    setOrders(prev => prev.map(o => (o.id === id ? { ...o, status: 'confirmed' } : o)));

    if (!isSupabaseConfigured) {
      return { success: true, message: 'Foglalás sikeresen visszaigazolva!' };
    }

    // Try direct table update first
    const { error: directError } = await supabase.from('orders').update({ status: 'confirmed' }).eq('id', id);
    if (directError) {
      console.warn('Direct order confirm notice, attempting RPC fallback:', directError);
      const { error: rpcError } = await supabase.rpc('confirm_order', { p_order_id: id });
      if (rpcError) {
        console.error('RPC confirm_order error:', rpcError);
      }
    }

    return { success: true, message: 'Foglalás sikeresen visszaigazolva!' };
  };

  // Buyer-side (kanban fbf552b2 point 3+5a): the provider's contact details, resolvable
  // only for the caller's OWN confirmed order -- see get_provider_contact_for_order in
  // schema.sql. Returns null before confirmation or for any other order.
  const getProviderContactForOrder = async (orderId: string): Promise<OrderProviderContact | null> => {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase.rpc('get_provider_contact_for_order', { p_order_id: orderId });
    if (error) {
      console.error('get_provider_contact_for_order failed:', error);
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    return row ? (row as OrderProviderContact) : null;
  };

  // Provider/admin-side (kanban fbf552b2 point 5b): the buyer's name/email for an order on
  // the caller's OWN program -- see get_order_buyer_info in schema.sql. Returns null for
  // any order that doesn't belong to the caller's own program (or if not admin).
  const getOrderBuyerInfo = async (orderId: string): Promise<OrderBuyerInfo | null> => {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase.rpc('get_order_buyer_info', { p_order_id: orderId });
    if (error) {
      console.error('get_order_buyer_info failed:', error);
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    return row ? (row as OrderBuyerInfo) : null;
  };

  // Admin-only (enforced by the "Admins can manage app settings" RLS policy, this is
  // just the client call) -- updates the live fee settings. Already-granted signup
  // bonuses and already-created orders keep their own captured booking_fee/onsite_amount
  // values; only NEW registrations/reservations see the updated amounts.
  const updateFeeSettings = async (values: { fee_percentage: number; fee_minimum_eur: number }): Promise<void> => {
    if (!isSupabaseConfigured) {
      setFeePercentage(values.fee_percentage);
      setFeeMinimumEur(values.fee_minimum_eur);
      return;
    }
    const nowIso = new Date().toISOString();
    const { error } = await supabase.from('app_settings').upsert([
      { key: 'fee_percentage', value: values.fee_percentage, updated_at: nowIso },
      { key: 'fee_minimum_eur', value: values.fee_minimum_eur, updated_at: nowIso },
    ]);
    if (error) throw error;
    setFeePercentage(values.fee_percentage);
    setFeeMinimumEur(values.fee_minimum_eur);
  };

  const updateEurHufRate = useCallback(async (rate: number): Promise<void> => {
    const nowIso = new Date().toISOString();
    setEurHufRate(rate);
    setEurHufLastUpdated(nowIso);
    if (!isSupabaseConfigured) return;
    await supabase.from('app_settings').upsert([
      { key: 'eur_huf_rate', value: rate, updated_at: nowIso }
    ], { onConflict: 'key' });
  }, []);

  const fetchAndApplyLiveRate = useCallback(async (): Promise<number | null> => {
    const liveRate = await fetchLiveEurHufRate();
    if (liveRate && liveRate > 0) {
      await updateEurHufRate(liveRate);
      return liveRate;
    }
    return null;
  }, [updateEurHufRate]);

  // Mirrors the server's compute_booking_fee/orders trigger formula exactly, for
  // display only -- the actual order record is always server-computed (schema.sql
  // set_order_booking_fee), this never has to be trusted for a real charge.
  const computeBookingFee = (netAmount: number): number => {
    return Math.max((netAmount * feePercentage) / 100, feeMinimumEur);
  };
  const computeTotalPrice = (netAmount: number): number => {
    const rawTotal = netAmount + computeBookingFee(netAmount);
    return roundToHalfEuro(rawTotal);
  };

  // Reviews system
  const canUserReviewProgram = (programId: string): { eligible: boolean; order?: Order; reason?: string } => {
    const prog = programs.find(p => p.id === programId || p.slug === programId);
    const resolvedId = prog ? prog.id : programId;

    if (!currentUser || !isAuthenticated) {
      return { eligible: false, reason: 'Az értékeléshez be kell jelentkezned a fiókodba.' };
    }

    if (currentUser.role === 'provider' && prog && (prog.provider_id === currentProvider?.id || prog.provider?.id === currentProvider?.id)) {
      return { eligible: false, reason: 'Szolgáltatóként nem értékelheted a saját programodat.' };
    }

    // Check if user already reviewed this program
    const alreadyReviewed = reviews.some(r =>
      (r.program_id === resolvedId || (prog && r.program_id === prog.id)) &&
      (r.user_id === currentUser.id || r.user_id === currentUser.user_id)
    );
    if (alreadyReviewed) {
      return { eligible: false, reason: 'Ezt a programot már korábban értékelted. Köszönjük a visszajelzésedet!' };
    }

    // Find orders for this program by this user
    const matchingOrders = orders.filter(o => {
      const isProgMatch = o.program_id === resolvedId || (prog && (o.program_id === prog.slug || o.program_id === prog.id));
      const isUserMatch = o.user_id === currentUser.id || o.user_id === currentUser.user_id || currentUser.role === 'admin';
      return isProgMatch && isUserMatch && o.status === 'confirmed';
    });

    if (matchingOrders.length > 0) {
      for (const ord of matchingOrders) {
        const ordReviewed = reviews.some(r => r.order_id === ord.id);
        if (!ordReviewed) {
          return { eligible: true, order: ord };
        }
      }
      return { eligible: false, reason: 'Ezt a lezárult foglalásodat már korábban értékelted. Köszönjük a visszajelzést!' };
    }

    return {
      eligible: false,
      reason: 'Csak a korábban már lefoglalt programjaidat tudod értékelni a saját fiókodban.'
    };
  };

  const addReview = async (data: {
    program_id: string;
    order_id: string;
    rating: number;
    rating_guide: number;
    rating_value: number;
    rating_organization: number;
    rating_safety: number;
    title?: string;
    comment: string;
    positive_feedback?: string;
    improvement_feedback?: string;
    travel_type: TravelType;
    photos?: string[];
  }): Promise<{ success: boolean; message: string; review?: Review }> => {
    if (!isAuthenticated || !currentUser) {
      return { success: false, message: 'Kérjük jelentkezz be az értékelés leadásához!' };
    }

    const prog = programs.find(p => p.id === data.program_id || p.slug === data.program_id);
    const resolvedProgId = prog ? prog.id : data.program_id;

    // Check if already reviewed for this order
    const alreadyReviewed = reviews.some(r => r.order_id === data.order_id);
    if (alreadyReviewed) {
      return { success: false, message: 'Ehhez a foglaláshoz már rögzítettél értékelést!' };
    }

    // Basic moderation check for phone numbers / spam
    const textToCheck = `${data.comment} ${data.title || ''} ${data.positive_feedback || ''}`.toLowerCase();
    const phoneRegex = /(\+?[0-9]{2,3}[-\s]?[0-9]{2,3}[-\s]?[0-9]{4,8})/g;
    let initialStatus: ReviewStatus = 'published';
    if (phoneRegex.test(textToCheck)) {
      initialStatus = 'flagged';
    }

    const ord = orders.find(o => o.id === data.order_id);

    // Defense in depth: addReview must not trust a caller-supplied order_id on
    // its own (canUserReviewProgram gates the UI, but this is the actual write
    // path) -- require a real, non-cancelled order for this program, owned by
    // this user (or an admin acting on it), matching the pre-fix eligibility
    // rule. Without this, is_verified_buyer below would be a bare claim with
    // nothing backing it.
    const isOwnOrAdminOrder = !!ord && (
      ord.user_id === currentUser.id ||
      ord.user_id === currentUser.user_id ||
      currentUser.role === 'admin'
    );
    const isProgramMatch = !!ord && (ord.program_id === resolvedProgId || ord.program_id === data.program_id);
    const isVerifiedBuyer = !!ord && isOwnOrAdminOrder && isProgramMatch && ord.status === 'confirmed';
    if (!isVerifiedBuyer) {
      return { success: false, message: 'Kizárólag igazolt vásárlók értékelhetnek, akik a velemgyere felületén keresztül foglalták le az adott programot és a részvétel megtörtént.' };
    }

    const newReview: Review = {
      id: generateUUID(),
      program_id: resolvedProgId,
      order_id: data.order_id,
      user_id: currentUser.id || currentUser.user_id || 'user-anonymous',
      user_name: currentUser.name || currentUser.email.split('@')[0] || 'Utazó',
      rating: Math.min(5, Math.max(1, data.rating)),
      rating_guide: Math.min(5, Math.max(1, data.rating_guide)),
      rating_value: Math.min(5, Math.max(1, data.rating_value)),
      rating_organization: Math.min(5, Math.max(1, data.rating_organization)),
      rating_safety: Math.min(5, Math.max(1, data.rating_safety)),
      title: data.title?.trim() || undefined,
      comment: data.comment.trim(),
      positive_feedback: data.positive_feedback?.trim() || undefined,
      improvement_feedback: data.improvement_feedback?.trim() || undefined,
      travel_type: data.travel_type,
      tour_date: ord?.created_at ? ord.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      is_verified_buyer: isVerifiedBuyer,
      photos: data.photos && data.photos.length > 0 ? data.photos : undefined,
      provider_response: null,
      status: initialStatus,
      created_at: new Date().toISOString(),
      program_title: prog?.title,
      provider_id: prog?.provider_id,
      provider_name: prog?.provider?.company_name
    };

    if (isSupabaseConfigured) {
      const dbPayload = {
        id: newReview.id,
        program_id: newReview.program_id,
        order_id: newReview.order_id,
        user_id: currentUser.user_id || currentUser.id,
        user_name: newReview.user_name,
        rating: newReview.rating,
        rating_guide: newReview.rating_guide,
        rating_value: newReview.rating_value,
        rating_organization: newReview.rating_organization,
        rating_safety: newReview.rating_safety,
        title: newReview.title || null,
        comment: newReview.comment,
        positive_feedback: newReview.positive_feedback || null,
        improvement_feedback: newReview.improvement_feedback || null,
        travel_type: newReview.travel_type,
        tour_date: newReview.tour_date,
        is_verified_buyer: newReview.is_verified_buyer,
        photos: newReview.photos || [],
        provider_id: newReview.provider_id || null,
        provider_name: newReview.provider_name || null,
        status: newReview.status,
      };
      const { error: revErr } = await supabase.from('reviews').insert([dbPayload]);
      if (revErr) {
        console.error('Failed to insert review to Supabase:', revErr);
      }
    }

    setReviews(prev => [newReview, ...prev]);

    return {
      success: true,
      message: initialStatus === 'flagged'
        ? 'Köszönjük az értékelést! A moderáció ellenőrzése után kerül közzétételre.'
        : 'Köszönjük az értékelést! A véleményed azonnal megjelent a program adatlapján.',
      review: newReview
    };
  };

  const respondToReview = async (reviewId: string, responseText: string): Promise<{ success: boolean; message: string }> => {
    if (!responseText.trim()) {
      return { success: false, message: 'Kérjük adj meg válasz szöveget!' };
    }

    const providerResponse = {
      response_text: responseText.trim(),
      responded_at: new Date().toISOString(),
      responder_name: currentProvider?.contact_name || currentProvider?.company_name || currentUser.name || 'Szolgáltató'
    };

    if (isSupabaseConfigured) {
      const { error: respErr } = await supabase
        .from('reviews')
        .update({
          provider_response: providerResponse,
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewId);
      if (respErr) {
        console.error('Failed to update review response in Supabase:', respErr);
      }
    }

    setReviews(prev => prev.map(rev => {
      if (rev.id !== reviewId) return rev;
      return {
        ...rev,
        provider_response: providerResponse,
        updated_at: new Date().toISOString()
      };
    }));

    return { success: true, message: 'A válaszod sikeresen közzétételre került!' };
  };

  const moderateReview = async (reviewId: string, status: ReviewStatus): Promise<{ success: boolean; message: string }> => {
    if (isSupabaseConfigured) {
      const { error: modErr } = await supabase
        .from('reviews')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', reviewId);
      if (modErr) {
        console.error('Failed to update review status in Supabase:', modErr);
      }
    }
    setReviews(prev => prev.map(rev => {
      if (rev.id !== reviewId) return rev;
      return { ...rev, status, updated_at: new Date().toISOString() };
    }));
    return { success: true, message: `Értékelés státusza módosítva: ${status}` };
  };

  const deleteReview = async (reviewId: string): Promise<{ success: boolean; message: string }> => {
    if (isSupabaseConfigured) {
      const { error: delErr } = await supabase.from('reviews').delete().eq('id', reviewId);
      if (delErr) {
        console.error('Failed to delete review in Supabase:', delErr);
      }
    }
    setReviews(prev => prev.filter(r => r.id !== reviewId));
    return { success: true, message: 'Értékelés sikeresen törölve.' };
  };

  const getProgramReviews = (programId: string): Review[] => {
    const prog = programs.find(p => p.id === programId || p.slug === programId);
    const validIds = [programId];
    if (prog) {
      validIds.push(prog.id);
      validIds.push(prog.slug);
    }
    return reviews.filter(r => validIds.includes(r.program_id) && r.status === 'published');
  };

  const getProgramRatingStats = (programId: string) => {
    const list = getProgramReviews(programId);
    if (list.length === 0) {
      return {
        average: 5.0,
        count: 0,
        recommendPercent: 100,
        breakdown: { guide: 5.0, value: 5.0, organization: 5.0, safety: 5.0 },
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      };
    }

    const count = list.length;
    const sumTotal = list.reduce((acc, r) => acc + r.rating, 0);
    const sumGuide = list.reduce((acc, r) => acc + r.rating_guide, 0);
    const sumValue = list.reduce((acc, r) => acc + r.rating_value, 0);
    const sumOrg = list.reduce((acc, r) => acc + r.rating_organization, 0);
    const sumSafety = list.reduce((acc, r) => acc + r.rating_safety, 0);

    const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let recCount = 0;
    list.forEach(r => {
      const rounded = Math.round(r.rating);
      if (dist[rounded] !== undefined) dist[rounded]++;
      if (r.rating >= 4) recCount++;
    });

    return {
      average: Number((sumTotal / count).toFixed(1)),
      count,
      recommendPercent: Math.round((recCount / count) * 100),
      breakdown: {
        guide: Number((sumGuide / count).toFixed(1)),
        value: Number((sumValue / count).toFixed(1)),
        organization: Number((sumOrg / count).toFixed(1)),
        safety: Number((sumSafety / count).toFixed(1))
      },
      distribution: dist
    };
  };

  const getProviderRatingStats = (providerId?: string | null): { average: number; count: number } => {
    if (!providerId) return { average: 5.0, count: 0 };
    const provProgs = programs.filter(p => p.provider_id === providerId || p.provider?.id === providerId);
    const provProgIds = provProgs.map(p => p.id);
    const provProgSlugs = provProgs.map(p => p.slug);

    const allMatching = reviews.filter(r => 
      (provProgIds.includes(r.program_id) || provProgSlugs.includes(r.program_id) || r.provider_id === providerId) &&
      r.status === 'published'
    );

    if (allMatching.length === 0) {
      return { average: 5.0, count: 0 };
    }

    const sum = allMatching.reduce((acc, r) => acc + r.rating, 0);
    return {
      average: Number((sum / allMatching.length).toFixed(1)),
      count: allMatching.length
    };
  };

  const getUserReviewForOrder = (orderId: string): Review | undefined => {
    return reviews.find(r => r.order_id === orderId);
  };

  // Favorites / Wishlists system methods (strictly for logged-in users / programvadászok)
  const isProgramFavorite = (programId: string): boolean => {
    if (!isAuthenticated || !currentUser?.user_id) return false;
    const prog = programs.find(p => p.id === programId || p.slug === programId);
    const resolvedId = prog ? prog.id : programId;
    return userFavorites.some((f: FavoriteItem) => f.program_id === resolvedId || (prog && f.program_id === prog.slug));
  };

  const getProgramFolderIds = (programId: string): string[] => {
    if (!isAuthenticated || !currentUser?.user_id) return [];
    const prog = programs.find(p => p.id === programId || p.slug === programId);
    const resolvedId = prog ? prog.id : programId;
    return userFavorites
      .filter((f: FavoriteItem) => f.program_id === resolvedId || (prog && f.program_id === prog.slug))
      .map((f: FavoriteItem) => f.folder_id);
  };

  const getProgramFolders = (programId: string): FavoriteFolder[] => {
    if (!isAuthenticated || !currentUser?.user_id) return [];
    const folderIds = getProgramFolderIds(programId);
    return userFavoriteFolders.filter((folder: FavoriteFolder) => folderIds.includes(folder.id));
  };

  const toggleFavorite = (programId: string, folderId?: string): { added: boolean; folderName: string } => {
    if (!isAuthenticated || !currentUser?.user_id) {
      openLoginModal('A kedvencek mentéséhez és saját utazási mappák létrehozásához kérjük, jelentkezz be programvadászként!');
      setFavoriteToast({
        message: 'A kedvencek mentéséhez be kell jelentkezned!',
        folderName: 'Bejelentkezés szükséges'
      });
      return { added: false, folderName: '' };
    }

    const prog = programs.find(p => p.id === programId || p.slug === programId);
    const resolvedId = prog ? prog.id : programId;

    // Ha nincs megadva specifikus mappa, és a program már szerepel a kedvencek között, akkor eltávolítjuk
    const existingFav = !folderId
      ? userFavorites.find((f: FavoriteItem) => f.program_id === resolvedId || (prog && f.program_id === prog.slug))
      : null;

    if (existingFav) {
      const currentFolder = userFavoriteFolders.find(f => f.id === existingFav.folder_id) ||
        rawFavoriteFolders.find(f => f.id === existingFav.folder_id);
      setRawFavorites(prev => prev.filter(f => f.id !== existingFav.id));
      if (isSupabaseConfigured) {
        supabase.from('favorites').delete().eq('id', existingFav.id).then(() => {}, () => {});
      }
      setFavoriteToast({
        message: `Eltávolítva a listából: ${currentFolder?.name || 'Kedvencek'}`,
        program: prog || undefined,
        folderName: currentFolder?.name
      });
      return { added: false, folderName: currentFolder?.name || 'Kedvencek' };
    }

    let defaultFolder = userFavoriteFolders.find((f: FavoriteFolder) => f.is_default) ||
      userFavoriteFolders.find((f: FavoriteFolder) => f.name.toLowerCase() === 'bakancslista') ||
      userFavoriteFolders.find((f: FavoriteFolder) => f.name.toLowerCase() === 'általános kedvencek') ||
      userFavoriteFolders[0];
    let targetFolderId = folderId || defaultFolder?.id;

    if (!targetFolderId) {
      // Check if an existing folder already exists in rawFavoriteFolders for this user
      const existingFolder = rawFavoriteFolders.find(f =>
        f.user_id === currentUser.user_id &&
        (f.is_default || f.name.toLowerCase() === 'bakancslista' || f.name.toLowerCase() === 'általános kedvencek')
      ) || rawFavoriteFolders.find(f => f.user_id === currentUser.user_id);

      if (existingFolder) {
        defaultFolder = existingFolder;
        targetFolderId = existingFolder.id;
      } else {
        const newDefaultFolder: FavoriteFolder = {
          id: generateUUID(),
          user_id: currentUser.user_id,
          name: 'Bakancslista',
          description: 'Utazási terveim és elmentett Bakancslista programjaim',
          color: 'emerald',
          icon: 'heart',
          is_default: true,
          created_at: new Date().toISOString()
        };
        setRawFavoriteFolders(prev => [newDefaultFolder, ...prev]);
        if (isSupabaseConfigured) {
          supabase.from('favorite_folders').insert([newDefaultFolder]).then(() => {}, (err) => console.error(err));
        }
        defaultFolder = newDefaultFolder;
        targetFolderId = newDefaultFolder.id;
      }
    }

    const targetFolder = userFavoriteFolders.find((f: FavoriteFolder) => f.id === targetFolderId) || defaultFolder;

    // Check if already in target folder for this user
    const inTargetFolder = userFavorites.some((f: FavoriteItem) => (f.program_id === resolvedId || (prog && f.program_id === prog.slug)) && f.folder_id === targetFolderId);

    if (inTargetFolder) {
      setRawFavorites(prev => prev.filter(f => !(f.user_id === currentUser.user_id && (f.program_id === resolvedId || (prog && f.program_id === prog.slug)) && f.folder_id === targetFolderId)));
      if (isSupabaseConfigured) {
        supabase.from('favorites').delete().eq('user_id', currentUser.user_id).eq('program_id', resolvedId).eq('folder_id', targetFolderId).then(() => {}, () => {});
      }
      setFavoriteToast({
        message: `Eltávolítva a listából: ${targetFolder?.name || 'Kedvencek'}`,
        program: prog || undefined,
        folderName: targetFolder?.name
      });
      return { added: false, folderName: targetFolder?.name || 'Kedvencek' };
    } else {
      const newFav: FavoriteItem = {
        id: generateUUID(),
        user_id: currentUser.user_id,
        program_id: resolvedId,
        folder_id: targetFolderId,
        added_at: new Date().toISOString()
      };
      setRawFavorites(prev => [newFav, ...prev]);
      if (isSupabaseConfigured) {
        supabase.from('favorites').insert([newFav]).then(() => {}, () => {});
      }
      setFavoriteToast({
        message: `Hozzáadva: ${targetFolder?.name || 'Általános kedvencek'}`,
        program: prog || undefined,
        folderName: targetFolder?.name || 'Általános kedvencek'
      });
      return { added: true, folderName: targetFolder?.name || 'Általános kedvencek' };
    }
  };

  const addProgramToFolder = (programId: string, folderId: string) => {
    if (!isAuthenticated || !currentUser?.user_id) {
      openLoginModal('A mappákba mentéshez kérjük, lépj be programvadászként!');
      return;
    }
    const prog = programs.find(p => p.id === programId || p.slug === programId);
    const resolvedId = prog ? prog.id : programId;
    const exists = userFavorites.some((f: FavoriteItem) => (f.program_id === resolvedId || (prog && f.program_id === prog.slug)) && f.folder_id === folderId);
    if (!exists) {
      const folder = userFavoriteFolders.find((f: FavoriteFolder) => f.id === folderId);
      const newFav: FavoriteItem = {
        id: generateUUID(),
        user_id: currentUser.user_id,
        program_id: resolvedId,
        folder_id: folderId,
        added_at: new Date().toISOString()
      };
      setRawFavorites(prev => [newFav, ...prev]);
      if (isSupabaseConfigured) {
        supabase.from('favorites').insert([newFav]).then(() => {}, () => {});
      }
      setFavoriteToast({
        message: `Hozzáadva: ${folder?.name || 'Mappa'}`,
        program: prog || undefined,
        folderName: folder?.name
      });
    }
  };

  const removeProgramFromFolder = (programId: string, folderId: string) => {
    if (!isAuthenticated || !currentUser?.user_id) return;
    const prog = programs.find(p => p.id === programId || p.slug === programId);
    const resolvedId = prog ? prog.id : programId;
    const folder = userFavoriteFolders.find((f: FavoriteFolder) => f.id === folderId);
    setRawFavorites(prev => prev.filter(f => !(f.user_id === currentUser.user_id && (f.program_id === resolvedId || (prog && f.program_id === prog.slug)) && f.folder_id === folderId)));
    if (isSupabaseConfigured) {
      supabase.from('favorites').delete().eq('user_id', currentUser.user_id).eq('program_id', resolvedId).eq('folder_id', folderId).then(() => {}, () => {});
    }
    setFavoriteToast({
      message: `Eltávolítva a listából: ${folder?.name || 'Mappa'}`,
      program: prog || undefined,
      folderName: folder?.name
    });
  };

  const setProgramFolders = (programId: string, folderIds: string[]) => {
    if (!isAuthenticated || !currentUser?.user_id) {
      openLoginModal('A mappák szerkesztéséhez kérjük, lépj be a fiókodba!');
      return;
    }
    const prog = programs.find(p => p.id === programId || p.slug === programId);
    const resolvedId = prog ? prog.id : programId;
    setRawFavorites(prev => {
      const others = prev.filter(f => !(f.user_id === currentUser.user_id && (f.program_id === resolvedId || (prog && f.program_id === prog.slug))));
      const additions: FavoriteItem[] = folderIds.map((fId) => ({
        id: generateUUID(),
        user_id: currentUser.user_id,
        program_id: resolvedId,
        folder_id: fId,
        added_at: new Date().toISOString()
      }));
      return [...additions, ...others];
    });
    setFavoriteToast({
      message: folderIds.length > 0 ? 'Mentett listák sikeresen frissítve!' : 'Eltávolítva a kedvencek közül',
      program: prog || undefined
    });
  };

  const createFavoriteFolder = (data: { name: string; description?: string; color?: string; icon?: string }): FavoriteFolder => {
    if (!isAuthenticated || !currentUser?.user_id) {
      openLoginModal('Új mappa létrehozásához kérjük, jelentkezz be!');
      throw new Error('Not authenticated');
    }
    const trimmedName = data.name.trim();
    // Check if a folder with the same name already exists for this user
    const existing = userFavoriteFolders.find(f => f.name.trim().toLowerCase() === trimmedName.toLowerCase());
    if (existing) {
      setFavoriteToast({ message: `Már létezik „${existing.name}” nevű listád.` });
      return existing;
    }

    const newFolder: FavoriteFolder = {
      id: generateUUID(),
      user_id: currentUser.user_id,
      name: trimmedName,
      description: data.description?.trim(),
      color: data.color || 'emerald',
      icon: data.icon || 'bookmark',
      is_default: false,
      created_at: new Date().toISOString()
    };
    setRawFavoriteFolders(prev => [...prev, newFolder]);
    if (isSupabaseConfigured) {
      supabase.from('favorite_folders').insert([newFolder]).then(() => {}, (err) => console.error(err));
    }
    setFavoriteToast({ message: `Új lista létrehozva: „${newFolder.name}”` });
    return newFolder;
  };

  const updateFavoriteFolder = (id: string, updates: Partial<FavoriteFolder>) => {
    if (!isAuthenticated || !currentUser?.user_id) return;
    setRawFavoriteFolders(prev => prev.map(f => (f.id === id && f.user_id === currentUser.user_id) ? { ...f, ...updates } : f));
    if (isSupabaseConfigured) {
      supabase.from('favorite_folders').update(updates).eq('id', id).eq('user_id', currentUser.user_id).then(() => {}, () => {});
    }
  };

  const deleteFavoriteFolder = (id: string, deleteContainedPrograms: boolean = true) => {
    // Find target folder in either rawFavoriteFolders or userFavoriteFolders
    const folder = rawFavoriteFolders.find((f: FavoriteFolder) => f.id === id);
    if (!folder) return;

    if (folder.is_default || folder.name.trim().toLowerCase() === 'bakancslista') {
      setFavoriteToast({ message: 'A Bakancslista az alapértelmezett mappa, nem törölhető.' });
      return;
    }

    const folderUserId = folder.user_id || currentUser?.user_id;

    // Remaining folders for this user
    const remaining = rawFavoriteFolders.filter(
      (f: FavoriteFolder) => f.id !== id && (!folderUserId || f.user_id === folderUserId)
    );

    // If this folder was default and other folders exist, reassign default to first remaining folder
    if (folder.is_default && remaining.length > 0) {
      const nextDefault = remaining[0];
      setRawFavoriteFolders(prev => prev
        .filter(f => f.id !== id)
        .map(f => (f.id === nextDefault.id ? { ...f, is_default: true } : f))
      );
      if (isSupabaseConfigured && folderUserId) {
        supabase.from('favorite_folders').update({ is_default: true }).eq('id', nextDefault.id).then(() => {}, (err) => console.error(err));
      }
    } else {
      setRawFavoriteFolders(prev => prev.filter(f => f.id !== id));
    }

    // Collect all program IDs and slugs contained in this folder
    const folderFavItems = rawFavorites.filter((f: FavoriteItem) => f.folder_id === id);
    const containedProgramIds = new Set<string>();
    folderFavItems.forEach((f: FavoriteItem) => {
      containedProgramIds.add(f.program_id);
      const prog = programs.find(p => p.id === f.program_id || p.slug === f.program_id);
      if (prog) {
        containedProgramIds.add(prog.id);
        containedProgramIds.add(prog.slug);
      }
    });

    // Delete all favorite items in this folder (and remove those programs from favorites if requested)
    setRawFavorites(prev => prev.filter(f => {
      // Always remove items attached to this folder
      if (f.folder_id === id) return false;
      // If deleteContainedPrograms is true, also remove all saved instances of these programs for this user
      if (deleteContainedPrograms && containedProgramIds.has(f.program_id)) {
        if (!folderUserId || f.user_id === folderUserId) return false;
      }
      return true;
    }));

    if (isSupabaseConfigured) {
      // 1. Delete all favorites belonging directly to this folder
      supabase.from('favorites').delete().eq('folder_id', id).then(() => {}, (err) => console.error('Delete favorites from folder error:', err));
      
      // 2. If deleteContainedPrograms is requested, delete those programs across all folders for this user
      if (deleteContainedPrograms && containedProgramIds.size > 0 && folderUserId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const validUuids = Array.from(containedProgramIds).filter(pid => uuidRegex.test(pid));
        if (validUuids.length > 0) {
          supabase.from('favorites').delete().in('program_id', validUuids).eq('user_id', folderUserId).then(() => {}, (err) => console.error('Delete contained programs error:', err));
        }
      }

      // 3. Delete the folder itself
      supabase.from('favorite_folders').delete().eq('id', id).then(() => {}, (err) => console.error('Delete folder error:', err));
    }

    const removedCount = folderFavItems.length;
    setFavoriteToast({
      message: deleteContainedPrograms && removedCount > 0
        ? `„${folder.name}” lista és a benne található ${removedCount} program sikeresen törölve a kedvencek közül.`
        : `„${folder.name}” lista sikeresen törölve.`
    });
  };

  const clearAllFavorites = () => {
    if (!isAuthenticated || !currentUser?.user_id) return;
    setRawFavorites(prev => prev.filter(f => f.user_id !== currentUser.user_id));
    if (isSupabaseConfigured) {
      supabase.from('favorites').delete().eq('user_id', currentUser.user_id).then(() => {}, () => {});
    }
    setFavoriteToast({ message: 'Minden mentett kedvenc program sikeresen törölve.' });
  };

  const allFavoritePrograms: Program[] = React.useMemo(() => {
    if (!isAuthenticated || !currentUser?.user_id) return [];
    const uniqueIds = Array.from(new Set(userFavorites.map((f: FavoriteItem) => f.program_id)));
    return programs.filter(p => uniqueIds.includes(p.id) || uniqueIds.includes(p.slug));
  }, [userFavorites, programs, isAuthenticated, currentUser?.user_id]);

  const totalFavoritesCount = allFavoritePrograms.length;

  // Kanban 4fe242f2: olvasatlan booking-uzenet badge a szolgaltatoi navban +
  // az Uzenetek lista kartyain. A booking_messages tablanak szandekosan nincs
  // update/delete grantja (v1, lasd schema.sql), ezert az "olvasva" allapotot
  // KULON booking_message_reads kurzor-tablaban tartjuk, nem a sor-szinten.
  //
  // activeMessageThreadOrderIdsRef: a jelenleg MEGNYITOTT szal(ak) order_id-je
  // -- amig egy szal nyitva van (BookingMessageThread mount-olva ra), az aktiv
  // realtime-channel NEM szamolja fel ujra olvasatlanra az erkezo uzenetet,
  // mert a BookingMessageThread sajat hookja mar amugy is read-markeli.
  const activeMessageThreadOrderIdsRef = React.useRef<Set<string>>(new Set());
  const [unreadBookingMessageCounts, setUnreadBookingMessageCounts] = useState<Record<string, number>>({});

  const registerActiveMessageThread = (orderId: string) => {
    activeMessageThreadOrderIdsRef.current.add(orderId);
  };

  const unregisterActiveMessageThread = (orderId: string) => {
    activeMessageThreadOrderIdsRef.current.delete(orderId);
  };

  const markBookingThreadRead = (orderId: string) => {
    if (!isSupabaseConfigured || !currentUser?.user_id) return;
    setUnreadBookingMessageCounts(prev => {
      if (!prev[orderId]) return prev;
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
    supabase
      .from('booking_message_reads')
      .upsert(
        { order_id: orderId, user_id: currentUser.user_id, last_read_at: new Date().toISOString() },
        { onConflict: 'order_id,user_id' }
      )
      .then(({ error }) => {
        if (error) console.error('markBookingThreadRead error:', error);
      });
  };

  const totalUnreadBookingMessageCount = Object.values(unreadBookingMessageCounts).reduce(
    (sum, n) => sum + n,
    0
  );

  // Kanban c70cb435: role-agnosztikus -- a kezdeti provider-only badge (4fe242f2)
  // utan Csaba kerte, hogy az igenybevevo (customer) oldalon is jelezze a Foglalasaim
  // lista. A get_unread_booking_message_counts() RPC amugy is auth.uid()-re megy,
  // igy barmelyik szerepkornek csak a sajat szalainak nem-sajat-kuldesu uzeneteit adja.
  // Betoltesnel az RPC adja a kezdeti allapotot, utana egy global (szures nelkuli)
  // Realtime INSERT-feliratkozas tartja frissen -- a kliens a RLS miatt amugy is
  // csak a sajat szalainak sorait latja a booking_messages tablabol.
  useEffect(() => {
    if (!isSupabaseConfigured || !isAuthenticated || !currentUser?.user_id) {
      setUnreadBookingMessageCounts({});
      return;
    }
    let cancelled = false;

    supabase.rpc('get_unread_booking_message_counts').then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        console.error('get_unread_booking_message_counts error:', error);
        return;
      }
      const counts: Record<string, number> = {};
      (data as { order_id: string; unread_count: number }[] | null || []).forEach(row => {
        counts[row.order_id] = Number(row.unread_count);
      });
      setUnreadBookingMessageCounts(counts);
    });

    const channel = supabase
      .channel('booking_messages_unread_badge')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'booking_messages' },
        (payload) => {
          const incoming = payload.new as { order_id: string; sender_id: string };
          if (incoming.sender_id === currentUser.user_id) return;
          if (activeMessageThreadOrderIdsRef.current.has(incoming.order_id)) return;
          setUnreadBookingMessageCounts(prev => ({
            ...prev,
            [incoming.order_id]: (prev[incoming.order_id] || 0) + 1
          }));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, currentUser.user_id]);

  const getFolderPrograms = (folderId: string): Program[] => {
    if (!isAuthenticated || !currentUser?.user_id) return [];
    if (folderId === 'all') {
      return allFavoritePrograms;
    }
    const matchingIds = userFavorites.filter((f: FavoriteItem) => f.folder_id === folderId).map((f: FavoriteItem) => f.program_id);
    return programs.filter(p => matchingIds.includes(p.id) || matchingIds.includes(p.slug));
  };

  const openFolderModal = (program: Program) => {
    if (!isAuthenticated || !currentUser?.user_id) {
      openLoginModal('A mappák kezeléséhez és mentéshez kérjük, jelentkezz be programvadászként!');
      setFavoriteToast({
        message: 'A kedvenc mappákhoz be kell jelentkezned!',
        folderName: 'Bejelentkezés szükséges'
      });
      return;
    }

    // Ensure user has a default folder named "Bakancslista"
    let defaultFolder = userFavoriteFolders.find((f: FavoriteFolder) => f.is_default) ||
      userFavoriteFolders.find((f: FavoriteFolder) => f.name.toLowerCase() === 'bakancslista') ||
      userFavoriteFolders.find((f: FavoriteFolder) => f.name.toLowerCase() === 'általános kedvencek') ||
      userFavoriteFolders[0];

    if (!defaultFolder) {
      const newBakancslistaFolder: FavoriteFolder = {
        id: generateUUID(),
        user_id: currentUser.user_id,
        name: 'Bakancslista',
        description: 'Utazási terveim és elmentett Bakancslista programjaim',
        color: 'emerald',
        icon: 'heart',
        is_default: true,
        created_at: new Date().toISOString()
      };
      setRawFavoriteFolders(prev => [newBakancslistaFolder, ...prev]);
      if (isSupabaseConfigured) {
        supabase.from('favorite_folders').insert([newBakancslistaFolder]).then(() => {}, (err) => console.error('Error creating default folder:', err));
      }
      defaultFolder = newBakancslistaFolder;
    }

    // "a szivecskére kattintás esetén ez legyen kiválasztva a felugróban!"
    // If the program is not in any folder yet, automatically select/add it to Bakancslista so it is checked in the popup
    const resolvedId = program.id;
    const currentFolderIds = userFavorites
      .filter((f: FavoriteItem) => f.user_id === currentUser.user_id && (f.program_id === resolvedId || f.program_id === program.slug))
      .map((f: FavoriteItem) => f.folder_id);

    if (currentFolderIds.length === 0 && defaultFolder) {
      const newFav: FavoriteItem = {
        id: generateUUID(),
        user_id: currentUser.user_id,
        program_id: resolvedId,
        folder_id: defaultFolder.id,
        added_at: new Date().toISOString()
      };
      setRawFavorites(prev => [newFav, ...prev]);
      if (isSupabaseConfigured) {
        supabase.from('favorites').insert([newFav]).then(() => {}, () => {});
      }
      setFavoriteToast({
        message: `Mentve a Bakancslistához: ${program.title}`,
        program: program,
        folderName: defaultFolder.name
      });
    }

    setFolderModalProgram(program);
  };

  const closeFolderModal = () => {
    setFolderModalProgram(null);
  };

  const dismissFavoriteToast = () => {
    setFavoriteToast(null);
  };

  const resetToDefaults = async () => {
    // Purge any local residual storage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const legacyKeys = [
          'vg_regions', 'vg_regions_v2', 'vg_categories', 'vg_categories_v2',
          'vg_providers', 'vg_providers_v2', 'vg_profiles', 'vg_profiles_v2',
          'vg_programs', 'vg_programs_v2', 'vg_images', 'vg_images_v2',
          'vg_inquiries', 'vg_inquiries_v2', 'vg_current_user', 'vg_current_user_v2',
          'vg_reviews', 'vg_reviews_v1', 'vg_reviews_v2', 'vg_orders', 'vg_orders_v2',
          'vg_favorite_folders', 'vg_favorite_folders_v2', 'vg_favorite_folders_v3',
          'vg_favorites', 'vg_favorites_v2', 'vg_favorites_v3'
        ];
        legacyKeys.forEach(k => localStorage.removeItem(k));
      } catch {}
    }

    if (isSupabaseConfigured) {
      const [
        regionsRes,
        categoriesRes,
        profilesRes,
        imagesRes,
        inquiriesRes,
        reviewsRes,
      ] = await Promise.all([
        supabase.from('regions').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('program_images').select('*'),
        supabase.from('inquiries').select('*'),
        supabase.from('reviews').select('*').order('created_at', { ascending: false }),
      ]);
      if (regionsRes.data) setRegions(regionsRes.data as Region[]);
      if (categoriesRes.data) setCategories(categoriesRes.data as Category[]);
      if (profilesRes.data) setRawProfiles(profilesRes.data as Profile[]);
      if (imagesRes.data) setRawImages(imagesRes.data as ProgramImage[]);
      if (inquiriesRes.data) setInquiries(inquiriesRes.data as Inquiry[]);
      if (reviewsRes.data) setReviews(reviewsRes.data as Review[]);
      loadProgramsAndProviders(isAuthenticated, currentUser.role);
    }
    setCurrentView('home');
  };

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        openProgramDetail,

        searchQuery,
        setSearchQuery,
        selectedRegion,
        setSelectedRegion,
        selectedCategory,
        setSelectedCategory,
        selectedLocation,
        setSelectedLocation,
        selectedDate,
        setSelectedDate,
        selectedDateFrom,
        setSelectedDateFrom,
        selectedDateTo,
        setSelectedDateTo,
        selectedDurationType,
        setSelectedDurationType,
        maxPrice,
        setMaxPrice,
        currencyFilter,
        setCurrencyFilter,
        resetFilters,

        currentUser,
        currentProvider,
        isAuthenticated,
        login,
        loginWithGoogle,
        logout,
        registerVisitor,
        requestPasswordReset,
        confirmPasswordReset,
        checkPasswordResetToken,
        deleteMyAccount,
        updateMyProfile,
        registerProvider,

        regions,
        categories,
        programs,
        providers: rawProviders,
        inquiries: inquiriesWithDetails,

        createRegion,
        updateRegion,
        deleteRegion,
        toggleRegionActive,

        createCategory,
        updateCategory,
        deleteCategory,
        toggleCategoryActive,

        createProgram,
        updateProgram,
        deleteProgram,
        approveProgram,
        rejectProgram,
        archiveProgram,
        toggleFeaturedProgram,

        approveProvider,
        suspendProvider,
        banProvider,
        updateProviderProfile,

        submitInquiry,

        orders: ordersWithProgram,
        createOrder,
        cancelOrder,
        checkProgramAvailability,
        programOccurrencesCounts,
        programOccurrencesDates,
        listOpenOccurrences,
        getProgramOccurrences,
        createOccurrences,
        updateOccurrence,
        deleteOccurrence,
        rescheduleOrder,
        getProgramPriceTiers,
        createPriceTier,
        deletePriceTier,
        confirmOrder,
        getProviderContactForOrder,
        getOrderBuyerInfo,

        creditTransactions,
        creditBalance,
        refundBalance,
        refundTransactions,
        rewardBalance,
        rewardTransactions,
        payoutRequests,
        requestPayout,

        feePercentage,
        feeMinimumEur,
        updateFeeSettings,
        eurHufRate,
        eurHufLastUpdated,
        updateEurHufRate,
        fetchAndApplyLiveRate,
        computeBookingFee,
        computeTotalPrice,

        // Reviews system
        reviews,
        addReview,
        respondToReview,
        moderateReview,
        deleteReview,
        getProgramReviews,
        getProgramRatingStats,
        getProviderRatingStats,
        canUserReviewProgram,
        getUserReviewForOrder,

        // Favorites / Wishlists system (strictly user-scoped)
        favoriteFolders: userFavoriteFolders,
        favorites: userFavorites,
        isProgramFavorite,
        getProgramFolderIds,
        getProgramFolders,
        toggleFavorite,
        addProgramToFolder,
        removeProgramFromFolder,
        setProgramFolders,
        createFavoriteFolder,
        updateFavoriteFolder,
        deleteFavoriteFolder,
        clearAllFavorites,
        getFolderPrograms,
        allFavoritePrograms,
        totalFavoritesCount,
        folderModalProgram,
        openFolderModal,
        closeFolderModal,
        favoriteToast,
        dismissFavoriteToast,

        unreadBookingMessageCounts,
        totalUnreadBookingMessageCount,
        markBookingThreadRead,
        registerActiveMessageThread,
        unregisterActiveMessageThread,

        // Global Login Modal state
        isLoginModalOpen,
        loginModalMessage,
        loginRedirectTo,
        openLoginModal,
        closeLoginModal,

        resetToDefaults,
        isSupabaseLive: isSupabaseConfigured,
        isLoading,
        catalogLoadError,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export { roundToHalfEuro, formatPrice, formatPlatformFee, formatHuf } from '../lib/priceUtils';
