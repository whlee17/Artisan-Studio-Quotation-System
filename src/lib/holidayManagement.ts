import { 
  CalendarEvent, 
  EmployeeHolidayProfile, 
  HolidayCompanySettings, 
  HolidayManagementData, 
  LeaveCategory, 
  LieuLeaveGrant,
  UserAccount 
} from '../types';

// ==========================================
// 1. HONG KONG PUBLIC & STATUTORY HOLIDAYS DICTIONARY
// ==========================================
export const HK_PUBLIC_HOLIDAYS_MAP: Record<string, string> = {
  // 2025
  '2025-01-01': '一月一日 (元旦)',
  '2025-01-29': '農曆年初一',
  '2025-01-30': '農曆年初二',
  '2025-01-31': '農曆年初三',
  '2025-04-04': '清明節',
  '2025-04-18': '耶穌受難節',
  '2025-04-19': '耶穌受難節翌日',
  '2025-04-21': '復活節星期一',
  '2025-05-01': '勞動節',
  '2025-05-05': '佛誕',
  '2025-05-31': '端午節',
  '2025-07-01': '香港特別行政區成立紀念日',
  '2025-10-01': '國慶日',
  '2025-10-07': '中秋節翌日',
  '2025-10-29': '重陽節',
  '2025-12-25': '聖誕節',
  '2025-12-26': '聖誕節後第一個周日',

  // 2026
  '2026-01-01': '一月一日 (元旦)',
  '2026-02-17': '農曆年初一',
  '2026-02-18': '農曆年初二',
  '2026-02-19': '農曆年初三',
  '2026-04-03': '耶穌受難節',
  '2026-04-04': '耶穌受難節翌日 / 清明節',
  '2026-04-05': '清明節翌日',
  '2026-04-06': '復活節星期一',
  '2026-04-07': '清明節補假',
  '2026-05-01': '勞動節',
  '2026-05-24': '佛誕',
  '2026-05-25': '佛誕翌日補假',
  '2026-06-19': '端午節',
  '2026-07-01': '香港特別行政區成立紀念日',
  '2026-09-25': '中秋節',
  '2026-09-26': '中秋節翌日',
  '2026-10-01': '國慶日',
  '2026-10-19': '重陽節',
  '2026-12-25': '聖誕節',
  '2026-12-26': '聖誕節後第一個周日',

  // 2027
  '2027-01-01': '一月一日 (元旦)',
  '2027-02-06': '農曆年廿九',
  '2027-02-07': '農曆年初一',
  '2027-02-08': '農曆年初二',
  '2027-02-09': '農曆年初三',
  '2027-03-26': '耶穌受難節',
  '2027-03-27': '耶穌受難節翌日',
  '2027-03-29': '復活節星期一',
  '2027-04-05': '清明節',
  '2027-05-13': '佛誕',
  '2027-06-09': '端午節',
  '2027-07-01': '香港特別行政區成立紀念日',
  '2027-09-16': '中秋節翌日',
  '2027-10-01': '國慶日',
  '2027-10-08': '重陽節',
  '2027-12-25': '聖誕節',
  '2027-12-27': '聖誕節後補假',
  '2027-12-28': '聖誕節後第二個周日補假',

  // 2028
  '2028-01-01': '一月一日 (元旦)',
  '2028-01-03': '元旦補假',
  '2028-01-26': '農曆年初一',
  '2028-01-27': '農曆年初二',
  '2028-01-28': '農曆年初三',
  '2028-04-04': '清明節',
  '2028-04-14': '耶穌受難節',
  '2028-04-15': '耶穌受難節翌日',
  '2028-04-17': '復活節星期一',
  '2028-05-01': '勞動節',
  '2028-05-02': '佛誕',
  '2028-05-28': '端午節',
  '2028-05-29': '端午節補假',
  '2028-07-01': '香港特別行政區成立紀念日',
  '2028-07-03': '特區成立紀念日補假',
  '2028-10-01': '國慶日',
  '2028-10-02': '國慶日補假',
  '2028-10-04': '中秋節翌日',
  '2028-10-26': '重陽節',
  '2028-12-25': '聖誕節',
  '2028-12-26': '聖誕節後第一個周日'
};

