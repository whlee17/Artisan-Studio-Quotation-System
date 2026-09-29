import React, { useState, useMemo } from 'react';
import { 
  Calendar, Palmtree, Clock, Coffee, ShieldAlert, Plus, 
  Trash2, AlertTriangle, CheckCircle2, ChevronRight, 
  Sparkles, SlidersHorizontal, User, 
  Search, Info, FileText, CalendarCheck2, History,
  ShieldCheck, Hourglass, CheckSquare, Square,
  Check, Save, RefreshCw, Printer, Download
} from 'lucide-react';
import { 
  CalendarEvent, 
  DEPARTMENT_OPTIONS,
  DepartmentType,
  EmployeeHolidayProfile, 
  HolidayCompanySettings, 
  HolidayManagementData, 
  LieuLeaveGrant, 
  QuoteSettings, 
  UserAccount 
} from '../types';
import { 
  calculateEmployeeLeaveBalances, 
  calculateLieuExpiryDate, 
  createLieuGrantFromWorkEvent, 
  DEFAULT_EMPLOYEE_PROFILE, 
  DEFAULT_HOLIDAY_COMPANY_SETTINGS, 
  formatLeaveDaysDisplay,
  getLeaveDaysValue, 
  getPublicHolidayName, 
  getTodayDateString, 
  HK_PUBLIC_HOLIDAYS_MAP, 
  isLieuGrantExpired 
} from '../lib/holidayManagement';
import { MonthlyRosterExportModal } from './MonthlyRosterExportModal';

interface HolidayManagementPageProps {
  currentUser: UserAccount | null;
  accountsList: UserAccount[];
  settings: QuoteSettings;
  calendarEvents: CalendarEvent[];
  onUpdateSettings: (newSettings: QuoteSettings) => Promise<void> | void;
  onSaveCalendarEvent?: (evt: CalendarEvent) => Promise<void>;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  canManage: boolean;
}

