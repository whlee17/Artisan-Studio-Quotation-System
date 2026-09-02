import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  Calendar as CalendarIcon, Clock, MapPin, AlignLeft, Plus, Trash2, Edit, 
  ChevronLeft, ChevronRight, ChevronDown, Info, Sparkles, User, Briefcase, Check, X, 
  AlertCircle, FileText, Search, PlusCircle, Hammer, Landmark, MapPinned,
  Coffee, Sun, Sunset, Building, MoreVertical, Users, Lock, ShieldCheck,
  Bell, BellRing, BellOff, Volume2, Send, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarEvent, Quotation, UserAccount, ScheduleStep } from '../types';
import { 
  requestNotificationPermission, 
  getNotificationPermission, 
  isDaily8AMNotificationEnabled, 
  setDaily8AMNotificationEnabled, 
  getDaily8AMNotificationScope,
  setDaily8AMNotificationScope,
  triggerTestMorningPush, 
  generateDailyMorningBriefing,
  getTodayDateString as getTodayDateStrHelper
} from '../lib/calendarNotifications';

export const USER_COLOR_PALETTES = [
  { name: 'blue', bg: 'bg-blue-600', text: 'text-blue-700', border: 'border-blue-100', bgLight: 'bg-blue-50/70', bgExtraLight: '#eff6ff', hex: '#2563eb' },
  { name: 'emerald', bg: 'bg-emerald-600', text: 'text-emerald-700', border: 'border-emerald-100', bgLight: 'bg-emerald-50/70', bgExtraLight: '#ecfdf5', hex: '#059669' },
  { name: 'purple', bg: 'bg-purple-600', text: 'text-purple-700', border: 'border-purple-100', bgLight: 'bg-purple-50/70', bgExtraLight: '#f3e8ff', hex: '#9333ea' },
  { name: 'rose', bg: 'bg-rose-600', text: 'text-rose-700', border: 'border-rose-100', bgLight: 'bg-rose-50/70', bgExtraLight: '#fff1f2', hex: '#e11d48' },
  { name: 'amber', bg: 'bg-amber-600', text: 'text-amber-700', border: 'border-amber-100', bgLight: 'bg-amber-50/70', bgExtraLight: '#fef3c7', hex: '#d97706' },
  { name: 'indigo', bg: 'bg-indigo-600', text: 'text-indigo-700', border: 'border-indigo-100', bgLight: 'bg-indigo-50/70', bgExtraLight: '#e0e7ff', hex: '#4f46e5' },
  { name: 'teal', bg: 'bg-teal-600', text: 'text-teal-700', border: 'border-teal-100', bgLight: 'bg-teal-50/70', bgExtraLight: '#f0fdfa', hex: '#0d9488' },
  { name: 'orange', bg: 'bg-orange-600', text: 'text-orange-700', border: 'border-orange-100', bgLight: 'bg-orange-50/70', bgExtraLight: '#fff7ed', hex: '#ea580c' }
];

export const PROJECT_COLOR_PALETTES = [
  { name: 'indigo', primaryHex: '#4f46e5', borderLeft: 'border-l-indigo-500', border: 'border-indigo-200', bgLight: 'bg-indigo-50/60', text: 'text-indigo-900', iconText: 'text-indigo-600', badgeBg: 'bg-indigo-600 text-white' },
  { name: 'blue', primaryHex: '#2563eb', borderLeft: 'border-l-blue-500', border: 'border-blue-200', bgLight: 'bg-blue-50/60', text: 'text-blue-900', iconText: 'text-blue-600', badgeBg: 'bg-blue-600 text-white' },
  { name: 'teal', primaryHex: '#0d9488', borderLeft: 'border-l-teal-500', border: 'border-teal-200', bgLight: 'bg-teal-50/60', text: 'text-teal-900', iconText: 'text-teal-600', badgeBg: 'bg-teal-600 text-white' },
  { name: 'emerald', primaryHex: '#059669', borderLeft: 'border-l-emerald-500', border: 'border-emerald-200', bgLight: 'bg-emerald-50/60', text: 'text-emerald-900', iconText: 'text-emerald-600', badgeBg: 'bg-emerald-600 text-white' },
  { name: 'purple', primaryHex: '#9333ea', borderLeft: 'border-l-purple-500', border: 'border-purple-200', bgLight: 'bg-purple-50/60', text: 'text-purple-900', iconText: 'text-purple-600', badgeBg: 'bg-purple-600 text-white' },
  { name: 'rose', primaryHex: '#e11d48', borderLeft: 'border-l-rose-500', border: 'border-rose-200', bgLight: 'bg-rose-50/60', text: 'text-rose-900', iconText: 'text-rose-600', badgeBg: 'bg-rose-600 text-white' },
  { name: 'amber', primaryHex: '#d97706', borderLeft: 'border-l-amber-500', border: 'border-amber-200', bgLight: 'bg-amber-50/60', text: 'text-amber-900', iconText: 'text-amber-600', badgeBg: 'bg-amber-600 text-white' },
  { name: 'cyan', primaryHex: '#0891b2', borderLeft: 'border-l-cyan-500', border: 'border-cyan-200', bgLight: 'bg-cyan-50/60', text: 'text-cyan-900', iconText: 'text-cyan-600', badgeBg: 'bg-cyan-600 text-white' }
];

export const getProjectColorPalette = (projectKey?: string) => {
  if (!projectKey) return PROJECT_COLOR_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < projectKey.length; i++) {
    hash = projectKey.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PROJECT_COLOR_PALETTES.length;
  return PROJECT_COLOR_PALETTES[index];
};

export const getUserColorPalette = (usernameOrDisplayName?: string, customColor?: string) => {
  if (customColor && customColor.startsWith('#')) {
    return {
      name: 'custom',
      bg: 'bg-custom',
      text: customColor,
      border: 'border-slate-200',
      bgLight: customColor + '20',
      bgExtraLight: customColor + '18',
      hex: customColor
    };
  }
  if (!usernameOrDisplayName) return USER_COLOR_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < usernameOrDisplayName.length; i++) {
    hash = usernameOrDisplayName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % USER_COLOR_PALETTES.length;
  return USER_COLOR_PALETTES[index];
};

export const getGanttStepColor = (stepIndex: number) => {
  const colors = [
    { name: 'indigo', bg: 'bg-indigo-500 text-white', border: 'border-indigo-200', text: 'text-indigo-700', bgLight: 'bg-indigo-50/75', hex: '#6366f1' },
    { name: 'blue', bg: 'bg-blue-500 text-white', border: 'border-blue-200', text: 'text-blue-700', bgLight: 'bg-blue-50/75', hex: '#3b82f6' },
    { name: 'cyan', bg: 'bg-cyan-500 text-slate-800', border: 'border-cyan-200', text: 'text-cyan-700', bgLight: 'bg-cyan-50/75', hex: '#06b6d4' },
    { name: 'teal', bg: 'bg-teal-500 text-white', border: 'border-teal-200', text: 'text-teal-700', bgLight: 'bg-teal-50/75', hex: '#14b8a6' },
    { name: 'emerald', bg: 'bg-emerald-500 text-white', border: 'border-emerald-200', text: 'text-emerald-700', bgLight: 'bg-emerald-50/75', hex: '#10b981' },
    { name: 'amber', bg: 'bg-amber-500 text-slate-900', border: 'border-amber-200', text: 'text-amber-700', bgLight: 'bg-amber-50/75', hex: '#f59e0b' },
    { name: 'orange', bg: 'bg-orange-500 text-white', border: 'border-orange-200', text: 'text-orange-700', bgLight: 'bg-orange-50/75', hex: '#f97316' },
    { name: 'rose', bg: 'bg-rose-500 text-white', border: 'border-rose-200', text: 'text-rose-700', bgLight: 'bg-rose-50/75', hex: '#f43f5e' },
    { name: 'purple', bg: 'bg-purple-500 text-white', border: 'border-purple-200', text: 'text-purple-700', bgLight: 'bg-purple-50/75', hex: '#a855f7' }
  ];
  return colors[stepIndex % colors.length];
};

const isProtectedAdmin = (username?: string) => {
  if (!username) return false;
  const lower = username.toLowerCase().trim();
  return lower === 'whlee' || lower === 'mat' || lower === 'king';
};

const hasPermission = (user: UserAccount | null, permissionKey: string): boolean => {
  if (!user) return false;
  if (isProtectedAdmin(user.username)) {
    return true;
  }
  if (user.permissions && typeof user.permissions[permissionKey] === 'boolean') {
    return user.permissions[permissionKey];
  }
  if (user.role === 'admin') {
    return true;
  }
  if (permissionKey === 'page_calendar') return true;
  if (permissionKey === 'feat_view_duty_staff') return true;
  if (permissionKey === 'feat_manage_calendar_events') return true;
  return false;
};

export const isSiteStationEvent = (evt: CalendarEvent) => {
  if (evt.type === 'site_station') return true;
  const title = evt.title || '';
  const loc = evt.location || '';
  const remarks = evt.remarks || '';
  return (
    title.includes('駐場') ||
    title.includes('註場') ||
    title.includes('全日駐場') ||
    title.includes('駐點') ||
    loc.includes('駐場') ||
    loc.includes('註場') ||
    remarks.includes('全日駐場') ||
    remarks.includes('駐場')
  );
};

export const getStationLocationTheme = (locationStr?: string, titleStr?: string) => {
  const text = `${locationStr || ''} ${titleStr || ''}`;
  if (text.includes('灣仔') || text.includes('Wan Chai')) {
    return {
      name: '灣仔',
      primaryHex: '#dc2626',
      borderClass: 'border-2 border-red-500 ring-2 ring-red-500/20 bg-red-50/60 shadow-2xs',
      badgeBgClass: 'bg-red-600 text-white border-red-600 shadow-3xs',
      tagBgClass: 'text-red-900 bg-red-100/90 border border-red-300',
      iconTextClass: 'text-red-600',
      dotClass: 'bg-red-600 ring-2 ring-red-300',
      gridBadgeClass: 'border-red-600 bg-red-600 hover:bg-red-700 text-white'
    };
  }
  if (text.includes('將軍澳') || text.includes('Tseung Kwan O') || text.includes('TKO')) {
    return {
      name: '將軍澳',
      primaryHex: '#2563eb',
      borderClass: 'border-2 border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/60 shadow-2xs',
      badgeBgClass: 'bg-blue-600 text-white border-blue-600 shadow-3xs',
      tagBgClass: 'text-blue-900 bg-blue-100/90 border border-blue-300',
      iconTextClass: 'text-blue-600',
      dotClass: 'bg-blue-600 ring-2 ring-blue-300',
      gridBadgeClass: 'border-blue-600 bg-blue-600 hover:bg-blue-700 text-white'
    };
  }
  if (text.includes('旺角') || text.includes('Mong Kok') || text.includes('MK')) {
    return {
      name: '旺角',
      primaryHex: '#d97706',
      borderClass: 'border-2 border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/60 shadow-2xs',
      badgeBgClass: 'bg-amber-500 text-white border-amber-500 shadow-3xs',
      tagBgClass: 'text-amber-900 bg-amber-100/90 border border-amber-300',
      iconTextClass: 'text-amber-600',
      dotClass: 'bg-amber-500 ring-2 ring-amber-300',
      gridBadgeClass: 'border-amber-500 bg-amber-500 hover:bg-amber-600 text-white'
    };
  }
  // Default / 屯門 / 其他地點
  return {
    name: '駐場',
    primaryHex: '#e11d48',
    borderClass: 'border-2 border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/50 shadow-2xs',
    badgeBgClass: 'bg-rose-600 text-white border-rose-600 shadow-3xs',
    tagBgClass: 'text-rose-900 bg-rose-100/90 border border-rose-300',
    iconTextClass: 'text-rose-600',
    dotClass: 'bg-rose-600 ring-2 ring-rose-300',
    gridBadgeClass: 'border-rose-600 bg-rose-600 hover:bg-rose-700 text-white'
  };
};

export const isHolidayEvent = (evt: CalendarEvent) => {
  if (isSiteStationEvent(evt)) return false;
  if (evt.type === 'holiday_full' || evt.type === 'holiday_am' || evt.type === 'holiday_pm') return true;
  const title = evt.title || '';
  return title.includes('放假') || title.includes('休假');
};

interface CalendarDashboardProps {
  currentUser: UserAccount | null;
  quotations: Quotation[];
  calendarEvents: CalendarEvent[];
  onSaveEvent: (event: CalendarEvent) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  viewMode?: 'grid' | 'list';
  userColors?: Record<string, string>;
  mode?: 'calendar' | 'shifts';
  showMobileCalendarDayList?: boolean;
  accountsList?: UserAccount[] | any[];
}

