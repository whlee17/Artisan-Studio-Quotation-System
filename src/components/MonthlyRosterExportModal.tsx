import React, { useState, useMemo, useRef } from 'react';
import { 
  Printer, Download, Copy, X, Calendar, Filter, ArrowUpDown, 
  Palmtree, Coffee, Clock, FileText, Check, Sparkles, Building2, Info
} from 'lucide-react';
import { 
  CalendarEvent, 
  DEPARTMENT_OPTIONS, 
  HolidayManagementData, 
  QuoteSettings, 
  UserAccount 
} from '../types';
import { 
  calculateEmployeeLeaveBalances, 
  DEFAULT_EMPLOYEE_PROFILE, 
  formatLeaveDaysDisplay, 
  getLeaveDaysValue, 
  getPublicHolidayName, 
  HK_PUBLIC_HOLIDAYS_MAP 
} from '../lib/holidayManagement';

interface MonthlyRosterExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountsList: UserAccount[];
  settings: QuoteSettings;
  calendarEvents: CalendarEvent[];
  initialYear?: number;
  initialMonth?: number;
}

const WEEKDAY_NAMES = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

export const MonthlyRosterExportModal: React.FC<MonthlyRosterExportModalProps> = ({
  isOpen,
  onClose,
  accountsList,
  settings,
  calendarEvents,
  initialYear = new Date().getFullYear(),
  initialMonth = new Date().getMonth() + 1
}) => {
  const [targetYear, setTargetYear] = useState<number>(initialYear);
  const [targetMonth, setTargetMonth] = useState<number>(initialMonth);
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [copied, setCopied] = useState<boolean>(false);
  const printRef = useRef<HTMLDivElement>(null);

  const holidayData: HolidayManagementData = useMemo(() => {
    return {
      companySettings: settings.holidayManagement?.companySettings,
      profiles: settings.holidayManagement?.profiles || {}
    };
  }, [settings.holidayManagement]);

  // Days in selected month
  const daysInMonth = useMemo(() => {
    return new Date(targetYear, targetMonth, 0).getDate();
  }, [targetYear, targetMonth]);

  const monthDates = useMemo(() => {
    const list: { day: number; dateStr: string; weekday: number; weekdayName: string; holidayName: string | null }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(targetMonth).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${targetYear}-${mStr}-${dStr}`;
      const dt = new Date(targetYear, targetMonth - 1, d);
      const weekday = dt.getDay(); // 0-6
      const holidayName = getPublicHolidayName(dateStr);
      list.push({
        day: d,
        dateStr,
        weekday,
        weekdayName: WEEKDAY_NAMES[weekday],
        holidayName
      });
    }
    return list;
  }, [targetYear, targetMonth, daysInMonth]);

  // All processed users list
  const processedUsers = useMemo(() => {
    const list: {
      username: string;
      displayName: string;
      role: string;
      departmentId: string;
      departmentLabel: string;
      joinDate: string;
      profile: any;
      balances: any;
    }[] = [];

    const seen = new Set<string>();

    const resolveDept = (username: string, rawDept?: string): { id: string; label: string } => {
      const pDept = holidayData.profiles?.[username.toLowerCase()]?.department;
      const deptKey = pDept || rawDept || (username.toLowerCase() === 'king' ? 'sales' : username.toLowerCase() === 'mat' ? 'design' : 'admin_marketing');
      const found = DEPARTMENT_OPTIONS.find(d => d.id === deptKey || d.label === deptKey);
      if (found) return { id: found.id, label: found.label };
      return { id: deptKey, label: deptKey === 'admin' ? '行政&市場部' : deptKey };
    };

    if (Array.isArray(accountsList)) {
      accountsList.forEach(acc => {
        if (acc && acc.username && !seen.has(acc.username.toLowerCase())) {
          const uKey = acc.username.toLowerCase();
          seen.add(uKey);
          const prof = holidayData.profiles?.[uKey] || DEFAULT_EMPLOYEE_PROFILE(uKey, acc.displayName);
          const dept = resolveDept(uKey, acc.department || acc.profile?.department);
          const joinDate = prof.joinDate || acc.createdAt?.split('T')[0] || '2020-01-01';
          const balances = calculateEmployeeLeaveBalances(prof, uKey, acc.displayName || acc.username, calendarEvents, targetYear, targetMonth);

          list.push({
            username: uKey,
            displayName: acc.displayName || acc.username,
            role: acc.role || 'staff',
            departmentId: dept.id,
            departmentLabel: dept.label,
            joinDate,
            profile: prof,
            balances
          });
        }
      });
    }

    // Fallbacks if list is empty
    ['whlee', 'king', 'mat'].forEach(u => {
      if (!seen.has(u)) {
        seen.add(u);
        const prof = holidayData.profiles?.[u] || DEFAULT_EMPLOYEE_PROFILE(u, u.toUpperCase());
        const dept = resolveDept(u, u === 'king' ? 'sales' : u === 'mat' ? 'design' : 'admin_marketing');
        const joinDate = prof.joinDate || '2020-01-01';
        const balances = calculateEmployeeLeaveBalances(prof, u, u.toUpperCase(), calendarEvents, targetYear, targetMonth);
        list.push({
          username: u,
          displayName: u.toUpperCase(),
          role: 'admin',
          departmentId: dept.id,
          departmentLabel: dept.label,
          joinDate,
          profile: prof,
          balances
        });
      }
    });

    return list;
  }, [accountsList, holidayData.profiles, calendarEvents, targetYear, targetMonth]);

  // Grouped and sorted by Department, then sorted within Department by joinDate (入職日期) ascending
  const groupedDepartments = useMemo(() => {
    // Standard department order preferred
    const deptOrder = ['admin_marketing', 'admin', 'engineering', 'sales', 'design', 'marketing', 'assistant', 'clerk', 'other'];
    
    // Filter users if filter is selected
    const filtered = departmentFilter === 'all' 
      ? processedUsers 
      : processedUsers.filter(u => u.departmentId === departmentFilter || u.departmentLabel === departmentFilter);

    // Grouping
    const groups: Record<string, { label: string; users: typeof processedUsers }> = {};

    filtered.forEach(u => {
      const dKey = u.departmentId;
      if (!groups[dKey]) {
        groups[dKey] = {
          label: u.departmentLabel,
          users: []
        };
      }
      groups[dKey].users.push(u);
    });

    // Sort users in each department by joinDate (入職日期) ascending
    Object.keys(groups).forEach(k => {
      groups[k].users.sort((a, b) => {
        if (a.joinDate && b.joinDate) {
          return a.joinDate.localeCompare(b.joinDate);
        }
        if (a.joinDate) return -1;
        if (b.joinDate) return 1;
        return a.displayName.localeCompare(b.displayName);
      });
    });

    // Sort departments according to standard order
    return Object.entries(groups).sort(([aKey], [bKey]) => {
      const idxA = deptOrder.indexOf(aKey);
      const idxB = deptOrder.indexOf(bKey);
      const orderA = idxA === -1 ? 99 : idxA;
      const orderB = idxB === -1 ? 99 : idxB;
      return orderA - orderB;
    });
  }, [processedUsers, departmentFilter]);

  // Function to get the cell marker for an employee on a specific date
  const getCellStatus = (username: string, displayName: string, dateStr: string, joinDate?: string) => {
    // Check if before joinDate
    if (joinDate && dateStr < joinDate) {
      return { type: 'before_join', label: '///', bg: 'bg-slate-100 text-slate-300 font-mono text-[9px]' };
    }

    const uLower = username.toLowerCase();
    const dLower = displayName.toLowerCase();

    // Find all events for this user on this date
    const dayEvts = calendarEvents.filter(evt => {
      if (evt.date !== dateStr) return false;
      const c = (evt.createdBy || '').toLowerCase();
      const t = (evt.title || '').toLowerCase();
      return c === uLower || c === dLower || t.includes(uLower) || t.includes(dLower);
    });

    if (dayEvts.length === 0) {
      return { type: 'working', label: '', bg: '' };
    }

    // Identify primary event
    const evt = dayEvts[0];
    const cat = evt.leaveCategory || 'other';
    const type = evt.type || '';
    const title = (evt.title || '').trim();

    // Regular Off / 例假
    if (cat === 'regular' || title.includes('例假') || title.includes('放假') || title === '休假' || title === 'V' || title === 'off') {
      return { type: 'regular', label: 'V', bg: 'bg-blue-100 text-blue-900 font-black' };
    }

    // Annual Leave / 大假
    if (cat === 'annual' || title.includes('大假') || title.includes('年假') || title.includes('AL') || title === 'al') {
      return { type: 'annual', label: 'AL', bg: 'bg-teal-100 text-teal-900 font-extrabold' };
    }

    // Sick Leave / 病假
    if (cat === 'sick' || title.includes('病假') || title.includes('SL') || title === 'sl') {
      return { type: 'sick', label: 'SL', bg: 'bg-orange-100 text-orange-950 font-extrabold' };
    }

    // Lieu Leave / 補假
    if (cat === 'lieu' || title.includes('補假') || title.includes('WC') || title.startsWith('補')) {
      const match = title.match(/補(\d+月|\d+)/);
      const shortLabel = match ? `補${match[1]}` : (title.includes('WC') ? 'WC' : '補假');
      return { type: 'lieu', label: shortLabel, bg: 'bg-amber-100 text-amber-950 font-bold text-[9.5px]' };
    }

    // Half days
    if (type === 'holiday_am' || title.includes('AM') || title.includes('上午假') || title.includes('上晝')) {
      return { type: 'holiday_am', label: 'AM', bg: 'bg-indigo-100 text-indigo-900 font-bold text-[10px]' };
    }
    if (type === 'holiday_pm' || title.includes('PM') || title.includes('下午假') || title.includes('下晝')) {
      return { type: 'holiday_pm', label: 'PM', bg: 'bg-purple-100 text-purple-900 font-bold text-[10px]' };
    }

    // Unpaid Leave
    if (title.includes('無薪') || title.includes('UPL')) {
      return { type: 'unpaid', label: 'UPL', bg: 'bg-rose-100 text-rose-900 font-bold text-[9.5px]' };
    }

    // Other short title
    if (title.length <= 4) {
      return { type: 'custom', label: title, bg: 'bg-slate-200 text-slate-800 font-bold text-[9.5px]' };
    }

    return { type: 'holiday_full', label: 'V', bg: 'bg-blue-100 text-blue-900 font-black' };
  };

  // Day total leaves summary for footer row
  const daySummaryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    monthDates.forEach(d => {
      let count = 0;
      processedUsers.forEach(u => {
        const status = getCellStatus(u.username, u.displayName, d.dateStr, u.joinDate);
        if (status.type !== 'working' && status.type !== 'before_join') {
          count += 1;
        }
      });
      totals[d.dateStr] = count;
    });
    return totals;
  }, [monthDates, processedUsers, calendarEvents]);

  // Handle Print
  const handlePrint = () => {
    window.print();
  };

  // Handle Export CSV
  const handleExportCSV = () => {
    const headers = [
      '部門',
      '員工姓名',
      '帳號',
      '入職日期',
      ...monthDates.map(d => `${d.day}日 (${d.weekdayName})`),
      '總天數 (當月已放)',
      '本月未放例假',
      '剩餘大假',
      '有效補假'
    ];

    const rows: string[][] = [];

    groupedDepartments.forEach(([_, dept]) => {
      dept.users.forEach(u => {
        const row = [
          dept.label,
          u.displayName,
          u.username,
          u.joinDate,
          ...monthDates.map(d => {
            const st = getCellStatus(u.username, u.displayName, d.dateStr, u.joinDate);
            return st.label || '';
          }),
          formatLeaveDaysDisplay(u.balances.regularOff.usedThisMonth + (u.balances.annualLeave.eventsThisYear.filter((e: any) => e.date.startsWith(`${targetYear}-${String(targetMonth).padStart(2, '0')}`)).reduce((a: number, b: any) => a + getLeaveDaysValue(b), 0))),
          formatLeaveDaysDisplay(u.balances.regularOff.remainingThisMonth),
          formatLeaveDaysDisplay(u.balances.annualLeave.balanceAvailable),
          formatLeaveDaysDisplay(u.balances.lieuLeave.totalDaysActive)
        ];
        rows.push(row);
      });
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ARTISAN_STUDIO_員工每月更表_${targetYear}年${targetMonth}月.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Copy Table Data
  const handleCopyTable = () => {
    if (!printRef.current) return;
    try {
      const range = document.createRange();
      range.selectNode(printRef.current);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
      document.execCommand('copy');
      window.getSelection()?.removeAllRanges();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      {/* Container Dialog */}
      <div className="bg-white w-full max-w-[98vw] 2xl:max-w-[1700px] h-[95vh] rounded-2xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden">
        {/* Top Control Bar (Non-Printable) */}
        <div className="no-print bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Building2 className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-black tracking-wide flex items-center gap-2">
                <span>ARTISAN STUDIO 員工每月更表 (橫向 A4 列印與匯出)</span>
                <span className="text-[10px] font-bold bg-teal-400/20 text-teal-300 border border-teal-400/30 px-2 py-0.5 rounded-full">
                  依入職日期排序
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                分部門呈現全體人員當月每日更表、例假 (V)、大假 (AL)、病假 (SL)、補假及剩餘大假/未放例假結算
              </p>
            </div>
          </div>

          {/* Controls: Year, Month, Department, Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Year & Month Picker */}
            <div className="flex items-center bg-slate-800 rounded-xl px-2.5 py-1 border border-slate-700 text-xs gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-400" />
              <select
                value={targetYear}
                onChange={(e) => setTargetYear(parseInt(e.target.value, 10))}
                className="bg-transparent font-bold text-white focus:outline-none cursor-pointer"
              >
                {[2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y} className="text-slate-900">{y} 年</option>
                ))}
              </select>
              <span className="text-slate-600">/</span>
              <select
                value={targetMonth}
                onChange={(e) => setTargetMonth(parseInt(e.target.value, 10))}
                className="bg-transparent font-bold text-teal-300 focus:outline-none cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m} className="text-slate-900">{m} 月</option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            <div className="flex items-center bg-slate-800 rounded-xl px-2.5 py-1 border border-slate-700 text-xs gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="bg-transparent font-bold text-white focus:outline-none cursor-pointer"
              >
                <option value="all" className="text-slate-900">全部部門</option>
                {DEPARTMENT_OPTIONS.map(d => (
                  <option key={d.id} value={d.id} className="text-slate-900">{d.label}</option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <button
              type="button"
              onClick={handleCopyTable}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已複製表格' : '複製表格'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>匯出 Excel / CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>橫向 A4 列印</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Print Stylesheet Definition */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: A4 landscape;
              margin: 4mm 4mm 4mm 4mm;
            }
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              background: #fff !important;
              color: #000 !important;
            }
            .no-print {
              display: none !important;
            }
            .roster-print-wrapper {
              width: 100% !important;
              max-width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .roster-table {
              width: 100% !important;
              font-size: 7.5pt !important;
              border-collapse: collapse !important;
            }
            .roster-table th, .roster-table td {
              padding: 2px 1px !important;
              height: 19px !important;
              line-height: 1.1 !important;
            }
            .roster-dept-header {
              font-size: 8.5pt !important;
              font-weight: 900 !important;
            }
          }
        `}} />

        {/* Preview / Printable Scrollable Canvas */}
        <div className="flex-1 overflow-auto bg-slate-100 p-3 sm:p-6 text-slate-800">
          <div 
            ref={printRef}
            className="roster-print-wrapper bg-white shadow-md rounded-xl p-4 sm:p-6 mx-auto max-w-[1600px] border border-slate-300 font-sans text-xs"
          >
            {/* Top Sheet Header Banner */}
            <div className="flex items-center justify-between mb-2.5 pb-2 border-b-2 border-slate-900">
              <div className="flex items-baseline gap-3">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-950 uppercase font-sans">
                  ARTISAN STUDIO 員工每月更表
                </h1>
                <span className="text-base font-black text-teal-800 bg-teal-100/70 border border-teal-300 px-2.5 py-0.5 rounded-lg">
                  {targetYear} 年 {targetMonth} 月
                </span>
              </div>

              {/* Legend Badges */}
              <div className="flex items-center gap-3 text-[10px] font-bold text-slate-600 flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 rounded bg-blue-100 text-blue-900 border border-blue-300 font-black inline-flex items-center justify-center text-[9px]">V</span>
                  <span>例假 (Rest)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 rounded bg-teal-100 text-teal-900 border border-teal-300 font-extrabold inline-flex items-center justify-center text-[8.5px]">AL</span>
                  <span>大假 (Annual)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 rounded bg-orange-100 text-orange-950 border border-orange-300 font-extrabold inline-flex items-center justify-center text-[8.5px]">SL</span>
                  <span>病假 (Sick)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 rounded bg-amber-100 text-amber-950 border border-amber-300 font-bold inline-flex items-center justify-center text-[8px]">補</span>
                  <span>補假 (Lieu)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 rounded bg-rose-100 text-rose-900 border border-rose-300 font-bold inline-flex items-center justify-center text-[8px]">UPL</span>
                  <span>無薪假</span>
                </span>
                <span className="text-slate-400 font-normal">| 排序：入職日期</span>
              </div>
            </div>

            {/* Main Roster Grid Table */}
            <div className="overflow-x-auto">
              <table className="roster-table w-full border-collapse border border-slate-900 text-center font-sans text-[11px]">
                <thead>
                  {/* Row 1: Weekday Names & Holiday Titles */}
                  <tr className="bg-slate-100 text-[10px] font-bold text-slate-700">
                    <th className="border border-slate-800 p-1 w-28 text-left pl-2 font-extrabold text-slate-900 bg-slate-200" rowSpan={2}>
                      部門 / 員工姓名
                    </th>
                    {monthDates.map(d => {
                      const isSunday = d.weekday === 0;
                      const isSaturday = d.weekday === 6;
                      const isHoliday = !!d.holidayName;
                      return (
                        <th 
                          key={d.day} 
                          className={`border border-slate-800 p-0.5 min-w-[24px] max-w-[32px] ${
                            isHoliday 
                              ? 'bg-rose-50 text-rose-700 font-extrabold' 
                              : isSunday 
                              ? 'text-rose-600 font-black' 
                              : isSaturday 
                              ? 'text-blue-700 font-bold' 
                              : 'text-slate-700'
                          }`}
                        >
                          <div className="flex flex-col items-center leading-none">
                            {d.holidayName && (
                              <span className="text-[8px] text-rose-700 font-extrabold truncate max-w-[28px] leading-tight block">
                                {d.holidayName.slice(0, 2)}
                              </span>
                            )}
                            <span className="text-[9px]">{d.weekdayName}</span>
                          </div>
                        </th>
                      );
                    })}
                    <th className="border border-slate-800 p-1 w-12 font-black bg-slate-200 text-slate-900" rowSpan={2}>
                      總天數
                    </th>
                    <th className="border border-slate-800 p-1 w-16 font-black bg-rose-50 text-rose-900" rowSpan={2}>
                      <div className="leading-tight">
                        <span className="text-[9px] block">本月未放</span>
                        <span className="text-[10px]">例假餘額</span>
                      </div>
                    </th>
                    <th className="border border-slate-800 p-1 w-16 font-black bg-teal-50 text-teal-950" rowSpan={2}>
                      <div className="leading-tight">
                        <span className="text-[9px] block">剩餘大假</span>
                        <span className="text-[10px]">(+結轉)</span>
                      </div>
                    </th>
                    <th className="border border-slate-800 p-1 w-12 font-black bg-amber-50 text-amber-950" rowSpan={2}>
                      有效補假
                    </th>
                  </tr>

                  {/* Row 2: Day Numbers (1 - 30/31) */}
                  <tr className="bg-slate-900 text-white text-[10.5px] font-mono font-bold">
                    {monthDates.map(d => {
                      const isSunday = d.weekday === 0;
                      const isHoliday = !!d.holidayName;
                      return (
                        <th 
                          key={d.day} 
                          className={`border border-slate-800 p-0.5 text-center ${
                            isHoliday || isSunday ? 'bg-rose-900 text-rose-100 font-black' : 'bg-slate-900 text-white'
                          }`}
                        >
                          {d.day}
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {groupedDepartments.map(([deptKey, dept]) => (
                    <React.Fragment key={deptKey}>
                      {/* Department Section Header Row */}
                      <tr className="bg-slate-800 text-white font-black roster-dept-header">
                        <td 
                          colSpan={monthDates.length + 5} 
                          className="border border-slate-800 py-1 px-2.5 text-left text-xs bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 tracking-wider text-teal-300"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <span>🏢 {dept.label}</span>
                            <span className="text-[10px] font-normal text-slate-400">({dept.users.length} 位同仁 • 依入職日期排序)</span>
                          </span>
                        </td>
                      </tr>

                      {/* Employee Rows within Department */}
                      {dept.users.map((u) => {
                        // Calculate total leave used this month
                        const monthPrefix = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
                        const alThisMonth = u.balances.annualLeave.eventsThisYear
                          .filter((e: any) => e.date.startsWith(monthPrefix))
                          .reduce((acc: number, e: any) => acc + getLeaveDaysValue(e), 0);
                        const lieuThisMonth = u.balances.lieuLeave.eventsThisYear
                          .filter((e: any) => e.date.startsWith(monthPrefix))
                          .reduce((acc: number, e: any) => acc + getLeaveDaysValue(e), 0);
                        const sickThisMonth = u.balances.sickLeave.eventsThisYear
                          .filter((e: any) => e.date.startsWith(monthPrefix))
                          .reduce((acc: number, e: any) => acc + getLeaveDaysValue(e), 0);
                        
                        const totalUsedMonth = Math.round((u.balances.regularOff.usedThisMonth + alThisMonth + lieuThisMonth + sickThisMonth) * 100) / 100;

                        return (
                          <tr key={u.username} className="hover:bg-slate-50 border-b border-slate-300 transition-colors">
                            {/* Employee Name & Join Date */}
                            <td className="border border-slate-400 py-1 px-2 text-left bg-slate-50/50">
                              <div className="flex items-baseline justify-between gap-1">
                                <span className="font-extrabold text-slate-900 text-xs truncate max-w-[75px]" title={u.displayName}>
                                  {u.displayName}
                                </span>
                                {u.joinDate && (
                                  <span className="text-[9px] font-mono text-slate-400 shrink-0" title={`入職日期: ${u.joinDate}`}>
                                    {u.joinDate.slice(2)}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Daily Cell Grid */}
                            {monthDates.map(d => {
                              const cell = getCellStatus(u.username, u.displayName, d.dateStr, u.joinDate);
                              return (
                                <td 
                                  key={d.day}
                                  className={`border border-slate-400 p-0 text-center text-xs h-6 ${cell.bg || (d.weekday === 0 ? 'bg-rose-50/20' : '')}`}
                                >
                                  {cell.label}
                                </td>
                              );
                            })}

                            {/* Summary Totals */}
                            {/* 總天數 (當月已放) */}
                            <td className="border border-slate-400 font-extrabold text-slate-900 bg-slate-100">
                              {formatLeaveDaysDisplay(totalUsedMonth)}
                            </td>

                            {/* 本月未放例假 (標紅顯示) */}
                            <td className={`border border-slate-400 font-black ${
                              u.balances.regularOff.remainingThisMonth > 0 ? 'text-rose-600 bg-rose-50/50' : 'text-slate-600'
                            }`}>
                              {formatLeaveDaysDisplay(u.balances.regularOff.remainingThisMonth)}
                            </td>

                            {/* 剩餘大假 */}
                            <td className="border border-slate-400 font-extrabold text-teal-800 bg-teal-50/30">
                              {formatLeaveDaysDisplay(u.balances.annualLeave.balanceAvailable)}
                            </td>

                            {/* 有效補假 */}
                            <td className="border border-slate-400 font-bold text-amber-900 bg-amber-50/30">
                              {u.balances.lieuLeave.totalDaysActive > 0 ? formatLeaveDaysDisplay(u.balances.lieuLeave.totalDaysActive) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}

                  {/* Daily Total Summary Footer Row */}
                  <tr className="bg-slate-200 text-slate-900 font-black border-t-2 border-slate-900">
                    <td className="border border-slate-800 p-1 text-left pl-2 font-black text-[10.5px]">
                      每日放假總人數
                    </td>
                    {monthDates.map(d => {
                      const count = daySummaryTotals[d.dateStr] || 0;
                      return (
                        <td key={d.day} className={`border border-slate-800 p-0 text-center font-black ${count > 0 ? 'bg-teal-100/70 text-teal-950 font-mono' : 'text-slate-400'}`}>
                          {count > 0 ? count : ''}
                        </td>
                      );
                    })}
                    <td className="border border-slate-800 p-1 font-mono font-black" colSpan={4}>
                      {Object.values(daySummaryTotals).reduce((a: number, b: number) => a + b, 0)} 人次
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Print Footer Details */}
            <div className="mt-3 pt-2 border-t border-slate-400 flex items-center justify-between text-[10px] text-slate-500 font-medium">
              <div>
                <span>ARTISAN STUDIO MANAGEMENT SYSTEM • </span>
                <span>製表日期：{new Date().toISOString().split('T')[0]} • </span>
                <span>橫向 A4 自動分頁最佳化</span>
              </div>
              <div className="flex items-center gap-3">
                <span>V = 例假</span>
                <span>AL = 大假</span>
                <span>SL = 病假</span>
                <span>AM/PM = 半日假</span>
                <span>補 = 3個月限期補假</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
