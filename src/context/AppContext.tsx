import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
  FavoriteFolder,
  FavoriteItem
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

// 16241c32: real react-router URLs replaced the old pure-state "currentView" router.
// This mapping lets currentView/setCurrentView keep working as a thin shim over the
// real URL, so the many existing `currentView === 'x'` / `setCurrentView('x')` call
// sites across the app didn't all need to become route paths directly.
const VIEW_TO_PATH: Record<string, string> = {
  home: '/',
  programs: '/programok',
  categories: '/kategoriak',
  favorites: '/kedvencek',
  'provider-landing': '/szolgaltatoknak',
  'provider-dashboard': '/szolgaltato/dashboard',
  'admin-dashboard': '/admin',
  'my-account': '/sajat-fiokom',
};

function pathToView(pathname: string): string {
  if (pathname.startsWith('/programok')) return 'programs';
  if (pathname.startsWith('/kategoriak') || pathname.startsWith('/regiok')) return 'categories';
  if (pathname.startsWith('/kedvencek')) return 'favorites';
  if (pathname.startsWith('/szolgaltatoknak')) return 'provider-landing';
  if (pathname.startsWith('/szolgaltato/dashboard')) return 'provider-dashboard';
  if (pathname.startsWith('/admin')) return 'admin-dashboard';
  if (pathname.startsWith('/sajat-fiokom')) return 'my-account';
  return 'home';
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
  logout: () => void;
  registerVisitor: (data: { name: string; email: string; password: string }) => Promise<{ success: boolean; message: string }>;
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
  createProgram: (data: Partial<Program>, images: { url: string; isCover: boolean }[]) => Promise<string>;
  updateProgram: (id: string, updates: Partial<Program>) => Promise<void>;
  deleteProgram: (id: string) => Promise<void>;
  approveProgram: (id: string) => Promise<void>;
  rejectProgram: (id: string) => Promise<void>;
  archiveProgram: (id: string) => Promise<void>;
  toggleFeaturedProgram: (id: string) => Promise<void>;

  // Provider Management
  approveProvider: (id: string) => Promise<void>;
  suspendProvider: (id: string) => Promise<void>;

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
  }) => Promise<{ success: boolean; message: string }>;
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

  // Admin approval + privacy-gated contact lookups (kanban fbf552b2 points 3/4/5).
  confirmOrder: (id: string) => Promise<{ success: boolean; message: string }>;
  getProviderContactForOrder: (orderId: string) => Promise<OrderProviderContact | null>;
  getOrderBuyerInfo: (orderId: string) => Promise<OrderBuyerInfo | null>;

  // Credit ledger (point 5): read-only from the client -- crediting/payout is
  // admin-side (manual_payout, refund) for now, see schema.sql comment.
  creditTransactions: CreditTransaction[];
  creditBalance: number;

  // Percentage-based booking fee (Csaba 2026-10-07 penzugyi-mukodesi-modell PDF):
  // dij = MAX(feePercentage% * net_amount, feeMinimumEur), admin-adjustable in
  // app_settings (replaces the old fixed currentBookingFee). The signup bonus
  // credit always matches whatever feeMinimumEur was AT REGISTRATION time (server
  // trigger), not this live value -- see schema.sql grant_signup_bonus comment.
  feePercentage: number;
  feeMinimumEur: number;
  updateFeeSettings: (values: { fee_percentage: number; fee_minimum_eur: number }) => Promise<void>;
  // Display-only helpers mirroring the server's compute_booking_fee/orders trigger
  // formula -- a program's stored `price` is the NET amount the provider receives,
  // the catalog/detail views must show the buyer-facing TOTAL (net+fee).
  computeBookingFee: (netAmount: number) => number;
  computeTotalPrice: (netAmount: number) => number;

  // Utility
  resetToDefaults: () => void;
  isSupabaseLive: boolean;
  isLoading: boolean;

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
  deleteFavoriteFolder: (id: string) => void;
  getFolderPrograms: (folderId: string) => Program[];
  allFavoritePrograms: Program[];
  totalFavoritesCount: number;
  folderModalProgram: Program | null;
  openFolderModal: (program: Program) => void;
  closeFolderModal: () => void;
  favoriteToast: { message: string; program?: Program; folderName?: string } | null;
  dismissFavoriteToast: () => void;

  // Global Login Modal state
  isLoginModalOpen: boolean;
  loginModalMessage: string | null;
  openLoginModal: (message?: string) => void;
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
  const [selectedDate, setSelectedDate] = useState<string>('');
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
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Global Login Modal state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalMessage, setLoginModalMessage] = useState<string | null>(null);

  const openLoginModal = (message?: string) => {
    setLoginModalMessage(message || null);
    setIsLoginModalOpen(true);
  };

  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
    setLoginModalMessage(null);
  };

  const [folderModalProgram, setFolderModalProgram] = useState<Program | null>(null);
  const [favoriteToast, setFavoriteToast] = useState<{ message: string; program?: Program; folderName?: string } | null>(null);

  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
  // Public settings (app_settings.fee_percentage/fee_minimum_eur) -- readable by
  // anon too, so they load in the main collections effect below, not gated on
  // isAuthenticated.
  const [feePercentage, setFeePercentage] = useState<number>(0);
  const [feeMinimumEur, setFeeMinimumEur] = useState<number>(0);

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
  const userFavoriteFolders = useMemo<FavoriteFolder[]>(() => {
    if (!isAuthenticated || !currentUser?.user_id) return [];
    return rawFavoriteFolders.filter(f => f.user_id === currentUser.user_id);
  }, [rawFavoriteFolders, isAuthenticated, currentUser?.user_id]);

  const userFavorites = useMemo<FavoriteItem[]>(() => {
    if (!isAuthenticated || !currentUser?.user_id) return [];
    return rawFavorites.filter(f => f.user_id === currentUser.user_id);
  }, [rawFavorites, isAuthenticated, currentUser?.user_id]);

  // Ensure an authenticated user always has at least a default "Általános kedvencek" folder in their account
  useEffect(() => {
    if (isAuthenticated && currentUser?.user_id) {
      const hasAnyFolder = rawFavoriteFolders.some(f => f.user_id === currentUser.user_id);
      if (!hasAnyFolder) {
        const defaultFolder: FavoriteFolder = {
          id: generateUUID(),
          user_id: currentUser.user_id,
          name: 'Általános kedvencek',
          description: 'Bármikor mentett kedvenc programjaim egy helyen',
          color: 'emerald',
          icon: 'heart',
          is_default: true,
          created_at: new Date().toISOString()
        };
        setRawFavoriteFolders(prev => [defaultFolder, ...prev]);
        if (isSupabaseConfigured) {
          supabase.from('favorite_folders').insert([defaultFolder]).then(() => {}, () => {});
        }
      }
    }
  }, [isAuthenticated, currentUser?.user_id, rawFavoriteFolders]);
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
      return;
    }
    setRawPrograms((programsRes.data as Program[]) || []);
    setRawProviders((providersRes.data as Provider[]) || []);
  };

  // Load collections from the real Supabase tables (sole source of truth).
  useEffect(() => {
    if (!isSupabaseConfigured) {
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
          supabase.from('app_settings').select('*').in('key', ['fee_percentage', 'fee_minimum_eur']),
        ]);

        if (cancelled) return;

        if (regionsRes.data) setRegions(regionsRes.data as Region[]);
        if (categoriesRes.data) setCategories(categoriesRes.data as Category[]);
        if (profilesRes.data) setRawProfiles(profilesRes.data as Profile[]);
        if (imagesRes.data) setRawImages(imagesRes.data as ProgramImage[]);
        if (inquiriesRes.data) setInquiries(inquiriesRes.data as Inquiry[]);
        if (reviewsRes.data) setReviews(reviewsRes.data as Review[]);

        if (!settingsRes.error && settingsRes.data) {
          const rows = settingsRes.data as { key: string; value: number }[];
          const pct = rows.find(r => r.key === 'fee_percentage');
          const min = rows.find(r => r.key === 'fee_minimum_eur');
          if (pct) setFeePercentage(Number(pct.value) || 0);
          if (min) setFeeMinimumEur(Number(min.value) || 0);
        }
      } catch (err) {
        console.error('Supabase load collections error:', err);
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
            status: 'pending' as const,
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
        const displayName = (session.user.user_metadata as Record<string, unknown> | undefined)?.name as string | undefined;
        const { data: newProf, error: profErr } = await supabase
          .from('profiles')
          .insert({
            user_id: session.user.id,
            name: displayName || session.user.email || 'Látogató',
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
        setIsAuthenticated(true);
        setCurrentUser(prof as Profile);
        setRawProfiles(prev => (prev.some(p => p.id === prof!.id) ? prev : [...prev, prof as Profile]));
        setCurrentView(role === 'admin' ? 'admin-dashboard' : role === 'provider' ? 'provider-dashboard' : 'home');
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
          supabase.from('favorite_folders').select('*').eq('user_id', session.user.id).then(({ data: fData, error: fErr }) => {
            if (!fErr && fData && fData.length > 0 && !cancelled) {
              setRawFavoriteFolders(prev => {
                const others = prev.filter(f => f.user_id !== session.user.id);
                return [...(fData as FavoriteFolder[]), ...others];
              });
            }
          }, () => {});

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

    if (!isAuthenticated) {
      setOrders([]);
      setCreditTransactions([]);
      return;
    }

    (async () => {
      const [ordersRes, creditsRes] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('credit_transactions').select('*').order('created_at', { ascending: false }),
      ]);
      if (cancelled) return;
      if (ordersRes.error) console.error('Orders load failed:', ordersRes.error);
      else setOrders((ordersRes.data as Order[]) || []);
      if (creditsRes.error) console.error('Credit transactions load failed:', creditsRes.error);
      else setCreditTransactions((creditsRes.data as CreditTransaction[]) || []);
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Current provider. Supabase-configured path: currentProviderFull, fetched server-side
  // via get_my_provider_profile() (see syncFromSession) -- resolves user_id=auth.uid() OR
  // a matching auth.users email itself, so it works even for the legacy seed providers
  // with user_id=NULL (kanban 318cedd7). rawProviders no longer carries contact columns
  // (incl. email) for a non-admin role (kanban fbf552b2 point 3), so that old client-side
  // email-fallback below is now dead for the real backend -- kept only as the no-Supabase
  // dev fallback, where rawProviders is the full local seedData/localStorage array.
  const currentProvider =
    currentProviderFull ||
    (!isSupabaseConfigured && (
      (currentUser.user_id && rawProviders.find(p => p.user_id && p.user_id === currentUser.user_id)) ||
      rawProviders.find(p => (p.email || '').toLowerCase() === currentUser.email.toLowerCase())
    )) ||
    null;

  // Joined programs with images, category, region, provider
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
  });

  // Credit ledger balance (point 5): simple sum, since every row (signup_bonus/refund/
  // manual_payout/usage) already carries the sign (+credit / -payout or -usage).
  const creditBalance = creditTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

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
  const ordersWithProgram: Order[] = orders.map(o => ({
    ...o,
    program: rawPrograms.find(p => p.id === o.program_id),
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
    setSelectedDate('');
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
      setCurrentView(existingProfile.role === 'admin' ? 'admin-dashboard' : existingProfile.role === 'provider' ? 'provider-dashboard' : 'home');
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
      setCurrentView('provider-dashboard');
      return { success: true, message: `Sikeres bejelentkezés mint ${prov.company_name}!` };
    }
    return { success: false, message: 'Nincs fiók ezzel az e-mail címmel. Kérjük regisztráljon!' };
  };

  const logout = () => {
    if (isSupabaseConfigured) {
      supabase.auth.signOut();
    }
    setIsAuthenticated(false);
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
    setCurrentView('home');
    return { success: true, message: 'Sikeres regisztráció!' };
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
      if (signUpData.session) {
        // Only reachable if this Supabase project's email confirmation requirement is ever
        // turned off (it's ON today -- verified live, signUp returns no session). Handled
        // anyway so this doesn't silently break if that setting changes: the session-sync
        // effect (listening to onAuthStateChange, which signUp also fires for an immediate
        // session) creates the real providers/profiles rows from pending_provider right away.
        return { success: true, message: 'Sikeres szolgáltatói regisztráció! Fiókod függőben (pending) van az adminisztrátori jóváhagyásig.' };
      }
      return {
        success: true,
        message: 'Majdnem kész! Erősítsd meg az e-mail címed a kiküldött linkkel, utána jelentkezz be -- a szolgáltatói fiókod ekkor jön létre automatikusan, függőben (pending) az adminisztrátori jóváhagyásig.',
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
      status: 'pending',
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
    images: { url: string; isCover: boolean }[]
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
      status: currentUser.role === 'admin' ? (data.status || 'published') : (data.status === 'draft' ? 'draft' : 'pending_review'),
      featured: Boolean(data.featured),
    };

    const pendingImages = images && images.length > 0
      ? images.map((img, idx) => ({ image_url: img.url, is_cover: img.isCover || idx === 0, sort_order: idx }))
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

  const updateProgram = async (id: string, updates: Partial<Program>): Promise<void> => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('programs').update(updates).eq('id', id);
      if (error) throw error;
    }
    setRawPrograms(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          ...updates,
          updated_at: new Date().toISOString(),
        };
      }
      return p;
    }));
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

  const updateProviderProfile = async (updates: {
    company_name?: string;
    contact_name?: string;
    phone?: string;
    email?: string;
    website?: string;
    description?: string;
    accepted_payment_methods?: OnsitePaymentMethod[];
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
  const createOrder = async (data: {
    program_id: string;
    occurrence_id?: string | null;
    participants_count: number;
    total_price: number;
    currency?: string;
    onsite_payment_method: OnsitePaymentMethod;
  }): Promise<{ success: boolean; message: string }> => {
    if (!isSupabaseConfigured) {
      return { success: false, message: 'A foglalás jelenleg csak élő háttérrendszerrel működik.' };
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      return { success: false, message: 'A foglaláshoz bejelentkezés szükséges.' };
    }

    const { data: row, error } = await supabase
      .from('orders')
      .insert({
        program_id: data.program_id,
        occurrence_id: data.occurrence_id || null,
        user_id: userId,
        participants_count: data.participants_count,
        total_price: data.total_price,
        currency: data.currency || 'EUR',
        status: 'pending',
        onsite_payment_method: data.onsite_payment_method,
      })
      .select()
      .single();

    if (error) {
      return { success: false, message: `Hiba a foglalás során: ${error.message}` };
    }
    setOrders(prev => [row as Order, ...prev]);
    return { success: true, message: 'Sikeres foglalás! A szolgáltató hamarosan megerősíti.' };
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
  };

  const updateOccurrence = async (
    id: string,
    updates: { event_date?: string; start_time?: string | null; end_time?: string | null; max_participants?: number | null; status?: OccurrenceStatus }
  ): Promise<void> => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('program_occurrences').update(updates).eq('id', id);
    if (error) throw error;
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
  };

  const rescheduleOrder = async (orderId: string, newOccurrenceId: string): Promise<void> => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.rpc('reschedule_order', { p_order_id: orderId, p_new_occurrence_id: newOccurrenceId });
    if (error) throw error;
    setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, occurrence_id: newOccurrenceId } : o)));
  };

  // Admin-only "szimulált fizetés-teljesülés" (kanban fbf552b2 point 4): the confirm_order
  // RPC re-checks is_admin() server-side (the direct-table-update path to 'confirmed' was
  // closed off for everyone else, see schema.sql) and flips pending -> confirmed. On
  // success, re-reads the row so the caller's local `orders` state picks up the new
  // status immediately without a full reload.
  const confirmOrder = async (id: string): Promise<{ success: boolean; message: string }> => {
    if (!isSupabaseConfigured) {
      return { success: false, message: 'A jóváhagyás csak élő háttérrendszerrel működik.' };
    }
    const { error } = await supabase.rpc('confirm_order', { p_order_id: id });
    if (error) {
      return { success: false, message: `Hiba a jóváhagyás során: ${error.message}` };
    }
    setOrders(prev => prev.map(o => (o.id === id ? { ...o, status: 'confirmed' } : o)));
    return { success: true, message: 'Rendelés jóváhagyva.' };
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
      reason: 'Kizárólag igazolt vásárlók értékelhetnek, akik a velemgyere felületén keresztül foglalták le az adott programot és a részvétel megtörtént.'
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

    let defaultFolder = userFavoriteFolders.find((f: FavoriteFolder) => f.is_default) || userFavoriteFolders[0];
    let targetFolderId = folderId || defaultFolder?.id;

    if (!targetFolderId) {
      const newDefaultFolder: FavoriteFolder = {
        id: generateUUID(),
        user_id: currentUser.user_id,
        name: 'Általános kedvencek',
        description: 'Bármikor mentett kedvenc programjaim egy helyen',
        color: 'emerald',
        icon: 'heart',
        is_default: true,
        created_at: new Date().toISOString()
      };
      setRawFavoriteFolders(prev => [newDefaultFolder, ...prev]);
      if (isSupabaseConfigured) {
        supabase.from('favorite_folders').insert([newDefaultFolder]).then(() => {}, () => {});
      }
      defaultFolder = newDefaultFolder;
      targetFolderId = newDefaultFolder.id;
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
    const newFolder: FavoriteFolder = {
      id: generateUUID(),
      user_id: currentUser.user_id,
      name: data.name.trim(),
      description: data.description?.trim(),
      color: data.color || 'emerald',
      icon: data.icon || 'bookmark',
      is_default: false,
      created_at: new Date().toISOString()
    };
    setRawFavoriteFolders(prev => [...prev, newFolder]);
    if (isSupabaseConfigured) {
      supabase.from('favorite_folders').insert([newFolder]).then(() => {}, () => {});
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

  const deleteFavoriteFolder = (id: string) => {
    if (!isAuthenticated || !currentUser?.user_id) return;
    const folder = userFavoriteFolders.find((f: FavoriteFolder) => f.id === id);
    if (folder?.is_default) return;
    setRawFavoriteFolders(prev => prev.filter(f => !(f.id === id && f.user_id === currentUser.user_id)));
    setRawFavorites(prev => prev.filter(f => !(f.folder_id === id && f.user_id === currentUser.user_id)));
    if (isSupabaseConfigured) {
      supabase.from('favorites').delete().eq('folder_id', id).eq('user_id', currentUser.user_id).then(() => {}, () => {});
      supabase.from('favorite_folders').delete().eq('id', id).eq('user_id', currentUser.user_id).then(() => {}, () => {});
    }
    setFavoriteToast({ message: `„${folder?.name || 'Lista'}” törölve.` });
  };

  const allFavoritePrograms: Program[] = React.useMemo(() => {
    if (!isAuthenticated || !currentUser?.user_id) return [];
    const uniqueIds = Array.from(new Set(userFavorites.map((f: FavoriteItem) => f.program_id)));
    return programs.filter(p => uniqueIds.includes(p.id) || uniqueIds.includes(p.slug));
  }, [userFavorites, programs, isAuthenticated, currentUser?.user_id]);

  const totalFavoritesCount = allFavoritePrograms.length;

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
        logout,
        registerVisitor,
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
        updateProviderProfile,

        submitInquiry,

        orders: ordersWithProgram,
        createOrder,
        cancelOrder,
        checkProgramAvailability,
        listOpenOccurrences,
        getProgramOccurrences,
        createOccurrences,
        updateOccurrence,
        deleteOccurrence,
        rescheduleOrder,
        confirmOrder,
        getProviderContactForOrder,
        getOrderBuyerInfo,

        creditTransactions,
        creditBalance,

        feePercentage,
        feeMinimumEur,
        updateFeeSettings,
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
        getFolderPrograms,
        allFavoritePrograms,
        totalFavoritesCount,
        folderModalProgram,
        openFolderModal,
        closeFolderModal,
        favoriteToast,
        dismissFavoriteToast,

        // Global Login Modal state
        isLoginModalOpen,
        loginModalMessage,
        openLoginModal,
        closeLoginModal,

        resetToDefaults,
        isSupabaseLive: isSupabaseConfigured,
        isLoading,
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

export { roundToHalfEuro, formatPrice, formatPlatformFee } from '../lib/priceUtils';