export const getPublicHolidayName = (dateStr: string): string | null => {
  if (!dateStr) return null;
  return HK_PUBLIC_HOLIDAYS_MAP[dateStr] || null;
};

export const isPublicOrStatutoryHoliday = (dateStr: string): boolean => {
  return !!getPublicHolidayName(dateStr);
};

// ==========================================
// 2. LIEU LEAVE EXPIRY CALCULATION (3 MONTHS)
// ==========================================
/**
 * Calculates the expiry date for compensatory leave: exactly 3 months from the work date.
 * E.g., worked on 2026-10-01 -> expires on 2027-01-01
 */
export const calculateLieuExpiryDate = (workDateStr: string): string => {
  if (!workDateStr) return '';
  const parts = workDateStr.split('-');
  if (parts.length !== 3) return workDateStr;
  
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10); // 1-12
  const d = parseInt(parts[2], 10);
  
  // Target month + 3
  const targetDate = new Date(y, m - 1 + 3, d);
  const resY = targetDate.getFullYear();
  const resM = String(targetDate.getMonth() + 1).padStart(2, '0');
  const resD = String(targetDate.getDate()).padStart(2, '0');
  return `${resY}-${resM}-${resD}`;
};

/**
 * Checks if a given expiry date has passed relative to today or a target reference date.
 */
export const isLieuGrantExpired = (expiryDateStr: string, refDateStr?: string): boolean => {
  if (!expiryDateStr) return false;
  const today = refDateStr || getTodayDateString();
  return expiryDateStr < today;
};

export const getTodayDateString = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Default Company-wide holiday configuration
export const DEFAULT_HOLIDAY_COMPANY_SETTINGS: HolidayCompanySettings = {
  defaultAnnualLeave: 7,
  defaultMonthlyOff: 4,
  lieuValidityMonths: 3,
  defaultRestDays: [0, 6], // Sunday=0, Saturday=6
  autoGrantLieuOnPublicHolidays: true
};

export const DEFAULT_EMPLOYEE_PROFILE = (username: string, displayName?: string): EmployeeHolidayProfile => ({
  username: username.toLowerCase().trim(),
  displayName: displayName || username,
  annualLeaveEntitlement: 7,
  annualLeaveAccumulated: 7,
  annualLeaveCarriedOver: 0,
  annualLeaveManualAdjustment: 0,
  monthlyRegularOffQuota: 4,
  defaultRestDays: [0, 6],
  annualSickLeaveQuota: 12,
  lieuGrants: [],
  notes: '',
  updatedAt: Date.now()
});

// Helper to determine leave category from calendar event
export const getEventLeaveCategory = (evt: CalendarEvent): LeaveCategory => {
  if (evt.leaveCategory) return evt.leaveCategory;
  const title = (evt.title || '').toLowerCase();
  const remarks = (evt.remarks || '').toLowerCase();
  
  if (title.includes('大假') || remarks.includes('大假') || title.includes('annual') || title.includes('al')) {
    return 'annual';
  }
  if (title.includes('補假') || remarks.includes('補假') || title.includes('lieu') || title.includes('ot') || title.includes('加班補休')) {
    return 'lieu';
  }
  if (title.includes('病假') || remarks.includes('病假') || title.includes('sick') || title.includes('sl') || title.includes('醫生紙')) {
    return 'sick';
  }
  if (title.includes('例假') || remarks.includes('例假') || title.includes('輪休') || title.includes('例休') || title.includes('off') || title.includes('rest')) {
    return 'regular';
  }
  // Default for holiday event types
  if (evt.type === 'holiday_full' || evt.type === 'holiday_am' || evt.type === 'holiday_pm') {
    return 'regular';
  }
  return 'other';
};

export const formatLeaveDaysDisplay = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '0';
  const rounded = Math.round(Number(val) * 100) / 100;
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(2).replace(/\.?0+$/, '');
};

