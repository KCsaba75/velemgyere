import React, { useState, useEffect } from 'react';
import { CalendarDays, CheckCircle2, Sparkles, ExternalLink, RefreshCw } from 'lucide-react';
import { getCalendarSyncPreference, setCalendarSyncPreference, generateGoogleCalendarUrl } from '../services/googleCalendarService';

interface GoogleCalendarSyncCardProps {
  userId: string;
  userType: 'traveler' | 'provider';
  initialEnabled?: boolean;
  onSavePreference?: (enabled: boolean) => Promise<void> | void;
}

export const GoogleCalendarSyncCard: React.FC<GoogleCalendarSyncCardProps> = ({
  userId,
  userType,
  initialEnabled,
  onSavePreference,
}) => {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (initialEnabled !== undefined) return initialEnabled;
    return getCalendarSyncPreference(userId);
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (initialEnabled !== undefined) {
      setEnabled(initialEnabled);
    }
  }, [initialEnabled]);

  const handleToggle = async (newVal: boolean) => {
    setEnabled(newVal);
    setSaving(true);
    setSaveSuccess(false);

    // Save to local storage cache
    setCalendarSyncPreference(userId, newVal);

    try {
      if (onSavePreference) {
        await onSavePreference(newVal);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving Google Calendar preference:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleTestEvent = () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const testUrl = generateGoogleCalendarUrl({
      title: userType === 'provider' 
        ? '[Teszt Foglalás] Velem Gyere - Minta Vendég (2 fő)' 
        : 'Velem Gyere Teszt Foglalás (#VG-DEMO)',
      details: userType === 'provider'
        ? 'Ez egy teszt bejegyzés a Velem Gyere Google Naptár szinkronizációhoz.\nVendég: Minta János\nTelefon: +36 30 123 4567\nForrás: Telefonos foglalás'
        : 'Sikeres Velem Gyere szinkronizáció teszt!\nIdőpont: ' + dateStr + '\nTalálkozási pont: Főtér',
      location: 'Budapest, Magyarország',
      startDateStr: dateStr,
      startTimeStr: '11:00',
      durationHours: 2,
      bookingRef: 'VG-TESZT',
    });
    window.open(testUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-gradient-to-br from-white to-stone-50 rounded-2xl border border-stone-200/90 shadow-sm p-5 sm:p-6 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200/70 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-base sm:text-lg font-bold text-stone-900">
                Google Naptár Szinkronizáció
              </h3>
              {enabled ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  Aktív
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-stone-100 text-stone-500">
                  Kikapcsolva
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              {userType === 'provider'
                ? 'Automatikus naptárfeltöltés minden online és külső foglalásodhoz'
                : 'Minden lefoglalt és visszaigazolt élményed automatikusan a naptáradban'}
            </p>
          </div>
        </div>

        {/* Big Switch Toggle */}
        <div className="flex items-center gap-3 self-end sm:self-center">
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => handleToggle(e.target.checked)}
              disabled={saving}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[3px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>
      </div>

      <div className="pt-4 space-y-3">
        <ul className="text-xs text-stone-600 space-y-2">
          {userType === 'provider' ? (
            <>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Valós idejű szinkron:</strong> Ha új online vagy telefonos/külső foglalást rögzítesz, a rendszer azonnal felküldi a Google Naptáradba.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Ügyféladatok egy helyen:</strong> A naptárbejegyzés automatikusan tartalmazza a vendég nevét, telefonszámát és az egyedi foglalási azonosítót.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Kettős foglalás megelőzése:</strong> Kiválthatod a füzetben és külön Excelben vezetett naptárakat, minden programidőpont egyértelmű marad.
                </span>
              </li>
            </>
          ) : (
            <>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Automatikus emlékeztetők:</strong> A Google Naptár az utazás előtt értesítést küld az indulásról és a találkozási helyszínről.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Túravezető elérhetőségei:</strong> A naptáresemény leírásában megtalálod a szolgáltató telefonszámát és a találkozási pont pontos címét.
                </span>
              </li>
            </>
          )}
        </ul>

        {saveSuccess && (
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Google Naptár beállítások sikeresen mentve!</span>
          </div>
        )}

        <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleTestEvent}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 rounded-xl transition-colors cursor-pointer shadow-2xs"
            title="Google Naptár teszt esemény megnyitása új lapon"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Minta esemény kipróbálása Google Naptárban</span>
            <ExternalLink className="w-3 h-3 text-stone-400" />
          </button>

          <span className="text-[11px] text-stone-600 flex items-center gap-1">
            <RefreshCw className="w-3 h-3 text-stone-400" />
            Minden módosítás azonnal érvénybe lép
          </span>
        </div>
      </div>
    </div>
  );
};
