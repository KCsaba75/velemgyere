import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Bell, MessageSquare, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import { useApp, getBookingReference } from '../context/AppContext';
import { Order } from '../types/database';

interface NotificationBellProps {
  onSelectOrder: (order: Order) => void;
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  onSelectOrder,
  className = ''
}) => {
  const {
    isAuthenticated,
    currentUser,
    orders,
    programs,
    unreadBookingMessageCounts,
    totalUnreadBookingMessageCount,
    openLoginModal,
    setCurrentView
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // List of orders that have unread messages
  const unreadOrders = useMemo(() => {
    if (!isAuthenticated || !orders || orders.length === 0) return [];
    return orders
      .filter((o) => (unreadBookingMessageCounts[o.id] || 0) > 0)
      .map((o) => {
        const prog = o.program || programs.find((p) => p.id === o.program_id || p.slug === o.program_id);
        const unreadCount = unreadBookingMessageCounts[o.id] || 0;
        return {
          order: o,
          program: prog,
          unreadCount,
        };
      });
  }, [isAuthenticated, orders, programs, unreadBookingMessageCounts]);

  const handleOrderClick = (order: Order) => {
    setIsOpen(false);
    onSelectOrder(order);
  };

  const handleNavigateToAll = () => {
    setIsOpen(false);
    if (!isAuthenticated) {
      openLoginModal(undefined, 'bookings');
      return;
    }
    if (currentUser?.role === 'provider') {
      setCurrentView('provider-dashboard');
    } else {
      setCurrentView('bookings');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
          isOpen
            ? 'bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20'
            : totalUnreadBookingMessageCount > 0
            ? 'text-stone-800 bg-stone-100/90 hover:bg-stone-200/80'
            : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
        }`}
        title="Értesítések – Szolgáltatói üzenetek"
        aria-label={`Értesítések (${totalUnreadBookingMessageCount} új üzenet)`}
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5 transition-transform group-hover:scale-105" />

        {totalUnreadBookingMessageCount > 0 && (
          <>
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center px-1 leading-none shadow-xs border-2 border-white">
              {totalUnreadBookingMessageCount > 9 ? '9+' : totalUnreadBookingMessageCount}
            </span>
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-rose-400 opacity-60 animate-ping pointer-events-none" />
          </>
        )}
      </button>

      {/* Notification Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-stone-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-stone-100 flex items-center justify-between bg-stone-50/80">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-stone-900">Értesítések</h3>
            </div>
            {totalUnreadBookingMessageCount > 0 ? (
              <span className="text-[11px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                {totalUnreadBookingMessageCount} új üzenet
              </span>
            ) : (
              <span className="text-[11px] text-stone-400 font-medium">Nincs új üzenet</span>
            )}
          </div>

          {/* List content */}
          <div className="max-h-[340px] overflow-y-auto divide-y divide-stone-100">
            {!isAuthenticated ? (
              <div className="p-6 text-center space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">Lépj be a fiókodba!</h4>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                    A helyfoglalásaidhoz érkező szolgáltatói üzenetek megtekintéséhez kérjük, jelentkezz be.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    openLoginModal('A szolgáltatói üzenetek eléréséhez jelentkezz be!', 'bookings');
                  }}
                  className="w-full py-2.5 px-4 bg-stone-900 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                >
                  Bejelentkezés vagy Regisztráció
                </button>
              </div>
            ) : unreadOrders.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <h4 className="font-bold text-stone-900 text-sm">Minden üzenetet elolvastál</h4>
                <p className="text-xs text-stone-500 leading-relaxed max-w-xs mx-auto">
                  Ha valamelyik túraszervező partner üzenetet küld egy meglévő foglalásodhoz, itt azonnal látni fogod.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleNavigateToAll}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                  >
                    Foglalásaim áttekintése
                  </button>
                </div>
              </div>
            ) : (
              unreadOrders.map(({ order, program, unreadCount }) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => handleOrderClick(order)}
                  className="w-full text-left p-3.5 hover:bg-emerald-50/50 transition-colors flex items-start gap-3 cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform shadow-xs">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-mono text-[10px] font-bold text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
                        #{getBookingReference(order)}
                      </span>
                      <span className="text-[10px] font-extrabold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full">
                        {unreadCount} új üzenet
                      </span>
                    </div>
                    <p className="text-xs font-bold text-stone-900 truncate">
                      {program?.title || 'Program foglalás'}
                    </p>
                    <p className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
                      <span>Kattints az üzenet megnyitásához</span>
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer action */}
          {isAuthenticated && (
            <div className="p-2.5 bg-stone-50 border-t border-stone-100 flex items-center justify-center">
              <button
                type="button"
                onClick={handleNavigateToAll}
                className="w-full text-center py-1.5 text-xs font-bold text-stone-700 hover:text-emerald-700 transition-colors cursor-pointer"
              >
                {currentUser?.role === 'provider'
                  ? 'Ugrás a partneri üzenetekhez →'
                  : 'Összes foglalásom megnyitása →'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
