import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  X, 
  ChevronUp, 
  ChevronDown, 
  Plus, 
  Clock, 
  MapPin, 
  User, 
  Maximize2,
  Sparkles,
  ExternalLink,
  Grid,
  List,
  CalendarDays
} from 'lucide-react';
import { CalendarEvent } from '../types';
import { getUserColorPalette } from './CalendarDashboard';

interface FloatingCalendarWidgetProps {
  events: CalendarEvent[];
  userColors?: Record<string, string>;
  onOpenFullCalendar: () => void;
  onAddEvent: () => void;
  onClose: () => void;
}

export const FloatingCalendarWidget: React.FC<FloatingCalendarWidgetProps> = ({
  events,
  userColors = {},
  onOpenFullCalendar,
  onAddEvent,
  onClose
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | '2weeks' | '1month'>('list');

  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(e => e.date === todayStr);
  const upcomingEvents = events
    .filter(e => e.date >= todayStr)
    .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));

  const displayEvents = todayEvents.length > 0 ? todayEvents : upcomingEvents.slice(0, 4);

  const todayDateObj = new Date();
  const dayOfWeekNames = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
  const formattedDayOfWeek = dayOfWeekNames[todayDateObj.getDay()];
  const formattedMonthDay = `${todayDateObj.getMonth() + 1}月${todayDateObj.getDate()}日`;

  // Collect active workers with events for the color legend
  const activeWorkersMap = new Map<string, { name: string; hex: string; bgLight: string }>();
  events.forEach(evt => {
    const workerName = evt.assignedWorker || '預設人員';
    if (!activeWorkersMap.has(workerName)) {
      const palette = getUserColorPalette(workerName, userColors[workerName]);
      activeWorkersMap.set(workerName, {
        name: workerName,
        hex: palette.hex,
        bgLight: palette.bgLight
      });
    }
  });
  const activeWorkersList = Array.from(activeWorkersMap.values()).slice(0, 5);

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
      
      // Get unique worker color palettes for this day
      const workers = Array.from(new Set(dayEvents.map(e => e.assignedWorker || '預設人員')));
      const workerPalettes = workers.map(w => getUserColorPalette(w, userColors[w]));

      days.push({
        dateStr,
        dayNum: d.getDate(),
        monthNum: d.getMonth() + 1,
        isToday: dateStr === todayStr,
        events: dayEvents,
        workerPalettes,
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
      const dayEvents = events.filter(e => e.date === dateStr);
      const workers = Array.from(new Set(dayEvents.map(e => e.assignedWorker || '預設人員')));
      const workerPalettes = workers.map(w => getUserColorPalette(w, userColors[w]));

      days.push({
        dateStr,
        dayNum: d.getDate(),
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        events: dayEvents,
        workerPalettes
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const yStr = d.getFullYear();
      const mStr = String(d.getMonth() + 1).padStart(2, '0');
      const dStr = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yStr}-${mStr}-${dStr}`;
      const dayEvents = events.filter(e => e.date === dateStr);
      const workers = Array.from(new Set(dayEvents.map(e => e.assignedWorker || '預設人員')));
      const workerPalettes = workers.map(w => getUserColorPalette(w, userColors[w]));

      days.push({
        dateStr,
        dayNum: day,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        events: dayEvents,
        workerPalettes
      });
    }
    return { year, month: month + 1, days };
  };

  const twoWeeksDays = getTwoWeeksDays();
  const monthData = getOneMonthDays();

  return (
    <div className="fixed bottom-4 right-4 z-40 w-80 sm:w-88 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 text-slate-800 font-sans">
      
      {/* Widget Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-3.5 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
          <div className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black">
            <CalendarIcon className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-black flex items-center gap-1">
              <span>桌面行事曆 Widget</span>
              <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-500/20 text-amber-300 rounded">PWA</span>
            </div>
            <div className="text-[10px] text-slate-300 font-medium">{formattedMonthDay} ({formattedDayOfWeek})</div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-slate-400">
          <button
            type="button"
            onClick={onOpenFullCalendar}
            title="開啟完整行事曆"
            className="p-1 hover:text-white hover:bg-slate-700/60 rounded-lg transition-all cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "展開小工具" : "收合小工具"}
            className="p-1 hover:text-white hover:bg-slate-700/60 rounded-lg transition-all cursor-pointer"
          >
            {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            title="關閉懸浮小工具"
            className="p-1 hover:text-white hover:bg-slate-700/60 rounded-lg transition-all cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Widget Body */}
      {!isCollapsed && (
        <div className="p-3 space-y-2.5 text-xs">
          {/* Sub Navigation Bar: List / 2-Weeks / 1-Month */}
          <div className="flex items-center justify-between bg-slate-100/90 p-1 rounded-xl">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3 h-3" />
                <span>清單</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('2weeks')}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === '2weeks'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarDays className="w-3 h-3" />
                <span>兩星期</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('1month')}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === '1month'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Grid className="w-3 h-3" />
                <span>一個月</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onAddEvent}
              className="px-2 py-1 text-[11px] font-bold bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 rounded-lg transition-all flex items-center gap-0.5 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3 h-3" />
              <span>新增</span>
            </button>
          </div>

          {/* VIEW 1: LIST MODE */}
          {viewMode === 'list' && (
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-0.5 animate-fadeIn">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center mb-1">
                <span>{todayEvents.length > 0 ? '今日施工/會議日程' : '近期排定日程'}</span>
                <span className="text-amber-600 font-bold">{displayEvents.length} 項</span>
              </div>

              {displayEvents.length > 0 ? (
                displayEvents.map((evt, idx) => {
                  const workerName = evt.assignedWorker || '預設人員';
                  const palette = getUserColorPalette(workerName, userColors[workerName]);
                  return (
                    <div
                      key={evt.id || idx}
                      className="p-2 bg-slate-50 hover:bg-amber-50/80 border border-slate-200/80 hover:border-amber-300 rounded-xl flex items-center justify-between gap-2 transition-all cursor-pointer group shadow-2xs"
                      style={{ borderLeft: `4px solid ${palette.hex}` }}
                      onClick={onOpenFullCalendar}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-800 group-hover:text-amber-900 truncate text-[11px] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: palette.hex }} />
                          <span className="truncate">{evt.title}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-0.5 text-slate-600 font-semibold">
                            <Clock className="w-2.5 h-2.5 text-amber-600" /> {evt.time || '全天'}
                          </span>
                          {evt.assignedWorker && (
                            <span className="flex items-center gap-1 font-bold text-[10px]" style={{ color: palette.hex }}>
                              <User className="w-2.5 h-2.5" /> {evt.assignedWorker}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded shrink-0 border" style={{ backgroundColor: palette.bgLight, color: palette.hex, borderColor: palette.hex + '40' }}>
                        {evt.category || '工程'}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center text-slate-400 text-xs">今日尚無排定日程</div>
              )}
            </div>
          )}

          {/* VIEW 2: 2-WEEKS GRID MODE */}
          {viewMode === '2weeks' && (
            <div className="animate-fadeIn space-y-1.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                <span>兩星期行程預覽 (色點代表人員日程)</span>
                <span className="text-amber-600 font-bold">14 天</span>
              </div>

              {/* Day Name Header */}
              <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-500 border-b border-slate-100 pb-1">
                <span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span>
              </div>

              {/* 14 Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {twoWeeksDays.map((d, i) => {
                  const hasEvents = d.events.length > 0;
                  const primaryColor = hasEvents ? d.workerPalettes[0].hex : undefined;

                  return (
                    <div
                      key={i}
                      onClick={onOpenFullCalendar}
                      title={`${d.monthNum}月${d.dayNum}日 ${hasEvents ? `(${d.events.length} 個行程: ${d.events.map(e=>e.title).join(', ')})` : '未有日程'} - 點擊進入行事曆`}
                      className={`aspect-square rounded-xl p-1 flex flex-col items-center justify-between border cursor-pointer transition-all hover:scale-105 ${
                        d.isToday
                          ? 'bg-amber-500 text-white font-black border-amber-600 shadow-xs'
                          : hasEvents
                          ? 'bg-amber-50/90 text-amber-950 font-bold hover:bg-amber-100'
                          : 'bg-slate-50/60 text-slate-400 border-slate-200/50 hover:bg-slate-100'
                      }`}
                      style={
                        !d.isToday && hasEvents
                          ? { borderColor: primaryColor ? primaryColor + '80' : '#f59e0b', backgroundColor: primaryColor ? primaryColor + '12' : '#fef3c7' }
                          : undefined
                      }
                    >
                      <span className={`text-[10px] leading-none mt-0.5 ${!hasEvents && !d.isToday ? 'text-slate-400 font-normal' : ''}`}>
                        {d.dayNum}
                      </span>

                      {/* Schedule Worker Color Dots */}
                      {hasEvents ? (
                        <div className="flex items-center gap-0.5 mb-0.5 flex-wrap justify-center">
                          {d.workerPalettes.slice(0, 3).map((p, pIdx) => (
                            <span
                              key={pIdx}
                              className="w-1.5 h-1.5 rounded-full ring-1 ring-white/50"
                              style={{ backgroundColor: d.isToday ? '#ffffff' : p.hex }}
                              title={p.name}
                            />
                          ))}
                          {d.events.length > 3 && (
                            <span className="text-[7px] font-extrabold text-slate-500">+</span>
                          )}
                        </div>
                      ) : (
                        <span className="w-1 h-1 rounded-full bg-slate-300 opacity-30 mb-0.5" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 3: 1-MONTH GRID MODE */}
          {viewMode === '1month' && (
            <div className="animate-fadeIn space-y-1">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center mb-1">
                <span>{monthData.year}年 {monthData.month}月日曆 (色點代表人員)</span>
                <span className="text-amber-600 font-bold">全月總覽</span>
              </div>

              {/* Weekday Labels */}
              <div className="grid grid-cols-7 text-center text-[9px] font-bold text-slate-400 pb-0.5">
                <span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span>
              </div>

              {/* Month Days Grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {monthData.days.map((d, idx) => {
                  const hasEvents = d.events.length > 0 && d.isCurrentMonth;
                  const primaryColor = hasEvents ? d.workerPalettes[0].hex : undefined;

                  return (
                    <div
                      key={idx}
                      onClick={onOpenFullCalendar}
                      title={`${d.dayNum}日 ${hasEvents ? `(${d.events.length} 個行程)` : '未有日程'} - 點擊開啟行事曆`}
                      className={`h-7 rounded-lg text-center flex flex-col items-center justify-center border cursor-pointer transition-all hover:scale-105 ${
                        !d.isCurrentMonth
                          ? 'opacity-25 border-transparent text-slate-300'
                          : d.isToday
                          ? 'bg-amber-500 text-white font-black border-amber-600 shadow-xs'
                          : hasEvents
                          ? 'bg-amber-50 text-amber-900 font-bold border-amber-200'
                          : 'bg-slate-50/60 text-slate-400 border-slate-100 hover:bg-slate-100'
                      }`}
                      style={
                        !d.isToday && hasEvents
                          ? { borderColor: primaryColor ? primaryColor + '60' : '#f59e0b', backgroundColor: primaryColor ? primaryColor + '10' : '#fef3c7' }
                          : undefined
                      }
                    >
                      <span className={`text-[10px] font-semibold leading-none ${!hasEvents && !d.isToday ? 'text-slate-400' : ''}`}>
                        {d.dayNum}
                      </span>

                      {/* Worker Schedule Color Dots */}
                      {hasEvents && (
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {d.workerPalettes.slice(0, 2).map((p, pIdx) => (
                            <span
                              key={pIdx}
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: d.isToday ? '#ffffff' : p.hex }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Workers Color Legend */}
          {activeWorkersList.length > 0 && (
            <div className="pt-1.5 pb-0.5 px-2 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center gap-2 overflow-x-auto text-[10px] text-slate-600">
              <span className="font-bold text-slate-400 shrink-0">人員圖例:</span>
              <div className="flex items-center gap-2 shrink-0">
                {activeWorkersList.map((w, wIdx) => (
                  <span key={wIdx} className="flex items-center gap-1 font-semibold whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: w.hex }} />
                    <span className="text-slate-700">{w.name}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Widget Footer */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
            <span>即時雲端同步</span>
            <button
              type="button"
              onClick={onOpenFullCalendar}
              className="text-slate-700 hover:text-amber-600 flex items-center gap-0.5 cursor-pointer font-bold"
            >
              <span>點按進入行事曆頁面</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default FloatingCalendarWidget;

