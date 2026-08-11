import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, Clock, MapPin, AlignLeft, Plus, Trash2, Edit, 
  ChevronLeft, ChevronRight, Info, Sparkles, User, Briefcase, Check, X, 
  AlertCircle, FileText, Search, PlusCircle, Hammer, Landmark, MapPinned,
  Coffee, Sun, Sunset, Building, MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarEvent, Quotation, UserAccount, ScheduleStep } from '../types';

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
      text: 'text-slate-800',
      border: 'border-slate-200',
      bgLight: customColor + '1c', // ~11% opacity for light bg
      bgExtraLight: customColor + '0d', // ~5% opacity
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
  return false;
};

export const isSiteStationEvent = (evt: CalendarEvent) => {
  if (evt.type === 'site_station') return true;
  const title = evt.title || '';
  return title.includes('駐場') || title.includes('註場') || title.includes('全日駐場');
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
}

export default function CalendarDashboard({
  currentUser,
  quotations,
  calendarEvents,
  onSaveEvent,
  onDeleteEvent,
  viewMode,
  userColors
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
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [hasClickedDay, setHasClickedDay] = useState<boolean>(false);

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
      if (now - lastTapRef.current < DOUBLE_PRESS_DELAY) {
        if (!hasPermission(currentUser, 'feat_manage_calendar_events')) {
          setPermissionError('您沒有建立/修改行事曆行程的權限');
          return;
        }
        setEditingEventId(null);
        if (currentUser) {
          setFormUser(currentUser.displayName || currentUser.username || 'System');
        }
        if (subTab === 'shifts') {
          setFormTitle('放假 (全天)');
          setFormType('holiday_full');
          setFormDate(dateString);
          setFormTime('00:00');
          setFormLocation('');
        } else {
          setFormTitle('見客');
          setFormType('visit');
          setFormDate(dateString);
          setFormTime('10:00');
          setFormLocation('旺角');
        }
        setFormRemarks('');
        setFormFocusRemarks(false);
        setIsFormOpen(true);
        
        setTimeout(() => {
          formContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
    }
    
    lastTapRef.current = now;
  };

  const handleDayDoubleClick = (dateString: string) => {
    if (isMobile) {
      handleOpenMobilePopUp(dateString);
      return;
    }
    if (!hasPermission(currentUser, 'feat_manage_calendar_events')) {
      setPermissionError('您沒有建立/修改行事曆行程的權限');
      return;
    }
    setSelectedDateStr(dateString);
    setHasClickedDay(true);
    setEditingEventId(null);
    if (currentUser) {
      setFormUser(currentUser.displayName || currentUser.username || 'System');
    }
    if (subTab === 'shifts') {
      setFormTitle('放假 (全天)');
      setFormType('holiday_full');
      setFormDate(dateString);
      setFormTime('00:00');
      setFormLocation('');
    } else {
      setFormTitle('見客');
      setFormType('visit');
      setFormDate(dateString);
      setFormTime('10:00');
      setFormLocation('旺角');
    }
    setFormRemarks('');
    setFormFocusRemarks(false);
    setIsFormOpen(true);
    
    setTimeout(() => {
      formContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };

  // Find all unique users who have created events to render in the legend
  const uniqueCreators = useMemo(() => {
    const creators = new Set<string>();
    if (currentUser) {
      creators.add(currentUser.displayName || currentUser.username || 'System');
    }
    calendarEvents.forEach(evt => {
      if (evt.createdBy) {
        creators.add(evt.createdBy);
      }
    });
    return Array.from(creators);
  }, [calendarEvents, currentUser]);

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
      list = list.filter(evt => evt.createdBy === selectedMemberFilter);
    } else if (onlyShowOwnEvents && currentUser) {
      list = list.filter(evt => evt.createdBy === myLabel);
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
    
    // Strip user prefix if present, e.g. [Username] Item -> Item
    let cleanTitle = evt.title;
    const prefixRegex = /^\[.*?\]\s*/;
    cleanTitle = cleanTitle.replace(prefixRegex, '');
    
    setFormUser(evt.createdBy || '');
    setFormTitle(cleanTitle);
    setFormType(evt.type);
    setFormDate(evt.date);
    setFormTime(evt.time);
    setFormLocation(evt.location || '');
    setFormRemarks(evt.remarks || '');
    setFormFocusRemarks(evt.type === 'measure' || evt.type === 'remeasure');
    setIsFormOpen(true);
    setTimeout(() => {
      formContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
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
      updatedAt: Date.now()
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
      updatedAt: Date.now()
    };

    await onSaveEvent(newEvent);
    setEditingEventId(null);
    setModalFormMode('none');
  };

  const handleQuickRegisterShiftInModal = async (type: 'holiday_full' | 'holiday_am' | 'holiday_pm' | 'site_station', location = '') => {
    if (!hasPermission(currentUser, 'feat_manage_calendar_events')) {
      setPermissionError('您沒有登記輪班/休假的權限');
      return;
    }
    const userLabel = currentUser?.displayName || currentUser?.username || 'System';
    
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

    const newEvent: CalendarEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: finalTitle,
      type,
      date: mobilePopUpDate,
      time: defaultTime,
      location: defaultLoc || undefined,
      createdBy: userLabel,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await onSaveEvent(newEvent);
    setModalFormMode('none');
    setIsSelectingStationLocation(false);
    setCustomStationLocation('');
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
                  <div className="mt-2 hidden sm:flex items-center justify-between bg-rose-50/90 border border-rose-200/80 px-2.5 py-1 rounded-lg text-2xs text-rose-900 font-bold text-left animate-fade-in">
                    <div className="flex items-center gap-1.5">
                      <span> <strong className="font-black text-rose-800">「顯示自己假期」</strong>，包含自己 ({currentUser.displayName || currentUser.username}) 之休假與駐場行程</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowMyLeaves(false)}
                      className="text-rose-700 hover:text-rose-950 font-black cursor-pointer text-2xs bg-rose-100/70 hover:bg-rose-200 px-2 py-0.5 rounded-md transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {selectedMemberFilter && (
                  <div className="mt-2 hidden sm:flex items-center justify-between bg-amber-50/90 border border-amber-200/80 px-2.5 py-1 rounded-lg text-2xs text-amber-900 font-bold text-left animate-fade-in">
                    <div className="flex items-center gap-1.5">
                      <span>🎯 <strong className="font-black text-amber-800">@{selectedMemberFilter}</strong> 的行事曆</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedMemberFilter(null)}
                      className="text-amber-700 hover:text-amber-950 font-black cursor-pointer text-2xs bg-amber-100/70 hover:bg-amber-200 px-2 py-0.5 rounded-md transition-colors"
                    >
                      ✕
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
                              backgroundColor: isSelected ? undefined : stTheme ? undefined : `${palette.bgExtraLight}33`
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

                            <div className="flex gap-3">
                              {/* Type icon */}
                              <div 
                                className={`p-2 rounded-lg shrink-0 flex items-center justify-center border h-9 w-9 self-center ${
                                  stTheme ? stTheme.badgeBgClass : ''
                                }`}
                                style={isStation ? undefined : { 
                                  backgroundColor: palette.bgLight, 
                                  color: palette.hex, 
                                  borderColor: palette.border 
                                }}
                              >
                                {isStation && <MapPinned className="w-4 h-4 text-white" />}
                                {!isStation && isVisit && <User className="w-4 h-4" />}
                                {!isStation && isMeasure && <Sparkles className="w-4 h-4" />}
                                {!isStation && isRemeasure && <Hammer className="w-4 h-4" />}
                                {!isStation && isHolidayFull && <Coffee className="w-4 h-4" />}
                                {!isStation && isHolidayAm && <Sun className="w-4 h-4" />}
                                {!isStation && isHolidayPm && <Sunset className="w-4 h-4" />}
                                {!isStation && !isVisit && !isMeasure && !isRemeasure && !isHoliday && <CalendarIcon className="w-4 h-4" />}
                              </div>

                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-mono font-black text-slate-500">{evt.date}</span>
                                  {!isHoliday && !isStation && (
                                    <span className="text-[10px] font-mono font-bold bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">{evt.time}</span>
                                  )}
                                  <h4 className="text-xs font-extrabold text-slate-800">{evt.title.replace(/^\[.*?\]\s*/, '')}</h4>
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
                                  <span 
                                    className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${isStation ? 'text-slate-800 bg-slate-100 border border-slate-200' : palette.text}`}
                                    style={isStation ? undefined : { backgroundColor: palette.bgLight }}
                                  >
                                    人員: {evt.createdBy}
                                  </span>
                                </div>
                                {isStation && (
                                  <div className={`mt-1 text-[10.5px] font-extrabold px-2 py-0.5 rounded-md inline-flex items-center gap-1 shadow-3xs ${stTheme?.tagBgClass}`}>
                                    <MapPin className={`w-3.5 h-3.5 shrink-0 ${stTheme?.iconTextClass}`} />
                                    <span>駐場位置：{evt.location || '全日駐場 (現場值勤)'}</span>
                                  </div>
                                )}
                                {evt.remarks && (
                                  <p className="text-[11px] text-gray-500 mt-1 truncate max-w-md">{evt.remarks}</p>
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
                  <div className="grid grid-cols-7 gap-1.5 text-center mb-1.5">
                    {['日', '一', '二', '三', '四', '五', '六'].map((label, idx) => (
                      <span key={idx} className={`text-[11px] font-bold py-1 ${idx === 0 || idx === 6 ? 'text-amber-600' : 'text-gray-400'}`}>
                        {label}
                      </span>
                    ))}
                  </div>

                  {/* Month Grid Cell Loop */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {gridDays.map((cell, idx) => {
                      const dayEvents = eventsByDate[cell.dateString] || [];
                      const isSelected = selectedDateStr === cell.dateString;
                      const isToday = cell.dateString === getTodayDateString();
                      
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
                          className={`min-h-[44px] md:min-h-[85px] p-1 md:p-1.5 border rounded-lg md:rounded-xl flex flex-col justify-between transition-all relative cursor-pointer group text-left ${
                            isSelected 
                              ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500/30'
                              : isToday
                              ? 'border-emerald-500 bg-emerald-50/10'
                              : cell.isCurrentMonth
                              ? 'border-slate-100 hover:border-slate-300 bg-white'
                              : 'border-slate-50/50 bg-slate-50/20 opacity-50'
                          }`}
                          style={
                            subTab === 'shifts' && dayEvents.length > 0 && !isSelected && !isToday && dayPalette
                              ? {
                                  backgroundColor: dayPalette.hex + '1a', // ~10% opacity for user custom color bg
                                  borderColor: dayPalette.hex + '60', // border color matches user custom color
                                }
                              : undefined
                          }
                        >
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-sm inline-block ${
                            isToday 
                              ? 'bg-emerald-600 text-white font-bold' 
                              : cell.isCurrentMonth 
                              ? 'text-slate-700 font-bold' 
                              : 'text-gray-400'
                          }`}>
                            {cell.day}
                          </span>

                          {/* Desktop view: Event text badges */}
                          <div className="hidden md:block space-y-0.5 w-full mt-1.5 overflow-hidden">
                            {dayEvents.slice(0, 3).map((evt) => {
                              const palette = getUserColorPalette(evt.createdBy, userColors?.[evt.createdBy]);
                              const cleanTitle = evt.title.replace(/^\[.*?\]\s*/, '');
                              const isStation = isSiteStationEvent(evt);
                              const isHolidayFull = evt.type === 'holiday_full';
                              const isHolidayAm = evt.type === 'holiday_am';
                              const isHolidayPm = evt.type === 'holiday_pm';
                              const emoji = '';

                              if (isStation) {
                                const stTheme = getStationLocationTheme(evt.location, evt.title);
                                return (
                                  <div 
                                    key={evt.id} 
                                    className={`text-[8px] font-black px-1 py-0.5 rounded-xs truncate max-w-full leading-tight flex items-center gap-0.5 shadow-2xs border cursor-pointer ${stTheme.gridBadgeClass}`}
                                    title={`[駐場 ] ${evt.createdBy}: ${evt.location || cleanTitle}`}
                                  >
                                    <MapPin className="w-2.5 h-2.5 shrink-0 text-white" />
                                    <span className="truncate">📍{evt.location || '駐場'}: {evt.createdBy}</span>
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

            {/* List of Events on Selected Day */}
            <div className="hidden sm:block bg-white border border-gray-200 rounded-xl p-3 md:p-3.5 shadow-sm">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1 flex-wrap">
                    <CalendarIcon className="w-3.5 h-3.5 text-amber-500" />
                    <h3 className="text-[11px] md:text-xs font-bold text-slate-800">
                      {selectedDateStr} 日程清單
                    </h3>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-full font-mono scale-90 origin-left">
                      共 {selectedDayEvents.length} 項
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenMobilePopUp(selectedDateStr)}
                      className="inline-flex sm:hidden px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[10px] font-extrabold items-center gap-0.5 active:scale-95 transition-all cursor-pointer"
                    >
                      📱 彈窗
                    </button>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleOpenNewForm}
                    className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-bold text-[10px] md:text-[11px] transition-all cursor-pointer flex items-center gap-0.5 shadow-3xs active:scale-95"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>新增行程</span>
                  </button>
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
                          style={{ backgroundColor: isStation ? undefined : `${palette.bgExtraLight}33` }}
                        >
                          <div className="flex gap-2 min-w-0">
                            {/* Type Indicator visual badge */}
                            <div 
                              className={`p-1 rounded-lg shrink-0 border flex items-center justify-center ${
                                stTheme ? stTheme.badgeBgClass : palette.border
                              }`}
                              style={isStation ? undefined : { backgroundColor: palette.bgLight, color: palette.hex }}
                            >
                              {isStation && <MapPinned className="w-3.5 h-3.5 text-white" />}
                              {!isStation && isVisit && <User className="w-3.5 h-3.5" />}
                              {!isStation && isMeasure && <Sparkles className="w-3.5 h-3.5" />}
                              {!isStation && isRemeasure && <Hammer className="w-3.5 h-3.5" />}
                              {!isStation && isHoliday && <Coffee className="w-3.5 h-3.5" />}
                              {!isStation && !isVisit && !isMeasure && !isRemeasure && !isHoliday && <CalendarIcon className="w-3.5 h-3.5" />}
                            </div>

                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-1 flex-wrap">
                                <h4 className="text-[11px] font-bold text-slate-800">{evt.title}</h4>
                                <span 
                                  className={`text-[8px] px-1.5 py-0.1 rounded-sm font-bold border ${
                                    stTheme 
                                      ? stTheme.badgeBgClass 
                                      : isHoliday 
                                      ? 'border-rose-200 bg-rose-50 text-rose-700' 
                                      : `${palette.border} ${palette.text}`
                                  }`}
                                  style={isStation || isHoliday ? undefined : { backgroundColor: palette.bgLight }}
                                >
                                  {isStation ? `駐場 · ${evt.location || stTheme?.name || '現場'}` : isVisit ? '見客會面' : isMeasure ? '現場度尺' : isRemeasure ? '現場覆尺' : isHoliday ? (evt.type === 'holiday_full' ? '全天放假' : evt.type === 'holiday_am' ? '上午放假' : '下午放假') : '一般行程'}
                                </span>
                                {isEditingThis && (
                                  <span className="text-[8px] px-1 py-0.1 bg-amber-500 text-white rounded font-bold animate-pulse">
                                    編輯中
                                  </span>
                                )}
                              </div>

                              {/* Priority Stationing Location Banner */}
                              {isStation && (
                                <div className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md inline-flex items-center gap-1 shadow-3xs my-0.5 ${stTheme?.tagBgClass}`}>
                                  <MapPin className={`w-3.5 h-3.5 shrink-0 ${stTheme?.iconTextClass}`} />
                                  <span>駐場位置：{evt.location || '全日駐場 (請編輯填寫詳細地點)'}</span>
                                </div>
                              )}

                              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-slate-500 font-medium">
                                {!isHoliday && !isStation && (
                                  <div className="flex items-center gap-0.5 font-mono">
                                    <Clock className="w-2.5 h-2.5 text-gray-400" />
                                    <span>{evt.time}</span>
                                  </div>
                                )}
                                {!isStation && evt.location && (
                                  <div className="flex items-center gap-0.5 text-slate-700 font-bold bg-slate-100 px-1 py-0.1 rounded text-[9.5px]">
                                    <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                                    <span>{evt.location}</span>
                                  </div>
                                )}
                              </div>

                              {evt.remarks && (
                                <div className="text-[9.5px] bg-slate-50/80 border border-slate-100 p-1.5 rounded-md text-slate-600 leading-normal font-medium mt-0.5">
                                  {evt.remarks}
                                </div>
                              )}

                              <div className="text-[9px] text-gray-400 font-bold flex items-center gap-0.5 mt-0.5">
                                <span className="w-1 h-1 rounded-full inline-block" style={{ backgroundColor: palette.hex }} />
                                <span>建立者：</span>
                                <span className={`${palette.text} font-bold`}>{evt.createdBy}</span>
                              </div>
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

                {/* User Color Legend */}
                {uniqueCreators.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                        成員：
                      </span>
                      {selectedMemberFilter && (
                        <button
                          type="button"
                          onClick={() => setSelectedMemberFilter(null)}
                          className="text-[9px] text-amber-700 hover:text-amber-900 font-bold bg-amber-50 hover:bg-amber-100 px-1.5 py-0.2 rounded-full transition-all cursor-pointer border border-amber-200/80 shadow-3xs"
                        >
                           ✕
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {/* All Members Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMemberFilter(null);
                          setOnlyShowOwnEvents(false);
                        }}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold border transition-all cursor-pointer ${
                          selectedMemberFilter === null && !onlyShowOwnEvents
                            ? 'bg-slate-800 text-white border-slate-800 shadow-xs ring-1 ring-slate-400/30 font-black'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        <span>全部成員</span>
                      </button>

                      {uniqueCreators.map((creator) => {
                        const palette = getUserColorPalette(creator, userColors?.[creator]);
                        const isMe = creator === (currentUser?.displayName || currentUser?.username || 'System');
                        const isSelected = selectedMemberFilter === creator;
                        const isDimmed = selectedMemberFilter !== null && !isSelected;

                        return (
                          <button 
                            type="button"
                            key={creator}
                            onClick={() => {
                              if (selectedMemberFilter === creator) {
                                setSelectedMemberFilter(null);
                              } else {
                                setSelectedMemberFilter(creator);
                                setOnlyShowOwnEvents(false);
                              }
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold border transition-all cursor-pointer shadow-3xs ${
                              isSelected 
                                ? 'ring-1 ring-amber-500 ring-offset-1 font-extrabold scale-102 border-amber-600 shadow-xs' 
                                : isDimmed 
                                  ? 'opacity-40 hover:opacity-80 scale-95' 
                                  : 'hover:scale-102 hover:shadow-2xs'
                            }`}
                            style={{ 
                              backgroundColor: isSelected ? palette.hex : palette.bgLight,
                              color: isSelected ? '#ffffff' : palette.text.includes('text-') ? undefined : palette.text,
                              borderColor: isSelected ? palette.hex : undefined
                            }}
                          >
                            <span 
                              className={`w-1.2 h-1.2 rounded-full shadow-3xs transition-transform ${isSelected ? 'scale-125' : ''}`} 
                              style={{ backgroundColor: isSelected ? '#ffffff' : palette.hex }} 
                            />
                            <span className={isSelected ? 'text-white' : palette.text}>{creator}</span>
                            {isMe && (
                              <span className={`text-[7.5px] px-0.8 rounded-xs font-bold uppercase border ${
                                isSelected 
                                  ? 'bg-white/25 text-white border-white/40' 
                                  : 'bg-white text-slate-700 border-slate-200'
                              }`}>
                                我
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
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
          className="bg-white border border-gray-200 rounded-2xl p-3.5 sm:p-5 shadow-sm text-left space-y-4 sm:space-y-6"
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
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Calendar display on left */}
            <div className="md:col-span-8 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm md:text-xs font-bold text-slate-500 uppercase tracking-wider">
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

                <div className="grid grid-cols-7 gap-1.5 text-center mb-1.5">
                  {['日', '一', '二', '三', '四', '五', '六'].map((label, idx) => (
                    <span key={idx} className="text-[10px] font-bold text-slate-400">
                      {label}
                    </span>
                  ))}
                </div>

                {/* Day blocks loop */}
                <div className="grid grid-cols-7 gap-1.5">
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
                        className={`min-h-[44px] md:min-h-[85px] p-1 md:p-1.5 border rounded-lg md:rounded-xl flex flex-col justify-between transition-all relative cursor-pointer text-left ${
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

            {/* Step list for selected day on right (Hidden on mobile) */}
            <div className="hidden md:block md:col-span-4 space-y-4">
              <div className="border border-slate-150 rounded-xl p-3.5 bg-white shadow-3xs">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1 border-b border-slate-100 pb-2 mb-3">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>{selectedDateStr} 當日施工工序</span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-full font-mono">
                      {selectedDayConstructionSteps.length} 處
                    </span>
                  </h4>

                  {selectedDayConstructionSteps.length === 0 ? (
                    <div className="py-8 text-center text-gray-400">
                      <Hammer className="w-8 h-8 text-slate-200 mx-auto mb-1.5" />
                      <p className="text-xs font-bold text-slate-500">該日無任何合約施工安排</p>
                    </div>
                  ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {selectedDayConstructionSteps.map((step, sIdx) => {
                      const stepColor = getGanttStepColor(step.stepIndex);
                      return (
                        <div 
                          key={sIdx}
                          className={`p-3 rounded-lg border text-xs space-y-1.5 border-l-4 transition-all hover:shadow-3xs`}
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
          <div className="hidden md:block border border-slate-100 rounded-xl overflow-hidden mt-6">
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
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold transition-colors cursor-pointer text-sm ml-0.5"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body - Scrollable Items List & Forms */}
            <div className="p-3.5 pb-12 space-y-3 overflow-y-auto flex-1 min-h-0 bg-slate-50/50">
              {/* Form Mode: Add General Event */}
              {modalFormMode === 'add_event' && (
                <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-xs space-y-3 animate-fade-in text-left">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-extrabold text-amber-800 flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5 text-amber-600" />
                      新增行程 ({mobilePopUpDate})
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setModalFormMode('none')}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded bg-slate-100"
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

                  <div className="pt-1 flex gap-2">
                    <button
                      type="button"
                      onClick={handleSaveModalEvent}
                      className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-98"
                    >
                      儲存行程
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
                          className={`p-3 bg-white border rounded-xl shadow-3xs flex items-start justify-between gap-2 border-l-4 cursor-pointer select-none transition-all hover:bg-slate-50/50 ${
                            stTheme ? stTheme.borderClass : palette.border
                          }`}
                          style={{ borderLeftColor: stTheme ? stTheme.primaryHex : palette.hex }}
                        >
                          <div className="flex gap-2.5 min-w-0">
                            <div 
                              className="p-1.5 rounded-lg shrink-0 border flex items-center justify-center h-8 w-8 self-center"
                              style={{ backgroundColor: palette.bgLight, color: palette.hex, borderColor: palette.border }}
                            >
                              {isStation ? <MapPinned className="w-4 h-4" /> : <CalendarIcon className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {!isStation && (
                                  <span className="text-[10px] font-mono font-bold bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">{evt.time}</span>
                                )}
                                <h4 className="text-xs font-extrabold text-slate-800 truncate">{cleanTitle}</h4>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[10px]">
                                <span className="font-bold text-slate-500">人員: {evt.createdBy}</span>
                                {evt.location && (
                                  <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold border border-emerald-100">
                                    📍 {evt.location}
                                  </span>
                                )}
                              </div>
                              {evt.remarks && (
                                <p className="text-[10.5px] text-slate-500 mt-1">{evt.remarks}</p>
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
                return shiftEvents.length === 0 ? (
                  <div className="py-8 bg-white border border-dashed border-slate-200 rounded-xl text-center text-slate-400">
                    <Coffee className="w-7 h-7 text-slate-200 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-slate-500">當日尚無人員輪班或休假紀錄</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">可點擊右上角 + 登記輪班</p>
                  </div>
                ) : (
                  <div className="space-y-2 text-left">
                    {shiftEvents.map((evt) => {
                      const isStation = isSiteStationEvent(evt);
                      const isHoliday = isHolidayEvent(evt);
                      const stTheme = isStation ? getStationLocationTheme(evt.location, evt.title) : null;
                      const palette = getUserColorPalette(evt.createdBy, userColors?.[evt.createdBy]);
                      const cleanTitle = evt.title.replace(/^\[.*?\]\s*/, '');

                      return (
                        <div 
                          key={evt.id}
                          {...createLongPressProps(evt)}
                          className={`p-3 bg-white border rounded-xl shadow-3xs flex items-start justify-between gap-2 border-l-4 cursor-pointer select-none transition-all hover:bg-slate-50/50 ${
                            stTheme ? stTheme.borderClass : palette.border
                          }`}
                          style={{ borderLeftColor: stTheme ? stTheme.primaryHex : palette.hex }}
                        >
                          <div className="flex gap-2.5 min-w-0">
                            <div 
                              className="p-1.5 rounded-lg shrink-0 border flex items-center justify-center h-8 w-8 self-center"
                              style={{ backgroundColor: palette.bgLight, color: palette.hex, borderColor: palette.border }}
                            >
                              {isStation ? <MapPinned className="w-4 h-4" /> : <Coffee className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {!isHoliday && !isStation && (
                                  <span className="text-[10px] font-mono font-bold bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded border border-rose-100">{evt.time}</span>
                                )}
                                <h4 className="text-xs font-extrabold text-slate-800 truncate">{cleanTitle}</h4>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[10px]">
                                <span className="font-bold text-slate-600">登記人員: {evt.createdBy}</span>
                                {evt.location && (
                                  <span className="text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded font-bold border border-indigo-100">
                                    📍 {evt.location}
                                  </span>
                                )}
                              </div>
                              {evt.remarks && (
                                <p className="text-[10.5px] text-slate-500 mt-1">{evt.remarks}</p>
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

    </div>
  );
}
