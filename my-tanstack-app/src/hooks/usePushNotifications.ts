import { useState, useEffect } from 'react';
import { useConvexAuth, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function subscriptionToSaveArgs(subscription: PushSubscription) {
  const p256dh = subscription.getKey('p256dh');
  const auth = subscription.getKey('auth');
  if (!p256dh || !auth) return null;
  return {
    endpoint: subscription.endpoint,
    p256dh: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(p256dh)))),
    auth: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(auth)))),
  };
}

// Device-level flag set when the user deliberately turns push off via the
// toggle. Distinguishes "opted out" from "subscription lost" (e.g. the SW was
// unregistered by an older stale-chunk recovery), since both leave
// permission === 'granted' with no subscription.
const PUSH_OPTED_OUT_KEY = 'buildsync:push-opted-out';
// Stores the timestamp until which the re-enable banner stays hidden.
const PUSH_REENABLE_SNOOZE_KEY = 'buildsync:push-reenable-snoozed-until';
const PUSH_REENABLE_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;

function isReenableSnoozed() {
  try {
    return Date.now() < Number(localStorage.getItem(PUSH_REENABLE_SNOOZE_KEY) || '0');
  } catch {
    return false;
  }
}

function readFlag(key: string) {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key: string, on: boolean) {
  try {
    if (on) localStorage.setItem(key, '1');
    else localStorage.removeItem(key);
  } catch {}
}

function subscribeRegistration(registration: ServiceWorkerRegistration) {
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
}

const PUSH_PROMO_SNOOZE_KEY = 'buildsync:push-promo-snoozed-until';

function isPromoSnoozed() {
  try {
    return Date.now() < Number(localStorage.getItem(PUSH_PROMO_SNOOZE_KEY) || '0');
  } catch {
    return false;
  }
}

/**
 * Re-claims this browser's push subscription for the currently logged-in user.
 * Without this, on a shared device the subscription stays tied to whoever
 * enabled it first, and their notifications keep arriving after they log out.
 * Mount once at the app root, inside ConvexAuthProvider.
 *
 * Also recovers subscriptions that were lost while permission is still
 * granted: tries to re-subscribe silently, and if the browser requires a user
 * gesture (iOS), returns `needsReenable` so the caller can show a prompt.
 */
export function usePushSubscriptionSync() {
  const { isAuthenticated } = useConvexAuth();
  const saveSubscription = useMutation(api.push.saveSubscription);
  const removeSubscription = useMutation(api.push.removeSubscription);
  
  const [needsReenable, setNeedsReenable] = useState(false);
  const [needsPromo, setNeedsPromo] = useState(false);

  // Sync existing subscription or ask for re-enable
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    navigator.serviceWorker
      .getRegistration('/sw.js')
      .then(async (existing) => {
        const registration = existing ?? (await navigator.serviceWorker.register('/sw.js'));
        const subscription = await registration.pushManager.getSubscription();

        if (Notification.permission === 'denied' && subscription) {
          try {
            await removeSubscription({ endpoint: subscription.endpoint });
            await subscription.unsubscribe();
          } catch (e) {}
          return;
        }

        if (!subscription) {
          if (Notification.permission !== 'granted' || readFlag(PUSH_OPTED_OUT_KEY)) return;
          try {
            await navigator.serviceWorker.ready;
            const restored = await subscribeRegistration(registration);
            const args = subscriptionToSaveArgs(restored);
            if (args) await saveSubscription(args);
          } catch (e) {
            if (!isReenableSnoozed()) setNeedsReenable(true);
          }
          return;
        }
        
        const args = subscriptionToSaveArgs(subscription);
        if (args) return saveSubscription(args);
      })
      .catch(() => {});
  }, [isAuthenticated, saveSubscription, removeSubscription]);

  // Handle Promo logic for new users
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission !== 'default') return;
    if (isPromoSnoozed()) return;

    const timer = setTimeout(() => {
      setNeedsPromo(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  const reenable = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await subscribeRegistration(registration);
      const args = subscriptionToSaveArgs(subscription);
      if (args) await saveSubscription(args);
      setNeedsReenable(false);
    } catch (e) {}
  };

  const promoSubscribe = async () => {
    try {
      const permissionResult = await Notification.requestPermission();
      if (permissionResult === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await subscribeRegistration(registration);
        const args = subscriptionToSaveArgs(subscription);
        if (args) await saveSubscription(args);
        writeFlag(PUSH_OPTED_OUT_KEY, false);
      }
    } catch (e) {}
    setNeedsPromo(false);
  };

  const dismiss = () => {
    try {
      localStorage.setItem(PUSH_REENABLE_SNOOZE_KEY, String(Date.now() + PUSH_REENABLE_SNOOZE_MS));
    } catch {}
    setNeedsReenable(false);
  };

  const dismissPromo = () => {
    try {
      localStorage.setItem(PUSH_PROMO_SNOOZE_KEY, String(Date.now() + PUSH_REENABLE_SNOOZE_MS));
    } catch {}
    setNeedsPromo(false);
  };

  return { needsReenable, reenable, dismiss, needsPromo, promoSubscribe, dismissPromo };
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const saveSubscription = useMutation(api.push.saveSubscription);
  const removeSubscription = useMutation(api.push.removeSubscription);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      
      navigator.serviceWorker.register('/sw.js').then(registration => {
        registration.pushManager.getSubscription().then(subscription => {
          setIsSubscribed(subscription !== null);
        });
      });
    }
  }, []);

  const subscribe = async () => {
    if (!isSupported) return;
    
    setIsLoading(true);
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      
      if (permissionResult !== 'granted') {
        throw new Error('Permission not granted for Notification');
      }

      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await subscribeRegistration(registration);

      const args = subscriptionToSaveArgs(subscription);
      if (!args) {
        throw new Error('Push keys missing');
      }

      await saveSubscription(args);

      writeFlag(PUSH_OPTED_OUT_KEY, false);
      setIsSubscribed(true);
    } catch (err) {
      console.error('Failed to subscribe to push notifications', err);
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!isSupported) return;
    
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await removeSubscription({ endpoint: subscription.endpoint });
        await subscription.unsubscribe();
        writeFlag(PUSH_OPTED_OUT_KEY, true);
        setIsSubscribed(false);
      }
    } catch (err) {
      console.error('Failed to unsubscribe', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  };
}