export const getLeaveDaysValue = (evt: CalendarEvent): number => {
  if (evt.leaveDays !== undefined && evt.leaveDays !== null) return Number(evt.leaveDays) || 0;
  if (evt.type === 'holiday_am' || evt.type === 'holiday_pm') return 0.5;
  if (evt.type === 'holiday_full') return 1.0;
  const title = evt.title || '';
  if (title.includes('半天') || title.includes('上午') || title.includes('下午')) return 0.5;
  return 1.0;
};

// ==========================================
// 3. COMPREHENSIVE LEAVE BALANCE ENGINE
// ==========================================
export interface LeaveCalculationResult {
  username: string;
  displayName: string;
  year: number;
  month: number; // 1-12
  
  // 大假 (Annual Leave - 每月1號加入總數÷12，支援小數點)
  annualLeave: {
    baseEntitlement: number; // 每年基礎大假額度 (天/年)
    monthlyAccrualRate: number; // 每月1號自動加入額度 (baseEntitlement / 12)
    carriedOver: number; // 去年結轉
    manualAdjustment: number; // 手動調整額度
    totalEntitled: number; // 年度總應有大假 (baseEntitlement + carriedOver + manualAdjustment)
    accumulatedToDate: number; // 截至當月(每月1號計入)累積大假
    usedThisYear: number; // 本年度已放天數
    balanceAvailable: number; // 截至目前已累積可用剩餘天數 (累積 - 已放)
    yearEndTotalAvailable: number; // 全年度總額扣除已放剩餘天數 (totalEntitled - 已放)
    eventsThisYear: CalendarEvent[]; // 本年度大假行程
  };
  
  // 例假 (Regular Rest Days - 可儲存滾存至年尾12/31)
  regularOff: {
    monthlyQuota: number; // 每月例假額度 (如 4 天)
    annualQuota: number; // 年度總例假配額 (monthlyQuota * 12)
    accumulatedToDate: number; // 截至當月累計應得例假 (monthlyQuota * month)
    usedThisMonth: number; // 本月已放例假天數
    remainingThisMonth: number; // 本月單月未放完例假天數 (Quota - Used)
    usedThisYear: number; // 全年累計已放例假天數
    accumulatedRemaining: number; // 截至當月累積儲存未放例假 (可存至12/31放完)
    yearEndRemaining: number; // 全年/年尾 (至12月31日) 未放完例假餘額
    eventsThisMonth: CalendarEvent[]; // 本月例假行程
    eventsThisYear: CalendarEvent[]; // 全年例假行程
  };
  
  // 補假 (Lieu Leave - 3 Months Expiry)
  lieuLeave: {
    grants: LieuLeaveGrant[]; // 所有補假單
    activeGrants: LieuLeaveGrant[]; // 有效未過期補假單
    expiredGrants: LieuLeaveGrant[]; // 已過期失效補假單
    usedGrants: LieuLeaveGrant[]; // 已用完補假單
    totalDaysEarned: number; // 總累積補假天數
    totalDaysUsed: number; // 總已放補假天數
    totalDaysActive: number; // 目前有效可用補假天數
    totalDaysExpired: number; // 已過期作廢補假天數
    earliestExpiringGrant: LieuLeaveGrant | null; // 最快到期的補假
    usedThisYear: number; // 本年度已放補假天數
    eventsThisYear: CalendarEvent[]; // 本年度補假行程
  };
  
  // 病假 (Sick Leave)
  sickLeave: {
    totalDaysThisYear: number; // 本年度病假總天數
    daysWithMedicalCert: number; // 附有醫療證明天數
    daysWithoutMedicalCert: number; // 無醫療證明天數
    annualQuota?: number; // 每年上限 (若有)
    eventsThisYear: CalendarEvent[]; // 本年度病假行程
  };
  
  // 其他假期
  otherLeave: {
    totalDaysThisYear: number;
    eventsThisYear: CalendarEvent[];
  };
}

