export interface StandardItem {
  name: string;
  unit: string;
  priceRange: string;
  defaultRemark?: string;
}

export type QuotationStatus = 
  | 'pending'      // 未報價
  | 'quoted'       // 報價待回覆
  | 'signed'       // 已簽約
  | 'constructing' // 施工中
  | 'finished'     // 施工完成
  | 'completed'    // 完工結清
  | 'cancelled';   // 作廢

export interface QuotationItem {
  id: string;
  category: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  remark: string;
}

export interface PaymentStage {
  name: string;
  percent: number;
  remark: string;
  isPaid?: boolean;
  lockedAmount?: number;
  adjustmentAmount?: number;
}

export interface ScheduleStep {
  name: string;
  days: number;
  startDate?: string;
  endDate?: string;
  isParallel?: boolean; // 是否與上一工序同時進行 / 並行施工
  customStartDate?: string; // 用戶自訂之開始日期
}

export interface DiscountEntry {
  id: string;
  targetItemId?: string; // ID of the item targeted for discount, or empty/undefined for whole quotation
  amount: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedBy?: string; // Username or Display Name of the person who confirmed
  completedAt?: string; // Formatted date string or timestamp
  createdBy?: string;   // Username or Display Name of creator
  createdAt?: string;   // Formatted date string or timestamp
}

export interface PaymentReminder {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  percent: number;
}

export interface TermsTemplate {
  id: string; // e.g. "v1.0", "v2.0"
  version: string; // e.g. "v1.0", "v2.0"
  name: string; // e.g. "標準住宅裝修特別條款 (21條)"
  content: string; // the contract terms text
  description?: string; // summary / notes
  isDefault?: boolean; // whether it is the system default active template
  updatedAt?: number; // timestamp
}

export interface EditingLock {
  username: string;
  displayName: string;
  lockedAt: number; // timestamp ms
}

export interface Quotation {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  date: string;
  status: QuotationStatus;
  version: string;
  items: QuotationItem[];
  remarks: string;
  termsTemplateVersion?: string; // 條款範本版本號 (e.g. "v1.0", "v2.0")
  discount: number;
  discountTargetItemId?: string; // ID of the item targeted for discount
  enableDiscounts?: boolean;
  discounts?: DiscountEntry[];
  depositPercent: number;    // 訂金 % (預設 40)
  progressPercent: number;   // 工程中期款 % (預設 40)
  balancePercent: number;    // 完工尾款 % (預設 20)
  paymentStages?: PaymentStage[];
  paymentReminders?: PaymentReminder[];
  scheduleEnabled?: boolean;
  scheduleStartDate?: string;
  scheduleSteps?: ScheduleStep[];
  assignedTo?: string; // Username of the account assigned to this quotation
  designer?: string;   // 負責設計師
  updatedAt?: number; // Last edited timestamp in ms
  updatedBy?: string; // Username or Display Name of the last user who updated the quotation
  meetingRecords?: string; // 會議紀錄
  draftRemarks?: string;   // 草稿備註 / 內部備註
  checklist?: ChecklistItem[]; // 內部待辦事項 / Checklist
  internalNumber?: string; // 公司內部號碼
  hasVO?: boolean;          // 是否啟用後加項目
  voItems?: QuotationItem[]; // 後加工程項目詳情
  voPaymentStages?: PaymentStage[]; // 後加項目收款期數與比率
  voRemarks?: string;       // 後加項目備註
  voDiscount?: number;      // 後加項目折讓
  voTitle?: string;         // 後加工程名稱/標題 (列印時用)
  voDate?: string;          // 後加工程日期 (YYYY-MM-DD)
  variationOrders?: VariationOrder[]; // 支援多個後加報價單
  isLocked?: boolean;       // 儲存後鎖定報價單內容
  editingLock?: EditingLock | null; // 正在編輯此報價單之用戶鎖
  visibleCategories?: string[]; // 顯示的項目大類分類
  startDate?: string;       // 開工日期
  endDate?: string;         // 完工日期
  usableArea?: string;      // 實用面積
  receivedDeposit?: number; // 已收訂金 (用戶自行填寫金額，在總額扣除)
  isArchived?: boolean;      // 是否已移動至封存資料夾
}

