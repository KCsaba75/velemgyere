import React, { useEffect, useState } from 'react';
import { useApp, getBookingReference } from '../context/AppContext';
import { MessageSquare, Briefcase, ChevronLeft } from 'lucide-react';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { OrderBuyerInfo } from '../types/database';
import { BookingMessageThread } from './BookingMessageThread';
import { isBookingMessageWriteWindowOpen } from '../hooks/useBookingMessages';

// Kanban 2ffb61fa: a korabbi placeholder (5d6bb3d4) mogotti valodi funkcio --
// foglalasonkenti uzenetszal a szolgaltato es az adott booking igenybevevoje
// kozott. Csak azok a foglalasok jelennek meg, amiknek van VALODI, platformon
// regisztralt vevoje (user_id letezik, is_manual=false) -- manualis/telefonos
// foglalasnak nincs fiokja, nincs kinek uzenni.
export const ProviderMessagesPage: React.FC = () => {
  const { setCurrentView, currentUser, currentProvider, programs, orders, getOrderBuyerInfo, unreadBookingMessageCounts } = useApp();

  useDocumentMeta('Üzenetek -- Szolgáltatói Dashboard', 'Közvetlen kommunikáció a foglalásaid igénybevevőivel.');

  const ownPrograms = programs.filter(
    (p) => p.provider_id === currentProvider?.id || (currentUser.role === 'admin' ? true : false)
  );
  const ownProgramIds = new Set(ownPrograms.map(p => p.id));

  const messagableOrders = orders
    .filter(o => ownProgramIds.has(o.program_id) && !!o.user_id && !o.is_manual)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [buyerInfos, setBuyerInfos] = useState<Record<string, OrderBuyerInfo>>({});

  const orderIdsKey = messagableOrders.map(o => o.id).join(',');

  useEffect(() => {
    const ids = orderIdsKey ? orderIdsKey.split(',') : [];
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
  }, [orderIdsKey]);

  const selectedOrder = selectedOrderId ? messagableOrders.find(o => o.id === selectedOrderId) || null : null;
  const selectedProgram = selectedOrder ? programs.find(p => p.id === selectedOrder.program_id) : null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-6 sm:pb-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 mb-4 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold font-display text-stone-900 tracking-tight">
            Üzenetek
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Közvetlen üzenetküldés a foglalásaid igénybevevőivel.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCurrentView('provider-dashboard')}
          className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-stone-700 hover:text-stone-900 bg-white px-2.5 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-stone-200 hover:bg-stone-50 transition-colors cursor-pointer shrink-0"
          title="Vissza a Partner fiókhoz"
        >
          <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-500" />
          <span className="truncate">Partner fiók</span>
        </button>
      </div>

      {messagableOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <MessageSquare className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h4 className="text-base font-bold text-stone-800 font-display mb-1">
            Még nincs üzenetre jogosult foglalásod
          </h4>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            Ha egy igénybevevő platformon keresztül foglal nálad, itt fog megjelenni a vele való üzenetszál.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[18rem_1fr] gap-4">
          {/* Konverzacio-lista -- mobilon elrejtve, ha mar van kivalasztott szal */}
          <div className={`space-y-2 ${selectedOrder ? 'hidden md:block' : ''}`}>
            {messagableOrders.map((order) => {
              const program = programs.find(p => p.id === order.program_id);
              const buyer = buyerInfos[order.id];
              const unreadCount = unreadBookingMessageCounts[order.id] || 0;
              return (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => setSelectedOrderId(order.id)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-colors cursor-pointer ${
                    selectedOrderId === order.id
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-white border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-stone-900 truncate flex items-center gap-1.5 min-w-0">
                      {unreadCount > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />}
                      <span className="truncate">{buyer?.name || 'Igénybevevő'}</span>
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {unreadCount > 0 && (
                        <span className="bg-rose-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full leading-none">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                      <span className="font-mono text-[10px] font-bold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                        #{getBookingReference(order)}
                      </span>
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 truncate mt-0.5">{program?.title || 'Program'}</p>
                </button>
              );
            })}
          </div>

          {/* Kivalasztott szal */}
          <div>
            {selectedOrder ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setSelectedOrderId(null)}
                  className="md:hidden flex items-center gap-1.5 text-sm font-bold text-stone-600 hover:text-stone-900 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Vissza a listához
                </button>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-stone-900 text-sm">
                    {buyerInfos[selectedOrder.id]?.name || 'Igénybevevő'} -- {selectedProgram?.title || 'Program'}
                  </h3>
                  <span className="font-mono text-[10px] font-bold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded shrink-0">
                    #{getBookingReference(selectedOrder)}
                  </span>
                </div>
                <BookingMessageThread
                  orderId={selectedOrder.id}
                  senderRole="provider"
                  senderId={currentUser.user_id}
                  otherPartyLabel="az igénybevevő"
                  canSend={isBookingMessageWriteWindowOpen(selectedOrder.event_date || selectedOrder.occurrence?.event_date || selectedProgram?.event_date)}
                />
              </div>
            ) : (
              <div className="hidden md:flex items-center justify-center h-full min-h-[20rem] bg-white rounded-2xl border border-stone-200 text-stone-400 text-sm">
                Válassz egy beszélgetést a listából
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