export const HolidayManagementPage: React.FC<HolidayManagementPageProps> = ({
  currentUser,
  accountsList,
  settings,
  calendarEvents,
  onUpdateSettings,
  onSaveCalendarEvent,
  showToast,
  canManage
}) => {
  // Current active holiday data
  const holidayData: HolidayManagementData = useMemo(() => {
    const raw = settings.holidayManagement;
    return {
      companySettings: raw?.companySettings || DEFAULT_HOLIDAY_COMPANY_SETTINGS,
      profiles: raw?.profiles || {}
    };
  }, [settings.holidayManagement]);

  // Selected User state
  const allUsersList = useMemo(() => {
    const list: { username: string; displayName: string; role: string; department: string }[] = [];
    const seen = new Set<string>();

    // Helper to resolve department
    const resolveDept = (username: string, rawDept?: string): string => {
      const pDept = holidayData.profiles?.[username.toLowerCase()]?.department;
      if (pDept) return pDept;
      if (rawDept) return rawDept;
      if (username.toLowerCase() === 'king') return 'sales';
      if (username.toLowerCase() === 'mat') return 'design';
      return 'admin';
    };

    // 1. From accountsList
    if (Array.isArray(accountsList)) {
      accountsList.forEach(acc => {
        if (acc && acc.username && !seen.has(acc.username.toLowerCase())) {
          const uKey = acc.username.toLowerCase();
          seen.add(uKey);
          list.push({
            username: uKey,
            displayName: acc.displayName || acc.username,
            role: acc.role || 'staff',
            department: resolveDept(uKey, acc.department || acc.profile?.department)
          });
        }
      });
    }

    // 2. Fallbacks: whlee, king, mat if not present
    ['whlee', 'king', 'mat'].forEach(u => {
      if (!seen.has(u)) {
        seen.add(u);
        list.push({
          username: u,
          displayName: u.toUpperCase(),
          role: 'admin',
          department: resolveDept(u, u === 'king' ? 'sales' : u === 'mat' ? 'design' : 'admin')
        });
      }
    });

    return list;
  }, [accountsList, holidayData.profiles]);

  const [selectedUsername, setSelectedUsername] = useState<string>(() => {
    if (currentUser?.username) return currentUser.username.toLowerCase();
    return allUsersList[0]?.username || 'whlee';
  });

  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>('all');
  const [searchUserQuery, setSearchUserQuery] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'annual' | 'regular' | 'lieu' | 'sick' | 'company'>('overview');
  const [targetYear, setTargetYear] = useState<number>(() => new Date().getFullYear());
  const [targetMonth, setTargetMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [showRosterExportModal, setShowRosterExportModal] = useState<boolean>(false);

  // Manual Grant Lieu modal / inline form state
  const [showAddLieuForm, setShowAddLieuForm] = useState<boolean>(false);
  const [newLieuWorkDate, setNewLieuWorkDate] = useState<string>(() => getTodayDateString());
  const [newLieuHolidayName, setNewLieuHolidayName] = useState<string>('國慶日');
  const [newLieuDays, setNewLieuDays] = useState<number>(1.0);
  const [newLieuNotes, setNewLieuNotes] = useState<string>('');

  // Selected user info
  const [regularScope, setRegularScope] = useState<'month' | 'year'>('month');

  const selectedUserObj = useMemo(() => {
    return allUsersList.find(u => u.username === selectedUsername) || {
      username: selectedUsername,
      displayName: selectedUsername,
      role: 'staff'
    };
  }, [allUsersList, selectedUsername]);

  // Current employee's holiday profile
  const currentProfile: EmployeeHolidayProfile = useMemo(() => {
    if (holidayData.profiles && holidayData.profiles[selectedUsername]) {
      return holidayData.profiles[selectedUsername];
    }
    return DEFAULT_EMPLOYEE_PROFILE(selectedUsername, selectedUserObj.displayName);
  }, [holidayData.profiles, selectedUsername, selectedUserObj.displayName]);

  // Calculated leave balance statistics
  const balances = useMemo(() => {
    return calculateEmployeeLeaveBalances(
      currentProfile,
      selectedUsername,
      selectedUserObj.displayName,
      calendarEvents,
      targetYear,
      targetMonth
    );
  }, [currentProfile, selectedUsername, selectedUserObj.displayName, calendarEvents, targetYear, targetMonth]);

  // Helper to persist updated profile
  const handleSaveProfile = async (updatedProfile: EmployeeHolidayProfile, toastMsg: string = '假期設定已成功儲存') => {
    try {
      const updatedProfiles = {
        ...(holidayData.profiles || {}),
        [selectedUsername]: {
          ...updatedProfile,
          updatedAt: Date.now(),
          updatedBy: currentUser?.username || 'system'
        }
      };

      const newHolidayData: HolidayManagementData = {
        ...holidayData,
        profiles: updatedProfiles,
        lastUpdated: Date.now()
      };

      const newSettings: QuoteSettings = {
        ...settings,
        holidayManagement: newHolidayData
      };

      await onUpdateSettings(newSettings);
      if (showToast) showToast(toastMsg, 'success');
    } catch (err: any) {
      console.error('Failed to save holiday profile:', err);
      if (showToast) showToast('儲存假期設定失敗：' + (err?.message || '未知錯誤'), 'error');
    }
  };

  // Helper to persist company settings
  const handleSaveCompanySettings = async (updatedCompany: HolidayCompanySettings) => {
    try {
      const newHolidayData: HolidayManagementData = {
        ...holidayData,
        companySettings: updatedCompany,
        lastUpdated: Date.now()
      };

      const newSettings: QuoteSettings = {
        ...settings,
        holidayManagement: newHolidayData
      };

      await onUpdateSettings(newSettings);
      if (showToast) showToast('全公司通用假期規則已更新', 'success');
    } catch (err: any) {
      console.error('Failed to save company holiday settings:', err);
      if (showToast) showToast('儲存失敗：' + (err?.message || '未知錯誤'), 'error');
    }
  };

  // Add Lieu Grant handler
  const handleAddLieuGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLieuWorkDate) {
      if (showToast) showToast('請填寫出勤日期', 'error');
      return;
    }

    const grant = createLieuGrantFromWorkEvent(
      selectedUsername,
      newLieuWorkDate,
      newLieuHolidayName || '公眾假期加班',
      newLieuDays,
      newLieuNotes
    );

    const existingGrants = Array.isArray(currentProfile.lieuGrants) ? currentProfile.lieuGrants : [];
    const updatedProfile: EmployeeHolidayProfile = {
      ...currentProfile,
      lieuGrants: [grant, ...existingGrants]
    };

    await handleSaveProfile(updatedProfile, `已為【${selectedUserObj.displayName}】新增 ${grant.daysEarned} 天補假（限 3 個月內至 ${grant.expiryDate} 放完）`);
    setShowAddLieuForm(false);
    setNewLieuNotes('');
  };

  // Delete Lieu Grant handler
  const handleDeleteLieuGrant = async (grantId: string) => {
    const existingGrants = Array.isArray(currentProfile.lieuGrants) ? currentProfile.lieuGrants : [];
    const updatedProfile: EmployeeHolidayProfile = {
      ...currentProfile,
      lieuGrants: existingGrants.filter(g => g.id !== grantId)
    };
    await handleSaveProfile(updatedProfile, '已刪除該筆補假記錄');
  };

  // Toggle Medical Certificate for a sick leave event directly
  const handleToggleEventMC = async (event: CalendarEvent) => {
    if (!onSaveCalendarEvent) return;
    try {
      const nextMC = !event.medicalCertificate;
      const userLabel = event.createdBy || '';
      let newTitle = event.title || '';
      if (nextMC) {
        newTitle = newTitle.replace('SL(UPL)', '病假 (SL)').replace(/SL\(UPL\)/g, 'SL');
        if (!newTitle.includes('病假') && !newTitle.includes('SL')) {
          newTitle = userLabel ? `[${userLabel}] 病假 (SL)` : '病假 (SL)';
        }
      } else {
        newTitle = newTitle.replace('病假 (SL)', 'SL(UPL)').replace('病假', 'SL(UPL)');
        if (!newTitle.includes('SL(UPL)')) {
          newTitle = userLabel ? `[${userLabel}] SL(UPL)` : 'SL(UPL)';
        }
      }
      const updatedEvt: CalendarEvent = {
        ...event,
        title: newTitle,
        medicalCertificate: nextMC,
        updatedAt: Date.now()
      };
      await onSaveCalendarEvent(updatedEvt);
      if (showToast) {
        showToast(
          updatedEvt.medicalCertificate 
            ? `已將 ${event.date} 之病假標記為「已附醫生證明 📄 (直接扣除例假)」` 
            : `已將 ${event.date} 之病假標記為「無醫生證明 ⚠️ (日程顯示為 SL(UPL) 無薪假)」`,
          'success'
        );
      }
    } catch (err: any) {
      console.error('Failed to update event medical certificate:', err);
      if (showToast) showToast('更新病假證明失敗', 'error');
    }
  };

  // Department counts for filter tabs
  const departmentCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allUsersList.length, admin: 0, sales: 0, marketing: 0, design: 0 };
    allUsersList.forEach(u => {
      const dept = u.department || 'admin';
      if (counts[dept] !== undefined) {
        counts[dept]++;
      } else {
        counts.admin++;
      }
    });
    return counts;
  }, [allUsersList]);

  // Filtered users for left picker
  const filteredUsers = useMemo(() => {
    let list = allUsersList;
    if (selectedDepartmentFilter !== 'all') {
      list = list.filter(u => (u.department || 'admin') === selectedDepartmentFilter);
    }
    if (searchUserQuery.trim()) {
      const q = searchUserQuery.toLowerCase().trim();
      list = list.filter(u => 
        u.username.toLowerCase().includes(q) || 
        u.displayName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allUsersList, selectedDepartmentFilter, searchUserQuery]);

  if (!canManage) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">未具備「假期管理」權限</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          您目前的帳號未被授權瀏覽或修改員工假期與配額。如需進行假期管理與核銷，請聯絡系統最高管理員（whlee / king / mat）開啟相關權限。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-800 text-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
          <Palmtree className="w-48 h-48 text-white" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20">
                <Palmtree className="w-5 h-5 text-emerald-300" />
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-black tracking-wide flex items-center gap-2">
                  <span>員工假期配額與審核管理中心</span>
                  <span className="text-[11px] font-bold bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 px-2 py-0.5 rounded-full">
                    權限受控
                  </span>
                </h3>
                <p className="text-xs text-teal-100/90 font-medium">
                  管理大假累積與即時扣減、例假基底設定、公眾假期出勤 3 個月期限補假、病假醫療證明 (MC) 審查
                </p>
              </div>
            </div>
          </div>

          {/* Year & Month Selection & Export Button */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0 self-start sm:self-auto">
            <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-xl border border-white/10 backdrop-blur-xs">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-teal-200 ml-1" />
                <select
                  value={targetYear}
                  onChange={(e) => setTargetYear(parseInt(e.target.value, 10))}
                  aria-label="選擇統計年份"
                  className="bg-transparent text-white font-bold text-xs py-1 px-1.5 focus:outline-none cursor-pointer"
                >
                  {[2025, 2026, 2027, 2028].map(y => (
                    <option key={y} value={y} className="text-slate-800">{y} 年度</option>
                  ))}
                </select>
              </div>
              <span className="text-white/40">|</span>
              <select
                value={targetMonth}
                onChange={(e) => setTargetMonth(parseInt(e.target.value, 10))}
                aria-label="選擇統計月份"
                className="bg-transparent text-white font-bold text-xs py-1 px-1.5 focus:outline-none cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m} className="text-slate-800">{m} 月份</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowRosterExportModal(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-300 hover:from-teal-300 hover:to-emerald-200 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer transform active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>匯出每月更表</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Staff Picker & Search (col-span-3) */}
        <div className="lg:col-span-3 space-y-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-3xs">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-teal-600" />
              <span>人員名冊 ({allUsersList.length})</span>
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">點擊切換管理</span>
          </div>

          {/* Department Filter Dropdown */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-500 px-0.5">
              <span>部門分類篩選：</span>
              <span className="text-[10px] text-teal-700 font-extrabold">{filteredUsers.length} 位成員</span>
            </div>
            <div className="relative">
              <select
                value={selectedDepartmentFilter}
                onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 hover:bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:outline-teal-600 cursor-pointer shadow-3xs transition-colors"
                aria-label="部門分類篩選"
              >
                <option value="all">🏢 全部部門 ({departmentCounts.all} 人)</option>
                {DEPARTMENT_OPTIONS.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.label} ({(departmentCounts as any)[d.id] || 0} 人)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="搜尋姓名或帳號..."
              value={searchUserQuery}
              onChange={(e) => setSearchUserQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-teal-600 font-medium text-slate-800"
            />
          </div>

          {/* User List Pills */}
          <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-0.5 no-scrollbar">
            {filteredUsers.map((u) => {
              const isSelected = u.username === selectedUsername;
              const uProf = holidayData.profiles?.[u.username] || DEFAULT_EMPLOYEE_PROFILE(u.username, u.displayName);
              const uBal = calculateEmployeeLeaveBalances(uProf, u.username, u.displayName, calendarEvents, targetYear, targetMonth);
              const deptOption = DEPARTMENT_OPTIONS.find(d => d.id === u.department) || DEPARTMENT_OPTIONS[0];

              return (
                <button
                  key={u.username}
                  type="button"
                  onClick={() => setSelectedUsername(u.username)}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-teal-50/90 border-teal-500 shadow-3xs ring-1 ring-teal-400/30'
                      : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                      isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {u.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-850 truncate">{u.displayName}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${deptOption.badge}`}>
                          {deptOption.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block">@{u.username}</span>
                    </div>
                  </div>

                  {/* Micro balance chips */}
                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-extrabold text-teal-700">
                      大假餘額 {formatLeaveDaysDisplay(uBal.annualLeave.balanceAvailable)} 天
                    </div>
                    {uBal.lieuLeave.totalDaysActive > 0 && (
                      <div className="text-[9.5px] font-bold text-amber-600">
                        補假 +{formatLeaveDaysDisplay(uBal.lieuLeave.totalDaysActive)}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed Management Views (col-span-9) */}
        <div className="lg:col-span-9 space-y-5">
          {/* Top 4 Quick Stat Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Annual Leave */}
            <div 
              onClick={() => setActiveSubTab('annual')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-3xs ${
                activeSubTab === 'annual' 
                  ? 'bg-teal-50/80 border-teal-500 ring-2 ring-teal-400/20' 
                  : 'bg-white border-slate-200 hover:border-teal-300'
              }`}
            >
              <div className="flex items-center justify-between text-teal-700 mb-1">
                <span className="text-[11px] font-extrabold flex items-center gap-1">
                  <Palmtree className="w-3.5 h-3.5" />
                  大假 (AL)
                </span>
                <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-1.5 py-0.2 rounded-full">
                  可放 {formatLeaveDaysDisplay(balances.annualLeave.balanceAvailable)} 天
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900">{formatLeaveDaysDisplay(balances.annualLeave.balanceAvailable)}</span>
                <span className="text-xs text-slate-400 font-bold">/ {formatLeaveDaysDisplay(balances.annualLeave.totalEntitled)} 天年假</span>
              </div>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                已放 {formatLeaveDaysDisplay(balances.annualLeave.usedThisYear)} 天 (累積 {formatLeaveDaysDisplay(balances.annualLeave.accumulatedToDate)} 天)
              </p>
            </div>

            {/* Regular Off */}
            <div 
              onClick={() => setActiveSubTab('regular')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-3xs ${
                activeSubTab === 'regular' 
                  ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-400/20' 
                  : 'bg-white border-slate-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between text-blue-700 mb-1">
                <span className="text-[11px] font-extrabold flex items-center gap-1">
                  <Coffee className="w-3.5 h-3.5" />
                  例假 (Off)
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded-full">
                  本月餘 {balances.regularOff.remainingThisMonth}
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900">{balances.regularOff.remainingThisMonth}</span>
                <span className="text-xs text-slate-400 font-bold">/ {balances.regularOff.monthlyQuota} 天配額</span>
              </div>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                {targetMonth}月已放 {balances.regularOff.usedThisMonth} 天例假
              </p>
            </div>

            {/* Lieu Leave (3 Months Expiry) */}
            <div 
              onClick={() => setActiveSubTab('lieu')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-3xs ${
                activeSubTab === 'lieu' 
                  ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-400/20' 
                  : 'bg-white border-slate-200 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between text-amber-700 mb-1">
                <span className="text-[11px] font-extrabold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  補假 (Lieu)
                </span>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-full">
                  3個月期限
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900">{balances.lieuLeave.totalDaysActive}</span>
                <span className="text-xs text-slate-400 font-bold">天有效</span>
              </div>
              <p className="text-[10.5px] text-amber-700 font-medium mt-0.5 truncate">
                {balances.lieuLeave.earliestExpiringGrant 
                  ? `最近到期: ${balances.lieuLeave.earliestExpiringGrant.expiryDate}` 
                  : '目前無即將到期補假'}
              </p>
            </div>

            {/* Sick Leave & MC */}
            <div 
              onClick={() => setActiveSubTab('sick')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-3xs ${
                activeSubTab === 'sick' 
                  ? 'bg-rose-50/80 border-rose-500 ring-2 ring-rose-400/20' 
                  : 'bg-white border-slate-200 hover:border-rose-300'
              }`}
            >
              <div className="flex items-center justify-between text-rose-700 mb-1">
                <span className="text-[11px] font-extrabold flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  病假 (SL)
                </span>
                <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.2 rounded-full">
                  醫療證明
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900">{balances.sickLeave.totalDaysThisYear}</span>
                <span className="text-xs text-slate-400 font-bold">天 ({targetYear})</span>
              </div>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                📄 有證明: {balances.sickLeave.daysWithMedicalCert} / ⚠️ 無證明: {balances.sickLeave.daysWithoutMedicalCert}
              </p>
            </div>
          </div>

          {/* Subtabs Bar */}
          <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'overview', label: '假期總覽與統計', icon: <CalendarCheck2 className="w-4 h-4" /> },
              { id: 'annual', label: '大假額度與累計', icon: <Palmtree className="w-4 h-4" /> },
              { id: 'regular', label: '例假日數設定', icon: <Coffee className="w-4 h-4" /> },
              { id: 'lieu', label: '補假 (3個月限期)', icon: <Clock className="w-4 h-4" /> },
              { id: 'sick', label: '病假與證明', icon: <FileText className="w-4 h-4" /> },
              { id: 'company', label: '全公司通用規則', icon: <SlidersHorizontal className="w-4 h-4" /> }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                  activeSubTab === tab.id
                    ? 'bg-teal-700 text-white border-teal-700 shadow-3xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* VIEW 1: OVERVIEW & AUDIT */}
          {activeSubTab === 'overview' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h4 className="text-sm font-black text-slate-850 flex items-center gap-2 flex-wrap">
                    <span>【{selectedUserObj.displayName}】@{selectedUsername} 的 {targetYear} 年度假期綜合報表</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold border ${(DEPARTMENT_OPTIONS.find(d => d.id === (currentProfile.department || selectedUserObj.department)) || DEPARTMENT_OPTIONS[0]).badge}`}>
                      {(DEPARTMENT_OPTIONS.find(d => d.id === (currentProfile.department || selectedUserObj.department)) || DEPARTMENT_OPTIONS[0]).label}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    即時連動行事曆已登記之請假記錄、公眾假期出勤自動計發補假與醫療證明審查狀態
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl shadow-3xs">
                    <span className="text-[11px] font-extrabold text-slate-600">所屬部門：</span>
                    <select
                      value={currentProfile.department || selectedUserObj.department || 'admin'}
                      onChange={(e) => {
                        const targetDept = e.target.value;
                        handleSaveProfile({
                          ...currentProfile,
                          department: targetDept
                        }, `已將【${selectedUserObj.displayName}】設定為「${DEPARTMENT_OPTIONS.find(d => d.id === targetDept)?.label || targetDept}」`);
                      }}
                      className="text-xs font-black text-teal-800 bg-transparent focus:outline-none cursor-pointer"
                    >
                      {DEPARTMENT_OPTIONS.map(d => (
                        <option key={d.id} value={d.id} className="text-slate-800">{d.label}</option>
                      ))}
                    </select>
                  </div>

                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                    入職日期：{currentProfile.joinDate || '未設定'}
                  </span>
                </div>
              </div>

              {/* Four leave breakdown table */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* AL Box */}
                <div className="bg-teal-50/40 border border-teal-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-teal-900 flex items-center gap-1.5">
                      <Palmtree className="w-4 h-4 text-teal-600" />
                      大假 (Annual Leave) 明細與每月1號累計
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('annual')}
                      className="text-[11px] font-bold text-teal-700 hover:underline cursor-pointer"
                    >
                      設定額度 →
                    </button>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">每年基本大假配額：</span>
                      <span className="font-bold">{formatLeaveDaysDisplay(balances.annualLeave.baseEntitlement)} 天/年</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">每月1號自動加入：</span>
                      <span className="font-bold text-teal-700">+{formatLeaveDaysDisplay(balances.annualLeave.monthlyAccrualRate)} 天/月 (大假總數÷12)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">去年結轉 + 手動調整：</span>
                      <span className="font-bold">+{formatLeaveDaysDisplay(balances.annualLeave.carriedOver + balances.annualLeave.manualAdjustment)} 天</span>
                    </div>
                    <div className="flex justify-between border-t border-teal-200/60 pt-1">
                      <span className="text-slate-500">截至 {targetMonth} 月 1 號累積應得：</span>
                      <span className="font-bold text-slate-800">{formatLeaveDaysDisplay(balances.annualLeave.accumulatedToDate)} 天 (年度總額 {formatLeaveDaysDisplay(balances.annualLeave.totalEntitled)} 天)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">全年度行事曆已放大假：</span>
                      <span className="font-bold text-rose-600">-{formatLeaveDaysDisplay(balances.annualLeave.usedThisYear)} 天</span>
                    </div>
                    <div className="flex justify-between border-t border-teal-200/60 pt-1 text-sm">
                      <span className="font-black text-slate-900">目前可用剩餘大假 (截至當月)：</span>
                      <span className="font-black text-teal-700">{formatLeaveDaysDisplay(balances.annualLeave.balanceAvailable)} 天</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>全年度總結餘 (至年尾)：</span>
                      <span className="font-bold text-slate-700">{formatLeaveDaysDisplay(balances.annualLeave.yearEndTotalAvailable)} 天</span>
                    </div>
                  </div>
                </div>

                {/* Regular Off Box */}
                <div className="bg-blue-50/40 border border-blue-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                      <Coffee className="w-4 h-4 text-blue-600" />
                      例假 (Regular Off) 年度累積與核銷
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('regular')}
                      className="text-[11px] font-bold text-blue-700 hover:underline cursor-pointer"
                    >
                      設定配額 →
                    </button>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">每月配額 / 年度總額：</span>
                      <span className="font-bold">{balances.regularOff.monthlyQuota} 天/月 (全年 {balances.regularOff.annualQuota} 天)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">截至 {targetMonth} 月累積應得：</span>
                      <span className="font-bold text-slate-800">{balances.regularOff.accumulatedToDate} 天</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">全年度已放 (當月已放)：</span>
                      <span className="font-bold text-blue-700">-{balances.regularOff.usedThisYear} 天 (本月 {balances.regularOff.usedThisMonth} 天)</span>
                    </div>
                    <div className="flex justify-between border-t border-blue-200/60 pt-1">
                      <span className="text-slate-500">截至目前累積未放 (存至12/31)：</span>
                      <span className="font-extrabold text-blue-800">{balances.regularOff.accumulatedRemaining} 天</span>
                    </div>
                    <div className="flex justify-between border-t border-blue-200/60 pt-1 text-sm">
                      <span className="font-black text-slate-900">年尾 (12/31) 未放例假結餘：</span>
                      <span className="font-black text-indigo-700">{balances.regularOff.yearEndRemaining} 天</span>
                    </div>
                    <div className="text-[10.5px] text-blue-600/90 bg-blue-100/50 p-1.5 rounded-md mt-1">
                      ℹ️ 未放完例假可持續儲存滾存至 12/31 前放完；年尾若仍有未放例假將直接顯示數值。
                    </div>
                  </div>
                </div>

                {/* Lieu Leave Box */}
                <div className="bg-amber-50/40 border border-amber-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-600" />
                      補假 (Lieu Leave - 3個月期限)
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('lieu')}
                      className="text-[11px] font-bold text-amber-700 hover:underline cursor-pointer"
                    >
                      查看台帳 →
                    </button>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">公眾假期加班累計：</span>
                      <span className="font-bold">+{balances.lieuLeave.totalDaysEarned} 天</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">已扣抵/已放補假：</span>
                      <span className="font-bold text-rose-600">-{balances.lieuLeave.totalDaysUsed} 天</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">逾期失效補假：</span>
                      <span className="font-bold text-slate-400">{balances.lieuLeave.totalDaysExpired} 天</span>
                    </div>
                    <div className="flex justify-between border-t border-amber-200/60 pt-1 text-sm">
                      <span className="font-black text-slate-900">目前有效可用補假：</span>
                      <span className="font-black text-amber-800">{balances.lieuLeave.totalDaysActive} 天</span>
                    </div>
                  </div>
                </div>

                {/* Sick Leave Box */}
                <div className="bg-rose-50/40 border border-rose-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-rose-600" />
                      病假 (Sick Leave) 醫療證明
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('sick')}
                      className="text-[11px] font-bold text-rose-700 hover:underline cursor-pointer"
                    >
                      審查記錄 →
                    </button>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">年度已請病假總天數：</span>
                      <span className="font-bold">{balances.sickLeave.totalDaysThisYear} 天</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">📄 附醫療證明 (MC)：</span>
                      <span className="font-bold text-emerald-700">{balances.sickLeave.daysWithMedicalCert} 天</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">⚠️ 未附醫療證明：</span>
                      <span className="font-bold text-amber-700">{balances.sickLeave.daysWithoutMedicalCert} 天</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Leave History Timeline */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-teal-600" />
                  <span>{targetYear} 年 {targetMonth} 月休假記錄 ({balances.annualLeave.eventsThisYear.length + balances.regularOff.eventsThisMonth.length + balances.lieuLeave.eventsThisYear.length + balances.sickLeave.eventsThisYear.length} 筆)</span>
                </h5>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {[
                    ...balances.annualLeave.eventsThisYear.map(e => ({ ...e, _cat: '大假', _color: 'bg-teal-100 text-teal-900 border-teal-300' })),
                    ...balances.regularOff.eventsThisMonth.map(e => ({ ...e, _cat: '例假', _color: 'bg-blue-100 text-blue-900 border-blue-300' })),
                    ...balances.lieuLeave.eventsThisYear.map(e => ({ ...e, _cat: '補假', _color: 'bg-amber-100 text-amber-900 border-amber-300' })),
                    ...balances.sickLeave.eventsThisYear.map(e => ({ ...e, _cat: '病假', _color: 'bg-rose-100 text-rose-900 border-rose-300' }))
                  ].sort((a, b) => b.date.localeCompare(a.date)).map((evt, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${evt._color}`}>
                          {evt._cat}
                        </span>
                        <span className="font-mono font-bold text-slate-800">{evt.date}</span>
                        <span className="text-slate-600 font-medium">{evt.title}</span>
                        {evt._cat === '病假' && (
                          <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold ${evt.medicalCertificate ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {evt.medicalCertificate ? '📄 附醫療證明' : '⚠️ 無醫療證明'}
                          </span>
                        )}
                      </div>
                      <span className="font-extrabold text-slate-700">
                        {getLeaveDaysValue(evt)} 天
                      </span>
                    </div>
                  ))}
                  {balances.annualLeave.eventsThisYear.length === 0 && balances.regularOff.eventsThisMonth.length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-xs font-medium">
                      暫無休假記錄
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: ANNUAL LEAVE MANAGEMENT (大假 - 每月1號加入總數÷12，支援小數點) */}
          {activeSubTab === 'annual' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-6">
              <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-850 flex items-center gap-2">
                    <Palmtree className="w-4 h-4 text-teal-600" />
                    <span>大假 (Annual Leave) 額度設定與每月 1 號自動累計/扣減</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    系統自動將年度大假總數 ÷ 12 個月，並於每個月 1 號自動加入至大假數目（支援小數點），在員工於行事曆選取大假時自動即時扣減
                  </p>
                </div>
              </div>

              {/* Policy Banner */}
              <div className="bg-gradient-to-r from-teal-50 to-emerald-50/70 border border-teal-200 rounded-xl p-3.5 flex items-start gap-3">
                <div className="p-1.5 bg-teal-600 text-white rounded-lg shrink-0 mt-0.5 shadow-3xs">
                  <Info className="w-4 h-4" />
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-teal-950">
                      💡 大假每月 1 號自動累計與小數點機制
                    </span>
                    <span className="text-[10.5px] font-black bg-teal-100 text-teal-800 border border-teal-300 px-2 py-0.5 rounded-md">
                      每月 1 號自動加入
                    </span>
                  </div>
                  <p className="text-teal-900/90 leading-relaxed">
                    1. <strong>每月 1 號自動累計</strong>：系統將每年基本大假配額除以 12 個月（即 <code>大假總數 ÷ 12</code>），在每個月 1 號自動累計加入該月份的大假數目。<br />
                    2. <strong>精確支援小數點</strong>：大假配額與累計數目均完整支援小數點（例如每年 14 天則每月 1 號加入 1.17 天；每年 7 天則每月 1 號加入 0.58 天；每年 12 天則每月 1 號加入 1.0 天）。<br />
                    3. <strong>自動核銷與結餘</strong>：員工在行事曆上登記大假時，即時從目前已累積大假池中扣減，並可隨時查閱截至當月可用餘額與全年總結餘。
                  </p>
                </div>
              </div>

              {/* Quota form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    所屬部門分類 (Department)：
                  </label>
                  <select
                    value={currentProfile.department || selectedUserObj.department || 'admin'}
                    onChange={(e) => {
                      const targetDept = e.target.value;
                      handleSaveProfile({
                        ...currentProfile,
                        department: targetDept
                      }, `已將部門更新為「${DEPARTMENT_OPTIONS.find(d => d.id === targetDept)?.label || targetDept}」`);
                    }}
                    className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:outline-teal-600"
                  >
                    {DEPARTMENT_OPTIONS.map(d => (
                      <option key={d.id} value={d.id}>{d.label}</option>
                    ))}
                  </select>
                  <span className="text-[10.5px] text-slate-400 mt-1 block">行政部 / 銷售部 / 市場部 / 設計部</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      每年基本大假數量 (天/年)：
                    </label>
                    <span className="text-[11px] font-bold text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded-md">
                      每月加入：{formatLeaveDaysDisplay(balances.annualLeave.monthlyAccrualRate)} 天/月
                    </span>
                  </div>
                  <input 
                    type="number"
                    min="0"
                    max="60"
                    step="0.01"
                    value={currentProfile.annualLeaveEntitlement}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      handleSaveProfile({
                        ...currentProfile,
                        annualLeaveEntitlement: val
                      }, '已更新每年大假配額');
                    }}
                    className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:outline-teal-600"
                  />
                  <span className="text-[10.5px] text-slate-400 mt-1 block">支援小數點（大假總數÷12在每個月1號加入）</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    去年結轉日數 (Carried Over)：
                  </label>
                  <input 
                    type="number"
                    min="0"
                    max="30"
                    step="0.01"
                    value={currentProfile.annualLeaveCarriedOver || 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      handleSaveProfile({
                        ...currentProfile,
                        annualLeaveCarriedOver: val
                      }, '已更新結轉大假');
                    }}
                    className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:outline-teal-600"
                  />
                  <span className="text-[10.5px] text-slate-400 mt-1 block">由上年度帶入之大假天數 (支援小數點)</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    手動增減調整 (+/- 天數)：
                  </label>
                  <input 
                    type="number"
                    min="-30"
                    max="30"
                    step="0.01"
                    value={currentProfile.annualLeaveManualAdjustment || 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      handleSaveProfile({
                        ...currentProfile,
                        annualLeaveManualAdjustment: val
                      }, '已更新手動調整天數');
                    }}
                    className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:outline-teal-600"
                  />
                  <span className="text-[10.5px] text-slate-400 mt-1 block">特殊獎勵、全勤額外加假或扣減 (支援小數點)</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    員工入職日期 (YYYY-MM-DD)：
                  </label>
                  <input 
                    type="date"
                    value={currentProfile.joinDate || ''}
                    onChange={(e) => {
                      handleSaveProfile({
                        ...currentProfile,
                        joinDate: e.target.value
                      }, '已更新入職日期');
                    }}
                    className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:outline-teal-600"
                  />
                  <span className="text-[10.5px] text-slate-400 mt-1 block">入職資料記錄與年資參考</span>
                </div>
              </div>

              {/* Dynamic Calculation preview metrics grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Monthly Accrual Info */}
                <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-3.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-2xs font-extrabold text-teal-700 uppercase tracking-wider mb-1">
                      <span>每月 1 號累計率</span>
                      <span>總數 ÷ 12</span>
                    </div>
                    <div className="text-xs text-slate-600 space-y-0.5">
                      <div className="flex justify-between">
                        <span>年度基礎大假：</span>
                        <span className="font-bold">{formatLeaveDaysDisplay(balances.annualLeave.baseEntitlement)} 天/年</span>
                      </div>
                      <div className="flex justify-between">
                        <span>每月加入率：</span>
                        <span className="font-bold text-teal-700">+{formatLeaveDaysDisplay(balances.annualLeave.monthlyAccrualRate)} 天/月</span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-teal-200/80 pt-2 mt-2 flex items-baseline justify-between">
                    <span className="text-xs font-bold text-slate-700">每月1號加入：</span>
                    <span className="text-2xl font-black text-teal-900">{formatLeaveDaysDisplay(balances.annualLeave.monthlyAccrualRate)} <span className="text-xs font-bold">天</span></span>
                  </div>
                </div>

                {/* 2. Current Month Accrued & Available */}
                <div className="bg-emerald-50/70 border border-emerald-300 rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden ring-1 ring-emerald-400/30">
                  <div className="absolute -right-2 -bottom-2 text-emerald-100/40 pointer-events-none">
                    <Palmtree className="w-16 h-16" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-2xs font-extrabold text-emerald-800 uppercase tracking-wider mb-1">
                      <span>截至 {targetMonth} 月 1 號可用</span>
                      <span className="bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded text-[10px] font-bold">即時可用</span>
                    </div>
                    <div className="text-xs text-slate-600 space-y-0.5">
                      <div className="flex justify-between">
                        <span>截至當月累計應得：</span>
                        <span className="font-bold">{formatLeaveDaysDisplay(balances.annualLeave.accumulatedToDate)} 天</span>
                      </div>
                      <div className="flex justify-between">
                        <span>全年度已放大假：</span>
                        <span className="font-bold text-rose-600">-{formatLeaveDaysDisplay(balances.annualLeave.usedThisYear)} 天</span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-emerald-200/80 pt-2 mt-2 flex items-baseline justify-between">
                    <div>
                      <span className="text-xs font-black text-emerald-950 block">目前可用大假餘額：</span>
                      <span className="text-[10px] text-emerald-700">截至 {targetMonth} 月 1 號累計可用</span>
                    </div>
                    <span className="text-2xl font-black text-emerald-900">{formatLeaveDaysDisplay(balances.annualLeave.balanceAvailable)} <span className="text-xs font-bold">天</span></span>
                  </div>
                </div>

                {/* 3. Full Year Total Entitled & Year-End Available */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-2xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      <span>全年度大假總結餘</span>
                      <span className="bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded text-[10px] font-bold">全年視角</span>
                    </div>
                    <div className="text-xs text-slate-600 space-y-0.5">
                      <div className="flex justify-between">
                        <span>年度總配額 (含結轉)：</span>
                        <span className="font-bold">{formatLeaveDaysDisplay(balances.annualLeave.totalEntitled)} 天</span>
                      </div>
                      <div className="flex justify-between">
                        <span>全年度已放大假：</span>
                        <span className="font-bold text-rose-600">-{formatLeaveDaysDisplay(balances.annualLeave.usedThisYear)} 天</span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-slate-200/80 pt-2 mt-2 flex items-baseline justify-between">
                    <div>
                      <span className="text-xs font-black text-slate-900 block">全年總結算剩餘：</span>
                      <span className="text-[10px] text-slate-500">若放完全年額度後之結餘</span>
                    </div>
                    <span className="text-2xl font-black text-slate-800">{formatLeaveDaysDisplay(balances.annualLeave.yearEndTotalAvailable)} <span className="text-xs font-bold">天</span></span>
                  </div>
                </div>
              </div>

              {/* List of Annual Leave events in this year */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>{targetYear} 全年度已登記大假記錄 ({balances.annualLeave.eventsThisYear.length} 筆)：</span>
                  <span className="text-teal-700 font-extrabold">合計已放 {formatLeaveDaysDisplay(balances.annualLeave.usedThisYear)} 天</span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {balances.annualLeave.eventsThisYear.map((evt, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-teal-50/40 rounded-xl border border-teal-200/70 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-teal-100 text-teal-900 border border-teal-300 shrink-0">
                          大假
                        </span>
                        <span className="font-mono font-bold text-slate-800 shrink-0">{evt.date}</span>
                        <span className="text-slate-600 font-medium truncate">{evt.title}</span>
                      </div>
                      <span className="font-extrabold text-teal-800 shrink-0 ml-2">
                        {formatLeaveDaysDisplay(getLeaveDaysValue(evt))} 天
                      </span>
                    </div>
                  ))}
                  {balances.annualLeave.eventsThisYear.length === 0 && (
                    <div className="text-center py-5 text-slate-400 text-xs font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      {targetYear} 年度尚無登記大假記錄
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: REGULAR OFF MANAGEMENT (例假 - 可儲存至年尾12/31放完) */}
          {activeSubTab === 'regular' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h4 className="text-sm font-black text-slate-850 flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-blue-600" />
                  <span>例假 (Regular Off) 每月配額、年度儲存滾存與核銷管理</span>
                </h4>
                <p className="text-xs text-slate-500">
                  全體人員均會自行在行事曆上登記／排定各自的例假日期。未放完的例假可跨月儲存滾存，直至當年 12 月 31 日前放完；年尾若仍有未放例假，系統將即時統計並呈現年尾結算數值。
                </p>
              </div>

              {/* Policy & Auto-Banking Banner */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3">
                <div className="p-1.5 bg-blue-600 text-white rounded-lg shrink-0 mt-0.5 shadow-3xs">
                  <Info className="w-4 h-4" />
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-blue-950">
                      💡 例假儲存滾存與年尾 12 月 31 日結算機制
                    </span>
                    <span className="text-[10.5px] font-black bg-blue-100 text-blue-800 border border-blue-300 px-2 py-0.5 rounded-md">
                      有效期至 12/31
                    </span>
                  </div>
                  <p className="text-blue-900/90 leading-relaxed">
                    1. <strong>無需設定固定星期例假</strong>：同仁皆自行在行事曆或班表中自選排定個人例假日期。<br />
                    2. <strong>例假自動儲存滾存</strong>：每月未放完的例假天數會自動累積儲存至年度例假池，同仁可於<strong>當年 12 月 31 日前</strong>隨時安排休假放完。<br />
                    3. <strong>年尾未放例假結算</strong>：若至 12 月 31 日年尾仍有未放完的例假，系統將持續保留並清楚顯示「年尾未放例假結算值」以供審查備查。
                  </p>
                </div>
              </div>

              {/* Monthly Quota Settings Box */}
              <div className="grid grid-cols-1 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800">
                      每月例假天數配額 (天/月)：
                    </label>
                    <span className="text-[11px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
                      目前配額：{currentProfile.monthlyRegularOffQuota || 4} 天 / 月 (全年總計 {balances.regularOff.annualQuota} 天)
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <input 
                      type="number"
                      min="1"
                      max="20"
                      step="0.5"
                      value={currentProfile.monthlyRegularOffQuota}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 4;
                        handleSaveProfile({
                          ...currentProfile,
                          monthlyRegularOffQuota: val
                        }, '已更新每月例假配額');
                      }}
                      className="w-full sm:w-48 h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:outline-blue-600 shadow-3xs"
                    />

                    {/* Quick Preset Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-slate-400 font-bold">快捷設定：</span>
                      {[
                        { days: 4, label: '4 天 (單休)' },
                        { days: 5, label: '5 天' },
                        { days: 6, label: '6 天' },
                        { days: 8, label: '8 天 (雙休)' },
                        { days: 10, label: '10 天' }
                      ].map(preset => {
                        const isActive = currentProfile.monthlyRegularOffQuota === preset.days;
                        return (
                          <button
                            key={preset.days}
                            type="button"
                            onClick={() => {
                              handleSaveProfile({
                                ...currentProfile,
                                monthlyRegularOffQuota: preset.days
                              }, `已設定每月例假為 ${preset.days} 天`);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              isActive
                                ? 'bg-blue-600 text-white border-blue-600 shadow-3xs'
                                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <span className="text-[10.5px] text-slate-400 mt-2 block">
                    設定每位成員每月應享例假日數，系統將自動計算整年度累積應得與滾存池。
                  </span>
                </div>
              </div>

              {/* 3 Metric Cards: Monthly, Banked to 12/31, and Year-End Settlement */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Monthly Card */}
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-2xs font-extrabold text-blue-700 uppercase tracking-wider mb-1">
                      <span>當月單月核銷</span>
                      <span>{targetYear} 年 {targetMonth} 月</span>
                    </div>
                    <div className="text-xs text-slate-600 space-y-0.5">
                      <div className="flex justify-between">
                        <span>本月配額：</span>
                        <span className="font-bold">{balances.regularOff.monthlyQuota} 天</span>
                      </div>
                      <div className="flex justify-between">
                        <span>本月已放：</span>
                        <span className="font-bold text-blue-700">-{balances.regularOff.usedThisMonth} 天</span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-blue-200/80 pt-2 mt-2 flex items-baseline justify-between">
                    <span className="text-xs font-bold text-slate-700">本月單月結餘：</span>
                    <span className="text-2xl font-black text-blue-900">{balances.regularOff.remainingThisMonth} <span className="text-xs font-bold">天</span></span>
                  </div>
                </div>

                {/* 2. Banked / Accumulated to date Card */}
                <div className="bg-emerald-50/70 border border-emerald-300 rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden ring-1 ring-emerald-400/30">
                  <div className="absolute -right-2 -bottom-2 text-emerald-100/40 pointer-events-none">
                    <Coffee className="w-16 h-16" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-2xs font-extrabold text-emerald-800 uppercase tracking-wider mb-1">
                      <span>年度累積儲存池</span>
                      <span className="bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded text-[10px] font-bold">12/31前有效</span>
                    </div>
                    <div className="text-xs text-slate-600 space-y-0.5">
                      <div className="flex justify-between">
                        <span>截至 {targetMonth} 月累計應得：</span>
                        <span className="font-bold">{balances.regularOff.accumulatedToDate} 天</span>
                      </div>
                      <div className="flex justify-between">
                        <span>全年度累計已放：</span>
                        <span className="font-bold text-emerald-800">-{balances.regularOff.usedThisYear} 天</span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-emerald-200/80 pt-2 mt-2 flex items-baseline justify-between">
                    <div>
                      <span className="text-xs font-black text-emerald-950 block">累積儲存未放餘額：</span>
                      <span className="text-[10px] text-emerald-700">可跨月於12/31前放完</span>
                    </div>
                    <span className="text-2xl font-black text-emerald-900">{balances.regularOff.accumulatedRemaining} <span className="text-xs font-bold">天</span></span>
                  </div>
                </div>

                {/* 3. Year-End 12/31 Settlement Card */}
                <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-2xs font-extrabold text-indigo-700 uppercase tracking-wider mb-1">
                      <span>年尾 12/31 總例假結算</span>
                      <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded text-[10px] font-bold">全年結餘</span>
                    </div>
                    <div className="text-xs text-slate-600 space-y-0.5">
                      <div className="flex justify-between">
                        <span>年度總配額 (12個月)：</span>
                        <span className="font-bold">{balances.regularOff.annualQuota} 天</span>
                      </div>
                      <div className="flex justify-between">
                        <span>全年度累計已放：</span>
                        <span className="font-bold text-indigo-700">-{balances.regularOff.usedThisYear} 天</span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-indigo-200/80 pt-2 mt-2 flex items-baseline justify-between">
                    <div>
                      <span className="text-xs font-black text-indigo-950 block">年尾未放例假結餘：</span>
                      <span className="text-[10px] text-indigo-600">若年尾有未放顯示此數值</span>
                    </div>
                    <span className="text-2xl font-black text-indigo-900">{balances.regularOff.yearEndRemaining} <span className="text-xs font-bold">天</span></span>
                  </div>
                </div>
              </div>

              {/* List of regular off events (with filter toggle between month / year) */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-slate-700">
                  <div className="flex items-center gap-2">
                    <span>已登記例假記錄：</span>
                    <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs">
                      <button
                        type="button"
                        onClick={() => setRegularScope('month')}
                        className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                          regularScope === 'month'
                            ? 'bg-white text-blue-700 shadow-3xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {targetMonth} 月份 ({balances.regularOff.eventsThisMonth.length} 筆)
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegularScope('year')}
                        className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                          regularScope === 'year'
                            ? 'bg-white text-indigo-700 shadow-3xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {targetYear} 全年度 ({balances.regularOff.eventsThisYear.length} 筆)
                      </button>
                    </div>
                  </div>
                  <span className="text-blue-700 font-extrabold">
                    {regularScope === 'month' ? `${targetMonth} 月` : `${targetYear} 全年`} 合計已放 {regularScope === 'month' ? balances.regularOff.usedThisMonth : balances.regularOff.usedThisYear} 天
                  </span>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {(regularScope === 'month' ? balances.regularOff.eventsThisMonth : balances.regularOff.eventsThisYear).map((evt, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-blue-50/40 rounded-xl border border-blue-200/70 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-blue-100 text-blue-900 border border-blue-300 shrink-0">
                          例假
                        </span>
                        <span className="font-mono font-bold text-slate-800 shrink-0">{evt.date}</span>
                        <span className="text-slate-600 font-medium truncate">{evt.title}</span>
                      </div>
                      <span className="font-extrabold text-blue-800 shrink-0 ml-2">
                        {getLeaveDaysValue(evt)} 天
                      </span>
                    </div>
                  ))}
                  {(regularScope === 'month' ? balances.regularOff.eventsThisMonth : balances.regularOff.eventsThisYear).length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-xs font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      {regularScope === 'month' ? `${targetMonth} 月份` : `${targetYear} 全年度`} 尚無登記例假記錄（同仁可直接在行事曆上自選日期登記）
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 4: LIEU LEAVE MANAGEMENT (補假 - 3 MONTHS EXPIRY) */}
          {activeSubTab === 'lieu' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-6">
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-black text-slate-850 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>補假 (Lieu Leave) 台帳管理（公眾假期出勤自動計發・限 3 個月內放完）</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    當員工在法定假日出勤加班即累計補假，每筆補假設有 3 個月到期期限，請假時依先進先出自動扣減
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddLieuForm(!showAddLieuForm)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-3xs cursor-pointer transition-all self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddLieuForm ? '收合表單' : '手動登記公眾假期出勤補假'}</span>
                </button>
              </div>

              {/* Add form */}
              {showAddLieuForm && (
                <form onSubmit={handleAddLieuGrant} className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      登記公眾假期出勤加班
                    </span>
                    <span className="text-[10.5px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                      放假限期自動設為出勤日 + 3 個月
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">出勤日期：</label>
                      <input 
                        type="date"
                        value={newLieuWorkDate}
                        onChange={(e) => {
                          const dt = e.target.value;
                          setNewLieuWorkDate(dt);
                          const holName = getPublicHolidayName(dt);
                          if (holName) setNewLieuHolidayName(holName);
                        }}
                        required
                        className="w-full h-8 px-2 text-xs bg-white border border-amber-300 rounded-lg font-bold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">公眾/法定假期名稱：</label>
                      <input 
                        type="text"
                        placeholder="如：國慶日、中秋節翌日..."
                        value={newLieuHolidayName}
                        onChange={(e) => setNewLieuHolidayName(e.target.value)}
                        required
                        className="w-full h-8 px-2 text-xs bg-white border border-amber-300 rounded-lg font-bold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">獲得補假日數：</label>
                      <select
                        value={newLieuDays}
                        onChange={(e) => setNewLieuDays(parseFloat(e.target.value))}
                        className="w-full h-8 px-2 text-xs bg-white border border-amber-300 rounded-lg font-bold text-slate-800"
                      >
                        <option value={1.0}>1.0 天 (全天出勤)</option>
                        <option value={0.5}>0.5 天 (半天出勤)</option>
                        <option value={1.5}>1.5 天</option>
                        <option value={2.0}>2.0 天 (雙倍津貼)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">出勤備註 / 地點：</label>
                    <input 
                      type="text"
                      placeholder="如：灣仔展銷廳駐場、緊急維修工程..."
                      value={newLieuNotes}
                      onChange={(e) => setNewLieuNotes(e.target.value)}
                      className="w-full h-8 px-2 text-xs bg-white border border-amber-300 rounded-lg text-slate-800"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddLieuForm(false)}
                      className="px-3 py-1 text-xs font-bold text-slate-500 hover:text-slate-700"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-3xs"
                    >
                      確認加入補假台帳
                    </button>
                  </div>
                </form>
              )}

              {/* Lieu grants table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800">
                    補假發放與 3 個月到期監控清單 ({balances.lieuLeave.grants.length} 筆)
                  </span>
                  <div className="flex items-center gap-2 text-[10px] font-bold">
                    <span className="flex items-center gap-1 text-emerald-700">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      有效可用: {balances.lieuLeave.totalDaysActive} 天
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                      已全數放完: {balances.lieuLeave.usedGrants.length} 筆
                    </span>
                    <span className="flex items-center gap-1 text-rose-500">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      逾期作廢: {balances.lieuLeave.totalDaysExpired} 天
                    </span>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-3xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                      <tr>
                        <th className="p-2.5">出勤日期</th>
                        <th className="p-2.5">法定/公眾假期名稱</th>
                        <th className="p-2.5">獲得日數</th>
                        <th className="p-2.5">3 個月放假限期</th>
                        <th className="p-2.5">已放 / 剩餘天數</th>
                        <th className="p-2.5">狀態</th>
                        <th className="p-2.5 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {balances.lieuLeave.grants.map((grant) => {
                        const isExpired = grant.status === 'expired';
                        const isUsed = grant.status === 'used';
                        const isAuto = grant.id.startsWith('auto-ph-');
                        return (
                          <tr key={grant.id} className={`hover:bg-slate-50/70 transition-colors ${
                            isExpired ? 'bg-rose-50/20 opacity-70' : isUsed ? 'bg-slate-50/30' : ''
                          }`}>
                            <td className="p-2.5 font-mono font-bold text-slate-800">
                              <div>{grant.workDate}</div>
                              {isAuto && (
                                <span className="inline-block text-[9px] bg-teal-100 text-teal-800 border border-teal-200 px-1 rounded font-bold mt-0.5">
                                  月尾自動結算
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 font-semibold text-slate-700">
                              <div>{grant.holidayName}</div>
                              {grant.notes && (
                                <div className="text-[10px] text-slate-400 font-normal mt-0.5 line-clamp-1" title={grant.notes}>
                                  {grant.notes}
                                </div>
                              )}
                            </td>
                            <td className="p-2.5 font-bold text-slate-900">+{grant.daysEarned} 天</td>
                            <td className="p-2.5 font-mono">
                              <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                                isExpired 
                                  ? 'bg-rose-100 text-rose-800 line-through' 
                                  : 'bg-amber-100 text-amber-900'
                              }`}>
                                {grant.expiryDate}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <span className="text-slate-500">已放 {grant.daysUsed} / </span>
                              <span className="font-extrabold text-amber-700">餘 {grant.daysRemaining} 天</span>
                            </td>
                            <td className="p-2.5">
                              {grant.status === 'active' && (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  🟢 有效可用
                                </span>
                              )}
                              {grant.status === 'used' && (
                                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  ⚪ 已放完
                                </span>
                              )}
                              {grant.status === 'expired' && (
                                <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  🔴 已逾期 (3個月)
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-right">
                              {!isAuto ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLieuGrant(grant.id)}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                                  title="刪除此筆手動記錄"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">系統自動</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {balances.lieuLeave.grants.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">
                            暫無公眾假期加班補假記錄，點擊上方按鈕可手動新增或於行事曆排班時自動累計
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 5: SICK LEAVE & MEDICAL CERTIFICATES (病假) */}
          {activeSubTab === 'sick' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h4 className="text-sm font-black text-slate-850 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-rose-600" />
                  <span>病假 (Sick Leave) 與醫療證明 (MC) 審核管理</span>
                </h4>
                <p className="text-xs text-slate-500">
                  記錄員工病假次數與日數，支援「醫療證明 (Medical Certificate)」勾選核銷狀態
                </p>
              </div>

              {/* Sick stats cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">本年度病假總天數</span>
                  <span className="text-2xl font-black text-slate-800 mt-1 block">{balances.sickLeave.totalDaysThisYear} 天</span>
                </div>
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-700 block uppercase">📄 附有醫療證明 (MC)</span>
                  <span className="text-2xl font-black text-emerald-800 mt-1 block">{balances.sickLeave.daysWithMedicalCert} 天</span>
                </div>
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                  <span className="text-[10px] font-bold text-amber-700 block uppercase">⚠️ 缺醫療證明</span>
                  <span className="text-2xl font-black text-amber-800 mt-1 block">{balances.sickLeave.daysWithoutMedicalCert} 天</span>
                </div>
              </div>

              {/* Sick leave list */}
              <div className="space-y-3">
                <span className="text-xs font-black text-slate-800 block">
                  {targetYear} 年度病假明細與醫療證明勾選 ({balances.sickLeave.eventsThisYear.length} 筆)
                </span>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-3xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                      <tr>
                        <th className="p-2.5">請假日期</th>
                        <th className="p-2.5">時段 / 請假名稱</th>
                        <th className="p-2.5">日數</th>
                        <th className="p-2.5">醫療證明 (Medical Certificate)</th>
                        <th className="p-2.5">備註說明</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {balances.sickLeave.eventsThisYear.map((evt) => (
                        <tr key={evt.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-2.5 font-mono font-bold text-slate-800">{evt.date}</td>
                          <td className="p-2.5 font-semibold text-slate-700">{evt.title}</td>
                          <td className="p-2.5 font-extrabold text-slate-900">{getLeaveDaysValue(evt)} 天</td>
                          <td className="p-2.5">
                            <button
                              type="button"
                              onClick={() => handleToggleEventMC(evt)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                                evt.medicalCertificate
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-3xs'
                                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              {evt.medicalCertificate ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                              <span>{evt.medicalCertificate ? '已附醫生紙/證明' : '點擊標記已附證明'}</span>
                            </button>
                          </td>
                          <td className="p-2.5 text-slate-500">{evt.remarks || '無備註'}</td>
                        </tr>
                      ))}
                      {balances.sickLeave.eventsThisYear.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400">
                            {targetYear} 年度暫無病假記錄
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 6: COMPANY-WIDE DEFAULTS */}
          {activeSubTab === 'company' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h4 className="text-sm font-black text-slate-850 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-teal-600" />
                  <span>全公司通用假期規則與參數設定</span>
                </h4>
                <p className="text-xs text-slate-500">
                  設定新進員工之預設大假天數、例假制度與公眾假期出勤自動計發補假連動邏輯
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">新員工預設每年大假數量：</label>
                  <input 
                    type="number"
                    min="7"
                    max="30"
                    value={holidayData.companySettings?.defaultAnnualLeave || 7}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 7;
                      handleSaveCompanySettings({
                        ...(holidayData.companySettings || DEFAULT_HOLIDAY_COMPANY_SETTINGS),
                        defaultAnnualLeave: val
                      });
                    }}
                    className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-800"
                  />
                  <span className="text-[10.5px] text-slate-400 block">建立新帳號時預設套用之年度年假</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">新員工預設每月例假數量：</label>
                  <input 
                    type="number"
                    min="1"
                    max="10"
                    value={holidayData.companySettings?.defaultMonthlyOff || 4}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 4;
                      handleSaveCompanySettings({
                        ...(holidayData.companySettings || DEFAULT_HOLIDAY_COMPANY_SETTINGS),
                        defaultMonthlyOff: val
                      });
                    }}
                    className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-800"
                  />
                  <span className="text-[10.5px] text-slate-400 block">預設月休天數 (如 4 天單休制)</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">公眾假期出勤自動計發 3 個月期限補假：</span>
                      <span className="text-[11px] text-slate-500 block">在法定公眾假期（如國慶、元旦、農曆新年）排班上班時，自動生成補假記錄供後續請假扣抵</span>
                    </div>
                    <input 
                      type="checkbox"
                      checked={holidayData.companySettings?.autoGrantLieuOnPublicHolidays !== false}
                      onChange={(e) => {
                        handleSaveCompanySettings({
                          ...(holidayData.companySettings || DEFAULT_HOLIDAY_COMPANY_SETTINGS),
                          autoGrantLieuOnPublicHolidays: e.target.checked
                        });
                      }}
                      className="w-5 h-5 accent-teal-600 cursor-pointer rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Department Distribution Overview */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <span>🏢 各部門假期配額與人數分佈 ({targetYear} 年度)</span>
                  </h5>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {DEPARTMENT_OPTIONS.map((dept) => {
                    const deptMembers = allUsersList.filter(u => (u.department || 'admin') === dept.id);
                    const totalAvailableAL = deptMembers.reduce((sum, u) => {
                      const prof = holidayData.profiles?.[u.username] || DEFAULT_EMPLOYEE_PROFILE(u.username, u.displayName);
                      const bal = calculateEmployeeLeaveBalances(prof, u.username, u.displayName, calendarEvents, targetYear, targetMonth);
                      return sum + bal.annualLeave.balanceAvailable;
                    }, 0);
                    const totalActiveLieu = deptMembers.reduce((sum, u) => {
                      const prof = holidayData.profiles?.[u.username] || DEFAULT_EMPLOYEE_PROFILE(u.username, u.displayName);
                      const bal = calculateEmployeeLeaveBalances(prof, u.username, u.displayName, calendarEvents, targetYear, targetMonth);
                      return sum + bal.lieuLeave.totalDaysActive;
                    }, 0);

                    return (
                      <div key={dept.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-black px-2 py-0.5 rounded border ${dept.badge}`}>
                            {dept.label}
                          </span>
                          <span className="text-xs font-bold text-slate-500">
                            {deptMembers.length} 人
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 space-y-0.5 pt-1">
                          <div className="flex justify-between">
                            <span className="text-slate-400">大假可用總額:</span>
                            <span className="font-bold text-teal-800">{totalAvailableAL} 天</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">有效補假總額:</span>
                            <span className="font-bold text-amber-800">{totalActiveLieu} 天</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Roster Export Modal */}
      <MonthlyRosterExportModal
        isOpen={showRosterExportModal}
        onClose={() => setShowRosterExportModal(false)}
        accountsList={accountsList}
        settings={settings}
        calendarEvents={calendarEvents}
        initialYear={targetYear}
        initialMonth={targetMonth}
      />
    </div>
  );
};

export default HolidayManagementPage;
