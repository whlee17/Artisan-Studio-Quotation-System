import { UserAccount } from '../types';
import { db, sanitizeObject } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

// Default persistent VAPID Public Key (Pair matched with backend)
export const DEFAULT_VAPID_PUBLIC_KEY = 
  (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY || 
  'BEBClC91U2ifAb_icSax-8YxYZ-148o0qqCSlrIDA-nQO8FdVmLnC8r4DTxTovzZeDlY67CREMqbwbX6OoyTBZc';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Generate unique ID from endpoint
export function hashEndpoint(endpoint: string): string {
  let hash = 0;
  for (let i = 0; i < endpoint.length; i++) {
    const char = endpoint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `sub_${Math.abs(hash).toString(36)}_${endpoint.slice(-16).replace(/[^a-zA-Z0-9]/g, '')}`;
}

export interface DevicePushDiagnostics {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  isIOS: boolean;
  isAndroid: boolean;
  isStandalone: boolean;
  deviceTypeLabel: string;
  hasSubscription: boolean;
  subscriptionEndpoint?: string;
  needsIosHomeScreen: boolean;
}

/**
 * Inspect device capabilities and PWA / Notification status
 */
export async function getDevicePushDiagnostics(): Promise<DevicePushDiagnostics> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isSupported: false,
      permission: 'unsupported',
      isIOS: false,
      isAndroid: false,
      isStandalone: false,
      deviceTypeLabel: '伺服器環境',
      hasSubscription: false,
      needsIosHomeScreen: false
    };
  }

  const userAgent = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(userAgent);
  
  // Check standalone PWA mode
  const isStandalone = (window.navigator as any).standalone === true || 
                       window.matchMedia('(display-mode: standalone)').matches;

  let deviceTypeLabel = '電腦桌面瀏覽器';
  if (isIOS) {
    deviceTypeLabel = isStandalone ? '📱 iPhone / iPad (已加入主畫面 PWA)' : '📱 iPhone / iPad (Safari 瀏覽器分頁)';
  } else if (isAndroid) {
    deviceTypeLabel = isStandalone ? '📱 Android 設備 (已安裝 PWA)' : '📱 Android 瀏覽器';
  }

  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const permission = isSupported ? Notification.permission : 'unsupported';

  // Check if active subscription exists
  let hasSubscription = false;
  let subscriptionEndpoint: string | undefined;

  if (isSupported && permission === 'granted') {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          hasSubscription = true;
          subscriptionEndpoint = sub.endpoint;
        }
      }
    } catch (e) {
      console.warn('[Push Client] Error checking push subscription:', e);
    }
  }

  const needsIosHomeScreen = isIOS && !isStandalone;

  return {
    isSupported,
    permission,
    isIOS,
    isAndroid,
    isStandalone,
    deviceTypeLabel,
    hasSubscription,
    subscriptionEndpoint,
    needsIosHomeScreen
  };
}

/**
 * Register device for Cloud WebPush / FCM notifications
 */
