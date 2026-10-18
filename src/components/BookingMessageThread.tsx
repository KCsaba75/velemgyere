import React, { useEffect, useRef, useState } from 'react';
import { Send, MessageSquare, Loader2 } from 'lucide-react';
import { useBookingMessages } from '../hooks/useBookingMessages';
import { useApp } from '../context/AppContext';
import { BookingMessageSenderRole } from '../types/database';

interface BookingMessageThreadProps {
  orderId: string;
  senderRole: BookingMessageSenderRole;
  senderId: string;
  otherPartyLabel: string;
  // ProviderMessagesPage-en teljes magassagu panel, BookingDetailModal-ban
  // beagyazott, korlatozott-magassagu szekcio -- ugyanaz a komponens, csak a
  // listaresz max-height-je ter el.
  compact?: boolean;
  // Kanban 2ffb61fa kiegeszites: a program/foglalas utolso napja + 1 nap vege
  // utan a szal UX-szinten is read-only (a tenyleges kikenyszerites a szerver-
  // oldali RLS-ben van, lasd isBookingMessageWriteWindowOpen).
  canSend?: boolean;
}

export const BookingMessageThread: React.FC<BookingMessageThreadProps> = ({
  orderId,
  senderRole,
  senderId,
  otherPartyLabel,
  compact = false,
  canSend = true,
}) => {
  const { messages, loading, error, sending, sendMessage } = useBookingMessages(orderId, senderRole, senderId);
  const { markBookingThreadRead, registerActiveMessageThread, unregisterActiveMessageThread } = useApp();
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Kanban 4fe242f2: amig ez a szal nyitva van, az olvasatlan-szamlalo globalis
  // realtime-feliratkozasa nem szamolja fel erre a szalra erkezo uzenetet --
  // helyette itt, kozvetlenul markeljuk olvasottra (megnyitaskor ES minden uj
  // uzenetnel, amig a szal nyitva marad).
  useEffect(() => {
    registerActiveMessageThread(orderId);
    return () => unregisterActiveMessageThread(orderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    markBookingThreadRead(orderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || sending || !canSend) return;
    const res = await sendMessage(draft);
    if (res.success) {
      setDraft('');
      setSendError(null);
    } else {
      setSendError(res.message);
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="flex flex-col border border-stone-200 rounded-2xl overflow-hidden bg-stone-50">
      <div
        ref={listRef}
        className={`overflow-y-auto p-3 sm:p-4 space-y-2.5 ${compact ? 'max-h-64' : 'max-h-[50vh] min-h-[16rem]'}`}
      >
        {loading ? (
          <div className="flex items-center justify-center py-8 text-stone-400 text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Üzenetek betöltése...
          </div>
        ) : error ? (
          <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">
            Nem sikerült betölteni az üzeneteket: {error}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-stone-400 gap-2">
            <MessageSquare className="w-6 h-6" />
            <p className="text-xs">Még nincs üzenet ebben a szálban -- írj {otherPartyLabel.toLowerCase()}nak!</p>
          </div>
        ) : (
          messages.map((m) => {
            const isOwn = m.sender_role === senderRole;
            return (
              <div key={m.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
                    isOwn
                      ? 'bg-emerald-600 text-white rounded-br-sm'
                      : 'bg-white text-stone-800 border border-stone-200 rounded-bl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <p className={`text-[10px] mt-1 ${isOwn ? 'text-emerald-100' : 'text-stone-400'}`}>
                    {formatTime(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {canSend ? (
        <form onSubmit={handleSend} className="flex items-end gap-2 p-2.5 border-t border-stone-200 bg-white">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder={`Írj üzenetet ${otherPartyLabel.toLowerCase()}nak...`}
            rows={1}
            maxLength={4000}
            className="flex-1 resize-none text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 max-h-28"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="shrink-0 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2.5 rounded-xl shadow-sm transition-colors cursor-pointer"
            title="Küldés"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      ) : (
        <div className="p-3 border-t border-stone-200 bg-stone-100 text-xs text-stone-500 text-center">
          Ez a szál lezárult -- a program napja után csak egy napig lehet üzenetet küldeni, de a korábbi üzenetek továbbra is olvashatók.
        </div>
      )}
      {sendError && (
        <div className="px-3 pb-2.5 -mt-1 text-xs text-rose-600">{sendError}</div>
      )}
    </div>
  );
};
