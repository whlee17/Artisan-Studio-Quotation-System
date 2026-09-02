import { CalendarEvent } from '../types';
import { isHolidayEvent, isSiteStationEvent } from '../components/CalendarDashboard';

const LAST_NOTIF_DATE_KEY = 'artisan_last_8am_notif_date';
const NOTIF_ENABLED_KEY = 'artisan_calendar_8am_notif_enabled';
const NOTIF_SCOPE_KEY = 'artisan_calendar_8am_notif_scope'; // 'all' | 'own'

/**
 * Check if notifications are supported in current browser/environment
 */
export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

/**
 * Get current notification permission
 */
export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

/**
 * Request notification permission from user
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isNotificationSupported()) return false;
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      localStorage.setItem(NOTIF_ENABLED_KEY, 'true');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return false;
  }
};

/**
 * Check if daily 8 AM notification toggle is enabled
 */
export const isDaily8AMNotificationEnabled = (): boolean => {
  if (typeof window === 'undefined') return true;
  const saved = localStorage.getItem(NOTIF_ENABLED_KEY);
  return saved === null ? true : saved === 'true';
};

/**
 * Set daily 8 AM notification toggle
 */
export const setDaily8AMNotificationEnabled = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NOTIF_ENABLED_KEY, enabled ? 'true' : 'false');
};

/**
 * Get daily 8 AM notification scope setting ('all' | 'own')
 * Default is 'own' (個人專屬)
 */
export const getDaily8AMNotificationScope = (): 'all' | 'own' => {
  if (typeof window === 'undefined') return 'own';
  const saved = localStorage.getItem(NOTIF_SCOPE_KEY);
  return saved === 'all' ? 'all' : 'own';
};

/**
 * Set daily 8 AM notification scope setting ('all' | 'own')
 */
export const setDaily8AMNotificationScope = (scope: 'all' | 'own'): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NOTIF_SCOPE_KEY, scope);
};

/**
 * Helper to get date string in YYYY-MM-DD
 */
export const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Helper to get weekday label in Chinese
 */
export const getWeekdayLabel = (dateStr: string): string => {
  const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return days[d.getDay()] || '';
  }
  return '';
};

/**
 * Clean event title by removing bracketed user prefix if needed
 */
export const cleanEventTitle = (rawTitle: string): string => {
  if (!rawTitle) return '';
  return rawTitle.replace(/^\[.*?\]\s*/, '').trim();
};

/**
 * Extract username/author from title or createdBy
 */
export const extractEventUser = (event: CalendarEvent): string => {
  const match = event.title.match(/^\[(.*?)\]/);
  if (match && match[1]) return match[1].trim();
  return event.createdBy || '成員';
};

/**
 * Check if a calendar event matches a specific target user
 */
export const isEventForUser = (evt: CalendarEvent, targetUser?: string): boolean => {
  if (!targetUser || !targetUser.trim()) return true;
  const target = targetUser.trim().toLowerCase();
  
  const creator = (evt.createdBy || '').trim().toLowerCase();
  if (creator === target || creator.includes(target) || target.includes(creator)) {
    return true;
  }
  
  const eventUser = extractEventUser(evt).trim().toLowerCase();
  if (eventUser === target || eventUser.includes(target) || target.includes(eventUser)) {
    return true;
  }
  
  const title = (evt.title || '').toLowerCase();
  if (title.includes(`[${target}]`) || title.includes(target)) {
    return true;
  }
  
  return false;
};

export interface MorningBriefingOptions {
  scope?: 'all' | 'own';
  userLabel?: string;
}

/**
 * Format daily morning briefing notification content for a given date
 */
export interface MorningBriefingData {
  title: string;
  body: string;
  summary: string;
  scope: 'all' | 'own';
  userLabel?: string;
  eventCount: number;
  workEventsCount: number;
  holidaysCount: number;
  siteStationCount: number;
  workEvents: CalendarEvent[];
  holidays: CalendarEvent[];
  siteStations: CalendarEvent[];
  weekday: string;
  stationList: { name: string; location: string }[];
  generalEvents: CalendarEvent[];
  holidayList: { name: string; type: string }[];
}

