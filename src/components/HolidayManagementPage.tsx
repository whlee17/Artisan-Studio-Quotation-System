import React, { useState, useMemo } from 'react';
import { 
  Calendar, Palmtree, Clock, Coffee, ShieldAlert, Plus, 
  Trash2, AlertTriangle, CheckCircle2, ChevronRight, 
  Sparkles, SlidersHorizontal, User, 
  Search, Info, FileText, CalendarCheck2, History,
  ShieldCheck, Hourglass, CheckSquare, Square,
  Check, Save, RefreshCw
} from 'lucide-react';
import { 
  CalendarEvent, 
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
  getLeaveDaysValue, 
  getPublicHolidayName, 
  getTodayDateString, 
  HK_PUBLIC_HOLIDAYS_MAP, 
  isLieuGrantExpired 
} from '../lib/holidayManagement';

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
    const list: { username: string; displayName: string; role: string }[] = [];
    const seen = new Set<string>();

    // 1. From accountsList
    if (Array.isArray(accountsList)) {
      accountsList.forEach(acc => {
        if (acc && acc.username && !seen.has(acc.username.toLowerCase())) {
          seen.add(acc.username.toLowerCase());
          list.push({
            username: acc.username.toLowerCase(),
            displayName: acc.displayName || acc.username,
            role: acc.role || 'staff'
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
          role: 'admin'
        });
      }
    });

    return list;
  }, [accountsList]);

  const [selectedUsername, setSelectedUsername] = useState<string>(() => {
    if (currentUser?.username) return currentUser.username.toLowerCase();
    return allUsersList[0]?.username || 'whlee';
  });

  const [searchUserQuery, setSearchUserQuery] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'annual' | 'regular' | 'lieu' | 'sick' | 'company'>('overview');
  const [targetYear, setTargetYear] = useState<number>(() => new Date().getFullYear());
  const [targetMonth, setTargetMonth] = useState<number>(() => new Date().getMonth() + 1);

  // Manual Grant Lieu modal / inline form state
  const [showAddLieuForm, setShowAddLieuForm] = useState<boolean>(false);
  const [newLieuWorkDate, setNewLieuWorkDate] = useState<string>(() => getTodayDateString());
  const [newLieuHolidayName, setNewLieuHolidayName] = useState<string>('國慶日');
  const [newLieuDays, setNewLieuDays] = useState<number>(1.0);
  const [newLieuNotes, setNewLieuNotes] = useState<string>('');

  // Selected user info
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
      const updatedEvt: CalendarEvent = {
        ...event,
        medicalCertificate: !event.medicalCertificate,
        updatedAt: Date.now()
      };
      await onSaveCalendarEvent(updatedEvt);
      if (showToast) {
        showToast(
          updatedEvt.medicalCertificate 
            ? `已將 ${event.date} 之病假標記為「已提交醫療證明 📄」` 
            : `已取消 ${event.date} 之醫療證明標記`,
          'success'
        );
      }
    } catch (err: any) {
      console.error('Failed to update event medical certificate:', err);
      if (showToast) showToast('更新病假證明失敗', 'error');
    }
  };

  // Filtered users for left picker
  const filteredUsers = useMemo(() => {
    if (!searchUserQuery.trim()) return allUsersList;
    const q = searchUserQuery.toLowerCase().trim();
    return allUsersList.filter(u => 
      u.username.toLowerCase().includes(q) || 
      u.displayName.toLowerCase().includes(q)
    );
  }, [allUsersList, searchUserQuery]);

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

          {/* Year & Month Selection */}
          <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-xl border border-white/10 backdrop-blur-xs shrink-0 self-start sm:self-auto">
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
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-850 truncate">{u.displayName}</span>
                        {u.role === 'admin' && (
                          <span className="text-[9px] bg-amber-100 text-amber-800 font-extrabold px-1 rounded">管</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block">@{u.username}</span>
                    </div>
                  </div>

                  {/* Micro balance chips */}
                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-extrabold text-teal-700">
                      大假餘額 {uBal.annualLeave.balanceAvailable} 天
                    </div>
                    {uBal.lieuLeave.totalDaysActive > 0 && (
                      <div className="text-[9.5px] font-bold text-amber-600">
                        補假 +{uBal.lieuLeave.totalDaysActive}
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
                  可放 {balances.annualLeave.balanceAvailable} 天
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900">{balances.annualLeave.balanceAvailable}</span>
                <span className="text-xs text-slate-400 font-bold">/ {balances.annualLeave.totalEntitled} 天年假</span>
              </div>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                已放 {balances.annualLeave.usedThisYear} 天 (累積 {balances.annualLeave.accumulatedToDate} 天)
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
              { id: 'overview', label: '📊 假期總覽與統計', icon: <CalendarCheck2 className="w-4 h-4" /> },
              { id: 'annual', label: '🌴 大假額度與累計', icon: <Palmtree className="w-4 h-4" /> },
              { id: 'regular', label: '🛋️ 例假基底設定', icon: <Coffee className="w-4 h-4" /> },
              { id: 'lieu', label: '⏱️ 補假台帳 (3個月限期)', icon: <Clock className="w-4 h-4" /> },
              { id: 'sick', label: '💊 病假與醫療證明', icon: <FileText className="w-4 h-4" /> },
              { id: 'company', label: '⚙️ 全公司通用規則', icon: <SlidersHorizontal className="w-4 h-4" /> }
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
                  <h4 className="text-sm font-black text-slate-850 flex items-center gap-2">
                    <span>【{selectedUserObj.displayName}】@{selectedUsername} 的 {targetYear} 年度假期綜合報表</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    即時連動行事曆已登記之請假記錄、公眾假期出勤自動計發補假與醫療證明審查狀態
                  </p>
                </div>

                <div className="flex items-center gap-2">
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
                      大假 (Annual Leave) 明細
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
                      <span className="text-slate-500">年度合約大假：</span>
                      <span className="font-bold">{balances.annualLeave.baseEntitlement} 天</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">去年結轉 + 手動調整：</span>
                      <span className="font-bold">+{balances.annualLeave.carriedOver + balances.annualLeave.manualAdjustment} 天</span>
                    </div>
                    <div className="flex justify-between border-t border-teal-200/60 pt-1">
                      <span className="text-slate-500">年度總可放：</span>
                      <span className="font-extrabold text-teal-900">{balances.annualLeave.totalEntitled} 天</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">行事曆已請大假：</span>
                      <span className="font-bold text-rose-600">-{balances.annualLeave.usedThisYear} 天</span>
                    </div>
                    <div className="flex justify-between border-t border-teal-200/60 pt-1 text-sm">
                      <span className="font-black text-slate-900">目前剩餘可用大假：</span>
                      <span className="font-black text-teal-700">{balances.annualLeave.balanceAvailable} 天</span>
                    </div>
                  </div>
                </div>

                {/* Regular Off Box */}
                <div className="bg-blue-50/40 border border-blue-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                      <Coffee className="w-4 h-4 text-blue-600" />
                      例假 (Regular Off) 本月進度
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('regular')}
                      className="text-[11px] font-bold text-blue-700 hover:underline cursor-pointer"
                    >
                      修改基底 →
                    </button>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">每月固定例假額度：</span>
                      <span className="font-bold">{balances.regularOff.monthlyQuota} 天/月</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{targetMonth} 月份已放例假：</span>
                      <span className="font-bold text-blue-700">{balances.regularOff.usedThisMonth} 天</span>
                    </div>
                    <div className="flex justify-between border-t border-blue-200/60 pt-1 text-sm">
                      <span className="font-black text-slate-900">本月未放完例假數量：</span>
                      <span className="font-black text-blue-800">{balances.regularOff.remainingThisMonth} 天</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>全年度累計已放例假：</span>
                      <span>{balances.regularOff.usedThisYear} 天</span>
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
                  <span>{targetYear} 年度行事曆休假記錄流水帳 ({balances.annualLeave.eventsThisYear.length + balances.regularOff.eventsThisMonth.length + balances.lieuLeave.eventsThisYear.length + balances.sickLeave.eventsThisYear.length} 筆)</span>
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

          {/* VIEW 2: ANNUAL LEAVE MANAGEMENT (大假) */}
          {activeSubTab === 'annual' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-6">
              <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-850 flex items-center gap-2">
                    <Palmtree className="w-4 h-4 text-teal-600" />
                    <span>大假 (Annual Leave) 額度設定與自動累計/扣減</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    系統支援自動累計已滿年資天數，並在員工於行事曆選取大假時自動計算可用餘額即時扣減
                  </p>
                </div>
              </div>

              {/* Quota form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    每年基本大假數量 (天/年)：
                  </label>
                  <input 
                    type="number"
                    min="0"
                    max="60"
                    step="0.5"
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
                  <span className="text-[10.5px] text-slate-400 mt-1 block">香港勞工法例標準為 7-14 天</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    去年結轉日數 (Carried Over)：
                  </label>
                  <input 
                    type="number"
                    min="0"
                    max="30"
                    step="0.5"
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
                  <span className="text-[10.5px] text-slate-400 mt-1 block">由上年度帶入之大假天數</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    手動增減調整 (+/- 天數)：
                  </label>
                  <input 
                    type="number"
                    min="-30"
                    max="30"
                    step="0.5"
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
                  <span className="text-[10.5px] text-slate-400 mt-1 block">特殊獎勵、全勤額外加假或扣減</span>
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
                  <span className="text-[10.5px] text-slate-400 mt-1 block">系統將依入職月份與年資動態累積</span>
                </div>
              </div>

              {/* Dynamic Calculation preview box */}
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-extrabold text-teal-900 block">
                    🌟 大假自動累計與可用天數即時試算 ({targetYear}年度)
                  </span>
                  <p className="text-xs text-teal-700 mt-0.5">
                    年度總額 ({balances.annualLeave.totalEntitled}) - 已在行事曆放假 ({balances.annualLeave.usedThisYear}) = 剩餘可用天數
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-2xs font-extrabold text-teal-800 uppercase tracking-wider block">目前可用大假</span>
                  <span className="text-3xl font-black text-teal-900">{balances.annualLeave.balanceAvailable} <span className="text-sm">天</span></span>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: REGULAR OFF MANAGEMENT (例假) */}
          {activeSubTab === 'regular' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h4 className="text-sm font-black text-slate-850 flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-blue-600" />
                  <span>例假 (Regular Off) 行事曆基底設定與衝突防範</span>
                </h4>
                <p className="text-xs text-slate-500">
                  例假屬於行事曆之基底設定（如預設週日/週六為例假），系統限制一般情況下的排班與請假衝突，並即時列出未放完例假數量
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    每月例假天數配額 (天/月)：
                  </label>
                  <input 
                    type="number"
                    min="1"
                    max="15"
                    step="1"
                    value={currentProfile.monthlyRegularOffQuota}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 4;
                      handleSaveProfile({
                        ...currentProfile,
                        monthlyRegularOffQuota: val
                      }, '已更新每月例假配額');
                    }}
                    className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:outline-blue-600"
                  />
                  <span className="text-[10.5px] text-slate-400 mt-1 block">通常為 4 天 (單休) 或 8 天 (雙休)</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    預設例假日 (基底防衝突)：
                  </label>
                  <div className="flex items-center gap-2 pt-1">
                    {[
                      { val: 0, label: '週日 (Sun)' },
                      { val: 6, label: '週六 (Sat)' },
                      { val: 1, label: '週一 (Mon)' }
                    ].map(d => {
                      const days = currentProfile.defaultRestDays || [0, 6];
                      const isChecked = days.includes(d.val);
                      return (
                        <button
                          key={d.val}
                          type="button"
                          onClick={() => {
                            const newDays = isChecked 
                              ? days.filter(x => x !== d.val) 
                              : [...days, d.val];
                            handleSaveProfile({
                              ...currentProfile,
                              defaultRestDays: newDays
                            }, '已更新預設例假星期');
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                            isChecked 
                              ? 'bg-blue-600 text-white border-blue-600 shadow-3xs' 
                              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {isChecked ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                          <span>{d.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[10.5px] text-slate-400 mt-1.5 block">在基底例假日排班時，系統將主動提示避免重複登記或排班衝突</span>
                </div>
              </div>

              {/* Month balance card */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-extrabold text-blue-900 block">
                    {targetYear} 年 {targetMonth} 月例假核銷狀況
                  </span>
                  <p className="text-xs text-blue-700 mt-0.5">
                    每月額度 ({balances.regularOff.monthlyQuota}) - 本月已放 ({balances.regularOff.usedThisMonth}) = 未放完例假數量
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-2xs font-extrabold text-blue-800 uppercase tracking-wider block">本月未放完例假</span>
                  <span className="text-3xl font-black text-blue-900">{balances.regularOff.remainingThisMonth} <span className="text-sm">天</span></span>
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
                        return (
                          <tr key={grant.id} className={`hover:bg-slate-50/70 transition-colors ${
                            isExpired ? 'bg-rose-50/20 opacity-70' : isUsed ? 'bg-slate-50/30' : ''
                          }`}>
                            <td className="p-2.5 font-mono font-bold text-slate-800">{grant.workDate}</td>
                            <td className="p-2.5 font-semibold text-slate-700">{grant.holidayName}</td>
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
                              <button
                                type="button"
                                onClick={() => handleDeleteLieuGrant(grant.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                                title="刪除此筆記錄"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HolidayManagementPage;
