import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Check, Ban, ShieldOff, ShieldCheck } from 'lucide-react';
import { FilterPillBar } from './FilterPillBar';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

// Kanban fb32ec4b (Csaba korrekcioja a daa1ed70/a8676c22 deep-linkre): a
// Szolgaltatok kezeles kikerult az admin Fiok (AdminDashboard tab-sor) alol
// onallo top-level oldalra, a 5a3a8dd8-as mintazat szerint (ProviderProgramsPage
// a szolgaltatoi oldalon).
export const AdminProvidersPage: React.FC = () => {
  const { providers, programs, approveProvider, suspendProvider, banProvider, setCurrentView } = useApp();

  useDocumentMeta('Szolgáltatók -- Admin', 'A regisztrált szolgáltatók jóváhagyása és adminisztrációja.');

  const [providerFilter, setProviderFilter] = useState<string>('all');

  const filteredProviders = providers.filter(p => {
    if (providerFilter === 'all') return true;
    return p.status === providerFilter;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-6 sm:pb-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 mb-4 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold font-display text-stone-900 tracking-tight">
            Szolgáltatók
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Regisztrált szolgáltatók jóváhagyása, felfüggesztése és letiltása.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCurrentView('admin-dashboard')}
          className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-stone-700 hover:text-stone-900 bg-white px-2.5 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-stone-200 hover:bg-stone-50 transition-colors cursor-pointer shrink-0"
          title="Vissza az Admin Vezérlőpulthoz"
        >
          <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-500" />
          <span className="truncate">Admin Vezérlőpult</span>
        </button>
      </div>

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
    </div>
  );
};