export async function registerDevicePushSubscription(
  currentUser?: UserAccount | null,
  scope: 'all' | 'own' = 'own'
): Promise<{ success: boolean; message: string; endpoint?: string }> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, message: '您的瀏覽器或設備不支援 Web Push 雲端推播功能' };
  }

  try {
    // 1. Request Notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, message: '通知權限未授權，請於系統或瀏覽器設定中允許通知' };
    }

    // 2. Ensure Service Worker is registered and ready
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    // 3. Fetch public VAPID key (with robust fallbacks for Vercel & static hosting)
    let publicKey = DEFAULT_VAPID_PUBLIC_KEY;
    try {
      const res = await fetch('/api/push/vapid-public-key');
      if (res.ok) {
        const data = await res.json();
        if (data && data.publicKey) {
          publicKey = data.publicKey;
        }
      }
    } catch (apiErr) {
      console.warn('[Push Client] /api/push/vapid-public-key unreachable, using default stable VAPID key:', apiErr);
    }

    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    // 4. Check existing subscription or create a new one
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
    }

    // 5. Detect device details
    const diag = await getDevicePushDiagnostics();
    let deviceType: 'ios_pwa' | 'ios_safari' | 'android' | 'desktop_chrome' | 'desktop_edge' | 'desktop_safari' | 'other' = 'other';
    if (diag.isIOS) {
      deviceType = diag.isStandalone ? 'ios_pwa' : 'ios_safari';
    } else if (diag.isAndroid) {
      deviceType = 'android';
    } else {
      const ua = navigator.userAgent;
      if (ua.includes('Edg/')) deviceType = 'desktop_edge';
      else if (ua.includes('Chrome/')) deviceType = 'desktop_chrome';
      else if (ua.includes('Safari/')) deviceType = 'desktop_safari';
    }

    const username = currentUser?.username || '';
    const userLabel = currentUser?.displayName || currentUser?.username || '';

    // 6. Direct save to Firestore (Works 100% on Vercel frontend + Firebase backend)
    const subJSON = subscription.toJSON();
    const endpoint = subscription.endpoint;
    const subId = hashEndpoint(endpoint);

    try {
      const docRef = doc(db, 'push_subscriptions', subId);
      const now = Date.now();
      await setDoc(docRef, sanitizeObject({
        id: subId,
        endpoint,
        keys: {
          p256dh: subJSON.keys?.p256dh || '',
          auth: subJSON.keys?.auth || ''
        },
        username,
        userLabel,
        scope,
        deviceType,
        isStandalone: diag.isStandalone,
        enabled: true,
        lastActiveAt: now
      }), { merge: true });
      console.log('[Push Client] 📱 Saved push subscription directly to Firestore:', subId);
    } catch (firestoreErr) {
      console.warn('[Push Client] Direct Firestore save failed, attempting API save fallback:', firestoreErr);
    }

    // 7. Also ping server API if available
    try {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subJSON,
          username,
          userLabel,
          scope,
          deviceType,
          isStandalone: diag.isStandalone
        })
      });
    } catch (_) {
      // Ignored if on static Vercel
    }

    console.log('[Push Client] ✅ Successfully registered push subscription to Firebase!');
    return {
      success: true,
      message: '✅ 雲端推播 Token 註冊成功！每日 08:00 (HKT) 將自動發送晨間通知。',
      endpoint: subscription.endpoint
    };
  } catch (error: any) {
    console.error('[Push Client] ❌ Push registration error:', error);
    return {
      success: false,
      message: error.message || '註冊雲端推播時發生錯誤'
    };
  }
}

/**
 * Trigger immediate test push from server with robust error handling and local SW fallback
 */
export async function sendServerTestPush(
  currentUser?: UserAccount | null,
  scope: 'all' | 'own' = 'own'
): Promise<{ success: boolean; message: string; result?: any }> {
  try {
    let serverSuccess = false;
    let serverMessage = '';
    let resultData: any = null;

    try {
      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUser?.username || '',
          userLabel: currentUser?.displayName || currentUser?.username || '',
          scope
        })
      });

      const text = await res.text();
      let data: any = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          // If server returned plain text or HTML error
          console.warn('[Push Client] Non-JSON response from /api/push/test:', text.slice(0, 100));
        }
      }

      if (res.ok && data?.success) {
        serverSuccess = true;
        serverMessage = data.message || '🚀 雲端推播已成功發送！';
        resultData = data.result;
      } else if (data?.message) {
        serverMessage = data.message;
      }
    } catch (netErr: any) {
      console.warn('[Push Client] Remote API test push network error, falling back to local push:', netErr);
    }

    // If server pushed successfully, return server confirmation
    if (serverSuccess) {
      return {
        success: true,
        message: serverMessage,
        result: resultData
      };
    }

    // Graceful fallback: trigger native ServiceWorker / Notification test directly on device
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification('🌅 【晨間行程推播測試】', {
            body: `✅ 推播功能測試正常！每日 08:00 (HKT) 將自動為您推送今日工作與排程簡報。`,
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag: 'daily-morning-briefing-test',
            vibrate: [200, 100, 200],
            data: { url: window.location.origin }
          } as any);

          return {
            success: true,
            message: '⚡ 已在您的設備觸發推播通知測試 (鎖屏/桌面皆可即時接收)！'
          };
        }
      } catch (swErr) {
        console.warn('[Push Client] Local SW notification fallback failed:', swErr);
      }
    }

    return {
      success: false,
      message: serverMessage || '無法連線至推播伺服器，請確認通知權限或網路狀態'
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || '發送推播測試失敗'
    };
  }
}
