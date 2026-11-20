import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured, extractFunctionErrorMessage } from '../lib/supabase';
import { BookingMessage, BookingMessageSenderRole } from '../types/database';

export function isBookingMessageWriteWindowOpen(effectiveEventDate?: string | null): boolean {
  if (!effectiveEventDate) return true;
  const eventDate = new Date(`${effectiveEventDate}T00:00:00`);
  if (Number.isNaN(eventDate.getTime())) return true;
  const cutoff = new Date(eventDate);
  cutoff.setDate(cutoff.getDate() + 2);
  return new Date() < cutoff;
}

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

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!orderId || !senderRole || !senderId || !content.trim()) return false;
      setSending(true);
      setError(null);
      try {
        // Gemini-alapu gyuloletbeszed-eloszures az edge function-ben FUT LE
        // ELOTTE (kanban 8d11173e) -- a booking_messages-nek mar nincs
        // kozvetlen authenticated INSERT RLS policy-ja, ez az egyetlen irasi ut.
        const { data, error: invokeErr } = await supabase.functions.invoke('submit-booking-message', {
          body: { order_id: orderId, sender_role: senderRole, content: content.trim() },
        });

        if (invokeErr) {
          setError(await extractFunctionErrorMessage(invokeErr, 'Üzenet küldése nem sikerült'));
          return false;
        }

        if (data?.message) {
          setMessages(prev => [...prev, data.message as BookingMessage]);
        }
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Üzenet küldése nem sikerült');
        return false;
      } finally {
        setSending(false);
      }
    },
    [orderId, senderRole, senderId]
  );

  return { messages, loading, error, sending, sendMessage };
}
