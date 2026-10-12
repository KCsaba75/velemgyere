import React, { useEffect, useState } from 'react';
import { useApp, formatPrice } from '../context/AppContext';
import {
  X,
  Ticket,
  Users,
  Calendar,
  MapPin,
  Clock,
  Wallet,
  Banknote,
  CreditCard,
  Building2,
  Phone,
  Mail,
  Globe,
  Star,
  CheckCircle2,
  ArrowRight,
  User,
  Check,
  XCircle,
  Navigation,
  Copy,
  Hash
} from 'lucide-react';
import { Order, OrderStatus, OrderProviderContact, OnsitePaymentMethod } from '../types/database';
import { ReviewModal } from './ReviewModal';

const PAYMENT_METHOD_LABEL: Record<OnsitePaymentMethod, string> = {
  cash: 'Készpénz',
  revolut: 'Revolut',
};

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Függőben (szolgáltatói visszaigazolásra vár)',
  confirmed: 'Megerősítve (szolgáltató visszaigazolta)',
  cancelled: 'Lemondva',
};

const ORDER_STATUS_CLASS: Record<OrderStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-stone-100 text-stone-500 border-stone-200',
};

interface BookingDetailModalProps {
  order: Order;
  onClose: () => void;
}

export const BookingDetailModal: React.FC<BookingDetailModalProps> = ({ order, onClose }) => {
  const {
    currentUser,
    programs,
    reviews,
    getUserReviewForOrder,
    cancelOrder,
    getProviderContactForOrder,
    openProgramDetail,
  } = useApp();

  const [contact, setContact] = useState<OrderProviderContact | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = () => {
    if (!order.id) return;
    navigator.clipboard?.writeText(order.id).then(() => {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }).catch(() => {});
  };

  const program = order.program || programs.find(p => p.id === order.program_id || p.slug === order.program_id);

  useEffect(() => {
    let cancelled = false;
    if (order.status === 'pending' || order.status === 'confirmed') {
      getProviderContactForOrder(order.id).then(c => {
        if (!cancelled) setContact(c);
      });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id, order.status]);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return iso;
    }
  };

  const existingReview = getUserReviewForOrder(order.id) || reviews.find(r =>
    (r.order_id === order.id || r.program_id === order.program_id) &&
    (r.user_id === currentUser?.id || r.user_id === currentUser?.user_id)
  );

  const coverImage = program?.images?.find(img => img.is_cover)?.image_url
    || program?.images?.[0]?.image_url
    || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80';

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Ticket className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-bold text-lg text-stone-900 leading-tight truncate">
                Foglalás részletei
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 mt-0.5">
                <span>{formatDate(order.created_at)}</span>
                <span className="text-stone-300">•</span>
                <span className="font-mono text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70">
                  #{order.id.slice(0, 12)}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Status & Booking ID */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <span className={`inline-block text-xs font-bold px-3 py-1.5 rounded-lg border ${ORDER_STATUS_CLASS[order.status]}`}>
              {ORDER_STATUS_LABEL[order.status]}
            </span>

            <button
              type="button"
              onClick={handleCopyId}
              title="Azonosító másolása a vágólapra"
              className="inline-flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/80 px-2.5 py-1.5 rounded-lg border border-stone-200 transition-colors cursor-pointer group"
            >
              <Hash className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-600 shrink-0" />
              <span className="font-mono text-[11px] font-bold text-stone-800">
                {order.id}
              </span>
              {copiedId ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-600 shrink-0 ml-1" />
              )}
              {copiedId && (
                <span className="text-[10px] font-bold text-emerald-700">Másolva!</span>
              )}
            </button>
          </div>

          {/* Booking data */}
          <div className="bg-stone-50 rounded-2xl border border-stone-200/80 p-4 space-y-2 text-sm text-stone-700">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-stone-400 shrink-0" />
              <span>{order.participants_count} fő</span>
            </div>
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-stone-400 shrink-0" />
              <span>
                Összesen: <strong className="text-stone-900">{formatPrice(order.total_price)} {order.currency === 'EUR' ? '€' : order.currency}</strong>
                {order.booking_fee > 0 && (
                  <span className="text-stone-500">
                    {' '}(online: {formatPrice(order.booking_fee)} € · helyszínen: {formatPrice(order.onsite_amount)} €)
                  </span>
                )}
              </span>
            </div>
            {order.onsite_payment_method && (
              <div className="flex items-center gap-2">
                {order.onsite_payment_method === 'revolut' ? <Wallet className="w-4 h-4 text-stone-400 shrink-0" /> : <Banknote className="w-4 h-4 text-stone-400 shrink-0" />}
                <span>Helyszíni fizetés módja: <strong className="text-stone-900">{PAYMENT_METHOD_LABEL[order.onsite_payment_method]}</strong></span>
              </div>
            )}
            {order.booking_fee > 0 && (
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="text-indigo-700 font-semibold">Kényelmi díj rendezve (Stripe)</span>
              </div>
            )}
          </div>

          {/* Contact blokk -- mar fizetes (pending) utan latszik, nem csak admin
              visszaigazolas (confirmed) utan, Csaba kerese (2026-10-11). Ket fel
              elerhetosege: igenybe vevo (a sajat profilod, nincs RLS-gat, csak a
              bejelentkezett sajat adatod) + szolgaltato (server-side RPC-vel gatolt). */}
          {(order.status === 'pending' || order.status === 'confirmed') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-1.5">
                <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Igénybe vevő
                </h4>
                <div className="text-xs text-stone-600 space-y-1.5">
                  <div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> <strong className="text-stone-800">{currentUser.name}</strong></div>
                  {currentUser.phone && (
                    <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> <strong className="text-stone-800">{currentUser.phone}</strong></div>
                  )}
                  <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> <strong className="text-stone-800">{currentUser.email}</strong></div>
                </div>
              </div>

              <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 space-y-1.5">
                <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
                  Szolgáltató
                </h4>
                {contact ? (
                  <div className="text-xs text-stone-600 space-y-1.5">
                    <div className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> <strong className="text-stone-800">{contact.contact_name}</strong></div>
                    <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> <strong className="text-stone-800">{contact.phone}</strong></div>
                    <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> <strong className="text-stone-800">{contact.email}</strong></div>
                    {contact.website && (
                      <div className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> <a href={contact.website} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline font-semibold">{contact.website}</a></div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400">Szolgáltató adatainak betöltése...</p>
                )}
              </div>
            </div>
          )}

          {/* Review / cancel actions */}
          {order.status !== 'cancelled' && (
            <div className="flex flex-wrap items-center gap-2">
              {existingReview ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Értékelve ({existingReview.rating}★)</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-colors cursor-pointer shadow-xs"
                >
                  <Star className="w-3.5 h-3.5 fill-white text-white" />
                  <span>⭐ Értékelés leadása</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => cancelOrder(order.id)}
                className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-rose-600 font-semibold px-3.5 py-2 rounded-xl border border-stone-200 hover:border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Foglalás lemondása
              </button>
            </div>
          )}

          {/* Lefoglalt program -- teljes informacio, nem csak mini-preview (Csaba
              kerese 2026-10-11: ne kelljen atkattintani a teljes adatlapra). */}
          {program && (
            <div className="pt-4 border-t border-stone-100 space-y-4">
              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                A lefoglalt program
              </h4>

              <div className="flex gap-3">
                <img
                  src={coverImage}
                  alt=""
                  className="w-16 h-16 rounded-xl object-cover shrink-0 border border-stone-200"
                />
                <div className="min-w-0 flex-1">
                  <h5 className="font-bold text-stone-900 text-sm leading-snug">{program.title}</h5>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-stone-500">
                    {program.event_date && (
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(program.event_date)}</span>
                    )}
                    {program.duration && (
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{program.duration}</span>
                    )}
                    {(program.start_time || program.end_time) && (
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{program.start_time} - {program.end_time}</span>
                    )}
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{program.max_participants ? `Max. ${program.max_participants} fő` : 'Kiscsoportos'}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {program.location && (
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <span className="text-[11px] font-bold text-stone-500 block mb-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" /> Program helyszíne</span>
                    <span className="font-semibold text-stone-900">{program.location}</span>
                  </div>
                )}
                {program.departure_location && (
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <span className="text-[11px] font-bold text-stone-500 block mb-0.5 flex items-center gap-1"><Navigation className="w-3 h-3" /> Indulás / találkozó</span>
                    <span className="font-semibold text-stone-900">{program.departure_location}</span>
                  </div>
                )}
              </div>

              <p className="text-xs sm:text-sm text-stone-600 whitespace-pre-line leading-relaxed">
                {program.description || program.short_description}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-100">
                  <h5 className="font-bold text-emerald-950 text-xs mb-1.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Mit tartalmaz az ár?
                  </h5>
                  <ul className="space-y-1 text-xs text-stone-700">
                    {program.included && program.included.length > 0 ? (
                      program.included.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-stone-500 italic">Nincs részletezve</li>
                    )}
                  </ul>
                </div>
                <div className="bg-rose-50/60 rounded-xl p-3 border border-rose-100">
                  <h5 className="font-bold text-rose-950 text-xs mb-1.5 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-rose-500" /> Mit nem tartalmaz?
                  </h5>
                  <ul className="space-y-1 text-xs text-stone-700">
                    {program.not_included && program.not_included.length > 0 ? (
                      program.not_included.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                          <span>{item}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-stone-500 italic">Minden lényeges költséget tartalmaz</li>
                    )}
                  </ul>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { onClose(); openProgramDetail(program.slug || program.id); }}
                className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Program adatlapjának megnyitása</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-stone-100 bg-stone-50/60 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>

      {reviewModalOpen && program && (
        <ReviewModal
          isOpen={true}
          onClose={() => setReviewModalOpen(false)}
          program={program}
          order={order}
          onSuccess={() => setReviewModalOpen(false)}
        />
      )}
    </>
  );
};
