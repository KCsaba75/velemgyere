import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Users, Mail, Phone, Ticket, Calendar } from 'lucide-react';
import { OrderBuyerInfo } from '../types/database';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

// Kanban 4aac8eda (Csaba, 2026-11-11): az uj sidebar "Vendegeim" szekcioja --
// "Foglalok, letszam, kapcsolattartasi adatok". Nincs ilyen oldal korabban,
// a "Foglalasok" (provider-schedule) mar foglalas-kozpontu listat mutat, ez
// itt szandekosan VENDEG-kozpontu: egy-egy sor egy EMBER (tobb foglalasa
// osszegezve), nem egy-egy foglalas -- igy ad tenyleges uj erteket a mar
// meglevo foglalas-listak mellett.
//
// FONTOS KORLAT (regisztralt vasarlokra): a get_order_buyer_info RPC csak
// nevet+emailt ad vissza a szolgaltatonak, telefonszamot NEM -- a rendszer
// jelenleg sehol nem oszt meg vasaroloi telefonszamot a szolgaltatoval
// (lasd OrderBuyerInfo tipus). Kulso/kezzel rogzitett foglalasnal
// (manual_customer_phone) ez elerheto, mert azt maga a szolgaltato vitte
// be. Ez a lap ezert a telefonszam oszlopot ures sorral mutatja regisztralt
// vasarlonal, nem talal ki adatot.
interface GuestAggregate {
  key: string;
  name: string;
  email?: string;
  phone?: string;
  isManual: boolean;
  bookingsCount: number;
  totalParticipants: number;
  lastBookingDate: string;
}

export const ProviderGuestsPage: React.FC = () => {
  const { currentUser, currentProvider, programs, orders, getOrderBuyerInfo } = useApp();

  useDocumentMeta('Vendégeim -- Szolgáltatói Dashboard', 'A programjaidra foglaló vendégek, létszámuk és elérhetőségük.');

  const ownPrograms = programs.filter(
    p => p.provider_id === currentProvider?.id || (currentUser.role === 'admin' ? true : false)
  );
  const displayPrograms = ownPrograms.length > 0 ? ownPrograms : programs;
  const ownProgramIds = new Set(displayPrograms.map(p => p.id));
  const guestOrders = orders.filter(o => ownProgramIds.has(o.program_id) && o.status !== 'cancelled');

  const [buyerInfos, setBuyerInfos] = useState<Record<string, OrderBuyerInfo>>({});
  const nonManualOrderIds = guestOrders.filter(o => !o.is_manual).map(o => o.id).join(',');

  useEffect(() => {
    const ids = nonManualOrderIds ? nonManualOrderIds.split(',') : [];
    let cancelled = false;
    ids.forEach(id => {
      getOrderBuyerInfo(id).then(info => {
        if (cancelled || !info) return;
        setBuyerInfos(prev => ({ ...prev, [id]: info }));
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonManualOrderIds]);

  const guestMap = new Map<string, GuestAggregate>();
  guestOrders.forEach(o => {
    const isManual = Boolean(o.is_manual);
    const buyerInfo = buyerInfos[o.id];
    const name = isManual ? (o.manual_customer_name || 'Külső vendég') : (buyerInfo?.name || 'Vendég');
    const email = isManual ? o.manual_customer_email : buyerInfo?.email;
    const phone = isManual ? o.manual_customer_phone : undefined;
    const key = isManual ? `manual:${email || phone || name}` : `user:${o.user_id}`;

    const existing = guestMap.get(key);
    const bookingDate = o.created_at;
    if (existing) {
      existing.bookingsCount += 1;
      existing.totalParticipants += o.participants_count;
      if (new Date(bookingDate).getTime() > new Date(existing.lastBookingDate).getTime()) {
        existing.lastBookingDate = bookingDate;
      }
      if (!existing.email && email) existing.email = email;
      if (!existing.phone && phone) existing.phone = phone;
    } else {
      guestMap.set(key, {
        key,
        name,
        email: email || undefined,
        phone: phone || undefined,
        isManual,
        bookingsCount: 1,
        totalParticipants: o.participants_count,
        lastBookingDate: bookingDate,
      });
    }
  });

  const guests = Array.from(guestMap.values()).sort(
    (a, b) => new Date(b.lastBookingDate).getTime() - new Date(a.lastBookingDate).getTime()
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
      <div>
        <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold font-display text-stone-900 tracking-tight flex items-center gap-2">
          <Users className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600" />
          <span>Vendégeim</span>
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          A programjaidra foglaló vendégek, összesített létszámuk és elérhetőségük.
        </p>
      </div>

      {guests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <Users className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h4 className="text-base font-bold text-stone-800 font-display mb-1">Még nincs vendéged</h4>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            Amint beérkezik az első foglalásod, itt fog megjelenni a foglaló neve, létszáma és elérhetősége.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm divide-y divide-stone-100 overflow-hidden">
          {guests.map(g => (
            <div key={g.key} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-stone-900 text-sm truncate">{g.name}</span>
                  {g.isManual && (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded shrink-0">
                      Külső vendég
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-stone-500">
                  <span className="flex items-center gap-1.5">
                    <Ticket className="w-3.5 h-3.5 text-stone-400" />
                    {g.bookingsCount} foglalás
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-stone-400" />
                    {g.totalParticipants} fő összesen
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    Legutóbbi: {new Date(g.lastBookingDate).toLocaleDateString('hu-HU')}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1 text-xs text-stone-600 sm:text-right shrink-0">
                {g.email && (
                  <span className="flex items-center gap-1.5 sm:justify-end">
                    <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">{g.email}</span>
                  </span>
                )}
                {g.phone && (
                  <span className="flex items-center gap-1.5 sm:justify-end">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    {g.phone}
                  </span>
                )}
                {!g.email && !g.phone && (
                  <span className="text-stone-400">Nincs megosztott elérhetőség</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
