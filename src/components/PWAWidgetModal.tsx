import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Smartphone, 
  Layout, 
  Plus, 
  RefreshCw, 
  CheckCircle2, 
  Share2, 
  Copy, 
  Sparkles, 
  X, 
  ChevronRight, 
  Pin, 
  Clock, 
  MapPin, 
  User, 
  ExternalLink,
  Layers,
  Sliders,
  Check
} from 'lucide-react';
import { CalendarEvent } from '../types';
import { getUserColorPalette } from './CalendarDashboard';

interface PWAWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  userColors?: Record<string, string>;
  onAddEvent: () => void;
  onSelectEvent?: (event: CalendarEvent) => void;
  onToggleFloatingWidget?: () => void;
  isFloatingWidgetActive?: boolean;
}

export const PWAWidgetModal: React.FC<PWAWidgetModalProps> = ({
  isOpen,
  onClose,
  events,
  userColors = {},
  onAddEvent,
  onSelectEvent,
  onToggleFloatingWidget,
  isFloatingWidgetActive = false
}) => {
  const [activePlatform, setActivePlatform] = useState<'ios' | 'android'>('ios');
  const [widgetSize, setWidgetSize] = useState<'small' | 'medium' | 'large' | '2weeks' | '1month' | 'lockscreen'>('medium');
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (!isOpen) return null;

  // Filter today & upcoming events
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(e => e.date === todayStr);
  const upcomingEvents = events
    .filter(e => e.date >= todayStr)
    .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));

  const displayEvents = todayEvents.length > 0 ? todayEvents : upcomingEvents.slice(0, 5);

  const getWidgetUrl = () => {
    const origin = window.location.origin;
    return `${origin}/?view=calendar&mode=widget`;
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(getWidgetUrl());
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const todayDateObj = new Date();
  const dayOfWeekNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const formattedDayOfWeek = dayOfWeekNames[todayDateObj.getDay()];
  const formattedMonthDay = `${todayDateObj.getMonth() + 1}月${todayDateObj.getDate()}日`;

  // Helper for 2-weeks days array
  const getTwoWeeksDays = () => {
    const today = new Date();
    const currentDayOfWeek = today.getDay();
    const diffToMon = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + diffToMon);

    const days = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const yearStr = d.getFullYear();
      const mStr = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yearStr}-${mStr}-${dayStr}`;
      const dayEvents = events.filter(e => e.date === dateStr);
      days.push({
        dateStr,
        dayNum: d.getDate(),
        monthNum: d.getMonth() + 1,
        isToday: dateStr === todayStr,
        events: dayEvents,
        dayName: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
      });
    }
    return days;
  };

  // Helper for 1-month days array
  const getOneMonthDays = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startingDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      const d = new Date(year, month, 1 - (startingDayOfWeek - i));
      const yStr = d.getFullYear();
      const mStr = String(d.getMonth() + 1).padStart(2, '0');
      const dStr = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yStr}-${mStr}-${dStr}`;
      days.push({
        dateStr,
        dayNum: d.getDate(),
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        events: events.filter(e => e.date === dateStr)
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const yStr = d.getFullYear();
      const mStr = String(d.getMonth() + 1).padStart(2, '0');
      const dStr = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yStr}-${mStr}-${dStr}`;
      days.push({
        dateStr,
        dayNum: day,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        events: events.filter(e => e.date === dateStr)
      });
    }
    return { year, month: month + 1, days };
  };

  const twoWeeksDays = getTwoWeeksDays();
  const monthData = getOneMonthDays();

  const handleSelectAndGoToCalendar = (evt?: CalendarEvent) => {
    if (evt && onSelectEvent) {
      onSelectEvent(evt);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="pwa-widget-modal-content bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-4xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-wide text-white">iOS & Android PWA 桌面 Widget 行事曆</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                  原生體驗
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">免下載 App！隨時在手機桌面或鎖定畫面即時查看今日工程與會議行程</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-slate-700 text-xs sm:text-sm">
          
          {/* Section 1: Live Widget Simulator & Preview */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <span className="text-xs font-bold text-amber-600 tracking-wider uppercase flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> 即時小工具模擬與預覽 (Widget Preview)
                </span>
                <h3 className="text-sm font-black text-slate-800 mt-0.5">桌面行事曆 Widget 呈現效果 (點選任意日期進入行事曆)</h3>
              </div>

              {/* Widget Size Selector */}
              <div className="flex flex-wrap items-center bg-white border border-slate-200 rounded-xl p-1 shadow-xs gap-1">
                <button
                  type="button"
                  onClick={() => setWidgetSize('small')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    widgetSize === 'small' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  小型 (2x2)
                </button>
                <button
                  type="button"
                  onClick={() => setWidgetSize('medium')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    widgetSize === 'medium' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  中型 (4x2)
                </button>
                <button
                  type="button"
                  onClick={() => setWidgetSize('large')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    widgetSize === 'large' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  大型 (4x4)
                </button>
                <button
                  type="button"
                  onClick={() => setWidgetSize('2weeks')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    widgetSize === '2weeks' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  兩星期日曆
                </button>
                <button
                  type="button"
                  onClick={() => setWidgetSize('1month')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    widgetSize === '1month' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  一個月日曆
                </button>
                <button
                  type="button"
                  onClick={() => setWidgetSize('lockscreen')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    widgetSize === 'lockscreen' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  鎖定畫面
                </button>
              </div>
            </div>

            {/* Simulated Phone Wallpaper Background */}
            <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 p-6 flex flex-col items-center justify-center min-h-[240px] shadow-inner overflow-hidden border border-slate-700">
              {/* Subtle background glow circles */}
              <div className="absolute -top-12 -left-12 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* 1. Small Widget 2x2 */}
              {widgetSize === 'small' && (
                <div 
                  onClick={() => handleSelectAndGoToCalendar()}
                  className="w-40 h-40 bg-white/95 backdrop-blur-md rounded-3xl p-3.5 shadow-2xl border border-white/40 flex flex-col justify-between text-slate-800 animate-fadeIn cursor-pointer hover:scale-105 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-600">
                      <CalendarIcon className="w-4 h-4" />
                      <span className="text-[11px] font-black uppercase tracking-wider">{formattedMonthDay}</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                      {formattedDayOfWeek}
                    </span>
                  </div>

                  <div>
                    <div className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">
                      {todayEvents.length} <span className="text-xs font-bold text-slate-500">個行程</span>
                    </div>
                    {displayEvents.length > 0 ? (
                      <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-200/60 truncate">
                        <div className="text-[10px] font-bold text-amber-900 truncate">
                          {displayEvents[0].title}
                        </div>
                        <div className="text-[9px] text-amber-700 flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{displayEvents[0].time || '全天'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 font-medium">今日暫無工程行程</div>
                    )}
                  </div>

                  <div className="text-[9px] font-semibold text-slate-400 text-right">
                    築匠 Artisan Studio (點擊開啟)
                  </div>
                </div>
              )}

              {/* 2. Medium Widget 4x2 */}
              {widgetSize === 'medium' && (
                <div className="w-full max-w-md h-36 bg-white/95 backdrop-blur-md rounded-3xl p-4 shadow-2xl border border-white/40 flex items-center gap-4 text-slate-800 animate-fadeIn">
                  {/* Left Column: Date & Quick Add */}
                  <div className="w-28 shrink-0 pr-3 border-r border-slate-200 flex flex-col justify-between h-full">
                    <div className="cursor-pointer" onClick={() => handleSelectAndGoToCalendar()}>
                      <div className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        <span>築匠日曆</span>
                      </div>
                      <div className="text-2xl font-black text-slate-900 mt-1">{formattedMonthDay}</div>
                      <div className="text-xs font-bold text-slate-500">{formattedDayOfWeek}</div>
                    </div>

                    <button
                      type="button"
                      onClick={onAddEvent}
                      className="mt-1 flex items-center justify-center gap-1 px-2.5 py-1 text-[11px] font-black bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-all active:scale-95 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3 h-3" />
                      <span>新增日程</span>
                    </button>
                  </div>

                  {/* Right Column: Event List */}
                  <div className="flex-1 overflow-y-auto space-y-1.5 h-full pr-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center mb-1">
                      <span>今日/近期施工與見客</span>
                      <span className="text-amber-600 font-bold">{displayEvents.length} 項</span>
                    </div>

                    {displayEvents.length > 0 ? (
                      displayEvents.slice(0, 3).map((evt, idx) => (
                        <div
                          key={evt.id || idx}
                          onClick={() => handleSelectAndGoToCalendar(evt)}
                          className="p-1.5 bg-slate-50 hover:bg-amber-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-2 transition-all cursor-pointer text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-800 truncate text-[11px]">{evt.title}</div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-2">
                              {evt.time && (
                                <span className="flex items-center gap-0.5 text-amber-700 font-semibold">
                                  <Clock className="w-2.5 h-2.5" /> {evt.time}
                                </span>
                              )}
                              {evt.assignedWorker && (
                                <span className="flex items-center gap-0.5 text-slate-600">
                                  <User className="w-2.5 h-2.5" /> {evt.assignedWorker}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-800 rounded shrink-0">
                            {evt.category || '工程'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-400 py-4 text-center font-medium">尚無今日行程</div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. Large Widget 4x4 */}
              {widgetSize === 'large' && (
                <div className="w-full max-w-md h-64 bg-white/95 backdrop-blur-md rounded-3xl p-4 shadow-2xl border border-white/40 flex flex-col justify-between text-slate-800 animate-fadeIn overflow-hidden">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSelectAndGoToCalendar()}>
                      <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-black">
                        <CalendarIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900">築匠 Artisan Studio 日曆</div>
                        <div className="text-[10px] font-semibold text-slate-500">{formattedMonthDay} {formattedDayOfWeek}</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onAddEvent}
                      className="px-2.5 py-1 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>新增行程</span>
                    </button>
                  </div>

                  {/* List of events */}
                  <div className="flex-1 my-2 overflow-y-auto space-y-1.5 pr-1">
                    {displayEvents.length > 0 ? (
                      displayEvents.map((evt, idx) => (
                        <div
                          key={evt.id || idx}
                          onClick={() => handleSelectAndGoToCalendar(evt)}
                          className="p-2 bg-slate-50 hover:bg-amber-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-2 transition-all cursor-pointer"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-800 truncate text-xs">{evt.title}</div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-0.5 text-amber-700 font-semibold">
                                <Clock className="w-2.5 h-2.5" /> {evt.time || '全天'}
                              </span>
                              {evt.location && (
                                <span className="flex items-center gap-0.5 text-slate-600 truncate max-w-[120px]">
                                  <MapPin className="w-2.5 h-2.5" /> {evt.location}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full shrink-0">
                            {evt.assignedWorker || evt.category || '工程'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-400 py-8 text-center font-medium">尚無排定行程</div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-400 flex items-center justify-between font-semibold">
                    <span>即時與雲端 Firestore 同步</span>
                    <span onClick={() => handleSelectAndGoToCalendar()} className="text-amber-600 font-bold hover:underline cursor-pointer">點按進入行事曆 ➔</span>
                  </div>
                </div>
              )}

              {/* 4. 2-Weeks Calendar Widget Preview */}
              {widgetSize === '2weeks' && (
                <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl p-4 shadow-2xl border border-white/40 flex flex-col justify-between text-slate-800 animate-fadeIn space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center font-black">
                        <CalendarIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-black text-slate-900">兩星期日曆 Widget (點按進入行事曆)</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">14 Days</span>
                  </div>

                  <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-500 pt-1 pb-1 border-b border-slate-100 gap-1">
                    <span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span>
                  </div>

                  <div className="grid grid-cols-7 gap-1 sm:gap-1.5 min-w-0">
                    {twoWeeksDays.map((d, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectAndGoToCalendar()}
                        className={`aspect-square min-w-0 rounded-xl p-0.5 sm:p-1 flex flex-col items-center justify-between border cursor-pointer hover:scale-105 transition-all ${
                          d.isToday
                            ? 'bg-amber-500 text-white font-black border-amber-600 shadow-sm'
                            : d.events.length > 0
                            ? 'bg-amber-50 text-amber-950 font-bold border-amber-300'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span className="text-[10px] leading-none mt-0.5">{d.dayNum}</span>
                        {d.events.length > 0 ? (
                          <span className={`text-[8px] font-black px-1 rounded-full leading-none ${
                            d.isToday ? 'bg-white text-amber-900' : 'bg-amber-600 text-white'
                          }`}>
                            {d.events.length}
                          </span>
                        ) : (
                          <span className="w-1 h-1 rounded-full bg-slate-300 opacity-40 mb-0.5" />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="text-[10px] text-slate-400 text-center font-semibold pt-1">
                    點擊任意日期即可進入完整行事曆頁面
                  </div>
                </div>
              )}

              {/* 5. 1-Month Calendar Widget Preview */}
              {widgetSize === '1month' && (
                <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl p-4 shadow-2xl border border-white/40 flex flex-col justify-between text-slate-800 animate-fadeIn space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center font-black">
                        <CalendarIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-black text-slate-900">{monthData.year}年 {monthData.month}月全月日曆 Widget</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">1 Month</span>
                  </div>

                  <div className="grid grid-cols-7 text-center text-[9px] font-bold text-slate-400 pb-0.5 gap-1">
                    <span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span>
                  </div>

                  <div className="grid grid-cols-7 gap-1 min-w-0">
                    {monthData.days.map((d, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectAndGoToCalendar()}
                        className={`h-7 min-w-0 rounded-lg text-center flex flex-col items-center justify-center border cursor-pointer hover:scale-105 transition-all ${
                          !d.isCurrentMonth
                            ? 'opacity-30 border-transparent text-slate-400'
                            : d.isToday
                            ? 'bg-amber-500 text-white font-black border-amber-600 shadow-xs'
                            : d.events.length > 0
                            ? 'bg-amber-50 text-amber-900 font-bold border-amber-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200/80'
                        }`}
                      >
                        <span className="text-[10px] font-semibold leading-none">{d.dayNum}</span>
                        {d.events.length > 0 && d.isCurrentMonth && (
                          <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${d.isToday ? 'bg-white' : 'bg-amber-600'}`} />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="text-[10px] text-amber-700 font-bold text-center pt-1">
                    點擊任意日期即可進入完整行事曆頁面
                  </div>
                </div>
              )}

              {/* 6. Lock Screen Widget */}
              {widgetSize === 'lockscreen' && (
                <div 
                  onClick={() => handleSelectAndGoToCalendar()}
                  className="w-full max-w-sm bg-black/60 backdrop-blur-xl border border-white/20 rounded-2xl p-3 shadow-2xl text-white animate-fadeIn flex items-center justify-between gap-3 cursor-pointer hover:scale-102 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                      <CalendarIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">築匠行事曆 • {formattedMonthDay}</div>
                      <div className="text-xs font-bold text-white truncate">
                        {displayEvents.length > 0 ? displayEvents[0].title : '今日尚無施工會議行程'}
                      </div>
                    </div>
                  </div>

                  <span className="px-2 py-1 text-[10px] font-mono font-bold bg-white/10 rounded-lg shrink-0">
                    {displayEvents.length > 0 ? (displayEvents[0].time || '全天') : '00:00'}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Action Button to Toggle Floating Desktop Widget */}
            {onToggleFloatingWidget && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 bg-white p-3 rounded-xl border border-slate-200/80">
                <div className="flex items-center gap-2">
                  <Pin className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-slate-800">網頁與 PWA 內建「懸浮桌面小工具」模式</span>
                </div>
                <button
                  type="button"
                  onClick={onToggleFloatingWidget}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    isFloatingWidgetActive
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{isFloatingWidgetActive ? '關閉懸浮小工具' : '開啟懸浮桌面小工具'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Platform Installation Instructions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-600" />
                <span>安裝與設定至手機桌面小工具步驟</span>
              </h3>

              {/* Platform Switcher */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActivePlatform('ios')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activePlatform === 'ios' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>🍎 iOS (iPhone/iPad)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePlatform('android')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activePlatform === 'android' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>🤖 Android (安卓)</span>
                </button>
              </div>
            </div>

            {/* iOS Instructions */}
            {activePlatform === 'ios' && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">將報價系統加至 iOS 主畫面 (PWA 模式)</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      在 Safari 瀏覽器中點擊下方「<Share2 className="w-3 h-3 inline text-blue-600" /> 分享」按鈕 ➔ 選擇「<b>加入主畫面</b>」(Add to Home Screen)。
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">使用 iOS 捷徑 (Shortcuts) 開啟直達 Widget 網址</h4>
                    <p className="text-xs text-slate-600 mt-0.5 mb-2">
                      複製專屬 Widget URL 網址，並至「捷徑」App 設定為桌面/鎖定畫面快速檢視：
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={getWidgetUrl()}
                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleCopyUrl}
                        className="px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-all flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedUrl ? '已複製' : '複製網址'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">iOS 圖示長壓選單 (App Shortcuts)</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      在 iPhone 桌面長壓「築匠」App 圖示，可以直接選取「<b>📅 今日行事曆 Widget</b>」或「<b>➕ 快速新增日程</b>」。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Android Instructions */}
            {activePlatform === 'android' && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">安裝 PWA 應用程式至 Android 桌面</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      在 Chrome 或 Edge 瀏覽器中點選右上角選單 ➔ 點選「<b>安裝應用程式</b>」或「<b>新增至主螢幕</b>」。
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">添加 Android PWA 桌面小工具 (Widgets)</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      在 Android 手機主螢幕長壓空白處 ➔ 點擊「<b>小工具 (Widgets)</b>」➔ 搜尋並選取「築匠工程日曆」小工具放置於桌面。
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">桌面圖示長壓快速選單</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      長壓 Android 桌面上的築匠應用程式圖示，即可隨時觸發行事曆 Widget 與一鍵新增行程功能。
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>支援跨裝置雲端同步 & 離線快取瀏覽</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all cursor-pointer shadow-xs"
          >
            完成並關閉
          </button>
        </div>

      </div>
    </div>
  );
};

export default PWAWidgetModal;
