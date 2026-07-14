import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, Clock, MapPin, AlignLeft, Plus, Trash2, Edit, 
  ChevronLeft, ChevronRight, Info, Sparkles, User, Briefcase, Check, X, 
  AlertCircle, FileText, Search, PlusCircle, Hammer, Landmark, MapPinned
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

export const getUserColorPalette = (usernameOrDisplayName?: string) => {
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

interface CalendarDashboardProps {
  currentUser: UserAccount | null;
  quotations: Quotation[];
  calendarEvents: CalendarEvent[];
  onSaveEvent: (event: CalendarEvent) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
}

export default function CalendarDashboard({
  currentUser,
  quotations,
  calendarEvents,
  onSaveEvent,
  onDeleteEvent
}: CalendarDashboardProps) {
  // Sub-tabs: General Calendar (公司行事曆) vs Construction Calendar (施工工程日曆)
  const [subTab, setSubTab] = useState<'general' | 'engineering'>('general');
  
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
  const [generalViewMode, setGeneralViewMode] = useState<'grid' | 'list'>('grid');
  const [onlyShowOwnEvents, setOnlyShowOwnEvents] = useState<boolean>(false);

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
  
  // Form fields
  const [formTitle, setFormTitle] = useState<string>('見客');
  const [formType, setFormType] = useState<'visit' | 'measure' | 'remeasure' | 'other'>('visit');
  const [formDate, setFormDate] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [formTime, setFormTime] = useState<string>('10:00');
  const [formLocation, setFormLocation] = useState<string>('旺角');
  const [formRemarks, setFormRemarks] = useState<string>('');
  const [formFocusRemarks, setFormFocusRemarks] = useState<boolean>(false);

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

  // Filter general calendar events by search query and "只顯示自己" toggle
  const filteredCalendarEvents = useMemo(() => {
    let list = calendarEvents;
    
    // Filter by own events if enabled
    if (onlyShowOwnEvents && currentUser) {
      const myLabel = currentUser.displayName || currentUser.username || 'System';
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
  }, [calendarEvents, generalSearchQuery, onlyShowOwnEvents, currentUser]);

  // Group events by date for fast lookup in grid dots
  const eventsByDate = useMemo(() => {
    const mapping: Record<string, CalendarEvent[]> = {};
    filteredCalendarEvents.forEach(evt => {
      if (!mapping[evt.date]) mapping[evt.date] = [];
      mapping[evt.date].push(evt);
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
      return a.time.localeCompare(b.time);
    });
  }, [filteredCalendarEvents, currentYear, currentMonth]);

  // Events on selected day
  const selectedDayEvents = useMemo(() => {
    return eventsByDate[selectedDateStr] || [];
  }, [eventsByDate, selectedDateStr]);

  // --- Quick Template Selection Handler ---
  const handleApplyTemplate = (type: 'visit' | 'other') => {
    setFormType(type);
    setFormFocusRemarks(false);

    if (type === 'visit') {
      setFormTitle('見客');
      // Set location if empty to Mong kok or keep original
      if (!formLocation) setFormLocation('旺角');
    } else {
      setFormTitle('一般行程');
    }
  };

  // --- Save / Edit / Delete General Event ---
  const handleOpenNewForm = () => {
    setEditingEventId(null);
    setFormTitle('見客');
    setFormType('visit');
    setFormDate(selectedDateStr || getTodayDateString());
    setFormTime('10:00');
    setFormLocation('旺角');
    setFormRemarks('');
    setFormFocusRemarks(false);
    setIsFormOpen(true);
    setTimeout(() => {
      formContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleEditEvent = (evt: CalendarEvent) => {
    setEditingEventId(evt.id);
    
    // Strip user prefix if present, e.g. [Username] Item -> Item
    let cleanTitle = evt.title;
    const prefixRegex = /^\[.*?\]\s*/;
    cleanTitle = cleanTitle.replace(prefixRegex, '');
    
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

    // Use current user's name or username
    const userLabel = currentUser?.displayName || currentUser?.username || 'System';
    
    // Strip any existing prefix first
    let rawTitle = formTitle.trim();
    if (!rawTitle) {
      const typeLabels: Record<string, string> = {
        visit: '見客',
        measure: '現場度尺',
        remeasure: '現場覆尺',
        other: '其他行程'
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
    setFormTitle('見客');
    setFormType('visit');
    setFormLocation('旺角');
    setFormRemarks('');
    setFormFocusRemarks(false);
    setIsFormOpen(false);
  };

  const handleDeleteEvent = async (id: string) => {
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
    <div className="space-y-6" id="calendar-dashboard">
      {/* Visual Header / Subtabs Switcher */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-amber-600 animate-pulse" />
            <span>智能行事曆與施工工程日曆</span>
          </h2>
        </div>

        {/* Subtabs Button Group */}
        <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 select-none self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSubTab('general')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'general'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>公司行事曆</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('engineering')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'engineering'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Hammer className="w-4 h-4" />
            <span>施工工程日曆</span>
            {consolidatedConstructionTimeline.length > 0 && (
              <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {projectsWithSchedules.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* --- SUBTAB VIEW 1: GENERAL COMPANY CALENDAR (公司行事曆) --- */}
      {subTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
          
          {/* LEFT PANEL: Interactive Grid and Day Listing */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              
              {/* Calendar Grid Header */}
              <div className="flex flex-col gap-3.5 mb-5 border-b border-slate-100 pb-4">
                {/* Upper Row: Title, Navigations, and Action Toggles */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-md font-black text-slate-805 flex items-center gap-1.5">
                      <CalendarIcon className="w-5 h-5 text-amber-600" />
                      <span>{currentYear}年 {currentMonth + 1}月</span>
                    </h3>
                    <button
                      type="button"
                      onClick={handleGoToToday}
                      className="px-2.5 py-1 text-xs bg-amber-55 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-md font-bold active:scale-95 transition-all cursor-pointer"
                    >
                      今天
                    </button>
                    <div className="flex items-center gap-0.5 ml-1">
                      <button
                        type="button"
                        onClick={handlePrevMonth}
                        className="p-1 border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 cursor-pointer active:scale-95 transition-all"
                        title="上個月"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextMonth}
                        className="p-1 border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 cursor-pointer active:scale-95 transition-all"
                        title="下個月"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Top Right Action Controls: Toggles & Buttons */}
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {/* "只顯示自己" Filter Button */}
                    {currentUser && (
                      <button
                        type="button"
                        onClick={() => setOnlyShowOwnEvents(!onlyShowOwnEvents)}
                        className={`h-8 px-3 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all border shrink-0 ${
                          onlyShowOwnEvents
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs hover:bg-amber-700'
                            : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <User className={`w-3.5 h-3.5 ${onlyShowOwnEvents ? 'text-white' : 'text-slate-400'}`} />
                        <span>只顯示自己</span>
                      </button>
                    )}

                    {/* View mode toggle button group */}
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 select-none h-8 shrink-0">
                      <button
                        type="button"
                        onClick={() => setGeneralViewMode('grid')}
                        className={`h-full px-3 rounded-md text-[11px] font-bold cursor-pointer transition-all flex items-center justify-center gap-1 ${
                          generalViewMode === 'grid'
                            ? 'bg-white text-slate-800 shadow-3xs'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        月曆格點
                      </button>
                      <button
                        type="button"
                        onClick={() => setGeneralViewMode('list')}
                        className={`h-full px-3 rounded-md text-[11px] font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                          generalViewMode === 'list'
                            ? 'bg-white text-slate-800 shadow-3xs'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <span>列表清單</span>
                        {currentMonthEvents.length > 0 && (
                          <span className={`px-1.5 py-0.5 text-[9px] rounded-full font-black ${
                            generalViewMode === 'list'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}>
                            {currentMonthEvents.length}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lower Row: Event Search Input */}
                <div className="relative w-full h-8.5">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="快速搜尋日程/建立者/地點..."
                    value={generalSearchQuery}
                    onChange={(e) => setGeneralSearchQuery(e.target.value)}
                    className="w-full h-full pl-9 pr-8 text-xs bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200/80 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 rounded-xl focus:outline-none transition-all font-semibold text-slate-700 placeholder-slate-400"
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
                        const isVisit = evt.type === 'visit';
                        const isMeasure = evt.type === 'measure';
                        const isRemeasure = evt.type === 'remeasure';
                        const palette = getUserColorPalette(evt.createdBy);
                        const isSelected = selectedDateStr === evt.date;

                        return (
                          <div 
                            key={evt.id} 
                            onClick={() => setSelectedDateStr(evt.date)}
                            className={`relative group p-3.5 bg-white border rounded-xl shadow-3xs cursor-pointer transition-all hover:shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 ${
                              isSelected 
                                ? 'border-amber-500 ring-1 ring-amber-500/20 bg-amber-50/10' 
                                : 'border-slate-150 hover:border-slate-300'
                            }`}
                            style={{ borderLeftColor: palette.hex }}
                          >
                            {/* Dot indicator on vertical timeline line */}
                            <span 
                              className="absolute -left-[27px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-white ring-2 transition-all"
                              style={{ 
                                backgroundColor: palette.hex,
                                ringColor: isSelected ? '#d97706' : '#cbd5e1'
                              } as React.CSSProperties}
                            />

                            <div className="flex gap-3">
                              {/* Type icon */}
                              <div 
                                className="p-2 rounded-lg shrink-0 flex items-center justify-center border text-slate-700 h-9 w-9 self-center"
                                style={{ backgroundColor: palette.bgLight, color: palette.hex, borderColor: palette.border }}
                              >
                                {isVisit && <User className="w-4 h-4" />}
                                {isMeasure && <Sparkles className="w-4 h-4" />}
                                {isRemeasure && <Hammer className="w-4 h-4" />}
                                {!isVisit && !isMeasure && !isRemeasure && <CalendarIcon className="w-4 h-4" />}
                              </div>

                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-mono font-black text-slate-500">{evt.date}</span>
                                  <span className="text-[10px] font-mono font-bold bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">{evt.time}</span>
                                  <h4 className="text-xs font-extrabold text-slate-800">{evt.title.replace(/^\[.*?\]\s*/, '')}</h4>
                                  <span 
                                    className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${palette.text}`}
                                    style={{ backgroundColor: palette.bgLight }}
                                  >
                                    建立者: {evt.createdBy}
                                  </span>
                                </div>
                                {evt.remarks && (
                                  <p className="text-[11px] text-gray-500 mt-1 truncate max-w-md">{evt.remarks}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                              {evt.location && (
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
                      
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedDateStr(cell.dateString)}
                          className={`min-h-[55px] sm:min-h-[85px] p-1 sm:p-1.5 border rounded-lg sm:rounded-xl flex flex-col justify-between transition-all relative cursor-pointer group text-left ${
                            isSelected 
                              ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500/30'
                              : isToday
                              ? 'border-emerald-500 bg-emerald-50/10'
                              : cell.isCurrentMonth
                              ? 'border-slate-100 hover:border-slate-300 bg-white'
                              : 'border-slate-50/50 bg-slate-50/20 opacity-50'
                          }`}
                        >
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm inline-block ${
                            isToday 
                              ? 'bg-emerald-600 text-white font-black' 
                              : cell.isCurrentMonth 
                              ? 'text-slate-700 font-extrabold' 
                              : 'text-gray-400'
                          }`}>
                            {cell.day}
                          </span>

                          {/* Event visual indicator badges */}
                          <div className="space-y-0.5 w-full mt-1.5 overflow-hidden">
                            {dayEvents.slice(0, 3).map((evt) => {
                              const palette = getUserColorPalette(evt.createdBy);
                              const cleanTitle = evt.title.replace(/^\[.*?\]\s*/, '');

                              return (
                                <div 
                                  key={evt.id} 
                                  className="text-[8px] font-bold px-1.5 py-0.5 rounded-xs truncate text-white max-w-full leading-tight flex items-center gap-0.5 shadow-3xs"
                                  style={{ backgroundColor: palette.hex }}
                                  title={`${evt.createdBy}: ${evt.title}`}
                                >
                                  <span>{evt.createdBy}: {cleanTitle}</span>
                                </div>
                              );
                            })}
                            {dayEvents.length > 3 && (
                              <div className="text-[7.5px] font-black text-amber-600 pl-1">
                                +{dayEvents.length - 3} 項
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
 
            {/* List of Events on Selected Day */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-extrabold text-slate-800">
                    {selectedDateStr} 日程清單
                  </h3>
                  <span className="text-2xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full font-mono">
                    共 {selectedDayEvents.length} 項
                  </span>
                </div>
                
                <button
                  type="button"
                  onClick={handleOpenNewForm}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1 shadow-3xs active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新增行程</span>
                </button>
              </div>
 
              {selectedDayEvents.length === 0 ? (
                <div className="py-12 border-2 border-dashed border-slate-100 rounded-xl text-center text-gray-400">
                  <Clock className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-500">該日無任何預排行程工作</p>
                  <p className="text-2xs text-gray-400 mt-1">您可以點擊右上角極速新增日常工作。</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayEvents.map((evt) => {
                    const isVisit = evt.type === 'visit';
                    const isMeasure = evt.type === 'measure';
                    const isRemeasure = evt.type === 'remeasure';
                    const palette = getUserColorPalette(evt.createdBy);
                    const isEditingThis = editingEventId === evt.id;
 
                    return (
                      <div 
                        key={evt.id}
                        className={`p-4 border rounded-xl flex items-start justify-between gap-4 shadow-3xs transition-all hover:bg-slate-50/50 ${
                          isEditingThis 
                            ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md bg-amber-50/10' 
                            : palette.border
                        }`}
                        style={{ backgroundColor: `${palette.bgExtraLight}33` }}
                      >
                        <div className="flex gap-3">
                          {/* Type Indicator visual badge with user colors */}
                          <div 
                            className={`p-2.5 rounded-xl shrink-0 border ${palette.border}`}
                            style={{ backgroundColor: palette.bgLight, color: palette.hex }}
                          >
                            {isVisit && <User className="w-4.5 h-4.5" />}
                            {isMeasure && <Sparkles className="w-4.5 h-4.5" />}
                            {isRemeasure && <Hammer className="w-4.5 h-4.5" />}
                            {!isVisit && !isMeasure && !isRemeasure && <CalendarIcon className="w-4.5 h-4.5" />}
                          </div>
 
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-sm font-bold text-slate-800">{evt.title}</h4>
                              <span 
                                className={`text-[9px] px-2 py-0.3 rounded-full font-bold border ${palette.border} ${palette.text}`}
                                style={{ backgroundColor: palette.bgLight }}
                              >
                                {isVisit ? '見客會面' : isMeasure ? '現場度尺' : isRemeasure ? '現場覆尺' : '一般行程'}
                              </span>
                              {isEditingThis && (
                                <span className="text-[9px] px-1.5 py-0.2 bg-amber-500 text-white rounded font-black animate-pulse">
                                  編輯中
                                </span>
                              )}
                            </div>
 
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-medium">
                              <div className="flex items-center gap-1 font-mono">
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                <span>{evt.time}</span>
                              </div>
                              {evt.location && (
                                <div className="flex items-center gap-1 text-slate-700 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>{evt.location}</span>
                                </div>
                              )}
                            </div>
 
                            {evt.remarks && (
                              <div className="text-xs bg-slate-50/80 border border-slate-100 p-2.5 rounded-lg text-slate-600 leading-relaxed font-medium mt-1">
                                {evt.remarks}
                              </div>
                            )}
 
                            <div className="text-[10px] text-gray-400 font-bold flex items-center gap-1 mt-1">
                              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: palette.hex }} />
                              <span>建立者：</span>
                              <span className={`${palette.text} font-black`}>{evt.createdBy}</span>
                            </div>
                          </div>
                        </div>
 
                        {/* Event actions (Edit, Delete) */}
                        <div className="flex items-center gap-1.5 shrink-0 select-none">
                          {confirmDeleteId === evt.id ? (
                            <div className="flex items-center gap-1 bg-rose-50/50 border border-rose-100 p-1 rounded-lg shadow-3xs animate-fade-in">
                              <span className="text-[10px] text-rose-600 font-extrabold px-1">刪除此行程？</span>
                              <button
                                type="button"
                                onClick={async () => {
                                  await handleDeleteEvent(evt.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold active:scale-95 cursor-pointer"
                              >
                                確定
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-[10px] text-slate-600 font-bold active:scale-95 cursor-pointer"
                              >
                                取消
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleEditEvent(evt)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  isEditingThis 
                                    ? 'text-amber-700 bg-amber-100 border border-amber-300 shadow-3xs' 
                                    : 'text-slate-500 hover:text-amber-600 hover:bg-slate-100'
                                }`}
                                title="編輯行程"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(evt.id)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="刪除行程"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* User Color Legend */}
              {uniqueCreators.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <span className="text-2xs font-extrabold text-gray-400 uppercase tracking-wider block mb-2">
                    成員色彩標籤：
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {uniqueCreators.map((creator) => {
                      const palette = getUserColorPalette(creator);
                      const isMe = creator === (currentUser?.displayName || currentUser?.username || 'System');
                      return (
                        <div 
                          key={creator}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all shadow-3xs ${palette.border} ${palette.text}`}
                          style={{ backgroundColor: palette.bgLight }}
                        >
                          <span className="w-2 h-2 rounded-full shadow-3xs" style={{ backgroundColor: palette.hex }} />
                          <span>{creator}</span>
                          {isMe && <span className="text-[9px] bg-white px-1 rounded-sm text-2xs uppercase border border-slate-200">我</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: "極速新增行程" (EXTREMELY FAST EVENT CREATION PANEL) */}
          <div ref={formContainerRef} className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm sticky top-4">
              <div className="border-b border-gray-100 pb-3 mb-4">
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4.5 h-4.5 text-amber-500 animate-pulse" />
                  <span>{editingEventId ? '編輯目前選定行程' : '新增行程'}</span>
                </h3>
              </div>

              {/* 1. Quick Template Selection Buttons */}
              <div className="space-y-2 mb-4">
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
              </div>

              {/* Form Input fields */}
              <form onSubmit={handleSaveForm} className="space-y-4">
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
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>

                {/* 3. Optimized Time Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      時間
                    </label>
                  </div>
                  <div className="relative">
                    <Clock className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    <input
                      type="time"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-mono font-bold"
                    />
                  </div>
                </div>

                {/* 4. Quick Location buttons (Enabled ONLY for 見客 type) */}
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

        </div>
      )}

      {/* --- SUBTAB VIEW 2: CONSOLIDATED ENGINEERING SCHEDULE (施工工程日曆) --- */}
      {subTab === 'engineering' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm text-left space-y-6">
          
          {/* Engineering filter row */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-md font-extrabold text-slate-800 flex items-center gap-1.5">
                <Hammer className="w-5 h-5 text-amber-500" />
                <span>全港各項目施工進度匯總對帳日曆</span>
              </h3>
              <p className="text-2xs text-gray-500 mt-0.5">
                自動提取已簽約及施工中合約的進度時程步驟，集中追蹤全港各裝修地址的每日工序。
              </p>
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
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/30">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    施工進度格點對照 ({currentYear}年 {currentMonth + 1}月)
                  </h4>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-1 border border-slate-200 bg-white rounded-md hover:bg-slate-50 text-slate-600 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1 border border-slate-200 bg-white rounded-md hover:bg-slate-50 text-slate-600 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
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
                        onClick={() => setSelectedDateStr(cell.dateString)}
                        className={`min-h-[85px] p-1.5 border rounded-xl flex flex-col justify-between transition-all relative cursor-pointer text-left ${
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
                          isToday ? 'bg-emerald-600 text-white' : 'text-slate-600'
                        }`}>
                          {cell.day}
                        </span>

                        {cellSteps.length > 0 && (
                          <div className="space-y-0.5 w-full mt-1.5 overflow-hidden">
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
                              <div className="text-[7.5px] font-black text-amber-600 pl-1">
                                +{cellSteps.length - 3} 處施工
                              </div>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Step list for selected day on right */}
            <div className="md:col-span-4 space-y-4">
              <div className="border border-slate-150 rounded-xl p-4 bg-white shadow-3xs">
                <h4 className="text-xs font-extrabold text-slate-700 flex items-center gap-1 border-b border-slate-100 pb-2 mb-3">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>{selectedDateStr} 當日施工工序</span>
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-full font-mono">
                    {selectedDayConstructionSteps.length} 處
                  </span>
                </h4>

                {selectedDayConstructionSteps.length === 0 ? (
                  <div className="py-12 text-center text-gray-400">
                    <Hammer className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-2xs font-bold text-slate-500">該日無任何合約施工安排</p>
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
          <div className="border border-slate-100 rounded-xl overflow-hidden mt-6">
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

    </div>
  );
}
