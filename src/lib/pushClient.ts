import { UserAccount } from '../types';

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

    // 3. Fetch public VAPID key from server
    const res = await fetch('/api/push/vapid-public-key');
    if (!res.ok) {
      throw new Error('無法自伺服器獲取 VAPID 公鑰');
    }
    const { publicKey } = await res.json();
    if (!publicKey) {
      throw new Error('伺服器未回傳有效公鑰');
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

    // 6. Send subscription to server
    const subJSON = subscription.toJSON();
    const saveRes = await fetch('/api/push/subscribe', {
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

    if (!saveRes.ok) {
      const errData = await saveRes.json().catch(() => ({}));
      throw new Error(errData.message || '儲存推播金鑰至伺服器失敗');
    }

    console.log('[Push Client] ✅ Successfully registered push subscription to cloud server!');
    return {
      success: true,
      message: '✅ 雲端推播 Token 註冊成功！每日 08:00 伺服器將準時發送晨間通知。',
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
 * Trigger immediate test push from server
 */
export async function sendServerTestPush(
  currentUser?: UserAccount | null,
  scope: 'all' | 'own' = 'own'
): Promise<{ success: boolean; message: string; result?: any }> {
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

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err.message || '連接伺服器發送推播測試失敗'
    };
  }
}