export interface VariationOrder {
  id: string;               // e.g. "vo-1", "vo-2"
  title: string;            // e.g. "廚房水電增加", "客廳插座工程"
  date?: string;            // 後加工程日期 (YYYY-MM-DD)
  items: QuotationItem[];   // 後加工程項目詳情
  paymentStages: PaymentStage[]; // 後加項目收款期數與比率
  remarks: string;          // 後加項目備註
  discount: number;         // 後加項目折讓
  createdAt?: number;       // 建立時間 (ms)
  visibleCategories?: string[]; // 顯示的項目大類分類 (獨立於主報價單)
}

export type UserRole = 'admin' | 'staff' | 'user';

export type DepartmentType = 'admin' | 'admin_marketing' | 'engineering' | 'sales' | 'marketing' | 'design' | 'assistant' | 'clerk' | 'other';

export const DEPARTMENT_OPTIONS = [
  { id: 'admin_marketing', label: '行政&市場部', badge: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'admin', label: '行政部', badge: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'engineering', label: '工程部', badge: 'bg-amber-100 text-amber-900 border-amber-300' },
  { id: 'sales', label: '銷售部', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'design', label: '設計部', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'marketing', label: '市場部', badge: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'assistant', label: '助理部', badge: 'bg-teal-100 text-teal-800 border-teal-200' },
  { id: 'clerk', label: '文員部', badge: 'bg-slate-100 text-slate-800 border-slate-300' },
  { id: 'other', label: '其他部門', badge: 'bg-gray-100 text-gray-700 border-gray-200' },
] as const;

export interface UserProfile {
  appFontSize?: 'sm' | 'base' | 'lg' | 'xl';
  showMainFooter?: boolean;
  isDarkMode?: boolean;
  showStatsDashboard?: boolean;
  showMobileCalendarDayList?: boolean;
  standardItems?: Record<string, StandardItem[]>;
  categories?: string[];
  categoryOrder?: string[];
  calendarViewMode?: 'grid' | 'list';
  calendarColor?: string;
  department?: string; // 部門分類：行政部 | 銷售部 | 市場部 | 設計部
}

export interface UserAccount {
  username: string;
  password?: string; // Encrypted or plain for simple auth on this secure applet
  role: UserRole;
  displayName: string;
  createdAt: string;
  department?: string; // 部門分類：行政部 | 銷售部 | 市場部 | 設計部
  profile?: UserProfile;
  permissions?: Record<string, boolean>;
}

export interface QuoteSettings {
  bankName: string;
  companyName: string;
  bankAccount: string;
  fpsId: string;
  defaultTerms: string;
  termsTemplates?: TermsTemplate[];
  defaultTermsVersion?: string;
  standardItems?: Record<string, StandardItem[]>;
  showMainFooter?: boolean;
  isDarkMode?: boolean;
  appFontSize?: 'sm' | 'base' | 'lg' | 'xl';
  showStatsDashboard?: boolean;
  calendarViewMode?: 'grid' | 'list';
  showMobileCalendarDayList?: boolean;
  customUnits?: string[]; // 自訂工程單位清單 (由管理員在一般設定維護)
  holidayManagement?: HolidayManagementData; // 假期管理全體資料庫
}

export type LeaveCategory = 'annual' | 'regular' | 'lieu' | 'sick' | 'other';

export interface LieuLeaveGrant {
  id: string;
  username: string; // 獲得補假之員工帳號 (canonical username)
  workDate: string; // 出勤日期 YYYY-MM-DD (例如公眾假期出勤日)
  holidayName: string; // 公眾假期名稱 (如 "國慶日", "元旦", "中秋節翌日", "佛誕" 等)
  daysEarned: number; // 獲得補假日數 (通常為 1.0 或 0.5)
  daysUsed: number; // 已扣減/已放日數
  daysRemaining: number; // 剩餘可放日數
  expiryDate: string; // 放假限期 YYYY-MM-DD (獲得日 + 3個月)
  createdAt: number;
  status: 'active' | 'used' | 'expired';
  notes?: string;
}

