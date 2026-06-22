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
  scheduleEnabled?: boolean;
  scheduleStartDate?: string;
  scheduleSteps?: ScheduleStep[];
}

export interface QuoteSettings {
  bankName: string;
  companyName: string;
  bankAccount: string;
  fpsId: string;
  defaultTerms: string;
  showMainFooter?: boolean;
  isDarkMode?: boolean;
}

export interface BackupData {
  quotations: Quotation[];
  customStandardItems: Record<string, StandardItem[]>;
  customCategories: string[];
  quoteSettings: QuoteSettings;
}
