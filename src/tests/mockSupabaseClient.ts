// Ujrafelhasznalhato, generikus Supabase-kliens mock a Vitest teszteknek.
// Kanban 866cb61a (teszt-strategia, 2. kategoria: "Hookok -- Supabase client
// hivasok mockolasa, auth allapotvaltas SIGNED_IN/SIGNED_OUT").
//
// A VALODI AppProvider (AppContext.tsx) 17+ kulonbozo tablara hivatkozik
// .from(...)-szal parhuzamos effektekben mar az ELSO renderkor -- egy
// auth-allapotvaltas tesztjehez nem eri meg mindet kezzel lemockolni.
// Ez a builder MINDEN .from(tabla) hivasra egy lancolhato (chainable), "thenable"
// query-builder-t ad vissza, ami alapertelmezetten { data: [], error: null }-t
// old fel -- csak azokat a tablakat kell explicit megadni (tables opcio), amik
// a tesztelt viselkedes szempontjabol tenylegesen szamitanak (pl. "profiles").
import { vi } from 'vitest';

export type TableResolver = () => { data: unknown; error: unknown } | Promise<{ data: unknown; error: unknown }>;

const CHAIN_METHODS = [
  'select', 'insert', 'update', 'delete', 'upsert',
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'in', 'is', 'contains',
  'order', 'limit', 'range', 'single', 'maybeSingle', 'or', 'filter',
] as const;

// A resolver MINDIG tomb-adatot ad vissza (mintha a nyers tablasorokat kapnank).
// A valodi Supabase kliens .single()/.maybeSingle() hivasa az eredmenyt EGY
// objektumra "csomagolja ki" (vagy hibat/nullt ad ures/tobbsoros esetben) --
// ezt a builder itt lemasolja, igy ugyanaz a tabla-resolver kiszolgalhat egy
// listazo ES egy sajat-sor lekerdezest is, csak a hivott lanc-metodustol fuggoen.
function createQueryBuilder(resolver: TableResolver) {
  const builder: Record<string, unknown> = {};
  let wantsSingle = false;
  for (const method of CHAIN_METHODS) {
    if (method === 'single' || method === 'maybeSingle') {
      builder[method] = vi.fn(() => { wantsSingle = true; return builder; });
    } else {
      builder[method] = vi.fn(() => builder);
    }
  }
  const resolve = async () => {
    const result = await resolver();
    if (!wantsSingle) return result;
    const rows = Array.isArray(result.data) ? result.data : (result.data ? [result.data] : []);
    return { data: rows[0] ?? null, error: result.error ?? null };
  };
  builder.then = (onFulfilled: any, onRejected: any) => resolve().then(onFulfilled, onRejected);
  builder.catch = (onRejected: any) => resolve().catch(onRejected);
  return builder;
}

export interface MockSupabaseOptions {
  initialSession?: unknown;
  tables?: Record<string, TableResolver>;
}

export function createMockSupabaseClient(options: MockSupabaseOptions = {}) {
  const tables = options.tables || {};
  let authChangeCallback: ((event: string, session: unknown) => void) | null = null;

  const client = {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: options.initialSession ?? null } })),
      onAuthStateChange: vi.fn((callback: (event: string, session: unknown) => void) => {
        authChangeCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      updateUser: vi.fn(async () => ({ data: {}, error: null })),
      signInWithPassword: vi.fn(async () => ({ data: {}, error: null })),
      signUp: vi.fn(async () => ({ data: {}, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
    },
    from: vi.fn((table: string) => createQueryBuilder(tables[table] || (() => ({ data: [], error: null })))),
    rpc: vi.fn(async () => ({ data: [], error: null })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
    storage: {
      listBuckets: vi.fn(async () => ({ data: [], error: null })),
    },
    // Teszt-segedfuggveny, NEM a valodi Supabase SDK resze -- a onAuthStateChange
    // subscribernek szimulal egy esemenyt, mintha a GoTrue kliens kuldte volna.
    __triggerAuthStateChange(event: string, session: unknown) {
      authChangeCallback?.(event, session);
    },
  };

  return client;
}