export interface EmployeeHolidayProfile {
  username: string; // 員工帳號 (小寫)
  displayName?: string; // 顯示姓名
  department?: string; // 部門分類：行政部 | 銷售部 | 市場部 | 設計部
  // 1. 大假 (Annual Leave)
  annualLeaveEntitlement: number; // 每年大假數量 (預設 7-14 天)
  annualLeaveAccumulated?: number; // 已累積日數 (自訂或依年資結算)
  annualLeaveCarriedOver?: number; // 去年結轉日數
  annualLeaveManualAdjustment?: number; // 手動增減調整天數 (+/-)
  joinDate?: string; // 入職日期 (YYYY-MM-DD)
  
  // 2. 例假 (Regular Rest Days)
  monthlyRegularOffQuota: number; // 每月例假數量 (預設 4-8 天)
  defaultRestDays?: number[]; // 預設例假星期 (0=週日, 6=週六)
  
  // 3. 補假 (Lieu Leave)
  lieuGrants?: LieuLeaveGrant[]; // 補假明細列表 (每筆 3 個月期限)
  
  // 4. 病假 (Sick Leave)
  annualSickLeaveQuota?: number; // 每年病假配額上限 (選填，如無則無上限)
  
  notes?: string;
  updatedAt?: number;
  updatedBy?: string;
}

export interface HolidayCompanySettings {
  defaultAnnualLeave: number; // 預設年度大假 (預設 7)
  defaultMonthlyOff: number; // 預設每月例假 (預設 4)
  lieuValidityMonths: number; // 補假有效月數 (固定 3 個月)
  defaultRestDays: number[]; // 預設例假 (預設 [0, 6])
  autoGrantLieuOnPublicHolidays: boolean; // 是否在公眾假期出勤時自動生成補假
}

export interface HolidayManagementData {
  companySettings?: HolidayCompanySettings;
  profiles: Record<string, EmployeeHolidayProfile>; // key: username (小寫)
  lastUpdated?: number;
}

export interface BackupData {
  quotations: Quotation[];
  customStandardItems: Record<string, StandardItem[]>;
  customCategories: string[];
  quoteSettings: QuoteSettings;
  termsTemplates?: TermsTemplate[];
  holidayManagement?: HolidayManagementData;
  isSmartSlimmed?: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: 'visit' | 'measure' | 'remeasure' | 'other' | 'holiday_full' | 'holiday_am' | 'holiday_pm' | 'site_station';
  date: string; // YYYY-MM-DD
  time: string; // HH:MM or custom string
  location?: string;
  remarks?: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  enableNotification?: boolean; // 是否啟用晨間/推送通知 (預設 true)
  notifyTime?: string; // 自訂提醒時間 (預設 "08:00")
  leaveCategory?: LeaveCategory; // 假期類型：大假(annual) | 例假(regular) | 補假(lieu) | 病假(sick) | 其他(other)
  medicalCertificate?: boolean; // 病假：醫療證明 (checkbox)
  lieuGrantId?: string; // 補假所扣抵之 LieuGrant ID
  leaveDays?: number; // 請假日數 (1.0 全天, 0.5 半天)
}

export interface ProjectTemplate {
  id: string;
  name: string;
  items: QuotationItem[];
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface DOrder {
  id: string;
  orderNo: string;
  customerName?: string;
  phone?: string;
  address: string;
  step1: boolean; // 登記訂金
  step2: boolean; // 度尺
  step3: boolean; // 平面圖
  step4: boolean; // 報價單
  step5: boolean; // 確認報價單及大訂
  step6: boolean; // 確認A單
  isCompleted: boolean; // 當 6 個步驟全部完成
  isUnsigned?: boolean; // 未簽約標記
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  step5MeetingDate?: string;
  step5MeetingTime?: string;
  step5MeetingLocation?: string;
  step1CheckedBy?: string;
  step2CheckedBy?: string;
  step3CheckedBy?: string;
  step4CheckedBy?: string;
  step5CheckedBy?: string;
  step6CheckedBy?: string;
  depositMethod?: string;
  depositAmount?: number;
  depositDate?: string;
  step5DepositMethod?: string;
  step5DepositAmount?: number;
  step5DepositDate?: string;
  quotationId?: string;
  quotationNumber?: string;
  quotationCustomerName?: string;
  step6Designer?: string;
  step6InternalNumber?: string;
}



