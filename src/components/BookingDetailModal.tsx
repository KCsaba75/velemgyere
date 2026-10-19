import React, { useEffect, useState } from 'react';
import { useApp, formatPrice, getBookingReference } from '../context/AppContext';
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
  Hash,
  CalendarDays,
  Download,
  Printer,
  Landmark,
  MessageSquare
} from 'lucide-react';
import { Order, OrderStatus, OrderProviderContact, OnsitePaymentMethod } from '../types/database';
import { ReviewModal } from './ReviewModal';
import { BookingVoucher } from './BookingVoucher';
import { BookingMessageThread } from './BookingMessageThread';
import { isBookingMessageWriteWindowOpen } from '../hooks/useBookingMessages';
import { buildCalendarEventPayload, openGoogleCalendar, downloadIcsFile } from '../services/googleCalendarService';

const PAYMENT_METHOD_LABEL: Record<OnsitePaymentMethod, string> = {
  cash: 'Készpénz',
  revolut: 'Revolut',
  bank_transfer: 'Előre utalás',
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
    currentProvider,
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
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);

  const bookingCode = getBookingReference(order);
  const formattedBookingId = `#${bookingCode}`;

  const handleCopyId = () => {
    if (!bookingCode) return;
    navigator.clipboard?.writeText(bookingCode).then(() => {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }).catch(() => {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    });
  };

  const program = order.program || programs.find(p => p.id === order.program_id || p.slug === order.program_id);

  // Kanban 2ffb61fa: a szerepkort NEM a profil role-jabol (admin sosem igazi
  // fel), hanem a rendeles tenyleges tulajdonlasabol allapitjuk meg -- ez a
  // modal mindket oldalrol (BookingsView=igenybevevo, ProviderBookingsPage=
  // szolgaltato) ugyanazzal a komponenssel nyilik meg.
  const isProviderViewer = !!(currentProvider && program && currentProvider.id === program.provider_id);
  const isCustomerViewer = !isProviderViewer && !!(currentUser?.user_id && order.user_id === currentUser.user_id);
  const canMessage = (isProviderViewer || isCustomerViewer) && !!order.user_id && !order.is_manual;

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
                <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  {formattedBookingId}
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
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-block text-xs font-bold px-3 py-1.5 rounded-lg border ${ORDER_STATUS_CLASS[order.status]}`}>
                {ORDER_STATUS_LABEL[order.status]}
              </span>

              {order.source && order.source !== 'platform' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border bg-blue-50 text-blue-800 border-blue-200">
                  {order.source === 'phone' && '📞 Telefonos foglalás'}
                  {order.source === 'whatsapp' && '💬 WhatsApp foglalás'}
                  {order.source === 'onsite' && '🤝 Személyes / Helyszíni'}
                  {order.source === 'email' && '✉️ E-mail foglalás'}
                  {order.source === 'external' && '📝 Külső partner'}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopyId}
              title="Foglalási azonosító másolása a vágólapra"
              className="inline-flex items-center gap-1.5 text-xs text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/80 px-3 py-1.5 rounded-lg border border-stone-200 transition-colors cursor-pointer group shadow-xs"
            >
              <Hash className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-600 shrink-0" />
              <span className="font-mono text-xs font-bold text-stone-900">
                {bookingCode}
              </span>
              {copiedId ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-600 shrink-0 ml-1" />
              )}
              {copiedId && (
                <span className="text-[10px] font-bold text-emerald-700 ml-0.5">Másolva!</span>
              )}
            </button>
          </div>

          {/* Google Naptár és .ICS mentés kártya */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/90 to-indigo-50/70 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs shrink-0">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <h5 className="font-bold text-xs sm:text-sm text-stone-900">Naptár szinkronizáció</h5>
                <p className="text-[11px] text-stone-500">Mentsd el egy kattintással az emlékeztetőket és időpontot</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const payload = buildCalendarEventPayload(
                    order,
                    program,
                    undefined,
                    contact,
                    order.manual_customer_name ? { name: order.manual_customer_name, email: order.manual_customer_email || '' } : null,
                    { isProvider: currentUser?.role === 'provider' }
                  );
                  openGoogleCalendar(payload);
                }}
                className="flex-1 sm:flex-none px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Hozzáadás Google Naptárhoz"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Google Naptár</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const payload = buildCalendarEventPayload(
                    order,
                    program,
                    undefined,
                    contact,
                    order.manual_customer_name ? { name: order.manual_customer_name, email: order.manual_customer_email || '' } : null,
                    { isProvider: currentUser?.role === 'provider' }
                  );
                  downloadIcsFile(payload);
                }}
                className="flex-1 sm:flex-none px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title=".ICS naptárfájl letöltése (Apple Naptár, Outlook, mobil)"
              >
                <Download className="w-3.5 h-3.5 text-stone-500" />
                <span>.ICS fájl</span>
              </button>
            </div>
          </div>

          {/* Uzeneto -- kanban 2ffb61fa, csak a ket valodi felnek (lasd canMessage) */}
          {canMessage && (
            <div className="rounded-2xl border border-emerald-200/80 overflow-hidden">
              <button
                type="button"
                onClick={() => setMessagesOpen(prev => !prev)}
                className="w-full flex items-center justify-between gap-3 p-3.5 bg-emerald-50/70 hover:bg-emerald-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs shrink-0">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h5 className="font-bold text-xs sm:text-sm text-stone-900">
                      Üzenet {isProviderViewer ? 'az igénybevevőnek' : 'a szolgáltatónak'}
                    </h5>
                    <p className="text-[11px] text-stone-500">
                      {messagesOpen ? 'Bezárás' : 'Közvetlen üzenetküldés a foglaláshoz'}
                    </p>
                  </div>
                </div>
              </button>
              {messagesOpen && (
                <div className="p-3">
                  <BookingMessageThread
                    orderId={order.id}
                    senderRole={isProviderViewer ? 'provider' : 'customer'}
                    senderId={currentUser.user_id}
                    otherPartyLabel={isProviderViewer ? 'az igénybevevőnek' : 'a szolgáltatónak'}
                    canSend={isBookingMessageWriteWindowOpen(order.event_date || order.occurrence?.event_date || program?.event_date)}
                    compact
                  />
                </div>
              )}
            </div>
          )}

          {/* Booking data */}
          <div className="bg-stone-50 rounded-2xl border border-stone-200/80 p-4 space-y-2 text-sm text-stone-700">
            <div className="flex items-center justify-between pb-2 mb-1 border-b border-stone-200/70 text-xs">
              <span className="text-stone-500 font-medium">Foglalási azonosító:</span>
              <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {formattedBookingId}
              </span>
            </div>
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
                {order.onsite_payment_method === 'revolut' ? (
                  <Wallet className="w-4 h-4 text-stone-400 shrink-0" />
                ) : order.onsite_payment_method === 'bank_transfer' ? (
                  <Landmark className="w-4 h-4 text-stone-400 shrink-0" />
                ) : (
                  <Banknote className="w-4 h-4 text-stone-400 shrink-0" />
                )}
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
                <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Igénybe vevő</span>
                  {order.is_manual && (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded">
                      Külső vendég
                    </span>
                  )}
                </h4>
                <div className="text-xs text-stone-600 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-stone-400" />
                    <strong className="text-stone-800">
                      {order.manual_customer_name || currentUser.name}
                    </strong>
                  </div>
                  {(order.manual_customer_phone || currentUser.phone) && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <strong className="text-stone-800">
                        {order.manual_customer_phone || currentUser.phone}
                      </strong>
                    </div>
                  )}
                  {(order.manual_customer_email || currentUser.email) && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                      <strong className="text-stone-800">
                        {order.manual_customer_email || currentUser.email}
                      </strong>
                    </div>
                  )}
                  {order.source_notes && (
                    <div className="mt-2 pt-1.5 border-t border-stone-200/80 text-[11px] text-amber-900 bg-amber-50/60 p-2 rounded-lg">
                      <strong>Belső megjegyzés:</strong> {order.source_notes}
                    </div>
                  )}
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
                onClick={() => setConfirmCancelOpen(true)}
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
                  loading="lazy"
                  className="w-16 h-16 rounded-xl object-cover shrink-0 border border-stone-200"
                />
                <div className="min-w-0 flex-1">
                  <h5 className="font-bold text-stone-900 text-sm leading-snug">{program.title}</h5>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-stone-500">
                    {(order.event_date || order.occurrence?.event_date || program.event_date) && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(order.event_date || order.occurrence?.event_date || program.event_date!)}
                      </span>
                    )}
                    {program.duration && (
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{program.duration}</span>
                    )}
                    {(order.start_time || order.occurrence?.start_time || program.start_time || program.end_time) && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {order.start_time || order.occurrence?.start_time || program.start_time}
                        {program.end_time ? ` - ${program.end_time}` : ''}
                      </span>
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
        <div className="p-4 sm:p-5 border-t border-stone-100 bg-stone-50/60 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2.5 border border-stone-300 text-stone-700 hover:bg-stone-100 font-bold rounded-xl text-xs sm:text-sm shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-stone-500" />
            <span>Nyomtatás / Mentés PDF-ként</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
          >
            Bezárás
          </button>
        </div>
      </div>

      {/* Nyomtathato utalvany (kanban f969f03f -> 757c1720, egy lapon TELJES
          adattartalommal): kepernyon rejtve, csak nyomtataskor (print:block +
          .print-voucher, lasd index.css @media print). */}
      <div className="hidden print:block print-voucher">
        <BookingVoucher
          bookingReference={bookingCode}
          statusLabel={ORDER_STATUS_LABEL[order.status]}
          bookerName={currentUser?.name}
          bookerEmail={currentUser?.email}
          bookerPhone={currentUser?.phone}
          programTitle={program?.title || 'Program'}
          programShortDescription={program?.short_description}
          programLocation={program?.location}
          programCountry={program?.country}
          programRegionName={program?.region?.name}
          programCategoryName={program?.category?.name}
          dateFormatted={formatDate(order.event_date || order.occurrence?.event_date || program?.event_date || order.created_at)}
          startTime={order.start_time || order.occurrence?.start_time || program?.start_time}
          endTime={program?.end_time}
          duration={program?.duration}
          departureLocation={program?.departure_location}
          participantsCount={order.participants_count}
          included={program?.included}
          notIncluded={program?.not_included}
          providerCompanyName={program?.provider?.company_name}
          providerDescription={program?.provider?.description}
          providerContactName={contact?.contact_name}
          providerPhone={contact?.phone}
          providerEmail={contact?.email}
          providerWebsite={contact?.website ?? undefined}
          bookingFeeFormatted={order.booking_fee > 0 ? `${formatPrice(order.booking_fee)} ${order.currency === 'EUR' ? '€' : order.currency}` : undefined}
          onsiteAmountFormatted={`${formatPrice(order.onsite_amount || order.total_price)} ${order.currency === 'EUR' ? '€' : order.currency}`}
          onsitePaymentMethodLabel={order.onsite_payment_method ? PAYMENT_METHOD_LABEL[order.onsite_payment_method] : undefined}
        />
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

      {confirmCancelOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-200 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-inner">
                <XCircle className="w-6 h-6 text-rose-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-lg text-stone-900 leading-snug">
                  Foglalás lemondása
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Biztosan lemondod ezt a foglalást? Ez a lépés nem vonható vissza.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmCancelOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-semibold transition-colors cursor-pointer"
              >
                Mégsem
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmCancelOpen(false);
                  cancelOrder(order.id);
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Lemondás</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
