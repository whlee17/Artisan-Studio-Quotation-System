import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import { db } from './firebase';
import { doc, getDoc, setDoc, getDocs, collection, deleteDoc } from 'firebase/firestore';
import { CalendarEvent } from '../types';
import { generateDailyMorningBriefing, getTodayDateString } from './calendarNotifications';

export interface StoredPushSubscription {
  id: string; // generated hash or doc id
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  username: string;
  userLabel: string;
  scope: 'all' | 'own';
  deviceType: 'ios_pwa' | 'ios_safari' | 'android' | 'desktop_chrome' | 'desktop_edge' | 'desktop_safari' | 'other';
  isStandalone: boolean;
  enabled: boolean;
  createdAt: number;
  lastActiveAt: number;
}

const VAPID_FILE = path.join(process.cwd(), 'vapid-keys.json');

// Initialize or load VAPID Keys
let vapidKeys: { publicKey: string; privateKey: string };

function initVapidKeys() {
  try {
    if (fs.existsSync(VAPID_FILE)) {
      const data = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf-8'));
      if (data.publicKey && data.privateKey) {
        vapidKeys = data;
      }
    }
  } catch (err) {
    console.warn('[Push Service] Could not read existing vapid-keys.json, generating new keys...', err);
  }

  if (!vapidKeys || !vapidKeys.publicKey || !vapidKeys.privateKey) {
    vapidKeys = webpush.generateVAPIDKeys();
    try {
      fs.writeFileSync(VAPID_FILE, JSON.stringify(vapidKeys, null, 2), 'utf-8');
      console.log('[Push Service] 🔑 Generated new persistent VAPID keys.');
    } catch (e) {
      console.error('[Push Service] Failed to save vapid-keys.json:', e);
    }
  }

  try {
    webpush.setVapidDetails(
      'mailto:whlee17@gmail.com',
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );
    console.log('[Push Service] ✅ WebPush VAPID configured successfully.');
  } catch (err) {
    console.error('[Push Service] Failed to set VAPID details:', err);
  }
}

initVapidKeys();

export function getVapidPublicKey(): string {
  if (!vapidKeys) {
    initVapidKeys();
  }
  return vapidKeys.publicKey;
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

/**
 * Save or update push subscription in Firestore
 */
export async function savePushSubscription(sub: {
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  username?: string;
  userLabel?: string;
  scope?: 'all' | 'own';
  deviceType?: StoredPushSubscription['deviceType'];
  isStandalone?: boolean;
}): Promise<StoredPushSubscription> {
  const endpoint = sub.subscription?.endpoint;
  if (!endpoint || !sub.subscription?.keys?.p256dh || !sub.subscription?.keys?.auth) {
    throw new Error('Invalid push subscription structure');
  }

  const subId = hashEndpoint(endpoint);
  const docRef = doc(db, 'push_subscriptions', subId);

  const existingSnap = await getDoc(docRef);
  const now = Date.now();

  const record: StoredPushSubscription = {
    id: subId,
    endpoint,
    keys: {
      p256dh: sub.subscription.keys.p256dh,
      auth: sub.subscription.keys.auth
    },
    username: sub.username || (existingSnap.exists() ? existingSnap.data()?.username : '') || '',
    userLabel: sub.userLabel || (existingSnap.exists() ? existingSnap.data()?.userLabel : '') || '',
    scope: sub.scope || (existingSnap.exists() ? existingSnap.data()?.scope : 'own') || 'own',
    deviceType: sub.deviceType || (existingSnap.exists() ? existingSnap.data()?.deviceType : 'other') || 'other',
    isStandalone: typeof sub.isStandalone === 'boolean' ? sub.isStandalone : (existingSnap.exists() ? existingSnap.data()?.isStandalone : false),
    enabled: true,
    createdAt: existingSnap.exists() ? (existingSnap.data()?.createdAt || now) : now,
    lastActiveAt: now
  };

  await setDoc(docRef, record, { merge: true });
  console.log(`[Push Service] 📱 Saved/Updated push subscription: [${record.username || 'Anon'}] on ${record.deviceType} (id: ${subId})`);
  return record;
}

/**
 * Remove push subscription from Firestore
 */
export async function deletePushSubscription(endpoint: string): Promise<boolean> {
  try {
    const subId = hashEndpoint(endpoint);
    const docRef = doc(db, 'push_subscriptions', subId);
    await deleteDoc(docRef);
    console.log(`[Push Service] 🗑️ Removed subscription: ${subId}`);
    return true;
  } catch (err) {
    console.error('[Push Service] Error deleting subscription:', err);
    return false;
  }
}

/**
 * Fetch all calendar events from Firestore
 */
export async function getStoredCalendarEvents(): Promise<CalendarEvent[]> {
  try {
    const eventsCol = collection(db, 'calendar_events');
    const snapshot = await getDocs(eventsCol);
    const events: CalendarEvent[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data && data.id && data.date) {
        events.push(data as CalendarEvent);
      }
    });
    return events;
  } catch (err) {
    console.error('[Push Service] Failed to load calendar events from Firestore:', err);
    return [];
  }
}

/**
 * Send push notification to a single subscriber
 */