export const calculateEmployeeLeaveBalances = (
  rawProfile: EmployeeHolidayProfile | null | undefined,
  username: string,
  displayName: string,
  calendarEvents: CalendarEvent[],
  targetYear: number = new Date().getFullYear(),
  targetMonth: number = new Date().getMonth() + 1
): LeaveCalculationResult => {
  const normUser = (username || '').toLowerCase().trim();
  const normDisp = (displayName || username || '').toLowerCase().trim();
  const userPrefix = normUser.split('@')[0];
  const dispPrefix = normDisp.split('@')[0];
  const profile: EmployeeHolidayProfile = rawProfile || DEFAULT_EMPLOYEE_PROFILE(normUser, displayName || username);
  
  // Filter events created by or tagged for this employee
  const userEvents = calendarEvents.filter(evt => {
    const creator = (evt.createdBy || '').toLowerCase().trim();
    const creatorPrefix = creator.split('@')[0];
    const title = (evt.title || '').toLowerCase();

    // Check creator matching
    if (normUser && (creator === normUser || creatorPrefix === userPrefix)) return true;
    if (normDisp && (creator === normDisp || creatorPrefix === dispPrefix)) return true;
    if (normUser && (creator.includes(normUser) || normUser.includes(creator))) return true;
    if (normDisp && (creator.includes(normDisp) || normDisp.includes(creator))) return true;

    // Check title tag matching, e.g. [WHLEE], [King], [Mat], @whlee, etc.
    if (normUser && (title.includes(`[${normUser}]`) || title.includes(`@${normUser}`) || title.startsWith(`[${normUser}`))) return true;
    if (normDisp && (title.includes(`[${normDisp}]`) || title.includes(`@${normDisp}`) || title.startsWith(`[${normDisp}`))) return true;
    if (userPrefix && (title.includes(`[${userPrefix}]`) || title.includes(`@${userPrefix}`))) return true;
    if (dispPrefix && (title.includes(`[${dispPrefix}]`) || title.includes(`@${dispPrefix}`))) return true;

    return false;
  });
  
  const todayStr = getTodayDateString();
  const targetYearPrefix = `${targetYear}-`;
  const targetMonthPrefix = `${targetYear}-${String(targetMonth).padStart(2, '0')}-`;
  
  // Classify leave events
  const annualEventsThisYear: CalendarEvent[] = [];
  const regularEventsThisMonth: CalendarEvent[] = [];
  const regularEventsThisYear: CalendarEvent[] = [];
  const lieuEventsThisYear: CalendarEvent[] = [];
  const sickEventsThisYear: CalendarEvent[] = [];
  const otherEventsThisYear: CalendarEvent[] = [];
  
  userEvents.forEach(evt => {
    const isHoliday = evt.type === 'holiday_full' || evt.type === 'holiday_am' || evt.type === 'holiday_pm' || (evt.title && (evt.title.includes('放假') || evt.title.includes('休假')));
    if (!isHoliday) return;
    
    const cat = getEventLeaveCategory(evt);
    const isThisYear = evt.date.startsWith(targetYearPrefix);
    const isThisMonth = evt.date.startsWith(targetMonthPrefix);
    
    if (cat === 'annual' && isThisYear) {
      annualEventsThisYear.push(evt);
    } else if (cat === 'regular') {
      if (isThisYear) regularEventsThisYear.push(evt);
      if (isThisMonth) regularEventsThisMonth.push(evt);
    } else if (cat === 'lieu' && isThisYear) {
      lieuEventsThisYear.push(evt);
    } else if (cat === 'sick' && isThisYear) {
      sickEventsThisYear.push(evt);
    } else if (isThisYear) {
      otherEventsThisYear.push(evt);
    }
  });

  // 1. Annual Leave Calculations (大假總數÷12個月，在每個月1號加入，支援小數點)
  const baseEntitlement = Number(profile.annualLeaveEntitlement) || 7;
  const carriedOver = Number(profile.annualLeaveCarriedOver) || 0;
  const manualAdj = Number(profile.annualLeaveManualAdjustment) || 0;
  const totalEntitled = Math.round((baseEntitlement + carriedOver + manualAdj) * 100) / 100;
  
  // 每月1號加入額度 (基礎總數 ÷ 12)
  const monthlyAccrualRate = Math.round((baseEntitlement / 12) * 100) / 100;
  
  // 截至 targetMonth 月份（於每月1號自動累計計入 targetMonth 個月份）
  const accruedFromMonths = Math.round(((targetMonth * baseEntitlement) / 12) * 100) / 100;
  
  // Automatic accumulation based on 1st of each month + carriedOver + manualAdj
  let accumulatedToDate = profile.annualLeaveAccumulated !== undefined
    ? Number(profile.annualLeaveAccumulated)
    : Math.round((accruedFromMonths + carriedOver + manualAdj) * 100) / 100;
  
  // Ensure accumulated is within valid bounds
  accumulatedToDate = Math.max(0, Math.min(totalEntitled, accumulatedToDate));

  const usedAnnualDays = Math.round(annualEventsThisYear.reduce((acc, evt) => acc + getLeaveDaysValue(evt), 0) * 100) / 100;
  const annualBalanceAvailable = Math.max(0, Math.round((accumulatedToDate - usedAnnualDays) * 100) / 100);
  const yearEndTotalAvailable = Math.max(0, Math.round((totalEntitled - usedAnnualDays) * 100) / 100);

  // 2. Regular Off Calculations (未放完可儲存，直至年尾12月31日前放完，年尾仍有未放顯示數值)
  const monthlyQuota = Number(profile.monthlyRegularOffQuota) || 4;
  const annualQuota = Math.round(monthlyQuota * 12 * 10) / 10;
  const accumulatedRegularToDate = Math.round(monthlyQuota * targetMonth * 10) / 10;
  
  const usedRegularThisMonth = regularEventsThisMonth.reduce((acc, evt) => acc + getLeaveDaysValue(evt), 0);
  const remainingRegularThisMonth = Math.max(0, Math.round((monthlyQuota - usedRegularThisMonth) * 10) / 10);
  const usedRegularThisYear = regularEventsThisYear.reduce((acc, evt) => acc + getLeaveDaysValue(evt), 0);
  
  // 截至當月累積可放 / 儲存未放餘額 (已累積額度 - 全年已放)
  const accumulatedRegularRemaining = Math.max(0, Math.round((accumulatedRegularToDate - usedRegularThisYear) * 10) / 10);
  // 全年度總配額至 12 月 31 日未放完例假餘額 (年尾結算數值)
  const yearEndRegularRemaining = Math.max(0, Math.round((annualQuota - usedRegularThisYear) * 10) / 10);

  // 3. Lieu Leave Calculations (3 Months validity)
  const existingGrants: LieuLeaveGrant[] = Array.isArray(profile.lieuGrants) ? [...profile.lieuGrants] : [];
  
  // Calculate total lieu days taken from calendar events
  const usedLieuDaysFromEvents = lieuEventsThisYear.reduce((acc, evt) => acc + getLeaveDaysValue(evt), 0);

  // Process and update status for all grants
  let allocatedUsedDays = usedLieuDaysFromEvents;
  const processedGrants: LieuLeaveGrant[] = existingGrants.map(grant => {
    const isExpired = grant.expiryDate < todayStr;
    const daysEarned = Number(grant.daysEarned) || 0;
    
    // Allocate used days in FIFO manner
    let daysUsed = 0;
    if (allocatedUsedDays > 0) {
      daysUsed = Math.min(daysEarned, allocatedUsedDays);
      allocatedUsedDays -= daysUsed;
    }
    const daysRemaining = Math.max(0, daysEarned - daysUsed);
    
    let status: 'active' | 'used' | 'expired' = 'active';
    if (daysRemaining <= 0) {
      status = 'used';
    } else if (isExpired) {
      status = 'expired';
    } else {
      status = 'active';
    }
    
    return {
      ...grant,
      daysEarned,
      daysUsed,
      daysRemaining,
      status
    };
  });

  const activeGrants = processedGrants.filter(g => g.status === 'active');
  const expiredGrants = processedGrants.filter(g => g.status === 'expired');
  const usedGrants = processedGrants.filter(g => g.status === 'used');

  const totalDaysEarned = processedGrants.reduce((acc, g) => acc + g.daysEarned, 0);
  const totalDaysActive = activeGrants.reduce((acc, g) => acc + g.daysRemaining, 0);
  const totalDaysExpired = expiredGrants.reduce((acc, g) => acc + g.daysRemaining, 0);

  // Earliest expiring active grant
  const sortedActive = [...activeGrants].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  const earliestExpiringGrant = sortedActive.length > 0 ? sortedActive[0] : null;

  // 4. Sick Leave Calculations
  let daysWithMC = 0;
  let daysWithoutMC = 0;
  sickEventsThisYear.forEach(evt => {
    const days = getLeaveDaysValue(evt);
    if (evt.medicalCertificate) {
      daysWithMC += days;
    } else {
      daysWithoutMC += days;
    }
  });
  const totalSickDays = daysWithMC + daysWithoutMC;

  // 5. Other Leaves
  const totalOtherDays = otherEventsThisYear.reduce((acc, evt) => acc + getLeaveDaysValue(evt), 0);

  return {
    username: normUser,
    displayName: profile.displayName || displayName || normUser,
    year: targetYear,
    month: targetMonth,
    annualLeave: {
      baseEntitlement,
      monthlyAccrualRate,
      carriedOver,
      manualAdjustment: manualAdj,
      totalEntitled,
      accumulatedToDate,
      usedThisYear: usedAnnualDays,
      balanceAvailable: annualBalanceAvailable,
      yearEndTotalAvailable,
      eventsThisYear: annualEventsThisYear
    },
    regularOff: {
      monthlyQuota,
      annualQuota,
      accumulatedToDate: accumulatedRegularToDate,
      usedThisMonth: usedRegularThisMonth,
      remainingThisMonth: remainingRegularThisMonth,
      usedThisYear: usedRegularThisYear,
      accumulatedRemaining: accumulatedRegularRemaining,
      yearEndRemaining: yearEndRegularRemaining,
      eventsThisMonth: regularEventsThisMonth,
      eventsThisYear: regularEventsThisYear
    },
    lieuLeave: {
      grants: processedGrants,
      activeGrants,
      expiredGrants,
      usedGrants,
      totalDaysEarned,
      totalDaysUsed: usedLieuDaysFromEvents,
      totalDaysActive,
      totalDaysExpired,
      earliestExpiringGrant,
      usedThisYear: usedLieuDaysFromEvents,
      eventsThisYear: lieuEventsThisYear
    },
    sickLeave: {
      totalDaysThisYear: totalSickDays,
      daysWithMedicalCert: daysWithMC,
      daysWithoutMedicalCert: daysWithoutMC,
      annualQuota: profile.annualSickLeaveQuota,
      eventsThisYear: sickEventsThisYear
    },
    otherLeave: {
      totalDaysThisYear: totalOtherDays,
      eventsThisYear: otherEventsThisYear
    }
  };
};

/**
 * Creates a new Lieu Leave Grant when an employee works on a statutory/public holiday.
 * Validity is automatically set to exactly 3 months from workDate.
 */
export const createLieuGrantFromWorkEvent = (
  username: string,
  workDate: string,
  holidayName: string,
  daysEarned: number = 1.0,
  notes: string = ''
): LieuLeaveGrant => {
  const expiryDate = calculateLieuExpiryDate(workDate);
  return {
    id: `lieu-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    username: username.toLowerCase().trim(),
    workDate,
    holidayName,
    daysEarned,
    daysUsed: 0,
    daysRemaining: daysEarned,
    expiryDate,
    createdAt: Date.now(),
    status: 'active',
    notes: notes || `在公眾假期【${holidayName}】出勤加班，自動計發補假（限 3 個月內至 ${expiryDate} 放完）`
  };
};
