import React, { useState, useEffect, useMemo, useRef, ChangeEvent } from 'react';
import { 
  Plus, Search, FileText, Settings, RefreshCw, Edit, Trash2, 
  Copy, Printer, Download, Upload, X, Save, PlusCircle, Check, 
  AlertTriangle, ChevronDown, ChevronUp, BookOpen, Coins, FileSpreadsheet,
  CheckCircle, FileJson, Info, Share2, Eye, History, LogOut, Users, Key, Database
} from 'lucide-react';
import { Quotation, QuotationItem, QuotationStatus, StandardItem, QuoteSettings, BackupData, PaymentStage, ScheduleStep } from './types';
import { DEFAULT_CATEGORIES, DEFAULT_STANDARD_ITEMS, DEFAULT_SETTINGS } from './defaults';
import { dbGet, dbSet, dbClear } from './indexedDB';


const APP_CHANGELOG = [
  {
    version: '1.43',
    date: '2026-06-19',
    details: [
      '架構全面升級：構建了靈活的合約多層級折扣 (Discounts) 機制。',
      '支援添加無限筆工程個別項目特別款折讓、全筆合約特別工程折讓等。',
      '重構列表財務資訊計算 (Subtotal & Grand Total)，以高對比紅底粉邊徽章直觀、極簡化呈現。'
    ]
  },
  {
    version: '1.43.1',
    date: '2026-06-19',
    details: [
      '解決視區相容性：優化狀態欄與頂部進度條容器在 Mobile/Pad 當中的間距適配。',
      '改善了在部分尺寸預覽下的按鈕遮擋及頂部隱藏邊緣不齊的問題。'
    ]
  },
  {
    version: '1.43.2',
    date: '2026-06-19',
    details: [
      '細節打磨：將各處字體、按鈕與文字表述中的「折讓」統一正規化為「折扣」標識。',
      '精鍊表述：去除費用明細表（Breakdown）中無意義的贅字「針對」，展現專業。',
      '在未啟動或未設定折扣之時，底層明細中將自動徹底隱藏折讓行，不留任何空白。'
    ]
  },
  {
    version: '1.43.3',
    date: '2026-06-20',
    details: [
      '交互工作流改進：取消按鈕更名為「退出草稿」，使其不失合約草稿概念。',
      '在點擊「儲存合約變更」後自動保留在當前編輯模組中，允許使用者無需退出並進一步隨時編輯。',
      '智慧變更狀態跟蹤：新增 Dirty Check，按下退出編輯或右上角交叉 [X] 時，若有任何實質性內容修改會彈出「儲存並退出 / 退出 (不儲存) / 取消」選擇視窗。若沒有修改則點擊直接直接退出。'
    ]
  },
  {
    version: '1.43.4',
    date: '2026-06-20',
    details: [
      '加入版本號與製作人資訊：在全站頁尾顯示 V1.43 （以及自動隨更新日誌條數累加之子修補版本：V1.43.4）。',
      '加入「製作人: WHLEE」及版權信息：「製作人: WHLEE | © 2026 WHLEE. All Rights Reserved.」。',
      '加入「更新詳情」互動機制：快捷彈窗日誌（Log Modal），點擊即可直觀展示全部功能更新歷史追蹤。'
    ]
  },
  {
    version: '2.0.1',
    date: '2026-06-20',
    details: [
      '高精確度欄寬佈局：大幅加寬報價單中「單價 (HKD)」與「金額 (HKD)」欄寬，全面應用 whitespace-nowrap (不換行) 屬性，杜絕移位。',
      '最佳化 A4 列印頁面高度：列印模式下智慧縮減上下頁邊距 (10mm/12mm)，並微調付款拆細表格與條款字體，使最終附件頁能完美收納於單頁中，徹底消除多餘空白頁。',
      '移除全域樣式干擾：移除了全域對 table 強制加載的額外上下外邊距，使 Tailwind 間距設定精準套用，完美重現極簡高品質的高質感列印排版。'
    ]
  },
  {
    version: '2.1.4',
    date: '2026-06-20',
    details: [
      '智能單張 JSON 導出：將列表操作中的「匯出」按鈕重構為「導出特定報價單 JSON」功能，生成的備份檔案名自動對齊「報價單編號+客戶名稱+導出日期時間」規範。',
      '便捷報價單上載：新增「上載報價單 (JSON)」功能（包括空數據狀態與列表頂部操作欄），支援讀取 JSON 格式的報價單並新增導入至資料庫之中（自動處理編號重複衝突，若重複會重命名）。'
    ]
  },
  {
    version: '2.1.5',
    date: '2026-06-22',
    details: [
      '優化上載按鈕：將按鈕文字精簡微修為「上載報價單」，使標題交互更顯乾淨俐落。',
      '修復輸入框清空保留「0」問題：徹底修復輸入明細單價及數量時，若將數值全部倒退刪除（清空）時會留下「0」且新輸入數字會排在零其後的 bug。現在當數值為 0 時，輸入框會智慧顯示為空白，更利於現場快速鍵入新資訊。'
    ]
  },
  {
    version: '2.1.6',
    date: '2026-06-22',
    details: [
      '重構合約欄位排版：流暢重組編輯表單上層架構，將其升級為更加工整直觀之雙列格局：',
      '　一、報價合約號碼 | 合約日期 | 目前進度狀態 | 版本',
      '　二、客戶姓名 * | 電話號碼 | 裝修施工地址　',
      '加長施工地址：為「裝修施工地址」擴充至二倍寬度格位（col-span-2），並完美對齊上排，保證全尺寸屏幕之下的視覺對齊線。'
    ]
  },
  {
    version: '2.1.7',
    date: '2026-06-22',
    details: [
      '修復列印簽名移位：修正 PDF/紙張列印模式對齊 A4 縮小渲染時，底部客戶確認與代表簽署區塊會異常向上偏移的問題。透過彈性垂直延展（flex flex-col flex-grow）及 mt-auto 技術鎖定其於頁底，保障列印版貌之規整。',
      'Toast 通知層次修正：將全域 Toast 提示訊息之層級 (z-index) 提升至九萬級別 z-[99999]，避免其彈出時被其它彈窗或側邊攔/全螢幕 Modal 頁面所阻擋，操作回饋能第一時間告知。',
      '標準庫按鈕表述加強：重構標準細項快速附加之操作按鈕，更名為直觀的「加入細項」。'
    ]
  },
  {
    version: '2.1.8',
    date: '2026-06-22',
    details: [
      '一般設定升級：將「頁腳與帳戶管理」重構更名為「一般設定與帳戶管理」，使選項歸納定位更準確、架構更具擴展性。',
      '黑夜模式 (Dark Mode) 首發：於一般設定頂部新增一鍵啟用/關閉系統深色主題開關，滿足暗光環境下長時間瀏覽的護眼需求。'
    ]
  },
  {
    version: '2.1.9',
    date: '2026-06-22',
    details: [
      '深色主題明度修復與細部對準：全面盤點各區塊背景及邊框，大幅調優列表、表頭、表格背景、狀態徽章與高頻操作輸入框之配色明度，全面修復黑夜模式下文字對比度低、無法看清之痛點，使界面更乾淨易讀。'
    ]
  },
  {
    version: '2.2.0',
    date: '2026-06-22',
    details: [
      '設定面板視窗尺寸工整化：修補各分頁內容高度不一導致視窗時常拉長縮水、劇烈抖動的問題；全面改進為 680px 高度之高質感固定規格（在行動裝置大屏幕等亦完美適配 85vh 高度上限），帶來頂級視效。'
    ]
  },
  {
    version: '2.2.1',
    date: '2026-06-22',
    details: [
      '智能施工時間表系統：為報價合約導入全面自動化排期排程引擎。支援自訂工程起訖、各工序所需工作日；自動識別並跳過星期六日及香港公眾假期（包括元旦、農曆新年、復活節、清明節、勞動節、端午節、國慶日及聖誕等），自動推算精準完工交收期限。',
      '全新專屬時程預覽單頁：於報價單尾端建立單獨的 A4 設計施工預計規劃頁，使客戶簽約與工序安排展示更加直觀、清晰。'
    ]
  },
  {
    version: '2.3.1',
    date: '2026-07-05',
    details: [
      'IndexedDB 本地儲存升級：支援完整將帳號、報價單及一般設定無損緩存至 IndexedDB 數據庫中。',
      '自動化雙向同步：系統在管理員與各子帳戶在線時自動合併本地與雲端數據，避免單機模式更新後的任何覆蓋。',
      '帳戶資料永續保護：大幅優化本地單機登入機制，斷網或更新後仍可憑本機緩存進行多用戶身分驗證與管理，再也無需手動重新加入帳戶。'
    ]
  }
];

const APP_CURRENT_VERSION = APP_CHANGELOG.length > 0 
  ? APP_CHANGELOG[APP_CHANGELOG.length - 1].version 
  : '1.43';


const HK_HOLIDAYS_2026 = [
  '2026-01-01', '2026-02-17', '2026-02-18', '2026-02-19', '2026-04-03', '2026-04-04',
  '2026-04-05', '2026-04-06', '2026-04-07', '2026-05-01', '2026-05-24', '2026-05-25',
  '2026-06-19', '2026-07-01', '2026-09-25', '2026-09-26', '2026-10-01', '2026-10-19',
  '2026-12-25', '2026-12-26'
];

const HK_HOLIDAYS_2027 = [
  '2027-01-01', '2027-02-06', '2027-02-07', '2027-02-08', '2027-02-09', '2027-03-26',
  '2027-03-27', '2027-03-29', '2027-04-05', '2027-05-13', '2027-06-09', '2027-07-01',
  '2027-09-16', '2027-10-01', '2027-10-08', '2027-12-25', '2027-12-27', '2027-12-28'
];

const HK_HOLIDAYS_2028 = [
  '2028-01-01', '2028-01-03', '2028-01-26', '2028-01-27', '2028-01-28', '2028-04-04',
  '2028-04-14', '2028-04-15', '2028-04-17', '2028-05-01', '2028-05-02', '2028-05-28',
  '2028-05-29', '2028-07-01', '2028-07-03', '2028-10-04', '2028-10-01', '2028-10-02',
  '2028-10-26', '2028-12-25', '2028-12-26'
];

const DEFAULT_SCHEDULE_STEPS: ScheduleStep[] = [
  { name: '清拆', days: 3 },
  { name: '水電', days: 7 },
  { name: '泥水', days: 5 },
  { name: '木工 - 覆尺', days: 1 },
  { name: '油漆', days: 7 },
  { name: '木工 - 傢俬、木門、地板安裝', days: 3 },
  { name: '雜項安裝 - 潔具、燈具、掣面、電器', days: 3 },
  { name: '清潔、交收、執漏', days: 3 }
];

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isHolidayOrWeekend(date: Date): boolean {
  const day = date.getDay();
  if (day === 0 || day === 6) {
    return true;
  }
  const dateKey = formatDateKey(date);
  const hkHolidays = new Set([
    ...HK_HOLIDAYS_2026,
    ...HK_HOLIDAYS_2027,
    ...HK_HOLIDAYS_2028,
    `${date.getFullYear()}-01-01`,
    `${date.getFullYear()}-07-01`,
    `${date.getFullYear()}-10-01`,
    `${date.getFullYear()}-12-25`,
    `${date.getFullYear()}-12-26`,
  ]);
  return hkHolidays.has(dateKey);
}

function calculateScheduleAndAssign(startConstructionDate: string, steps: ScheduleStep[]): ScheduleStep[] {
  if (!startConstructionDate) return steps;
  
  let current = new Date(startConstructionDate + 'T00:00:00');
  if (isNaN(current.getTime())) {
    current = new Date();
  }
  
  while (isHolidayOrWeekend(current)) {
    current.setDate(current.getDate() + 1);
  }
  
  return steps.map((step) => {
    const daysNeeded = step.days || 1;
    let stepStart = new Date(current);
    
    while (isHolidayOrWeekend(stepStart)) {
      stepStart.setDate(stepStart.getDate() + 1);
    }
    
    let stepEnd = new Date(stepStart);
    let countedWorkingDays = 1;
    while (countedWorkingDays < daysNeeded) {
      stepEnd.setDate(stepEnd.getDate() + 1);
      if (!isHolidayOrWeekend(stepEnd)) {
        countedWorkingDays++;
      }
    }
    
    current = new Date(stepEnd);
    current.setDate(current.getDate() + 1);
    while (isHolidayOrWeekend(current)) {
      current.setDate(current.getDate() + 1);
    }
    
    return {
      ...step,
      startDate: formatDateKey(stepStart),
      endDate: formatDateKey(stepEnd)
    };
  });
}