export async function sendPushToSubscriber(
  sub: StoredPushSubscription,
  payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: any;
  }
): Promise<{ success: boolean; error?: string; expired?: boolean }> {
  try {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth
      }
    };

    const payloadString = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icon-192.png',
      badge: payload.badge || '/icon-192.png',
      tag: payload.tag || 'calendar-daily-8am-notif',
      data: payload.data || { url: '/?tab=calendar' }
    });

    await webpush.sendNotification(pushSubscription, payloadString, {
      TTL: 86400, // Keep in push queue for up to 24 hours if device is offline
      urgency: 'high' // Highest priority for wake-up on iOS APNs / Android FCM
    });

    return { success: true };
  } catch (err: any) {
    const statusCode = err?.statusCode;
    console.warn(`[Push Service] ⚠️ Push send failed for ${sub.username || 'device'} (${sub.id}): Status ${statusCode}, ${err?.message}`);

    // If 404 or 410, subscription is expired/unregistered -> delete it
    if (statusCode === 404 || statusCode === 410) {
      console.log(`[Push Service] Subscription expired (HTTP ${statusCode}), auto-cleaning...`);
      await deletePushSubscription(sub.endpoint);
      return { success: false, error: 'Subscription expired', expired: true };
    }

    return { success: false, error: err?.message || 'Push failed' };
  }
}

/**
 * Dispatch morning briefing push to all registered subscribers
 */
export async function sendMorningPushToAllSubscribers(targetDateStr?: string): Promise<{
  success: boolean;
  totalSubscribers: number;
  sentCount: number;
  failCount: number;
  expiredCount: number;
  date: string;
}> {
  const dateStr = targetDateStr || getTodayDateString();
  console.log(`[Push Service] 🌅 Initiating Daily 08:00 AM Morning Push for date: ${dateStr}`);

  try {
    // 1. Fetch all active push subscriptions
    const subCol = collection(db, 'push_subscriptions');
    const subSnapshot = await getDocs(subCol);
    const subscriptions: StoredPushSubscription[] = [];

    subSnapshot.forEach(docSnap => {
      const data = docSnap.data() as StoredPushSubscription;
      if (data && data.endpoint && data.enabled !== false) {
        subscriptions.push(data);
      }
    });

    if (subscriptions.length === 0) {
      console.log('[Push Service] No active push subscriptions found.');
      return {
        success: true,
        totalSubscribers: 0,
        sentCount: 0,
        failCount: 0,
        expiredCount: 0,
        date: dateStr
      };
    }

    // 2. Fetch all calendar events
    const calendarEvents = await getStoredCalendarEvents();

    let sentCount = 0;
    let failCount = 0;
    let expiredCount = 0;

    // 3. Generate tailored briefings and send to each device
    for (const sub of subscriptions) {
      const briefing = generateDailyMorningBriefing(dateStr, calendarEvents, {
        scope: sub.scope || 'own',
        userLabel: sub.userLabel || sub.username || ''
      });

      const pushResult = await sendPushToSubscriber(sub, {
        title: briefing.title,
        body: briefing.body,
        tag: `morning-briefing-${dateStr}`,
        data: {
          url: '/?tab=calendar',
          date: dateStr,
          scope: sub.scope
        }
      });

      if (pushResult.success) {
        sentCount++;
      } else if (pushResult.expired) {
        expiredCount++;
      } else {
        failCount++;
      }
    }

    // 4. Update push status in Firestore
    const statusRef = doc(db, 'shared_data', 'push_status');
    await setDoc(statusRef, {
      lastPushDate: dateStr,
      lastPushAt: Date.now(),
      lastPushTotalSubscribers: subscriptions.length,
      lastPushSentCount: sentCount,
      lastPushFailCount: failCount,
      lastPushExpiredCount: expiredCount
    }, { merge: true });

    console.log(`[Push Service] 🚀 Morning push complete for ${dateStr}: Sent ${sentCount}/${subscriptions.length} (Expired: ${expiredCount}, Failed: ${failCount})`);

    return {
      success: true,
      totalSubscribers: subscriptions.length,
      sentCount,
      failCount,
      expiredCount,
      date: dateStr
    };
  } catch (err: any) {
    console.error('[Push Service] ❌ Fatal error in sendMorningPushToAllSubscribers:', err);
    return {
      success: false,
      totalSubscribers: 0,
      sentCount: 0,
      failCount: 0,
      expiredCount: 0,
      date: dateStr
    };
  }
}

/**
 * Server Automated 08:00 AM Cron Checker (Hong Kong UTC+8)
 */
export async function runAutomated08AMPushCheck(): Promise<void> {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('zh-TW', {
      timeZone: 'Asia/Hong_Kong',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const parts = formatter.formatToParts(now);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';
    const todayStr = `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
    const hour = parseInt(getPart('hour'), 10);
    const minute = parseInt(getPart('minute'), 10);

    // Only fire around 08:00 AM (08:00 - 08:05)
    if (hour === 8) {
      const statusRef = doc(db, 'shared_data', 'push_status');
      const docSnap = await getDoc(statusRef);
      let lastPushDate = '';
      if (docSnap.exists()) {
        lastPushDate = docSnap.data().lastPushDate || '';
      }

      if (lastPushDate !== todayStr) {
        console.log(`[Push Scheduler] ⏰ Triggering Daily 08:00 AM Morning Push for ${todayStr} (HKT 08:${minute})`);
        await sendMorningPushToAllSubscribers(todayStr);
      }
    }
  } catch (error) {
    console.error('[Push Scheduler] Failed to execute morning push check:', error);
  }
}

/**
 * Start the background 08:00 AM push timer
 */
export function startPushScheduler(): void {
  console.log('[Push Scheduler] ⏰ Automated 08:00 AM push scheduler activated.');
  // Check immediately on startup
  runAutomated08AMPushCheck();

  // Check every 60 seconds
  setInterval(() => {
    runAutomated08AMPushCheck();
  }, 60 * 1000);
}
