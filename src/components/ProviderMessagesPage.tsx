import React, { useEffect, useState, useMemo } from 'react';
import { useApp, getBookingReference } from '../context/AppContext';
import { MessageSquare, Briefcase, ChevronLeft, Calendar, Clock, Users, MessageCircle, Archive } from 'lucide-react';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { Order, OrderBuyerInfo, Program } from '../types/database';
import { BookingMessageThread } from './BookingMessageThread';
import { isBookingMessageWriteWindowOpen } from '../hooks/useBookingMessages';
import { supabase } from '../lib/supabase';

function formatBookingDateTime(order: Order, program?: Program | null): { dateStr: string; timeStr: string; participantsStr: string } {
  const rawDate = order.event_date || order.occurrence?.event_date || program?.event_date;
  const rawTime = order.occurrence?.start_time || program?.start_time;
  const participantsStr = order.participants_count ? `${order.participants_count} fő` : '';

  let dateStr = 'Időpont nélkül';
  if (rawDate) {
    try {
      const parts = rawDate.split('T')[0].split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      dateStr = d.toLocaleDateString('hu-HU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        weekday: 'short',
      });
    } catch {
      dateStr = rawDate;
    }
  }

  const timeStr = rawTime ? `${rawTime}` : '';
  return { dateStr, timeStr, participantsStr };
}

