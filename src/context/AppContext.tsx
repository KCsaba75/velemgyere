import React, { createContext, useContext, useState, useEffect } from 'react';
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
  ProgramAvailability
} from '../types/database';
import { 
  INITIAL_CATEGORIES, 
  INITIAL_REGIONS,
  INITIAL_PROVIDERS, 
  INITIAL_PROFILES, 
  INITIAL_PROGRAMS, 
  INITIAL_PROGRAM_IMAGES, 
  INITIAL_INQUIRIES 
} from '../data/seedData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// 16241c32: real react-router URLs replaced the old pure-state "currentView" router.
// This mapping lets currentView/setCurrentView keep working as a thin shim over the
// real URL, so the many existing `currentView === 'x'` / `setCurrentView('x')` call
// sites across the app didn't all need to become route paths directly.
const VIEW_TO_PATH: Record<string, string> = {
  home: '/',
  programs: '/programok',
  categories: '/kategoriak',
  'provider-landing': '/szolgaltatoknak',
  'provider-dashboard': '/szolgaltato/dashboard',
  'admin-dashboard': '/admin',
  'my-account': '/sajat-fiokom',
};

function pathToView(pathname: string): string {
  if (pathname.startsWith('/programok')) return 'programs';
  if (pathname.startsWith('/kategoriak') || pathname.startsWith('/regiok')) return 'categories';
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
    participants_count: number;
    total_price: number;
    currency?: string;
  }) => Promise<{ success: boolean; message: string }>;
  cancelOrder: (id: string) => Promise<void>;

  // Capacity check (point 6): only meaningful for logged-in users looking at the
  // gated detail view. Returns null when not configured/not authenticated.
  checkProgramAvailability: (programId: string) => Promise<ProgramAvailability | null>;

  // Credit ledger (point 5): read-only from the client -- crediting/payout is
  // admin-side (manual_payout, refund) for now, see schema.sql comment.
  creditTransactions: CreditTransaction[];
  creditBalance: number;

  // Booking fee (Csaba's 2026-10-07 refinement): a deposit-like amount, separate
  // from a program's total price, admin-adjustable in app_settings. The signup
  // bonus credit always matches whatever this was AT REGISTRATION time (server
  // trigger), not this live value -- see schema.sql grant_signup_bonus comment.
  currentBookingFee: number;
  updateBookingFee: (value: number) => Promise<void>;

  // Utility
  resetToDefaults: () => void;
  isSupabaseLive: boolean;
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
};

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

  // Dynamic Regions & Categories (expandable in admin!)
  const [regions, setRegions] = useState<Region[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.REGIONS);
    return saved ? JSON.parse(saved) : INITIAL_REGIONS;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });

  const [rawProviders, setRawProviders] = useState<Provider[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROVIDERS);
    return saved ? JSON.parse(saved) : INITIAL_PROVIDERS;
  });

  const [rawProfiles, setRawProfiles] = useState<Profile[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROFILES);
    return saved ? JSON.parse(saved) : INITIAL_PROFILES;
  });

  const [rawPrograms, setRawPrograms] = useState<Program[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROGRAMS);
    return saved ? JSON.parse(saved) : INITIAL_PROGRAMS;
  });

  const [rawImages, setRawImages] = useState<ProgramImage[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.IMAGES);
    return saved ? JSON.parse(saved) : INITIAL_PROGRAM_IMAGES;
  });

  const [inquiries, setInquiries] = useState<Inquiry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.INQUIRIES);
    return saved ? JSON.parse(saved) : INITIAL_INQUIRIES;
  });

  // Orders/credits (kanban 71215856): no localStorage/seed fallback -- these are a
  // Supabase-only, logged-in-only feature, always empty until a real session loads them.
  const [orders, setOrders] = useState<Order[]>([]);
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
  // Public setting (app_settings.current_booking_fee) -- readable by anon too, so it
  // loads in the main collections effect below, not gated on isAuthenticated.
  const [currentBookingFee, setCurrentBookingFee] = useState<number>(0);

  // Current active user profile
  const [currentUser, setCurrentUser] = useState<Profile>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (saved) return JSON.parse(saved);
    return INITIAL_PROFILES.find(p => p.role === 'visitor') || INITIAL_PROFILES[3];
  });
  // Whether currentUser reflects a real, logged-in Supabase Auth session (vs. the
  // anonymous default-visitor placeholder profile). Only meaningful when
  // isSupabaseConfigured -- always false in the no-Supabase dev fallback.
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REGIONS, JSON.stringify(regions));
  }, [regions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROVIDERS, JSON.stringify(rawProviders));
  }, [rawProviders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(rawProfiles));
  }, [rawProfiles]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROGRAMS, JSON.stringify(rawPrograms));
  }, [rawPrograms]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.IMAGES, JSON.stringify(rawImages));
  }, [rawImages]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INQUIRIES, JSON.stringify(inquiries));
  }, [inquiries]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
  }, [currentUser]);

  // Programs/providers (kanban 71215856 point 4): which table/view to read depends on
  // auth state -- anon gets the teaser-only `*_public` views (DB-enforced via column
  // GRANTs, see schema.sql), a logged-in visitor gets the full tables. Centralized here
  // and called from the auth-sync effect below (on mount AND on every login/logout) so
  // there's exactly one place that decides this, instead of duplicating the choice.
  const loadProgramsAndProviders = async (authed: boolean) => {
    const programsTable = authed ? 'programs' : 'programs_public';
    const providersTable = authed ? 'providers' : 'providers_public';
    const [programsRes, providersRes] = await Promise.all([
      supabase.from(programsTable).select('*'),
      supabase.from(providersTable).select('*'),
    ]);
    if (programsRes.error || providersRes.error) {
      console.error('Programs/providers load failed, keeping previous data:', programsRes.error || providersRes.error);
      return;
    }
    setRawPrograms((programsRes.data as Program[]) || []);
    setRawProviders((providersRes.data as Provider[]) || []);
  };

  // Load the remaining collections from the real Supabase tables when configured.
  // seedData.ts/localStorage above stay as the dev-only fallback (no
  // VITE_SUPABASE_URL/ANON_KEY set) so the app never shows a blank screen --
  // once this resolves, Supabase is the source of truth and overwrites it.
  // `inquiries` is stored RAW here (not pre-joined with program/provider names) --
  // the `inquiriesWithDetails` derivation below joins it against `programs`/
  // `rawProviders` reactively, avoiding a race with loadProgramsAndProviders above
  // (which can resolve before or after this effect).
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let cancelled = false;

    (async () => {
      const [
        regionsRes,
        categoriesRes,
        profilesRes,
        imagesRes,
        inquiriesRes,
        settingsRes,
      ] = await Promise.all([
        supabase.from('regions').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('program_images').select('*'),
        supabase.from('inquiries').select('*'),
        supabase.from('app_settings').select('*').eq('key', 'current_booking_fee').maybeSingle(),
      ]);

      if (cancelled) return;

      const firstError =
        regionsRes.error || categoriesRes.error || profilesRes.error ||
        imagesRes.error || inquiriesRes.error;
      if (firstError) {
        // Keep whatever localStorage/seedData already loaded into state above
        // instead of wiping the UI -- a real-backend outage shouldn't blank the page.
        console.error('Supabase data load failed, staying on local fallback data:', firstError);
        return;
      }

      setRegions((regionsRes.data as Region[]) || []);
      setCategories((categoriesRes.data as Category[]) || []);
      setRawProfiles((profilesRes.data as Profile[]) || []);
      setRawImages((imagesRes.data as ProgramImage[]) || []);
      setInquiries((inquiriesRes.data as Inquiry[]) || []);
      if (!settingsRes.error && settingsRes.data) {
        setCurrentBookingFee(Number((settingsRes.data as { value: number }).value) || 0);
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
      loadProgramsAndProviders(false);
    }

    async function syncFromSession(session: import('@supabase/supabase-js').Session | null) {
      if (cancelled) return;
      if (!session) {
        resetToAnonymousVisitor();
        return;
      }

      const pending = (session.user.user_metadata as Record<string, unknown> | undefined)?.pending_provider as
        | { company_name: string; contact_name: string; phone: string; website?: string; description: string }
        | undefined;

      if (pending) {
        const { data: existing } = await supabase
          .from('providers')
          .select('id')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (!existing) {
          const { data: newProv, error: provErr } = await supabase
            .from('providers')
            .insert({
              user_id: session.user.id,
              company_name: pending.company_name,
              contact_name: pending.contact_name,
              email: session.user.email,
              phone: pending.phone,
              website: pending.website || null,
              description: pending.description,
              status: 'pending',
            })
            .select()
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
            if (!cancelled) setRawProviders(prev => [...prev, newProv as Provider]);
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
        setIsAuthenticated(true);
        setCurrentUser(prof as Profile);
        setRawProfiles(prev => (prev.some(p => p.id === prof!.id) ? prev : [...prev, prof as Profile]));
        setCurrentView((prof as Profile).role === 'admin' ? 'admin-dashboard' : (prof as Profile).role === 'provider' ? 'provider-dashboard' : 'home');
        loadProgramsAndProviders(true);
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

  // Derived current provider. user_id match only counts when actually set: every
  // provider/profile loaded from the real Supabase tables has user_id=NULL (no Supabase
  // Auth session behind the mock login yet, see kanban 318cedd7) -- without that guard,
  // `null === null` would match the first provider in the array for ANY logged-in user,
  // including admin. Falls back to email (same identifier the mock login itself matches
  // on), so the provider dashboard still resolves "my programs" correctly today.
  const currentProvider =
    (currentUser.user_id && rawProviders.find(p => p.user_id && p.user_id === currentUser.user_id)) ||
    rawProviders.find(p => (p.email || '').toLowerCase() === currentUser.email.toLowerCase()) ||
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
        return { success: false, message: 'Hibás e-mail cím vagy jelszó.' };
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
      setCurrentView('provider-dashboard');
      return { success: true, message: `Sikeres bejelentkezés mint ${prov.company_name}!` };
    }
    return { success: false, message: 'Nincs fiók ezzel az e-mail címmel. Kérjük regisztráljon!' };
  };

  const logout = () => {
    if (isSupabaseConfigured) {
      supabase.auth.signOut();
    }
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
      const { error } = await supabase.from('programs').delete().eq('id', id);
      if (error) throw error;
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
      const { error } = await supabase.from('providers').update({ status: 'approved' }).eq('id', id);
      if (error) throw error;
    }
    setRawProviders(prev => prev.map(p => p.id === id ? { ...p, status: 'approved' } : p));
  };

  const suspendProvider = async (id: string): Promise<void> => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('providers').update({ status: 'suspended' }).eq('id', id);
      if (error) throw error;
    }
    setRawProviders(prev => prev.map(p => p.id === id ? { ...p, status: 'suspended' } : p));
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
    participants_count: number;
    total_price: number;
    currency?: string;
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
        user_id: userId,
        participants_count: data.participants_count,
        total_price: data.total_price,
        currency: data.currency || 'EUR',
        status: 'pending',
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

  // Admin-only (enforced by the "Admins can manage app settings" RLS policy, this is
  // just the client call) -- updates the live booking fee. Already-granted signup
  // bonuses and already-created orders keep their own captured booking_fee value;
  // only NEW registrations/reservations see this new amount.
  const updateBookingFee = async (value: number): Promise<void> => {
    if (!isSupabaseConfigured) {
      setCurrentBookingFee(value);
      return;
    }
    const { error } = await supabase
      .from('app_settings')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('key', 'current_booking_fee');
    if (error) throw error;
    setCurrentBookingFee(value);
  };

  const resetToDefaults = () => {
    localStorage.removeItem(STORAGE_KEYS.REGIONS);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.PROGRAMS);
    localStorage.removeItem(STORAGE_KEYS.IMAGES);
    localStorage.removeItem(STORAGE_KEYS.PROVIDERS);
    localStorage.removeItem(STORAGE_KEYS.PROFILES);
    localStorage.removeItem(STORAGE_KEYS.INQUIRIES);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);

    setRegions(INITIAL_REGIONS);
    setCategories(INITIAL_CATEGORIES);
    setRawPrograms(INITIAL_PROGRAMS);
    setRawImages(INITIAL_PROGRAM_IMAGES);
    setRawProviders(INITIAL_PROVIDERS);
    setRawProfiles(INITIAL_PROFILES);
    setInquiries(INITIAL_INQUIRIES);
    setCurrentUser(INITIAL_PROFILES[3]); // visitor
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

        submitInquiry,

        orders: ordersWithProgram,
        createOrder,
        cancelOrder,
        checkProgramAvailability,

        creditTransactions,
        creditBalance,

        currentBookingFee,
        updateBookingFee,

        resetToDefaults,
        isSupabaseLive: isSupabaseConfigured,
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