export const generateDailyMorningBriefing = (
  param1: string | CalendarEvent[],
  param2?: string | CalendarEvent[],
  options?: MorningBriefingOptions
): MorningBriefingData => {
  let dateStr: string = '';
  let events: CalendarEvent[] = [];

  if (typeof param1 === 'string') {
    dateStr = param1;
    events = Array.isArray(param2) ? param2 : [];
  } else {
    events = Array.isArray(param1) ? param1 : [];
    dateStr = typeof param2 === 'string' ? param2 : getTodayDateString();
  }

  if (!dateStr) {
    dateStr = getTodayDateString();
  }

  const effectiveScope: 'all' | 'own' = options?.scope || getDaily8AMNotificationScope();
  const effectiveUser = (options?.userLabel || '').trim();

  // Filter events on this date that have notification enabled (or undefined, default to true)
  let dayEvents = events.filter(e => e.date === dateStr && e.enableNotification !== false);

  // If user selected "own", only include events related to the current user
  if (effectiveScope === 'own' && effectiveUser) {
    dayEvents = dayEvents.filter(e => isEventForUser(e, effectiveUser));
  }

  const workEvents: CalendarEvent[] = [];
  const holidays: CalendarEvent[] = [];
  const siteStations: CalendarEvent[] = [];

  const stationList: { name: string; location: string }[] = [];
  const holidayList: { name: string; type: string }[] = [];

  for (const evt of dayEvents) {
    const user = extractEventUser(evt);
    if (isSiteStationEvent(evt)) {
      siteStations.push(evt);
      stationList.push({
        name: user,
        location: evt.location || cleanEventTitle(evt.title) || '現場'
      });
    } else if (isHolidayEvent(evt)) {
      holidays.push(evt);
      let typeStr = '放假 (全天)';
      if (evt.type === 'holiday_am') typeStr = '放假 (上午)';
      else if (evt.type === 'holiday_pm') typeStr = '放假 (下午)';
      else {
        const t = cleanEventTitle(evt.title);
        if (t.includes('上午')) typeStr = '放假 (上午)';
        else if (t.includes('下午')) typeStr = '放假 (下午)';
      }
      holidayList.push({
        name: user,
        type: typeStr
      });
    } else {
      workEvents.push(evt);
    }
  }

  // Sort work events by time
  workEvents.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));

  const weekday = getWeekdayLabel(dateStr);
  const formattedDate = dateStr.replace(/-/g, '/');
  const totalCount = workEvents.length + holidays.length + siteStations.length;

  let title = effectiveScope === 'own' && effectiveUser
    ? `📅 築匠晨間個人行程 [${effectiveUser}] (${formattedDate} ${weekday})`
    : `📅 築匠晨間行程 (${formattedDate} ${weekday})`;
  const sections: string[] = [];

  if (totalCount === 0) {
    if (effectiveScope === 'own' && effectiveUser) {
      sections.push(`今日您 [${effectiveUser}] 暫無安排之個人行程、駐場或休假，祝今日工作愉快！`);
    } else {
      sections.push('今日暫無已安排之行事曆行程、駐場或休假，祝今日工作愉快！');
    }
  } else {
    // 1. Site Station (駐場 / 註場位置)
    if (siteStations.length > 0) {
      const stationLines = siteStations.map(evt => {
        const user = extractEventUser(evt);
        const loc = evt.location || cleanEventTitle(evt.title) || '現場';
        return `• [${user}] 註場位置：${loc}`;
      });
      const header = effectiveScope === 'own' ? `📍 今日您的註場位置:` : `📍 今日註場人員 (${siteStations.length}人):`;
      sections.push(`${header}\n` + stationLines.join('\n'));
    }

    // 2. Calendar / Work Events (見客、度尺、覆尺、會議、其他)
    if (workEvents.length > 0) {
      const eventLines = workEvents.map(evt => {
        const user = extractEventUser(evt);
        const titleText = cleanEventTitle(evt.title);
        const timeStr = evt.time && evt.time !== '00:00' ? evt.time : '';
        const locStr = evt.location ? ` (${evt.location})` : '';
        return `• ${timeStr ? timeStr + ' ' : ''}[${user}] ${titleText}${locStr}`;
      });
      const header = effectiveScope === 'own' ? `📋 今日您的活動安排 (${workEvents.length}項):` : `📋 今日行事曆活動 (${workEvents.length}項):`;
      sections.push(`${header}\n` + eventLines.join('\n'));
    }

    // 3. Holidays / Leaves (放假全天、上午半天、下午半天)
    if (holidays.length > 0) {
      const holidayLines = holidays.map(evt => {
        const user = extractEventUser(evt);
        let typeStr = '放假 (全天)';
        if (evt.type === 'holiday_am') typeStr = '放假 (上午)';
        else if (evt.type === 'holiday_pm') typeStr = '放假 (下午)';
        else {
          const t = cleanEventTitle(evt.title);
          if (t.includes('上午')) typeStr = '放假 (上午)';
          else if (t.includes('下午')) typeStr = '放假 (下午)';
        }
        return `• [${user}] ${typeStr}`;
      });
      const header = effectiveScope === 'own' ? `🏖️ 今日休假狀態:` : `🏖️ 今日休假人員 (${holidays.length}人):`;
      sections.push(`${header}\n` + holidayLines.join('\n'));
    }
  }

  const body = sections.join('\n\n');
  const summary = totalCount > 0
    ? (effectiveScope === 'own'
        ? `今日您共有 ${totalCount} 項個人安排：${workEvents.length}項活動、${siteStations.length}處註場、${holidays.length > 0 ? '當日休假' : '正常當值'}`
        : `今日共有 ${totalCount} 項安排：${workEvents.length}項活動、${siteStations.length}處註場、${holidays.length}人休假`)
    : (effectiveScope === 'own' ? `今日暫無個人行程安排` : `今日暫無行程安排`);

  return {
    title,
    body,
    summary,
    scope: effectiveScope,
    userLabel: effectiveUser,
    eventCount: totalCount,
    workEventsCount: workEvents.length,
    holidaysCount: holidays.length,
    siteStationCount: siteStations.length,
    workEvents,
    holidays,
    siteStations,
    weekday,
    stationList,
    generalEvents: workEvents,
    holidayList
  };
};