// Kanban 2ffb61fa + user request:
// 1. Üzenetek főoldalán csak az aktív üzenetek legyenek elérhetőek, a lezárultak külön fül alatt.
// 2. Az üzenetek lapon a foglalás kártyán a program mellett szerepel a pontos foglalt időpont és létszám.
export const ProviderMessagesPage: React.FC = () => {
  const { setCurrentView, currentUser, currentProvider, programs, orders, getOrderBuyerInfo, unreadBookingMessageCounts } = useApp();

  useDocumentMeta('Üzenetek -- Szolgáltatói Dashboard', 'Közvetlen kommunikáció a foglalásaid igénybevevőivel.');

  const ownPrograms = programs.filter(
    (p) => p.provider_id === currentProvider?.id || (currentUser.role === 'admin' ? true : false)
  );
  const ownProgramIds = new Set(ownPrograms.map(p => p.id));

  // Minden foglalas, amire a szolgaltato jogosult uzenetet latni/irni --
  // meg akkor is, ha meg senki nem irt bele (lasd messagableOrders lejjebb,
  // ami erre epul, de csak a mar elkezdett szalakat jeleniti meg).
  const candidateOrders = useMemo(() => {
    return orders
      .filter(o => ownProgramIds.has(o.program_id) && !!o.user_id && !o.is_manual)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders, ownProgramIds]);

  const candidateOrderIdsKey = candidateOrders.map(o => o.id).join(',');

  // Kartya 8f9a8418 (Csaba, 2026-10-31): a lista csak azokat a foglalasokat
  // mutassa, amikben mar van legalabb egy booking_messages bejegyzes.
  const [orderIdsWithMessages, setOrderIdsWithMessages] = useState<Set<string>>(new Set());

  useEffect(() => {
    const ids = candidateOrderIdsKey ? candidateOrderIdsKey.split(',') : [];
    if (ids.length === 0) {
      setOrderIdsWithMessages(new Set());
      return;
    }
    let cancelled = false;
    supabase
      .from('booking_messages')
      .select('order_id')
      .in('order_id', ids)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Nem sikerult lekerni, mely foglalasokhoz van mar uzenet:', error);
          return;
        }
        setOrderIdsWithMessages(new Set((data || []).map(row => row.order_id as string)));
      });
    return () => {
      cancelled = true;
    };
  }, [candidateOrderIdsKey]);

  const messagableOrders = useMemo(() => {
    return candidateOrders.filter(o => orderIdsWithMessages.has(o.id));
  }, [candidateOrders, orderIdsWithMessages]);

  const [activeTab, setActiveTab] = useState<'active' | 'closed'>('active');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [buyerInfos, setBuyerInfos] = useState<Record<string, OrderBuyerInfo>>({});

  // Categorize orders into active vs closed threads
  const activeOrders = useMemo(() => {
    return messagableOrders.filter(o => {
      const prog = programs.find(p => p.id === o.program_id);
      const effectiveDate = o.event_date || o.occurrence?.event_date || prog?.event_date;
      const isOpen = isBookingMessageWriteWindowOpen(effectiveDate);
      return o.status !== 'cancelled' && isOpen;
    });
  }, [messagableOrders, programs]);

  const closedOrders = useMemo(() => {
    return messagableOrders.filter(o => {
      const prog = programs.find(p => p.id === o.program_id);
      const effectiveDate = o.event_date || o.occurrence?.event_date || prog?.event_date;
      const isOpen = isBookingMessageWriteWindowOpen(effectiveDate);
      return o.status === 'cancelled' || !isOpen;
    });
  }, [messagableOrders, programs]);

  const currentTabOrders = activeTab === 'active' ? activeOrders : closedOrders;

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

  // When switching tabs, clear selected order if not present in the selected tab
  const handleTabChange = (tab: 'active' | 'closed') => {
    setActiveTab(tab);
    if (selectedOrderId) {
      const list = tab === 'active' ? activeOrders : closedOrders;
      if (!list.some(o => o.id === selectedOrderId)) {
        setSelectedOrderId(null);
      }
    }
  };

  const selectedOrder = selectedOrderId ? messagableOrders.find(o => o.id === selectedOrderId) || null : null;
  const selectedProgram = selectedOrder ? programs.find(p => p.id === selectedOrder.program_id) : null;
  const selectedTiming = selectedOrder ? formatBookingDateTime(selectedOrder, selectedProgram) : null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-6 sm:pb-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 mb-4 sm:mb-6">
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

      {/* Tabs: Aktív üzenetek vs Lezárult üzenetek */}
      <div className="flex items-center gap-2 mb-4 border-b border-stone-200 pb-2">
        <button
          type="button"
          onClick={() => handleTabChange('active')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'active'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80 hover:text-stone-900'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          <span>Aktív üzenetek</span>
          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
            activeTab === 'active' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'
          }`}>
            {activeOrders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('closed')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'closed'
              ? 'bg-stone-800 text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80 hover:text-stone-900'
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>Lezárult üzenetek</span>
          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
            activeTab === 'closed' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'
          }`}>
            {closedOrders.length}
          </span>
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
      ) : currentTabOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <MessageSquare className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h4 className="text-base font-bold text-stone-800 font-display mb-1">
            {activeTab === 'active' ? 'Nincs aktív üzenetszálad' : 'Nincs lezárult üzenetszálad'}
          </h4>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            {activeTab === 'active'
              ? 'Minden korábbi üzenetváltás a lezárult fül alatt található.'
              : 'A lezárult vagy lemondott foglalások üzenetei fognak itt megjelenni.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[20rem_1fr] gap-4">
          {/* Konverzáció-lista -- mobilon elrejtve, ha már van kiválasztott szál */}
          <div className={`space-y-2 ${selectedOrder ? 'hidden md:block' : ''}`}>
            {currentTabOrders.map((order) => {
              const program = programs.find(p => p.id === order.program_id);
              const buyer = buyerInfos[order.id];
              const unreadCount = unreadBookingMessageCounts[order.id] || 0;
              const timing = formatBookingDateTime(order, program);

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

                  <p className="text-xs font-bold text-stone-800 truncate mt-1">{program?.title || 'Program'}</p>

                  {/* Foglalt időpont és létszám a kártyán */}
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-medium bg-emerald-50/80 px-2 py-1 rounded-lg border border-emerald-200/60 mt-1.5">
                    <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span className="truncate font-semibold">
                      {timing.dateStr}
                      {timing.timeStr && ` ${timing.timeStr}`}
                      {timing.participantsStr && ` (${timing.participantsStr})`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Kiválasztott szál */}
          <div>
            {selectedOrder ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setSelectedOrderId(null)}
                  className="md:hidden flex items-center gap-1.5 text-sm font-bold text-stone-600 hover:text-stone-900 cursor-pointer mb-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Vissza a listához
                </button>

                {/* Kiválasztott beszélgetés fejléc és foglalt időpont kártya */}
                <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                      <span>{buyerInfos[selectedOrder.id]?.name || 'Igénybevevő'}</span>
                    </h3>
                    <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 shrink-0">
                      #{getBookingReference(selectedOrder)}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-stone-700">{selectedProgram?.title || 'Program'}</p>

                  {/* Foglalt időpont információ a kiválasztott szál fejlécében */}
                  {selectedTiming && (
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-emerald-900 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Foglalt időpont: {selectedTiming.dateStr}</span>
                      </div>
                      {selectedTiming.timeStr && (
                        <div className="flex items-center gap-1 border-l border-emerald-200 pl-2">
                          <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{selectedTiming.timeStr}</span>
                        </div>
                      )}
                      {selectedTiming.participantsStr && (
                        <div className="flex items-center gap-1 border-l border-emerald-200 pl-2">
                          <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{selectedTiming.participantsStr}</span>
                        </div>
                      )}
                    </div>
                  )}
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
              <div className="hidden md:flex items-center justify-center h-full min-h-[20rem] bg-white rounded-2xl border border-stone-200 text-stone-400 text-sm p-6 text-center">
                Válassz egy beszélgetést a bal oldali listából
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
