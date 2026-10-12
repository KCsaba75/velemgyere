import React from 'react';
import {
  Ticket,
  Calendar,
  Clock,
  Users,
  MapPin,
  Navigation,
  Layers,
  Phone,
  Mail,
  Globe,
  Banknote,
  CreditCard,
  Check,
  XCircle,
  User,
  Building2,
} from 'lucide-react';

interface BookingVoucherProps {
  bookingReference: string;
  statusLabel: string;

  // Foglaló (kanban 757c1720: Csaba expliciten kerte, a mar bejelentkezett
  // currentUser-bol, nincs uj adatforras)
  bookerName?: string;
  bookerEmail?: string;
  bookerPhone?: string | null;

  // Program
  programTitle: string;
  programShortDescription?: string;
  programLocation?: string;
  programCountry?: string;
  programRegionName?: string;
  programCategoryName?: string;
  dateFormatted: string;
  startTime?: string;
  endTime?: string;
  duration?: string;
  departureLocation?: string;
  participantsCount: number;
  included?: string[];
  notIncluded?: string[];

  // Szolgáltató -- company_name/description a programs.provider joinbol (mindig
  // elerheto, publikus teaser-oszlop), contact_name/phone/email/website a
  // getProviderContactForOrder RPC-bol (pending/confirmed rendelesnel elerheto).
  // A providers tablaban NINCS cim/address mezo -- nem talalunk ki ujat.
  providerCompanyName?: string;
  providerDescription?: string;
  providerContactName?: string;
  providerPhone?: string;
  providerEmail?: string;
  providerWebsite?: string;

  // Fizetés
  onsiteAmountFormatted?: string;
  onsitePaymentMethodLabel?: string;
  bookingFeeFormatted?: string;
}

/**
 * Nyomtatható/PDF-ként menthető foglalási utalvány (kanban f969f03f -> 757c1720,
 * GetYourGuide/Booking.com minta). Dinamikusan generálódik a már meglévő
 * foglalás/program/szolgáltató/profil-adatokból -- nincs külön tárolás/PDF-fájl.
 * Csaba kifejezett kérése (757c1720): EGY lapon, TELJES adattartalommal (foglaló +
 * szolgáltató + program minden elérhető adata), nem csak kivonat -- ezért sűrű,
 * boarding-pass-szerű elrendezés, kis betűmérettel, hogy A4-en beférjen.
 *
 * Megosztott a BookingCheckoutModal success lépése és a BookingDetailModal között.
 * A szülő egy `.print-voucher` wrapper div-be teszi, a globális @media print szabály
 * (src/index.css) csak azon belül hagy mindent látható állapotban nyomtatáskor.
 */