/**
 * Dispatch Push Notification using Service Worker or Browser Web Notification
 */
export const sendCalendarNotification = async (
  title: string,
  options: {
    body: string;
    tag?: string;
    data?: any;
    requireInteraction?: boolean;
    renotify?: boolean;
  }
): Promise<boolean> => {
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported in this environment');
    return false;
  }

  if (Notification.permission !== 'granted') {
    const granted = await requestNotificationPermission();
    if (!granted) return false;
  }

  const notificationOptions: any = {
    body: options.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: options.tag || 'calendar-morning-8am',
    renotify: options.renotify ?? true,
    requireInteraction: options.requireInteraction ?? true,
    data: options.data || { url: '/?tab=calendar' }
  };

  // Try Service Worker registration first (standard for PWAs)
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification(title, notificationOptions);
        return true;
      }
    } catch (swErr) {
      console.warn('Service worker notification failed, falling back to Notification constructor:', swErr);
    }
  }

  // Fallback to standard Notification constructor
  try {
    const notif = new Notification(title, notificationOptions);
    notif.onclick = () => {
      window.focus();
      notif.close();
      window.dispatchEvent(new CustomEvent('NAVIGATE_TO_CALENDAR'));
    };
    return true;
  } catch (err) {
    console.error('Failed to trigger Notification:', err);
    return false;
  }
};

/**
 * Trigger immediate test of the 8:00 AM Morning Push Notification
 */
export const triggerTestMorningPush = async (
  events: CalendarEvent[],
  targetDate?: string,
  options?: MorningBriefingOptions
): Promise<{ success: boolean; data: MorningBriefingData; message: string }> => {
  const dateStr = targetDate || getTodayDateString();
  const briefing = generateDailyMorningBriefing(dateStr, events, options);

  const success = await sendCalendarNotification(briefing.title, {
    body: briefing.body,
    tag: `test-briefing-${Date.now()}`,
    requireInteraction: true
  });

  return {
    success,
    data: briefing,
    message: success ? '晨間推送通知已發送！' : '無法發送通知，請確認已授權瀏覽器通知權限。'
  };
};

/**
 * Check and trigger daily 8:00 AM notification if due today
 */
export const checkAndTriggerDaily8AMNotification = async (
  events: CalendarEvent[],
  currentUserLabel?: string,
  canPushAllMembers: boolean = false
): Promise<boolean> => {
  if (!isDaily8AMNotificationEnabled()) return false;
  if (getNotificationPermission() !== 'granted') return false;

  const now = new Date();
  const todayStr = getTodayDateString();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Check if current time is at or after 08:00
  const isAfter8AM = currentHour > 8 || (currentHour === 8 && currentMinute >= 0);
  if (!isAfter8AM) return false;

  // Check if today's morning notification was already sent
  const lastNotifiedDate = localStorage.getItem(LAST_NOTIF_DATE_KEY);
  if (lastNotifiedDate === todayStr) {
    return false; // Already sent for today
  }

  let scope = getDaily8AMNotificationScope();
  // Permission safeguard: If user lacks 'feat_calendar_push_all_members' permission, enforce 'own'
  if (scope === 'all' && !canPushAllMembers) {
    scope = 'own';
  }

  // Generate and send morning briefing
  const briefing = generateDailyMorningBriefing(todayStr, events, {
    scope,
    userLabel: currentUserLabel
  });
  const sent = await sendCalendarNotification(briefing.title, {
    body: briefing.body,
    tag: `daily-8am-${todayStr}`,
    requireInteraction: true
  });

  if (sent) {
    localStorage.setItem(LAST_NOTIF_DATE_KEY, todayStr);
    console.log(`[Calendar Notification] Successfully pushed 8:00 AM briefing for ${todayStr} (scope: ${scope})`);
    // Also dispatch in-app event for toast or state updates
    window.dispatchEvent(
      new CustomEvent('CALENDAR_8AM_NOTIFICATION_SENT', {
        detail: { date: todayStr, briefing }
      })
    );
    return true;
  }

  return false;
};

/**
 * Calculate milliseconds until the next 8:00 AM
 */
export const getMillisecondsUntilNext8AM = (): number => {
  const now = new Date();
  const next8AM = new Date();
  next8AM.setHours(8, 0, 0, 0);

  // If 8:00 AM today has already passed, schedule for tomorrow 8:00 AM
  if (now.getTime() >= next8AM.getTime()) {
    next8AM.setDate(next8AM.getDate() + 1);
  }

  return next8AM.getTime() - now.getTime();
};
