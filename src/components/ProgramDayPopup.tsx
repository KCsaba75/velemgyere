import React, { useEffect, useState } from 'react';
import { X, MapPin, Clock, Users, Phone, Mail, Loader2 } from 'lucide-react';
import { Order, OrderBuyerInfo, Program, ProgramOccurrence } from '../types/database';
import { BookingDetailModal } from './BookingDetailModal';

interface ProgramDayPopupProps {
  occurrence: ProgramOccurrence;
  program: Program | undefined;
  orders: Order[];
  getOrderBuyerInfo: (orderId: string) => Promise<OrderBuyerInfo | null>;
  onClose: () => void;
  // Kanban c4a1f9e2 kiegeszites: kulso foglalas felvetele erre a mar kivalasztott
  // idopontra -- ugyanaz a fuggveny, amit az inline panel "Kulso foglalas" gombja
  // is hiv, csak most mar occurrenceId-vel is, hogy a ManualBookingModal elore
  // kitoltve nyiljon (lasd ManualBookingModal initialOccurrenceId).
  onOpenManualBooking?: (programId: string, occurrenceId: string) => void;
}

// Kanban 70afbb5a point 1: a naptar (havi- es heti-nezet is) korabban csak a
// napi foglalasok DARABSZAMAT mutatta (bookedCountByOccurrence) inline, a
// tenyleges foglalas-lista (ki, mennyi fovel, milyen allapotban) csak a
// Foglalasaim oldalon volt lathato. Ez a popup -- kozos a ket naptar-nezet
// kozott, hogy ne duplikalodjon -- egy programra/idopontra kattintva adja meg
// ezt a reszletet.
// Kanban c4a1f9e2: egy sorra kattintva a teljes BookingDetailModal nyilik
// (ugyanaz a modal, mint a Lista-nezet fulon), sajat lokalis selectedOrderId-
// vel a popupon belul. Athelyezes/lemondas tovabbra is csak az inline panelbol
// erheto el (azokhoz mar nyitva van a program-kartya), DE kulso foglalas
// felvetele a popupbol is engedelyezve van, ha van meg szabad hely.
export const ProgramDayPopup: React.FC<ProgramDayPopupProps> = ({ occurrence, program, orders, getOrderBuyerInfo, onClose, onOpenManualBooking }) => {
  const dayOrders = orders.filter(o => o.occurrence_id === occurrence.id);
  const [buyerInfos, setBuyerInfos] = useState<Record<string, OrderBuyerInfo>>({});
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrder = selectedOrderId ? dayOrders.find(o => o.id === selectedOrderId) || null : null;

  useEffect(() => {
    let cancelled = false;
    dayOrders
      .filter(o => !o.manual_customer_name && !buyerInfos[o.id])
      .forEach(o => {
        getOrderBuyerInfo(o.id).then(info => {
          if (cancelled || !info) return;
          setBuyerInfos(prev => ({ ...prev, [o.id]: info }));
        });
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occurrence.id]);

  const totalParticipants = dayOrders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.participants_count || 0), 0);

  // Kanban c4a1f9e2 kiegeszites: ugyanaz a kapacitas-logika, mint a
  // ProviderScheduleCalendar inline panel "isFull" szamitasa -- csak akkor
  // ajanljuk fel a kulso foglalast, ha van meg szabad hely.
  const maxCap = occurrence.max_participants ?? program?.max_participants ?? null;
  const isFull = maxCap != null && totalParticipants >= maxCap;

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 relative my-8 animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="pr-10 mb-5">
          <h3 className="font-display text-xl font-extrabold text-stone-900">{program?.title || 'Program'}</h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600 mt-2">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              {new Date(occurrence.event_date + 'T00:00:00').toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' })}
              {occurrence.start_time ? ` • ${occurrence.start_time}${occurrence.end_time ? `–${occurrence.end_time}` : ''}` : ''}
            </span>
            {program?.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-stone-400" />
                {program.location}
              </span>
            )}
            <span className="flex items-center gap-1 font-bold text-stone-800">
              <Users className="w-3.5 h-3.5 text-stone-400" />
              {totalParticipants}{occurrence.max_participants ?? program?.max_participants ? ` / ${occurrence.max_participants ?? program?.max_participants}` : ''} fő
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mb-3">
          <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
            Foglalások ({dayOrders.length})
          </h4>
          {onOpenManualBooking && program && !isFull && (
            <button
              type="button"
              onClick={() => onOpenManualBooking(program.id, occurrence.id)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
              title="Új telefonos, személyes vagy egyéb külső foglalás erre az időpontra"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Külső foglalás</span>
            </button>
          )}
        </div>

        {dayOrders.length === 0 ? (
          <div className="text-center py-8 text-stone-400 text-sm">Erre az időpontra még nincs foglalás.</div>
        ) : (
          <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden">
            {dayOrders.map(order => {
              const buyer = buyerInfos[order.id];
              const name = order.manual_customer_name || buyer?.name;
              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className="p-3.5 flex items-start justify-between gap-3 text-sm cursor-pointer hover:bg-stone-50/80 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-stone-800 truncate flex items-center gap-1.5">
                      {name || (
                        <span className="flex items-center gap-1.5 text-stone-400 font-normal">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Betöltés...
                        </span>
                      )}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {order.participants_count} fő
                      </span>
                      {order.manual_customer_phone && (
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {order.manual_customer_phone}</span>
                      )}
                      {(order.manual_customer_email || buyer?.email) && (
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {order.manual_customer_email || buyer?.email}</span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-lg shrink-0 ${
                      order.status === 'confirmed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : order.status === 'pending'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {order.status === 'confirmed' ? 'Visszaigazolva' : order.status === 'pending' ? 'Függőben' : 'Lemondva'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>

    {selectedOrder && (
      <BookingDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrderId(null)}
      />
    )}
    </>
  );
};