export const BookingVoucher: React.FC<BookingVoucherProps> = ({
  bookingReference,
  statusLabel,
  bookerName,
  bookerEmail,
  bookerPhone,
  programTitle,
  programShortDescription,
  programLocation,
  programCountry,
  programRegionName,
  programCategoryName,
  dateFormatted,
  startTime,
  endTime,
  duration,
  departureLocation,
  participantsCount,
  included,
  notIncluded,
  providerCompanyName,
  providerDescription,
  providerContactName,
  providerPhone,
  providerEmail,
  providerWebsite,
  onsiteAmountFormatted,
  onsitePaymentMethodLabel,
  bookingFeeFormatted,
}) => {
  return (
    <div className="bg-white border-2 border-stone-900 rounded-2xl p-5 space-y-3.5 text-stone-800">
      {/* Fejléc */}
      <div className="flex items-start justify-between gap-4 pb-3 border-b-2 border-dashed border-stone-300">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Ticket className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-bold uppercase tracking-widest text-stone-500 block">
              Velem Gyere • Foglalási utalvány
            </span>
            <h3 className="font-display font-black text-base text-stone-900 leading-tight truncate">
              {programTitle}
            </h3>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400 block">
            Azonosító
          </span>
          <span className="font-mono font-black text-sm text-stone-900 block">
            #{bookingReference}
          </span>
          <span className="text-[10px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded mt-0.5 inline-block">
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Program kulcsadatok */}
      <div className="grid grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 block mb-0.5">Időpont</span>
          <div className="flex items-center gap-1 font-bold text-stone-900"><Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" /><span>{dateFormatted}</span></div>
        </div>
        {(startTime || endTime) && (
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 block mb-0.5">Idősáv</span>
            <div className="flex items-center gap-1 font-bold text-stone-900"><Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" /><span>{startTime}{endTime ? ` - ${endTime}` : ''}</span></div>
          </div>
        )}
        {duration && (
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 block mb-0.5">Időtartam</span>
            <div className="flex items-center gap-1 font-bold text-stone-900"><Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" /><span>{duration}</span></div>
          </div>
        )}
        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 block mb-0.5">Résztvevők</span>
          <div className="flex items-center gap-1 font-bold text-stone-900"><Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" /><span>{participantsCount} fő</span></div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        {programLocation && (
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 block mb-0.5">Helyszín</span>
            <div className="flex items-center gap-1 font-bold text-stone-900"><MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" /><span>{programLocation}{programCountry ? `, ${programCountry}` : ''}</span></div>
          </div>
        )}
        {departureLocation && (
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 block mb-0.5">Indulás / találkozó</span>
            <div className="flex items-center gap-1 font-bold text-stone-900"><Navigation className="w-3.5 h-3.5 text-emerald-600 shrink-0" /><span>{departureLocation}</span></div>
          </div>
        )}
        {(programCategoryName || programRegionName) && (
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 block mb-0.5">Szolgáltatás / Régió</span>
            <div className="flex items-center gap-1 font-bold text-stone-900"><Layers className="w-3.5 h-3.5 text-emerald-600 shrink-0" /><span>{[programCategoryName, programRegionName].filter(Boolean).join(' • ')}</span></div>
          </div>
        )}
      </div>

      {programShortDescription && (
        <p className="text-[11px] text-stone-600 italic leading-snug border-t border-stone-100 pt-2.5">
          {programShortDescription}
        </p>
      )}

      {(included?.length || notIncluded?.length) ? (
        <div className="grid grid-cols-2 gap-3 text-[10px] border-t border-stone-100 pt-2.5">
          {included && included.length > 0 && (
            <div>
              <span className="font-bold text-emerald-800 uppercase tracking-wider block mb-1">Tartalmazza</span>
              <ul className="space-y-0.5">
                {included.map((item, i) => (
                  <li key={i} className="flex items-start gap-1 text-stone-700">
                    <Check className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" /><span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {notIncluded && notIncluded.length > 0 && (
            <div>
              <span className="font-bold text-rose-700 uppercase tracking-wider block mb-1">Nem tartalmazza</span>
              <ul className="space-y-0.5">
                {notIncluded.map((item, i) => (
                  <li key={i} className="flex items-start gap-1 text-stone-700">
                    <XCircle className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" /><span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}

      {/* Foglaló + Szolgáltató */}
      <div className="grid grid-cols-2 gap-3 border-t border-stone-200 pt-3">
        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1 mb-1">
            <User className="w-3 h-3" /> Foglaló (Programvadász)
          </span>
          <div className="text-[11px] text-stone-700 space-y-0.5">
            {bookerName && <div className="font-bold text-stone-900">{bookerName}</div>}
            {bookerPhone && <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-stone-400 shrink-0" />{bookerPhone}</div>}
            {bookerEmail && <div className="flex items-center gap-1"><Mail className="w-3 h-3 text-stone-400 shrink-0" />{bookerEmail}</div>}
          </div>
        </div>
        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1 mb-1">
            <Building2 className="w-3 h-3" /> Szolgáltató
          </span>
          {providerCompanyName ? (
            <div className="text-[11px] text-stone-700 space-y-0.5">
              <div className="font-bold text-stone-900">{providerCompanyName}</div>
              {providerContactName && providerContactName !== providerCompanyName && (
                <div className="text-stone-600">{providerContactName}</div>
              )}
              {providerPhone && <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-stone-400 shrink-0" />{providerPhone}</div>}
              {providerEmail && <div className="flex items-center gap-1"><Mail className="w-3 h-3 text-stone-400 shrink-0" />{providerEmail}</div>}
              {providerWebsite && <div className="flex items-center gap-1"><Globe className="w-3 h-3 text-stone-400 shrink-0" />{providerWebsite}</div>}
              {!providerPhone && !providerEmail && (
                <p className="text-[10px] text-stone-400 italic">Pontos elérhetőség a visszaigazolás után jelenik meg.</p>
              )}
              {providerDescription && (
                <p className="text-[10px] text-stone-500 italic leading-snug pt-0.5 line-clamp-2">{providerDescription}</p>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-stone-400 italic">A szolgáltató elérhetőségei a visszaigazolás után jelennek meg.</p>
          )}
        </div>
      </div>

      {(onsiteAmountFormatted || bookingFeeFormatted) && (
        <div className="border-t border-stone-200 pt-3 space-y-1 text-xs">
          {bookingFeeFormatted && (
            <div className="flex items-center justify-between text-stone-600">
              <span className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 text-indigo-500" />Online rendezett kényelmi díj:</span>
              <strong className="text-stone-900">{bookingFeeFormatted}</strong>
            </div>
          )}
          {onsiteAmountFormatted && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-stone-700">
                <Banknote className="w-4 h-4 text-stone-500" />
                Helyszínen fizetendő{onsitePaymentMethodLabel ? ` (${onsitePaymentMethodLabel})` : ''}:
              </span>
              <span className="text-base font-black text-stone-900">{onsiteAmountFormatted}</span>
            </div>
          )}
        </div>
      )}

      <p className="text-[9px] text-stone-400 text-center pt-1 border-t border-stone-100">
        Kérjük, ezt az utalványt mutasd be a szolgáltatónak a program napján. • velemgyere.hu
      </p>
    </div>
  );
};
