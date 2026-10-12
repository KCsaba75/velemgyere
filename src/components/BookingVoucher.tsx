import React from 'react';
import { Ticket, Calendar, Users, MapPin, Phone, Mail, Globe, Banknote } from 'lucide-react';

interface BookingVoucherProps {
  bookingReference: string;
  programTitle: string;
  programLocation?: string;
  dateFormatted: string;
  participantsCount: number;
  statusLabel: string;
  providerName?: string;
  providerPhone?: string;
  providerEmail?: string;
  providerWebsite?: string;
  onsiteAmountFormatted?: string;
  onsitePaymentMethodLabel?: string;
}

/**
 * Nyomtatható/PDF-ként menthető foglalási utalvány (kanban f969f03f, GetYourGuide/
 * Booking.com minta). Dinamikusan generálódik a már meglévő foglalás-adatokból --
 * nincs külön tárolás/PDF-fájl. Megosztott a BookingCheckoutModal success lépése
 * és a BookingDetailModal között, hogy egy korábbi foglalásra is vissza lehessen
 * térni nyomtatásért, ne csak a frissen leadottnál.
 *
 * A szülő egy `.print-voucher` wrapper div-be teszi ezt a komponenst, a globális
 * @media print szabály (src/index.css) csak azon belül hagy mindent látható
 * állapotban nyomtatáskor -- a modal háttere/gombjai eltűnnek.
 */
export const BookingVoucher: React.FC<BookingVoucherProps> = ({
  bookingReference,
  programTitle,
  programLocation,
  dateFormatted,
  participantsCount,
  statusLabel,
  providerName,
  providerPhone,
  providerEmail,
  providerWebsite,
  onsiteAmountFormatted,
  onsitePaymentMethodLabel,
}) => {
  return (
    <div className="bg-white border-2 border-stone-900 rounded-2xl p-6 space-y-5">
      <div className="flex items-start justify-between gap-4 pb-4 border-b-2 border-dashed border-stone-300">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 block">
              Velem Gyere • Foglalási utalvány
            </span>
            <h3 className="font-display font-black text-lg text-stone-900 leading-tight">
              {programTitle}
            </h3>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 block">
            Azonosító
          </span>
          <span className="font-mono font-black text-base text-stone-900">
            #{bookingReference}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-0.5">
            Időpont
          </span>
          <div className="flex items-center gap-1.5 font-bold text-stone-900">
            <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{dateFormatted}</span>
          </div>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-0.5">
            Résztvevők
          </span>
          <div className="flex items-center gap-1.5 font-bold text-stone-900">
            <Users className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{participantsCount} fő</span>
          </div>
        </div>
        {programLocation && (
          <div className="col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-0.5">
              Helyszín
            </span>
            <div className="flex items-center gap-1.5 font-bold text-stone-900">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{programLocation}</span>
            </div>
          </div>
        )}
      </div>

      <div className="text-xs font-bold text-stone-700 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 inline-block">
        Állapot: {statusLabel}
      </div>

      <div className="pt-4 border-t border-stone-200">
        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1.5">
          Szolgáltató
        </span>
        {providerName ? (
          <div className="text-sm text-stone-700 space-y-1">
            <div className="font-bold text-stone-900">{providerName}</div>
            {providerPhone && (
              <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-stone-400" /> {providerPhone}</div>
            )}
            {providerEmail && (
              <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-stone-400" /> {providerEmail}</div>
            )}
            {providerWebsite && (
              <div className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-stone-400" /> {providerWebsite}</div>
            )}
          </div>
        ) : (
          <p className="text-xs text-stone-400 italic">A szolgáltató elérhetőségei a visszaigazolás után jelennek meg.</p>
        )}
      </div>

      {onsiteAmountFormatted && (
        <div className="flex items-center justify-between pt-4 border-t border-stone-200">
          <span className="flex items-center gap-1.5 text-sm font-bold text-stone-700">
            <Banknote className="w-4 h-4 text-stone-500" />
            Helyszínen fizetendő{onsitePaymentMethodLabel ? ` (${onsitePaymentMethodLabel})` : ''}:
          </span>
          <span className="text-base font-black text-stone-900">{onsiteAmountFormatted}</span>
        </div>
      )}

      <p className="text-[10px] text-stone-400 text-center pt-2">
        Kérjük, ezt az utalványt mutasd be a szolgáltatónak a program napján. • velemgyere.hu
      </p>
    </div>
  );
};
