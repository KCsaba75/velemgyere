import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Check, Ban, ShieldOff, Briefcase, Users } from 'lucide-react';
import { FilterPillBar } from './FilterPillBar';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

// Kanban 653c7577 (Csaba, teljes admin-nav atszervezes, 2026-11-02 vegso
// mobil-nav dontes): a "Felhasznalok" targymenu HUB -- belso szegmentvaltoval
// a Szolgaltatok (korabban onallo AdminProvidersPage, fb32ec4b) ES a
// Programvadaszok (korabban AdminDashboard 'visitors' fulje, 3129aebc) kozott,
// NEM kulon route a ket alreszhez. Felvaltja a korabbi 'admin-providers'
// celt -- lasd AppContext VIEW_TO_PATH/pathToView (a legacy /admin/szolgaltatok
// deep-link tovabbra is a szolgaltatok szegmensre esik ide).
type UsersSegment = 'providers' | 'visitors';

export const AdminUsersPage: React.FC = () => {
  const { providers, programs, approveProvider, suspendProvider, banProvider, registeredVisitors } = useApp();

  useDocumentMeta('Felhasználók -- Admin', 'Regisztrált szolgáltatók és programvadászok (érdeklődő látogatók) kezelése.');

  const [segment, setSegment] = useState<UsersSegment>('providers');
  const [providerFilter, setProviderFilter] = useState<string>('all');

  const filteredProviders = providers.filter(p => {
    if (providerFilter === 'all') return true;
    return p.status === providerFilter;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-6 sm:pb-8 animate-in fade-in duration-200">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold font-display text-stone-900 tracking-tight">
          Felhasználók
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Regisztrált szolgáltatók jóváhagyása/felfüggesztése/letiltása, és a regisztrált programvadászok (érdeklődő látogatók) listája.
        </p>
      </div>

      {/* Szegmens-valto */}
      <div className="inline-flex items-center gap-1 bg-stone-100 rounded-xl p-1 mb-4 sm:mb-8">
        <button
          type="button"
          onClick={() => setSegment('providers')}
          className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
            segment === 'providers' ? 'bg-white text-emerald-800 shadow-sm' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Szolgáltatók ({providers.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSegment('visitors')}
          className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
            segment === 'visitors' ? 'bg-white text-emerald-800 shadow-sm' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Programvadászok ({registeredVisitors.length})</span>
        </button>
      </div>

      {/* SZEGMENS: SZOLGÁLTATÓK */}
      {segment === 'providers' && (
        <div className="space-y-4">
          <FilterPillBar
            options={[
              { id: 'all', label: 'Összes szolgáltató' },
              { id: 'pending', label: 'Új / Jóváhagyásra vár' },
              { id: 'approved', label: 'Jóváhagyott (Approved)' },
              { id: 'suspended', label: 'Felfüggesztett (Suspended)' },
              { id: 'banned', label: 'Véglegesen letiltott (Banned)' },
            ]}
            value={providerFilter}
            onChange={setProviderFilter}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProviders.map((prov) => {
              const provProgramsCount = programs.filter(p => p.provider_id === prov.id).length;
              return (
                <div key={prov.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        prov.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        prov.status === 'pending' ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300' :
                        prov.status === 'suspended' ? 'bg-orange-100 text-orange-900 ring-1 ring-orange-300' :
                        'bg-rose-100 text-rose-800 ring-1 ring-rose-300'
                      }`}>
                        {prov.status === 'approved' ? 'Jóváhagyva' :
                         prov.status === 'pending' ? 'Függőben (Új regisztráció)' :
                         prov.status === 'suspended' ? 'Felfüggesztve (ideiglenes)' : 'Véglegesen letiltva'}
                      </span>

                      <span className="text-xs text-stone-400">
                        {provProgramsCount} program a katalógusban
                      </span>
                    </div>

                    <h4 className="font-display font-bold text-lg text-stone-900">
                      {prov.company_name}
                    </h4>

                    <p className="text-xs text-stone-600 mt-2 line-clamp-2">
                      {prov.description}
                    </p>

                    <div className="mt-3 pt-3 border-t border-stone-100 space-y-1 text-xs text-stone-600">
                      <div>👤 Kapcsolattartó: <strong className="text-stone-800">{prov.contact_name}</strong></div>
                      <div>📧 E-mail: <strong className="text-stone-800">{prov.email}</strong></div>
                      <div>📞 Telefon: <strong className="text-stone-800">{prov.phone}</strong></div>
                      {prov.website && (
                        <div>🌐 Web: <a href={prov.website} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">{prov.website}</a></div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                    {prov.status !== 'approved' && (
                      <button
                        onClick={() => approveProvider(prov.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Szolgáltató Jóváhagyása</span>
                      </button>
                    )}

                    {prov.status !== 'suspended' && (
                      <button
                        onClick={() => suspendProvider(prov.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        title="Ideiglenes, visszavonható -- a Jóváhagyás gombbal bármikor újraaktiválható"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Felfüggesztés</span>
                      </button>
                    )}

                    {prov.status !== 'banned' && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Biztosan VÉGLEGESEN letiltod a(z) "${prov.company_name}" szolgáltatót? Ez admin-szemantikailag végleges döntés (a Jóváhagyás gombbal technikailag visszaállítható, de ez nem a szándékolt út).`)) {
                            banProvider(prov.id);
                          }
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        title="Végleges tiltás"
                      >
                        <ShieldOff className="w-3.5 h-3.5" />
                        <span>Végleges tiltás</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SZEGMENS: PROGRAMVADÁSZOK (kanban 3129aebc) -- csak megtekinthető
          lista, nincs szerkesztés/törlés ezen a fülön. */}
      {segment === 'visitors' && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
          <div className="p-4 bg-stone-50 border-b border-stone-100 text-xs font-bold text-stone-500 uppercase tracking-wider">
            Regisztrált Programvadászok ({registeredVisitors.length})
          </div>

          <div className="divide-y divide-stone-100">
            {registeredVisitors.length === 0 && (
              <div className="p-5 text-sm text-stone-500">Még nincs regisztrált programvadász.</div>
            )}
            {registeredVisitors.map((visitor) => {
              const formattedDate = new Date(visitor.created_at).toLocaleString('hu-HU', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
              return (
                <div key={visitor.id} className="p-5 hover:bg-stone-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-4 text-xs text-stone-700">
                    <div>👤 <strong className="text-stone-900">{visitor.name}</strong></div>
                    <div>📧 <a href={`mailto:${visitor.email}`} className="text-emerald-700 hover:underline font-semibold">{visitor.email}</a></div>
                    {visitor.phone && <div>📞 <strong className="text-stone-900">{visitor.phone}</strong></div>}
                  </div>
                  <span className="text-xs text-stone-400">
                    Regisztrált: {formattedDate}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