function HorizonScheduleCalendar({ steps }: { steps: ScheduleStep[] }) {
  const validSteps = (steps || []).filter(s => s.name && s.startDate && s.endDate);
  if (validSteps.length === 0) {
    return (
      <div className="text-center p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-400">
        請設定「開始工程日期」以自動繪製出橫向日曆排期圖。
      </div>
    );
  }

  // Parse dates beautifully
  const parseDate = (dStr: string) => {
    return new Date(dStr + 'T00:00:00');
  };

  const dates = validSteps.map(s => parseDate(s.startDate!));
  const endDates = validSteps.map(s => parseDate(s.endDate!));
  const overallMin = new Date(Math.min(...dates.map(d => d.getTime())));
  const overallMax = new Date(Math.max(...endDates.map(d => d.getTime())));

  // Align start to Monday
  const startOfWeek = new Date(overallMin);
  const startDay = startOfWeek.getDay();
  const diffToMonday = startDay === 0 ? -6 : 1 - startDay;
  startOfWeek.setDate(startOfWeek.getDate() + diffToMonday);

  // Align end to Sunday
  const endOfWeek = new Date(overallMax);
  const endDay = endOfWeek.getDay();
  const diffToSunday = endDay === 0 ? 0 : 7 - endDay;
  endOfWeek.setDate(endOfWeek.getDate() + diffToSunday);

  // Generate weeks map
  const weeks: { start: Date; end: Date; label: string; days: Date[] }[] = [];
  let currentWeekStart = new Date(startOfWeek);
  
  // Guard infinite loops
  let safetyCounter = 0;
  while (currentWeekStart <= endOfWeek && safetyCounter < 50) {
    safetyCounter++;
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);
    
    const weekDays: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(currentWeekStart);
      dayDate.setDate(dayDate.getDate() + i);
      weekDays.push(dayDate);
    }
    
    const m1 = currentWeekStart.getMonth() + 1;
    const d1 = currentWeekStart.getDate();
    const m2 = currentWeekEnd.getMonth() + 1;
    const d2 = currentWeekEnd.getDate();
    
    weeks.push({
      start: new Date(currentWeekStart),
      end: currentWeekEnd,
      label: `W${weeks.length + 1} (${m1}/${d1})`,
      days: weekDays
    });
    
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  }

  const allDays = weeks.flatMap(w => w.days);
  const totalDays = allDays.length;

  const weekdayNamesShort = ["日", "一", "二", "三", "四", "五", "六"];

  const colors = [
    'bg-indigo-500 text-white dark:bg-indigo-600',
    'bg-blue-500 text-white dark:bg-blue-600',
    'bg-cyan-500 text-slate-800 dark:bg-cyan-600 dark:text-white',
    'bg-teal-500 text-white dark:bg-teal-600',
    'bg-emerald-500 text-white dark:bg-emerald-600',
    'bg-amber-500 text-slate-900 dark:bg-amber-600 dark:text-white',
    'bg-orange-500 text-white dark:bg-orange-600',
    'bg-rose-500 text-white dark:bg-rose-600',
    'bg-purple-500 text-white dark:bg-purple-600',
  ];

  return (
    <div className="w-full text-left space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
          施工甘特排期圖 (Horizontal Construction Schedule Calendar)
        </span>
        <span className="text-[10px] text-gray-500 dark:text-gray-400">
          全期共 {weeks.length} 週，合計 {totalDays} 天 (已預退假日外施工格)
        </span>
      </div>

      <div className="w-full border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto bg-white dark:bg-slate-950 shadow-3xs max-w-full">
        <table className="w-full border-collapse" style={{ tableLayout: 'fixed', minWidth: `${180 + totalDays * 16}px` }}>
          <thead>
            {/* Row 1: Week headers */}
            <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <th className="p-1.5 text-[10px] font-bold text-slate-600 dark:text-gray-400 border-r border-slate-200 dark:border-slate-800 text-left pl-3" style={{ width: '180px' }}>
                工序作業步驟 / 日期
              </th>
              {weeks.map((week, wIdx) => (
                <th 
                  key={wIdx} 
                  colSpan={7} 
                  className="p-1 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-[9px] font-black text-slate-700 dark:text-slate-300 bg-amber-500/5"
                >
                  {week.label}
                </th>
              ))}
            </tr>
            {/* Row 2: Days headers */}
            <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[8px] font-semibold text-slate-500 font-mono">
              <th className="p-1 border-r border-slate-200 dark:border-slate-800 text-left pl-3 text-[10px] font-bold text-gray-500" style={{ width: '180px' }}>
                日曆工作格 (Mon-Sun)
              </th>
              {allDays.map((dayDate, dIdx) => {
                const wDay = dayDate.getDay();
                const isWeekend = wDay === 0 || wDay === 6;
                return (
                  <th 
                    key={dIdx} 
                    className={`p-0.5 border-r border-slate-200 dark:border-slate-850 text-center flex-col justify-center items-center ${isWeekend ? 'bg-rose-500/5 text-rose-500' : 'text-slate-500 dark:text-slate-400'}`}
                  >
                    <div>{weekdayNamesShort[wDay]}</div>
                    <div className="font-extrabold text-[9px] scale-90">{dayDate.getDate()}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {validSteps.map((step, sIdx) => {
              const colorClass = colors[sIdx % colors.length];
              return (
                <tr 
                  key={sIdx} 
                  className="border-b border-slate-100 dark:border-slate-850/80 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 text-xs"
                >
                  <td className="p-1.5 pl-3 border-r border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-200 truncate flex items-center justify-between" style={{ width: '180px' }}>
                    <span className="truncate max-w-[130px] text-[11px]" title={step.name}>
                      {sIdx + 1}. {step.name}
                    </span>
                    <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-1 py-0.2 rounded scale-90 font-bold shrink-0">
                      {step.days}日
                    </span>
                  </td>
                  {allDays.map((dayDate, dIdx) => {
                    const sStr = formatDateKey(dayDate);
                    const isActive = step.startDate && step.endDate && sStr >= step.startDate && sStr <= step.endDate;
                    const wDay = dayDate.getDay();
                    const isWeekend = wDay === 0 || wDay === 6;
                    
                    const isStepStart = step.startDate === sStr;
                    const isStepEnd = step.endDate === sStr;

                    return (
                      <td 
                        key={dIdx} 
                        className={`p-0 bg-transparent relative border-r border-slate-150 dark:border-slate-850/50 text-center ${isWeekend ? 'bg-rose-500/2 dark:bg-rose-950/2' : ''}`}
                      >
                        {isActive ? (
                          <div className="p-0.5 w-full h-full flex items-center justify-center">
                            <div 
                              className={`w-full h-3 flex items-center justify-center text-[7px] font-bold shadow-4xs ${isStepStart ? 'rounded-l-sm' : ''} ${isStepEnd ? 'rounded-r-sm' : ''} ${colorClass}`}
                              title={`${step.name}: ${step.startDate} ~ ${step.endDate}`}
                            >
                              {isStepStart && <span className="scale-75 text-center font-mono opacity-80 font-black">▶</span>}
                            </div>
                          </div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}


const mergeQuotations = (local: Quotation[], server: Quotation[]): Quotation[] => {
  const mergedMap = new Map<string, Quotation>();
  
  // 1. Put all server quotes in the map
  server.forEach(q => {
    mergedMap.set(q.id, q);
  });
  
  // 2. Merge local quotes based on updatedAt timestamp
  local.forEach(lq => {
    const sq = mergedMap.get(lq.id);
    if (!sq) {
      // Local only (added offline)
      mergedMap.set(lq.id, lq);
    } else {
      // In both - keep the newer one based on updatedAt
      const localTime = lq.updatedAt || 0;
      const serverTime = sq.updatedAt || 0;
      if (localTime > serverTime) {
        mergedMap.set(lq.id, lq);
      }
    }
  });
  
  return Array.from(mergedMap.values());
};


export default function App() {
  // --- STATE DECLARATIONS & AUTH STATES ---
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [standardItems, setStandardItems] = useState<Record<string, StandardItem[]>>(DEFAULT_STANDARD_ITEMS);
  const [settings, setSettings] = useState<QuoteSettings>(DEFAULT_SETTINGS);
  
  // Custom auth & multi-user session state
  const [currentUser, setCurrentUser] = useState<{ username: string; role: string; displayName: string } | null>({
    username: 'whlee',
    role: 'admin',
    displayName: '系統管理員'
  });
  const [sessionToken, setSessionToken] = useState<string | null>('whlee');
  const [accountsList, setAccountsList] = useState<any[]>([]);
  const [isAccountsOpen, setIsAccountsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Login form state
  const [loginUsername, setLoginUsername] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

  // Account creation state
  const [newAccUsername, setNewAccUsername] = useState<string>('');
  const [newAccPassword, setNewAccPassword] = useState<string>('');
  const [newAccRole, setNewAccRole] = useState<'admin' | 'user'>('user');
  const [newAccDisplayName, setNewAccDisplayName] = useState<string>('');
  const [accountActionError, setAccountActionError] = useState<string | null>(null);

  // App UI State
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState<boolean>(false);
  const [settingsTab, setSettingsTab] = useState<'library' | 'footer' | 'backup' | 'developer'>('library');
  
  // Quotation Edit State
  const [editingQuote, setEditingQuote] = useState<Quotation | null>(null);
  const [lastSavedQuoteJson, setLastSavedQuoteJson] = useState<string | null>(null);
  const [isEditingNew, setIsEditingNew] = useState<boolean>(false);
  const [originalQuoteId, setOriginalQuoteId] = useState<string | null>(null);
  const [newQuoteModal, setNewQuoteModal] = useState<{
    isOpen: boolean;
    suggestedId: string;
    id: string;
    customerName: string;
  } | null>(null);
  
  // Print Preview state
  const [printQuote, setPrintQuote] = useState<Quotation | null>(null);
  const [printScheduleQuote, setPrintScheduleQuote] = useState<Quotation | null>(null);
  const [previewQuote, setPreviewQuote] = useState<Quotation | null>(null);

  // Selected library item to add categories references
  const [librarySelectCategory, setLibrarySelectCategory] = useState<string>('');
  const [librarySelectItem, setLibrarySelectItem] = useState<StandardItem | null>(null);

  // Notifications
  const [notification, setNotification] = useState<{message: string; type: 'success' | 'info' | 'error'} | null>(null);

  // Custom dialog confirmation state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    onAltConfirm?: () => void;
    altConfirmText?: string;
  } | null>(null);

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText = '確定',
    cancelText = '取消',
    onAltConfirm?: () => void,
    altConfirmText?: string
  ) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(null);
      },
      confirmText,
      cancelText,
      onAltConfirm: onAltConfirm ? () => {
        onAltConfirm();
        setConfirmDialog(null);
      } : undefined,
      altConfirmText
    });
  };

  // --- SERVER SYNCHRONIZATION HELPERS ---
  const fetchAccounts = async (token: string) => {
    try {
      const res = await fetch('/api/accounts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Get local accounts first to see if we have any offline accounts to sync
          const localAccountsStr = localStorage.getItem('artisan_accounts');
          let mergedAccounts = data.accounts;
          
          if (localAccountsStr) {
            try {
              const localAccounts = JSON.parse(localAccountsStr);
              // Check if we have anything locally that needs syncing (e.g. usernames not present on server)
              const hasOfflineAdditions = localAccounts.some((la: any) => 
                !data.accounts.some((sa: any) => sa.username.toLowerCase() === la.username.toLowerCase())
              );
              
              if (hasOfflineAdditions) {
                const syncRes = await fetch('/api/accounts/sync', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({ accounts: localAccounts })
                });
                if (syncRes.ok) {
                  const syncData = await syncRes.json();
                  if (syncData.success) {
                    mergedAccounts = syncData.accounts;
                    console.log("Offline accounts synchronized successfully with server");
                  }
                }
              }
            } catch (err) {
              console.error("Error syncing local accounts with server", err);
            }
          }
          
          setAccountsList(mergedAccounts);
          localStorage.setItem('artisan_accounts', JSON.stringify(mergedAccounts));
          dbSet('accounts', mergedAccounts, Date.now()).catch(err => console.error("Error setting IndexedDB accounts", err));
        }
      }
    } catch (e) {
      console.error("Failed to fetch accounts", e);
    }
  };

  const loadLocalCache = async () => {
    try {
      const cachedQuotes = localStorage.getItem('artisan_quotes');
      const cachedCategories = localStorage.getItem('artisan_categories');
      const cachedLibrary = localStorage.getItem('artisan_library');
      const cachedSettings = localStorage.getItem('artisan_settings');
      const cachedAccounts = localStorage.getItem('artisan_accounts');

      if (cachedQuotes) setQuotations(JSON.parse(cachedQuotes));
      if (cachedCategories) setCategories(JSON.parse(cachedCategories));
      if (cachedLibrary) setStandardItems(JSON.parse(cachedLibrary));
      if (cachedSettings) setSettings(JSON.parse(cachedSettings));
      if (cachedAccounts) setAccountsList(JSON.parse(cachedAccounts));

      // Try reading from IndexedDB as the ultimate persistent fallback layer
      try {
        const dbQuotes = await dbGet('quotes');
        const dbCategories = await dbGet('categories');
        const dbLibrary = await dbGet('library');
        const dbSettings = await dbGet('settings');
        const dbAccounts = await dbGet('accounts');

        if (dbQuotes && dbQuotes.data) setQuotations(dbQuotes.data);
        if (dbCategories && dbCategories.data) setCategories(dbCategories.data);
        if (dbLibrary && dbLibrary.data) setStandardItems(dbLibrary.data);
        if (dbSettings && dbSettings.data) setSettings(dbSettings.data);
        if (dbAccounts && dbAccounts.data) setAccountsList(dbAccounts.data);
      } catch (idbErr) {
        console.warn("Could not load backup from IndexedDB, falling back to localStorage", idbErr);
      }
    } catch (err) {
      console.error("Failed to load local storage cache", err);
    }
  };

  const handleBootAndFetch = async (token: string, user: { username: string; role: string; displayName: string }) => {
    setIsLoading(true);
    try {
      if (user.username === 'local_user' || token === 'local_token') {
        await loadLocalCache();
        setIsLoading(false);
        return;
      }

      const res = await fetch('/api/data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Robust merge strategy: prevents offline edits/additions from being overwritten on boot sync
          let localQuotes: Quotation[] = [];
          const cachedQuotes = localStorage.getItem('artisan_quotes');
          if (cachedQuotes) {
            try {
              localQuotes = JSON.parse(cachedQuotes);
            } catch (e) {}
          } else {
            try {
              const dbQuotes = await dbGet('quotes');
              if (dbQuotes && dbQuotes.data) localQuotes = dbQuotes.data;
            } catch (e) {}
          }

          const mergedQuotes = mergeQuotations(localQuotes, data.quotes || []);
          
          setQuotations(mergedQuotes);
          setCategories(data.categories || DEFAULT_CATEGORIES);
          setStandardItems(data.library || DEFAULT_STANDARD_ITEMS);
          setSettings(data.settings || DEFAULT_SETTINGS);

          // Save the merged result
          const now = Date.now();
          localStorage.setItem('artisan_quotes', JSON.stringify(mergedQuotes));
          localStorage.setItem('artisan_quotes_time', now.toString());
          dbSet('quotes', mergedQuotes, now).catch(err => console.error("Error setting IndexedDB quotes", err));
          
          localStorage.setItem('artisan_categories', JSON.stringify(data.categories || DEFAULT_CATEGORIES));
          localStorage.setItem('artisan_categories_time', now.toString());
          dbSet('categories', data.categories || DEFAULT_CATEGORIES, now).catch(err => console.error("Error setting IndexedDB categories", err));
          
          localStorage.setItem('artisan_library', JSON.stringify(data.library || DEFAULT_STANDARD_ITEMS));
          localStorage.setItem('artisan_library_time', now.toString());
          dbSet('library', data.library || DEFAULT_STANDARD_ITEMS, now).catch(err => console.error("Error setting IndexedDB library", err));
          
          localStorage.setItem('artisan_settings', JSON.stringify(data.settings || DEFAULT_SETTINGS));
          localStorage.setItem('artisan_settings_time', now.toString());
          dbSet('settings', data.settings || DEFAULT_SETTINGS, now).catch(err => console.error("Error setting IndexedDB settings", err));

          // If there were offline changes that got merged, push the merged list to the server
          if (JSON.stringify(mergedQuotes) !== JSON.stringify(data.quotes)) {
            console.log("Offline changes merged, pushing to server...");
            await syncWithServer(mergedQuotes);
          }

          if (user.role === 'admin') {
            await fetchAccounts(token);
          }
        }
      } else if (res.status === 401) {
        handleLogout();
      } else {
        await loadLocalCache();
        setNotification({ message: "與伺服器連線失敗，已自動載入本機快取資料", type: "info" });
      }
    } catch (e) {
      console.error("Boot load error", e);
      await loadLocalCache();
      setNotification({ message: "與伺服器連線失敗，已自動載入本機快取資料", type: "info" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const defaultUser = {
      username: 'whlee',
      role: 'admin',
      displayName: '系統管理員'
    };
    
    // Set localStorage fallback as well
    localStorage.setItem('artisan_token', 'whlee');
    localStorage.setItem('artisan_user', JSON.stringify(defaultUser));
    
    setCurrentUser(defaultUser);
    setSessionToken('whlee');
    handleBootAndFetch('whlee', defaultUser);
  }, []);

  useEffect(() => {
    if (settings && typeof settings.isDarkMode !== 'undefined') {
      document.documentElement.classList.toggle('dark', !!settings.isDarkMode);
    }
  }, [settings?.isDarkMode]);

  // Auto-dismiss notifications after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const syncWithServer = async (
    updatedQuotes?: Quotation[],
    updatedCategories?: string[],
    updatedLibrary?: Record<string, StandardItem[]>,
    updatedSettings?: QuoteSettings
  ) => {
    const token = sessionToken || localStorage.getItem('artisan_token');
    if (!token || token === 'local_token' || currentUser?.username === 'local_user') return;

    try {
      const payload = {
        quotes: updatedQuotes || quotations,
        categories: updatedCategories || categories,
        library: updatedLibrary || standardItems,
        settings: updatedSettings || settings
      };
      
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          handleLogout();
          throw new Error('登入已逾期，請重新登入');
        }
        throw new Error('伺服器儲存失敗');
      }
    } catch (error) {
      console.error("Failed to sync with server", error);
      setNotification({
        message: error instanceof Error ? error.message : "無法同步至雲端伺服器，資料目前僅存於本地",
        type: 'error'
      });
    }
  };

  const syncQuotes = (newQuotes: Quotation[]) => {
    setQuotations(newQuotes);
    const now = Date.now();
    localStorage.setItem('artisan_quotes', JSON.stringify(newQuotes));
    localStorage.setItem('artisan_quotes_time', now.toString());
    dbSet('quotes', newQuotes, now).catch(err => console.error("Error setting IndexedDB quotes", err));
    syncWithServer(newQuotes);
  };

  const syncLibrary = (newLibrary: Record<string, StandardItem[]>) => {
    setStandardItems(newLibrary);
    const now = Date.now();
    localStorage.setItem('artisan_library', JSON.stringify(newLibrary));
    localStorage.setItem('artisan_library_time', now.toString());
    dbSet('library', newLibrary, now).catch(err => console.error("Error setting IndexedDB library", err));
    syncWithServer(undefined, undefined, newLibrary);
  };

  const syncCategories = (newCategories: string[]) => {
    setCategories(newCategories);
    const now = Date.now();
    localStorage.setItem('artisan_categories', JSON.stringify(newCategories));
    localStorage.setItem('artisan_categories_time', now.toString());
    dbSet('categories', newCategories, now).catch(err => console.error("Error setting IndexedDB categories", err));
    syncWithServer(undefined, newCategories);
  };

  const syncSettings = (newSettings: QuoteSettings) => {
    setSettings(newSettings);
    const now = Date.now();
    localStorage.setItem('artisan_settings', JSON.stringify(newSettings));
    localStorage.setItem('artisan_settings_time', now.toString());
    dbSet('settings', newSettings, now).catch(err => console.error("Error setting IndexedDB settings", err));
    syncWithServer(undefined, undefined, undefined, newSettings);
  };

  // --- ACCOUNT OPERATIONS FOR ADMIN ---
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountActionError(null);
    if (!newAccUsername || !newAccPassword) {
      setAccountActionError('帳號及密碼不可為空');
      return;
    }

    // Local / offline mode account creation
    if (sessionToken === 'local_token' || currentUser?.username === 'local_user') {
      const normalizedUsername = newAccUsername.trim().toLowerCase();
      const exists = accountsList.some(a => a.username.toLowerCase() === normalizedUsername);
      if (exists) {
        setAccountActionError('此帳號已存在於本機');
        return;
      }
      
      const newAccount = {
        username: newAccUsername.trim(),
        password: newAccPassword,
        role: newAccRole,
        displayName: newAccDisplayName || newAccUsername.trim(),
        createdAt: new Date().toISOString()
      };
      
      const updatedAccounts = [...accountsList, newAccount];
      setAccountsList(updatedAccounts);
      localStorage.setItem('artisan_accounts', JSON.stringify(updatedAccounts));
      dbSet('accounts', updatedAccounts, Date.now()).catch(err => console.error("Error setting IndexedDB accounts", err));
      
      setNewAccUsername('');
      setNewAccPassword('');
      setNewAccDisplayName('');
      setNotification({ message: '本機帳號建立成功！', type: 'success' });
      return;
    }

    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          username: newAccUsername,
          password: newAccPassword,
          role: newAccRole,
          displayName: newAccDisplayName
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNewAccUsername('');
        setNewAccPassword('');
        setNewAccDisplayName('');
        setNotification({ message: '帳號新增成功！', type: 'success' });
        if (sessionToken) fetchAccounts(sessionToken);
      } else {
        setAccountActionError(data.message || '新增帳號失敗');
      }
    } catch (error) {
      setAccountActionError('連線錯誤，請稍後再試');
    }
  };

  const handleDeleteAccount = async (targetUser: string) => {
    if (targetUser.toLowerCase() === 'whlee') {
      setNotification({ message: '無法刪除預設管理員帳號！', type: 'error' });
      return;
    }

    // Local / offline mode account deletion
    if (sessionToken === 'local_token' || currentUser?.username === 'local_user') {
      showConfirm(
        '刪除帳戶確認',
        `確定要從本機永久刪除帳戶「${targetUser}」嗎？此操作無法還原。`,
        async () => {
          const updatedAccounts = accountsList.filter(a => a.username.toLowerCase() !== targetUser.toLowerCase());
          setAccountsList(updatedAccounts);
          localStorage.setItem('artisan_accounts', JSON.stringify(updatedAccounts));
          dbSet('accounts', updatedAccounts, Date.now()).catch(err => console.error("Error setting IndexedDB accounts", err));
          setNotification({ message: '本機帳戶刪除成功！', type: 'success' });
        }
      );
      return;
    }

    showConfirm(
      '刪除帳戶確認',
      `確定要永久刪除帳戶「${targetUser}」嗎？此操作無法還原。`,
      async () => {
        try {
          const res = await fetch(`/api/accounts/${targetUser}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${sessionToken}`
            }
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setNotification({ message: '帳戶刪除成功！', type: 'success' });
            if (sessionToken) fetchAccounts(sessionToken);
          } else {
            setNotification({ message: data.message || '刪除帳戶失敗', type: 'error' });
          }
        } catch (error) {
          setNotification({ message: '連線錯誤，無法刪除帳戶', type: 'error' });
        }
      }
    );
  };

  const handleUpdatePassword = async (targetUser: string, newPass: string) => {
    if (!newPass) return;

    // Local / offline mode update password
    if (sessionToken === 'local_token' || currentUser?.username === 'local_user') {
      const updatedAccounts = accountsList.map(a => {
        if (a.username.toLowerCase() === targetUser.toLowerCase()) {
          return { ...a, password: newPass };
        }
        return a;
      });
      setAccountsList(updatedAccounts);
      localStorage.setItem('artisan_accounts', JSON.stringify(updatedAccounts));
      dbSet('accounts', updatedAccounts, Date.now()).catch(err => console.error("Error setting IndexedDB accounts", err));
      setNotification({ message: '本機密碼已成功更新！', type: 'success' });
      return;
    }

    try {
      const res = await fetch(`/api/accounts/${targetUser}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ password: newPass })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({ message: '密碼已成功更新！', type: 'success' });
        if (sessionToken) fetchAccounts(sessionToken);
      } else {
        setNotification({ message: data.message || '更新密碼失敗', type: 'error' });
      }
    } catch (error) {
      setNotification({ message: '連線錯誤，無法更新密碼', type: 'error' });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    if (!loginUsername || !loginPassword) {
      setLoginError('請輸入帳號與密碼');
      setLoginLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername.trim(), password: loginPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('artisan_token', data.token);
        localStorage.setItem('artisan_user', JSON.stringify(data.user));
        setSessionToken(data.token);
        setCurrentUser(data.user);
        
        setLoginUsername('');
        setLoginPassword('');
        
        await handleBootAndFetch(data.token, data.user);
        setNotification({ message: `歡迎回來，${data.user.displayName}！`, type: 'success' });
      } else {
        setLoginError(data.message || '登入失敗，帳號或密碼錯誤');
      }
    } catch (error) {
      // Intelligent offline fallback login
      try {
        const cachedAccountsStr = localStorage.getItem('artisan_accounts');
        let matchedUser = null;
        if (cachedAccountsStr) {
          const cachedAccounts = JSON.parse(cachedAccountsStr);
          matchedUser = cachedAccounts.find((a: any) => 
            a.username.trim().toLowerCase() === loginUsername.trim().toLowerCase() && 
            a.password === loginPassword
          );
        }
        
        if (matchedUser) {
          const offlineUser = {
            username: matchedUser.username,
            role: matchedUser.role,
            displayName: matchedUser.displayName || matchedUser.username
          };
          localStorage.setItem('artisan_token', 'local_token');
          localStorage.setItem('artisan_user', JSON.stringify(offlineUser));
          setSessionToken('local_token');
          setCurrentUser(offlineUser);
          
          setLoginUsername('');
          setLoginPassword('');
          
          await handleBootAndFetch('local_token', offlineUser);
          setNotification({ message: `離線登入成功！歡迎回來，${offlineUser.displayName}。`, type: 'info' });
          return;
        }
      } catch (err) {
        console.error("Offline login fallback error", err);
      }

      setLoginError('連線伺服器失敗，請確認伺服器是否正常運作。您也可以點擊下方「本地單機模式」以登入系統！');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('artisan_token');
    localStorage.removeItem('artisan_user');
    setCurrentUser(null);
    setSessionToken(null);
    setQuotations([]);
    setAccountsList([]);
    setNotification({ message: '您已成功登出系統。', type: 'info' });
  };

  const handleEnterLocalMode = async () => {
    const localUser = {
      username: 'local_user',
      role: 'admin',
      displayName: '本地單機管理員'
    };
    localStorage.setItem('artisan_token', 'local_token');
    localStorage.setItem('artisan_user', JSON.stringify(localUser));
    setCurrentUser(localUser);
    setSessionToken('local_token');
    setLoginError(null);
    await handleBootAndFetch('local_token', localUser);
  };

  // Synchronizes the current active editingQuote's modifications directly to the quotation list in state & storage
  const updateEditingQuoteStateAndSync = (updatedQuote: Quotation) => {
    const updatedQuoteWithTime = {
      ...updatedQuote,
      updatedAt: Date.now()
    };
    setEditingQuote(updatedQuoteWithTime);
    
    // Check if we can find the matching contract using originalQuoteId
    const index = originalQuoteId ? quotations.findIndex(q => q.id === originalQuoteId) : -1;
    let updatedQuotes: Quotation[];
    
    if (index >= 0) {
      updatedQuotes = [...quotations];
      updatedQuotes[index] = updatedQuoteWithTime;
    } else {
      // Fallback: If originalQuoteId is null or not found, check if it already exists by the new ID
      const existsIdx = quotations.findIndex(q => q.id === updatedQuote.id);
      if (existsIdx >= 0) {
        updatedQuotes = [...quotations];
        updatedQuotes[existsIdx] = updatedQuoteWithTime;
      } else {
        // If it doesn't exist yet, prepends it to the list
        updatedQuotes = [updatedQuoteWithTime, ...quotations];
      }
    }
    
    syncQuotes(updatedQuotes);
    // Crucial: Update the tracking ID to match the new ID to prevent duplicates if user edits further items
    setOriginalQuoteId(updatedQuote.id);
  };


  // --- ONLINE / OFFLINE DETECTOR ---
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- SHOW TOAST HELPER ---
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
  };

  // --- SEARCH AND FILTER LOGIC ---
  const filteredQuotations = useMemo(() => {
    return quotations.filter(quote => {
      const matchStatus = statusFilter === 'all' || quote.status === statusFilter;
      const lowerQuery = searchQuery.trim().toLowerCase();
      const matchSearch = !lowerQuery || 
        quote.customerName.toLowerCase().includes(lowerQuery) ||
        quote.phone.includes(lowerQuery) ||
        quote.address.toLowerCase().includes(lowerQuery) ||
        quote.id.toLowerCase().includes(lowerQuery);
      return matchStatus && matchSearch;
    });
  }, [quotations, searchQuery, statusFilter]);

  // --- STATS COUNTING ---
  const stats = useMemo(() => {
    const counts = {
      pending: 0,
      quoted: 0,
      signed: 0,
      constructing: 0,
      completed: 0,
      cancelled: 0,
    };
    quotations.forEach(q => {
      if (counts[q.status] !== undefined) {
        counts[q.status]++;
      }
    });
    return counts;
  }, [quotations]);

  // --- CRUDS FOR QUOTATION ---
  
  // Initiates an empty quotation template by opening a modal for ID and client name input
  const handleInitiateNewQuote = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timestamp = now.getTime().toString().slice(-4);
    const suggestedId = `QT-${dateStr.replace(/-/g, '')}-${timestamp}`;
    
    setNewQuoteModal({
      isOpen: true,
      suggestedId,
      id: suggestedId,
      customerName: ''
    });
  };

  // Callback to finalize the creation of quotation after modal confirmation
  const handleConfirmCreateQuote = (id: string, customerName: string) => {
    if (!id.trim()) {
      showToast('請填寫報價合約單號', 'error');
      return;
    }
    const exists = quotations.some(q => q.id === id.trim());
    if (exists) {
      showToast('該單號已存在，請使用不同的單號', 'error');
      return;
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    
    const newQuoteObj: Quotation = {
      id: id.trim(),
      customerName: customerName.trim(),
      phone: '',
      address: '',
      date: dateStr,
      status: 'pending',
      version: 'v1.0',
      items: [],
      remarks: settings.defaultTerms,
      discount: 0,
      depositPercent: 40,
      progressPercent: 40,
      balancePercent: 20,
      assignedTo: currentUser?.username || 'whlee'
    };

    setEditingQuote(newQuoteObj);
    setOriginalQuoteId(newQuoteObj.id);
    setLastSavedQuoteJson(JSON.stringify(newQuoteObj));
    setIsEditingNew(true);
    setNewQuoteModal(null);
  };

  // Saves or edits the quotation in list
  const handleSaveQuotation = (shouldExitAfterSave: boolean = false) => {
    if (!editingQuote) return;
    if (!editingQuote.id.trim()) {
      showToast('請填寫或確認報價合約單號', 'error');
      return;
    }
    if (!editingQuote.customerName.trim()) {
      showToast('請填寫客戶姓名', 'error');
      return;
    }

    // Check if the modified ID already exists in other contracts to prevent overlapping duplicates
    const idExists = quotations.some(q => q.id === editingQuote.id.trim() && q.id !== originalQuoteId);
    if (idExists) {
      showToast('此報價單號已存在，請使用不同的單號', 'error');
      return;
    }

    const finalizedQuote = {
      ...editingQuote,
      id: editingQuote.id.trim(),
      updatedAt: Date.now()
    };

    let updatedQuotes = [...quotations];
    const index = originalQuoteId ? quotations.findIndex(q => q.id === originalQuoteId) : -1;

    if (index >= 0) {
      updatedQuotes[index] = finalizedQuote;
      showToast('報價單更新成功');
    } else {
      updatedQuotes = [finalizedQuote, ...updatedQuotes];
      showToast('報價單創建成功');
    }

    syncQuotes(updatedQuotes);
    setLastSavedQuoteJson(JSON.stringify(finalizedQuote));

    if (shouldExitAfterSave) {
      setEditingQuote(null);
      setOriginalQuoteId(null);
      setIsEditingNew(false);
    } else {
      setEditingQuote(finalizedQuote);
      setOriginalQuoteId(finalizedQuote.id);
      setIsEditingNew(false);
    }
  };

  // Exit draft function with change check
  const handleExitEditing = () => {
    if (!editingQuote) return;
    
    const isDirty = lastSavedQuoteJson ? JSON.stringify(editingQuote) !== lastSavedQuoteJson : false;
    
    if (isDirty) {
      setConfirmDialog({
        isOpen: true,
        title: '退出草稿編輯',
        message: '您的裝修合約草稿有未儲存的修改。您想在退出前儲存這些變更嗎？',
        onConfirm: () => {
          handleSaveQuotation(true);
          setConfirmDialog(null);
        },
        confirmText: '儲存並退出',
        cancelText: '取消',
        onAltConfirm: () => {
          setEditingQuote(null);
          setOriginalQuoteId(null);
          setIsEditingNew(false);
          setConfirmDialog(null);
        },
        altConfirmText: '直接退出 (不儲存)'
      });
    } else {
      setEditingQuote(null);
      setOriginalQuoteId(null);
      setIsEditingNew(false);
    }
  };

  // Previews the current editing quotation
  const handlePreviewEditingQuote = () => {
    if (!editingQuote) return;
    if (!editingQuote.id.trim()) {
      showToast('請填寫或確認報價合約單號', 'error');
      return;
    }
    if (!editingQuote.customerName.trim()) {
      showToast('請填寫客戶姓名', 'error');
      return;
    }
    const finalizedQuote = {
      ...editingQuote,
      id: editingQuote.id.trim()
    };
    updateEditingQuoteStateAndSync(finalizedQuote);
    setPreviewQuote(finalizedQuote);
  };

  // Prints the current editing quotation
  const handlePrintEditingQuote = () => {
    if (!editingQuote) return;
    if (!editingQuote.id.trim()) {
      showToast('請填寫或確認報價合約單號', 'error');
      return;
    }
    if (!editingQuote.customerName.trim()) {
      showToast('請填寫客戶姓名', 'error');
      return;
    }
    const finalizedQuote = {
      ...editingQuote,
      id: editingQuote.id.trim()
    };
    updateEditingQuoteStateAndSync(finalizedQuote);
    handleTriggerPrint(finalizedQuote);
  };

  // Deletes quotation
  const handleDeleteQuote = (id: string) => {
    showConfirm(
      '確認永久刪除',
      '確定要永久刪除此報價單嗎？此操作不可復原。',
      () => {
        const updated = quotations.filter(q => q.id !== id);
        syncQuotes(updated);
        showToast('報價單已刪除', 'info');
      },
      '確定刪除',
      '取消'
    );
  };

  // Clones quotation
  const handleCloneQuote = (sourceQuote: Quotation) => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timestamp = now.getTime().toString().slice(-4);
    const newId = `QT-${dateStr.replace(/-/g, '')}-${timestamp}`;
    
    const cloned: Quotation = {
      ...sourceQuote,
      id: newId,
      date: dateStr,
      status: 'pending',
      version: `${sourceQuote.version || 'v1.0'} (複本)`,
      updatedAt: Date.now()
    };

    const updated = [cloned, ...quotations];
    syncQuotes(updated);
    showToast('報價單複製成功，已生成新一頁草稿');
  };

  // Fast Update Status on Row
  const handleUpdateStatus = (id: string, newStatus: QuotationStatus) => {
    const updated = quotations.map(q => {
      if (q.id === id) {
        return { ...q, status: newStatus, updatedAt: Date.now() };
      }
      return q;
    });
    syncQuotes(updated);
    showToast(`狀態已更新為【${getStatusLabel(newStatus)}】`);
  };

  // Status mapping labels and styles
  const getStatusLabel = (status: QuotationStatus) => {
    const labels: Record<QuotationStatus, string> = {
      pending: '未報價',
      quoted: '報價待回覆',
      signed: '已簽約',
      constructing: '施工中',
      completed: '完工結清',
      cancelled: '作廢'
    };
    return labels[status] || status;
  };

  const getStatusStyle = (status: QuotationStatus) => {
    const styles: Record<QuotationStatus, { bg: string, text: string }> = {
      pending: { bg: 'bg-gray-100', text: 'text-gray-700' },
      quoted: { bg: 'bg-amber-100', text: 'text-amber-800' },
      signed: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
      constructing: { bg: 'bg-blue-100', text: 'text-blue-800' },
      completed: { bg: 'bg-purple-100', text: 'text-purple-800' },
      cancelled: { bg: 'bg-rose-100', text: 'text-rose-800' }
    };
    return styles[status] || { bg: 'bg-gray-100', text: 'text-gray-700' };
  };

  // --- GET PAYMENT STAGES DYNAMICALLY ---
  const getPaymentStages = (quote: Quotation): PaymentStage[] => {
    if (quote.paymentStages && quote.paymentStages.length > 0) {
      return quote.paymentStages;
    }
    // Backward compatibility for standard 3-stage percentages with fallback 30/50/20 values
    return [
      { name: '第一期', percent: quote.depositPercent ?? 30, remark: '工程簽署訂金 (備料及開工準備)' },
      { name: '第二期', percent: quote.progressPercent ?? 50, remark: '泥水沙磚及水電隱蔽工程驗收合格後支付' },
      { name: '第三期', percent: quote.balancePercent ?? 20, remark: '基本完工並驗收合格，辦理交接前結清' }
    ];
  };

  // --- CALCULATE QUOTE FINANCIALS ---
  const getQuoteFinancials = (quote: Quotation) => {
    const subtotal = quote.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const discountsList = quote.enableDiscounts
      ? (quote.discounts && quote.discounts.length > 0
          ? quote.discounts
          : (quote.discount > 0 ? [{ id: 'legacy', amount: quote.discount, targetItemId: quote.discountTargetItemId }] : []))
      : [];
    const totalDiscount = discountsList.reduce((sum, d) => sum + (d.amount || 0), 0);
    const grandTotal = Math.max(0, subtotal - totalDiscount);
    
    // Percentage splits
    const depositVal = Math.round(grandTotal * ((quote.depositPercent ?? 30) / 100));
    const progressVal = Math.round(grandTotal * ((quote.progressPercent ?? 50) / 100));
    const balanceVal = Math.round(grandTotal - depositVal - progressVal); 

    // Dynamic payment stages values
    const stages = getPaymentStages(quote);
    let cumulative = 0;
    const stageValues = stages.map((s, idx) => {
      if (idx === stages.length - 1) {
        // Last stage takes the remaining residual to avoid floating point mismatch
        const val = Math.max(0, grandTotal - cumulative);
        return { ...s, val };
      } else {
        const val = Math.round(grandTotal * (s.percent / 100));
        cumulative += val;
        return { ...s, val };
      }
    });

    return {
      subtotal,
      grandTotal,
      depositVal,
      progressVal,
      balanceVal,
      stageValues
    };
  };

  // --- PAGINATE QUOTATION ITEMS FOR A4 PRINT/PREVIEW ---
  interface RenderNode {
    type: 'category-header' | 'item' | 'category-subtotal';
    key: string;
    category?: string;
    item?: QuotationItem & { indexOnPageList: number };
    subtotal?: number;
  }

  const paginateNodes = (quote: Quotation): RenderNode[][] => {
    const nodes: RenderNode[] = [];

    categories.forEach(cat => {
      const catItems = quote.items.filter(i => i.category === cat);
      if (catItems.length === 0) return;
      
      nodes.push({
        type: 'category-header',
        key: `cat-header-${cat}`,
        category: cat
      });

      let categoryIndex = 1;
      catItems.forEach(item => {
        nodes.push({
          type: 'item',
          key: `item-${item.id}`,
          item: { ...item, indexOnPageList: categoryIndex++ },
          category: cat
        });
      });

      const catSubtotal = catItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
      nodes.push({
        type: 'category-subtotal',
        key: `cat-subtotal-${cat}`,
        category: cat,
        subtotal: catSubtotal
      });
    });

    const getNodeWeight = (node: RenderNode): number => {
      if (node.type === 'category-header') return 1.2;
      if (node.type === 'category-subtotal') return 1.0;
      // item
      const base = 1.0;
      const remarkLines = node.item?.remark ? node.item.remark.split('\n').length : 0;
      return base + (remarkLines * 0.45);
    };

    const pages: RenderNode[][] = [];
    let currentPage: RenderNode[] = [];
    let currentWeight = 0;

    const totalWeight = nodes.reduce((sum, n) => sum + getNodeWeight(n), 0);
    const totalsWeight = 3.5;

    // Standard page capacities in weight units
    const page1Limit = 22.0;
    const contPageLimit = 28.0;

    // If everything fits on page 1 with totals block
    if (totalWeight + totalsWeight <= page1Limit) {
      pages.push(nodes);
      return pages;
    }

    // Otherwise paginate
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const weight = getNodeWeight(node);
      const isFirstPage = pages.length === 0;
      const limit = isFirstPage ? page1Limit : contPageLimit;

      // Check if we can fit all remaining nodes (including this one) + totals on the current page.
      // If we can, they should stay together on this final page.
      const remainingNodes = nodes.slice(i);
      const remainingWeight = remainingNodes.reduce((sum, n) => sum + getNodeWeight(n), 0);

      if (currentWeight + remainingWeight + totalsWeight <= limit) {
        currentPage.push(...remainingNodes);
        pages.push(currentPage);
        currentPage = [];
        break;
      }

      // If adding this single node overflows the limit, we push current page and start a new one.
      if (currentWeight > 0 && currentWeight + weight > limit) {
        pages.push(currentPage);
        currentPage = [node];
        currentWeight = weight;
      } else {
        currentPage.push(node);
        currentWeight += weight;
      }
    }

    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    return pages;
  };

  const renderQuotationPages = (quote: Quotation, isPrintMode: boolean) => {
    const itemPages = paginateNodes(quote);
    const totalPages = itemPages.length + 1;

    const getPageSpacing = (nodeCount: number) => {
      if (nodeCount <= 6) {
        return {
          tdPadding: "py-3 px-3",
          fontSize: "text-[11px]",
          headerFontSize: "text-[12px]",
          remarkFontSize: "text-[9.5px]",
          tableTextSize: "text-[11px]"
        };
      } else if (nodeCount <= 12) {
        return {
          tdPadding: "py-2 px-2.5",
          fontSize: "text-[10px]",
          headerFontSize: "text-[11.5px]",
          remarkFontSize: "text-[9px]",
          tableTextSize: "text-[10px]"
        };
      } else if (nodeCount <= 18) {
        return {
          tdPadding: "py-1.5 px-2",
          fontSize: "text-[9.5px]",
          headerFontSize: "text-[11px]",
          remarkFontSize: "text-[8.5px]",
          tableTextSize: "text-[9.5px]"
        };
      } else if (nodeCount <= 24) {
        return {
          tdPadding: "py-1 px-1.5",
          fontSize: "text-[9px]",
          headerFontSize: "text-[10.5px]",
          remarkFontSize: "text-[8px]",
          tableTextSize: "text-[9px]"
        };
      } else {
        return {
          tdPadding: "py-0.5 px-1",
          fontSize: "text-[8.5px]",
          headerFontSize: "text-[9.5px]",
          remarkFontSize: "text-[7.5px]",
          tableTextSize: "text-[8.5px]"
        };
      }
    };

    return (
      <div className={`flex flex-col ${isPrintMode ? 'w-full' : 'gap-8 w-full max-w-[210mm] lg:max-w-max'} text-black font-sans leading-relaxed text-[11px]`}>
        {/* ================= DYNAMIC ITEM PAGES ================= */}
        {itemPages.map((pageNodes, X) => {
          const spacing = getPageSpacing(pageNodes.length);
          return (
            <div 
              key={`page-${X}`} 
              className={`bg-white flex flex-col justify-between ${isPrintMode ? 'border-none p-[10mm_12mm_10mm_12mm] shadow-none m-0 rounded-none w-full' : 'p-[15mm] shadow-2xl border border-gray-300 rounded-sm w-full'}`} 
              style={isPrintMode ? { height: '296mm', maxHeight: '296mm', overflow: 'hidden', boxSizing: 'border-box', pageBreakAfter: 'always', breakAfter: 'always', pageBreakInside: 'avoid' } : { minHeight: '297mm', pageBreakAfter: 'always' }}
            >
              <div>
                {/* Header row */}
                {X === 0 ? (
                  /* Page 1 Cover style Header row with logo and text */
                  <div className="flex justify-between items-start border-b-2 border-gray-950 pb-3 mb-6">
                    <div className="flex items-center gap-3">
                      <img 
                        src="https://render.lingguangobjects.com/p/yuyan/200031800011272542/assets/resource_4c0f1c50-BlUje_KV.png" 
                        alt="Artisan Studio Limited Logo"
                        referrerPolicy="no-referrer"
                        className="h-12 w-auto object-contain"
                      />
                      <div className="text-left">
                        <h1 className="text-lg font-black text-slate-900 tracking-tight">Artisan Studio Limited</h1>
                        <p className="text-[9px] text-amber-700 font-bold tracking-widest mt-0.5 uppercase text-left">QUOTATION</p>
                      </div>
                    </div>
                    <div className="text-right text-[10px] space-y-1">
                      <div><span className="font-semibold text-gray-500">報價單號：</span><span className="font-mono text-gray-900 font-bold">{quote.id}</span></div>
                      <div><span className="font-semibold text-gray-500">日期：</span><span className="font-mono text-gray-900">{quote.date}</span></div>
                    </div>
                  </div>
                ) : (
                  /* Continuation small header row */
                  <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-6">
                    <div className="flex items-center gap-2">
                      <img 
                        src="https://render.lingguangobjects.com/p/yuyan/200031800011272542/assets/resource_4c0f1c50-BlUje_KV.png" 
                        alt="Artisan Studio" 
                        className="h-8 w-auto object-contain"
                      />
                      <span className="font-bold text-slate-800 text-xs">Artisan Studio Limited</span>
                    </div>
                    <span className="text-[8.5px] text-gray-400 font-mono">（續頁）單號: {quote.id}</span>
                  </div>
                )}

                {/* Customer metadata structured block */}
                {X === 0 && (
                  <div className="grid grid-cols-2 gap-y-1.5 border border-gray-300 rounded-lg p-3 bg-slate-50 text-[10px] mb-5">
                    <div className="flex text-left">
                      <span className="font-bold text-gray-500 w-20 flex-shrink-0">客戶姓名</span>
                      <span className="text-gray-900 font-bold">{quote.customerName}</span>
                    </div>
                    <div className="flex border-l border-gray-200 pl-4 text-left">
                      <span className="font-bold text-gray-500 w-20 flex-shrink-0">聯絡電話</span>
                      <span className="text-gray-900 font-semibold font-mono">{quote.phone}</span>
                    </div>
                    <div className="col-span-2 border-t border-gray-200 pt-1.5 flex text-left">
                      <span className="font-bold text-gray-500 w-20 flex-shrink-0">物業地址</span>
                      <span className="text-gray-900 font-semibold">{quote.address}</span>
                    </div>
                    <div className="col-span-2 border-t border-gray-200 pt-1.5 flex text-left">
                      <span className="font-bold text-gray-500 w-20 flex-shrink-0">負責人</span>
                      <span className="text-gray-900 font-semibold">LOUIS</span>
                    </div>
                  </div>
                )}

                {/* Categories and Items Table */}
                <div className="overflow-x-auto">
                  <table className={`w-full table-fixed text-left border-collapse border border-gray-300 ${spacing.tableTextSize} leading-tight`}>
                    <colgroup>
                      <col style={{ width: '5.5%' }} />
                      <col style={{ width: '47.5%' }} />
                      <col style={{ width: '7%' }} />
                      <col style={{ width: '7%' }} />
                      <col style={{ width: '16.5%' }} />
                      <col style={{ width: '16.5%' }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-slate-100 border-b border-gray-300">
                        <th className="p-1 border-r border-gray-300 font-bold text-gray-700 text-center whitespace-nowrap">編號</th>
                        <th className="p-1 border-r border-gray-300 font-bold text-gray-700">項目描述</th>
                        <th className="p-1 border-r border-gray-300 font-bold text-gray-700 text-center whitespace-nowrap">數量</th>
                        <th className="p-1 border-r border-gray-300 font-bold text-gray-700 text-center whitespace-nowrap">單位</th>
                        <th className="p-1 border-r border-gray-300 font-bold text-gray-700 text-right whitespace-nowrap">單價(HKD)</th>
                        <th className="p-1 font-bold text-gray-700 text-right whitespace-nowrap">金額(HKD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageNodes.map((node) => {
                        if (node.type === 'category-header') {
                          return (
                            <tr key={node.key} className="bg-slate-50 border-b border-gray-300">
                              <td className="bg-slate-200/60 border-t border-r border-gray-300"></td>
                              <td colSpan={5} className={`${spacing.tdPadding} font-black text-slate-800 tracking-wide ${spacing.headerFontSize} bg-slate-200/60 border-t border-gray-300 text-left leading-tight break-words whitespace-normal`}>
                                {node.category}
                              </td>
                            </tr>
                          );
                        } else if (node.type === 'category-subtotal') {
                          return (
                            <tr key={node.key} className="border-b border-gray-300 bg-slate-50">
                              <td colSpan={5} className={`${spacing.tdPadding} text-right font-semibold text-gray-500 border-r border-gray-300 leading-tight`}>小計</td>
                              <td className={`${spacing.tdPadding} text-right font-mono font-black text-slate-900 bg-slate-100 leading-tight whitespace-nowrap`}>HK${node.subtotal?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                          );
                        } else {
                          const item = node.item!;
                          return (
                            <tr key={node.key} className="border-b border-gray-200 hover:bg-slate-50">
                              <td className={`${spacing.tdPadding} border-r border-gray-300 text-center font-mono text-gray-500 leading-tight whitespace-nowrap`}>{item.indexOnPageList}</td>
                              <td className={`${spacing.tdPadding} border-r border-gray-300 text-left break-words whitespace-normal`}>
                                <div className={`font-bold text-gray-900 leading-tight ${spacing.fontSize} break-words whitespace-normal`}>{item.name}</div>
                                {item.remark && (
                                  <div className={`text-gray-500 whitespace-pre-wrap mt-0.5 leading-tight bg-slate-50 p-1 rounded ${spacing.remarkFontSize} break-words`}>{item.remark}</div>
                                )}
                              </td>
                              <td className={`${spacing.tdPadding} border-r border-gray-300 text-center font-mono leading-tight whitespace-nowrap`}>{item.quantity}</td>
                              <td className={`${spacing.tdPadding} border-r border-gray-300 text-center leading-tight whitespace-nowrap`}>{item.unit}</td>
                              <td className={`${spacing.tdPadding} border-r border-gray-300 text-right font-mono text-gray-600 leading-tight whitespace-nowrap`}>HK${item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className={`${spacing.tdPadding} text-right font-mono font-bold text-slate-900 leading-tight whitespace-nowrap`}>HK${(item.quantity * item.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                          );
                        }
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom total calculation segment & page footer */}
              <div className="mt-8 pt-4 border-t-2 border-gray-900 space-y-4">
                {X === itemPages.length - 1 && (
                  <div className="flex justify-end">
                    <div className="w-80 border border-gray-300 rounded-lg overflow-hidden text-[10px]">
                      {quote.enableDiscounts && (quote.discounts?.length || 0) > 0 ? (
                        <>
                          <div className="flex justify-between items-center p-2 border-b border-gray-200">
                            <span className="font-bold text-gray-500">原價小計 Subtotal</span>
                            <span className="font-mono text-gray-700">HK${getQuoteFinancials(quote).subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          {quote.discounts?.map((d, dIdx) => (
                            <div key={d.id || dIdx} className="flex justify-between items-center p-1.5 px-2 border-b border-gray-100 bg-rose-50/70 text-rose-700">
                              <span className="font-bold">
                                {d.targetItemId ? (
                                  `「${quote.items.find(i => i.id === d.targetItemId)?.name || '指定項目'}」特別折扣`
                                ) : (
                                  '合約特別折扣 (Discount)'
                                )}
                              </span>
                              <span className="font-mono font-bold">-HK${(d.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          ))}
                        </>
                      ) : null}
                      <div className="flex justify-between items-center p-2.5 bg-emerald-50 text-emerald-800">
                        <span className="font-black text-[11px]">工程總金額 (Contract Grand Total)</span>
                        <span className="font-mono font-black text-xs text-emerald-700">HK${getQuoteFinancials(quote).grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center text-[8.5px] text-gray-400 font-mono border-t border-gray-200 pt-3">
                  <span>© Artisan Studio Limited ． QUOTATION ． CONFIDENTIAL DOCUMENT</span>
                  <span>第 {X + 1} 頁，共 {totalPages} 頁</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* ================= FINAL PAGE (TERMS, SCHEDULING, SIGNATURES & BANKS) ================= */}
        <div 
          className={`bg-white flex flex-col justify-between ${isPrintMode ? 'border-none p-[10mm_12mm_10mm_12mm] shadow-none m-0 rounded-none w-full' : 'p-[15mm] shadow-2xl border border-gray-300 rounded-sm w-full'}`} 
          style={isPrintMode ? { height: '296mm', maxHeight: '296mm', overflow: 'hidden', boxSizing: 'border-box', pageBreakAfter: 'avoid', breakAfter: 'avoid', pageBreakInside: 'avoid' } : { minHeight: '297mm' }}
        >
          <div className="flex flex-col flex-grow">
            {/* Header row */}
            <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-4">
              <div className="flex items-center gap-2">
                <img 
                  src="https://render.lingguangobjects.com/p/yuyan/200031800011272542/assets/resource_4c0f1c50-BlUje_KV.png" 
                  alt="Artisan Studio" 
                  className="h-8 w-auto object-contain"
                />
                <span className="font-bold text-slate-800 text-xs">Artisan Studio Limited</span>
              </div>
              <span className="text-[8.5px] text-gray-400 font-mono">單號: {quote.id}</span>
            </div>

            {/* Payments stage schedule list */}
            <div className={isPrintMode ? "mb-1.5" : "mb-4"}>
              <h4 className={`bg-slate-800 text-white font-bold rounded flex items-center justify-between ${isPrintMode ? 'text-[8.5px] py-0.5 px-2 mb-1' : 'text-[9.5px] py-1 px-2.5 mb-2'}`}>
                <span>付款條款 (Payment Schedule Breakdown)</span>
                <span className="text-[8px] text-amber-400">依工程合約進度支付款項</span>
              </h4>
              <table className={`w-full table-fixed text-left border-collapse border border-gray-300 ${isPrintMode ? 'text-[8px]' : 'text-[8.5px]'}`}>
                <colgroup>
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '50%' }} />
                </colgroup>
                <thead>
                  <tr className="bg-slate-100 border-b border-gray-300 font-bold">
                    <th className="p-1 border-r border-gray-300 text-left">期數</th>
                    <th className="p-1 border-r border-gray-300 text-center">支付比例</th>
                    <th className="p-1 border-r border-gray-300 text-right">金額 (HKD)</th>
                    <th className="p-1 pl-3 text-left">備註</th>
                  </tr>
                </thead>
                <tbody>
                  {getQuoteFinancials(quote).stageValues.map((stage, idx) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className={`${isPrintMode ? 'p-0.5 px-1.5' : 'p-1'} border-r border-gray-300 font-bold text-left break-words`}>{stage.name}</td>
                      <td className={`${isPrintMode ? 'p-0.5' : 'p-1'} border-r border-gray-300 text-center font-mono break-words`}>{stage.percent}%</td>
                      <td className={`${isPrintMode ? 'p-0.5 px-1.5' : 'p-1'} border-r border-gray-300 text-right font-mono font-bold break-words whitespace-nowrap`}>HK${stage.val.toLocaleString()}</td>
                      <td className={`${isPrintMode ? 'p-0.5 pl-2' : 'p-1 pl-3'} text-gray-500 text-left break-words`}>{stage.remark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Contract rules 1 - 22 (Full width layout sequential downwards to prevent overflow) */}
            <div className={isPrintMode ? "mb-1.5" : "mb-3"}>
              <h4 className={`bg-[#E07A5F]/15 text-[#E07A5F] font-bold rounded border-l-4 border-[#E07A5F] text-left ${isPrintMode ? 'text-[8.5px] py-0.5 px-2 mb-1' : 'text-[9px] py-0.5 px-2.5 mb-1.5'}`}>
                合約條款 (Contract Terms & Clauses)
              </h4>
              <div className={`flex flex-col text-gray-700 text-justify w-full ${isPrintMode ? 'gap-0 text-[7.5px] leading-tight font-medium' : 'gap-0.5 text-[8.5px] leading-normal font-medium'}`}>
                {(() => {
                  const termsList = (quote.remarks || settings.defaultTerms).split('\n').filter(line => line.trim() !== '');
                  return termsList.map((line, idx) => (
                    <div key={idx} className="pl-0.5 text-left w-full text-gray-700">
                      {line}
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Signatures segment */}
            <div className={`grid grid-cols-2 relative mt-auto ${isPrintMode ? 'gap-4 bg-slate-50 border border-slate-200 rounded-lg p-2.5' : 'gap-8 bg-slate-50 border border-slate-200 rounded-xl p-4'}`}>
              {/* Client Confirmation */}
              <div className={`${isPrintMode ? 'space-y-2' : 'space-y-6'} text-left`}>
                <h5 className="font-black text-slate-800 text-[10px] border-b border-gray-200 pb-1">客戶確認 (Client Confirmation)</h5>
                <div className={isPrintMode ? "space-y-1.5" : "space-y-3"}>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8.5px] text-gray-400">客戶簽署 (Signature)：</span>
                    <div className={`border-b border-gray-400 w-44 ${isPrintMode ? 'h-5' : 'h-8'}`}></div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8.5px] text-gray-400">簽署日期 (Date)：</span>
                    <div className={`border-b border-gray-400 w-44 ${isPrintMode ? 'h-4' : 'h-5'}`}></div>
                  </div>
                </div>
              </div>

              {/* Company confirmation */}
              <div className={`${isPrintMode ? 'space-y-2 pl-4' : 'space-y-6 pl-8'} border-l border-slate-200 text-left`}>
                <h5 className="font-black text-slate-800 text-[10px] border-b border-gray-200 pb-1">公司確認 (Artisan Studio)</h5>
                <div className={isPrintMode ? "space-y-1.5" : "space-y-3"}>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8.5px] text-gray-400">代表簽名及蓋印 (Representative Signature)：</span>
                    <div className={`border-b border-gray-400 w-44 ${isPrintMode ? 'h-5' : 'h-8'}`}></div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8.5px] text-gray-400">簽署日期 (Date)：</span>
                    <div className={`border-b border-gray-400 w-44 ${isPrintMode ? 'h-4' : 'h-5'}`}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bank accounts information section fixed bottom */}
          <div className={`${isPrintMode ? 'mt-2 pt-1' : 'mt-4 pt-2'} border-t-2 border-gray-900 ${isPrintMode ? 'space-y-1.5' : 'space-y-3'}`}>
            <div className={`bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 gap-x-6 text-left ${isPrintMode ? 'p-1.5 gap-y-0.5 text-[8px]' : 'p-2 gap-y-1 text-[9px]'}`}>
              <div>
                <span className="font-bold text-gray-400">往來專用款項銀行：</span>
                <span className="text-slate-800 font-semibold">{settings.bankName || '中國銀行（香港）'}</span>
              </div>
              <div>
                <span className="font-bold text-gray-400">收款人名稱：</span>
                <span className="text-slate-800 font-semibold">{settings.companyName || 'Artisan Studio Limited'}</span>
              </div>
              <div>
                <span className="font-bold text-gray-400">官方指定帳戶號碼：</span>
                <span className="text-slate-800 font-semibold font-mono">{settings.bankAccount || '012-586-2-109941-2'}</span>
              </div>
              <div>
                <span className="font-bold text-gray-400">轉數快 ID (FPS ID)：</span>
                <span className="text-amber-700 font-black font-mono">{settings.fpsId || '121966964'}</span>
              </div>
            </div>

            <div className={`flex justify-between items-center text-[8px] text-gray-400 font-mono border-t border-gray-200 ${isPrintMode ? 'pt-1 mt-1' : 'pt-2'}`}>
              <span>© Artisan Studio Limited ． EST. 2026 ． REGULATED IN HK SAR</span>
              <span>第 {itemPages.length + 1} 頁，共 {totalPages} 頁</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStandaloneSchedulePage = (quote: Quotation, isPrintMode: boolean) => {
    return (
      <div 
        className={`bg-white flex flex-col justify-between ${isPrintMode ? 'print-landscape border-none p-[10mm_12mm_10mm_12mm] shadow-none m-0 rounded-none w-full' : 'p-[15mm] shadow-2xl border border-gray-300 rounded-sm w-[297mm] min-h-[210mm] max-w-full overflow-x-auto overflow-y-hidden'}`} 
        style={isPrintMode ? { height: '210mm', maxHeight: '210mm', overflow: 'hidden', boxSizing: 'border-box', pageBreakAfter: 'always', breakAfter: 'always', pageBreakInside: 'avoid' } : { minHeight: '210mm' }}
      >
        <div className="flex flex-col flex-grow text-left">
          {/* Header row */}
          <div className="flex justify-between items-center border-b border-gray-200 pb-1.5 mb-2.5">
            <div className="flex items-center gap-2">
              <img 
                src="https://render.lingguangobjects.com/p/yuyan/200031800011272542/assets/resource_4c0f1c50-BlUje_KV.png" 
                alt="Artisan Studio" 
                className="h-8 w-auto object-contain"
              />
              <span className="font-bold text-slate-800 text-xs text-left">Artisan Studio Limited</span>
            </div>
            <span className="text-[8.5px] text-gray-400 font-mono text-right">單號: {quote.id}</span>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b pb-1.5 border-slate-200">
              <h3 className="text-[11.5px] font-black text-slate-900 tracking-wide text-left flex items-center gap-1.5">
                <span className="bg-slate-800 text-white rounded px-1.5 py-0.2 text-[8px] font-bold shrink-0">工程附頁</span>
                <span>工程施工時程進度表與橫向日曆排期圖 (Estimated Construction Schedule & Calendar Overlay)</span>
              </h3>
              <div className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[9px] text-right shrink-0">
                總工作天數: <span className="font-mono text-sm">{(quote.scheduleSteps || []).reduce((sum, s) => sum + (s.days || 0), 0)}</span> 天
              </div>
            </div>

            <p className="text-[9px] text-slate-500 leading-tight text-left">
              本施工時程與日曆表以預設開工日期為基準由系統高精準推算。施工時間為<span className="font-black text-slate-700">星期一至星期五</span>，其餘<span className="font-semibold text-rose-600">星期六、日以及香港公眾假期自動排休</span>（已自動扣除包含元旦、農曆新年、復活節、清明、勞動、佛誕、端午、特區成立日、國慶、重陽及聖誕等公眾假期）。
            </p>

            {/* Horizontal Gantt Calendar (Fits completely in Landscape) */}
            <div className="w-full text-black">
              <HorizonScheduleCalendar steps={quote.scheduleSteps || []} />
            </div>

            {/* Summary Table list */}
            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <table className="w-full text-left text-[9px] border-collapse leading-tight">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800 text-[9.5px]">
                    <th className="p-1.5 border-r border-slate-300 w-[8%] text-center">序號</th>
                    <th className="p-1.5 border-r border-slate-300 pl-3 w-[50%]">工程施工作業步驟名稱 (Step Name)</th>
                    <th className="p-1.5 border-r border-slate-300 text-center w-[15%]">預計天數</th>
                    <th className="p-1.5 pl-3 text-left w-[27%]">工作日期程估算</th>
                  </tr>
                </thead>
                <tbody>
                  {(quote.scheduleSteps || DEFAULT_SCHEDULE_STEPS).map((step, sIdx) => {
                    const hasDates = !!step.startDate;
                    return (
                      <tr key={sIdx} className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50/50">
                        <td className="p-1 border-r border-slate-200 text-center font-mono font-bold text-slate-500">{sIdx + 1}</td>
                        <td className="p-1 border-r border-slate-200 pl-3 font-semibold text-slate-800 text-left">{step.name}</td>
                        <td className="p-1 border-r border-slate-200 text-center font-mono font-bold text-amber-700 bg-amber-50/10">{step.days} 天</td>
                        <td className="p-1 pl-3 text-left font-mono text-[9px] text-slate-700">
                          {hasDates ? (
                            <div className="inline-flex items-center gap-1">
                              <span className="text-emerald-700 font-bold px-1 py-0.2 rounded bg-emerald-50 text-[9px]">{step.startDate}</span>
                              <span className="text-slate-400">➜</span>
                              <span className="text-emerald-700 font-bold px-1 py-0.2 rounded bg-emerald-50 text-[9px]">{step.endDate}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">未計算</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center text-[8px] text-gray-400 font-mono border-t border-gray-200 pt-1.5 mt-2.5">
          <span>© Artisan Studio Limited ． TIMELINE FORECAST ． CONFIDENTIAL DOCUMENT ATTACHMENT</span>
          <span>獨立附頁 ． 共 1 頁</span>
        </div>
      </div>
    );
  };


  // --- ITEM HANDLERS INSIDE QUOTATION --
  const handleAddCustomItem = (category: string) => {
    if (!editingQuote) return;

    const newItem: QuotationItem = {
      id: crypto.randomUUID(),
      category,
      name: '',
      unit: '項',
      quantity: 1,
      unitPrice: 0,
      remark: ''
    };

    const updatedQuote = {
      ...editingQuote,
      items: [...editingQuote.items, newItem]
    };
    updateEditingQuoteStateAndSync(updatedQuote);
  };

  const handleAddFromLibrary = (category: string, standardItem: StandardItem) => {
    if (!editingQuote) return;

    // Determine default flat price or median from range (e.g. "21000-35000" or "85")
    let defaultPrice = 0;
    if (standardItem.priceRange) {
      const parts = standardItem.priceRange.split('-');
      if (parts.length === 2) {
        defaultPrice = Math.round((parseFloat(parts[0]) + parseFloat(parts[1])) / 2);
      } else {
        defaultPrice = parseFloat(standardItem.priceRange) || 0;
      }
    }

    const newItem: QuotationItem = {
      id: crypto.randomUUID(),
      category,
      name: standardItem.name,
      unit: standardItem.unit,
      quantity: 1,
      unitPrice: defaultPrice,
      remark: standardItem.defaultRemark || ''
    };

    const updatedQuote = {
      ...editingQuote,
      items: [...editingQuote.items, newItem]
    };
    updateEditingQuoteStateAndSync(updatedQuote);
    
    showToast(`項目【${standardItem.name}】已加入「${category}」`);
  };

  const handleUpdateItemField = (itemId: string, field: keyof QuotationItem, value: any) => {
    if (!editingQuote) return;

    const updatedItems = editingQuote.items.map(item => {
      if (item.id === itemId) {
        return { ...item, [field]: value };
      }
      return item;
    });

    const updatedQuote = {
      ...editingQuote,
      items: updatedItems
    };

    updateEditingQuoteStateAndSync(updatedQuote);
  };

  const handleRemoveItem = (itemId: string) => {
    if (!editingQuote) return;
    const updated = editingQuote.items.filter(item => item.id !== itemId);
    const updatedQuote = {
      ...editingQuote,
      items: updated
    };
    updateEditingQuoteStateAndSync(updatedQuote);
  };

  const handleMoveItem = (itemId: string, direction: 'up' | 'down') => {
    if (!editingQuote) return;
    const list = [...editingQuote.items];
    const index = list.findIndex(i => i.id === itemId);
    if (index === -1) return;
    
    const cat = list[index].category;
    // Find all indices of items in the same category
    const catIndices = list
      .map((item, idx) => ({ item, idx }))
      .filter(x => x.item.category === cat)
      .map(x => x.idx);
      
    const positionInCat = catIndices.indexOf(index);
    if (direction === 'up' && positionInCat > 0) {
      const prevIdx = catIndices[positionInCat - 1];
      const temp = list[index];
      list[index] = list[prevIdx];
      list[prevIdx] = temp;
      updateEditingQuoteStateAndSync({ ...editingQuote, items: list });
    } else if (direction === 'down' && positionInCat < catIndices.length - 1) {
      const nextIdx = catIndices[positionInCat + 1];
      const temp = list[index];
      list[index] = list[nextIdx];
      list[nextIdx] = temp;
      updateEditingQuoteStateAndSync({ ...editingQuote, items: list });
    }
  };

  // --- EDIT STANDARD LIBRARY & SETTINGS ---
  const [newCatName, setNewCatName] = useState('');
  
  // Create Category
  const handleAddCategory = () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      showToast('此分類已存在', 'error');
      return;
    }
    const updated = [...categories, trimmed];
    syncCategories(updated);
    
    // update state map
    const updatedLib = { ...standardItems, [trimmed]: [] };
    syncLibrary(updatedLib);
    setNewCatName('');
    showToast('成功添加新工程分類');
  };

  // Delete Category
  const handleDeleteCategory = (cat: string) => {
    showConfirm(
      '確認刪除分類',
      `確定要刪除整個【${cat}】分類，連同其底下的標準項目庫嗎？`,
      () => {
        const updatedCats = categories.filter(c => c !== cat);
        syncCategories(updatedCats);

        const updatedLib = { ...standardItems };
        delete updatedLib[cat];
        syncLibrary(updatedLib);
        showToast('工程分類已刪除', 'info');
      },
      '確定刪除',
      '取消'
    );
  };

  // Create Standard Item to specific category
  const [newStandardItem, setNewStandardItem] = useState<{
    name: string;
    unit: string;
    priceRange: string;
    defaultRemark: string;
  }>({ name: '', unit: '直呎', priceRange: '1000', defaultRemark: '' });

  const handleAddStandardItem = (category: string) => {
    if (!newStandardItem.name.trim()) {
      showToast('項目名稱不可空白', 'error');
      return;
    }
    
    const newItem: StandardItem = {
      name: newStandardItem.name.trim(),
      unit: newStandardItem.unit.trim(),
      priceRange: newStandardItem.priceRange.trim(),
      defaultRemark: newStandardItem.defaultRemark.trim()
    };

    const currentList = standardItems[category] || [];
    const updatedLib = {
      ...standardItems,
      [category]: [...currentList, newItem]
    };

    syncLibrary(updatedLib);
    setNewStandardItem({ name: '', unit: '直呎', priceRange: '1000', defaultRemark: '' });
    showToast('成功加入項目標準庫');
  };

  const handleRemoveStandardItem = (category: string, itemIdx: number) => {
    const currentList = standardItems[category] || [];
    const updatedList = currentList.filter((_, idx) => idx !== itemIdx);
    const updatedLib = {
      ...standardItems,
      [category]: updatedList
    };
    syncLibrary(updatedLib);
    showToast('工程項目已從標準庫中移除');
  };

  // Save Settings Changes (Footer T&C, Bank account)
  const handleSaveSettings = () => {
    syncSettings(settings);
    showToast('系統設定與頁尾條款已成功更新');
    setIsSettingsOpen(false);
  };

  // --- BACKUP & RESTORE UTILITY ---
  const handleExportBackup = () => {
    const backup: BackupData = {
      quotations,
      customStandardItems: standardItems,
      customCategories: categories,
      quoteSettings: settings
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    
    const now = new Date();
    const dateStamp = now.toISOString().split('T')[0];
    downloadAnchor.setAttribute("download", `築匠裝修報價系統_完整備份_${dateStamp}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('成功匯出系統完整備份檔！');
  };

  const handleImportBackup = (event: ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = event.target.files;
    if (!files || files.length === 0) return;

    fileReader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string) as Partial<BackupData>;
        if (parsed.quotations && Array.isArray(parsed.quotations)) {
          syncQuotes(parsed.quotations);
        }
        if (parsed.customStandardItems && typeof parsed.customStandardItems === 'object') {
          syncLibrary(parsed.customStandardItems as Record<string, StandardItem[]>);
        }
        if (parsed.customCategories && Array.isArray(parsed.customCategories)) {
          syncCategories(parsed.customCategories);
        }
        if (parsed.quoteSettings) {
          syncSettings(parsed.quoteSettings);
        }
        showToast('備份數據恢復成功！應用已重新載入最完整資料');
      } catch (err) {
        showToast('備份載入失敗，檔案格式損毀或無效！', 'error');
      }
    };
    fileReader.readAsText(files[0]);
  };

  const handleFactoryReset = () => {
    showConfirm(
      '回復出廠設定',
      '警告！這將清除所有已創建的報價單及自訂標準庫，回復成初始展示範例。確定清除嗎？',
      () => {
        localStorage.clear();
        dbClear().catch(err => console.error("Error clearing IndexedDB on reset", err));
        setQuotations([]);
        setCategories(DEFAULT_CATEGORIES);
        setStandardItems(DEFAULT_STANDARD_ITEMS);
        setSettings(DEFAULT_SETTINGS);
        showToast('已回復出廠預設值', 'info');
      },
      '確定清除',
      '取消'
    );
  };

  // Export single quotation as JSON
  const handleExportQuoteJSON = (quote: Quotation) => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(quote, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      
      const filename = `${quote.id}_${quote.customerName}_${timestamp}.json`;
      downloadAnchor.setAttribute("download", filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('成功匯出該張報價單主體 JSON 檔！');
    } catch (err) {
      showToast('導出報價單失敗！', 'error');
      console.error(err);
    }
  };

  // Upload and parse a single quotation JSON and add it to the database
  const handleImportSingleQuote = (event: ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = event.target.files;
    if (!files || files.length === 0) return;

    fileReader.onload = (e) => {
      try {
        const resultString = e.target?.result as string;
        const parsed = JSON.parse(resultString) as Partial<Quotation>;
        
        if (!parsed || typeof parsed !== 'object') {
          showToast('非有效 JSON 物件格式', 'error');
          return;
        }

        if (!parsed.id || !parsed.customerName || !parsed.items || !Array.isArray(parsed.items)) {
          showToast('該檔案非合約報價單 JSON 格式（缺少 id, customerName 或 items）', 'error');
          return;
        }

        let finalId = (parsed.id || 'QT-UNKNOWN').trim();
        let wasConflict = false;
        let counter = 1;
        while (quotations.some(q => q.id === finalId)) {
          finalId = `${parsed.id?.trim()}_NEW${counter}`;
          counter++;
          wasConflict = true;
        }

        const importedQuoteObj: Quotation = {
          id: finalId,
          customerName: (parsed.customerName || '未命名客戶').trim(),
          phone: parsed.phone || '',
          address: parsed.address || '',
          date: parsed.date || new Date().toISOString().split('T')[0],
          status: parsed.status || 'pending',
          version: parsed.version || 'v1.0',
          items: parsed.items,
          remarks: parsed.remarks || settings.defaultTerms,
          discount: parsed.discount || 0,
          discountTargetItemId: parsed.discountTargetItemId,
          enableDiscounts: parsed.enableDiscounts,
          discounts: parsed.discounts,
          depositPercent: parsed.depositPercent ?? 40,
          progressPercent: parsed.progressPercent ?? 40,
          balancePercent: parsed.balancePercent ?? 20,
          paymentStages: parsed.paymentStages
        };

        const updatedQuotes = [importedQuoteObj, ...quotations];
        syncQuotes(updatedQuotes);

        if (wasConflict) {
          showToast(`成功導入報價單！已排除單號衝突，自動重命名為：${finalId}`, 'info');
        } else {
          showToast(`成功導入報價單！(編號: ${finalId})`, 'success');
        }
      } catch (err) {
        showToast('導入 JSON 報價單失敗，可能檔案已損壞！', 'error');
        console.error("Error importing single quote JSON file:", err);
      }
    };
    fileReader.readAsText(files[0]);
    event.target.value = ''; // Reset file input
  };

  // Export CSV for single quotation
  const handleExportQuoteCSV = (quote: Quotation) => {
    const financials = getQuoteFinancials(quote);
    let csvContent = "\ufeff"; // UTF-8 BOM
    
    // Headers
    csvContent += `報價單號,${quote.id}\r\n`;
    csvContent += `客戶姓名,${quote.customerName}\r\n`;
    csvContent += `聯絡電話,${quote.phone}\r\n`;
    csvContent += `裝修地址,${quote.address}\r\n`;
    csvContent += `編製日期,${quote.date}\r\n`;
    csvContent += `目前狀態,${getStatusLabel(quote.status)}\r\n`;
    csvContent += `版本標記,${quote.version}\r\n\r\n`;
    
    csvContent += "工程項目分類,項目名稱,單位,數量,單價 (HKD),小計 (HKD),備註說明\r\n";
    
    // Group and output
    categories.forEach(cat => {
      const items = quote.items.filter(i => i.category === cat);
      if (items.length > 0) {
        items.forEach(i => {
          const rowPrice = i.unitPrice;
          const rowSub = i.quantity * rowPrice;
          const cleanName = i.name.replace(/,/g, '，');
          const cleanRemark = i.remark.replace(/,/g, '，').replace(/\n/g, ' ； ');
          csvContent += `${cat},${cleanName},${i.unit},${i.quantity},${rowPrice},${rowSub},${cleanRemark}\r\n`;
        });
      }
    });

    if (quote.enableDiscounts && quote.discounts && quote.discounts.length > 0) {
      csvContent += `,,,,,原價小計,${financials.subtotal}\r\n`;
      quote.discounts.forEach(d => {
        const discountItemName = d.targetItemId ? (quote.items.find(i => i.id === d.targetItemId)?.name || '指定項目') : '整體合約';
        csvContent += `,,,,,特別折扣 (${discountItemName}),-${d.amount}\r\n`;
      });
    } else if (quote.discount > 0) {
      const discountItemName = quote.discountTargetItemId ? (quote.items.find(i => i.id === quote.discountTargetItemId)?.name || '指定項目') : '整體合約';
      csvContent += `,,,,,原價小計,${financials.subtotal}\r\n`;
      csvContent += `,,,,,特別折扣 (${discountItemName}),-${quote.discount}\r\n`;
    }
    csvContent += `,,,,,合計淨值,${financials.grandTotal}\r\n`;
    
    // Payment breakdown
    csvContent += `\r\n訂金分配規劃 (${quote.depositPercent}%),${financials.depositVal}\r\n`;
    csvContent += `中期工程款分配 (${quote.progressPercent}%),${financials.progressVal}\r\n`;
    csvContent += `完工結算尾款 (${quote.balancePercent}%),${financials.balanceVal}\r\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `裝修報價單_${quote.customerName}_${quote.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('報價單 CSV 資料簿已成功下載');
  };

  // Setup sample data if quotations is empty in demo to show high craftsmanship
  const handleLoadSampleQuotes = () => {
    const sample: Quotation = {
      id: "QT-20260619-01",
      customerName: "陳大文先生",
      phone: "98765432",
      address: "香港北角英皇道123號海角大廈B座22F",
      date: "2026-06-19",
      status: "pending",
      version: "v1.0",
      items: [
        {
          id: "item-1",
          category: "打拆工程",
          name: "全屋舊物清拆",
          unit: "項",
          quantity: 1,
          unitPrice: 28000,
          remark: "清拆大廳房間原有地板，浴室廚房強瓦砸除，含全期泥頭清理。"
        },
        {
          id: "item-2",
          category: "水務",
          name: "浴室水喉",
          unit: "項",
          quantity: 1,
          unitPrice: 13500,
          remark: "入牆暗水路，採用英國不鏽鋼精銅厚喉管管路施工"
        },
        {
          id: "item-3",
          category: "電力",
          name: "13A雙蘇",
          unit: "個",
          quantity: 8,
          unitPrice: 1100,
          remark: "奇勝Schneider制面，客廳沙發底及主房床頭櫃新造"
        },
        {
          id: "item-4",
          category: "客廳傢俬",
          name: "鞋櫃/餐邊櫃",
          unit: "直呎",
          quantity: 7,
          unitPrice: 1800,
          remark: "大門入口右側高櫃連中央帶燈槽展示凹槽"
        }
      ],
      remarks: settings.defaultTerms,
      discount: 0,
      depositPercent: 40,
      progressPercent: 40,
      balancePercent: 20
    };
    
    syncQuotes([sample, ...quotations]);
    showToast('成功載入展示報價單數據！');
  };

  // Print quote triggers systemic styling injection and windows build print interface
  const handleTriggerPrint = (quote: Quotation) => {
    setPrintQuote(quote);
    setTimeout(() => {
      window.print();
    }, 400);
  };

  // Print schedule triggers landscape printing
  const handleTriggerPrintSchedule = (quote: Quotation) => {
    setPrintScheduleQuote(quote);
    setTimeout(() => {
      window.print();
    }, 400);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex flex-col items-center justify-center p-4 antialiased font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-150 text-center flex flex-col items-center gap-4 max-w-sm">
          <RefreshCw className="w-10 h-10 text-amber-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-700">正在安全連線並載入雲端合約資料...</p>
        </div>
      </div>
    );
  }



  return (
    <div id="applet-container" className={`min-h-screen bg-[#F5F5F0] text-gray-800 font-sans antialiased ${settings.showMainFooter ? 'pb-24' : 'pb-8'} ${settings.isDarkMode ? 'dark-mode bg-slate-950 text-slate-100' : ''}`}>
      {previewQuote && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] overflow-y-auto p-4 md:p-8 flex flex-col items-center animate-fade-in">
          {/* Top floating control and status bar */}
          <div className="w-full max-w-[210mm] bg-slate-900 text-white rounded-xl shadow-lg px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 sticky top-0 z-50 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-600 rounded-lg text-white">
                <FileText className="w-5 h-5" />
              </div>
              <div className="text-left font-sans">
                <h3 className="font-bold text-sm tracking-wide text-white">築匠報價審單 ． 系統排版預覽</h3>
                <p className="text-xs text-slate-400 mt-0.5">目前單號 : <span className="font-mono text-amber-400 font-bold">{previewQuote.id}</span></p>
              </div>
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={() => {
                  const quoteToPrint = previewQuote;
                  setPreviewQuote(null);
                  handleTriggerPrint(quoteToPrint);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>直接列印 / 下載 PDF</span>
              </button>
              <button
                onClick={() => setPreviewQuote(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-705"
              >
                <X className="w-4 h-4" />
                <span>關閉預覽</span>
              </button>
            </div>
          </div>

          {/* Document pages mock sheets layout container */}
          {renderQuotationPages(previewQuote, false)}
        </div>
      )}

      {/* --- PRINT SHEET CONTAINER OVERLAY (Hidden during screen work, only active for printed viewport) --- */}
      {printQuote && (
        <div className="hidden print:block print:static print:w-full print:h-auto print:overflow-visible bg-white text-black p-0 print:p-0 z-[9999] font-sans leading-relaxed fixed inset-0 overflow-y-auto">
          {renderQuotationPages(printQuote, true)}
          {/* Back button printable guide helper */}
          <div className="print:hidden fixed bottom-6 right-6 flex gap-2">
            <button 
              onClick={() => setPrintQuote(null)}
              className="bg-black text-white px-4 py-2 rounded-full cursor-pointer hover:bg-gray-800 shadow"
            >
              結束預覽
            </button>
          </div>
        </div>
      )}

      {/* --- STANDALONE SCHEDULE PRINT PREVIEW CONTAINER --- */}
      {printScheduleQuote && (
        <div className="hidden print:block print:static print:w-full print:h-auto print:overflow-visible bg-white text-black p-0 print:p-0 z-[9999] font-sans leading-relaxed fixed inset-0 overflow-y-auto">
          {renderStandaloneSchedulePage(printScheduleQuote, true)}
          {/* Back button printable guide helper */}
          <div className="print:hidden fixed bottom-6 right-6 flex gap-2">
            <button 
              onClick={() => setPrintScheduleQuote(null)}
              className="bg-black text-white px-4 py-2 rounded-full cursor-pointer hover:bg-gray-800 shadow"
            >
              結束預覽
            </button>
          </div>
        </div>
      )}

      {/* --- STANDARD SCREEN DESKTOP LAYOUT --- */}
      <div className="print:hidden">
        {/* Toast notifications */}
        {notification && (
          <div className="fixed top-20 right-6 z-[99999] flex items-center gap-2.5 bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-lg shadow-xl animate-bounce">
            {notification.type === 'success' && <Check className="text-emerald-500 w-5 h-5 shrink-0" />}
            {notification.type === 'error' && <AlertTriangle className="text-rose-500 w-5 h-5 shrink-0" />}
            {notification.type === 'info' && <Info className="text-amber-500 w-5 h-5 shrink-0" />}
            <span className="text-sm font-medium pr-2 leading-tight">{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer ml-auto shrink-0"
              title="關閉提示"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* --- APP HEADER BAR --- */}
        <header className="bg-white border-b border-gray-200 stick sticky top-0 z-40 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="https://render.lingguangobjects.com/p/yuyan/200031800011272542/assets/resource_4c0f1c50-BlUje_KV.png" 
                alt="Artisan Studio"
                referrerPolicy="no-referrer"
                className="w-10 h-10 object-contain rounded-md outline-1 outline-amber-600/10 hover:scale-105 transition-transform cursor-pointer bg-white"
              />
              <div>
                <h1 className="text-lg font-bold text-slate-800 flex flex-wrap items-center gap-2">
                  <span>築匠 Artisan Studio｜匠心工藝・專業與細節</span>
                </h1>
                <p className="text-xs text-gray-500 font-medium">報價系統</p>
              </div>
            </div>

            {/* Middle Online Action Badge & Settings controls */}
            <div className="flex items-center gap-3">
              <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                <span>{isOnline ? '在線' : '離線模式'}</span>
              </div>

              <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
                <button 
                  onClick={() => {
                    setIsSettingsOpen(true);
                    setSettingsTab('library');
                  }}
                  className="p-2 text-gray-500 hover:text-slate-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                  title="系統設定"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* --- MAIN PAGE CONTENT --- */}
        <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
          
          {/* Quick stats grid */}
          {!editingQuote && (
            <section className="grid grid-cols-3 md:grid-cols-6 gap-3.5">
              <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm text-center">
                <div className="text-2xl font-extrabold text-slate-700">{stats.pending}</div>
                <div className="text-xs text-gray-500 mt-1 font-medium">未報價 (Pending)</div>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm text-center">
                <div className="text-2xl font-extrabold text-amber-600">{stats.quoted}</div>
                <div className="text-xs text-gray-500 mt-1 font-medium">待回覆 (Quoted)</div>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm text-center">
                <div className="text-2xl font-extrabold text-emerald-600">{stats.signed}</div>
                <div className="text-xs text-gray-500 mt-1 font-medium">已簽約 (Signed)</div>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm text-center">
                <div className="text-2xl font-extrabold text-blue-600">{stats.constructing}</div>
                <div className="text-xs text-gray-500 mt-1 font-medium">施工中 (Building)</div>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm text-center">
                <div className="text-2xl font-extrabold text-purple-600">{stats.completed}</div>
                <div className="text-xs text-gray-500 mt-1 font-medium">完工結清 (Completed)</div>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm text-center">
                <div className="text-2xl font-extrabold text-rose-600">{stats.cancelled}</div>
                <div className="text-xs text-gray-500 mt-1 font-medium">作廢 (Cancelled)</div>
              </div>
            </section>
          )}

          {/* Quick Search and Control Toolbar */}
          {!editingQuote && (
            <section className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-bold text-gray-600">狀態：</label>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white min-w-[120px] focus:outline-amber-600"
                  >
                    <option value="all">所有狀態</option>
                    <option value="pending">未報價</option>
                    <option value="quoted">報價待回覆</option>
                    <option value="signed">已簽約</option>
                    <option value="constructing">施工中</option>
                    <option value="completed">完工結清</option>
                    <option value="cancelled">作廢</option>
                  </select>
                </div>

                <div className="flex-1 min-w-[220px] relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input 
                    type="text" 
                    placeholder="搜索客戶姓名 / 裝修地址 / 合約單號..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-600 bg-gray-50 hover:bg-gray-100/50 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                {quotations.length === 0 && (
                  <button
                    onClick={handleLoadSampleQuotes}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5" /> 載入演示數據
                  </button>
                )}
                <button 
                  onClick={() => document.getElementById('single-quote-import-input')?.click()}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-705 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  title="上載單張 JSON 格式報價單點選新增"
                >
                  <Upload className="w-4 h-4" /> 上載報價單
                </button>
                <input 
                  type="file" 
                  id="single-quote-import-input" 
                  accept=".json" 
                  className="hidden" 
                  onChange={handleImportSingleQuote} 
                />
                <button 
                  onClick={handleInitiateNewQuote}
                  className="px-5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> 創建新報價單
                </button>
              </div>
            </section>
          )}

          {/* MAIN COLUMN OR EDITOR */}
          {editingQuote ? (
            /* --- FULL QUOTATION EDITOR SECTION --- */
            <section className="bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200/80 px-6 py-4 flex items-center justify-between text-slate-900">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-600" />
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      {isEditingNew ? '新購置裝修工程合約：草稿編制' : `編輯報價合約：${editingQuote.id}`}
                    </h3>
                    <p className="text-2xs text-slate-500 mt-0.5">離線狀態安全。修改儲存即寫入 PWA 硬碟快取</p>
                  </div>
                </div>
                <button 
                  onClick={handleExitEditing}
                  className="p-1.5 hover:bg-slate-200/70 rounded-full transition-colors cursor-pointer"
                  title="退出草稿"
                >
                  <X className="w-5 h-5 text-slate-500 hover:text-slate-800" />
                </button>
              </div>

              {/* Form client fields */}
              <div className="p-6 border-b border-gray-100 bg-gray-50/50 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <span>報價合約號碼 *</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="報價單號" 
                    value={editingQuote.id}
                    onChange={(e) => setEditingQuote({...editingQuote, id: e.target.value})}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-amber-600 text-slate-800 font-semibold font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">合約日期</label>
                  <input 
                    type="date"
                    value={editingQuote.date}
                    onChange={(e) => setEditingQuote({...editingQuote, date: e.target.value})}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">目前進度狀態</label>
                  <select 
                    value={editingQuote.status}
                    onChange={(e) => setEditingQuote({...editingQuote, status: e.target.value as QuotationStatus})}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-600"
                  >
                    <option value="pending">工程未報價</option>
                    <option value="quoted">報價待回覆</option>
                    <option value="signed">已簽訂合約</option>
                    <option value="constructing">施工進行中</option>
                    <option value="completed">完工已結清</option>
                    <option value="cancelled">此合約已作廢</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">版本</label>
                  <input 
                    type="text"
                    value={editingQuote.version}
                    onChange={(e) => setEditingQuote({...editingQuote, version: e.target.value})}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">客戶姓名 *</label>
                  <input 
                    type="text" 
                    placeholder="例如：陳大文先生" 
                    value={editingQuote.customerName}
                    onChange={(e) => setEditingQuote({...editingQuote, customerName: e.target.value})}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">電話號碼</label>
                  <input 
                    type="text" 
                    placeholder="客戶聯絡號碼" 
                    value={editingQuote.phone}
                    onChange={(e) => setEditingQuote({...editingQuote, phone: e.target.value})}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-gray-600 mb-1">裝修施工地址</label>
                  <input 
                    type="text" 
                    placeholder="施工樓宇地段、層室詳細地址" 
                    value={editingQuote.address}
                    onChange={(e) => setEditingQuote({...editingQuote, address: e.target.value})}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>              {/* Items Management list (Grouped by Category) */}
              <div className="p-6 space-y-6">
                <h4 className="text-gray-700 font-bold border-l-4 border-slate-900 pl-2 text-md">工程施工項目詳情：</h4>
                
                {categories.map((cat) => {
                  const items = editingQuote.items.filter(i => i.category === cat);
                  
                  return (
                    <div key={cat} className="border border-slate-100 rounded-xl bg-slate-50/50 p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                        <span className="font-extrabold text-slate-800 text-sm">{cat}</span>
                        
                        {/* Selector/Adder shortcut from standard library items */}
                        <div className="flex items-center gap-2">
                          {standardItems[cat] && standardItems[cat].length > 0 && (
                            <div className="flex gap-1 items-center">
                              <select 
                                onChange={(e) => {
                                  const selectIndex = parseInt(e.target.value);
                                  if (!isNaN(selectIndex)) {
                                    handleAddFromLibrary(cat, standardItems[cat][selectIndex]);
                                    e.target.value = ''; // reset selection
                                  }
                                }}
                                className="text-[12px] px-2 bg-white border border-gray-300 rounded-lg cursor-pointer max-w-[130px] h-7 focus:outline-amber-600"
                              >
                                <option value="">請選擇標準項目...</option>
                                {standardItems[cat].map((si, sidx) => (
                                  <option key={sidx} value={sidx}>{si.name}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          <button 
                            type="button"
                            onClick={() => handleAddCustomItem(cat)}
                            className="px-2.5 text-[12px] bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg flex items-center gap-0.5 h-7 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> 自訂新項
                          </button>
                        </div>
                      </div>

                      {/* Items table layout inside category */}
                      {items.length === 0 ? (
                        <p className="text-2xs text-gray-400 italic text-center py-2">目前沒有【{cat}】大類的細項，請點選上方按鈕創建或從標準庫帶入</p>
                      ) : (
                        <div className="space-y-2">
                          <div className="hidden md:grid grid-cols-12 gap-3 text-2xs font-bold text-gray-500 px-2 select-none">
                            <span className="col-span-3">項目工程描述</span>
                            <span className="col-span-1 text-center">單位</span>
                            <span className="col-span-1 text-center">數量</span>
                            <span className="col-span-1 text-right">單價(HKD)</span>
                            <span className="col-span-5">詳細備註說明</span>
                            <span className="col-span-1 text-center">操作</span>
                          </div>

                          {items.map((item) => (
                            <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 bg-white p-3 rounded-lg border border-gray-200 text-sm items-start relative shadow-2xs">
                              {/* Item Description */}
                              <div className="col-span-1 md:col-span-3">
                                <input 
                                  type="text"
                                  placeholder="修繕工程項目名稱..."
                                  value={item.name}
                                  onChange={(e) => handleUpdateItemField(item.id, 'name', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-slate-800 font-semibold focus:outline-amber-600"
                                />
                              </div>

                              {/* Unit */}
                              <div className="col-span-1 md:col-span-1 text-center">
                                <input 
                                  type="text"
                                  placeholder="項目"
                                  value={item.unit}
                                  onChange={(e) => handleUpdateItemField(item.id, 'unit', e.target.value)}
                                  className="w-full px-1 py-1 border border-gray-200 rounded text-center text-xs focus:outline-amber-600"
                                />
                              </div>

                              {/* Quantity */}
                              <div className="col-span-1 md:col-span-1">
                                <input 
                                  type="number"
                                  value={item.quantity === 0 ? '' : item.quantity}
                                  onChange={(e) => handleUpdateItemField(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                  className="w-full px-1 py-1 border border-gray-200 rounded text-center text-xs font-mono focus:outline-amber-600"
                                />
                              </div>

                              {/* Unit Price */}
                              <div className="col-span-1 md:col-span-1">
                                <input 
                                  type="number"
                                  value={item.unitPrice === 0 ? '' : item.unitPrice}
                                  onChange={(e) => handleUpdateItemField(item.id, 'unitPrice', Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-full px-2 py-1 border border-gray-200 rounded text-right text-xs font-mono text-amber-700 focus:outline-amber-600"
                                />
                              </div>

                              {/* Remark */}
                              <div className="col-span-1 md:col-span-5">
                                <textarea 
                                  placeholder="非必填：備註規格或施工備別..."
                                  rows={Math.max(1, item.remark ? item.remark.split('\n').length : 1)}
                                  value={item.remark}
                                  onChange={(e) => handleUpdateItemField(item.id, 'remark', e.target.value)}
                                  className="w-full px-2 py-1.5 border border-gray-250 rounded text-[11px] text-gray-650 focus:outline-amber-600 focus:ring-1 focus:ring-amber-500/20 bg-white transition-all resize-y min-h-[30px] leading-relaxed font-sans"
                                />
                              </div>

                              {/* Action Remove & Sorting */}
                              <div className="col-span-1 md:col-span-1 flex justify-center items-center gap-1 select-none">
                                <button 
                                  type="button"
                                  onClick={() => handleMoveItem(item.id, 'up')}
                                  className="p-1 hover:text-amber-600 hover:bg-amber-50 text-gray-400 border border-gray-100 rounded transition-colors"
                                  title="往上爬升一格"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => handleMoveItem(item.id, 'down')}
                                  className="p-1 hover:text-amber-600 hover:bg-amber-50 text-gray-400 border border-gray-100 rounded transition-colors"
                                  title="往下沉降一格"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="p-1 hover:bg-rose-50 text-rose-500 rounded hover:scale-110 transition-transform ml-0.5"
                                  title="移除此項"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Calculations Terms split parameters */}
              <div className="p-6 bg-gray-50/50 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6 leading-relaxed">
                <div className="space-y-4 col-span-1 md:col-span-2">
                  
                  {/* --- SPECIAL CONTRACT DISCOUNTS (Checkbox Enabled) --- */}
                  <div className="border border-rose-100 rounded-xl bg-rose-50/25 p-4 space-y-3 text-left">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                          type="checkbox"
                          checked={!!editingQuote.enableDiscounts}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            let initializedDiscounts = editingQuote.discounts || [];
                            if (checked && initializedDiscounts.length === 0) {
                              initializedDiscounts = [{
                                id: 'd_' + Math.random().toString(36).substr(2, 9),
                                amount: 0
                              }];
                            }
                            setEditingQuote({
                              ...editingQuote,
                              enableDiscounts: checked,
                              discounts: initializedDiscounts
                            });
                          }}
                          className="w-4 h-4 text-rose-600 rounded border-gray-300 focus:ring-rose-500"
                        />
                        <span className="text-xs font-black text-rose-800">設定合約特別工程折扣 (可多項 / 單項折扣)</span>
                      </label>
                    </div>

                    {editingQuote.enableDiscounts && (
                      <div className="space-y-3 pt-3 border-t border-rose-100/60 font-sans">
                        {(editingQuote.discounts || []).map((disc, idx) => (
                          <div key={disc.id || idx} className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white/95 p-3 rounded-lg border border-rose-100 items-end shadow-2xs">
                            {/* Item target dropdown */}
                            <div className="col-span-1 sm:col-span-7">
                              <label className="block text-3xs font-extrabold text-gray-400 uppercase tracking-widest mb-1">折扣套用目標工程項目</label>
                              <select
                                value={disc.targetItemId || ''}
                                onChange={(e) => {
                                  const list = [...(editingQuote.discounts || [])];
                                  list[idx] = { ...list[idx], targetItemId: e.target.value || undefined };
                                  setEditingQuote({ ...editingQuote, discounts: list });
                                }}
                                className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-xs focus:outline-none focus:border-rose-500 font-sans"
                              >
                                <option value="">-- 整體合約 / 整單折扣 --</option>
                                {editingQuote.items.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    [{item.category}] {item.name} (單價: ${item.unitPrice})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Discount input */}
                            <div className="col-span-1 sm:col-span-4">
                              <label className="block text-3xs font-extrabold text-gray-400 uppercase tracking-widest mb-1">折扣金額 (HKD)</label>
                              <input 
                                type="number"
                                min="0"
                                value={disc.amount || ''}
                                onChange={(e) => {
                                  const list = [...(editingQuote.discounts || [])];
                                  list[idx] = { ...list[idx], amount: Math.max(0, parseFloat(e.target.value) || 0) };
                                  setEditingQuote({ ...editingQuote, discounts: list });
                                }}
                                className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-xs font-mono text-rose-600 focus:outline-none focus:border-rose-500"
                                placeholder="0"
                              />
                            </div>

                            {/* Remove button */}
                            <div className="col-span-1 sm:col-span-1 flex justify-center pb-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const list = (editingQuote.discounts || []).filter((_, i) => i !== idx);
                                  setEditingQuote({ ...editingQuote, discounts: list });
                                }}
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                title="移除此項折扣"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Add button */}
                        <button
                          type="button"
                          onClick={() => {
                            const newDisc = {
                              id: 'd_' + Math.random().toString(36).substr(2, 9),
                              amount: 0
                            };
                            setEditingQuote({
                              ...editingQuote,
                              discounts: [...(editingQuote.discounts || []), newDisc]
                            });
                          }}
                          className="w-full py-2 border border-dashed border-rose-300 rounded-lg text-rose-600 hover:bg-rose-50 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>+ 增加一項新的特別工程折扣</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                    <h4 className="text-gray-700 font-bold border-l-4 border-slate-900 pl-2 text-xs flex items-center gap-2">
                      <Coins className="w-4 h-4 text-amber-500" />
                      工程款期數與比率調配 (Payment Stages & Rates)
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        const stages = [...getPaymentStages(editingQuote)];
                        const nextIdx = stages.length + 1;
                        const chineseOrdinals = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
                        const stageName = `第${chineseOrdinals[stages.length] || nextIdx}期`;
                        stages.push({
                          name: stageName,
                          percent: 0,
                          remark: ''
                        });
                        setEditingQuote({
                          ...editingQuote,
                          paymentStages: stages
                        });
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg shadow-2xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      新增期數
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="block text-2xs font-bold text-gray-500"> 各期備註 ( 選填 ) : </div>
                    {getPaymentStages(editingQuote).map((stage, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row gap-3 items-center bg-white p-3 rounded-xl border border-gray-100 shadow-3xs">
                        {/* Stage Name */}
                        <div className="w-full sm:w-28 flex items-center gap-2">
                          <span className="text-2xs text-gray-400 font-mono font-bold">#{idx + 1}</span>
                          <input
                            type="text"
                            value={stage.name}
                            onChange={(e) => {
                              const stages = [...getPaymentStages(editingQuote)];
                              stages[idx] = { ...stages[idx], name: e.target.value };
                              setEditingQuote({ ...editingQuote, paymentStages: stages });
                            }}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs font-semibold text-gray-700"
                            placeholder="期數名稱"
                          />
                        </div>

                        {/* Percentage */}
                        <div className="w-full sm:w-24 flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={stage.percent === 0 ? '' : stage.percent}
                            onChange={(e) => {
                              const stages = [...getPaymentStages(editingQuote)];
                              const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                              stages[idx] = { ...stages[idx], percent: val };
                              
                              // Keep legacy percentages in sync for the first three:
                              const updateObj: Partial<Quotation> = { paymentStages: stages };
                              if (idx === 0) updateObj.depositPercent = val;
                              if (idx === 1) updateObj.progressPercent = val;
                              if (idx === 2) updateObj.balancePercent = val;
                              
                              setEditingQuote({ ...editingQuote, ...updateObj });
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs font-mono text-center font-bold text-slate-800"
                            placeholder="0"
                          />
                          <span className="text-xs text-gray-400 font-mono font-bold">%</span>
                        </div>

                        {/* Fast dropdown */}
                        <div className="w-full sm:w-40">
                          <select
                            onChange={(e) => {
                              const selected = e.target.value;
                              if (selected) {
                                const stages = [...getPaymentStages(editingQuote)];
                                stages[idx] = { ...stages[idx], remark: selected };
                                setEditingQuote({ ...editingQuote, paymentStages: stages });
                              }
                              e.target.value = ""; // Reset select
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-gray-600 bg-gray-50 bg-none cursor-pointer"
                          >
                            <option value="">快速選擇...</option>
                            <option value="簽約">簽約</option>
                            <option value="確認施工圖">確認施工圖</option>
                            <option value="傢俬出貨前">傢俬出貨前</option>
                            <option value="進場前">進場前</option>
                            <option value="泥水進場前">泥水進場前</option>
                            <option value="油漆進場前">油漆進場前</option>
                            <option value="清潔進場前">清潔進場前</option>
                            <option value="交匙後一個月">交匙後一個月</option>
                          </select>
                        </div>

                        {/* Remark input */}
                        <div className="flex-1 w-full">
                          <input
                            type="text"
                            value={stage.remark}
                            onChange={(e) => {
                              const stages = [...getPaymentStages(editingQuote)];
                              stages[idx] = { ...stages[idx], remark: e.target.value };
                              setEditingQuote({ ...editingQuote, paymentStages: stages });
                            }}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs text-gray-700"
                            placeholder="輸入備註款項內容..."
                          />
                        </div>

                        {/* Action - Delete stage */}
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              const stages = [...getPaymentStages(editingQuote)];
                              if (stages.length <= 1) {
                                showToast('最少需要保留一期付款！', 'error');
                                return;
                              }
                              stages.splice(idx, 1);
                              setEditingQuote({
                                ...editingQuote,
                                paymentStages: stages
                              });
                            }}
                            className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                            title="刪除此期"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Calculations and Warning */}
                  {(() => {
                    const totalPercent = getPaymentStages(editingQuote).reduce((s, x) => s + (x.percent || 0), 0);
                    const isBalanced = totalPercent === 100;
                    return (
                      <div className={`p-3 rounded-lg text-2xs space-y-1 ${isBalanced ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-amber-50 text-amber-800 border border-amber-100'}`}>
                        <p className="font-semibold flex items-center gap-1 font-sans">
                          {isBalanced ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 inline" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 inline" />
                          )}
                          付款期數調配平衡檢算
                        </p>
                        <p>
                          所有期數的支付比例加總必須剛好為 <span className="font-bold underline">100%</span>。
                          目前已調配了 <span className="font-bold font-mono text-xs">{getPaymentStages(editingQuote).length}</span> 個工程款階段，
                          加總合計比例為: <span className="font-mono font-bold text-xs">{totalPercent}%</span> 
                          {isBalanced ? ' (完全平衡 ✅)' : ` (尚差 ${100 - totalPercent}% ⚠️)`}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Payment Breakdown Preview */}
                  <div className="space-y-2 mt-4 pt-4 border-t border-gray-150">
                    <div className="block text-2xs font-bold text-gray-500 font-sans"> 付款明細 : </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {getQuoteFinancials(editingQuote).stageValues.map((stage, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-xl border border-gray-150 text-left">
                          <div className="text-2xs text-gray-400 font-bold">{stage.name}</div>
                          <div className="text-sm font-extrabold text-slate-800 font-mono mt-1">
                            HK${stage.val.toLocaleString()}
                          </div>
                          <div className="text-3xs text-gray-400 mt-0.5">佔比: {stage.percent}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 col-span-1 md:col-span-2 mt-2">
                  <h4 className="text-gray-700 font-bold border-l-4 border-slate-900 pl-2 text-xs">合約財務精算匯總：</h4>
                  <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4 text-sm font-semibold text-slate-800 shadow-3xs text-left">
                    
                    {/* Cost Breakdown */}
                    {editingQuote.enableDiscounts && (editingQuote.discounts?.length || 0) > 0 ? (
                      <div className="space-y-1.5 pt-1 text-xs">
                        <div className="flex justify-between text-gray-500">
                          <span>原價小計 Subtotal:</span>
                          <span className="font-mono">HK${getQuoteFinancials(editingQuote).subtotal.toLocaleString()}</span>
                        </div>

                        {(editingQuote.discounts || []).map((d, dIdx) => {
                          const targetItem = d.targetItemId ? editingQuote.items.find(i => i.id === d.targetItemId) : null;
                          return (
                            <div key={d.id || dIdx} className="flex justify-between text-rose-600 font-bold animate-fade-in">
                              <span className="flex items-center gap-1.5">
                                <span className="bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded text-[10px]">折扣 Discount</span>
                                {targetItem ? (
                                  <span className="max-w-[200px] truncate">
                                    「{targetItem.name}」
                                  </span>
                                ) : (
                                  <span>套用至整體合約</span>
                                )}
                              </span>
                              <span className="font-mono">-${(d.amount || 0).toLocaleString()} HKD</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}

                    <div className="flex justify-between text-base font-extrabold text-amber-600 pt-2 border-t border-gray-100">
                      <span>合約總金額 Net Contract Total:</span>
                      <span className="font-mono scale-110 origin-right">${getQuoteFinancials(editingQuote).grandTotal.toLocaleString()} HKD</span>
                    </div>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-gray-600 mb-1">本報價合約特別專約規定 T&C (載於頁尾)</label>
                  <textarea 
                    rows={4}
                    value={editingQuote.remarks}
                    onChange={(e) => setEditingQuote({...editingQuote, remarks: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg text-xs leading-relaxed font-sans"
                    placeholder="請輸入付款方式、工程保固及材料規範之合約聲明..."
                  />
                </div>

                {/* --- 施工時間表 (CONSTRUCTION SCHEDULE SECTION) --- */}
                <div className="col-span-1 md:col-span-2 border border-slate-200 rounded-xl p-4 bg-white mt-4 dark:border-slate-800 dark:bg-slate-900/30 shadow-3xs">
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={!!editingQuote.scheduleEnabled}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          const initialDate = editingQuote.scheduleStartDate || formatDateKey(new Date());
                          const initialSteps = editingQuote.scheduleSteps && editingQuote.scheduleSteps.length > 0
                            ? editingQuote.scheduleSteps
                            : DEFAULT_SCHEDULE_STEPS;
                          
                          const calculatedSteps = calculateScheduleAndAssign(initialDate, initialSteps);
                          setEditingQuote({
                            ...editingQuote,
                            scheduleEnabled: isChecked,
                            scheduleStartDate: initialDate,
                            scheduleSteps: calculatedSteps
                          });
                        }}
                        className="w-4.5 h-4.5 text-amber-600 rounded focus:ring-amber-500 border-gray-300 cursor-pointer"
                      />
                      <div>
                        <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">啟用工程施工時間表 (Include Construction Schedule)</span>
                        <p className="text-2xs text-gray-500 mt-0.5">選中以規劃本工程之施工時程與工期，自動避開星期六日及香港公眾假期</p>
                      </div>
                    </label>
                    {editingQuote.scheduleEnabled && (
                      <button
                        type="button"
                        onClick={() => handleTriggerPrintSchedule(editingQuote)}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer shrink-0"
                        title="將施工時間表獨立以橫向A4紙張列印"
                      >
                        <Printer className="w-4 h-4 text-white" />
                        <span>列印施工時間表</span>
                      </button>
                    )}
                  </div>

                  {editingQuote.scheduleEnabled && (
                    <div className="space-y-4 pt-3 border-t border-slate-200/60 dark:border-slate-800">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">開始工程日期 (Start Date)</label>
                          <input 
                            type="date"
                            value={editingQuote.scheduleStartDate || ''}
                            onChange={(e) => {
                              const newDate = e.target.value;
                              const currentSteps = editingQuote.scheduleSteps || DEFAULT_SCHEDULE_STEPS;
                              const recalculated = calculateScheduleAndAssign(newDate, currentSteps);
                              setEditingQuote({
                                ...editingQuote,
                                scheduleStartDate: newDate,
                                scheduleSteps: recalculated
                              });
                            }}
                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white dark:bg-slate-950 dark:border-slate-800 dark:text-white"
                          />
                        </div>
                        <div className="flex items-end justify-between bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800">
                          <div>
                            <span className="text-2xs font-bold text-gray-500 dark:text-gray-400">時程摘要 Forecast Summary:</span>
                            <div className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                              總工作天數: <span className="font-bold font-mono text-slate-900 dark:text-white">
                                {(editingQuote.scheduleSteps || []).reduce((sum, s) => sum + (s.days || 0), 0)}
                              </span> 天 
                              {editingQuote.scheduleSteps && editingQuote.scheduleSteps.length > 0 && editingQuote.scheduleSteps[0].startDate && (
                                <span className="ml-2">
                                  預計在 <span className="font-bold font-mono text-slate-900 dark:text-white">
                                    {editingQuote.scheduleSteps[editingQuote.scheduleSteps.length - 1].endDate}
                                  </span> 完工交收
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Schedule steps list */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-black text-slate-800 dark:text-slate-300">工序步驟及預計天數</span>
                          <button 
                            type="button"
                            onClick={() => {
                              const currentSteps = editingQuote.scheduleSteps || [];
                              const updated = [...currentSteps, { name: '新工序', days: 1 }];
                              const recalculated = calculateScheduleAndAssign(editingQuote.scheduleStartDate || '', updated);
                              setEditingQuote({
                                ...editingQuote,
                                scheduleSteps: recalculated
                              });
                            }}
                            className="px-2.5 py-1 text-2xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 rounded-md border border-slate-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <PlusCircle className="w-3 h-3" /> 增加工序
                          </button>
                        </div>

                        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-3xs max-w-full">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-bold">
                                <th className="p-2 pl-3">步驟名稱</th>
                                <th className="p-2 text-center w-28">工作天數</th>
                                <th className="p-2 text-center w-40">計算施工日期</th>
                                <th className="p-2 text-center w-12"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {(editingQuote.scheduleSteps || []).map((step, idx) => (
                                <tr key={idx} className="border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                                  <td className="p-2 pl-3">
                                    <input 
                                      type="text"
                                      value={step.name}
                                      onChange={(e) => {
                                        const currentSteps = [...(editingQuote.scheduleSteps || [])];
                                        currentSteps[idx].name = e.target.value;
                                        setEditingQuote({
                                          ...editingQuote,
                                          scheduleSteps: currentSteps
                                        });
                                      }}
                                      className="w-full p-1.5 border border-slate-200 dark:border-slate-800 rounded-md text-xs bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                                      placeholder="請輸入工序名稱..."
                                    />
                                  </td>
                                  <td className="p-2 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <input 
                                        type="number"
                                        min={1}
                                        value={step.days || 1}
                                        onChange={(e) => {
                                          const currentSteps = [...(editingQuote.scheduleSteps || [])];
                                          currentSteps[idx].days = Math.max(1, parseInt(e.target.value) || 1);
                                          const recalculated = calculateScheduleAndAssign(editingQuote.scheduleStartDate || '', currentSteps);
                                          setEditingQuote({
                                            ...editingQuote,
                                            scheduleSteps: recalculated
                                          });
                                        }}
                                        className="w-16 p-1 border border-slate-200 dark:border-slate-800 rounded-md text-xs text-center font-mono text-slate-900 dark:text-white dark:bg-slate-900"
                                      />
                                      <span className="text-2xs text-gray-500">日</span>
                                    </div>
                                  </td>
                                  <td className="p-2 text-center text-slate-600 dark:text-slate-400 text-2xs font-mono">
                                    {step.startDate ? (
                                      <div className="flex flex-col gap-0.5 justify-center items-center">
                                        <span className="text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/15 px-1.5 py-0.5 rounded font-bold">{step.startDate}</span>
                                        <span className="text-gray-400">至</span>
                                        <span className="text-slate-700 bg-slate-100 dark:text-slate-300 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold">{step.endDate}</span>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  <td className="p-2 text-center">
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        const currentSteps = (editingQuote.scheduleSteps || []).filter((_, i) => i !== idx);
                                        const recalculated = calculateScheduleAndAssign(editingQuote.scheduleStartDate || '', currentSteps);
                                        setEditingQuote({
                                          ...editingQuote,
                                          scheduleSteps: recalculated
                                        });
                                      }}
                                      className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 p-1 rounded-md transition-colors cursor-pointer"
                                      title="刪除步驟"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Live Horizontal Gantt Calendar Preview */}
                      <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800 animate-fade-in">
                        <HorizonScheduleCalendar steps={editingQuote.scheduleSteps || []} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Save footer */}
              <div className="bg-slate-100 px-6 py-4 flex flex-wrap gap-2.5 sm:gap-3 justify-end items-center">
                <button 
                  onClick={handleExitEditing}
                  className="px-4 py-2 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-slate-700 font-bold text-sm transition-colors cursor-pointer shrink-0"
                >
                  退出草稿
                </button>
                <button 
                  onClick={handlePreviewEditingQuote}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-bold text-sm transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm shrink-0"
                >
                  <Eye className="w-4 h-4" /> 預覽合約
                </button>
                <button 
                  onClick={handlePrintEditingQuote}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm shrink-0"
                >
                  <Printer className="w-4 h-4" /> 列印 / 匯出
                </button>
                <button 
                  onClick={() => handleSaveQuotation(false)}
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-sm transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm shrink-0"
                >
                  <Save className="w-4 h-4" /> 儲存合約變更
                </button>
              </div>
            </section>
          ) : (
            /* --- QUOTATION DIRECTORY VIEW --- */
            <section className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
              <div className="border-b border-gray-100 bg-slate-50 px-6 py-4 flex items-center justify-between">
                <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-600" />
                  <span>工程報價單資料庫檔案</span>
                  <span className="text-2xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                    共 {filteredQuotations.length} 份
                  </span>
                </h3>
              </div>

              {filteredQuotations.length === 0 ? (
                /* Empty state screen with professional guide details */
                <div className="p-16 text-center text-gray-400 max-w-md mx-auto">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100 shadow-3xs">
                    <FileText className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="font-extrabold text-slate-700 text-md">暫無報價單記錄</p>
                  <p className="text-xs text-gray-500 mt-2">
                    目前本機 PWA 暫無任何已儲存的工程合約，點選下方按鈕，或透過設定匯入數據、載入演示用報價單，開始製作您的工程合約。
                  </p>
                  
                  <div className="mt-6 flex flex-col gap-2">
                    <button 
                      onClick={handleInitiateNewQuote}
                      className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-bold shadow-md cursor-pointer inline-flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> 創建第一份報價單
                    </button>
                    <button 
                      onClick={() => document.getElementById('single-quote-import-input-empty')?.click()}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-md cursor-pointer inline-flex items-center justify-center gap-1.5"
                    >
                      <Upload className="w-4 h-4" /> 上載報價單
                    </button>
                    <input 
                      type="file" 
                      id="single-quote-import-input-empty" 
                      accept=".json" 
                      className="hidden" 
                      onChange={handleImportSingleQuote} 
                    />
                    {quotations.length === 0 && (
                      <button 
                        onClick={handleLoadSampleQuotes}
                        className="px-5 py-2 text-slate-600 hover:bg-gray-100 rounded-lg text-xs font-semibold cursor-pointer border border-gray-200"
                      >
                        載入系統內置展示方案
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Scrollable list directory table */
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100/70 border-b border-gray-100 text-xs font-semibold text-gray-500">
                        <th className="px-5 py-3 w-36">報價單編號</th>
                        <th className="px-4 py-3">客戶姓名 ． 聯絡電話</th>
                        <th className="px-4 py-3">裝修地址 detail</th>
                        <th className="px-4 py-3 text-center">版本備份</th>
                        <th className="px-4 py-3 text-right">款項總金額 (HKD)</th>
                        <th className="px-4 py-3 text-center">進度狀態</th>
                        <th className="px-5 py-3 text-right">管理操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredQuotations.map((quote) => {
                        const financials = getQuoteFinancials(quote);
                        return (
                          <tr key={quote.id} className="hover:bg-slate-50/50 transition-colors">
                            {/* Quotation ID */}
                            <td className="px-5 py-4 font-mono font-bold text-xs text-slate-700">
                              {quote.id}
                            </td>
                            
                            {/* Client particulars */}
                            <td className="px-4 py-4">
                              <div className="font-bold text-slate-800">{quote.customerName}</div>
                              <div className="text-xs text-gray-500 font-mono mt-0.5">{quote.phone || '--'}</div>
                            </td>

                            {/* Address details */}
                            <td className="px-4 py-4 max-w-xs truncate text-[13px] text-gray-600" title={quote.address}>
                              {quote.address || '未填寫修繕地址'}
                            </td>

                            {/* Version state */}
                            <td className="px-4 py-4 text-center text-xs">
                              <span className="px-1.5 py-0.5 bg-slate-100 rounded border border-gray-200 font-semibold font-mono text-gray-500">
                                {quote.version || 'v1.0'}
                              </span>
                            </td>

                            {/* Quotation grand total cash flow */}
                            <td className="px-4 py-4 text-right font-mono font-extrabold text-amber-700">
                              ${financials.grandTotal.toLocaleString()}
                            </td>

                            {/* Quotation Process State */}
                            <td className="px-4 py-4 text-center">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusStyle(quote.status).bg} ${getStatusStyle(quote.status).text}`}>
                                {getStatusLabel(quote.status)}
                              </span>
                            </td>


                            {/* Row specific operational handlers */}
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button 
                                  onClick={() => {
                                    setEditingQuote(quote);
                                    setOriginalQuoteId(quote.id);
                                    setLastSavedQuoteJson(JSON.stringify(quote));
                                  }}
                                  className="p-1.5 hover:bg-amber-50 text-amber-600 rounded cursor-pointer transition-colors"
                                  title="點選編輯工程"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleCloneQuote(quote)}
                                  className="p-1.5 hover:bg-slate-100 text-slate-600 rounded cursor-pointer transition-colors animate-fade-in"
                                  title="複製合約副本"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleExportQuoteJSON(quote)}
                                  className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded cursor-pointer transition-colors"
                                  title="導出這張報價單 (JSON)"
                                >
                                  <FileJson className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => setPreviewQuote(quote)}
                                  className="p-1.5 hover:bg-[#FFF8F0] text-[#E07A5F] rounded cursor-pointer transition-colors"
                                  title="預覽報價單 (PDF格式)"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleTriggerPrint(quote)}
                                  className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded cursor-pointer transition-colors"
                                  title="合約列印與 PDF 下載"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteQuote(quote.id)}
                                  className="p-1.5 hover:bg-rose-50 text-rose-500 rounded cursor-pointer transition-colors"
                                  title="永久銷毀此合約"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </main>



        {/* --- SYSTEM WORKSPACE SETTINGS MODAL OVERLAY --- */}
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl h-[680px] max-h-[85vh] overflow-hidden flex flex-col border border-slate-100">
              
              {/* Modal header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-900 text-white">
                <h4 className="font-bold text-base flex items-center gap-1.5">
                  <Settings className="w-5 h-5 text-amber-500 animate-spin-slow" />
                  <span>築匠合約系統 ． 離線參數設定庫</span>
                </h4>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1 hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs nav rail */}
              <div className="flex border-b border-gray-200 bg-slate-50">
                <button 
                  onClick={() => setSettingsTab('library')}
                  className={`flex-1 px-4 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${settingsTab === 'library' ? 'border-amber-600 text-amber-700 bg-white' : 'border-transparent text-gray-500 hover:text-slate-800'}`}
                >
                  <BookOpen className="w-4 h-4" />
                  標準項目庫
                </button>
                <button 
                  onClick={() => setSettingsTab('footer')}
                  className={`flex-1 px-4 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${settingsTab === 'footer' ? 'border-amber-600 text-amber-700 bg-white' : 'border-transparent text-gray-500 hover:text-slate-800'}`}
                >
                  <Coins className="w-4 h-4" />
                  一般設定與帳戶管理
                </button>
                <button 
                  onClick={() => setSettingsTab('backup')}
                  className={`flex-1 px-4 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${settingsTab === 'backup' ? 'border-amber-600 text-amber-700 bg-white' : 'border-transparent text-gray-500 hover:text-slate-800'}`}
                >
                  <Upload className="w-4 h-4" />
                  資料庫備份管理
                </button>
                <button 
                  onClick={() => setSettingsTab('developer')}
                  className={`flex-1 px-4 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${settingsTab === 'developer' ? 'border-amber-600 text-amber-700 bg-white' : 'border-transparent text-gray-500 hover:text-slate-800'}`}
                >
                  <FileJson className="w-4 h-4" />
                  資料除錯診斷
                </button>
              </div>

              {/* Tab views contents */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* 1. LIBRARY WORKSPACE */}
                {settingsTab === 'library' && (
                  <div className="space-y-6">
                    <p className="text-xs text-gray-500">標準項目庫：可在此修改或定置各項預設的單價或備註範本，新造項目不用每次打字編寫。</p>
                    
                    {/* Add classification category */}
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200/50 space-y-3">
                      <h5 className="text-xs font-bold text-amber-900">新造工程大類分類</h5>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="例如：油漆或室外花園追加..." 
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm"
                        />
                        <button 
                          onClick={handleAddCategory}
                          className="px-4 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700"
                        >
                          加分類
                        </button>
                      </div>
                    </div>

                    {/* Show categories lists */}
                    <div className="space-y-4">
                      {categories.map((cat) => (
                        <div key={cat} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-3">
                          <div className="flex justify-between items-center bg-gray-100 p-2 rounded-lg">
                            <span className="font-extrabold text-sm text-slate-800">{cat}</span>
                            <button 
                              onClick={() => handleDeleteCategory(cat)}
                              className="text-2xs text-rose-500 font-bold hover:underline"
                            >
                              刪除此分類大類及標準庫
                            </button>
                          </div>

                          {/* Items in category library */}
                          <div className="space-y-1.5">
                            {standardItems[cat]?.map((item, itemIdx) => (
                              <div key={itemIdx} className="flex justify-between items-start bg-white p-2 border border-gray-100 rounded shadow-3xs text-xs">
                                <div>
                                  <span className="font-bold text-slate-700">{item.name}</span>
                                  <span className="text-2xs text-gray-400 font-mono ml-2">單位：{item.unit} ． HKD 參考單價:{item.priceRange}</span>
                                  {item.defaultRemark && (
                                    <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{item.defaultRemark}</p>
                                  )}
                                </div>
                                <button 
                                  onClick={() => handleRemoveStandardItem(cat, itemIdx)}
                                  className="text-gray-400 hover:text-rose-500"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                            {(!standardItems[cat] || standardItems[cat].length === 0) && (
                              <p className="text-[11px] text-gray-400 italic">此分類目前無標準項目庫模板</p>
                            )}
                          </div>

                          {/* Quick add custom standard item template */}
                          <div className="border-t border-gray-200 pt-3 grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                            <div className="md:col-span-1.5">
                              <label className="block text-3xs text-gray-400">工程項描述 *</label>
                              <input 
                                type="text"
                                placeholder="標準項目描述..."
                                value={librarySelectCategory === cat ? newStandardItem.name : ''}
                                onChange={(e) => {
                                  setLibrarySelectCategory(cat);
                                  setNewStandardItem({ ...newStandardItem, name: e.target.value });
                                }}
                                className="w-full p-1 border border-gray-300 rounded text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-3xs text-gray-400">單位 *</label>
                              <input 
                                type="text"
                                placeholder="項 / 直呎"
                                value={librarySelectCategory === cat ? newStandardItem.unit : ''}
                                onChange={(e) => {
                                  setLibrarySelectCategory(cat);
                                  setNewStandardItem({ ...newStandardItem, unit: e.target.value });
                                }}
                                className="w-full p-1 border border-gray-300 rounded text-xs bg-white text-center"
                              />
                            </div>
                            <div>
                              <label className="block text-3xs text-gray-400">HKD 參考單價(區間) *</label>
                              <input 
                                type="text"
                                placeholder="900 / 1200-2000"
                                value={librarySelectCategory === cat ? newStandardItem.priceRange : ''}
                                onChange={(e) => {
                                  setLibrarySelectCategory(cat);
                                  setNewStandardItem({ ...newStandardItem, priceRange: e.target.value });
                                }}
                                className="w-full p-1 border border-gray-300 rounded text-xs bg-white text-right"
                              />
                            </div>
                            <div>
                              <button 
                                onClick={() => {
                                  if (librarySelectCategory !== cat) {
                                    showToast('請修改對應分類新項目名稱', 'error');
                                    return;
                                  }
                                  handleAddStandardItem(cat);
                                }}
                                className="w-full py-1 bg-amber-600 text-white rounded text-xs font-bold hover:bg-amber-700"
                              >
                                加入細項
                              </button>
                            </div>
                            <div className="col-span-1 md:col-span-4">
                              <label className="block text-3xs text-gray-400">預設此細項工程合約標準備註工法</label>
                              <input 
                                type="text"
                                placeholder="例如: 採用E1環保板材，連工包料安裝到位"
                                value={librarySelectCategory === cat ? newStandardItem.defaultRemark : ''}
                                onChange={(e) => {
                                  setLibrarySelectCategory(cat);
                                  setNewStandardItem({ ...newStandardItem, defaultRemark: e.target.value });
                                }}
                                className="w-full p-1 border border-gray-300 rounded text-xs bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. FOOTER AND FINANCIAL PARAMETERS */}
                {settingsTab === 'footer' && (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500">此款帳戶資料與預設合約規範將在 PDF 印製、CSV 面板、以及新開合約草稿範例中自動套用。</p>
                    
                    {/* Footers Toggler */}
                    <div id="footer-visibility-toggle-container" className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between text-left">
                      <div>
                        <span id="footer-toggle-title" className="text-xs font-black text-slate-800 block mb-0.5">顯示系統底部資訊欄 (System Footer)</span>
                        <span id="footer-toggle-description" className="text-[10px] text-gray-500 font-medium">開啟後將在主畫面底部顯示系統版本、更新詳情、資料還原、與工程標準庫。</span>
                      </div>
                      <label id="footer-toggle-label" className="relative inline-flex items-center cursor-pointer select-none">
                        <input 
                          id="footer-toggle-checkbox"
                          type="checkbox"
                          checked={!!settings.showMainFooter}
                          onChange={(e) => setSettings({ ...settings, showMainFooter: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div id="footer-toggle-switch" className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                      </label>
                    </div>

                    {/* Dark Mode Toggler */}
                    <div id="dark-mode-toggle-container" className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between text-left">
                      <div>
                        <span id="dark-mode-toggle-title" className="text-xs font-black text-slate-800 block mb-0.5">開啟系統黑夜模式 (Dark Mode)</span>
                        <span id="dark-mode-toggle-description" className="text-[10px] text-gray-500 font-medium">調整系統配色為舒適的深色主題，減少暗光環境下的視覺疲勞。</span>
                      </div>
                      <label id="dark-mode-toggle-label" className="relative inline-flex items-center cursor-pointer select-none">
                        <input 
                          id="dark-mode-toggle-checkbox"
                          type="checkbox"
                          checked={!!settings.isDarkMode}
                          onChange={(e) => {
                            const updated = { ...settings, isDarkMode: e.target.checked };
                            syncSettings(updated);
                          }}
                          className="sr-only peer"
                        />
                        <div id="dark-mode-toggle-switch" className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">施工往來銀行</label>
                        <input 
                          type="text" 
                          value={settings.bankName}
                          onChange={(e) => setSettings({...settings, bankName: e.target.value})}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">承辦商法定主體公司名稱</label>
                        <input 
                          type="text" 
                          value={settings.companyName}
                          onChange={(e) => setSettings({...settings, companyName: e.target.value})}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">對公/對私收取往來號碼</label>
                        <input 
                          type="text" 
                          value={settings.bankAccount}
                          onChange={(e) => setSettings({...settings, bankAccount: e.target.value})}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">轉數快(FPS ID)</label>
                        <input 
                          type="text" 
                          value={settings.fpsId}
                          onChange={(e) => setSettings({...settings, fpsId: e.target.value})}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">承載預設合約特別條約規範</label>
                      <textarea 
                        rows={10}
                        value={settings.defaultTerms}
                        onChange={(e) => setSettings({...settings, defaultTerms: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg text-xs leading-relaxed font-sans bg-white"
                        placeholder="在此輸入公司標準保固期、退還規則、泥水工程進度付款聲明..."
                      />
                    </div>
                  </div>
                )}

                {/* 3. DATABASE BACKUP AND FACTORY RESTORES */}
                {settingsTab === 'backup' && (
                  <div className="space-y-6">
                    <p className="text-xs text-gray-500">系統完全不依赖網路雲端伺服器！所有合約資訊及項目庫皆加密儲存在您瀏覽器沙盒硬碟中（LocalStorage）。您隨時可以安全匯出與還原。</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Export backup JSON */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                        <div className="flex items-center gap-2 text-slate-800">
                          <Download className="w-5 h-5 text-amber-600" />
                          <h5 className="font-bold text-xs">安全下載完整備份帳簿</h5>
                        </div>
                        <p className="text-xs text-gray-500">將目前的「所有報價合約」、「工程大類」、「標準細項庫」與「頁尾與款額設定」完整打包為一個 `.json` 備份檔，儲存在您的本地電腦/手機硬碟。</p>
                        <button 
                          onClick={handleExportBackup}
                          className="w-full px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors"
                        >
                          下載完整 JSON 備份檔
                        </button>
                      </div>

                      {/* Import recover backup */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                        <div className="flex items-center gap-2 text-slate-800">
                          <Upload className="w-5 h-5 text-emerald-600" />
                          <h5 className="font-bold text-xs">匯入還原完整備份帳簿</h5>
                        </div>
                        <p className="text-xs text-gray-500">選擇先前從本系統導出的 JSON 備份檔。該操作將自動注入還原先前備忘錄與工程合約庫。</p>
                        
                        <div className="relative">
                          <input 
                            type="file" 
                            accept=".json"
                            onChange={handleImportBackup}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <button 
                            className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors pointer-events-none"
                          >
                            選取本機備份檔 (.json)
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Factory reset option */}
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3 text-2xs">
                      <h5 className="font-bold text-xs text-rose-800 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>危險操作：還原系統出廠預設（Factory Hard Reset）</span>
                      </h5>
                      <p className="text-rose-600 leading-relaxed font-semibold">這會毀滅性刪除您在本系統中手工添加的所有報價單與特別項目！請事先在上方完成備份。確定真的要全部刪除嗎？</p>
                      <button 
                        onClick={handleFactoryReset}
                        className="px-4 py-2 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 cursor-pointer text-xs"
                      >
                        永久清空本地儲存並回到出廠原始狀態
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. DIAGNOSTIC DEVELOPER LOGS (JSON QUOTE INSPECTOR) */}
                {settingsTab === 'developer' && (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500">合約 JSON 解析除錯：在此可以快速檢閱您硬碟中所有報價單或系統狀態底層 Raw JSON，以便用於備份修補或系統開發檢測。</p>
                    <div className="bg-slate-900 text-emerald-500 p-4 rounded-xl font-mono text-2xs overflow-x-auto max-h-[30vh] space-y-1">
                      <div>// 系統資料庫快照摘要 :</div>
                      <div>{"{"}</div>
                      <div className="ml-4">"系統合約數量": {quotations.length},</div>
                      <div className="ml-4">"大類分類數量": {categories.length},</div>
                      <div className="ml-4">"往來主體公司": "{settings.companyName}",</div>
                      <div className="ml-4 flex gap-1">"所有存儲合約單號簡錄": [ {quotations.map(q => `"${q.id}"`).join(', ')} ]</div>
                      <div>{"}"}</div>
                      
                      <div className="pt-4 border-t border-slate-800 text-gray-400 mt-2">// 底層 LocalStorage 原生產出：</div>
                      <pre className="text-gray-300">
                        {JSON.stringify({ 
                          quotations: quotations.slice(0, 2), 
                          settings: settings 
                        }, null, 2)}
                      </pre>
                    </div>

                    {/* System signature and automated release logs underneath the JSON debugger */}
                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 mt-4 space-y-4 text-left">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                        <div className="space-y-0.5 text-left">
                          <h4 className="text-xs font-black text-slate-800">築匠系統版本與作者資訊</h4>
                          <p className="text-[10px] text-gray-500 font-bold">製作人: WHLEE | © 2026 WHLEE. All Rights Reserved.</p>
                        </div>
                        <span className="text-[10px] font-mono font-black text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200 shrink-0">
                          系統版本: V{APP_CURRENT_VERSION}
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                          <span>🔧 自動化系統更新記錄 (System Release Logs)</span>
                          <span className="text-[10px] text-gray-400 font-bold">共 {APP_CHANGELOG.length} 次更動紀錄</span>
                        </div>
                        <div className="space-y-3 overflow-y-auto max-h-[25vh] pr-1.5">
                          {APP_CHANGELOG.slice().reverse().map((log) => (
                            <div key={log.version} className="bg-white border border-slate-200/50 p-2.5 rounded-lg space-y-1.5 shadow-2xs text-left">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black font-mono text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                                  V{log.version}
                                </span>
                                <span className="text-[9px] text-gray-400 font-mono font-bold">{log.date}</span>
                              </div>
                              <ul className="space-y-1 pl-1.5">
                                {log.details.map((detail, dIdx) => (
                                  <li key={dIdx} className="text-[10.5px] text-slate-600 leading-relaxed font-bold list-disc ml-3 text-left">
                                    {detail}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Modal controls actions footer */}
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex-1 px-4 py-2 text-slate-700 bg-gray-200 hover:bg-gray-300 rounded-lg text-xs font-bold text-center transition-colors cursor-pointer"
                >
                  關閉
                </button>
                <button 
                  onClick={handleSaveSettings}
                  className="flex-1 px-4 py-2 text-white bg-amber-600 hover:bg-amber-700 rounded-lg text-xs font-bold text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  儲存系統參數設定
                </button>
              </div>

            </div>
          </div>
        )}

        {/* --- SYSTEM STATS BOTTOM FLOATING MOBILE ACTIONS TAB BAR --- */}
        {settings.showMainFooter && (
          <footer id="system-navigation-footer" className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 text-gray-400 py-3 px-6 z-30 shadow-2xl flex flex-col md:flex-row items-center justify-between text-xs font-semibold select-none gap-2 md:gap-0">
            <div id="footer-logo-changelog-container" className="flex items-center gap-2.5 flex-wrap justify-center md:justify-start">
              <span id="footer-accent-dot" className="w-2.5 h-2.5 bg-amber-600 rounded-sm shrink-0"></span>
              <span id="footer-company-brief" className="text-white shrink-0">裝修報價助手</span>
              <span id="footer-version-tag" className="text-[11px] text-amber-500 font-mono font-bold bg-slate-800 px-2 py-0.5 rounded border border-slate-700 shrink-0">
                V{APP_CURRENT_VERSION}
              </span>
              <button
                id="footer-changelog-trigger-btn"
                onClick={() => setIsChangelogOpen(true)}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-650 text-amber-500 hover:text-amber-400 transition-colors rounded text-[10px] font-bold border border-slate-705/80 cursor-pointer flex items-center gap-1 shrink-0"
                title="檢視詳細歷史更新紀錄"
              >
                <Info className="w-3 h-3" /> 更新詳情
              </button>
            </div>
            <div id="footer-quick-links-container" className="flex gap-4 items-center justify-center">
              <button 
                id="footer-import-restore-btn"
                onClick={() => {
                  setIsSettingsOpen(true);
                  setSettingsTab('backup');
                }}
                className="hover:text-amber-500 flex items-center gap-1 text-xs cursor-pointer transition-colors"
              >
                <Upload className="w-3.5 h-3.5" /> 匯入還原
              </button>
              <span id="footer-divider-pipe" className="text-slate-800">|</span>
              <button 
                id="footer-standard-library-btn"
                onClick={() => {
                  setIsSettingsOpen(true);
                  setSettingsTab('library');
                }}
                className="hover:text-amber-500 flex items-center gap-1 text-xs cursor-pointer transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" /> 工程標準庫
              </button>
            </div>
          </footer>
        )}

        {/* --- CUSTOM CREATION MODAL FOR NEW QUOTATION --- */}
        {newQuoteModal && newQuoteModal.isOpen && (
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs z-[110] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 p-6 flex flex-col gap-4 text-left">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                <div className="p-2 bg-amber-50 rounded-full text-amber-600">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-slate-800">創建新報價工程</h3>
              </div>
              
              <div className="space-y-4 py-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>報價合約單號 *</span>
                    <button 
                      type="button" 
                      onClick={() => setNewQuoteModal({ ...newQuoteModal, id: newQuoteModal.suggestedId })}
                      className="text-[10px] text-amber-600 hover:underline cursor-pointer"
                    >
                      重新使用建議單號
                    </button>
                  </label>
                  <input 
                    type="text" 
                    value={newQuoteModal.id}
                    onChange={(e) => setNewQuoteModal({ ...newQuoteModal, id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-350 rounded-lg text-sm font-semibold font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500/20 focus:border-amber-600"
                    placeholder="請輸入報價單/合約號碼"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">例如：QT-20261101-0001。此單號亦可在合約編輯頁面中隨時直接修改。</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">客戶姓名 *</label>
                  <input 
                    type="text" 
                    value={newQuoteModal.customerName}
                    onChange={(e) => setNewQuoteModal({ ...newQuoteModal, customerName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-350 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500/20 focus:border-amber-600"
                    placeholder="輸入客戶稱呼（如：陳大文先生）"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 mt-2 justify-end border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setNewQuoteModal(null)}
                  className="px-4 py-1.5 border border-gray-200 hover:bg-gray-50 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmCreateQuote(newQuoteModal.id, newQuoteModal.customerName)}
                  className="px-5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-sm flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  確認並開始編制
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- CUSTOM BEAUTIFUL CONFIRMATION MODAL --- */}
        {confirmDialog && confirmDialog.isOpen && (
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs z-[110] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 p-6 flex flex-col gap-4 text-left">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-50 rounded-full text-rose-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-slate-800">{confirmDialog.title}</h3>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed font-semibold">
                {confirmDialog.message}
              </p>
              <div className="flex flex-wrap gap-2 mt-2 justify-end">
                {confirmDialog.altConfirmText && confirmDialog.onAltConfirm && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirmDialog.onAltConfirm) {
                        confirmDialog.onAltConfirm();
                      }
                      setConfirmDialog(null);
                    }}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-sm"
                  >
                    {confirmDialog.altConfirmText}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="px-3.5 py-1.5 border border-gray-200 hover:bg-gray-50 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  {confirmDialog.cancelText || '取消'}
                </button>
                <button
                  type="button"
                  onClick={confirmDialog.onConfirm}
                  className={`px-4 py-1.5 ${confirmDialog.altConfirmText ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-600 hover:bg-rose-700'} text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-sm`}
                >
                  {confirmDialog.confirmText || '確定'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- DYNAMIC CHANGELOG MODAL --- */}
        {isChangelogOpen && (
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs z-[110] flex items-center justify-center p-4 animate-fade-in text-left">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-500">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-wide">裝修合約系統更新歷史日誌</h3>
                    <p className="text-[10px] text-gray-400">目前版本：V{APP_CURRENT_VERSION} | 製作人：WHLEE</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsChangelogOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable logs */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
                {APP_CHANGELOG.slice().reverse().map((log, index) => (
                  <div key={log.version} className="relative pl-5 border-l-2 border-amber-500/30 last:pb-0">
                    {/* Time indicator point */}
                    <div className="absolute -left-[6px] top-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-white shadow-2xs" />
                    
                    {/* Log item details */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-mono">
                          V{log.version}
                        </span>
                        {index === 0 && (
                          <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded uppercase tracking-wide">
                            最新版本 Current
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400 font-bold font-mono">
                          {log.date}
                        </span>
                      </div>
                      
                      <ul className="space-y-1.5 pl-1">
                        {log.details.map((detail, dIdx) => (
                          <li key={dIdx} className="text-xs text-slate-700 leading-relaxed font-semibold list-disc ml-3">
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setIsChangelogOpen(false)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-sm"
                >
                  確認並關閉
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
