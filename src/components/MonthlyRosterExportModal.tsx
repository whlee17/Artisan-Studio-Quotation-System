import React, { useState, useMemo, useRef } from 'react';
import { 
  Printer, Download, Copy, X, Calendar, Filter, Image as ImageIcon,
  Palmtree, Coffee, Clock, FileText, Check, Sparkles, Building2, Info, Eye
} from 'lucide-react';
import html2canvas from 'html2canvas';
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
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
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
      return { type: 'before_join', label: '///', bg: 'bg-slate-100 text-slate-300 font-mono text-[8px]' };
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

    // Check if half day AM / PM
    const isAm = type === 'holiday_am' || 
                 title.includes('AM') || 
                 title.includes('上午') || 
                 title.includes('上晝') || 
                 title.includes('V(A)') || 
                 title.includes('(A)') ||
                 title.startsWith('VA');

    const isPm = type === 'holiday_pm' || 
                 title.includes('PM') || 
                 title.includes('下午') || 
                 title.includes('下晝') || 
                 title.includes('V(P)') || 
                 title.includes('(P)') ||
                 title.startsWith('VP');

    if (isAm) {
      if (cat === 'annual' || title.includes('大假') || title.includes('年假') || title.includes('AL')) {
        return { type: 'annual_am', label: 'AL(A)', bg: 'bg-teal-100 text-teal-950 font-extrabold text-[8px]' };
      }
      if (cat === 'sick' || title.includes('病假') || title.includes('SL')) {
        const hasCert = evt.medicalCertificate === true || 
                        title.includes('有醫生證明') || title.includes('附醫生證明') || title.includes('扣例假') ||
                        (evt.remarks && (evt.remarks.includes('醫生紙') || evt.remarks.includes('醫生證明')));
        if (!hasCert || title.includes('UPL') || title.includes('無薪')) {
          return { type: 'sick_upl_am', label: 'SL(UPL)(A)', bg: 'bg-rose-100 text-rose-950 font-black text-[7px]' };
        }
        return { type: 'sick_am', label: 'SL(A)', bg: 'bg-orange-100 text-orange-950 font-extrabold text-[8px]' };
      }
      if (cat === 'lieu' || title.includes('補假') || title.startsWith('補')) {
        return { type: 'lieu_am', label: '補(A)', bg: 'bg-amber-100 text-amber-950 font-bold text-[8px]' };
      }
      return { type: 'holiday_am', label: 'V(A)', bg: 'bg-blue-100 text-blue-950 font-black text-[8.5px]' };
    }

    if (isPm) {
      if (cat === 'annual' || title.includes('大假') || title.includes('年假') || title.includes('AL')) {
        return { type: 'annual_pm', label: 'AL(P)', bg: 'bg-teal-100 text-teal-950 font-extrabold text-[8px]' };
      }
      if (cat === 'sick' || title.includes('病假') || title.includes('SL')) {
        const hasCert = evt.medicalCertificate === true || 
                        title.includes('有醫生證明') || title.includes('附醫生證明') || title.includes('扣例假') ||
                        (evt.remarks && (evt.remarks.includes('醫生紙') || evt.remarks.includes('醫生證明')));
        if (!hasCert || title.includes('UPL') || title.includes('無薪')) {
          return { type: 'sick_upl_pm', label: 'SL(UPL)(P)', bg: 'bg-rose-100 text-rose-950 font-black text-[7px]' };
        }
        return { type: 'sick_pm', label: 'SL(P)', bg: 'bg-orange-100 text-orange-950 font-extrabold text-[8px]' };
      }
      if (cat === 'lieu' || title.includes('補假') || title.startsWith('補')) {
        return { type: 'lieu_pm', label: '補(P)', bg: 'bg-amber-100 text-amber-950 font-bold text-[8px]' };
      }
      return { type: 'holiday_pm', label: 'V(P)', bg: 'bg-indigo-100 text-indigo-950 font-black text-[8.5px]' };
    }

    // Regular Off / 全日例假
    if (cat === 'regular' || title.includes('例假') || title.includes('放假') || title === '休假' || title === 'V' || title === 'off' || type === 'holiday_full') {
      return { type: 'regular', label: 'V', bg: 'bg-blue-100 text-blue-900 font-black' };
    }

    // Annual Leave / 全日大假
    if (cat === 'annual' || title.includes('大假') || title.includes('年假') || title.includes('AL') || title === 'al') {
      return { type: 'annual', label: 'AL', bg: 'bg-teal-100 text-teal-900 font-extrabold' };
    }

    // Sick Leave / 全日病假
    if (cat === 'sick' || title.includes('病假') || title.includes('SL') || title === 'sl') {
      const hasCert = evt.medicalCertificate === true || 
                      title.includes('有醫生證明') || title.includes('附醫生證明') || title.includes('扣例假') ||
                      (evt.remarks && (evt.remarks.includes('醫生紙') || evt.remarks.includes('醫生證明')));
      if (!hasCert || title.includes('UPL') || title.includes('無薪')) {
        return { type: 'sick_upl', label: 'SL(UPL)', bg: 'bg-rose-100 text-rose-950 font-black text-[7.5px]' };
      }
      return { type: 'sick', label: 'SL', bg: 'bg-orange-100 text-orange-950 font-extrabold' };
    }

    // Lieu Leave / 補假
    if (cat === 'lieu' || title.includes('補假') || title.includes('WC') || title.startsWith('補')) {
      const match = title.match(/補(\d+月|\d+)/);
      const shortLabel = match ? `補${match[1]}` : (title.includes('WC') ? 'WC' : '補');
      return { type: 'lieu', label: shortLabel, bg: 'bg-amber-100 text-amber-950 font-bold text-[8.5px]' };
    }

    // Unpaid Leave
    if (title.includes('無薪') || title.includes('UPL')) {
      return { type: 'unpaid', label: 'UPL', bg: 'bg-rose-100 text-rose-900 font-bold text-[8px]' };
    }

    // Other short title
    if (title.length <= 4) {
      return { type: 'custom', label: title, bg: 'bg-slate-200 text-slate-800 font-bold text-[8.5px]' };
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

  // Method 1: Robust Isolated Iframe Print (100% non-blank, perfect A4 Landscape)
  const handlePrint = () => {
    if (!printRef.current) return;

    const content = printRef.current.innerHTML;

    // Remove existing print iframe if any
    const oldIframe = document.getElementById('roster-print-iframe');
    if (oldIframe) oldIframe.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'roster-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="zh-HK">
        <head>
          <meta charset="utf-8" />
          <title>ARTISAN STUDIO 員工每月更表 - ${targetYear}年${targetMonth}月</title>
          <style>
            @page {
              size: landscape;
              size: A4 landscape;
              margin: 3mm 4mm;
            }
            @media print {
              @page {
                size: landscape;
                size: A4 landscape;
                margin: 3mm 4mm;
              }
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              background: #ffffff !important;
              color: #0f172a !important;
              font-size: 8pt;
              width: 100% !important;
            }
            .roster-print-wrapper {
              width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
              font-size: 7pt !important;
            }
            th, td {
              border: 1px solid #334155 !important;
              padding: 1.5px 1px !important;
              height: 16px !important;
              line-height: 1.1 !important;
              text-align: center !important;
              vertical-align: middle !important;
            }
            .roster-dept-header td {
              background: #0f172a !important;
              color: #5eead4 !important;
              font-weight: 900 !important;
              font-size: 7.5pt !important;
              text-align: left !important;
              padding: 2px 6px !important;
            }
            .bg-slate-900 { background: #0f172a !important; color: #fff !important; }
            .bg-slate-800 { background: #1e293b !important; color: #fff !important; }
            .bg-slate-200 { background: #e2e8f0 !important; color: #0f172a !important; }
            .bg-slate-100 { background: #f1f5f9 !important; color: #0f172a !important; }
            .bg-slate-50 { background: #f8fafc !important; }
            .bg-slate-50\\/70 { background: #f8fafc !important; }
            .bg-blue-100 { background: #dbeafe !important; color: #1e3a8a !important; font-weight: 900 !important; }
            .bg-teal-100 { background: #ccfbf1 !important; color: #134e4a !important; font-weight: 800 !important; }
            .bg-teal-100\\/80 { background: #ccfbf1 !important; color: #134e4a !important; }
            .bg-orange-100 { background: #ffedd5 !important; color: #7c2d12 !important; font-weight: 800 !important; }
            .bg-amber-100 { background: #fef3c7 !important; color: #78350f !important; font-weight: 800 !important; }
            .bg-rose-100 { background: #ffe4e6 !important; color: #881337 !important; font-weight: 800 !important; }
            .bg-rose-50 { background: #fff1f2 !important; color: #9f1239 !important; }
            .bg-rose-50\\/20 { background: #fff1f2 !important; }
            .bg-rose-50\\/50 { background: #fff1f2 !important; }
            .bg-rose-900 { background: #881337 !important; color: #ffe4e6 !important; }
            .bg-teal-50 { background: #f0fdf4 !important; color: #14532d !important; }
            .bg-teal-50\\/30 { background: #f0fdf4 !important; }
            .bg-amber-50 { background: #fffbeb !important; color: #78350f !important; }
            .bg-amber-50\\/30 { background: #fffbeb !important; }
            .text-rose-600 { color: #e11d48 !important; }
            .text-rose-700 { color: #be123c !important; }
            .text-blue-700 { color: #1d4ed8 !important; }
            .text-teal-800 { color: #115e59 !important; }
            .text-teal-900 { color: #134e4a !important; }
            .text-teal-950 { color: #042f2e !important; }
            .text-amber-900 { color: #78350f !important; }
            .text-amber-950 { color: #451a03 !important; }
            .text-slate-900 { color: #0f172a !important; }
            .text-slate-950 { color: #020617 !important; }
            .text-slate-700 { color: #334155 !important; }
            .text-slate-600 { color: #475569 !important; }
            .text-slate-400 { color: #94a3b8 !important; }
            .font-black { font-weight: 900 !important; }
            .font-extrabold { font-weight: 800 !important; }
            .font-bold { font-weight: 700 !important; }
            .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace !important; }
            .flex { display: flex !important; }
            .items-center { align-items: center !important; }
            .items-baseline { align-items: baseline !important; }
            .justify-between { justify-content: space-between !important; }
            .gap-1 { gap: 3px !important; }
            .gap-2 { gap: 6px !important; }
            .gap-2\\.5 { gap: 8px !important; }
            .border-b-2 { border-bottom: 2px solid #0f172a !important; }
            .border-t-2 { border-top: 2px solid #0f172a !important; }
            .border-t { border-top: 1px solid #94a3b8 !important; }
            .border-slate-900 { border-color: #0f172a !important; }
            .border-slate-800 { border-color: #1e293b !important; }
            .border-slate-400 { border-color: #94a3b8 !important; }
            .border-slate-300 { border-color: #cbd5e1 !important; }
            .truncate { overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }
            .whitespace-nowrap { white-space: nowrap !important; }
            .overflow-hidden { overflow: hidden !important; }
            .w-full { width: 100% !important; }
          </style>
        </head>
        <body>
          <div class="roster-print-wrapper">
            ${content}
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error(e);
        window.print();
      }
    }, 250);
  };

  // Safe PNG Image Download Method
  const handleDownloadPNG = async () => {
    if (!printRef.current) return;
    try {
      setIsGeneratingImage(true);
      const el = printRef.current;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `ARTISAN_STUDIO_更表_${targetYear}年${targetMonth}月.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => link.remove(), 200);
    } catch (err) {
      console.error('Download PNG failed:', err);
      // Fallback: trigger print
      handlePrint();
    } finally {
      setIsGeneratingImage(false);
    }
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
    <div className="roster-modal-container fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      {/* Container Dialog */}
      <div className="bg-white w-full max-w-[98vw] 2xl:max-w-[1700px] h-[95vh] rounded-2xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden">
        {/* Top Control Bar (Non-Printable) */}
        <div className="no-print bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2.5 shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Building2 className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-xs sm:text-sm font-black tracking-wide flex items-center gap-2">
                <span>ARTISAN STUDIO 員工每月更表匯出系統</span>
                <span className="text-[9.5px] font-bold bg-teal-400/20 text-teal-300 border border-teal-400/30 px-2 py-0.2 rounded-full">
                  單頁橫向 A4 最佳化
                </span>
              </h3>
            </div>
          </div>

          {/* Controls: Year, Month, Department, Density, Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Year & Month Picker */}
            <div className="flex items-center bg-slate-800 rounded-lg px-2 py-1 border border-slate-700 gap-1.5">
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
            <div className="flex items-center bg-slate-800 rounded-lg px-2 py-1 border border-slate-700 gap-1.5">
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

            {/* Print Button (Guaranteed 100% Single Sheet!) */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isGeneratingImage}
              title="一鍵啟動橫向 A4 列印"
              className="px-3.5 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:shadow active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>橫向 A4 列印</span>
            </button>

            {/* Download High-Res PNG */}
            <button
              type="button"
              onClick={handleDownloadPNG}
              disabled={isGeneratingImage}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/40 font-bold flex items-center gap-1 transition-all cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>下載 PNG 圖片</span>
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="hidden md:flex px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold items-center gap-1 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel/CSV</span>
            </button>

            {/* Copy Table */}
            <button
              type="button"
              onClick={handleCopyTable}
              className="hidden lg:flex px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold items-center gap-1 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已複製' : '複製'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Preview / Printable Canvas */}
        <div className="flex-1 overflow-auto bg-slate-200/80 p-2 sm:p-5 text-slate-800">
          <div 
            ref={printRef}
            className="roster-print-wrapper bg-white shadow-lg rounded-xl p-3 sm:p-4 mx-auto max-w-[1550px] border border-slate-300 font-sans text-[10px]"
          >
            {/* Top Sheet Header Banner */}
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b-2 border-slate-900">
              <div className="flex items-baseline gap-2.5">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-950 uppercase font-sans">
                  ARTISAN STUDIO 員工每月更表
                </h1>
                <span className="text-xs sm:text-sm font-black text-teal-800 bg-teal-100/80 border border-teal-300 px-2 py-0.2 rounded-md">
                  {targetYear} 年 {targetMonth} 月
                </span>
              </div>

              {/* Legend Badges */}
              <div className="flex items-center gap-2 text-[9px] font-bold text-slate-600 flex-wrap">
                <span className="flex items-center gap-0.5">
                  <span className="w-3 h-3 rounded bg-blue-100 text-blue-900 border border-blue-300 font-black inline-flex items-center justify-center text-[7.5px]">V</span>
                  <span>例假 (全日)</span>
                </span>
                <span className="flex items-center gap-0.5">
                  <span className="px-1 h-3 rounded bg-blue-100 text-blue-950 border border-blue-300 font-black inline-flex items-center justify-center text-[7px]">V(A)</span>
                  <span>上午假</span>
                </span>
                <span className="flex items-center gap-0.5">
                  <span className="px-1 h-3 rounded bg-indigo-100 text-indigo-950 border border-indigo-300 font-black inline-flex items-center justify-center text-[7px]">V(P)</span>
                  <span>下午假</span>
                </span>
                <span className="flex items-center gap-0.5">
                  <span className="w-3 h-3 rounded bg-teal-100 text-teal-900 border border-teal-300 font-extrabold inline-flex items-center justify-center text-[7.5px]">AL</span>
                  <span>大假 (Annual)</span>
                </span>
                <span className="flex items-center gap-0.5">
                  <span className="w-3 h-3 rounded bg-orange-100 text-orange-950 border border-orange-300 font-extrabold inline-flex items-center justify-center text-[7.5px]">SL</span>
                  <span>病假 (Sick)</span>
                </span>
                <span className="flex items-center gap-0.5">
                  <span className="w-3 h-3 rounded bg-amber-100 text-amber-950 border border-amber-300 font-bold inline-flex items-center justify-center text-[7.5px]">補</span>
                  <span>補假 (Lieu)</span>
                </span>
                <span className="flex items-center gap-0.5">
                  <span className="w-3 h-3 rounded bg-rose-100 text-rose-900 border border-rose-300 font-bold inline-flex items-center justify-center text-[7.5px]">UPL</span>
                  <span>無薪假</span>
                </span>
                <span className="text-slate-400 font-normal">| 排序：入職日期</span>
              </div>
            </div>

            {/* Main Roster Grid Table */}
            <div className="overflow-x-auto">
              <table className="roster-table w-full border-collapse border border-slate-900 text-center font-sans">
                <thead>
                  {/* Row 1: Weekday Names & Holiday Titles */}
                  <tr className="bg-slate-100 text-[9px] font-bold text-slate-700">
                    <th 
                      className="border border-slate-800 p-0.5 text-left pl-1.5 font-extrabold text-slate-900 bg-slate-200 whitespace-nowrap" 
                      style={{ width: '105px', minWidth: '95px' }}
                      rowSpan={2}
                    >
                      部門 / 員工姓名
                    </th>
                    {monthDates.map(d => {
                      const isSunday = d.weekday === 0;
                      const isSaturday = d.weekday === 6;
                      const isHoliday = !!d.holidayName;
                      return (
                        <th 
                          key={d.day} 
                          className={`border border-slate-800 p-0 ${
                            isHoliday 
                              ? 'bg-rose-50 text-rose-700 font-extrabold' 
                              : isSunday 
                              ? 'text-rose-600 font-black' 
                              : isSaturday 
                              ? 'text-blue-700 font-bold' 
                              : 'text-slate-700'
                          }`}
                          style={{ minWidth: '18px' }}
                        >
                          <div className="flex flex-col items-center justify-center leading-none py-0.5">
                            {d.holidayName && (
                              <span className="text-[7px] text-rose-700 font-extrabold truncate max-w-[22px] leading-tight block">
                                {d.holidayName.slice(0, 2)}
                              </span>
                            )}
                            <span className="text-[8px] scale-95 leading-none">{d.weekdayName}</span>
                          </div>
                        </th>
                      );
                    })}
                    <th 
                      className="border border-slate-800 p-0.5 font-black bg-slate-200 text-slate-900 text-[9px] whitespace-nowrap" 
                      style={{ width: '32px', minWidth: '30px' }}
                      rowSpan={2}
                    >
                      總天數
                    </th>
                    <th 
                      className="border border-slate-800 p-0.5 font-black bg-rose-50 text-rose-900 text-[9px] whitespace-nowrap" 
                      style={{ width: '38px', minWidth: '36px' }}
                      rowSpan={2}
                    >
                      未放例假
                    </th>
                    <th 
                      className="border border-slate-800 p-0.5 font-black bg-teal-50 text-teal-950 text-[9px] whitespace-nowrap" 
                      style={{ width: '38px', minWidth: '36px' }}
                      rowSpan={2}
                    >
                      剩餘大假
                    </th>
                    <th 
                      className="border border-slate-800 p-0.5 font-black bg-amber-50 text-amber-950 text-[9px] whitespace-nowrap" 
                      style={{ width: '28px', minWidth: '26px' }}
                      rowSpan={2}
                    >
                      補假
                    </th>
                  </tr>

                  {/* Row 2: Day Numbers (1 - 30/31) */}
                  <tr className="bg-slate-900 text-white text-[9px] font-mono font-bold">
                    {monthDates.map(d => {
                      const isSunday = d.weekday === 0;
                      const isHoliday = !!d.holidayName;
                      return (
                        <th 
                          key={d.day} 
                          className={`border border-slate-800 p-0 text-center ${
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
                          className="border border-slate-800 py-0.5 px-2 text-left text-[9.5px] bg-slate-900 tracking-wide text-teal-300"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <span>🏢 {dept.label}</span>
                            <span className="text-[8.5px] font-normal text-slate-400">({dept.users.length} 位人員)</span>
                          </span>
                        </td>
                      </tr>

                      {/* Employee Rows within Department */}
                      {dept.users.map((u) => {
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
                            {/* Employee Name & Join Date (Non-wrapping clean row) */}
                            <td 
                              className="border border-slate-400 py-0.5 px-1.5 text-left bg-slate-50/70 whitespace-nowrap"
                              style={{ width: '105px', minWidth: '95px' }}
                            >
                              <div className="flex items-center justify-between gap-1 overflow-hidden">
                                <span className="font-extrabold text-slate-900 text-[10px] truncate" title={u.displayName}>
                                  {u.displayName}
                                </span>
                                {u.joinDate && (
                                  <span className="text-[7.5px] font-mono text-slate-400 shrink-0" title={`入職日期: ${u.joinDate}`}>
                                    {u.joinDate.slice(2).replace(/-/g, '/')}
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
                                  className={`border border-slate-400 p-0 text-center text-[9.5px] h-4.5 ${cell.bg || (d.weekday === 0 ? 'bg-rose-50/20' : '')}`}
                                >
                                  {cell.label}
                                </td>
                              );
                            })}

                            {/* Summary Totals */}
                            {/* 總天數 (當月已放) */}
                            <td className="border border-slate-400 font-extrabold text-slate-900 bg-slate-100 text-[9.5px] whitespace-nowrap">
                              {formatLeaveDaysDisplay(totalUsedMonth)}
                            </td>

                            {/* 本月未放例假 (標紅顯示) */}
                            <td className={`border border-slate-400 font-black text-[9.5px] whitespace-nowrap ${
                              u.balances.regularOff.remainingThisMonth > 0 ? 'text-rose-600 bg-rose-50/50' : 'text-slate-600'
                            }`}>
                              {formatLeaveDaysDisplay(u.balances.regularOff.remainingThisMonth)}
                            </td>

                            {/* 剩餘大假 */}
                            <td className="border border-slate-400 font-extrabold text-teal-800 bg-teal-50/30 text-[9.5px] whitespace-nowrap">
                              {formatLeaveDaysDisplay(u.balances.annualLeave.balanceAvailable)}
                            </td>

                            {/* 有效補假 */}
                            <td className="border border-slate-400 font-bold text-amber-900 bg-amber-50/30 text-[9.5px] whitespace-nowrap">
                              {u.balances.lieuLeave.totalDaysActive > 0 ? formatLeaveDaysDisplay(u.balances.lieuLeave.totalDaysActive) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}

                  {/* Daily Total Summary Footer Row */}
                  <tr className="bg-slate-200 text-slate-900 font-black border-t-2 border-slate-900">
                    <td className="border border-slate-800 p-0.5 text-left pl-1.5 font-black text-[9px] whitespace-nowrap">
                      每日放假總人數
                    </td>
                    {monthDates.map(d => {
                      const count = daySummaryTotals[d.dateStr] || 0;
                      return (
                        <td key={d.day} className={`border border-slate-800 p-0 text-center font-black text-[9px] ${count > 0 ? 'bg-teal-100/70 text-teal-950 font-mono' : 'text-slate-400'}`}>
                          {count > 0 ? count : ''}
                        </td>
                      );
                    })}
                    <td className="border border-slate-800 p-0.5 font-mono font-black text-[9px] whitespace-nowrap" colSpan={4}>
                      {Object.values(daySummaryTotals).reduce((a: number, b: number) => a + b, 0)} 人次
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Print Footer Details */}
            <div className="mt-2 pt-1 border-t border-slate-400 flex items-center justify-between text-[8.5px] text-slate-500 font-medium">
              <div>
                <span>ARTISAN STUDIO MANAGEMENT SYSTEM • </span>
                <span>製表日期：{new Date().toISOString().split('T')[0]} • </span>
              </div>
              <div className="flex items-center gap-2">
                <span>V = 例假(全日)</span>
                <span>V(A) = 上午假</span>
                <span>V(P) = 下午假</span>
                <span>AL = 大假</span>
                <span>SL = 病假(扣例假)</span>
                <span>SL(UPL) = 無證明病假(無薪)</span>
                <span>補 = 3個月限期補假</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
