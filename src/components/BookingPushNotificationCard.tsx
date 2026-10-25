import React, { useState } from 'react';
import { BellRing, CheckCircle2, AlertTriangle } from 'lucide-react';
import { isPushSupported, subscribeToPush, unsubscribeFromPush } from '../services/pushNotificationService';

interface BookingPushNotificationCardProps {
  userId: string;
  initialEnabled: boolean;
  onSavePreference: (enabled: boolean) => Promise<void> | void;
}

export const BookingPushNotificationCard: React.FC<BookingPushNotificationCardProps> = ({
  userId,
  initialEnabled,
  onSavePreference,
}) => {
  const [enabled, setEnabled] = useState<boolean>(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const supported = isPushSupported();

  const handleToggle = async (newVal: boolean) => {
    setSaving(true);
    setMessage(null);

    try {
      if (newVal) {
        const result = await subscribeToPush(userId);
        if (!result.success) {
          setMessage({ type: 'error', text: result.message });
          setSaving(false);
          return;
        }
      } else {
        await unsubscribeFromPush();
      }

      await onSavePreference(newVal);
      setEnabled(newVal);
      setMessage({ type: 'success', text: newVal ? 'Böngésző-értesítések bekapcsolva.' : 'Böngésző-értesítések kikapcsolva.' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Hiba történt a beállítás mentésekor.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-white to-stone-50 rounded-2xl border border-stone-200/90 shadow-sm p-5 sm:p-6 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
            <BellRing className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-base sm:text-lg font-bold text-stone-900">
                Böngésző-értesítések
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
              Azonnali értesítés új foglalás-chat üzenetről, akkor is, ha nem az oldalon vagy éppen.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => handleToggle(e.target.checked)}
              disabled={saving || !supported}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[3px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>
      </div>

      <div className="pt-4 space-y-3">
        {!supported && (
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Ez a böngésző nem támogatja az értesítéseket. iPhone-on Safari-ban csak akkor működik, ha az oldalt a kezdőképernyőre telepítetted.
            </span>
          </div>
        )}

        {message && (
          <div
            className={`p-2.5 rounded-xl text-xs font-semibold flex items-start gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{message.text}</span>
          </div>
        )}
      </div>
    </div>
  );
};
