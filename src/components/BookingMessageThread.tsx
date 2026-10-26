import React, { useState, useEffect } from 'react';
import { useBookingMessages } from '../hooks/useBookingMessages';
import { useApp } from '../context/AppContext';
import { BookingMessageSenderRole } from '../types/database';
import { Send, MessageSquare, Loader2 } from 'lucide-react';

interface BookingMessageThreadProps {
  orderId: string;
  senderRole: BookingMessageSenderRole;
  senderId: string;
  otherPartyLabel: string;
  canSend: boolean;
  compact?: boolean;
}

export const BookingMessageThread: React.FC<BookingMessageThreadProps> = ({
  orderId,
  senderRole,
  senderId,
  otherPartyLabel,
  canSend,
  compact = false,
}) => {
  const { markBookingThreadRead, registerActiveMessageThread, unregisterActiveMessageThread } = useApp();
  const { messages, loading, sending, sendMessage } = useBookingMessages(
    orderId,
    senderRole,
    senderId
  );
  const [inputText, setInputText] = useState('');

  // Register active thread and mark read upon viewing
  useEffect(() => {
    if (!orderId) return;
    registerActiveMessageThread(orderId);
    markBookingThreadRead(orderId);

    return () => {
      unregisterActiveMessageThread(orderId);
    };
  }, [orderId, markBookingThreadRead, registerActiveMessageThread, unregisterActiveMessageThread]);

  // Mark read when messages update while thread is open
  useEffect(() => {
    if (orderId && messages.length > 0) {
      markBookingThreadRead(orderId);
    }
  }, [orderId, messages.length, markBookingThreadRead]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending || !canSend) return;
    const ok = await sendMessage(inputText.trim());
    if (ok) setInputText('');
  };

  return (
    <div className={`flex flex-col bg-stone-50 rounded-2xl border border-stone-200 overflow-hidden ${compact ? 'p-3 text-xs' : 'p-4 text-sm'}`}>
      <div className="flex items-center gap-2 pb-2 mb-3 border-b border-stone-200 font-bold text-stone-700">
        <MessageSquare className="w-4 h-4 text-emerald-600" />
        <span>Üzenetek ({otherPartyLabel})</span>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto mb-3 pr-1">
        {loading ? (
          <div className="flex items-center justify-center py-4 text-stone-400">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span>Üzenetek betöltése...</span>
          </div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-stone-400 italic text-center py-2">
            Még nem érkezett üzenet ehhez a foglaláshoz.
          </p>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_role === senderRole;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs ${
                    isMe
                      ? 'bg-emerald-700 text-white rounded-br-none'
                      : 'bg-white text-stone-800 border border-stone-200 shadow-2xs rounded-bl-none'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-stone-400 mt-0.5 px-1">
                  {new Date(msg.created_at).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
      </div>

      {canSend ? (
        <form onSubmit={handleSend} className="flex gap-2 pt-2 border-t border-stone-200/80">
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Írj üzenetet..."
            className="flex-1 bg-white border border-stone-300 rounded-xl px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={sending || !inputText.trim()}
            className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </form>
      ) : (
        <p className="text-[11px] text-stone-500 italic text-center pt-2 border-t border-stone-200">
          Az üzenetküldési ablak lezárult a program időpontját követő 2 nap után.
        </p>
      )}
    </div>
  );
};
