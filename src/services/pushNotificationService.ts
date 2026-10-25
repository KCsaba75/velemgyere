import { supabase } from '../lib/supabase';

// VAPID public key -- safe to ship to the browser (this is what Web Push is
// designed for), dev-project value. See public/sw.js for the push handler.
const VAPID_PUBLIC_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_VAPID_PUBLIC_KEY) || '';

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(userId: string): Promise<{ success: boolean; message: string }> {
  if (!isPushSupported()) {
    return { success: false, message: 'A böngésződ nem támogatja a push-értesítéseket.' };
  }
  if (!VAPID_PUBLIC_KEY) {
    return { success: false, message: 'A push-értesítés jelenleg nincs konfigurálva.' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { success: false, message: 'Az értesítési engedélyt nem adtad meg a böngészőben.' };
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
  });

  const keys = subscription.toJSON().keys;
  if (!keys?.p256dh || !keys?.auth) {
    return { success: false, message: 'A feliratkozás nem adott vissza érvényes kulcsokat.' };
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: keys.p256dh,
      auth_key: keys.auth,
    },
    { onConflict: 'endpoint' }
  );

  if (error) {
    return { success: false, message: `Feliratkozás mentése sikertelen: ${error.message}` };
  }

  return { success: true, message: 'Böngésző-értesítések bekapcsolva.' };
}

export async function unsubscribeFromPush(): Promise<{ success: boolean; message: string }> {
  if (!isPushSupported()) {
    return { success: true, message: 'Böngésző-értesítések kikapcsolva.' };
  }

  const registration = await navigator.serviceWorker.getRegistration('/sw.js');
  const subscription = await registration?.pushManager.getSubscription();

  if (subscription) {
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  }

  return { success: true, message: 'Böngésző-értesítések kikapcsolva.' };
}
