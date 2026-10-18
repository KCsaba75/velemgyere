import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { BookingMessage, BookingMessageSenderRole } from '../types/database';

// Kanban 2ffb61fa kiegeszites: ugyanaz a hatarido-logika mint a DB-oldali
// booking_message_write_window_open() (schema.sql) -- csak UX-cel (a composer
// korai letiltasa/magyarazata), a VALODI kikenyszerites a szerveren (RLS INSERT
// policy) tortenik, ez a fuggveny semmit nem biztosit onmagaban. Szandekosan a
// BONGESZO lokalis idejet hasznalja (nem Europe/Budapest-et, mint a DB) -- ez
// csak egy UX-kozelites, egy eltero idozonaju user legrosszabb esetben a hatar
// korul 1-2 oraval elterő (korabban/kesobb letiltott) composer-t lathat, a
// szerver dont a tenyleges iras-jogrol.
export function isBookingMessageWriteWindowOpen(effectiveEventDate?: string | null): boolean {
  if (!effectiveEventDate) return true;
  const eventDate = new Date(`${effectiveEventDate}T00:00:00`);
  if (Number.isNaN(eventDate.getTime())) return true;
  const cutoff = new Date(eventDate);
  cutoff.setDate(cutoff.getDate() + 2);
  return new Date() < cutoff;
}

// Kanban 2ffb61fa: egy foglalas (order_id) uzenetszalanak betoltese + Realtime
// kovetese + uj uzenet kuldese. A jogosultsagot a Supabase RLS donti el
// (can_access_booking_messages / INSERT policy, lasd schema.sql) -- ez a hook
// csak a sender_role/sender_id-t adja at, nem ellenorzi ujra kliens-oldalon.
export function useBookingMessages(
  orderId: string | null,
  senderRole: BookingMessageSenderRole | null,
  senderId: string | null
) {
  const [messages, setMessages] = useState<BookingMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!orderId || !isSupabaseConfigured) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    supabase
      .from('booking_messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) {
          setError(fetchError.message);
        } else {
          setMessages((data as BookingMessage[]) || []);
        }
        setLoading(false);
      });

    const channel = supabase
      .channel(`booking_messages:${orderId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'booking_messages', filter: `order_id=eq.${orderId}` },
        (payload) => {
          const incoming = payload.new as BookingMessage;
          setMessages(prev => (prev.some(m => m.id === incoming.id) ? prev : [...prev, incoming]));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const sendMessage = useCallback(async (content: string): Promise<{ success: boolean; message: string }> => {
    const trimmed = content.trim();
    if (!trimmed) {
      return { success: false, message: 'Az üzenet nem lehet üres.' };
    }
    if (!orderId || !senderRole || !senderId) {
      return { success: false, message: 'Nem lehet üzenetet küldeni ehhez a foglaláshoz.' };
    }
    setSending(true);
    const { data, error: insertError } = await supabase
      .from('booking_messages')
      .insert({ order_id: orderId, sender_role: senderRole, sender_id: senderId, content: trimmed })
      .select()
      .single();
    setSending(false);
    if (insertError) {
      return { success: false, message: insertError.message || 'Hiba történt az üzenet küldése közben.' };
    }
    const inserted = data as BookingMessage;
    setMessages(prev => (prev.some(m => m.id === inserted.id) ? prev : [...prev, inserted]));
    return { success: true, message: 'Elküldve.' };
  }, [orderId, senderRole, senderId]);

  return { messages, loading, error, sending, sendMessage };
}
