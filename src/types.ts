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
  variationOrders?: VariationOrder[]; // 支援多個後加報價單
  isLocked?: boolean;       // 儲存後鎖定報價單內容
  visibleCategories?: string[]; // 顯示的項目大類分類
  startDate?: string;       // 開工日期
  endDate?: string;         // 完工日期
  usableArea?: string;      // 實用面積
  receivedDeposit?: number; // 已收訂金 (用戶自行填寫金額，在總額扣除)
}

export interface VariationOrder {
  id: string;               // e.g. "vo-1", "vo-2"
  title: string;            // e.g. "廚房水電增加", "客廳插座工程"
  items: QuotationItem[];   // 後加工程項目詳情
  paymentStages: PaymentStage[]; // 後加項目收款期數與比率
  remarks: string;          // 後加項目備註
  discount: number;         // 後加項目折讓
  createdAt?: number;       // 建立時間 (ms)
}

export type UserRole = 'admin' | 'staff' | 'user';

export interface UserProfile {
  appFontSize?: 'sm' | 'base' | 'lg' | 'xl';
  showMainFooter?: boolean;
  isDarkMode?: boolean;
  showStatsDashboard?: boolean;
  standardItems?: Record<string, StandardItem[]>;
  categories?: string[];
  categoryOrder?: string[];
  calendarViewMode?: 'grid' | 'list';
  calendarColor?: string;
}

export interface UserAccount {
  username: string;
  password?: string; // Encrypted or plain for simple auth on this secure applet
  role: UserRole;
  displayName: string;
  createdAt: string;
  profile?: UserProfile;
  permissions?: Record<string, boolean>;
}

export interface QuoteSettings {
  bankName: string;
  companyName: string;
  bankAccount: string;
  fpsId: string;
  defaultTerms: string;
  showMainFooter?: boolean;
  isDarkMode?: boolean;
  appFontSize?: 'sm' | 'base' | 'lg' | 'xl';
  showStatsDashboard?: boolean;
  calendarViewMode?: 'grid' | 'list';
}

export interface BackupData {
  quotations: Quotation[];
  customStandardItems: Record<string, StandardItem[]>;
  customCategories: string[];
  quoteSettings: QuoteSettings;
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: 'visit' | 'measure' | 'remeasure' | 'other' | 'holiday_full' | 'holiday_am' | 'holiday_pm';
  date: string; // YYYY-MM-DD
  time: string; // HH:MM or custom string
  location?: string;
  remarks?: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
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
}