export default function CalendarDashboard({
  currentUser,
  quotations,
  calendarEvents,
  onSaveEvent,
  onDeleteEvent,
  viewMode,
  userColors,
  showMobileCalendarDayList = true,
  accountsList = []
}: CalendarDashboardProps) {
  // Sub-tabs: General Calendar (公司行事曆) vs Staff Holiday Shifts (員工輪班表) vs Construction Calendar (工程日曆)
  const [subTab, setSubTab] = useState<'general' | 'shifts' | 'engineering'>('general');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  // Calendar month state
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-11
  
  // Selected day for displaying details in Company Calendar
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });

  // Search filter for engineering projects
  const [engSearchQuery, setEngSearchQuery] = useState<string>('');

  // Search and view mode filters for Company Calendar
  const [generalSearchQuery, setGeneralSearchQuery] = useState<string>('');
  const [generalViewMode, setGeneralViewMode] = useState<'grid' | 'list'>(viewMode || 'grid');

  useEffect(() => {
    if (viewMode) {
      setGeneralViewMode(viewMode);
    }
  }, [viewMode]);
  const [onlyShowOwnEvents, setOnlyShowOwnEvents] = useState<boolean>(false);
  const [showMyLeaves, setShowMyLeaves] = useState<boolean>(false);
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string | null>(null);
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState<boolean>(false);
  const memberDropdownRef = useRef<HTMLDivElement>(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>('');
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [hasClickedDay, setHasClickedDay] = useState<boolean>(false);

  // Close member dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (memberDropdownRef.current && !memberDropdownRef.current.contains(event.target as Node)) {
        setIsMemberDropdownOpen(false);
      }
    };
    if (isMemberDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMemberDropdownOpen]);

  // Simplified Display mode toggle for event lists / staff roster
  const [isSimplifiedDisplay, setIsSimplifiedDisplay] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calendar_simplified_display');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });

  // Morning 8:00 AM Push Notification states
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isDaily8AMEnabled, setIsDaily8AMEnabled] = useState<boolean>(true);
  const [notifScope, setNotifScope] = useState<'all' | 'own'>('all');
  const [isBriefingModalOpen, setIsBriefingModalOpen] = useState<boolean>(false);
  const [isTestingNotif, setIsTestingNotif] = useState<boolean>(false);
  const [notifFeedback, setNotifFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Per-event form notification toggles (default enabled)
  const [formEnableNotification, setFormEnableNotification] = useState<boolean>(true);
  const [modalFormEnableNotification, setModalFormEnableNotification] = useState<boolean>(true);

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
    setIsDaily8AMEnabled(isDaily8AMNotificationEnabled());
    setNotifScope(getDaily8AMNotificationScope());
  }, []);

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    const perm = getNotificationPermission();
    setNotifPermission(perm);
    if (granted) {
      setNotifFeedback({ message: '已成功授權通知！每天早上 08:00 將收到當日行程、註場與放假推送。', type: 'success' });
    } else {
      setNotifFeedback({ message: '通知權限未開啟或被瀏覽器設定封鎖，請在瀏覽器網址列旁允許通知。', type: 'error' });
    }
  };

  const handleToggleDaily8AM = (enabled: boolean) => {
    setIsDaily8AMEnabled(enabled);
    setDaily8AMNotificationEnabled(enabled);
    setNotifFeedback({
      message: enabled ? '已開啟每日早晨 08:00 自動推播通知！' : '已暫停每日早晨 08:00 自動推播通知。',
      type: 'info'
    });
  };

  const handleToggleNotifScope = (scope: 'all' | 'own') => {
    setNotifScope(scope);
    setDaily8AMNotificationScope(scope);
    const userLabel = currentUser ? (currentUser.displayName || currentUser.username || '') : '';
    setNotifFeedback({
      message: scope === 'own'
        ? `已切換為「只推送我的日程」：每日 08:00 僅推送與您 [${userLabel || '自己'}] 相關的活動、註場及放假通知。`
        : '已切換為「全部成員日程」：每日 08:00 將推送團隊所有成員之完整行程與註場概況。',
      type: 'info'
    });
  };

  const handleTriggerTestPush = async (dateStr?: string) => {
    setIsTestingNotif(true);
    setNotifFeedback(null);
    try {
      const targetDate = dateStr || selectedDateStr || getTodayDateStrHelper();
      const userLabel = currentUser ? (currentUser.displayName || currentUser.username || '') : '';
      const result = await triggerTestMorningPush(calendarEvents, targetDate, {
        scope: notifScope,
        userLabel
      });
      setNotifPermission(getNotificationPermission());
      if (result.success) {
        setNotifFeedback({ 
          message: `已成功發送 ${targetDate} 晨間 08:00 推送測試 (${notifScope === 'own' ? `個人專屬 - ${userLabel || '自己'}` : '全體成員'}) 至您的設備！`, 
          type: 'success' 
        });
      } else {
        setNotifFeedback({ message: result.message, type: 'error' });
      }
    } catch (e: any) {
      setNotifFeedback({ message: '發送測試通知失敗：' + (e?.message || '未知錯誤'), type: 'error' });
    } finally {
      setIsTestingNotif(false);
    }
  };

  const handleToggleSimplifiedDisplay = () => {
    setIsSimplifiedDisplay(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('calendar_simplified_display', String(next));
      }
      return next;
    });
  };

  // Expanded duty user detail state (only shown when double-tapped on mobile/desktop)
  const [expandedDutyUsers, setExpandedDutyUsers] = useState<Record<string, boolean>>({});
  const lastStaffTapRef = useRef<Record<string, number>>({});

  // Dedicated Duty Staff List Modal states
  const [isDutyListModalOpen, setIsDutyListModalOpen] = useState<boolean>(false);
  const [dutyModalFilter, setDutyModalFilter] = useState<'all' | 'working' | 'station' | 'halfday' | 'leave'>('all');
  const [dutyModalSearch, setDutyModalSearch] = useState<string>('');

  const handleToggleDutyUserDetail = (staffName: string) => {
    setExpandedDutyUsers(prev => ({
      ...prev,
      [staffName]: !prev[staffName]
    }));
  };

  const handleStaffTouchEnd = (staffName: string) => {
    const now = Date.now();
    const lastTap = lastStaffTapRef.current[staffName] || 0;
    if (now - lastTap < 350) {
      // Double tap detected!
      handleToggleDutyUserDetail(staffName);
      lastStaffTapRef.current[staffName] = 0;
    } else {
      lastStaffTapRef.current[staffName] = now;
    }
  };

  // Mobile Pop-Up Modal state
  const [isMobilePopUpOpen, setIsMobilePopUpOpen] = useState<boolean>(false);
  const [mobilePopUpDate, setMobilePopUpDate] = useState<string>('');
  const [modalFormMode, setModalFormMode] = useState<'none' | 'add_event' | 'quick_shift'>('none');

  // Modal form state
  const [modalFormType, setModalFormType] = useState<'visit' | 'measure' | 'remeasure' | 'other' | 'holiday_full' | 'holiday_am' | 'holiday_pm' | 'site_station'>('visit');
  const [modalFormTitle, setModalFormTitle] = useState<string>('見客');
  const [modalFormTime, setModalFormTime] = useState<string>('10:00');
  const [modalFormLocation, setModalFormLocation] = useState<string>('旺角');
  const [modalFormRemarks, setModalFormRemarks] = useState<string>('');
  const [modalFormUser, setModalFormUser] = useState<string>('');
  const [isSelectingStationLocation, setIsSelectingStationLocation] = useState<boolean>(false);
  const [customStationLocation, setCustomStationLocation] = useState<string>('');

  // Long-press pop-up action modal state for event cards
  const [actionModalEvt, setActionModalEvt] = useState<CalendarEvent | null>(null);
  const [showDeleteConfirmInActionModal, setShowDeleteConfirmInActionModal] = useState<boolean>(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLongPressStart = (evt: CalendarEvent) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        try { window.navigator.vibrate(50); } catch (e) {}
      }
      setActionModalEvt(evt);
      setShowDeleteConfirmInActionModal(false);
    }, 400);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const createLongPressProps = (evt: CalendarEvent) => ({
    onTouchStart: () => handleLongPressStart(evt),
    onTouchEnd: handleLongPressEnd,
    onTouchMove: handleLongPressEnd,
    onMouseDown: () => handleLongPressStart(evt),
    onMouseUp: handleLongPressEnd,
    onMouseLeave: handleLongPressEnd,
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      handleLongPressEnd();
      setActionModalEvt(evt);
      setShowDeleteConfirmInActionModal(false);
    }
  });

  const getWeekdayLabel = (dateStr: string) => {
    if (!dateStr) return '';
    const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return days[d.getDay()];
    }
    return '';
  };

  const handleOpenMobilePopUp = (dateStr: string) => {
    setMobilePopUpDate(dateStr);
    setSelectedDateStr(dateStr);
    setModalFormMode('none');
    setIsSelectingStationLocation(false);
    setCustomStationLocation('');
    setIsMobilePopUpOpen(true);
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (permissionError) {
      const timer = setTimeout(() => {
        setPermissionError(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [permissionError]);

  const lastTapRef = useRef<number>(0);
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches && e.touches.length > 0) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartXRef.current;
    const deltaY = touchEndY - touchStartYRef.current;

    // Horizontal swipe threshold: 40px, horizontal motion dominates
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (deltaX < 0) {
        // Swipe left -> next subTab: general -> shifts -> engineering -> general
        setSubTab(prev => {
          if (prev === 'general') return 'shifts';
          if (prev === 'shifts') return 'engineering';
          return 'general';
        });
      } else {
        // Swipe right -> prev subTab: engineering -> shifts -> general -> engineering
        setSubTab(prev => {
          if (prev === 'engineering') return 'shifts';
          if (prev === 'shifts') return 'general';
          return 'engineering';
        });
      }
    }
  };

  const handleDayClickOrDoubleTap = (dateString: string) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 400; // ms
    
    const isSelectedDate = selectedDateStr === dateString;
    setSelectedDateStr(dateString);
    setHasClickedDay(true);

    if (isMobile) {
      // On mobile, double-tap OR tapping the already selected date opens Pop-up Screen
      if (now - lastTapRef.current < DOUBLE_PRESS_DELAY || isSelectedDate) {
        handleOpenMobilePopUp(dateString);
      }
    } else {
      // In web view / desktop:
      // Double tap (two clicks within 400ms) or clicking the already selected date opens the rich preview modal with sample edit function!
      if (now - lastTapRef.current < DOUBLE_PRESS_DELAY) {
        handleOpenMobilePopUp(dateString);
      }
    }
    
    lastTapRef.current = now;
  };

  const handleDayDoubleClick = (dateString: string) => {
    setSelectedDateStr(dateString);
    setHasClickedDay(true);
    // Double click on web view directly opens the rich preview modal with sample edit function
    handleOpenMobilePopUp(dateString);
  };

  // Canonical name mapping resolver to prevent duplicate display of users (e.g. WHLEE, king, mat with case/alias differences)
  const resolveCanonicalName = useCallback((rawName: string | undefined | null): string => {
    if (!rawName) return '';
    const clean = rawName.trim();
    if (!clean) return '';
    const lower = clean.toLowerCase();
    const prefix = lower.split('@')[0];

    // Priority 1: Check accountsList
    if (accountsList && Array.isArray(accountsList)) {
      for (const acc of accountsList) {
        const aDisp = (acc.displayName || '').trim();
        const aUser = (acc.username || '').trim();
        const aUserLower = aUser.toLowerCase();
        const aDispLower = aDisp.toLowerCase();
        const aUserPrefix = aUserLower.split('@')[0];
        
        if (
          (aDisp && aDispLower === lower) ||
          (aUser && aUserLower === lower) ||
          (aUserPrefix && aUserPrefix === prefix) ||
          (aDisp && aDispLower === prefix) ||
          (prefix && aUserPrefix === prefix)
        ) {
          return aDisp || aUser;
        }
      }
    }

    // Priority 2: Check currentUser
    if (currentUser) {
      const cDisp = (currentUser.displayName || '').trim();
      const cUser = (currentUser.username || '').trim();
      const cUserLower = cUser.toLowerCase();
      const cDispLower = cDisp.toLowerCase();
      const cUserPrefix = cUserLower.split('@')[0];
      
      if (
        (cDisp && cDispLower === lower) ||
        (cUser && cUserLower === lower) ||
        (cUserPrefix && cUserPrefix === prefix) ||
        (cDisp && cDispLower === prefix)
      ) {
        return cDisp || cUser;
      }
    }

    // Priority 3: Standardize known aliases (WHLEE, King, Mat)
    if (lower === 'whlee' || lower.startsWith('whlee') || prefix === 'whlee') return 'WHLEE';
    if (lower === 'king' || prefix === 'king') return 'King';
    if (lower === 'mat' || prefix === 'mat') return 'Mat';

    return clean;
  }, [accountsList, currentUser]);

  // Find all unique users who have created events to render in the legend (deduplicated & canonicalized)
  const uniqueCreators = useMemo(() => {
    const creatorMap = new Map<string, string>(); // lowerKey -> canonicalName

    if (currentUser) {
      const name = resolveCanonicalName(currentUser.displayName || currentUser.username || 'System');
      if (name) {
        creatorMap.set(name.toLowerCase(), name);
      }
    }

    calendarEvents.forEach(evt => {
      if (evt.createdBy) {
        const canonical = resolveCanonicalName(evt.createdBy);
        if (canonical) {
          const key = canonical.toLowerCase();
          if (!creatorMap.has(key)) {
            creatorMap.set(key, canonical);
          }
        }
      }
    });

    return Array.from(creatorMap.values());
  }, [calendarEvents, currentUser, resolveCanonicalName]);

  // Find all unique staff members without duplicate names (WHLEE, king, mat deduplicated)
  const allStaffMembers = useMemo(() => {
    const map = new Map<string, { username: string; displayName: string }>();

    // 1. From accountsList
    if (accountsList && Array.isArray(accountsList) && accountsList.length > 0) {
      accountsList.forEach((acc: any) => {
        const name = resolveCanonicalName(acc.displayName || acc.username);
        const uName = acc.username || name;
        if (name) {
          const key = name.toLowerCase();
          if (!map.has(key)) {
            map.set(key, { username: uName, displayName: name });
          }
        }
      });
    }

    // 2. From currentUser
    if (currentUser) {
      const curName = resolveCanonicalName(currentUser.displayName || currentUser.username);
      if (curName) {
        const key = curName.toLowerCase();
        if (!map.has(key)) {
          map.set(key, { username: currentUser.username || curName, displayName: curName });
        }
      }
    }

    // 3. From uniqueCreators
    uniqueCreators.forEach((name) => {
      const canonical = resolveCanonicalName(name);
      if (canonical) {
        const key = canonical.toLowerCase();
        if (!map.has(key)) {
          map.set(key, { username: canonical, displayName: canonical });
        }
      }
    });

    // 4. From userColors (only add if not already mapped)
    if (userColors) {
      Object.keys(userColors).forEach((name) => {
        const canonical = resolveCanonicalName(name);
        if (canonical) {
          const key = canonical.toLowerCase();
          if (!map.has(key)) {
            map.set(key, { username: canonical, displayName: canonical });
          }
        }
      });
    }

    return Array.from(map.values());
  }, [accountsList, userColors, uniqueCreators, currentUser, resolveCanonicalName]);

  // Count monthly leaves per staff member for the current month (駐場日子為工作出勤，不計入放假)
  const staffMonthlyLeavesCount = useMemo(() => {
    const counts: Record<string, { full: number; half: number; station: number; totalDays: number }> = {};
    
    calendarEvents.forEach(evt => {
      const parts = evt.date.split('-');
      if (parts.length < 2) return;
      const yr = parseInt(parts[0], 10);
      const mo = parseInt(parts[1], 10) - 1;
      if (yr === currentYear && mo === currentMonth) {
        const canonical = resolveCanonicalName(evt.createdBy);
        const key = canonical.toLowerCase();
        if (!counts[key]) {
          counts[key] = { full: 0, half: 0, station: 0, totalDays: 0 };
        }

        // 現場駐場為工作出勤值勤，絕對不計入放假
        if (isSiteStationEvent(evt)) {
          counts[key].station += 1;
          return;
        }

        if (evt.type === 'holiday_full' || (isHolidayEvent(evt) && !evt.type.includes('am') && !evt.type.includes('pm') && !evt.title.includes('半天') && !evt.title.includes('上午') && !evt.title.includes('下午'))) {
          counts[key].full += 1;
          counts[key].totalDays += 1;
        } else if (evt.type === 'holiday_am' || evt.type === 'holiday_pm' || (isHolidayEvent(evt) && (evt.title.includes('半天') || evt.title.includes('上午') || evt.title.includes('下午')))) {
          counts[key].half += 1;
          counts[key].totalDays += 0.5;
        }
      }
    });
    
    return counts;
  }, [calendarEvents, currentYear, currentMonth, resolveCanonicalName]);

  // Helper to compute duty status for a given date
  const getStaffDutyForDate = (dateStr: string) => {
    const dayEvts = calendarEvents.filter(e => e.date === dateStr);

    return allStaffMembers.map((staff) => {
      const staffName = staff.displayName;
      const staffUsername = staff.username;

      // Find events created by or matching this staff (canonical comparison)
      const userDayEvents = dayEvts.filter((e) => {
        const creatorCanonical = resolveCanonicalName(e.createdBy).toLowerCase();
        const staffNameLower = staffName.toLowerCase();
        const staffUsernameLower = staffUsername.toLowerCase();
        const staffPrefix = staffUsernameLower.split('@')[0];
        const rawCreatorLower = (e.createdBy || '').trim().toLowerCase();
        const rawPrefix = rawCreatorLower.split('@')[0];

        return (
          creatorCanonical === staffNameLower ||
          creatorCanonical === staffUsernameLower ||
          rawCreatorLower === staffNameLower ||
          rawCreatorLower === staffUsernameLower ||
          rawPrefix === staffPrefix ||
          rawPrefix === staffNameLower
        );
      });

      const holidayFullEvt = userDayEvents.find((e) => e.type === 'holiday_full' || (isHolidayEvent(e) && (e.title.includes('全天') || e.title.includes('全日') || (!e.title.includes('上午') && !e.title.includes('下午')))));
      const holidayAmEvt = userDayEvents.find((e) => e.type === 'holiday_am' || e.title.includes('上午放假') || e.title.includes('上午半天') || e.title.includes('上午休'));
      const holidayPmEvt = userDayEvents.find((e) => e.type === 'holiday_pm' || e.title.includes('下午放假') || e.title.includes('下午半天') || e.title.includes('下午休'));
      const stationEvt = userDayEvents.find((e) => isSiteStationEvent(e));
      const workTasks = userDayEvents.filter((e) => !isHolidayEvent(e) && !isSiteStationEvent(e));

      let statusType: 'working_full' | 'site_station' | 'holiday_am' | 'holiday_pm' | 'holiday_full' = 'working_full';
      let statusLabel = '正常上班';
      let location = '';
      let remarks = '';
      let stationTheme = null;

      if (holidayFullEvt) {
        statusType = 'holiday_full';
        statusLabel = '全日放假';
        remarks = holidayFullEvt.remarks || '';
      } else if (holidayAmEvt) {
        statusType = 'holiday_am';
        statusLabel = '下午上班 (上午休)';
        remarks = holidayAmEvt.remarks || '';
      } else if (holidayPmEvt) {
        statusType = 'holiday_pm';
        statusLabel = '上午上班 (下午休)';
        remarks = holidayPmEvt.remarks || '';
      } else if (stationEvt) {
        statusType = 'site_station';
        location = stationEvt.location || '現場';
        statusLabel = `全日駐場 · ${location}`;
        remarks = stationEvt.remarks || '';
        stationTheme = getStationLocationTheme(stationEvt.location, stationEvt.title);
      } else {
        statusType = 'working_full';
        statusLabel = '正常上班 (當值)';
      }

      const palette = getUserColorPalette(
        staffName,
        userColors?.[staffName] ||
        userColors?.[staffUsername] ||
        userColors?.[staffName.toLowerCase()] ||
        userColors?.[staffUsername.toLowerCase()] ||
        userColors?.[resolveCanonicalName(staffName)]
      );

      return {
        staff,
        name: staffName,
        username: staffUsername,
        statusType,
        statusLabel,
        location,
        remarks,
        stationTheme,
        isWorking: statusType !== 'holiday_full',
        palette,
        workTasks,
        userDayEvents,
      };
    });
  };

  const selectedDateDutyList = useMemo(() => {
    return getStaffDutyForDate(selectedDateStr);
  }, [allStaffMembers, calendarEvents, selectedDateStr, userColors]);

  // Form State for creating/editing general events
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);
  const calendarDashboardRef = useRef<HTMLDivElement>(null);
  
  // Form fields
  const [formUser, setFormUser] = useState<string>('');
  const [formTitle, setFormTitle] = useState<string>('見客');
  const [formType, setFormType] = useState<'visit' | 'measure' | 'remeasure' | 'other' | 'holiday_full' | 'holiday_am' | 'holiday_pm' | 'site_station'>('visit');
  const [formDate, setFormDate] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [formTime, setFormTime] = useState<string>('10:00');
  const [formLocation, setFormLocation] = useState<string>('旺角');
  const [formRemarks, setFormRemarks] = useState<string>('');
  const [formFocusRemarks, setFormFocusRemarks] = useState<boolean>(false);

  // Initialize formUser when currentUser is available
  useEffect(() => {
    if (currentUser) {
      setFormUser(currentUser.displayName || currentUser.username || 'System');
    }
  }, [currentUser]);

  // Set defaults when subTab changes
  useEffect(() => {
    if (subTab === 'shifts') {
      setFormType('holiday_full');
      setFormTitle('放假 (全天)');
      setFormLocation('');
      setFormTime('00:00');
    } else {
      setFormType('visit');
      setFormTitle('見客');
      setFormLocation('旺角');
      setFormTime('10:00');
    }
  }, [subTab]);

  // Synchronize formDate with selectedDateStr when selected date changes (unless editing)
  useEffect(() => {
    if (!editingEventId) {
      setFormDate(selectedDateStr);
    }
  }, [selectedDateStr, editingEventId]);

  // Address warning/highlight trigger helper
  const isAddressRequired = formType === 'measure' || formType === 'remeasure';

  // --- Date Helper functions ---
  const getTodayDateString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  const getTomorrowDateString = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  };

  const getDayAfterTomorrowDateString = () => {
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    return `${dayAfter.getFullYear()}-${String(dayAfter.getMonth() + 1).padStart(2, '0')}-${String(dayAfter.getDate()).padStart(2, '0')}`;
  };

  // Navigating months
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleGoToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
  };

  // Generate 42 calendar grid days
  const gridDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday, 6 is Saturday
    
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    
    const grid = [];
    
    // Previous month padding days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      grid.push({
        dateString: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        day: d,
        isCurrentMonth: false
      });
    }
    
    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      grid.push({
        dateString: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        day: d,
        isCurrentMonth: true
      });
    }
    
    // Next month padding days to complete 42 grid slots
    const remaining = 42 - grid.length;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      grid.push({
        dateString: `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        day: d,
        isCurrentMonth: false
      });
    }
    
    return grid;
  }, [currentYear, currentMonth]);

  // Filter general calendar events by search query, "只顯示自己" toggle, "顯示自己假期" toggle, and member filter
  const filteredCalendarEvents = useMemo(() => {
    let list = calendarEvents;
    const myLabel = currentUser ? (currentUser.displayName || currentUser.username || 'System') : '';
    
    // Filter by subTab mode
    if (subTab === 'shifts') {
      // In shifts/duty tab (員工輪班與駐場表), show both leave and full-day stationing
      list = list.filter(evt => isHolidayEvent(evt) || isSiteStationEvent(evt));
    } else {
      // In general calendar (公司總行事曆), show business events and stationing events
      // If showMyLeaves is active, ALSO include current user's leave events!
      if (showMyLeaves && currentUser) {
        list = list.filter(evt => !isHolidayEvent(evt) || (isHolidayEvent(evt) && evt.createdBy === myLabel));
      } else {
        list = list.filter(evt => !isHolidayEvent(evt));
      }
    }
    
    // Filter by member filter if active, otherwise check own events toggle
    if (selectedMemberFilter) {
      const filterCanonical = resolveCanonicalName(selectedMemberFilter).toLowerCase();
      list = list.filter(evt => resolveCanonicalName(evt.createdBy).toLowerCase() === filterCanonical);
    } else if (onlyShowOwnEvents && currentUser) {
      const myCanonical = resolveCanonicalName(myLabel).toLowerCase();
      list = list.filter(evt => resolveCanonicalName(evt.createdBy).toLowerCase() === myCanonical);
    }

    if (!generalSearchQuery.trim()) return list;
    const q = generalSearchQuery.trim().toLowerCase();
    return list.filter(evt => {
      const titleClean = evt.title.replace(/^\[.*?\]\s*/, '');
      const matchesTitle = titleClean.toLowerCase().includes(q) || evt.title.toLowerCase().includes(q);
      const matchesLocation = evt.location?.toLowerCase().includes(q) || false;
      const matchesRemarks = evt.remarks?.toLowerCase().includes(q) || false;
      const matchesCreator = evt.createdBy?.toLowerCase().includes(q) || false;
      return matchesTitle || matchesLocation || matchesRemarks || matchesCreator;
    });
  }, [calendarEvents, generalSearchQuery, onlyShowOwnEvents, selectedMemberFilter, currentUser, subTab, showMyLeaves]);

  // Group events by date for fast lookup in grid dots
  const eventsByDate = useMemo(() => {
    const mapping: Record<string, CalendarEvent[]> = {};
    filteredCalendarEvents.forEach(evt => {
      if (!mapping[evt.date]) mapping[evt.date] = [];
      mapping[evt.date].push(evt);
    });

    // Sort each day's events: prioritize stationing (註場/駐場) events first
    Object.keys(mapping).forEach(d => {
      mapping[d].sort((a, b) => {
        const aStation = isSiteStationEvent(a);
        const bStation = isSiteStationEvent(b);
        if (aStation && !bStation) return -1;
        if (!aStation && bStation) return 1;
        return a.time.localeCompare(b.time);
      });
    });

    return mapping;
  }, [filteredCalendarEvents]);

  // Set of dates where currentUser has a holiday/leave event
  const myLeaveDates = useMemo(() => {
    if (!currentUser) return new Set<string>();
    const myCanonical = resolveCanonicalName(currentUser.displayName || currentUser.username || '').toLowerCase();
    const set = new Set<string>();
    calendarEvents.forEach(evt => {
      if (isHolidayEvent(evt)) {
        const evtCanonical = resolveCanonicalName(evt.createdBy).toLowerCase();
        if (evtCanonical === myCanonical) {
          set.add(evt.date);
        }
      }
    });
    return set;
  }, [calendarEvents, currentUser, resolveCanonicalName]);

  // Chronological list of filtered events in the current month (for List View)
  const currentMonthEvents = useMemo(() => {
    return filteredCalendarEvents.filter(evt => {
      const parts = evt.date.split('-');
      if (parts.length < 2) return false;
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      return year === currentYear && (month - 1) === currentMonth;
    }).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      const aStation = isSiteStationEvent(a);
      const bStation = isSiteStationEvent(b);
      if (aStation && !bStation) return -1;
      if (!aStation && bStation) return 1;
      return a.time.localeCompare(b.time);
    });
  }, [filteredCalendarEvents, currentYear, currentMonth]);

  // Events on selected day
  const selectedDayEvents = useMemo(() => {
    return eventsByDate[selectedDateStr] || [];
  }, [eventsByDate, selectedDateStr]);

  // --- Quick Template Selection Handler ---
  const handleApplyTemplate = (type: 'visit' | 'measure' | 'remeasure' | 'other' | 'holiday_full' | 'holiday_am' | 'holiday_pm' | 'site_station') => {
    setFormType(type);
    setFormFocusRemarks(false);

    if (type === 'visit') {
      setFormTitle('見客');
      if (!formLocation) setFormLocation('旺角');
    } else if (type === 'measure') {
      setFormTitle('現場度尺');
      if (!formLocation) setFormLocation('旺角');
    } else if (type === 'remeasure') {
      setFormTitle('現場覆尺');
      if (!formLocation) setFormLocation('旺角');
    } else if (type === 'site_station') {
      setFormTitle('全日駐場');
      if (!formLocation) setFormLocation('屯門');
      setFormTime('08:30');
    } else if (type === 'holiday_full') {
      setFormTitle('放假 (全天)');
      setFormLocation('');
      setFormTime('00:00');
    } else if (type === 'holiday_am') {
      setFormTitle('放假 (上午半天)');
      setFormLocation('');
      setFormTime('09:00');
    } else if (type === 'holiday_pm') {
      setFormTitle('放假 (下午半天)');
      setFormLocation('');
      setFormTime('14:00');
    } else {
      setFormTitle('一般行程');
    }
  };

  // --- Save / Edit / Delete General Event ---
  const handleOpenNewForm = () => {
    if (!hasPermission(currentUser, 'feat_manage_calendar_events')) {
      setPermissionError('您沒有建立/修改行事曆行程的權限');
      return;
    }
    setEditingEventId(null);
    setFormEnableNotification(true);
    setModalFormEnableNotification(true);
    const targetDate = selectedDateStr || getTodayDateString();
    setMobilePopUpDate(targetDate);
    setSelectedDateStr(targetDate);

    const userName = currentUser ? (currentUser.displayName || currentUser.username || '') : '';
    setModalFormUser(userName);
    setFormUser(userName);

    if (subTab === 'shifts') {
      setModalFormTitle('放假 (全天)');
      setModalFormType('holiday_full');
      setModalFormTime('00:00');
      setModalFormLocation('');
      setModalFormMode('quick_shift');
    } else {
      setModalFormTitle('見客');
      setModalFormType('visit');
      setModalFormTime('10:00');
      setModalFormLocation('旺角');
      setModalFormMode('add_event');
    }
    setModalFormRemarks('');
    setIsSelectingStationLocation(false);
    setCustomStationLocation('');
    setIsMobilePopUpOpen(true);
  };

  const handleEditEvent = (evt: CalendarEvent) => {
    if (!hasPermission(currentUser, 'feat_manage_calendar_events')) {
      setPermissionError('您沒有建立/修改行事曆行程的權限');
      return;
    }
    setEditingEventId(evt.id);
    setFormEnableNotification(evt.enableNotification !== false);
    setModalFormEnableNotification(evt.enableNotification !== false);
    
    // Strip user prefix if present, e.g. [Username] Item -> Item
    let cleanTitle = evt.title;
    const prefixRegex = /^\[.*?\]\s*/;
    cleanTitle = cleanTitle.replace(prefixRegex, '');
    
    const eventUser = evt.createdBy || currentUser?.displayName || currentUser?.username || '';
    setFormUser(eventUser);
    setFormTitle(cleanTitle);
    setFormType(evt.type);
    setFormDate(evt.date);
    setFormTime(evt.time || '10:00');
    setFormLocation(evt.location || '');
    setFormRemarks(evt.remarks || '');
    setFormFocusRemarks(evt.type === 'measure' || evt.type === 'remeasure');

    // Set modal pop-up state
    setModalFormUser(eventUser);
    setModalFormTitle(cleanTitle);
    setModalFormType(evt.type as any);
    setMobilePopUpDate(evt.date);
    setSelectedDateStr(evt.date);
    setModalFormTime(evt.time || '10:00');
    setModalFormLocation(evt.location || '');
    setModalFormRemarks(evt.remarks || '');

    setModalFormMode('add_event');
    setIsMobilePopUpOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission(currentUser, 'feat_manage_calendar_events')) {
      setPermissionError('您沒有建立/修改行事曆行程的權限');
      return;
    }

    // Use selected formUser or current user's name or username
    const userLabel = formUser.trim() || currentUser?.displayName || currentUser?.username || 'System';
    
    // Strip any existing prefix first
    let rawTitle = formTitle.trim();
    if (!rawTitle) {
      const typeLabels: Record<string, string> = {
        visit: '見客',
        measure: '現場度尺',
        remeasure: '現場覆尺',
        site_station: '全日駐場',
        other: '其他行程',
        holiday_full: '放假 (全天)',
        holiday_am: '放假 (上午半天)',
        holiday_pm: '放假 (下午半天)'
      };
      rawTitle = typeLabels[formType] || '未命名行程';
    } else {
      const prefixRegex = /^\[.*?\]\s*/;
      rawTitle = rawTitle.replace(prefixRegex, '');
    }
    
    // Format: "用戶名" + "項目內容"
    const finalTitle = `[${userLabel}] ${rawTitle}`;

    const newEvent: CalendarEvent = {
      id: editingEventId || `event_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: finalTitle,
      type: formType,
      date: formDate || selectedDateStr || getTodayDateString(), // Secure date fallback
      time: formTime || '10:00',
      location: formLocation.trim() || undefined,
      remarks: formRemarks.trim() || undefined,
      createdBy: userLabel,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      enableNotification: formEnableNotification,
      notifyTime: '08:00'
    };

    await onSaveEvent(newEvent);
    
    // Reset form after saving
    setEditingEventId(null);
    if (subTab === 'shifts') {
      setFormType('holiday_full');
      setFormTitle('放假 (全天)');
      setFormLocation('');
      setFormTime('00:00');
    } else {
      setFormType('visit');
      setFormTitle('見客');
      setFormLocation('旺角');
      setFormTime('10:00');
    }
    setFormRemarks('');
    setFormFocusRemarks(false);
    setIsFormOpen(false);

    // Scroll up to calendar in mobile view after successfully adding/saving the event
    if (isMobile) {
      setTimeout(() => {
        calendarDashboardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  };

  const handleSaveModalEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission(currentUser, 'feat_manage_calendar_events')) {
      setPermissionError('您沒有建立/修改行事曆行程的權限');
      return;
    }

    const userLabel = modalFormUser.trim() || currentUser?.displayName || currentUser?.username || 'System';
    let rawTitle = modalFormTitle.trim();
    if (!rawTitle) {
      const typeLabels: Record<string, string> = {
        visit: '見客',
        measure: '現場度尺',
        remeasure: '現場覆尺',
        site_station: '全日駐場',
        other: '其他行程',
        holiday_full: '放假 (全天)',
        holiday_am: '放假 (上午半天)',
        holiday_pm: '放假 (下午半天)'
      };
      rawTitle = typeLabels[modalFormType] || '未命名行程';
    } else {
      rawTitle = rawTitle.replace(/^\[.*?\]\s*/, '');
    }
    const finalTitle = `[${userLabel}] ${rawTitle}`;

    const newEvent: CalendarEvent = {
      id: editingEventId || `event_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: finalTitle,
      type: modalFormType,
      date: mobilePopUpDate,
      time: modalFormTime || '10:00',
      location: modalFormLocation.trim() || undefined,
      remarks: modalFormRemarks.trim() || undefined,
      createdBy: userLabel,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      enableNotification: modalFormEnableNotification,
      notifyTime: '08:00'
    };

    await onSaveEvent(newEvent);
    setEditingEventId(null);
    setModalFormMode('none');
  };

  const handleQuickRegisterShiftInModal = async (
    type: 'holiday_full' | 'holiday_am' | 'holiday_pm' | 'site_station', 
    location = '',
    targetUser?: string
  ) => {
    if (!hasPermission(currentUser, 'feat_manage_calendar_events')) {
      setPermissionError('您沒有登記輪班/休假的權限');
      return;
    }
    const userLabel = targetUser || modalFormUser || currentUser?.displayName || currentUser?.username || 'System';
    
    let rawTitle = '放假 (全天)';
    let defaultTime = '00:00';
    let defaultLoc = location;

    if (type === 'holiday_am') {
      rawTitle = '放假 (上午半天)';
      defaultTime = '09:00';
    } else if (type === 'holiday_pm') {
      rawTitle = '放假 (下午半天)';
      defaultTime = '14:00';
    } else if (type === 'site_station') {
      rawTitle = defaultLoc ? `全日駐場 (${defaultLoc})` : '全日駐場';
      defaultTime = '08:30';
      if (!defaultLoc) defaultLoc = '屯門';
    }

    const finalTitle = `[${userLabel}] ${rawTitle}`;

    // Find any existing holiday or site station event for this user on this date
    const existingEvt = calendarEvents.find(e => 
      e.date === mobilePopUpDate && 
      (isHolidayEvent(e) || isSiteStationEvent(e)) && 
      resolveCanonicalName(e.createdBy).toLowerCase() === resolveCanonicalName(userLabel).toLowerCase()
    );

    const newEvent: CalendarEvent = {
      id: existingEvt ? existingEvt.id : `event_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: finalTitle,
      type,
      date: mobilePopUpDate,
      time: defaultTime,
      location: defaultLoc || undefined,
      createdBy: userLabel,
      createdAt: existingEvt ? existingEvt.createdAt : Date.now(),
      updatedAt: Date.now(),
      enableNotification: true,
      notifyTime: '08:00'
    };

    await onSaveEvent(newEvent);
    setModalFormMode('none');
    setIsSelectingStationLocation(false);
    setCustomStationLocation('');
  };

  const handleCancelStaffShiftInModal = async (staffName: string) => {
    if (!hasPermission(currentUser, 'feat_manage_calendar_events')) {
      setPermissionError('您沒有刪除/修改行事曆行程的權限');
      return;
    }
    const existingEvts = calendarEvents.filter(e => 
      e.date === mobilePopUpDate && 
      (isHolidayEvent(e) || isSiteStationEvent(e)) && 
      resolveCanonicalName(e.createdBy).toLowerCase() === resolveCanonicalName(staffName).toLowerCase()
    );

    for (const evt of existingEvts) {
      await onDeleteEvent(evt.id);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!hasPermission(currentUser, 'feat_manage_calendar_events')) {
      setPermissionError('您沒有刪除行事曆行程的權限');
      return;
    }
    await onDeleteEvent(id);
  };

  // --- Consolidated Engineering Schedule Calculation ---
  // Calculates and returns list of active quotations with schedules enabled
  const projectsWithSchedules = useMemo(() => {
    return quotations.filter(q => {
      // Must have scheduleEnabled and active construction status
      if (!q.scheduleEnabled || !q.scheduleStartDate) return false;
      if (q.status === 'cancelled' || q.status === 'completed') return false;
      
      // Filter by search query (project id, customer name, or address)
      if (engSearchQuery.trim()) {
        const query = engSearchQuery.toLowerCase();
        const matchesName = q.customerName.toLowerCase().includes(query);
        const matchesAddress = q.address.toLowerCase().includes(query);
        const matchesId = q.id.toLowerCase().includes(query);
        return matchesName || matchesAddress || matchesId;
      }
      return true;
    });
  }, [quotations, engSearchQuery]);

  // Consolidates active schedule steps for construction timeline visualization
  const consolidatedConstructionTimeline = useMemo(() => {
    const list: Array<{
      quoteId: string;
      internalNumber: string;
      customerName: string;
      address: string;
      stepName: string;
      startDate: string;
      endDate: string;
      days: number;
      isOverdue: boolean;
      stepIndex: number;
    }> = [];

    projectsWithSchedules.forEach(quote => {
      if (!quote.scheduleSteps) return;
      
      // Calculate dates chronologically for this quotation
      let currentDateObj = new Date(quote.scheduleStartDate!);
      
      quote.scheduleSteps.forEach((step, stepIndex) => {
        const startStr = currentDateObj.toISOString().split('T')[0];
        
        // Add step duration days
        const endDayObj = new Date(currentDateObj);
        endDayObj.setDate(endDayObj.getDate() + step.days - 1);
        const endStr = endDayObj.toISOString().split('T')[0];
        
        // Prepare next step start date
        currentDateObj = new Date(endDayObj);
        currentDateObj.setDate(currentDateObj.getDate() + 1);

        // Check if step is overdue (i.e. if end date is past and quotation isn't completed)
        // If already paid, we cancel the overdue reminder
        const isCurrentStagePaid = quote.paymentStages && quote.paymentStages[stepIndex]
          ? quote.paymentStages[stepIndex].isPaid
          : false;

        const isFullyPaid = quote.paymentStages && quote.paymentStages.length > 0
          ? quote.paymentStages.every(stage => stage.isPaid)
          : false;

        const isPaid = isCurrentStagePaid || isFullyPaid;

        const todayStr = getTodayDateString();
        const isOverdue = endStr < todayStr && quote.status !== 'completed' && !isPaid;

        list.push({
          quoteId: quote.id,
          internalNumber: quote.internalNumber || '',
          customerName: quote.customerName,
          address: quote.address,
          stepName: step.name,
          startDate: startStr,
          endDate: endStr,
          days: step.days,
          isOverdue,
          stepIndex
        });
      });
    });

    // Sort chronologically by start date
    return list.sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [projectsWithSchedules]);

  // Group construction steps by date
  const constructionStepsByDate = useMemo(() => {
    const mapping: Record<string, typeof consolidatedConstructionTimeline> = {};
    consolidatedConstructionTimeline.forEach(step => {
      // Populate for every date between startDate and endDate inclusive
      let start = new Date(step.startDate);
      const end = new Date(step.endDate);
      
      while (start <= end) {
        const dStr = start.toISOString().split('T')[0];
        if (!mapping[dStr]) mapping[dStr] = [];
        mapping[dStr].push(step);
        
        // Next day
        start.setDate(start.getDate() + 1);
      }
    });
    return mapping;
  }, [consolidatedConstructionTimeline]);

  // Get active construction steps on selected date
  const selectedDayConstructionSteps = useMemo(() => {
    return constructionStepsByDate[selectedDateStr] || [];
  }, [constructionStepsByDate, selectedDateStr]);


  return (
    <div ref={calendarDashboardRef} className="space-y-4" id="calendar-dashboard">
      {permissionError && (
        <div className="bg-rose-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md flex items-center justify-between animate-fade-in text-left">
          <div className="flex items-center gap-2">
            <span className="text-base">⛔</span>
            <span>{permissionError}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setPermissionError(null)}
            className="text-white/80 hover:text-white font-black text-sm px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
      {/* Visual Header / Subtabs Switcher (3 equal horizontal lists across screen) */}
      <div className="bg-white border border-gray-200 rounded-lg p-1 shadow-xs mb-2">
        <div className="grid grid-cols-3 w-full bg-slate-100 p-1 rounded-md border border-slate-200/60 select-none gap-1">
          <button
            type="button"
            onClick={() => setSubTab('general')}
            className={`py-1.5 px-2 rounded text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 w-full ${
              subTab === 'general'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">公司行事曆</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('shifts')}
            className={`py-1.5 px-2 rounded text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 w-full ${
              subTab === 'shifts'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-950 hover:bg-rose-100/30'
            }`}
          >
            <Coffee className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">員工輪班表</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('engineering')}
            className={`py-1.5 px-2 rounded text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 w-full ${
              subTab === 'engineering'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Hammer className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">工程日曆</span>
          </button>
        </div>
      </div>

      {/* --- SUBTAB VIEW 1: GENERAL & SHIFT CALENDAR LAYOUT (公司行事曆 & 員工輪班表) --- */}
      {(subTab === 'general' || subTab === 'shifts') && (
        <div 
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-left font-sans"
        >
          
          {/* LEFT PANEL: Interactive Grid and Day Listing */}
          <div className="lg:col-span-8 space-y-4 min-w-0 max-w-full">
            <div className="bg-white border border-gray-200 rounded-xl p-3.5 md:p-4 shadow-sm min-w-0 max-w-full overflow-hidden">
              

              {/* Calendar Grid Header */}
              <div className="flex flex-col gap-2.5 mb-4 border-b border-slate-100 pb-3 min-w-0 max-w-full">
                {/* Upper Row: Title, Navigations, and Action Toggles */}
                <div className="flex items-center justify-between gap-3 min-w-0 max-w-full flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <CalendarIcon className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="whitespace-nowrap">{currentYear}年 {currentMonth + 1}月</span>
                    </h3>
                    <button
                      type="button"
                      onClick={handleGoToToday}
                      className="px-2 py-0.5 text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded font-bold active:scale-95 transition-all cursor-pointer shrink-0"
                    >
                      今天
                    </button>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={handlePrevMonth}
                        className="p-1 border border-slate-200 rounded hover:bg-slate-50 text-slate-600 cursor-pointer active:scale-95 transition-all"
                        title="上個月"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextMonth}
                        className="p-1 border border-slate-200 rounded hover:bg-slate-50 text-slate-600 cursor-pointer active:scale-95 transition-all"
                        title="下個月"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Member Leave / Holiday Selector Dropdown Button (左側按鈕：手機版僅顯示Icon，點擊彈出全螢幕POP UP視窗) */}
                    <div className="relative" ref={memberDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsMemberDropdownOpen(!isMemberDropdownOpen)}
                        className={`h-7 px-2 sm:px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border shadow-3xs active:scale-95 shrink-0 ${
                          selectedMemberFilter
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs hover:bg-amber-700'
                            : 'bg-white hover:bg-amber-50/60 text-slate-700 border-slate-200 hover:border-amber-300'
                        }`}
                        title="點擊查看成員名單並篩選排程"
                      >
                        <Users className={`w-3.5 h-3.5 ${selectedMemberFilter ? 'text-white' : 'text-amber-600'}`} />
                        <span className="font-extrabold truncate max-w-[110px] sm:max-w-none hidden sm:inline">
                          {selectedMemberFilter ? `${selectedMemberFilter}` : '成員'}
                        </span>
                        <ChevronDown className={`w-3 h-3 transition-transform hidden sm:inline ${isMemberDropdownOpen ? 'rotate-180' : ''} ${selectedMemberFilter ? 'text-white' : 'text-slate-400'}`} />
                        {selectedMemberFilter && (
                          <span className="sm:hidden w-1.5 h-1.5 rounded-full bg-amber-200 animate-pulse" />
                        )}
                      </button>

                      {/* Mobile View: Pop Up Screen (全螢幕/置中彈窗 Pop-up Modal) */}
                      {isMemberDropdownOpen && (
                        <>
                          {/* Mobile Modal Backdrop & Pop-Up Screen */}
                          <div className="sm:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3.5 animate-in fade-in duration-150">
                            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150 text-left">
                              {/* Modal Header */}
                              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/80 shrink-0">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                                    <Users className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h3 className="text-xs font-black text-slate-800 leading-tight">成員名單</h3>
                                    <p className="text-[10px] text-slate-400 font-bold">點選成員在輪班表中查看假期 (共 {allStaffMembers.length} 人)</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setIsMemberDropdownOpen(false)}
                                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center cursor-pointer transition-colors active:scale-95"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Search Input in Modal */}
                              {allStaffMembers.length > 4 && (
                                <div className="p-3 border-b border-slate-100 bg-white shrink-0">
                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                    <input
                                      type="text"
                                      placeholder="搜尋成員姓名..."
                                      value={memberSearchQuery}
                                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                                      className="w-full pl-8.5 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-medium text-slate-800 placeholder-slate-400"
                                    />
                                    {memberSearchQuery && (
                                      <button
                                        type="button"
                                        onClick={() => setMemberSearchQuery('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Member List Scrollable in Modal */}
                              <div className="p-3 space-y-1.5 overflow-y-auto flex-1 custom-scrollbar">
                                {/* All Members Option */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedMemberFilter(null);
                                    setOnlyShowOwnEvents(false);
                                    setIsMemberDropdownOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                    selectedMemberFilter === null && !onlyShowOwnEvents
                                      ? 'bg-amber-50 text-amber-900 border-amber-300 font-black shadow-xs'
                                      : 'bg-white text-slate-700 border-slate-100 hover:bg-slate-50'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                                      全
                                    </div>
                                    <span className="text-xs">全部成員 (顯示全員排程)</span>
                                  </div>
                                  {selectedMemberFilter === null && !onlyShowOwnEvents && (
                                    <Check className="w-4 h-4 text-amber-600 shrink-0" />
                                  )}
                                </button>

                                {/* Individual Members */}
                                {allStaffMembers
                                  .filter(staff => {
                                    if (!memberSearchQuery) return true;
                                    const q = memberSearchQuery.toLowerCase();
                                    return (
                                      staff.displayName.toLowerCase().includes(q) ||
                                      staff.username.toLowerCase().includes(q)
                                    );
                                  })
                                  .map(staff => {
                                    const palette = getUserColorPalette(staff.displayName, userColors?.[staff.displayName]);
                                    const isSelected = selectedMemberFilter === staff.displayName;
                                    const isMe = staff.displayName === (currentUser?.displayName || currentUser?.username || 'System');
                                    const leaveStats = staffMonthlyLeavesCount[staff.displayName.toLowerCase()] || staffMonthlyLeavesCount[staff.username.toLowerCase()];
                                    const totalLeaveDays = leaveStats?.totalDays || 0;
                                    const stationDays = leaveStats?.station || 0;

                                    return (
                                      <button
                                        key={staff.username || staff.displayName}
                                        type="button"
                                        onClick={() => {
                                          setSelectedMemberFilter(staff.displayName);
                                          setOnlyShowOwnEvents(false);
                                          setIsMemberDropdownOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                          isSelected
                                            ? 'bg-amber-50 text-amber-950 border-amber-300 font-extrabold shadow-3xs'
                                            : 'bg-white text-slate-700 border-slate-100 hover:bg-slate-50'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <div
                                            className="w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-3xs"
                                            style={{ backgroundColor: palette.hex }}
                                          >
                                            {staff.displayName.slice(0, 1).toUpperCase()}
                                          </div>
                                          <div className="flex items-center gap-1.5 min-w-0 truncate">
                                            <span className="truncate text-xs font-bold">{staff.displayName}</span>
                                            {isMe && (
                                              <span className="text-[8.5px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-bold shrink-0 border border-slate-200">
                                                我
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                          {stationDays > 0 && (
                                            <span className="text-[9.5px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded-md font-mono font-bold">
                                              📍 駐場 {stationDays}
                                            </span>
                                          )}
                                          {totalLeaveDays > 0 ? (
                                            <span className="text-[9.5px] bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded-md font-mono font-bold">
                                              放假 {totalLeaveDays} 天
                                            </span>
                                          ) : (
                                            <span className="text-[9px] text-slate-400 font-normal">
                                              無休假
                                            </span>
                                          )}
                                          {isSelected && <Check className="w-4 h-4 text-amber-600 ml-1 shrink-0" />}
                                        </div>
                                      </button>
                                    );
                                  })}
                              </div>

                              {/* Modal Footer */}
                              <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                                {selectedMemberFilter ? (
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-[11px] text-slate-500 font-medium">已選:</span>
                                    <strong className="text-xs text-amber-800 truncate">{selectedMemberFilter}</strong>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-400">目前顯示全體成員</span>
                                )}
                                <div className="flex items-center gap-2">
                                  {selectedMemberFilter && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedMemberFilter(null);
                                        setIsMemberDropdownOpen(false);
                                      }}
                                      className="text-xs font-bold text-rose-600 hover:text-rose-800 px-2 py-1 rounded bg-rose-50 border border-rose-200"
                                    >
                                      清除篩選
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setIsMemberDropdownOpen(false)}
                                    className="text-xs font-bold text-slate-700 hover:text-slate-900 px-3 py-1 rounded-lg bg-white border border-slate-200 shadow-3xs"
                                  >
                                    關閉
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Desktop View: Dropdown Menu (桌面端下拉選單) */}
                          <div className="hidden sm:block absolute left-0 top-full mt-1.5 w-64 sm:w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-2 overflow-hidden animate-in fade-in zoom-in-95 duration-100 text-left">
                            {/* Dropdown Header */}
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 px-1">
                              <div className="flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-amber-600" />
                                <span className="text-xs font-bold text-slate-800">成員名單</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-bold">
                                共 {allStaffMembers.length} 人
                              </span>
                            </div>

                            {/* Member Search input if > 5 members */}
                            {allStaffMembers.length > 5 && (
                              <div className="mb-2 px-1">
                                <div className="relative">
                                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                                  <input
                                    type="text"
                                    placeholder="搜尋成員姓名..."
                                    value={memberSearchQuery}
                                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                                    className="w-full pl-7 pr-2 py-1 text-2xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-amber-500 font-medium"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Member List */}
                            <div className="space-y-1 max-h-60 overflow-y-auto pr-0.5 custom-scrollbar">
                              {/* All Members Option */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedMemberFilter(null);
                                  setOnlyShowOwnEvents(false);
                                  setIsMemberDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  selectedMemberFilter === null && !onlyShowOwnEvents
                                    ? 'bg-amber-50 text-amber-900 border border-amber-200/80 font-extrabold'
                                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-black">
                                    全
                                  </div>
                                  <span>全部成員 (顯示全員)</span>
                                </div>
                                {selectedMemberFilter === null && !onlyShowOwnEvents && (
                                  <Check className="w-3.5 h-3.5 text-amber-600" />
                                )}
                              </button>

                              {/* Individual Members */}
                              {allStaffMembers
                                .filter(staff => {
                                  if (!memberSearchQuery) return true;
                                  const q = memberSearchQuery.toLowerCase();
                                  return (
                                    staff.displayName.toLowerCase().includes(q) ||
                                    staff.username.toLowerCase().includes(q)
                                  );
                                })
                                .map(staff => {
                                  const palette = getUserColorPalette(staff.displayName, userColors?.[staff.displayName]);
                                  const isSelected = selectedMemberFilter === staff.displayName;
                                  const isMe = staff.displayName === (currentUser?.displayName || currentUser?.username || 'System');
                                  const leaveStats = staffMonthlyLeavesCount[staff.displayName.toLowerCase()] || staffMonthlyLeavesCount[staff.username.toLowerCase()];
                                  const totalLeaveDays = leaveStats?.totalDays || 0;
                                  const stationDays = leaveStats?.station || 0;

                                  return (
                                    <button
                                      key={staff.username || staff.displayName}
                                      type="button"
                                      onClick={() => {
                                        setSelectedMemberFilter(staff.displayName);
                                        setOnlyShowOwnEvents(false);
                                        setIsMemberDropdownOpen(false);
                                      }}
                                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        isSelected
                                          ? 'bg-amber-50 text-amber-900 border border-amber-300 font-extrabold shadow-3xs'
                                          : 'text-slate-700 hover:bg-slate-50'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div
                                          className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[9px] font-black shrink-0 shadow-3xs"
                                          style={{ backgroundColor: palette.hex }}
                                        >
                                          {staff.displayName.slice(0, 1).toUpperCase()}
                                        </div>
                                        <div className="flex items-center gap-1.5 min-w-0 truncate">
                                          <span className="truncate">{staff.displayName}</span>
                                          {isMe && (
                                            <span className="text-[8px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-bold shrink-0 border border-slate-200">
                                              我
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0">
                                        {stationDays > 0 && (
                                          <span className="text-[9.5px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded-full font-mono font-bold" title="現場駐場出勤天數（不計入放假）">
                                            📍 駐場 {stationDays} 天
                                          </span>
                                        )}
                                        {totalLeaveDays > 0 ? (
                                          <span className="text-[9.5px] bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.2 rounded-full font-mono font-bold">
                                            放假 {totalLeaveDays} 天
                                          </span>
                                        ) : (
                                          <span className="text-[9px] text-slate-400 font-normal">
                                            無休假
                                          </span>
                                        )}
                                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 ml-1" />}
                                      </div>
                                    </button>
                                  );
                                })}
                            </div>

                            {/* Dropdown Footer */}
                            {selectedMemberFilter && (
                              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between px-1">
                                <span className="text-[10px] text-slate-500 font-medium">
                                  已選取: <strong className="text-amber-700">{selectedMemberFilter}</strong>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedMemberFilter(null);
                                    setIsMemberDropdownOpen(false);
                                  }}
                                  className="text-[10px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                                >
                                  清除篩選
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Top Right Action Controls: Toggles & Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    {/* "只顯示自己" Filter Button */}
                    {currentUser && (
                      <button
                        type="button"
                        onClick={() => {
                          setOnlyShowOwnEvents(!onlyShowOwnEvents);
                          setSelectedMemberFilter(null);
                        }}
                        className={`h-7 px-2 sm:px-2.5 rounded text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all border shrink-0 ${
                          onlyShowOwnEvents && !selectedMemberFilter
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs hover:bg-amber-700'
                            : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                        title="只顯示自己"
                      >
                        <User className={`w-3.5 h-3.5 ${onlyShowOwnEvents && !selectedMemberFilter ? 'text-white' : 'text-slate-400'}`} />
                        <span className="hidden sm:inline">只顯示自己</span>
                      </button>
                    )}

                    {/* "顯示自己假期" Filter Button (僅在公司總行事曆頁面顯示) */}
                    {currentUser && subTab === 'general' && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowMyLeaves(!showMyLeaves);
                        }}
                        className={`h-7 px-2 sm:px-2.5 rounded text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all border shrink-0 ${
                          showMyLeaves
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs hover:bg-rose-700'
                            : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                        title="顯示自己假期"
                      >
                        <Coffee className={`w-3.5 h-3.5 ${showMyLeaves ? 'text-white' : 'text-rose-500'}`} />
                        <span className="hidden sm:inline">顯示自己假期</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Lower Row: Event Search Input */}
                <div className="relative w-full h-8.5 min-w-0 max-w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="快速搜尋日程/建立者/地點..."
                    value={generalSearchQuery}
                    onChange={(e) => setGeneralSearchQuery(e.target.value)}
                    className="w-full h-full pl-9 pr-8 text-xs bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200/80 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 rounded-xl focus:outline-none transition-all font-semibold text-slate-700 placeholder-slate-400 min-w-0 max-w-full"
                  />
                  {generalSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setGeneralSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-slate-600 cursor-pointer flex items-center justify-center p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {showMyLeaves && currentUser && subTab === 'general' && (
                  <div className="mt-2 hidden sm:flex items-center justify-between bg-rose-50/90 border border-rose-300 px-2.5 py-1.5 rounded-lg text-2xs text-rose-950 font-bold text-left animate-fade-in shadow-xs">
                    <div className="flex items-center gap-1.5">
                      <span> <strong className="font-black text-rose-900">「顯示自己假期」已開啟</strong>：包含 ({currentUser.displayName || currentUser.username}) 之休假</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowMyLeaves(false)}
                      className="text-rose-700 hover:text-rose-950 font-black cursor-pointer text-2xs bg-rose-100/70 hover:bg-rose-200 px-2 py-0.5 rounded-md transition-colors shrink-0 ml-2"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {selectedMemberFilter && (
                  <div className="mt-2 flex items-center justify-between bg-amber-50/90 border border-amber-300 px-2.5 py-1.5 rounded-lg text-xs text-amber-950 font-bold text-left animate-fade-in shadow-3xs flex-wrap gap-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                      <span>🎯 正在查看成員：<strong className="font-extrabold text-amber-900">{selectedMemberFilter}</strong> 的{subTab === 'shifts' ? '輪班與假期' : '行程安排'}</span>
                      {staffMonthlyLeavesCount[selectedMemberFilter.toLowerCase()] && (
                        <>
                          <span className="text-[10px] bg-white border border-rose-200 text-rose-800 px-1.5 py-0.2 rounded-full font-mono font-bold">
                            本月放假: {staffMonthlyLeavesCount[selectedMemberFilter.toLowerCase()].totalDays} 天
                          </span>
                          {staffMonthlyLeavesCount[selectedMemberFilter.toLowerCase()].station > 0 && (
                            <span className="text-[10px] bg-white border border-indigo-200 text-indigo-800 px-1.5 py-0.2 rounded-full font-mono font-bold">
                              現場駐場: {staffMonthlyLeavesCount[selectedMemberFilter.toLowerCase()].station} 天
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedMemberFilter(null)}
                      className="text-amber-800 hover:text-amber-950 hover:bg-amber-100 font-extrabold cursor-pointer text-[10.5px] bg-white border border-amber-300 px-2 py-0.5 rounded-md transition-all active:scale-95 shadow-3xs flex items-center gap-1 shrink-0 ml-auto"
                    >
                      <X className="w-3 h-3 text-amber-700" />
                      <span>清除篩選 (顯示全部)</span>
                    </button>
                  </div>
                )}


              </div>

              {generalViewMode === 'list' ? (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {currentMonthEvents.length === 0 ? (
                    <div className="py-20 text-center text-gray-450 bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-100">
                      <Search className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-500">本月無符合條件之日程</p>
                      <p className="text-[10px] text-gray-400 mt-1">請嘗試更換關鍵字或重設篩選。</p>
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-amber-500/20 ml-3 pl-5 space-y-4 py-1.5">
                      {currentMonthEvents.map((evt) => {
                        const isStation = isSiteStationEvent(evt);
                        const stTheme = isStation ? getStationLocationTheme(evt.location, evt.title) : null;
                        const isVisit = evt.type === 'visit';
                        const isMeasure = evt.type === 'measure';
                        const isRemeasure = evt.type === 'remeasure';
                        const isHolidayFull = evt.type === 'holiday_full';
                        const isHolidayAm = evt.type === 'holiday_am';
                        const isHolidayPm = evt.type === 'holiday_pm';
                        const isHoliday = isHolidayEvent(evt);
                        const palette = getUserColorPalette(evt.createdBy, userColors?.[evt.createdBy]);
                        const isSelected = selectedDateStr === evt.date;
                        const cleanTitle = evt.title.replace(/^\[.*?\]\s*/, '');

                        return (
                          <div 
                            key={evt.id} 
                            onClick={() => setSelectedDateStr(evt.date)}
                            className={`relative group p-3.5 bg-white border rounded-xl shadow-3xs cursor-pointer transition-all hover:shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 ${
                              isSelected 
                                ? 'border-amber-500 ring-1 ring-amber-500/20 bg-amber-50/10' 
                                : stTheme
                                ? stTheme.borderClass
                                : palette.border
                            }`}
                            style={{ 
                              borderLeftColor: stTheme ? stTheme.primaryHex : palette.hex,
                              backgroundColor: isSelected ? undefined : stTheme ? undefined : `${palette.hex}22`
                            }}
                          >
                            {/* Dot indicator on vertical timeline line */}
                            <span 
                              className="absolute -left-[27px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-white ring-2 transition-all"
                              style={{ 
                                backgroundColor: stTheme ? stTheme.primaryHex : palette.hex,
                                ringColor: isSelected ? '#d97706' : '#cbd5e1'
                              } as React.CSSProperties}
                            />

                            <div className="flex gap-2 min-w-0 flex-1">
                              <div className="min-w-0 flex-1 space-y-1">
                                {/* Line 1: Date + Time First + Title */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-mono font-black text-slate-500">{evt.date}</span>
                                  {!isHoliday && !isStation && (
                                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200/60">{evt.time}</span>
                                  )}
                                  <h4 className="text-xs font-extrabold text-slate-800">{cleanTitle}</h4>
                                  {isStation && (
                                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold border shadow-3xs ${stTheme?.badgeBgClass}`}>
                                      駐場 · {evt.location || stTheme?.name || '現場'}
                                    </span>
                                  )}
                                  {!isStation && isHoliday && (
                                    <span 
                                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${palette.border} ${palette.text}`}
                                      style={{ backgroundColor: palette.bgLight }}
                                    >
                                      {isHolidayFull ? '全天放假' : isHolidayAm ? '上午半天' : '下午半天'}
                                    </span>
                                  )}
                                </div>

                                {/* Line 2: User and Location */}
                                <div className="flex items-center gap-2 flex-wrap text-[10px]">
                                  <span className="font-bold">
                                    <span className={palette.text}>{evt.createdBy}</span>
                                  </span>
                                  {evt.location && (
                                    <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold border border-emerald-100 flex items-center gap-0.5">
                                      📍 {evt.location}
                                    </span>
                                  )}
                                </div>

                                {evt.remarks && (
                                  <p className="text-[10.5px] text-slate-500 mt-0.5 truncate max-w-md">{evt.remarks}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                              {!isStation && evt.location && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-0.5">
                                  <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>{evt.location}</span>
                                </span>
                              )}
                              <span className="text-[10px] text-gray-400 font-bold hover:text-amber-600 transition-colors">
                                點擊選取
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Day of Week Labels */}
                  <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center mb-1 sm:mb-1.5">
                    {['日', '一', '二', '三', '四', '五', '六'].map((label, idx) => (
                      <span key={idx} className={`text-[10.5px] sm:text-[11px] font-bold py-1 ${idx === 0 || idx === 6 ? 'text-amber-600' : 'text-gray-400'}`}>
                        {label}
                      </span>
                    ))}
                  </div>

                  {/* Month Grid Cell Loop */}
                  <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                    {gridDays.map((cell, idx) => {
                      const dayEvents = eventsByDate[cell.dateString] || [];
                      const isSelected = selectedDateStr === cell.dateString;
                      const isToday = cell.dateString === getTodayDateString();
                      const isMyLeave = myLeaveDates.has(cell.dateString);
                      const isHighlightPink = showMyLeaves && isMyLeave;
                      
                      // Get primary user's holiday event/palette for shifts view highlight
                      const mainHolidayEvt = subTab === 'shifts' 
                        ? (dayEvents.find(evt => evt.type === 'holiday_full' || evt.type === 'holiday_am' || evt.type === 'holiday_pm') || dayEvents[0])
                        : null;
                      const dayPalette = mainHolidayEvt 
                        ? getUserColorPalette(mainHolidayEvt.createdBy, userColors?.[mainHolidayEvt.createdBy]) 
                        : null;
                      
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleDayClickOrDoubleTap(cell.dateString)}
                          onDoubleClick={() => handleDayDoubleClick(cell.dateString)}
                          className={`min-h-[48px] xs:min-h-[54px] sm:min-h-[68px] md:min-h-[85px] p-1 md:p-1.5 border-2 rounded-lg md:rounded-xl flex flex-col justify-between transition-all relative cursor-pointer group text-left ${
                            isHighlightPink
                              ? isSelected
                                ? 'border-pink-500 bg-rose-50/60 ring-2 ring-pink-500/80 shadow-md shadow-pink-200/50'
                                : isToday
                                ? 'border-pink-500 bg-rose-50/50 ring-2 ring-pink-400/80 shadow-sm shadow-pink-100'
                                : 'border-pink-500 bg-rose-50/35 ring-2 ring-pink-400/60 shadow-xs shadow-pink-100/50 hover:bg-rose-50/60'
                              : isSelected 
                              ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500/30'
                              : isToday
                              ? 'border-emerald-500 bg-emerald-50/10'
                              : cell.isCurrentMonth
                              ? 'border-slate-100 hover:border-slate-300 bg-white'
                              : 'border-slate-50/50 bg-slate-50/20 opacity-50'
                          }`}
                          style={
                            !isHighlightPink && subTab === 'shifts' && dayEvents.length > 0 && !isSelected && !isToday && dayPalette
                              ? {
                                  backgroundColor: dayPalette.hex + '1a', // ~10% opacity for user custom color bg
                                  borderColor: dayPalette.hex + '60', // border color matches user custom color
                                }
                              : undefined
                          }
                        >
                          <div className="flex items-center justify-between gap-1 w-full">
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-sm inline-block ${
                              isHighlightPink
                                ? 'bg-rose-500 text-white font-black shadow-3xs'
                                : isToday 
                                ? 'bg-emerald-600 text-white font-bold' 
                                : cell.isCurrentMonth 
                                ? 'text-slate-700 font-bold' 
                                : 'text-gray-400'
                            }`}>
                              {cell.day}
                            </span>
                            {isHighlightPink && (
                              <span className="hidden md:flex text-[8.5px] font-black px-1 py-0.2 rounded bg-rose-500 text-white shadow-3xs items-center gap-0.5 shrink-0" title="當日放假/休假提示">
                                🏖️ 放假
                              </span>
                            )}
                          </div>

                          {/* Desktop view: Event text badges */}
                          <div className="hidden md:block space-y-0.5 w-full mt-1.5 overflow-hidden">
                            {dayEvents.slice(0, 3).map((evt) => {
                              const palette = getUserColorPalette(evt.createdBy, userColors?.[evt.createdBy]);
                              const cleanTitle = evt.title.replace(/^\[.*?\]\s*/, '');
                              const isStation = isSiteStationEvent(evt);
                              const isHolidayFull = evt.type === 'holiday_full';
                              const isHolidayAm = evt.type === 'holiday_am';
                              const isHolidayPm = evt.type === 'holiday_pm';
                              const isHoliday = isHolidayFull || isHolidayAm || isHolidayPm || isHolidayEvent(evt);
                              const emoji = '';

                              if (isStation) {
                                const stTheme = getStationLocationTheme(evt.location, evt.title);
                                return (
                                  <div 
                                    key={evt.id} 
                                    className={`text-[8px] font-black px-1 py-0.5 rounded-xs truncate max-w-full leading-tight flex items-center gap-0.5 shadow-2xs border cursor-pointer ${stTheme.gridBadgeClass}`}
                                    title={`[駐場] ${evt.createdBy}: ${evt.location || cleanTitle}`}
                                  >
                                    <MapPin className="w-2.5 h-2.5 shrink-0 text-white" />
                                    <span className="truncate">📍{evt.location || '駐場'}: {evt.createdBy}</span>
                                  </div>
                                );
                              }

                              if (isHoliday && subTab === 'shifts') {
                                const holidayLabel = isHolidayFull 
                                  ? '🏖️ 全日休' 
                                  : isHolidayAm 
                                  ? '⛅ 上午休' 
                                  : isHolidayPm 
                                  ? '⛅ 下午休' 
                                  : cleanTitle;

                                return (
                                  <div 
                                    key={evt.id} 
                                    className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-xs truncate max-w-full leading-tight flex items-center gap-0.5 shadow-3xs border text-white"
                                    style={{
                                      backgroundColor: palette.hex,
                                      borderColor: palette.hex,
                                    }}
                                    title={`${evt.createdBy}: ${holidayLabel}`}
                                  >
                                    <span>{selectedMemberFilter ? holidayLabel : `${evt.createdBy}: ${holidayLabel}`}</span>
                                  </div>
                                );
                              }

                              return (
                                <div 
                                  key={evt.id} 
                                  className="text-[8px] font-bold px-1.5 py-0.5 rounded-xs truncate text-white max-w-full leading-tight flex items-center gap-0.5 shadow-3xs"
                                  style={{ backgroundColor: palette.hex }}
                                  title={`${evt.createdBy}: ${evt.title}`}
                                >
                                  <span>{emoji}{evt.createdBy}: {cleanTitle}</span>
                                </div>
                              );
                            })}
                            {dayEvents.length > 3 && (
                              <div className="text-[7.5px] font-bold text-amber-600 pl-1">
                                +{dayEvents.length - 3} 項
                              </div>
                            )}
                          </div>

                          {/* Mobile view: Dot indicator row */}
                          {dayEvents.length > 0 && (
                            <div className="block md:hidden flex justify-center items-center gap-0.5 mt-0.5 flex-wrap">
                              {dayEvents.slice(0, 3).map((evt) => {
                                const palette = getUserColorPalette(evt.createdBy, userColors?.[evt.createdBy]);
                                const isStation = isSiteStationEvent(evt);
                                const isHolidayFull = evt.type === 'holiday_full';
                                const isHolidayAm = evt.type === 'holiday_am';
                                const isHolidayPm = evt.type === 'holiday_pm';
                                const isHoliday = isHolidayFull || isHolidayAm || isHolidayPm || isHolidayEvent(evt);

                                if (isStation) {
                                  const stTheme = getStationLocationTheme(evt.location, evt.title);
                                  return (
                                    <span 
                                      key={evt.id} 
                                      className="w-2 h-2 rounded-full animate-pulse shadow-2xs"
                                      style={{ backgroundColor: stTheme.primaryHex }}
                                      title={`全日駐場: ${evt.location || evt.createdBy}`}
                                    />
                                  );
                                }

                                if (isHoliday && subTab === 'shifts') {
                                  return (
                                    <span 
                                      key={evt.id} 
                                      className="w-2 h-2 rounded-full shadow-3xs animate-pulse ring-1 ring-white/60"
                                      style={{ backgroundColor: palette.hex }}
                                      title={`${evt.createdBy}: ${evt.title}`}
                                    />
                                  );
                                }

                                return (
                                  <span 
                                    key={evt.id} 
                                    className="w-1 h-1 rounded-full animate-pulse shadow-3xs"
                                    style={{ backgroundColor: palette.hex }}
                                  />
                                );
                              })}
                              {dayEvents.length > 3 && (
                                <span className="text-[7px] font-bold text-amber-600 leading-none">
                                  +
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Sub-tab 1: GENERAL CALENDAR DAY EVENT LIST */}
            {subTab === 'general' && (
              <div className="bg-white border border-gray-200 rounded-xl p-3 md:p-3.5 shadow-sm mt-3 sm:mt-4">
                <div className="flex items-center justify-between mb-2.5 flex-wrap gap-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <CalendarIcon className="w-3.5 h-3.5 text-amber-500" />
                    <h3 className="text-[11px] md:text-xs font-bold text-slate-800">
                      {selectedDateStr} 日程清單
                    </h3>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-full font-mono scale-90 origin-left">
                      共 {selectedDayEvents.length} 項
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    {/* Simplified / Detailed display toggle */}
                    <button
                      type="button"
                      onClick={handleToggleSimplifiedDisplay}
                      className={`px-2 py-0.5 rounded text-[10px] md:text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                        isSimplifiedDisplay
                          ? 'bg-amber-600 text-white border-amber-600 shadow-3xs hover:bg-amber-700'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                      title="切換簡化/詳細顯示"
                    >
                      <span>{isSimplifiedDisplay ? '⚡ 簡化顯示' : '📋 詳細顯示'}</span>
                    </button>
                  </div>
                </div>

                {selectedDayEvents.length === 0 ? (
                  <div className="py-6 border border-dashed border-slate-100 rounded-xl text-center text-gray-400">
                    <Clock className="w-6 h-6 text-slate-200 mx-auto mb-1" />
                    <p className="text-[11px] font-bold text-slate-500">該日無預排行程工作</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {selectedDayEvents.map((evt) => {
                      const isStation = isSiteStationEvent(evt);
                      const stTheme = isStation ? getStationLocationTheme(evt.location, evt.title) : null;
                      const isVisit = evt.type === 'visit';
                      const isMeasure = evt.type === 'measure';
                      const isRemeasure = evt.type === 'remeasure';
                      const isHoliday = isHolidayEvent(evt);
                      const palette = getUserColorPalette(evt.createdBy, userColors?.[evt.createdBy]);
                      const isEditingThis = editingEventId === evt.id;
                      const cleanTitle = evt.title.replace(/^\[.*?\]\s*/, '');

                      if (isSimplifiedDisplay) {
                        return (
                          <div 
                            key={evt.id}
                            {...createLongPressProps(evt)}
                            className={`p-1.5 px-2.5 border rounded-lg flex items-center justify-between gap-2 shadow-3xs transition-all hover:bg-slate-50/70 cursor-pointer select-none ${
                              isEditingThis 
                                ? 'border-amber-500 ring-1 ring-amber-500/20 shadow-sm bg-amber-50/20' 
                                : stTheme
                                ? stTheme.borderClass
                                : palette.border
                            }`}
                            style={{ 
                              backgroundColor: isStation ? undefined : `${palette.hex}18`,
                              borderLeftWidth: '3.5px',
                              borderLeftColor: stTheme ? stTheme.primaryHex : palette.hex
                            }}
                          >
                            <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                              {!isHoliday && !isStation && (
                                <span className="text-[9.5px] font-mono font-bold bg-slate-100/90 text-slate-700 px-1 py-0.1 rounded border border-slate-200/60 shrink-0">
                                  {evt.time}
                                </span>
                              )}
                              <span className={`text-[10.5px] font-bold shrink-0 ${palette.text}`}>
                                {evt.createdBy}
                              </span>
                              <h4 className="text-[11px] font-extrabold text-slate-800 truncate">
                                {cleanTitle}
                              </h4>
                              <span 
                                className={`text-[8.5px] px-1.5 py-0.1 rounded font-bold border shrink-0 hidden sm:inline-block ${
                                  stTheme 
                                    ? stTheme.badgeBgClass 
                                    : `${palette.border} ${palette.text}`
                                }`}
                                style={isStation ? undefined : { backgroundColor: palette.bgLight }}
                              >
                                {isStation ? `駐場 · ${evt.location || stTheme?.name || '現場'}` : isVisit ? '見客' : isMeasure ? '度尺' : isRemeasure ? '覆尺' : isHoliday ? (evt.type === 'holiday_full' ? '全日休' : evt.type === 'holiday_am' ? '上午休' : '下午休') : '一般'}
                              </span>
                              {evt.location && (
                                <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.1 rounded text-[9px] font-bold border border-emerald-100 shrink-0 flex items-center gap-0.5">
                                  📍 {evt.location}
                                </span>
                              )}
                              {evt.remarks && (
                                <span className="text-[9px] text-slate-400 font-medium truncate hidden md:inline-block max-w-[160px]">
                                  ({evt.remarks})
                                </span>
                              )}
                              {isEditingThis && (
                                <span className="text-[8px] px-1 py-0.1 bg-amber-500 text-white rounded font-bold animate-pulse shrink-0">
                                  編輯中
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-0.5 shrink-0 select-none">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionModalEvt(evt);
                                  setShowDeleteConfirmInActionModal(false);
                                }}
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="長按或點擊開啟編輯/刪除選單"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div 
                          key={evt.id}
                          {...createLongPressProps(evt)}
                          className={`p-2 border rounded-lg flex items-start justify-between gap-2 shadow-3xs transition-all hover:bg-slate-50/50 cursor-pointer select-none ${
                            isEditingThis 
                              ? 'border-amber-500 ring-1 ring-amber-500/20 shadow-sm bg-amber-50/10' 
                              : stTheme
                              ? stTheme.borderClass
                              : palette.border
                          }`}
                          style={{ backgroundColor: isStation ? undefined : `${palette.hex}22` }}
                        >
                          <div className="flex gap-2 min-w-0 flex-1">
                            <div className="space-y-1 min-w-0 flex-1">
                              {/* Line 1: Time First and Title */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {!isHoliday && !isStation && (
                                  <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200/60 shrink-0">
                                    {evt.time}
                                  </span>
                                )}
                                <h4 className="text-xs font-extrabold text-slate-800 truncate">{cleanTitle}</h4>
                                <span 
                                  className={`text-[8.5px] px-1.5 py-0.1 rounded font-bold border ${
                                    stTheme 
                                      ? stTheme.badgeBgClass 
                                      : `${palette.border} ${palette.text}`
                                  }`}
                                  style={isStation ? undefined : { backgroundColor: palette.bgLight }}
                                >
                                  {isStation ? `駐場 · ${evt.location || stTheme?.name || '現場'}` : isVisit ? '見客會面' : isMeasure ? '現場度尺' : isRemeasure ? '現場覆尺' : isHoliday ? (evt.type === 'holiday_full' ? '全天放假' : evt.type === 'holiday_am' ? '上午放假' : '下午放假') : '一般行程'}
                                </span>
                                {isEditingThis && (
                                  <span className="text-[8px] px-1 py-0.1 bg-amber-500 text-white rounded font-bold animate-pulse">
                                    編輯中
                                  </span>
                                )}
                              </div>

                              {/* Line 2: User and Location */}
                              <div className="flex items-center gap-2 flex-wrap text-[10px]">
                                <span className="font-bold">
                                  <span className={`${palette.text} font-bold`}>{evt.createdBy}</span>
                                </span>
                                {evt.location && (
                                  <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold border border-emerald-100 flex items-center gap-0.5">
                                    📍 {evt.location}
                                  </span>
                                )}
                              </div>

                              {evt.remarks && (
                                <div className="text-[9.5px] bg-slate-50/80 border border-slate-100 p-1 rounded-md text-slate-600 leading-normal font-medium mt-0.5">
                                  {evt.remarks}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Event actions button */}
                          <div className="flex items-center gap-0.5 shrink-0 select-none">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionModalEvt(evt);
                                setShowDeleteConfirmInActionModal(false);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="長按或點擊開啟編輯/刪除選單"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 2: STAFF ROSTER / 是日上班人員概況 (FOR SHIFTS TAB, 僅在具備權限時顯示) */}
            {subTab === 'shifts' && hasPermission(currentUser, 'feat_view_duty_staff') && (
              <div className="bg-white border border-gray-200 rounded-xl p-3 md:p-3.5 shadow-sm mt-3 sm:mt-4 text-left">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="w-5 h-5 rounded-md bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
                      <Users className="w-3 h-3" />
                    </div>
                    <h3 className="text-[11px] md:text-xs font-bold text-slate-800">
                      {selectedDateStr} 是日上班與休假概況
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* View Full List Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setDutyModalFilter('all');
                        setDutyModalSearch('');
                        setIsDutyListModalOpen(true);
                      }}
                      className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md font-bold text-[10px] md:text-[11px] transition-all cursor-pointer flex items-center gap-1 shadow-3xs active:scale-95"
                      title="彈窗查看完整人員名單與行程"
                    >
                      <Users className="w-3 h-3 text-rose-600" />
                      <span>查看完整名單 ↗</span>
                    </button>
                  </div>
                </div>

                {(() => {
                  const workingStaff = selectedDateDutyList.filter(s => s.isWorking);
                  const stationStaff = selectedDateDutyList.filter(s => s.statusType === 'site_station');
                  const halfDayStaff = selectedDateDutyList.filter(s => s.statusType === 'holiday_am' || s.statusType === 'holiday_pm');
                  const leaveStaff = selectedDateDutyList.filter(s => s.statusType === 'holiday_full');

                  return (
                    <div className="space-y-2">
                      {/* Duty Counters Grid: 2 buttons horizontally taking 50% width each */}
                      <div className="grid grid-cols-2 gap-2 w-full text-[10px] sm:text-[11px] font-bold">
                        {/* 是日上班 Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setDutyModalFilter('working');
                            setDutyModalSearch('');
                            setIsDutyListModalOpen(true);
                          }}
                          className="w-full px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 hover:border-emerald-300 rounded-lg flex items-center justify-between shadow-3xs hover:shadow-2xs active:scale-95 transition-all cursor-pointer"
                          title="點擊彈窗查看上班人員完整名單"
                        >
                          <div className="flex items-center gap-1 min-w-0 truncate">
                            <span>🟢 是日上班:</span>
                            <span className="font-extrabold font-mono text-xs">{workingStaff.length}</span>
                            <span>人</span>
                          </div>
                          <span className="text-[8.5px] text-emerald-600 bg-emerald-100/90 px-1 py-0.2 rounded font-semibold shrink-0 ml-1">點擊查看 ↗</span>
                        </button>

                        {/* 全天休假 Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setDutyModalFilter('leave');
                            setDutyModalSearch('');
                            setIsDutyListModalOpen(true);
                          }}
                          className={`w-full px-2.5 py-1.5 rounded-lg border flex items-center justify-between shadow-3xs hover:shadow-2xs active:scale-95 transition-all cursor-pointer ${
                            leaveStaff.length > 0
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 hover:border-rose-300'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                          title="點擊彈窗查看全天休假人員名單"
                        >
                          <div className="flex items-center gap-1 min-w-0 truncate">
                            <span>🔴 全天休假:</span>
                            <span className="font-extrabold font-mono text-xs">{leaveStaff.length}</span>
                            <span>人</span>
                          </div>
                          <span className="text-[8.5px] text-rose-600 bg-rose-100/90 px-1 py-0.2 rounded font-semibold shrink-0 ml-1">點擊查看 ↗</span>
                        </button>

                        {/* 現場駐場 Button (若有) */}
                        {stationStaff.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setDutyModalFilter('station');
                              setDutyModalSearch('');
                              setIsDutyListModalOpen(true);
                            }}
                            className="w-full px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 hover:border-indigo-300 rounded-lg flex items-center justify-between shadow-3xs hover:shadow-2xs active:scale-95 transition-all cursor-pointer"
                            title="點擊彈窗查看現場駐場人員名單"
                          >
                            <div className="flex items-center gap-1 min-w-0 truncate">
                              <span>📍 現場駐場:</span>
                              <span className="font-extrabold font-mono text-xs">{stationStaff.length}</span>
                              <span>人</span>
                            </div>
                            <span className="text-[8.5px] text-indigo-600 bg-indigo-100/90 px-1 py-0.2 rounded font-semibold shrink-0 ml-1">點擊查看 ↗</span>
                          </button>
                        )}

                        {/* 半日輪班 Button (若有) */}
                        {halfDayStaff.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setDutyModalFilter('halfday');
                              setDutyModalSearch('');
                              setIsDutyListModalOpen(true);
                            }}
                            className="w-full px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 hover:border-amber-300 rounded-lg flex items-center justify-between shadow-3xs hover:shadow-2xs active:scale-95 transition-all cursor-pointer"
                            title="點擊彈窗查看半日輪班人員名單"
                          >
                            <div className="flex items-center gap-1 min-w-0 truncate">
                              <span>⛅ 半日輪班:</span>
                              <span className="font-extrabold font-mono text-xs">{halfDayStaff.length}</span>
                              <span>人</span>
                            </div>
                            <span className="text-[8.5px] text-amber-700 bg-amber-100/90 px-1 py-0.2 rounded font-semibold shrink-0 ml-1">點擊查看 ↗</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
            </div>

          {/* RIGHT PANEL: "極速新增行程" (EXTREMELY FAST EVENT CREATION PANEL) */}
          {(!isMobile || isFormOpen) && (
            <div ref={formContainerRef} className="lg:col-span-4 space-y-4">
              <div className="bg-white border border-gray-200 rounded-xl p-3.5 md:p-4 shadow-sm sticky top-4">
                <div className="border-b border-gray-100 pb-2 mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>{editingEventId ? '編輯選定行程' : (subTab === 'shifts' ? '快速登記放假輪班' : '新增行程')}</span>
                  </h3>
                  {isMobile && (
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 font-bold px-2 py-1 bg-slate-100 rounded cursor-pointer"
                    >
                      關閉
                    </button>
                  )}
                </div>

                {/* 1. Quick Template Selection Buttons */}
                <div className="space-y-3 mb-4 text-left">
                  {subTab !== 'shifts' ? (
                    <>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">一般行程預設模板：</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleApplyTemplate('visit')}
                          className={`px-2 py-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer flex flex-col items-center gap-1.5 ${
                            formType === 'visit'
                              ? 'border-blue-500 bg-blue-50 text-blue-700 font-extrabold'
                              : 'border-slate-100 hover:border-slate-300 bg-slate-50/50 hover:bg-white text-slate-600'
                          }`}
                        >
                          <User className="w-4 h-4 text-blue-500" />
                          <span>見客會面</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyTemplate('other')}
                          className={`px-2 py-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer flex flex-col items-center gap-1.5 ${
                            formType === 'other'
                              ? 'border-slate-500 bg-slate-50 text-slate-700 font-extrabold'
                              : 'border-slate-100 hover:border-slate-300 bg-slate-50/50 hover:bg-white text-slate-600'
                          }`}
                        >
                          <CalendarIcon className="w-4 h-4 text-slate-500" />
                          <span>一般行程</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Stationing vs Holiday Template Selection */}
                      <div className="space-y-2">
                        <div>
                          <span className="block text-[10px] font-extrabold text-rose-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Building className="w-3 h-3 text-rose-600" />
                            <span>1. 現場值勤 - 全日駐場（紅色外框提示，非放假）：</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleApplyTemplate('site_station')}
                            className={`w-full py-2 px-3 rounded-xl border-2 text-xs font-extrabold transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
                              formType === 'site_station'
                                ? 'border-rose-600 bg-rose-600 text-white shadow-xs'
                                : 'border-rose-300 bg-rose-50/80 hover:bg-rose-100 text-rose-800 hover:border-rose-500'
                            }`}
                          >
                            <MapPinned className="w-4 h-4" />
                            <span>登記全日駐場 (工地值勤/優先顯示地點)</span>
                          </button>
                        </div>

                        <div>
                          <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Coffee className="w-3 h-3 text-slate-500" />
                            <span>2. 員工休假/輪休 (Staff Off-duty Leave)：</span>
                          </span>
                          <div className="grid grid-cols-3 gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleApplyTemplate('holiday_full')}
                              className={`px-1 py-2 rounded-xl border text-[10px] font-bold transition-all active:scale-95 cursor-pointer flex flex-col items-center gap-1 ${
                                formType === 'holiday_full'
                                  ? 'border-amber-500 bg-amber-50 text-amber-800 font-extrabold shadow-3xs'
                                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-white text-slate-600'
                              }`}
                            >
                              <Coffee className="w-3.5 h-3.5 text-amber-600" />
                              <span>全天放假</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyTemplate('holiday_am')}
                              className={`px-1 py-2 rounded-xl border text-[10px] font-bold transition-all active:scale-95 cursor-pointer flex flex-col items-center gap-1 ${
                                formType === 'holiday_am'
                                  ? 'border-amber-500 bg-amber-50 text-amber-800 font-extrabold shadow-3xs'
                                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-white text-slate-600'
                              }`}
                            >
                              <Sun className="w-3.5 h-3.5 text-amber-500" />
                              <span>上午放假</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyTemplate('holiday_pm')}
                              className={`px-1 py-2 rounded-xl border text-[10px] font-bold transition-all active:scale-95 cursor-pointer flex flex-col items-center gap-1 ${
                                formType === 'holiday_pm'
                                  ? 'border-orange-500 bg-orange-50 text-orange-800 font-extrabold shadow-3xs'
                                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-white text-slate-600'
                              }`}
                            >
                              <Sunset className="w-3.5 h-3.5 text-orange-500" />
                              <span>下午放假</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

              {/* Form Input fields */}
              <form onSubmit={handleSaveForm} className="space-y-4">
                {/* Registered Staff member (ONLY for shifts tab) */}
                {subTab === 'shifts' && (() => {
                  return (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-rose-500" />
                        <span>登記人員 (Select Staff)</span>
                      </label>
                      <select
                        value={formUser}
                        onChange={(e) => setFormUser(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-bold text-slate-800 cursor-pointer"
                      >
                        <option value="">-- 請選擇員工 --</option>
                        {Object.keys(userColors || {}).map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                        {currentUser && !Object.keys(userColors || {}).includes(currentUser.displayName || currentUser.username) && (
                          <option value={currentUser.displayName || currentUser.username}>
                            {currentUser.displayName || currentUser.username} (目前用戶)
                          </option>
                        )}
                      </select>

                      {/* Work/Station Location options */}
                      <div className="mt-2.5 p-2.5 bg-rose-50/90 border border-rose-200 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-extrabold text-rose-900 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-rose-600" />
                            <span>駐場/工作位置 (Stationing Location)</span>
                          </label>
                          {formLocation && (
                            <span className="text-[10px] font-extrabold text-rose-800 bg-white border border-rose-200 px-1.5 py-0.5 rounded shadow-3xs">
                              已選：{formLocation}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {['屯門', '灣仔', '旺角', '將軍澳'].map((loc) => {
                            const isSelected = formLocation === loc;
                            return (
                              <button
                                key={loc}
                                type="button"
                                onClick={() => {
                                  setFormLocation(loc);
                                  setFormType('site_station');
                                  setFormTitle(`全日駐場 (${loc})`);
                                  setFormTime('08:30');
                                }}
                                className={`py-1.5 px-1 rounded-lg text-xs font-black transition-all cursor-pointer border text-center ${
                                  isSelected && formType === 'site_station'
                                    ? 'bg-rose-600 text-white border-rose-600 shadow-2xs scale-[1.02]'
                                    : 'bg-white text-rose-900 border-rose-200 hover:bg-rose-100 hover:border-rose-300 shadow-3xs'
                                }`}
                              >
                                {loc}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    行程標題
                  </label>
                  <input
                    type="text"
                    placeholder="例如：見客 / 現場度尺"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>

                {/* 2. Quick Date Selectors */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      日期
                    </label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setFormDate(getTodayDateString())}
                        className="px-2 py-0.5 text-[10px] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-slate-600 font-bold active:scale-95 cursor-pointer"
                      >
                        今天
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormDate(getTomorrowDateString())}
                        className="px-2 py-0.5 text-[10px] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-slate-600 font-bold active:scale-95 cursor-pointer"
                      >
                        明天
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormDate(getDayAfterTomorrowDateString())}
                        className="px-2 py-0.5 text-[10px] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-slate-600 font-bold active:scale-95 cursor-pointer"
                      >
                        後天
                      </button>
                    </div>
                  </div>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full min-w-0 max-w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-medium appearance-none"
                  />
                </div>

                {/* 3. Optimized Time Input */}
                {formType !== 'site_station' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        時間
                      </label>
                    </div>
                    <div className="relative min-w-0 max-w-full">
                      <Clock className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                      <input
                        type="time"
                        value={formTime}
                        onChange={(e) => setFormTime(e.target.value)}
                        className="w-full min-w-0 max-w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-mono font-bold appearance-none"
                      />
                    </div>
                  </div>
                )}

                {/* 4. Quick Location buttons (Enabled ONLY for 見客 type) */}
                {subTab !== 'shifts' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        會面地點
                      </label>
                      {formType === 'visit' && (
                        <div className="flex gap-1">
                          {['灣仔', '旺角', '屯門'].map((loc) => (
                            <button
                              key={loc}
                              type="button"
                              onClick={() => setFormLocation(loc)}
                              className="px-2 py-0.5 text-[10px] bg-blue-50 hover:bg-blue-100 border border-blue-150 rounded text-blue-700 font-bold active:scale-95 cursor-pointer"
                            >
                              {loc}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="輸入自定義地點"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-medium"
                    />
                  </div>
                )}

                {/* 5. Address/Remarks Input (HIGHLIGHTED/FORCED EXPANSION for 度尺/覆尺) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      詳細地址 / 備註內容
                    </label>
                  </div>
                  <textarea
                    rows={isAddressRequired ? 4 : 2}
                    placeholder={
                      isAddressRequired 
                        ? "📌 請輸入完整的現場裝修地址、聯絡人、預計測量細項備註。" 
                        : "輸入行程額外備註說明..."
                    }
                    value={formRemarks}
                    onChange={(e) => setFormRemarks(e.target.value)}
                    ref={(el) => {
                      if (el && formFocusRemarks) {
                        el.focus();
                      }
                    }}
                    className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 transition-all leading-relaxed font-medium"
                  />
                </div>

                {/* 6. Push Notification setting toggle */}
                <div className="flex items-center justify-between p-2 bg-amber-50/60 border border-amber-200/70 rounded-lg">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Bell className={`w-3.5 h-3.5 shrink-0 ${formEnableNotification ? 'text-amber-600' : 'text-slate-400'}`} />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block leading-tight">推送提醒</span>
                      <span className="text-[10px] text-slate-500 font-medium">每日發送今日行程提醒</span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={formEnableNotification}
                      onChange={(e) => setFormEnableNotification(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                {/* Form Buttons */}
                <div className="flex gap-2 pt-2">
                  {editingEventId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEventId(null);
                        handleOpenNewForm();
                      }}
                      className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-xs cursor-pointer text-center"
                    >
                      取消編輯
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-2 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs cursor-pointer flex items-center justify-center gap-1 shadow-3xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>{editingEventId ? '更新行程' : '加入行程'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
          )}

        </div>
      )}

      {/* --- SUBTAB VIEW 2: CONSOLIDATED ENGINEERING SCHEDULE (工程日曆) --- */}
      {subTab === 'engineering' && (
        <div 
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-2.5 sm:p-5 shadow-sm text-left space-y-3 sm:space-y-6"
        >
          

          {/* Engineering filter row */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm sm:text-md font-extrabold text-slate-800 flex items-center gap-1.5">
                <Hammer className="w-5 h-5 text-amber-500" />
                <span>施工進度日曆</span>
              </h3>
            </div>

            {/* Quick search */}
            <div className="relative w-full md:w-72 shrink-0">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜尋客戶名 / 施工地址..."
                value={engSearchQuery}
                onChange={(e) => setEngSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-amber-500 font-medium"
              />
            </div>
          </div>

          {/* Core Master Calendar Grid for engineering days */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
            
            {/* Calendar display on left */}
            <div className="md:col-span-8 space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">
                    {currentYear}年 {currentMonth + 1}月
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-1.5 md:p-1 border border-slate-200 bg-white rounded-md hover:bg-slate-50 text-slate-600 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4 md:w-3.5 md:h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1.5 md:p-1 border border-slate-200 bg-white rounded-md hover:bg-slate-50 text-slate-600 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4 md:w-3.5 md:h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center mb-1 sm:mb-1.5">
                  {['日', '一', '二', '三', '四', '五', '六'].map((label, idx) => (
                    <span key={idx} className="text-[10px] font-bold text-slate-400">
                      {label}
                    </span>
                  ))}
                </div>

                {/* Day blocks loop */}
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                  {gridDays.map((cell, idx) => {
                    const cellSteps = constructionStepsByDate[cell.dateString] || [];
                    const isSelected = selectedDateStr === cell.dateString;
                    const isToday = cell.dateString === getTodayDateString();

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleDayClickOrDoubleTap(cell.dateString)}
                        onDoubleClick={() => handleDayDoubleClick(cell.dateString)}
                        className={`min-h-[48px] xs:min-h-[54px] sm:min-h-[68px] md:min-h-[85px] p-1 md:p-1.5 border rounded-lg md:rounded-xl flex flex-col justify-between transition-all relative cursor-pointer text-left ${
                          isSelected 
                            ? 'border-amber-500 bg-amber-50/50 shadow-3xs'
                            : isToday
                            ? 'border-emerald-500 bg-emerald-50/10'
                            : cell.isCurrentMonth
                            ? 'border-slate-100 bg-white'
                            : 'border-slate-50 bg-slate-50/20 opacity-40'
                        }`}
                      >
                        <span className={`text-[10px] font-bold px-1 py-0.2 rounded ${
                          isToday ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600'
                        }`}>
                          {cell.day}
                        </span>

                        {/* Desktop view: Step text badges */}
                        {cellSteps.length > 0 && (
                          <div className="hidden md:block space-y-0.5 w-full mt-1.5 overflow-hidden">
                            {cellSteps.slice(0, 3).map((step, sIdx) => {
                              const stepColor = getGanttStepColor(step.stepIndex);
                              return (
                                <div 
                                  key={sIdx} 
                                  className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-xs truncate text-white max-w-full leading-tight flex items-center gap-0.5 shadow-3xs ${stepColor.bg}`}
                                  title={`${step.customerName} (${step.internalNumber || '無內部號碼'}) - ${step.stepName}`}
                                >
                                  <span>{step.internalNumber || step.customerName}: {step.stepName}</span>
                                </div>
                              );
                            })}
                            {cellSteps.length > 3 && (
                              <div className="text-[7.5px] font-bold text-amber-600 pl-1">
                                +{cellSteps.length - 3} 處施工
                              </div>
                            )}
                          </div>
                        )}

                        {/* Mobile view: Dot indicators */}
                        {cellSteps.length > 0 && (
                          <div className="block md:hidden flex justify-center items-center gap-0.5 mt-0.5 flex-wrap">
                            {cellSteps.slice(0, 3).map((step, sIdx) => {
                              const stepColor = getGanttStepColor(step.stepIndex);
                              return (
                                <span 
                                  key={sIdx} 
                                  className={`w-1 h-1 rounded-full animate-pulse shadow-3xs ${stepColor.bg}`}
                                />
                              );
                            })}
                            {cellSteps.length > 3 && (
                              <span className="text-[7px] font-bold text-amber-600 leading-none">
                                +
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
            </div>

            {/* Step list for selected day on right / bottom */}
            <div className="col-span-1 md:col-span-4 space-y-3 sm:space-y-4 mt-2 md:mt-0">
              <div className="border border-slate-150 rounded-xl p-3 sm:p-3.5 bg-white shadow-3xs">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1 border-b border-slate-100 pb-2 mb-3">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>{selectedDateStr} 當日施工工序</span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-full font-mono">
                      {selectedDayConstructionSteps.length} 處
                    </span>
                  </h4>

                  {selectedDayConstructionSteps.length === 0 ? (
                    <div className="py-6 sm:py-8 text-center text-gray-400">
                      <Hammer className="w-7 h-7 sm:w-8 sm:h-8 text-slate-200 mx-auto mb-1.5" />
                      <p className="text-xs font-bold text-slate-500">該日無任何合約施工安排</p>
                    </div>
                  ) : (
                  <div className="space-y-2.5 sm:space-y-3 max-h-96 overflow-y-auto pr-1">
                    {selectedDayConstructionSteps.map((step, sIdx) => {
                      const stepColor = getGanttStepColor(step.stepIndex);
                      return (
                        <div 
                          key={sIdx}
                          className={`p-2.5 sm:p-3 rounded-lg border text-xs space-y-1.5 border-l-4 transition-all hover:shadow-3xs`}
                          style={{ 
                            borderColor: step.isOverdue ? '#f43f5e' : stepColor.hex,
                            backgroundColor: `${stepColor.hex}0f` 
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-extrabold block text-xs" style={{ color: stepColor.hex }}>
                              {step.stepName}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                              step.isOverdue 
                                ? 'bg-rose-100 text-rose-700 border border-rose-200 animate-pulse' 
                                : 'bg-white text-slate-700 border border-slate-200'
                            }`}>
                              {step.isOverdue ? '⚠️ 逾期中' : `第 ${step.stepIndex + 1} 步 · ${step.days} 天`}
                            </span>
                          </div>

                          <div className="text-2xs text-gray-500 font-medium space-y-0.5">
                            <div className="text-slate-700 font-bold flex items-center gap-1.5 flex-wrap">
                              <User className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>客戶：{step.customerName}</span>
                              {step.internalNumber ? (
                                <span className="bg-amber-100 text-amber-800 text-[9.5px] font-black px-1.5 py-0.5 rounded border border-amber-200">
                                  內部號碼: {step.internalNumber}
                                </span>
                              ) : (
                                <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                                  合約: {step.quoteId}
                                </span>
                              )}
                            </div>
                            <p className="flex items-center gap-1 font-semibold text-slate-600 leading-tight">
                              <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                              <span className="truncate" title={step.address}>{step.address}</span>
                            </p>
                            <p className="text-[10px] font-mono font-semibold pt-1" style={{ color: stepColor.hex }}>
                              📅 區間: {step.startDate} ~ {step.endDate}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Consolidated Master Gantt Table / Timeline list of all schedules */}
          <div className="border border-slate-200 rounded-xl overflow-hidden mt-4 sm:mt-6 bg-white shadow-3xs">
            <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Hammer className="w-4 h-4 text-amber-500" />
                <span>全局項目施工進度明細對帳單 ({projectsWithSchedules.length} 個合約)</span>
              </h4>
              <span className="text-[10px] text-gray-400 font-medium font-mono">
                Gantt Timeline Consolidated
              </span>
            </div>

            {projectsWithSchedules.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Info className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-2xs font-bold">沒有找到匹配或已啟用施工排期的合約</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {projectsWithSchedules.map((quote) => {
                  // Calculate steps dates chronologically
                  let stepDateTracker = new Date(quote.scheduleStartDate!);
                  
                  return (
                    <div key={quote.id} className="p-4 space-y-3 hover:bg-slate-50/20 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-slate-900 text-sm">{quote.customerName}</span>
                            {quote.internalNumber && (
                              <span className="text-2xs bg-amber-50 border border-amber-200 rounded px-1.5 font-bold text-amber-700">
                                內部號碼: {quote.internalNumber}
                              </span>
                            )}
                            <span className="text-2xs bg-slate-100 border border-slate-200 rounded px-1.5 font-mono text-gray-500 font-bold">
                              ID: {quote.id}
                            </span>
                            <span className={`text-[10px] px-2 py-0.3 rounded-full font-bold uppercase ${
                              quote.status === 'constructing' 
                                ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                : quote.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-800 border border-slate-200'
                            }`}>
                              {quote.status === 'constructing' ? '施工中' : quote.status === 'completed' ? '已完工' : '已簽約待施工'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 font-medium mt-1 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{quote.address}</span>
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-2xs text-gray-400 font-bold block">
                            施工啟動日:
                          </span>
                          <span className="text-xs font-bold font-mono text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded inline-block mt-0.5">
                            📅 {quote.scheduleStartDate}
                          </span>
                        </div>
                      </div>

                      {/* Chronological steps visualization capsules */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                        {quote.scheduleSteps?.map((step, stIdx) => {
                          const startStr = stepDateTracker.toISOString().split('T')[0];
                          
                          const endDayObj = new Date(stepDateTracker);
                          endDayObj.setDate(endDayObj.getDate() + step.days - 1);
                          const endStr = endDayObj.toISOString().split('T')[0];
                          
                          // Track next
                          stepDateTracker = new Date(endDayObj);
                          stepDateTracker.setDate(stepDateTracker.getDate() + 1);

                          const todayStr = getTodayDateString();
                          const isCurrent = todayStr >= startStr && todayStr <= endStr && quote.status !== 'completed';
                          const isDone = endStr < todayStr || quote.status === 'completed';

                          return (
                            <div 
                              key={stIdx}
                              className={`p-2.5 rounded-lg border text-left flex flex-col justify-between space-y-1.5 transition-all ${
                                isCurrent 
                                  ? 'bg-amber-600 border-amber-600 text-white shadow-3xs ring-2 ring-amber-500/20' 
                                  : isDone
                                  ? 'bg-emerald-50/20 border-emerald-100 text-slate-800 opacity-80'
                                  : 'bg-white border-slate-200 text-slate-800'
                              }`}
                            >
                              <div>
                                <span className="text-2xs font-extrabold uppercase block opacity-60">
                                  期數 {stIdx + 1} ({step.days}天)
                                </span>
                                <span className={`text-[11px] font-bold block truncate leading-tight mt-0.5 ${
                                  isCurrent ? 'text-white' : 'text-slate-800 font-extrabold'
                                }`}>
                                  {step.name}
                                </span>
                              </div>

                              <div className="space-y-0.5">
                                <span className={`text-[9px] font-semibold block font-mono ${
                                  isCurrent ? 'text-amber-100' : 'text-slate-500'
                                }`}>
                                  {startStr} 至
                                </span>
                                <span className={`text-[9px] font-semibold block font-mono ${
                                  isCurrent ? 'text-amber-100' : 'text-slate-500'
                                }`}>
                                  {endStr}
                                </span>
                              </div>

                              {/* Status visual badge */}
                              {isCurrent && (
                                <span className="text-[8px] bg-white text-amber-700 font-extrabold px-1.5 py-0.2 rounded inline-block text-center shadow-3xs">
                                  ⚡ 目前正進行中
                                </span>
                              )}
                              {isDone && !isCurrent && (
                                <span className="text-[8px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded inline-block text-center self-start">
                                  ✓ 已完成
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Mobile Pop-Up Screen for Selected Date */}
      {isMobilePopUpOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in"
          onClick={() => {
            setIsMobilePopUpOpen(false);
            setModalFormMode('none');
            setEditingEventId(null);
          }}
        >
          <div 
            className="bg-white w-[95%] sm:w-full max-w-lg max-h-[88dvh] sm:max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-up border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-3.5 py-2.5 flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <CalendarIcon className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-xs sm:text-sm font-extrabold font-mono text-white">
                      {mobilePopUpDate}
                    </h3>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono font-bold">
                      {getWeekdayLabel(mobilePopUpDate)}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 font-medium truncate">
                    {subTab === 'general' && `當日預排行程 (共 ${(eventsByDate[mobilePopUpDate] || []).filter(e => !isHolidayEvent(e)).length} 項)`}
                    {subTab === 'shifts' && `人員輪班紀錄 (共 ${(eventsByDate[mobilePopUpDate] || []).filter(e => isHolidayEvent(e) || isSiteStationEvent(e)).length} 項)`}
                    {subTab === 'engineering' && `施工工序項目 (共 ${(constructionStepsByDate[mobilePopUpDate] || []).length} 項)`}
                  </p>
                </div>
              </div>

              {/* Action Buttons in Header */}
              <div className="flex items-center gap-1.5 shrink-0">
                {subTab === 'general' && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEventId(null);
                      setModalFormType('visit');
                      setModalFormTitle('見客');
                      setModalFormLocation('旺角');
                      setModalFormTime('10:00');
                      setModalFormRemarks('');
                      setModalFormUser(currentUser ? (currentUser.displayName || currentUser.username || '') : '');
                      setModalFormMode('add_event');
                    }}
                    className="bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>新增行程</span>
                  </button>
                )}

                {subTab === 'shifts' && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEventId(null);
                      setModalFormMode('quick_shift');
                    }}
                    className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>登記輪班</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsMobilePopUpOpen(false);
                    setModalFormMode('none');
                    setEditingEventId(null);
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold transition-colors cursor-pointer text-sm ml-0.5"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body - Scrollable Items List & Forms */}
            <div className="p-3.5 space-y-3 overflow-y-auto flex-1 min-h-0 bg-slate-50/50">
              {/* Form Mode: Add / Edit General Event */}
              {modalFormMode === 'add_event' && (
                <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-xs space-y-3 animate-fade-in text-left">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-extrabold text-amber-800 flex items-center gap-1">
                      {editingEventId ? <Edit className="w-3.5 h-3.5 text-amber-600" /> : <Plus className="w-3.5 h-3.5 text-amber-600" />}
                      {editingEventId ? '編輯行程' : '新增行程'} ({mobilePopUpDate})
                    </span>
                    <button 
                      type="button" 
                      onClick={() => {
                        setModalFormMode('none');
                        setEditingEventId(null);
                      }}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded bg-slate-100 cursor-pointer"
                    >
                      取消
                    </button>
                  </div>

                  {/* Category Template Pills */}
                  <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                    {[
                      { type: 'visit', label: '見客', loc: '旺角' },
                      { type: 'measure', label: '現場度尺', loc: '旺角' },
                      { type: 'remeasure', label: '現場覆尺', loc: '旺角' },
                      { type: 'site_station', label: '全日駐場', loc: '屯門' },
                      { type: 'other', label: '其他', loc: '' }
                    ].map(item => (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => {
                          setModalFormType(item.type as any);
                          if (item.type === 'visit') setModalFormTitle('見客');
                          else if (item.type === 'measure') setModalFormTitle('現場度尺');
                          else if (item.type === 'remeasure') setModalFormTitle('現場覆尺');
                          else if (item.type === 'site_station') setModalFormTitle('全日駐場 (屯門)');
                          else setModalFormTitle('一般行程');
                          if (item.loc) setModalFormLocation(item.loc);
                        }}
                        className={`text-[10px] font-bold px-2 py-1 rounded-md shrink-0 border transition-all ${
                          modalFormType === item.type
                            ? 'bg-amber-600 text-white border-amber-600 shadow-3xs'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {/* Date & Personnel inputs */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">日期</label>
                      <input
                        type="date"
                        value={mobilePopUpDate}
                        onChange={(e) => setMobilePopUpDate(e.target.value)}
                        className="w-full h-8 px-2 border border-slate-200 rounded-lg font-bold text-slate-700 bg-slate-50 focus:bg-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">登記人員</label>
                      <select
                        value={modalFormUser}
                        onChange={(e) => setModalFormUser(e.target.value)}
                        className="w-full h-8 px-2 border border-slate-200 rounded-lg font-bold text-slate-700 bg-slate-50 focus:bg-white focus:border-amber-500 focus:outline-none"
                      >
                        <option value="">-- 請選擇人員 --</option>
                        {Object.keys(userColors || {}).map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                        {currentUser && !Object.keys(userColors || {}).includes(currentUser.displayName || currentUser.username) && (
                          <option value={currentUser.displayName || currentUser.username}>
                            {currentUser.displayName || currentUser.username} (目前用戶)
                          </option>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Inputs */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {modalFormType !== 'site_station' && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">時間</label>
                        <input
                          type="time"
                          value={modalFormTime}
                          onChange={(e) => setModalFormTime(e.target.value)}
                          className="w-full h-8 px-2 border border-slate-200 rounded-lg font-bold text-slate-700 bg-slate-50 focus:bg-white focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    )}
                    <div className={modalFormType === 'site_station' ? 'col-span-2' : ''}>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">地點</label>
                      <input
                        type="text"
                        placeholder="如：旺角、屯門、灣仔"
                        value={modalFormLocation}
                        onChange={(e) => setModalFormLocation(e.target.value)}
                        className="w-full h-8 px-2 border border-slate-200 rounded-lg text-slate-700 bg-slate-50 focus:bg-white focus:border-amber-500 focus:outline-none font-bold"
                      />
                    </div>
                  </div>

                  {/* Location quick selector pills for site_station */}
                  {modalFormType === 'site_station' && (
                    <div className="bg-rose-50/80 p-2 rounded-lg border border-rose-200 space-y-1 text-left">
                      <span className="text-[9.5px] font-extrabold text-rose-900 block flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-rose-600" />
                        快速選擇駐場地點：
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {['灣仔', '旺角', '將軍澳', '屯門'].map((loc) => (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => {
                              setModalFormLocation(loc);
                              setModalFormTitle(`全日駐場 (${loc})`);
                            }}
                            className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                              modalFormLocation === loc
                                ? 'bg-rose-600 text-white border-rose-600 shadow-3xs'
                                : 'bg-white text-rose-900 border-rose-200 hover:bg-rose-100'
                            }`}
                          >
                            {loc}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">行程標題</label>
                    <input
                      type="text"
                      placeholder="行程標題"
                      value={modalFormTitle}
                      onChange={(e) => setModalFormTitle(e.target.value)}
                      className="w-full h-8 px-2 border border-slate-200 rounded-lg font-bold text-slate-800 bg-slate-50 focus:bg-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">備註說明 (選填)</label>
                    <input
                      type="text"
                      placeholder="備註說明..."
                      value={modalFormRemarks}
                      onChange={(e) => setModalFormRemarks(e.target.value)}
                      className="w-full h-8 px-2 border border-slate-200 rounded-lg text-slate-700 bg-slate-50 focus:bg-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Push Notification setting toggle */}
                  <div className="flex items-center justify-between p-2 bg-amber-50/60 border border-amber-200/70 rounded-lg">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Bell className={`w-3.5 h-3.5 shrink-0 ${modalFormEnableNotification ? 'text-amber-600' : 'text-slate-400'}`} />
                      <div>
                        <span className="text-xs font-bold text-slate-800 block leading-tight">晨間 08:00 推送提醒</span>
                        <span className="text-[10px] text-slate-500 font-medium">每日 8 點發送推播</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={modalFormEnableNotification}
                        onChange={(e) => setModalFormEnableNotification(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-amber-600"></div>
                    </label>
                  </div>

                  <div className="pt-1 flex gap-2">
                    <button
                      type="button"
                      onClick={handleSaveModalEvent}
                      className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-98"
                    >
                      {editingEventId ? '更新並儲存行程' : '儲存行程'}
                    </button>
                  </div>
                </div>
              )}

              {/* Form Mode: Quick Shift Registration */}
              {modalFormMode === 'quick_shift' && (
                <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-xs space-y-3 animate-fade-in text-left">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-extrabold text-rose-900 flex items-center gap-1">
                      <Coffee className="w-3.5 h-3.5 text-rose-600" />
                      快速登記輪班 / 休假 ({mobilePopUpDate})
                    </span>
                    <button 
                      type="button" 
                      onClick={() => {
                        setModalFormMode('none');
                        setIsSelectingStationLocation(false);
                      }}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded bg-slate-100"
                    >
                      取消
                    </button>
                  </div>

                  {!isSelectingStationLocation ? (
                    <>
                      <p className="text-[11px] text-slate-500 font-medium">點擊下方選項以一鍵完成登記：</p>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleQuickRegisterShiftInModal('holiday_full')}
                          className="p-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-left transition-all active:scale-95 cursor-pointer flex items-center justify-between"
                        >
                          <span className="text-xs font-extrabold text-rose-900 block">全天放假</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleQuickRegisterShiftInModal('holiday_am')}
                          className="p-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-left transition-all active:scale-95 cursor-pointer flex items-center justify-between"
                        >
                          <span className="text-xs font-extrabold text-amber-900 block">上午半天</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleQuickRegisterShiftInModal('holiday_pm')}
                          className="p-2.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl text-left transition-all active:scale-95 cursor-pointer flex items-center justify-between"
                        >
                          <span className="text-xs font-extrabold text-orange-900 block">下午半天</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsSelectingStationLocation(true)}
                          className="p-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-left transition-all active:scale-95 cursor-pointer flex items-center justify-between"
                        >
                          <span className="text-xs font-extrabold text-indigo-900 block">全日駐場</span>
                          <span className="text-[8.5px] bg-indigo-200/80 text-indigo-900 px-1 py-0.2 rounded font-extrabold">選地點 ➔</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    /* Stationing Location Selection Sub-panel */
                    <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200 space-y-2.5 animate-fade-in text-left">
                      <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                        <span className="text-xs font-extrabold text-indigo-950 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                          請選擇「全日駐場」地點：
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsSelectingStationLocation(false)}
                          className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-white border border-indigo-200 px-2 py-0.5 rounded-md cursor-pointer shadow-3xs"
                        >
                          ← 返回選單
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {['灣仔', '旺角', '將軍澳', '屯門'].map((loc) => (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => handleQuickRegisterShiftInModal('site_station', loc)}
                            className="p-2 bg-white hover:bg-indigo-600 hover:text-white border border-indigo-200 rounded-lg text-left font-extrabold text-xs text-indigo-900 transition-all active:scale-95 cursor-pointer flex items-center justify-between shadow-3xs group"
                          >
                            <span>📍 {loc}</span>
                            <span className="text-[8.5px] bg-indigo-50 text-indigo-700 group-hover:bg-white group-hover:text-indigo-800 px-1 py-0.2 rounded font-bold">
                              登記
                            </span>
                          </button>
                        ))}
                      </div>

                      {/* Custom station location input */}
                      <div className="pt-1.5 border-t border-indigo-100">
                        <label className="text-[10px] font-bold text-indigo-900 block mb-1">自訂其他駐場地點：</label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="如：赤鱲角、數碼港、葵芳..."
                            value={customStationLocation}
                            onChange={(e) => setCustomStationLocation(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && customStationLocation.trim()) {
                                e.preventDefault();
                                handleQuickRegisterShiftInModal('site_station', customStationLocation.trim());
                              }
                            }}
                            className="flex-1 h-8 px-2 text-xs bg-white border border-indigo-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500 font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (customStationLocation.trim()) {
                                handleQuickRegisterShiftInModal('site_station', customStationLocation.trim());
                              }
                            }}
                            disabled={!customStationLocation.trim()}
                            className="px-3 h-8 bg-indigo-600 disabled:opacity-40 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 shrink-0"
                          >
                            確認登記
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* VIEW 1: GENERAL SCHEDULE TAB */}
              {subTab === 'general' && (() => {
                const generalEvents = (eventsByDate[mobilePopUpDate] || []).filter(e => !isHolidayEvent(e));
                return generalEvents.length === 0 ? (
                  <div className="py-8 bg-white border border-dashed border-slate-200 rounded-xl text-center text-slate-400">
                    <Clock className="w-7 h-7 text-slate-200 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-slate-500">當日尚無預排行程</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">可點擊右上角 + 新增行程</p>
                  </div>
                ) : (
                  <div className="space-y-2 text-left">
                    {generalEvents.map((evt) => {
                      const isStation = isSiteStationEvent(evt);
                      const stTheme = isStation ? getStationLocationTheme(evt.location, evt.title) : null;
                      const palette = getUserColorPalette(evt.createdBy, userColors?.[evt.createdBy]);
                      const cleanTitle = evt.title.replace(/^\[.*?\]\s*/, '');

                      return (
                        <div 
                          key={evt.id}
                          {...createLongPressProps(evt)}
                          className={`p-3 border rounded-xl shadow-3xs flex items-start justify-between gap-2 border-l-4 cursor-pointer select-none transition-all ${
                            stTheme ? stTheme.borderClass : palette.border
                          }`}
                          style={{ 
                            borderLeftColor: stTheme ? stTheme.primaryHex : palette.hex,
                            backgroundColor: isStation ? undefined : `${palette.hex}22`
                          }}
                        >
                          <div className="flex gap-2 min-w-0 flex-1">
                            <div className="min-w-0 flex-1 space-y-1">
                              {/* Line 1: Time First and Title */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {!isStation && (
                                  <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200/60 shrink-0">{evt.time}</span>
                                )}
                                <h4 className="text-xs font-extrabold text-slate-800 truncate">{cleanTitle}</h4>
                              </div>
                              {/* Line 2: User and Location */}
                              <div className="flex items-center gap-2 flex-wrap text-[10px]">
                                <span className="font-bold"><span className={`${palette.text} font-bold`}>{evt.createdBy}</span></span>
                                {evt.location && (
                                  <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold border border-emerald-100">
                                    📍 {evt.location}
                                  </span>
                                )}
                              </div>
                              {evt.remarks && (
                                <p className="text-[10.5px] text-slate-500 mt-0.5">{evt.remarks}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionModalEvt(evt);
                                setShowDeleteConfirmInActionModal(false);
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="長按或點擊開啟編輯/刪除選單"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* VIEW 2: STAFF ROSTER / SHIFTS TAB */}
              {subTab === 'shifts' && (() => {
                const shiftEvents = (eventsByDate[mobilePopUpDate] || []).filter(e => isHolidayEvent(e) || isSiteStationEvent(e));

                return (
                  <div className="space-y-3.5 text-left">
                    {/* Shift & Leave Detailed Records (已登記紀錄清單) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                          輪班與請假明細紀錄 ({shiftEvents.length})
                        </span>
                        {shiftEvents.length > 0 && (
                          <span className="text-[9.5px] text-slate-400">點擊右側按鈕可直接編輯或刪除</span>
                        )}
                      </div>

                      {shiftEvents.length === 0 ? (
                        <div className="py-5 bg-white border border-dashed border-slate-200 rounded-xl text-center text-slate-400">
                          <Coffee className="w-5 h-5 text-slate-300 mx-auto mb-1" />
                          <p className="text-xs font-bold text-slate-500">當日無額外輪班或休假登記</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">全員預設為正常上班當值狀態</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {shiftEvents.map((evt) => {
                            const isStation = isSiteStationEvent(evt);
                            const stTheme = isStation ? getStationLocationTheme(evt.location, evt.title) : null;
                            const palette = getUserColorPalette(evt.createdBy, userColors?.[evt.createdBy]);
                            const cleanTitle = evt.title.replace(/^\[.*?\]\s*/, '');

                            return (
                              <div 
                                key={evt.id}
                                className={`p-2.5 border rounded-xl shadow-3xs flex items-center justify-between gap-2 border-l-4 transition-all bg-white hover:bg-slate-50/60 ${
                                  stTheme ? stTheme.borderClass : palette.border
                                }`}
                                style={{ 
                                  borderLeftColor: stTheme ? stTheme.primaryHex : palette.hex,
                                }}
                              >
                                <div className="flex gap-2 min-w-0 flex-1 items-center">
                                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stTheme ? stTheme.primaryHex : palette.hex }} />
                                  <div className="min-w-0 flex-1 space-y-0.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className={`text-xs font-black ${palette.text}`}>{evt.createdBy}</span>
                                      <h4 className="text-xs font-bold text-slate-800 truncate">{cleanTitle}</h4>
                                      {evt.location && (
                                        <span className="text-[9.5px] text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded font-bold border border-indigo-100">
                                          📍 {evt.location}
                                        </span>
                                      )}
                                    </div>
                                    {evt.remarks && (
                                      <p className="text-[10px] text-slate-500 truncate">{evt.remarks}</p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleEditEvent(evt)}
                                    className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-0.5"
                                    title="編輯此筆紀錄"
                                  >
                                    <Edit className="w-3 h-3" />
                                    <span>編輯</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteEvent(evt.id)}
                                    className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="刪除紀錄"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* VIEW 3: CONSTRUCTION STEPS TAB */}
              {subTab === 'engineering' && (() => {
                const engineeringSteps = constructionStepsByDate[mobilePopUpDate] || [];
                return engineeringSteps.length === 0 ? (
                  <div className="py-8 bg-white border border-dashed border-slate-200 rounded-xl text-center text-slate-400">
                    <Hammer className="w-7 h-7 text-slate-200 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-slate-500">當日尚無施工工序進行中</p>
                  </div>
                ) : (
                  <div className="space-y-2 text-left">
                    {engineeringSteps.map((step, idx) => {
                      const todayStr = getTodayDateString();
                      const isCurrent = todayStr >= step.startDate && todayStr <= step.endDate;
                      const projKey = step.internalNumber || step.customerName || step.quoteId;
                      const projPalette = getProjectColorPalette(projKey);

                      return (
                        <div 
                          key={idx} 
                          className={`p-3 bg-white border rounded-xl shadow-3xs space-y-1.5 border-l-4 ${projPalette.border} ${projPalette.borderLeft}`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <span className="text-xs font-extrabold text-slate-800 block">{step.customerName}</span>
                              <span className="text-[10px] text-slate-500 block">{step.address}</span>
                            </div>
                            <span 
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 border"
                              style={{ 
                                backgroundColor: `${projPalette.primaryHex}15`, 
                                color: projPalette.primaryHex, 
                                borderColor: `${projPalette.primaryHex}40` 
                              }}
                            >
                              {step.internalNumber || '工程'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10.5px]">
                            <div className="flex items-center gap-1 font-bold" style={{ color: projPalette.primaryHex }}>
                              <Hammer className="w-3.5 h-3.5" style={{ color: projPalette.primaryHex }} />
                              <span>{step.stepName}</span>
                              <span className="text-[9.5px] text-slate-400 font-normal">({step.days}天)</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[9.5px] text-slate-500 font-mono">
                                {step.startDate} 至 {step.endDate}
                              </span>
                              {isCurrent && (
                                <span 
                                  className="text-[8.5px] text-white font-extrabold px-1.5 py-0.2 rounded"
                                  style={{ backgroundColor: projPalette.primaryHex }}
                                >
                                  正進行中
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Long Press Action Modal (Edit & Delete options) */}
      {actionModalEvt && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in select-none"
          onClick={() => {
            setActionModalEvt(null);
            setShowDeleteConfirmInActionModal(false);
          }}
        >
          <div 
            className="bg-white rounded-2xl max-w-xs w-full p-4 shadow-2xl border border-slate-100 space-y-3.5 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-2 border-b border-slate-100">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80 inline-block mb-1">
                  ⚡ 行程長按操作
                </span>
                <h3 className="text-sm font-extrabold text-slate-800 truncate">
                  {actionModalEvt.title.replace(/^\[.*?\]\s*/, '')}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
                  <span>🗓️ {actionModalEvt.date}</span>
                  {actionModalEvt.time && actionModalEvt.time !== '00:00' && (
                    <span>⏰ {actionModalEvt.time}</span>
                  )}
                  <span>👤 {actionModalEvt.createdBy}</span>
                </p>
                {actionModalEvt.location && (
                  <p className="text-[10.5px] text-emerald-700 font-bold mt-0.5 truncate">
                    📍 地點：{actionModalEvt.location}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setActionModalEvt(null);
                  setShowDeleteConfirmInActionModal(false);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!showDeleteConfirmInActionModal ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    const targetEvt = actionModalEvt;
                    setActionModalEvt(null);
                    handleEditEvent(targetEvt);
                  }}
                  className="w-full py-2.5 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-3xs"
                >
                  <Edit className="w-4 h-4 text-amber-600" />
                  <span>編輯行程內容</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDeleteConfirmInActionModal(true)}
                  className="w-full py-2.5 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-3xs"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>剷除 / 刪除行程</span>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl space-y-2.5 text-center">
                <p className="text-xs font-extrabold text-rose-800">
                  ⚠️ 確定要剷除此行程紀錄嗎？
                </p>
                <p className="text-[10.5px] text-rose-600 font-medium">
                  剷除後將無法復原。
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      const targetId = actionModalEvt.id;
                      setActionModalEvt(null);
                      setShowDeleteConfirmInActionModal(false);
                      await handleDeleteEvent(targetId);
                    }}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-lg active:scale-95 cursor-pointer shadow-2xs"
                  >
                    確定剷除
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirmInActionModal(false)}
                    className="w-full py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold text-xs rounded-lg active:scale-95 cursor-pointer"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setActionModalEvt(null);
                setShowDeleteConfirmInActionModal(false);
              }}
              className="w-full py-1.5 text-center text-xs font-bold text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            >
              關閉選單
            </button>
          </div>
        </div>
      )}

      {/* FULL DUTY STAFF LIST POP UP MODAL (點擊是日上班/休假Span時彈窗顯示完整列表) */}
      {isDutyListModalOpen && hasPermission(currentUser, 'feat_view_duty_staff') && (() => {
        const workingStaff = selectedDateDutyList.filter(s => s.isWorking);
        const stationStaff = selectedDateDutyList.filter(s => s.statusType === 'site_station');
        const halfDayStaff = selectedDateDutyList.filter(s => s.statusType === 'holiday_am' || s.statusType === 'holiday_pm');
        const leaveStaff = selectedDateDutyList.filter(s => s.statusType === 'holiday_full');

        let filteredList = selectedDateDutyList;
        if (dutyModalFilter === 'working') {
          filteredList = workingStaff;
        } else if (dutyModalFilter === 'station') {
          filteredList = stationStaff;
        } else if (dutyModalFilter === 'halfday') {
          filteredList = halfDayStaff;
        } else if (dutyModalFilter === 'leave') {
          filteredList = leaveStaff;
        }

        if (dutyModalSearch.trim()) {
          const q = dutyModalSearch.trim().toLowerCase();
          filteredList = filteredList.filter(item => {
            const nameMatch = item.name.toLowerCase().includes(q) || (item.staff.username || '').toLowerCase().includes(q);
            const remarkMatch = (item.remarks || '').toLowerCase().includes(q);
            const taskMatch = item.workTasks.some(t => t.title.toLowerCase().includes(q) || (t.location || '').toLowerCase().includes(q));
            const locMatch = (item.location || '').toLowerCase().includes(q);
            return nameMatch || remarkMatch || taskMatch || locMatch;
          });
        }

        return (
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in select-none"
            onClick={() => setIsDutyListModalOpen(false)}
          >
            <div 
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2 shrink-0">
                <div className="min-w-0 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm shrink-0 border border-rose-200 shadow-3xs">
                    👥
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-800">
                        {selectedDateStr} 人員名單
                      </h3>
                      <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                        {getWeekdayLabel(selectedDateStr)}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-500 mt-0.5">
                      是日上班 <span className="text-emerald-700 font-extrabold font-mono">{workingStaff.length}</span> 人 · 全天休假 <span className="text-rose-600 font-extrabold font-mono">{leaveStaff.length}</span> 人 · 全體成員共 <span className="font-bold font-mono">{selectedDateDutyList.length}</span> 人
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDutyListModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filter Tabs & Search Bar Toolbar */}
              <div className="p-3 sm:px-4 bg-white border-b border-slate-100 space-y-2 shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Filter Tabs */}
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setDutyModalFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        dutyModalFilter === 'all'
                          ? 'bg-slate-800 text-white border-slate-800 shadow-3xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      全部成員 ({selectedDateDutyList.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setDutyModalFilter('working')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                        dutyModalFilter === 'working'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-3xs'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      <span>🟢 上班</span>
                      <span className="font-mono">({workingStaff.length})</span>
                    </button>

                    {stationStaff.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setDutyModalFilter('station')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                          dutyModalFilter === 'station'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-3xs'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                        }`}
                      >
                        <span>📍 駐場</span>
                        <span className="font-mono">({stationStaff.length})</span>
                      </button>
                    )}

                    {halfDayStaff.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setDutyModalFilter('halfday')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                          dutyModalFilter === 'halfday'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-3xs'
                            : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        <span>⛅ 半日</span>
                        <span className="font-mono">({halfDayStaff.length})</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setDutyModalFilter('leave')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                        dutyModalFilter === 'leave'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-3xs'
                          : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                      }`}
                    >
                      <span>🔴 休假</span>
                      <span className="font-mono">({leaveStaff.length})</span>
                    </button>
                  </div>

                  {/* Display View Mode Toggle inside Modal */}
                  <button
                    type="button"
                    onClick={handleToggleSimplifiedDisplay}
                    className="px-2 py-1 rounded-lg text-[10.5px] font-bold border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all cursor-pointer shrink-0"
                  >
                    {isSimplifiedDisplay ? '⚡ 簡化檢視' : '📋 詳細檢視'}
                  </button>
                </div>

                {/* Quick Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="搜尋成員名稱、地點、行程或備註..."
                    value={dutyModalSearch}
                    onChange={(e) => setDutyModalSearch(e.target.value)}
                    className="w-full h-8 pl-8 pr-7 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-rose-400 focus:bg-white transition-all font-medium"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  {dutyModalSearch && (
                    <button
                      type="button"
                      onClick={() => setDutyModalSearch('')}
                      className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600 font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Modal Body: Staff Cards List */}
              <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-2.5 bg-slate-50/40">
                {filteredList.length === 0 ? (
                  <div className="py-10 bg-white border border-dashed border-slate-200 rounded-xl text-center text-slate-400 space-y-1">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                    <p className="text-xs font-bold text-slate-500">查無符合條件的人員</p>
                    {dutyModalSearch && (
                      <button
                        type="button"
                        onClick={() => setDutyModalSearch('')}
                        className="text-[11px] text-rose-600 hover:underline font-bold mt-1 inline-block"
                      >
                        清除搜尋條件
                      </button>
                    )}
                  </div>
                ) : isSimplifiedDisplay ? (
                  /* Simplified Grid in Modal */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredList.map((staffItem) => {
                      const { name, palette, statusType, statusLabel, stationTheme, remarks, workTasks } = staffItem;
                      const isStation = statusType === 'site_station';
                      const isHalfDay = statusType === 'holiday_am' || statusType === 'holiday_pm';
                      const isFullLeave = statusType === 'holiday_full';
                      const isExpanded = !!expandedDutyUsers[name];
                      const hasDetails = Boolean(remarks || workTasks.length > 0 || (isStation && stationTheme));

                      return (
                        <div
                          key={name}
                          onDoubleClick={() => handleToggleDutyUserDetail(name)}
                          onTouchEnd={() => handleStaffTouchEnd(name)}
                          className={`p-2.5 rounded-xl border flex flex-col justify-between gap-1.5 shadow-3xs transition-all cursor-pointer select-none bg-white ${
                            isExpanded
                              ? 'ring-2 ring-rose-400 border-rose-300 shadow-xs'
                              : isStation && stationTheme
                              ? stationTheme.borderClass
                              : isFullLeave
                              ? 'border-rose-200 bg-rose-50/20'
                              : isHalfDay
                              ? 'border-amber-200 bg-amber-50/20'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                          style={{
                            borderLeftWidth: '4px',
                            borderLeftColor: isStation && stationTheme
                              ? stationTheme.primaryHex
                              : palette.hex
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div
                                className="w-6 h-6 rounded-full text-white font-extrabold text-[10px] flex items-center justify-center shrink-0 shadow-3xs"
                                style={{ backgroundColor: palette.hex }}
                              >
                                {name[0] || 'U'}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className={`text-xs font-extrabold block truncate ${palette.text}`}>
                                  {name}
                                </span>
                                {remarks && !isExpanded && (
                                  <span className="text-[9px] text-slate-400 block truncate">
                                    {remarks}
                                  </span>
                                )}
                              </div>
                            </div>

                            <span
                              className={`text-[9px] px-2 py-0.5 rounded font-bold border shrink-0 ${
                                isStation && stationTheme
                                  ? stationTheme.badgeBgClass
                                  : `${palette.border} ${palette.text}`
                              }`}
                              style={isStation && stationTheme ? undefined : { backgroundColor: palette.bgLight }}
                            >
                              {statusLabel}
                            </span>
                          </div>

                          {/* Details in Simplified View if double-tapped or has tasks */}
                          {isExpanded && hasDetails && (
                            <div className="mt-1 pt-1.5 border-t border-slate-200/80 text-[10px] space-y-1 animate-fade-in text-left">
                              {remarks && (
                                <p className="text-slate-700 font-medium bg-slate-50 px-2 py-1 rounded border border-slate-200/60 leading-snug">
                                  📝 備註：{remarks}
                                </p>
                              )}
                              {workTasks.length > 0 && (
                                <div className="space-y-0.5">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">今日行程/工作 ({workTasks.length})：</span>
                                  <div className="flex flex-wrap gap-1">
                                    {workTasks.map(t => (
                                      <span key={t.id} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200 shadow-3xs truncate">
                                        ⏰ {t.time} {t.title} {t.location ? `📍${t.location}` : ''}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {isStation && stationTheme && (
                                <div className="text-[9px] text-indigo-700 font-semibold bg-indigo-50/70 px-2 py-0.5 rounded border border-indigo-100">
                                  📍 現場駐場：{stationTheme.name || location}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Detailed Cards in Modal */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {filteredList.map((staffItem) => {
                      const { name, palette, statusType, statusLabel, stationTheme, remarks, workTasks } = staffItem;
                      const isStation = statusType === 'site_station';
                      const isHalfDay = statusType === 'holiday_am' || statusType === 'holiday_pm';
                      const isFullLeave = statusType === 'holiday_full';

                      return (
                        <div
                          key={name}
                          className={`p-3 rounded-xl border flex flex-col justify-between gap-2 shadow-3xs bg-white ${
                            isStation && stationTheme
                              ? stationTheme.borderClass
                              : isFullLeave
                              ? 'border-rose-200 bg-rose-50/15'
                              : isHalfDay
                              ? 'border-amber-200 bg-amber-50/15'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                          style={{
                            borderLeftWidth: '4px',
                            borderLeftColor: isStation && stationTheme
                              ? stationTheme.primaryHex
                              : palette.hex
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="w-7 h-7 rounded-full text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-3xs"
                                style={{ backgroundColor: palette.hex }}
                              >
                                {name[0] || 'U'}
                              </div>
                              <div className="min-w-0">
                                <span className={`text-xs sm:text-sm font-extrabold truncate block ${palette.text}`}>
                                  {name}
                                </span>
                              </div>
                            </div>

                            <span
                              className={`text-[9.5px] px-2 py-0.5 rounded-md font-bold border shrink-0 ${
                                isStation && stationTheme
                                  ? stationTheme.badgeBgClass
                                  : `${palette.border} ${palette.text}`
                              }`}
                              style={isStation && stationTheme ? undefined : { backgroundColor: palette.bgLight }}
                            >
                              {statusLabel}
                            </span>
                          </div>

                          {/* Remarks / Work Appointments */}
                          <div className="space-y-1.5 pt-1.5 border-t border-slate-100 text-[10.5px]">
                            {remarks ? (
                              <p className="text-slate-700 font-medium bg-slate-50 px-2 py-1 rounded border border-slate-200/60 leading-snug">
                                📝 備註：{remarks}
                              </p>
                            ) : (
                              <p className="text-slate-400 text-[10px] italic">
                                (無特別備註)
                              </p>
                            )}

                            {workTasks.length > 0 && (
                              <div className="space-y-1 pt-0.5">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">今日預排工作行程 ({workTasks.length})：</span>
                                <div className="flex flex-wrap gap-1">
                                  {workTasks.map(t => (
                                    <span key={t.id} className="text-[9.5px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 shadow-3xs truncate">
                                      ⏰ {t.time} {t.title} {t.location ? `📍${t.location}` : ''}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {isStation && stationTheme && (
                              <div className="text-[9.5px] text-indigo-700 font-semibold bg-indigo-50/80 px-2 py-1 rounded border border-indigo-100">
                                📍 現場駐場地點：{stationTheme.name || location}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 sm:px-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
                <span className="text-[10.5px] text-slate-500 font-medium">
                  共顯示 <span className="font-bold font-mono text-slate-700">{filteredList.length}</span> 位人員當值資訊
                </span>
                <button
                  type="button"
                  onClick={() => setIsDutyListModalOpen(false)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-3xs"
                >
                  關閉視窗
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- MORNING 08:00 PUSH NOTIFICATION HUB MODAL (晨間 08:00 推播通知管理中心) --- */}
      {isBriefingModalOpen && (() => {
        const previewDate = selectedDateStr || getTodayDateStrHelper();
        const myUserLabel = currentUser ? (currentUser.displayName || currentUser.username || '') : '';
        const briefing = generateDailyMorningBriefing(calendarEvents, previewDate, {
          scope: notifScope,
          userLabel: myUserLabel
        });

        return (
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in text-left"
            onClick={() => {
              setIsBriefingModalOpen(false);
              setNotifFeedback(null);
            }}
          >
            <div 
              className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-zoom-in text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-100 bg-amber-50/70 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <BellRing className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-800 flex items-center gap-1.5">
                      晨間 08:00 推播通知中心
                    </h3>
                    <p className="text-[10.5px] text-slate-500 font-medium">
                      每日 08:00 自動推送行程、註場位置及放假名單 (支援個人/全體範圍設定)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsBriefingModalOpen(false);
                    setNotifFeedback(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-left">
                {/* Feedback Toast / Alert */}
                {notifFeedback && (
                  <div className={`p-3 rounded-xl border flex items-start justify-between gap-2 animate-fade-in text-xs font-bold ${
                    notifFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      : notifFeedback.type === 'error'
                      ? 'bg-rose-50 text-rose-900 border-rose-200'
                      : 'bg-amber-50 text-amber-900 border-amber-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      {notifFeedback.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>{notifFeedback.message}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifFeedback(null)}
                      className="text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Status & Controls Card */}
                <div className="p-3.5 bg-slate-50/90 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">設備通知權限：</span>
                      <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md border ${
                        notifPermission === 'granted'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : notifPermission === 'denied'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {notifPermission === 'granted' ? '🟢 已允許通知' : notifPermission === 'denied' ? '🔴 已被瀏覽器封鎖' : '🟡 尚未授權'}
                      </span>
                    </div>

                    {notifPermission !== 'granted' && (
                      <button
                        type="button"
                        onClick={handleRequestPermission}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-extrabold cursor-pointer transition-all active:scale-95 shadow-3xs flex items-center gap-1"
                      >
                        <Bell className="w-3 h-3" />
                        <span>一鍵允許通知</span>
                      </button>
                    )}
                  </div>

                  {/* Daily 8:00 AM Switch */}
                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-800 block">每日早晨 08:00 自動推播</span>
                      <span className="text-[10px] text-slate-500 font-medium block">
                        每天早上 8 點系統自動將是日行程彙整推播至此設備
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={isDaily8AMEnabled}
                        onChange={(e) => handleToggleDaily8AM(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  {/* Push Notification Scope Switcher (只推送自己 vs 全部日程) */}
                  <div className="pt-2.5 border-t border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span>推送日程範圍設置：</span>
                      </span>
                      <span className={`text-[10.5px] px-2 py-0.5 rounded-md font-extrabold border ${
                        notifScope === 'own'
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-indigo-100 text-indigo-900 border-indigo-300'
                      }`}>
                        {notifScope === 'own' ? `👤 僅推送我的日程 (${myUserLabel || '自己'})` : '👥 全體成員日程 (團隊全體)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-200/70 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => handleToggleNotifScope('all')}
                        className={`py-1.5 px-2.5 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          notifScope === 'all'
                            ? 'bg-white text-indigo-950 shadow-xs border border-indigo-200'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Users className={`w-3.5 h-3.5 ${notifScope === 'all' ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span>全部日程 (全體成員)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleNotifScope('own')}
                        className={`py-1.5 px-2.5 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          notifScope === 'own'
                            ? 'bg-white text-amber-950 shadow-xs border border-amber-300'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <User className={`w-3.5 h-3.5 ${notifScope === 'own' ? 'text-amber-600' : 'text-slate-400'}`} />
                        <span className="truncate">只推送自己 ({myUserLabel || '我'})</span>
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-500 font-medium">
                      {notifScope === 'own'
                        ? `💡 目前設為「只推送自己」：每天早上 08:00 僅會收到與您 [${myUserLabel || '目前用戶'}] 相關的個人活動、現場註場位置與休假狀態。`
                        : '💡 目前設為「全部成員日程」：每天早上 08:00 將完整彙整推送公司全體同仁之行程、現場註場與休假名單。'}
                    </p>
                  </div>

                  {/* Immediate Test Push */}
                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-600">立即測試當前設定推送：</span>
                    <button
                      type="button"
                      onClick={() => handleTriggerTestPush(previewDate)}
                      disabled={isTestingNotif}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg text-xs font-extrabold cursor-pointer transition-all active:scale-95 shadow-3xs flex items-center gap-1.5"
                    >
                      <Send className="w-3 h-3" />
                      <span>{isTestingNotif ? '發送中...' : `⚡ 發送晨間推送測試 (${notifScope === 'own' ? '個人' : '全體'})`}</span>
                    </button>
                  </div>
                </div>

                {/* Briefing Live Preview Section */}
                <div className="space-y-2.5 text-left">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>推播內容即時預覽 ({previewDate} {briefing.weekday})</span>
                    </h4>
                    <span className="text-[10px] text-slate-400 font-medium font-mono">
                      {notifScope === 'own' ? `[個人範圍: ${myUserLabel || '我'}]` : '[全體範圍]'}
                    </span>
                  </div>

                  {/* Push Notification Card Mockup */}
                  <div className="p-3.5 bg-gradient-to-br from-amber-50/50 to-orange-50/30 border border-amber-200 rounded-xl space-y-2.5 shadow-2xs">
                    <div className="flex items-center gap-2 pb-2 border-b border-amber-200/60">
                      <div className="w-5 h-5 rounded-md bg-amber-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                        8
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-extrabold text-slate-800 block truncate">
                          {briefing.title}
                        </span>
                        <span className="text-[9.5px] text-slate-500 font-mono block">
                          時間：08:00 AM · {notifScope === 'own' ? '個人專屬推送' : '全體團隊推送'}
                        </span>
                      </div>
                    </div>

                    {/* Section 1: Stationing */}
                    <div className="space-y-1">
                      <span className="text-[10.5px] font-extrabold text-indigo-900 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-indigo-600" />
                        {notifScope === 'own' ? '今日您的註場位置：' : `今日註場 / 駐場人員 (${briefing.stationList.length} 人)：`}
                      </span>
                      {briefing.stationList.length > 0 ? (
                        <div className="grid grid-cols-1 gap-1">
                          {briefing.stationList.map((st, i) => (
                            <div key={i} className="px-2 py-1 bg-white border border-indigo-100 rounded-md text-[11px] font-bold text-slate-700 flex items-center justify-between">
                              <span className="text-indigo-950 font-extrabold">{st.name}</span>
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-bold">
                                📍 註場：{st.location}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 pl-4">
                          {notifScope === 'own' ? '今日您無現場註場登記' : '今日暫無註場登記'}
                        </p>
                      )}
                    </div>

                    {/* Section 2: General Events */}
                    <div className="space-y-1 pt-1">
                      <span className="text-[10.5px] font-extrabold text-amber-900 flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3 text-amber-600" />
                        {notifScope === 'own' ? `今日您的活動安排 (${briefing.generalEvents.length} 項)：` : `今日行事曆活動 (${briefing.generalEvents.length} 項)：`}
                      </span>
                      {briefing.generalEvents.length > 0 ? (
                        <div className="grid grid-cols-1 gap-1">
                          {briefing.generalEvents.map((evt, i) => (
                            <div key={i} className="px-2 py-1 bg-white border border-amber-100 rounded-md text-[11px] font-bold text-slate-700 flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[9.5px] font-mono text-slate-500 bg-slate-100 px-1 rounded">{evt.time}</span>
                                <span className="truncate">{evt.title.replace(/^\[.*?\]\s*/, '')}</span>
                              </div>
                              <span className="text-[10px] text-amber-700 font-extrabold shrink-0">
                                {evt.createdBy} {evt.location ? `· 📍${evt.location}` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 pl-4">
                          {notifScope === 'own' ? '今日您無預排見客/度尺等個人日程' : '今日無預排見客/度尺等日程'}
                        </p>
                      )}
                    </div>

                    {/* Section 3: Holidays / Leaves */}
                    <div className="space-y-1 pt-1">
                      <span className="text-[10.5px] font-extrabold text-rose-900 flex items-center gap-1">
                        <Coffee className="w-3 h-3 text-rose-600" />
                        {notifScope === 'own' ? '今日休假狀態：' : `今日休假人員 (${briefing.holidayList.length} 人)：`}
                      </span>
                      {briefing.holidayList.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {briefing.holidayList.map((h, i) => (
                            <span key={i} className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-md text-[10.5px] font-extrabold">
                              {h.name} ({h.type})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 pl-4">
                          {notifScope === 'own' ? '今日正常當值，無休假' : '今日全員當值，無休假登記'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Feature Notes */}
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 text-[10.5px] text-slate-500">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700">
                    <Info className="w-3.5 h-3.5 text-amber-600" />
                    <span>推播功能說明</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                    <li>每天早上 08:00 系統將依據您的「推送範圍設定」自動產生晨間通報並推播至設備。</li>
                    <li>選擇「只推送自己」可避免受到其他同仁行程干擾，精準掌握今日個人要務。</li>
                    <li>點擊推播通知即可直接打開系統並瀏覽當日完整行事曆。</li>
                  </ul>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-3 sm:px-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsBriefingModalOpen(false);
                    setNotifFeedback(null);
                  }}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-3xs"
                >
                  關閉中心
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
