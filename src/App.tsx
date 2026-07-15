import React, { useState, useEffect, useMemo, useRef, ChangeEvent } from 'react';
import { 
  Plus, Search, FileText, Settings, RefreshCw, Edit, Trash2, 
  Copy, Printer, Download, Upload, X, Save, PlusCircle, Check, 
  AlertTriangle, ChevronDown, ChevronUp, BookOpen, Coins, FileSpreadsheet,
  CheckCircle, FileJson, Info, Share2, Eye, History, LogOut, Users, Key, Database,
  Percent, Clock, DollarSign, Calendar, Sparkles, Lock, EyeOff, GripVertical
} from 'lucide-react';
import { Quotation, QuotationItem, QuotationStatus, StandardItem, QuoteSettings, BackupData, PaymentStage, ScheduleStep, UserAccount, CalendarEvent, VariationOrder, ProjectTemplate } from './types';
import { DEFAULT_CATEGORIES, DEFAULT_STANDARD_ITEMS, DEFAULT_SETTINGS } from './defaults';
import { saveStandardLibraryToFirebase, loadStandardLibraryFromFirebase } from './db/standardItems';
import { dbGet, dbSet, dbClear } from './indexedDB';
import {
  initDefaultAdmin,
  initSharedDataIfEmpty,
  authenticateFirestoreUser,
  listenToUsers,
  listenToCurrentUser,
  saveUserAccount,
  deleteUserAccount,
  listenToQuotations,
  saveQuotationToFirestore,
  deleteQuotationFromFirestore,
  listenToSharedData,
  saveSharedCategories,
  saveSharedLibrary,
  saveSharedSettings,
  listenToCalendarEvents,
  saveCalendarEventToFirestore,
  deleteCalendarEventFromFirestore,
  listenToProjectTemplates,
  saveProjectTemplateToFirestore,
  deleteProjectTemplateFromFirestore
} from './lib/firebase';
import CalendarDashboard from './components/CalendarDashboard';

const parseFormattedText = (text: string) => {
  if (!text) return '';
  
  // First escape general HTML characters to prevent XSS / broken structures
  let safeHtml = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Apply bold tags (supports **text**, [b]text[/b], <b>text</b>)
  safeHtml = safeHtml.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  safeHtml = safeHtml.replace(/\[b\](.*?)\[\/b\]/gi, '<strong>$1</strong>');
  safeHtml = safeHtml.replace(/&lt;b&gt;(.*?)&lt;\/b&gt;/gi, '<strong>$1</strong>');
  safeHtml = safeHtml.replace(/&lt;strong&gt;(.*?)&lt;\/strong&gt;/gi, '<strong>$1</strong>');

  // Colors mapping (using elegant theme colors)
  safeHtml = safeHtml.replace(/\[red\](.*?)\[\/red\]/gi, '<span style="color: #e11d48; font-weight: bold;">$1</span>');
  safeHtml = safeHtml.replace(/\[blue\](.*?)\[\/blue\]/gi, '<span style="color: #2563eb; font-weight: bold;">$1</span>');
  safeHtml = safeHtml.replace(/\[green\](.*?)\[\/green\]/gi, '<span style="color: #059669; font-weight: bold;">$1</span>');
  safeHtml = safeHtml.replace(/\[amber\](.*?)\[\/amber\]/gi, '<span style="color: #d97706; font-weight: bold;">$1</span>');
  safeHtml = safeHtml.replace(/\[orange\](.*?)\[\/orange\]/gi, '<span style="color: #ea580c; font-weight: bold;">$1</span>');
  safeHtml = safeHtml.replace(/\[purple\](.*?)\[\/purple\]/gi, '<span style="color: #7c3aed; font-weight: bold;">$1</span>');
  
  // Support [color=hex/name]...[/color]
  safeHtml = safeHtml.replace(/\[color=(.*?)\](.*?)\[\/color\]/gi, '<span style="color: $1; font-weight: bold;">$2</span>');
  
  // Also support inline styled span if someone copies it
  safeHtml = safeHtml.replace(/&lt;span style=&quot;color:\s*(.*?);?&quot;&gt;(.*?)&lt;\/span&gt;/gi, '<span style="color: $1; font-weight: bold;">$2</span>');

  return <span dangerouslySetInnerHTML={{ __html: safeHtml }} />;
};

const insertFormatting = (
  textareaId: string,
  startTag: string,
  endTag: string,
  currentValue: string,
  setValue: (val: string) => void
) => {
  const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
  if (!textarea) {
    setValue(currentValue + startTag + endTag);
    return;
  }
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selectedText = text.substring(start, end);
  const replacement = startTag + selectedText + endTag;
  const newValue = text.substring(0, start) + replacement + text.substring(end);
  setValue(newValue);
  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(start + startTag.length, start + startTag.length + selectedText.length);
  }, 10);
};


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
  },
  {
    version: '3.0.1',
    date: '2026-07-06',
    details: [
      '核心大版本 V3.0 正式啟動，全面升級裝修報價與定製傢俬系統核心架構，提升數據吞吐與多端離線交互效能。'
    ]
  },
  {
    version: '3.0.2',
    date: '2026-07-06',
    details: [
      '優化 IndexedDB 高速快取緩衝區，在弱網與無網環境下可穩定保存百筆以上的大型工程報價單。'
    ]
  },
  {
    version: '3.0.3',
    date: '2026-07-06',
    details: [
      '最佳化 A4 行動端 PDF 列印及預覽，微調邊距，保障報價表格於多種不同設備輸出時的寬度一致。'
    ]
  },
  {
    version: '3.0.4',
    date: '2026-07-06',
    details: [
      '追加項目 (VO) 全新支援分期收款期數與金額比例設定，能靈活按工程驗收階段分別開單跟進。'
    ]
  },
  {
    version: '3.0.5',
    date: '2026-07-06',
    details: [
      '修復後加項目特別折讓 (voDiscount) 在特定折扣率下計算結果出現微小四捨五入偏差的精度問題。'
    ]
  },
  {
    version: '3.0.6',
    date: '2026-07-07',
    details: [
      '標準項目庫支援一鍵拖拽排序與上下移動，大類之內的項目可任意排定優先級，免去重寫煩惱。'
    ]
  },
  {
    version: '3.0.7',
    date: '2026-07-07',
    details: [
      '新增標準項目庫之本地 JSON 檔案一鍵匯出 (Backup) 與上載恢復功能，輕鬆遷移資料。'
    ]
  },
  {
    version: '3.0.8',
    date: '2026-07-07',
    details: [
      '精準校對印表模式 A4 續頁頁首單號資訊，確保 VO 項目續頁附帶 VO 首碼，格式更顯嚴謹。'
    ]
  },
  {
    version: '3.0.9',
    date: '2026-07-07',
    details: [
      'Firebase 多租戶雲端同步衝突檢測升級，在檢測到雲端與本地衝突時可智慧提示人工選擇覆蓋。'
    ]
  },
  {
    version: '3.0.10',
    date: '2026-07-07',
    details: [
      '深色模式 (Dark Mode) 全色盤對比度再次調優，解決部分輸入框邊框在暗光下過淡難以辨識的體驗。'
    ]
  },
  {
    version: '3.0.11',
    date: '2026-07-08',
    details: [
      '度尺、見客、覆尺等現場按鈕與常用快速 Chip 的觸控尺寸嚴格拉大至 48x48px，現場戴手套也極易操作。'
    ]
  },
  {
    version: '3.0.12',
    date: '2026-07-08',
    details: [
      '完善權限矩陣分配，非管理員帳號 (Staff) 於鎖定合約 (isLocked) 下所有修改和儲存按鈕自動進入唯讀灰階。'
    ]
  },
  {
    version: '3.0.13',
    date: '2026-07-08',
    details: [
      '智慧工期推算引擎優化，2026-2028 年香港公眾假期數據全量對齊，工序時間安排萬無一失。'
    ]
  },
  {
    version: '3.0.14',
    date: '2026-07-08',
    details: [
      '修復在部分平板瀏覽器上，即使合約鎖定後追加項目依然可以新增或刪除的唯讀漏洞。'
    ]
  },
  {
    version: '3.0.15',
    date: '2026-07-08',
    details: [
      '強大之多關鍵字搜尋篩選器，支援空格隔開之複合字眼檢索，報價與客戶尋找不再費力。'
    ]
  },
  {
    version: '3.0.16',
    date: '2026-07-09',
    details: [
      '新增「合約版本歷史與備忘」，修改時系統自動記錄當前操作者的編輯軌跡與更動備份。'
    ]
  },
  {
    version: '3.0.17',
    date: '2026-07-09',
    details: [
      '優化全域 Toast 彈出層級至 z-[99999]，保證任何 Modal、抽屜或列印遮罩下皆不被阻擋。'
    ]
  },
  {
    version: '3.0.18',
    date: '2026-07-09',
    details: [
      'A4 列印頁尾全新自適應排版，使客戶確認與公司代表簽章對齊於實體紙張底部，絕不留多餘空白。'
    ]
  },
  {
    version: '3.0.19',
    date: '2026-07-09',
    details: [
      '支持將報價合約及工程細項一鍵保存並發送至本地端 PDF 下載，完美保存手寫簽署筆跡。'
    ]
  },
  {
    version: '3.0.20',
    date: '2026-07-09',
    details: [
      '行動端手勢流暢度優化，支援在「合約 / 收款 / 行事曆」三大主分頁中左右輕掃手勢極速切換。'
    ]
  },
  {
    version: '3.0.21',
    date: '2026-07-10',
    details: [
      '微調明細編輯時單價或數量欄位在清空時不保留 0 的互動邏輯，大幅減輕現場報價修改的按鍵負擔。'
    ]
  },
  {
    version: '3.0.22',
    date: '2026-07-10',
    details: [
      '新增「全域公司條款範本」快選列表，一鍵即可將公司保修、收尾等聲明注入合約條款中。'
    ]
  },
  {
    version: '3.0.23',
    date: '2026-07-10',
    details: [
      '行事曆日程卡片支援自由拖拽，拖動完工期後，系統自動依序順延其後所有關聯工序。'
    ]
  },
  {
    version: '3.0.24',
    date: '2026-07-10',
    details: [
      'Firestore 查詢快取機制大幅最佳化，常規大類與標準細項庫重複加載速度節省 60% 以上流量。'
    ]
  },
  {
    version: '3.0.25',
    date: '2026-07-10',
    details: [
      '修復分期收款付款狀態變更後，施工日程上關聯付款進度的提醒標識未能即時刷新渲染的 Bug。'
    ]
  },
  {
    version: '3.0.26',
    date: '2026-07-11',
    details: [
      '報價單編輯面板 Dirty Check 加強，對條款、備註之細微變更均列入檢測範圍，徹底防呆防誤觸。'
    ]
  },
  {
    version: '3.0.27',
    date: '2026-07-11',
    details: [
      '新增「港幣大寫金額」自動生成器，匯出與列印 PDF時，合約總價自動附帶正規漢字大寫。'
    ]
  },
  {
    version: '3.0.28',
    date: '2026-07-11',
    details: [
      '標準細項庫新造項目時支援關鍵字即時智能模糊聯想，系統自動補全常見工法與默認單價。'
    ]
  },
  {
    version: '3.0.29',
    date: '2026-07-11',
    details: [
      '對齊 A4 印表公司 Logo 之最大寬高約束，防止特殊縱橫比的公司標誌導致頁眉排版被擠壓。'
    ]
  },
  {
    version: '3.0.30',
    date: '2026-07-11',
    details: [
      '離線行事曆與本地提醒規則加載重構，確保無網環境下的日程加載速度低於 100 毫秒。'
    ]
  },
  {
    version: '3.0.31',
    date: '2026-07-12',
    details: [
      '新增「一鍵鎖定合約 (Lock Contract)」功能，經客戶簽核確認的合約將凍結所有直接編輯入口。'
    ]
  },
  {
    version: '3.0.32',
    date: '2026-07-12',
    details: [
      '修正黑夜模式下部分報價表格欄位邊框色與背景色高度接近、導致無法看清欄位邊界的細節。'
    ]
  },
  {
    version: '3.0.33',
    date: '2026-07-12',
    details: [
      '嚴格優化 Firebase 安全規則，實現同一登入租戶內子帳號數據高強度獨立隔離與權限校驗。'
    ]
  },
  {
    version: '3.0.34',
    date: '2026-07-12',
    details: [
      '定製傢俬錄入新增「櫃體收口方式」與「板材飾面」快速下拉 Chip，免除繁瑣手動鍵入。'
    ]
  },
  {
    version: '3.0.35',
    date: '2026-07-12',
    details: [
      '優化 A4 PDF 列印字型解析度，在縮小列印或手機端發送時字體依然清晰，絕不發虛。'
    ]
  },
  {
    version: '3.0.36',
    date: '2026-07-13',
    details: [
      '施工行事曆特別引入「見客 (Meeting)」及「覆尺 (Re-measure)」專屬卡片徽章，與常規工期完美區分。'
    ]
  },
  {
    version: '3.0.37',
    date: '2026-07-13',
    details: [
      '修正當報價細項為自訂項目且無所屬分類時，無法套用標準條款模板的偶發性 JavaScript 異常。'
    ]
  },
  {
    version: '3.0.38',
    date: '2026-07-13',
    details: [
      '一般設定分頁新增「本機快取清理與重設」安全工具，方便在調試或切換租戶時清除本地快取。'
    ]
  },
  {
    version: '3.0.39',
    date: '2026-07-13',
    details: [
      '對齊設定面板在不同平台的分辨率與高度，固定為高質感 680px 高度防抖，交互流暢高大上。'
    ]
  },
  {
    version: '3.0.40',
    date: '2026-07-13',
    details: [
      '完美支持 PWA (Progressive Web App) 標準，離線可用性提升至 100%，打造順滑的原生級裝修報價體驗。'
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


function getDefaultReminders(steps: ScheduleStep[], quote: Quotation): { id: string; title: string; date: string; percent: number }[] {
  const reminders: { id: string; title: string; date: string; percent: number }[] = [];
  const validSteps = (steps || []).filter(s => s.name && s.startDate && s.endDate);
  if (validSteps.length === 0) return [];

  const findStepDate = (nameKeyword: string, useEnd: boolean, fallbackStepIdx: number, useStartIfFallback: boolean): string => {
    const step = validSteps.find(s => s.name.includes(nameKeyword));
    if (step) {
      return (useEnd ? step.endDate : step.startDate) || '';
    }
    const fbStep = validSteps[Math.min(fallbackStepIdx, validSteps.length - 1)];
    if (fbStep) {
      return (useStartIfFallback ? fbStep.startDate : fbStep.endDate) || '';
    }
    return quote.scheduleStartDate || '';
  };

  // 1. 第一期 35%: 簽約及進場前
  const d1 = findStepDate('清拆', false, 0, true);
  reminders.push({
    id: 'stage-1',
    title: '第一期收款：簽約及進場前',
    date: d1,
    percent: 35
  });

  // 2. 第二期 20%: 完成水、電、批盪、防水、試水48小時
  const d2 = findStepDate('水電', true, 1, false);
  reminders.push({
    id: 'stage-2',
    title: '第二期收款：完成水電隱蔽工程及試水',
    date: d2,
    percent: 20
  });

  // 3. 第三期 15%: 完成全部瓷磚安裝
  const d3 = findStepDate('泥水', true, 2, false);
  reminders.push({
    id: 'stage-3',
    title: '第三期收款：完成全部瓷磚安裝',
    date: d3,
    percent: 15
  });

  // 4. 第四期 10%: 傢俬確認施工圖 (度尺)
  const d4 = findStepDate('覆尺', true, 3, false);
  reminders.push({
    id: 'stage-4',
    title: '第四期收款：傢俬確認施工圖',
    date: d4,
    percent: 10
  });

  // 5. 第五期 15%: 傢俬送貨前 (安裝傢俬前)
  const d5 = findStepDate('傢俬', false, 5, true);
  reminders.push({
    id: 'stage-5',
    title: '第五期收款：傢俬送貨安裝前',
    date: d5,
    percent: 15
  });

  // 6. 第六期 5%: 完工後 (完成工程後)
  const d6 = validSteps[validSteps.length - 1]?.endDate || quote.scheduleStartDate || '';
  reminders.push({
    id: 'stage-6',
    title: '第六期收款：完工及驗收合格後',
    date: d6,
    percent: 5
  });

  return reminders;
}


function checkStageOverdue(quote: Quotation, sIdx: number): { isOverdue: boolean; dueDate?: string } {
  const rawSteps = quote.scheduleSteps && quote.scheduleSteps.length > 0
    ? quote.scheduleSteps
    : DEFAULT_SCHEDULE_STEPS;
  let steps = rawSteps;
  if (quote.scheduleStartDate) {
    steps = calculateScheduleAndAssign(quote.scheduleStartDate, rawSteps);
  }
  const reminders = quote.paymentReminders && quote.paymentReminders.length > 0
    ? quote.paymentReminders
    : getDefaultReminders(steps, quote);

  const targetId = `stage-${sIdx + 1}`;
  const reminder = reminders.find(r => r.id === targetId);
  if (!reminder || !reminder.date) {
    return { isOverdue: false };
  }

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  return {
    isOverdue: reminder.date < todayStr,
    dueDate: reminder.date
  };
}


function getQuotationCategories(quote: Quotation | null | undefined, globalCategories: string[]): string[] {
  if (!quote) return globalCategories;
  
  const used = new Set<string>();
  if (quote.items) {
    quote.items.forEach(i => {
      if (i.category) used.add(i.category);
    });
  }
  if (quote.voItems) {
    quote.voItems.forEach(i => {
      if (i.category) used.add(i.category);
    });
  }
  if (quote.variationOrders) {
    quote.variationOrders.forEach(vo => {
      if (vo.items) {
        vo.items.forEach(i => {
          if (i.category) used.add(i.category);
        });
      }
    });
  }
  if (quote.visibleCategories) {
    quote.visibleCategories.forEach(cat => {
      if (cat) used.add(cat);
    });
  }
  
  const result: string[] = [];
  
  // If visibleCategories is present, respect its exact order first!
  // This guarantees that newly added categories (appended to visibleCategories) stay at the very bottom
  if (quote.visibleCategories) {
    quote.visibleCategories.forEach(cat => {
      if (used.has(cat)) {
        result.push(cat);
      }
    });
  }
  
  // For other used categories (which aren't in visibleCategories, e.g. imported or older data),
  // append them in the order of globalCategories
  globalCategories.forEach(cat => {
    if (used.has(cat) && !result.includes(cat)) {
      result.push(cat);
    }
  });
  
  // Any other custom categories that are not in globalCategories or visibleCategories
  used.forEach(cat => {
    if (!result.includes(cat)) {
      result.push(cat);
    }
  });
  
  return result;
}


function HorizonScheduleCalendar({ 
  steps, 
  quote, 
  onChange, 
  isEditable = false,
  isPrint = false,
  customWeeks
}: { 
  steps: ScheduleStep[]; 
  quote?: Quotation; 
  onChange?: (updatedQuote: Quotation) => void; 
  isEditable?: boolean;
  isPrint?: boolean;
  customWeeks?: { start: Date; end: Date; label: string; days: Date[] }[];
}) {
  const validSteps = (steps || []).filter(s => s.name && s.startDate && s.endDate);
  if (validSteps.length === 0 && !customWeeks) {
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

  const weeks = customWeeks || (() => {
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
    const generatedWeeks: { start: Date; end: Date; label: string; days: Date[] }[] = [];
    let currentWeekStart = new Date(startOfWeek);
    
    // Guard infinite loops
    let safetyCounter = 0;
    while (currentWeekStart <= endOfWeek && safetyCounter < 100) {
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
      
      generatedWeeks.push({
        start: new Date(currentWeekStart),
        end: currentWeekEnd,
        label: `W${generatedWeeks.length + 1} (${m1}/${d1})`,
        days: weekDays
      });
      
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }
    return generatedWeeks;
  })();

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

  // Drag and drop & Editing state for Payment Reminders
  const [draggingReminderId, setDraggingReminderId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [editingReminder, setEditingReminder] = useState<{ id: string; title: string; date: string; percent: number } | null>(null);

  // Retrieve current active reminders (either customized or defaults)
  const reminders = useMemo(() => {
    if (!quote) return [];
    if (quote.paymentReminders && quote.paymentReminders.length > 0) {
      return quote.paymentReminders;
    }
    return getDefaultReminders(steps, quote);
  }, [quote, steps]);

  const handleDropReminder = (targetDate: string) => {
    if (!draggingReminderId || !onChange || !quote) return;
    const currentReminders = quote.paymentReminders && quote.paymentReminders.length > 0
      ? quote.paymentReminders
      : getDefaultReminders(steps, quote);

    const updatedReminders = currentReminders.map(r => {
      if (r.id === draggingReminderId) {
        return { ...r, date: targetDate };
      }
      return r;
    });

    onChange({
      ...quote,
      paymentReminders: updatedReminders
    });
    setDraggingReminderId(null);
    setDragOverDate(null);
  };

  const handleSaveReminder = (updated: { id: string; title: string; date: string; percent: number }) => {
    if (!onChange || !quote) return;
    const currentReminders = quote.paymentReminders && quote.paymentReminders.length > 0
      ? quote.paymentReminders
      : getDefaultReminders(steps, quote);

    const updatedReminders = currentReminders.map(r => {
      if (r.id === updated.id) {
        return updated;
      }
      return r;
    });

    onChange({
      ...quote,
      paymentReminders: updatedReminders
    });
    setEditingReminder(null);
  };

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
        <table 
          className="w-full border-collapse" 
          style={{ 
            tableLayout: 'fixed', 
            width: '100%',
            minWidth: isPrint ? '100%' : `${180 + totalDays * 16}px` 
          }}
        >
          <thead>
            {/* Row 1: Week headers */}
            <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <th 
                className="p-1.5 text-[10px] font-bold text-slate-600 dark:text-gray-400 border-r border-slate-200 dark:border-slate-800 text-left pl-3" 
                style={{ width: isPrint ? '130px' : '180px' }}
              >
                工序作業步驟 / 日期
              </th>
              {weeks.map((week, wIdx) => (
                <th 
                  key={wIdx} 
                  colSpan={7} 
                  className="p-1 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-[9px] font-black text-slate-700 dark:text-slate-300 bg-amber-500/5"
                >
                  {isPrint && weeks.length > 6 ? `W${wIdx + 1}` : week.label}
                </th>
              ))}
            </tr>
            {/* Row 2: Days headers */}
            <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[8px] font-semibold text-slate-500 font-mono">
              <th 
                className="p-1 border-r border-slate-200 dark:border-slate-800 text-left pl-3 text-[10px] font-bold text-gray-500" 
                style={{ width: isPrint ? '130px' : '180px' }}
              >
                日曆工作格 (Mon-Sun)
              </th>
              {allDays.map((dayDate, dIdx) => {
                const wDay = dayDate.getDay();
                const isWeekend = wDay === 0 || wDay === 6;
                const showWeekdayLabel = !isPrint || weeks.length <= 6;
                return (
                  <th 
                    key={dIdx} 
                    className={`p-0.5 border-r border-slate-200 dark:border-slate-850 text-center flex-col justify-center items-center ${isWeekend ? 'bg-rose-500/5 text-rose-500' : 'text-slate-500 dark:text-slate-400'}`}
                  >
                    {showWeekdayLabel && <div>{weekdayNamesShort[wDay]}</div>}
                    <div className={isPrint && weeks.length > 6 ? 'text-[7.5px] leading-none font-bold' : 'font-extrabold text-[9px] scale-90'}>
                      {dayDate.getDate()}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {/* Row 3: Payment Reminders (New) */}
            {quote && !isPrint && (
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-amber-500/[0.04] dark:bg-amber-950/[0.05]">
                <td 
                  className="p-2 pl-3 border-r border-slate-200 dark:border-slate-800 font-extrabold text-[10px] text-amber-800 dark:text-amber-400 flex flex-col justify-center" 
                  style={{ width: isPrint ? '130px' : '180px' }}
                >
                  <div className="flex items-center gap-1 font-black">
                    <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                    <span>💰 收款提示規劃</span>
                  </div>
                  <span className="text-[8px] text-amber-600/80 dark:text-amber-500/70 font-medium leading-normal mt-0.5">
                    {isEditable ? '可左右拖曳小圓標，點選可編輯' : '收款提示落點'}
                  </span>
                </td>
                {allDays.map((dayDate, dIdx) => {
                  const sStr = formatDateKey(dayDate);
                  const dayReminders = reminders.filter(r => r.date === sStr);
                  const wDay = dayDate.getDay();
                  const isWeekend = wDay === 0 || wDay === 6;
                  const isOver = dragOverDate === sStr;

                  return (
                    <td 
                      key={dIdx} 
                      onDragOver={(e) => {
                        if (isEditable) {
                          e.preventDefault();
                        }
                      }}
                      onDragEnter={() => {
                        if (isEditable) {
                          setDragOverDate(sStr);
                        }
                      }}
                      onDragLeave={() => {
                        if (isEditable) {
                          setDragOverDate(null);
                        }
                      }}
                      onDrop={() => {
                        if (isEditable) {
                          handleDropReminder(sStr);
                        }
                      }}
                      className={`p-0.5 bg-transparent relative border-r border-slate-150 dark:border-slate-850/50 text-center select-none align-middle ${isWeekend ? 'bg-rose-500/[0.02] dark:bg-rose-950/[0.02]' : ''} ${isOver ? 'bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-500 animate-pulse' : ''}`}
                      style={{ height: isPrint && weeks.length > 6 ? '28px' : '48px' }}
                    >
                      <div className={`flex flex-col items-center justify-center gap-1 w-full h-full ${isPrint && weeks.length > 6 ? 'min-h-[20px]' : 'min-h-[40px]'}`}>
                        {dayReminders.map(rem => (
                          <div 
                            key={rem.id}
                            draggable={isEditable}
                            onDragStart={() => {
                              if (isEditable) {
                                setDraggingReminderId(rem.id);
                              }
                            }}
                            onDragEnd={() => {
                              setDraggingReminderId(null);
                              setDragOverDate(null);
                            }}
                            onClick={() => {
                              if (isEditable) {
                                setEditingReminder(rem);
                              }
                            }}
                            className={`
                              font-extrabold shadow-sm text-center leading-normal shrink-0
                              ${isEditable ? 'cursor-grab active:cursor-grabbing hover:scale-110 active:scale-95 hover:bg-amber-500 transition-all' : ''}
                              bg-amber-600 text-white dark:bg-amber-700
                              ${isPrint && weeks.length > 6 
                                ? 'w-4 h-4 rounded-full flex items-center justify-center text-[7.5px] p-0 font-black' 
                                : 'px-1.5 py-0.5 text-[8.5px] rounded whitespace-nowrap z-10'
                              }
                            `}
                            title={`${rem.title} (${rem.percent}%)\n日期: ${rem.date}\n${isEditable ? '左右拖曳以更改日期，點擊可編輯內容' : ''}`}
                          >
                            {isPrint && weeks.length > 6 ? (
                              rem.id.split('-')[1]
                            ) : (
                              <>
                                <div className="font-black">第{rem.id.split('-')[1]}期</div>
                                <div className="text-[7.5px] opacity-90 font-mono">{rem.percent}%</div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            )}

            {validSteps.map((step, sIdx) => {
              const colorClass = colors[sIdx % colors.length];
              return (
                <tr 
                  key={sIdx} 
                  className="border-b border-slate-100 dark:border-slate-850/80 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 text-xs"
                >
                  <td 
                    className="p-1.5 pl-3 border-r border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-200 truncate flex items-center justify-between" 
                    style={{ width: isPrint ? '130px' : '180px' }}
                  >
                    <span 
                      className={`truncate text-left ${isPrint ? 'max-w-[85px] text-[10px]' : 'max-w-[130px] text-[11px]'}`} 
                      title={step.name}
                    >
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

      {/* Payment Reminder Edit Dialog / Modal */}
      {editingReminder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 text-slate-800 dark:text-slate-100 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6 relative">
            <button 
              onClick={() => setEditingReminder(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <span>💰 編輯收款提示規劃</span>
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-2xs font-bold text-gray-500 mb-1">收款提示名稱</label>
                <input 
                  type="text"
                  value={editingReminder.title}
                  onChange={(e) => setEditingReminder({ ...editingReminder, title: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-950 dark:text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  placeholder="例如：第一期收款：簽約及進場前"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-bold text-gray-500 mb-1">收款比率 (%)</label>
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    value={editingReminder.percent}
                    onChange={(e) => setEditingReminder({ ...editingReminder, percent: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                    className="w-full p-2.5 border border-gray-300 dark:border-slate-800 rounded-lg text-xs font-mono text-center bg-white dark:bg-slate-950 dark:text-white font-bold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-gray-500 mb-1">收款預計日期</label>
                  <input 
                    type="date"
                    value={editingReminder.date}
                    onChange={(e) => setEditingReminder({ ...editingReminder, date: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 dark:border-slate-800 rounded-lg text-xs font-mono bg-white dark:bg-slate-950 dark:text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>
              
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-3 rounded-lg">
                <p className="text-[11px] text-amber-800 dark:text-amber-400 leading-normal font-medium">
                  💡 提示：您也可以在施工甘特圖中，直接用滑鼠「左右拖曳」這個收款標籤來快速調整收款日期！
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-2.5 mt-6">
              <button 
                type="button"
                onClick={() => setEditingReminder(null)}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-lg text-2xs font-bold transition-colors cursor-pointer"
              >
                取消
              </button>
              <button 
                type="button"
                onClick={() => handleSaveReminder(editingReminder)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-2xs font-bold transition-colors cursor-pointer"
              >
                儲存修改
              </button>
            </div>
          </div>
        </div>
      )}
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

const isProtectedAdmin = (username?: string) => {
  if (!username) return false;
  const name = username.toLowerCase();
  return name === 'whlee' || name === 'king' || name === 'mat';
};

export const migrateQuotation = (q: Quotation): Quotation => {
  if (q.variationOrders && q.variationOrders.length > 0) {
    return q;
  }
  
  const variationOrders: VariationOrder[] = [];
  if (q.hasVO || (q.voItems && q.voItems.length > 0)) {
    variationOrders.push({
      id: 'vo-1',
      title: '後加工程 1',
      items: q.voItems || [],
      paymentStages: q.voPaymentStages || [
        { name: '後加第一期', percent: 50, remark: '後加工程確認並安排物料' },
        { name: '後加第二期', percent: 50, remark: '後加工程完工驗收' }
      ],
      remarks: q.voRemarks || '1. 本後加工程明細一經簽署即視為原合約 (單號: ' + q.id + ') 之附屬有效條款，工程款將獨立予以計算及跟進收訖。\n2. 所有後加工程保養、施工及驗收標準，均比照並嚴格遵照原合約中載明之各項相關施工保養細項執行。',
      discount: q.voDiscount || 0,
      createdAt: q.updatedAt || Date.now()
    });
  }
  
  return {
    ...q,
    hasVO: variationOrders.length > 0,
    variationOrders
  };
};

export default function App() {
  // --- STATE DECLARATIONS & AUTH STATES ---
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => {
      const ua = navigator.userAgent || '';
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isMobileUA || isSmallScreen);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [categoryOrder, setCategoryOrder] = useState<string[]>(DEFAULT_CATEGORIES);
  const [standardItems, setStandardItems] = useState<Record<string, StandardItem[]>>(DEFAULT_STANDARD_ITEMS);
  const [globalCategories, setGlobalCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [globalCategoryOrder, setGlobalCategoryOrder] = useState<string[]>(DEFAULT_CATEGORIES);
  const [globalStandardItems, setGlobalStandardItems] = useState<Record<string, StandardItem[]>>(DEFAULT_STANDARD_ITEMS);
  const [globalSettings, setGlobalSettings] = useState<QuoteSettings>(DEFAULT_SETTINGS);
  const [settings, setSettings] = useState<QuoteSettings>(() => {
    try {
      const savedDark = localStorage.getItem('artisan_is_dark_mode');
      if (savedDark !== null) {
        return {
          ...DEFAULT_SETTINGS,
          isDarkMode: savedDark === 'true'
        };
      }
    } catch (e) {}
    return DEFAULT_SETTINGS;
  });
  
  // Custom auth & multi-user session state
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
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
  const [newAccRole, setNewAccRole] = useState<'admin' | 'staff'>('staff');
  const [newAccDisplayName, setNewAccDisplayName] = useState<string>('');
  const [accountActionError, setAccountActionError] = useState<string | null>(null);

  // Account optimization states
  const [accountSearchQuery, setAccountSearchQuery] = useState<string>('');
  const [accountRoleFilter, setAccountRoleFilter] = useState<'all' | 'admin' | 'staff'>('all');
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [editAccDisplayName, setEditAccDisplayName] = useState<string>('');
  const [editAccRole, setEditAccRole] = useState<'admin' | 'staff'>('staff');
  const [editAccPassword, setEditAccPassword] = useState<string>('');
  const [showCreatePassword, setShowCreatePassword] = useState<boolean>(false);
  const [showEditPassword, setShowEditPassword] = useState<boolean>(false);

  // App UI State
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeMainTab, setActiveMainTab] = useState<'contracts' | 'payments' | 'calendar' | 'settings'>('calendar');
  const settingsRendererRef = useRef<any>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [projectTemplates, setProjectTemplates] = useState<ProjectTemplate[]>([]);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState<boolean>(false);
  const [newTemplateName, setNewTemplateName] = useState<string>('');
  const [paymentOutstandingFilter, setPaymentOutstandingFilter] = useState<'all' | 'outstanding' | 'fully_paid'>('all');
  
  // Modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState<boolean>(false);
  const [settingsTab, setSettingsTab] = useState<'library' | 'footer' | 'backup' | 'developer' | 'accounts' | 'templates'>('library');
  const [isStatsExpanded, setIsStatsExpanded] = useState<boolean>(true);
  
  // Quotation Edit State
  const [editingQuote, setEditingQuote] = useState<Quotation | null>(null);
  const [editingActiveTab, setEditingActiveTab] = useState<string>('original');
  const [editingCategoryName, setEditingCategoryName] = useState<{ oldName: string; value: string } | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [draggedItemType, setDraggedItemType] = useState<'original' | 'vo' | null>(null);
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
  const [previewVOQuote, setPreviewVOQuote] = useState<Quotation | null>(null);
  const [printVOQuote, setPrintVOQuote] = useState<Quotation | null>(null);

  // Selected library item to add categories references
  const [librarySelectCategory, setLibrarySelectCategory] = useState<string>('');
  const [librarySelectItem, setLibrarySelectItem] = useState<StandardItem | null>(null);

  // Editing Standard Library Item
  const [editingLibItem, setEditingLibItem] = useState<{
    category: string;
    itemIdx: number;
    name: string;
    unit: string;
    priceRange: string;
    defaultRemark: string;
  } | null>(null);

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

  // Guard: Reset accounts tab if the current user is not a protected admin
  useEffect(() => {
    if (settingsTab === 'accounts' && !isProtectedAdmin(currentUser?.username)) {
      setSettingsTab('library');
    }
  }, [currentUser, settingsTab]);

  // Real-time synchronization listeners
  useEffect(() => {
    // 1. Check local session cache on mount
    const cachedUserStr = localStorage.getItem('artisan_user');
    const cachedToken = localStorage.getItem('artisan_token');
    
    if (cachedUserStr && cachedToken) {
      try {
        const cachedUser = JSON.parse(cachedUserStr);
        setCurrentUser(cachedUser);
        setSessionToken(cachedToken);
      } catch (err) {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }

    // Initialize defaults if they don't exist in Firestore
    initDefaultAdmin().catch(e => console.warn('Skipped admin init:', e));
    initSharedDataIfEmpty(DEFAULT_CATEGORIES, DEFAULT_STANDARD_ITEMS, DEFAULT_SETTINGS).catch(e => console.warn('Skipped shared data init:', e));

    // 2. Listen to shared data in real-time right on mount (so login page can use the theme settings immediately)
    const unsubShared = listenToSharedData((shared) => {
      setGlobalCategories(shared.categories);
      setGlobalCategoryOrder(shared.categoryOrder);
      setGlobalStandardItems(shared.library);
      setGlobalSettings(shared.settings);
    });

    return () => {
      unsubShared();
    };
  }, []);

  // Combine global settings and current user's profile preferences
  useEffect(() => {
    const userProfile = currentUser?.profile || {};
    setSettings({
      ...globalSettings,
      // Overwrite with user profile preferences if they are defined
      appFontSize: userProfile.appFontSize !== undefined ? userProfile.appFontSize : globalSettings.appFontSize,
      showMainFooter: userProfile.showMainFooter !== undefined ? userProfile.showMainFooter : globalSettings.showMainFooter,
      isDarkMode: userProfile.isDarkMode !== undefined ? userProfile.isDarkMode : globalSettings.isDarkMode,
      showStatsDashboard: userProfile.showStatsDashboard !== undefined ? userProfile.showStatsDashboard : globalSettings.showStatsDashboard,
    });
  }, [globalSettings, currentUser?.profile]);

  // Synchronize categories and standard items based on current user's profile
  useEffect(() => {
    if (currentUser) {
      const userProfile = currentUser.profile || {};
      if (userProfile.categories && userProfile.categories.length > 0) {
        setCategories(userProfile.categories);
      } else {
        setCategories(globalCategories);
      }
      if (userProfile.categoryOrder && userProfile.categoryOrder.length > 0) {
        setCategoryOrder(userProfile.categoryOrder);
      } else {
        setCategoryOrder(globalCategoryOrder);
      }
      if (userProfile.standardItems && Object.keys(userProfile.standardItems).length > 0) {
        setStandardItems(userProfile.standardItems);
      } else {
        setStandardItems(globalStandardItems);
      }
    } else {
      setCategories(globalCategories);
      setCategoryOrder(globalCategoryOrder);
      setStandardItems(globalStandardItems);
    }
  }, [
    currentUser?.username, 
    currentUser?.profile?.categories, 
    currentUser?.profile?.categoryOrder, 
    currentUser?.profile?.standardItems,
    globalCategories,
    globalCategoryOrder,
    globalStandardItems
  ]);

  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let unsubQuotes = () => {};
    let unsubUsers = () => {};
    let unsubUserSelf = () => {};
    let unsubCalendar = () => {};
    let unsubTemplates = () => {};

    const startListeners = async () => {
      setIsLoading(false);

      try {
        // 1. Listen to quotations in real-time
        unsubQuotes = listenToQuotations(currentUser.role, currentUser.username, (quotes) => {
          setQuotations(quotes);
        });

        // 2. Listen to users in real-time (Admins only)
        if (currentUser.role === 'admin') {
          unsubUsers = listenToUsers((users) => {
            setAccountsList(users);
          });
        }

        // 3. Listen to current logged-in user to keep profile preferences perfectly in sync in real-time
        unsubUserSelf = listenToCurrentUser(currentUser.username, (updatedUser) => {
          if (updatedUser) {
            setCurrentUser(updatedUser);
            localStorage.setItem('artisan_user', JSON.stringify(updatedUser));
          }
        });

        // 4. Listen to calendar events in real-time
        unsubCalendar = listenToCalendarEvents((events) => {
          setCalendarEvents(events);
        });

        // 5. Listen to project templates in real-time
        unsubTemplates = listenToProjectTemplates((templates) => {
          setProjectTemplates(templates);
        });
      } catch (error) {
        console.error("Error starting Firestore listeners:", error);
        setNotification({ message: '雲端同步載入失敗。', type: 'info' });
      }
    };

    startListeners();

    // Clean up listeners on logout or user switch
    return () => {
      unsubQuotes();
      unsubUsers();
      unsubUserSelf();
      unsubCalendar();
      unsubTemplates();
    };
  }, [currentUser?.username]);

  useEffect(() => {
    if (settings && typeof settings.isDarkMode !== 'undefined') {
      document.documentElement.classList.toggle('dark', !!settings.isDarkMode);
      localStorage.setItem('artisan_is_dark_mode', String(!!settings.isDarkMode));
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

  const syncQuotes = async (newQuotes: Quotation[], skipFirestore = false) => {
    setQuotations(newQuotes);
  };

  const syncLibrary = (newLibrary: Record<string, StandardItem[]>, newCategoryOrder: string[]) => {
    setStandardItems(newLibrary);
    setCategoryOrder(newCategoryOrder);
    if (currentUser) {
      const updatedUser: UserAccount = {
        ...currentUser,
        profile: {
          ...(currentUser.profile || {}),
          standardItems: newLibrary,
          categoryOrder: newCategoryOrder
        }
      };
      saveUserAccount(updatedUser).catch(err => console.error("Firestore user library sync error", err));
      // Also update local state for fast feedback
      setCurrentUser(updatedUser);
      localStorage.setItem('artisan_user', JSON.stringify(updatedUser));
    } else {
      saveSharedLibrary(newLibrary, newCategoryOrder).catch(err => console.error("Firestore sync error", err));
    }
  };

  const syncCategories = (newCategories: string[]) => {
    setCategories(newCategories);
    if (currentUser) {
      const updatedUser: UserAccount = {
        ...currentUser,
        profile: {
          ...(currentUser.profile || {}),
          categories: newCategories
        }
      };
      saveUserAccount(updatedUser).catch(err => console.error("Firestore user categories sync error", err));
      // Also update local state for fast feedback
      setCurrentUser(updatedUser);
      localStorage.setItem('artisan_user', JSON.stringify(updatedUser));
    } else {
      saveSharedCategories(newCategories).catch(err => console.error("Firestore sync error", err));
    }
  };

  const syncCategoriesAndLibrary = (
    newCategories: string[],
    newLibrary: Record<string, StandardItem[]>,
    newCategoryOrder: string[]
  ) => {
    setCategories(newCategories);
    setStandardItems(newLibrary);
    setCategoryOrder(newCategoryOrder);

    if (currentUser) {
      const updatedUser: UserAccount = {
        ...currentUser,
        profile: {
          ...(currentUser.profile || {}),
          categories: newCategories,
          standardItems: newLibrary,
          categoryOrder: newCategoryOrder
        }
      };
      saveUserAccount(updatedUser).catch(err => console.error("Firestore user library sync error", err));
      // Also update local state for fast feedback
      setCurrentUser(updatedUser);
      localStorage.setItem('artisan_user', JSON.stringify(updatedUser));
    } else {
      saveSharedCategories(newCategories).catch(err => console.error("Firestore sync error", err));
      saveSharedLibrary(newLibrary, newCategoryOrder).catch(err => console.error("Firestore sync error", err));
    }
  };

  const handleMoveCategory = (cat: string, direction: number) => {
    const index = categoryOrder.indexOf(cat);
    if (index === -1) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= categoryOrder.length) return;

    const newOrder = [...categoryOrder];
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    syncLibrary(standardItems, newOrder);
  };

  const syncSettings = async (newSettings: QuoteSettings) => {
    // 1. Save global settings
    const globalToSave: QuoteSettings = {
      ...globalSettings,
      bankName: newSettings.bankName !== undefined ? newSettings.bankName : globalSettings.bankName,
      companyName: newSettings.companyName !== undefined ? newSettings.companyName : globalSettings.companyName,
      bankAccount: newSettings.bankAccount !== undefined ? newSettings.bankAccount : globalSettings.bankAccount,
      fpsId: newSettings.fpsId !== undefined ? newSettings.fpsId : globalSettings.fpsId,
      defaultTerms: newSettings.defaultTerms !== undefined ? newSettings.defaultTerms : globalSettings.defaultTerms,
    };
    
    // We update local globalSettings state first for snappy UI, and save to Firestore
    setGlobalSettings(globalToSave);
    saveSharedSettings(globalToSave).catch(err => console.error("Firestore global settings sync error", err));

    // 2. Save current user's profile settings (only if a user is logged in)
    if (currentUser) {
      const updatedProfile = {
        ...(currentUser.profile || {}),
        appFontSize: newSettings.appFontSize,
        showMainFooter: newSettings.showMainFooter,
        isDarkMode: newSettings.isDarkMode,
        showStatsDashboard: newSettings.showStatsDashboard,
      };

      const updatedUser: UserAccount = {
        ...currentUser,
        profile: updatedProfile
      };

      try {
        await saveUserAccount(updatedUser);
        // Also update local state for fast feedback
        setCurrentUser(updatedUser);
        localStorage.setItem('artisan_user', JSON.stringify(updatedUser));
      } catch (err) {
        console.error("Firestore user profile sync error", err);
      }
    }
  };

  // --- ACCOUNT OPERATIONS FOR ADMIN ---
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountActionError(null);
    if (!newAccUsername || !newAccPassword) {
      setAccountActionError('帳號及密碼不可為空');
      return;
    }

    const normalizedUsername = newAccUsername.trim().toLowerCase();
    const exists = accountsList.some(a => a.username.toLowerCase() === normalizedUsername);
    if (exists) {
      setAccountActionError('此帳號已存在於雲端資料庫');
      return;
    }
    
    const newAccount = {
      username: newAccUsername.trim(),
      password: newAccPassword,
      role: newAccRole,
      displayName: newAccDisplayName || newAccUsername.trim(),
      createdAt: new Date().toISOString()
    };
    
    try {
      await saveUserAccount(newAccount);
      setNewAccUsername('');
      setNewAccPassword('');
      setNewAccDisplayName('');
      setNotification({ message: '雲端帳戶建立成功！', type: 'success' });
    } catch (err) {
      console.error("Error creating Firestore user", err);
      setAccountActionError('雲端資料庫同步失敗，請確認網路連線');
    }
  };

  const handleDeleteAccount = async (targetUser: string) => {
    const userLower = targetUser.toLowerCase();
    if (userLower === 'whlee' || userLower === 'king' || userLower === 'mat') {
      setNotification({ message: '無法刪除系統預設管理員帳號！', type: 'error' });
      return;
    }

    showConfirm(
      '刪除帳戶確認',
      `確定要永久刪除雲端帳戶「${targetUser}」嗎？此操作無法還原，且該用戶將立即失效。`,
      async () => {
        try {
          await deleteUserAccount(targetUser);
          setNotification({ message: '雲端帳戶已成功刪除！', type: 'success' });
        } catch (err) {
          console.error("Error deleting Firestore user", err);
          setNotification({ message: '雲端刪除失敗，請檢查網路連線', type: 'error' });
        }
      }
    );
  };

  const handleUpdatePassword = async (targetUser: string, newPass: string) => {
    if (!newPass) return;

    const matchedUser = accountsList.find(a => a.username.toLowerCase() === targetUser.toLowerCase());
    if (!matchedUser) {
      setNotification({ message: '找不到對應的雲端帳戶！', type: 'error' });
      return;
    }

    const updatedUser = {
      ...matchedUser,
      password: newPass
    };

    try {
      await saveUserAccount(updatedUser);
      setNotification({ message: '雲端密碼已成功更新！', type: 'success' });
    } catch (err) {
      console.error("Error updating Firestore user password", err);
      setNotification({ message: '雲端更新密碼失敗，請確認網路連線', type: 'error' });
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    setAccountActionError(null);

    if (!editAccDisplayName.trim()) {
      setAccountActionError('顯示姓名不可為空');
      return;
    }

    const targetUser = editingAccount.username;
    const userLower = targetUser.toLowerCase();

    // Prevent demoting protected admins
    if ((userLower === 'whlee' || userLower === 'king' || userLower === 'mat') && editAccRole !== 'admin') {
      setAccountActionError('無法變更系統預設管理員之最高權限角色！');
      return;
    }

    // Prevent demoting current user if they are admin
    if (userLower === currentUser?.username.toLowerCase() && editAccRole !== 'admin') {
      setAccountActionError('您不能將自己的管理員角色降級為員工！');
      return;
    }

    const updatedUser = {
      ...editingAccount,
      displayName: editAccDisplayName.trim(),
      role: editAccRole,
      // If a password is provided, update it, otherwise keep old password
      password: editAccPassword ? editAccPassword : editingAccount.password
    };

    try {
      await saveUserAccount(updatedUser);
      setEditingAccount(null);
      setEditAccPassword('');
      setNotification({ message: `帳戶「${targetUser}」更新成功！`, type: 'success' });
    } catch (err) {
      console.error("Error updating Firestore user", err);
      setAccountActionError('雲端資料庫更新失敗，請確認網路連線');
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
      const normalizedUsername = loginUsername.trim().toLowerCase();
      const user = await authenticateFirestoreUser(normalizedUsername, loginPassword);
      
      if (user) {
        localStorage.setItem('artisan_token', user.username);
        localStorage.setItem('artisan_user', JSON.stringify(user));
        setSessionToken(user.username);
        setCurrentUser(user);
        
        setLoginUsername('');
        setLoginPassword('');
        setNotification({ message: `登入成功！歡迎回來，${user.displayName}。`, type: 'success' });
      } else {
        setLoginError('登入失敗，帳號或密碼錯誤。');
      }
    } catch (err) {
      console.error("Firebase login error", err);
      setLoginError('系統登入時發生異常，請確認網路連線');
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
      username: 'whlee',
      role: 'admin',
      displayName: '單機調試帳戶'
    };
    localStorage.setItem('artisan_token', 'whlee');
    localStorage.setItem('artisan_user', JSON.stringify(localUser));
    setCurrentUser(localUser);
    setSessionToken('whlee');
    setLoginError(null);
    setNotification({ message: '已進入單機預覽調試模式', type: 'info' });
  };

  // Synchronizes the current active editingQuote's modifications directly to the quotation list in state & storage
  const updateEditingQuoteStateAndSync = (updatedQuote: Quotation) => {
    const updatedQuoteWithTime = {
      ...updatedQuote,
      updatedAt: Date.now()
    };
    setEditingQuote(updatedQuoteWithTime);
    
    // Save to Firestore
    saveQuotationToFirestore(updatedQuoteWithTime).catch(err => console.error("Firestore save error", err));
    
    // Handle ID changes: if ID has changed, delete the old ID document from Firestore
    if (originalQuoteId && originalQuoteId !== updatedQuote.id) {
      deleteQuotationFromFirestore(originalQuoteId).catch(err => console.error("Error deleting old quote on rename", err));
    }
    
    // Update tracking ID
    setOriginalQuoteId(updatedQuote.id);
  };

  // --- Calendar Event CRUD operations ---
  const handleSaveCalendarEvent = async (event: CalendarEvent) => {
    try {
      await saveCalendarEventToFirestore(event);
      showToast('行程儲存成功！', 'success');
    } catch (error) {
      console.error('Error saving calendar event:', error);
      showToast('儲存行程失敗。', 'error');
    }
  };

  const handleDeleteCalendarEvent = async (id: string) => {
    try {
      await deleteCalendarEventFromFirestore(id);
      showToast('行程已成功刪除！', 'info');
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      showToast('刪除行程失敗。', 'error');
    }
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

  // --- RETURN TO HOMEPAGE ACTION ---
  const handleGoHome = () => {
    setEditingQuote(null);
    setIsEditingNew(false);
    setPreviewQuote(null);
    setPrintQuote(null);
    setPrintScheduleQuote(null);
    setPreviewVOQuote(null);
    setPrintVOQuote(null);
    setActiveMainTab('contracts');
    setIsSettingsOpen(false);
    showToast('已返回合約報價總覽');
  };

  // --- SEARCH AND FILTER LOGIC ---
  const filteredQuotations = useMemo(() => {
    return quotations.filter(quote => {
      const matchStatus = statusFilter === 'all' || quote.status === statusFilter;
      const lowerQuery = searchQuery.trim().toLowerCase();
      const matchSearch = !lowerQuery || 
        (quote.customerName || '').toLowerCase().includes(lowerQuery) ||
        (quote.phone || '').includes(lowerQuery) ||
        (quote.address || '').toLowerCase().includes(lowerQuery) ||
        (quote.id || '').toLowerCase().includes(lowerQuery) ||
        (quote.internalNumber && (quote.internalNumber || '').toLowerCase().includes(lowerQuery));
      return matchStatus && matchSearch;
    });
  }, [quotations, searchQuery, statusFilter]);

  // --- STATS COUNTING ---
  const stats = useMemo(() => {
    const counts: Record<string, number> = {
      pending: 0,
      quoted: 0,
      signed: 0,
      constructing: 0,
      finished: 0,
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

  // --- FILTERED ACCOUNTS FOR ADMIN ---
  const filteredAccounts = useMemo(() => {
    return accountsList.filter(acc => {
      const normQuery = accountSearchQuery.trim().toLowerCase();
      const matchSearch = !normQuery || 
        acc.username.toLowerCase().includes(normQuery) ||
        (acc.displayName && acc.displayName.toLowerCase().includes(normQuery));
      // In the db, role might be staff or user. If it's not admin, treat it as staff/user
      const isAccAdmin = acc.role === 'admin';
      const matchRole = accountRoleFilter === 'all' || 
        (accountRoleFilter === 'admin' && isAccAdmin) || 
        (accountRoleFilter === 'staff' && !isAccAdmin);
      return matchSearch && matchRole;
    });
  }, [accountsList, accountSearchQuery, accountRoleFilter]);

  const accountStats = useMemo(() => {
    let admins = 0;
    let staff = 0;
    accountsList.forEach(acc => {
      if (acc.role === 'admin') admins++;
      else staff++;
    });
    return {
      total: accountsList.length,
      admins,
      staff
    };
  }, [accountsList]);

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
  const handleConfirmCreateQuote = (id: string, customerName: string, selectedTemplateId?: string) => {
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

    let initialItems: QuotationItem[] = [];
    let initialVisibleCategories: string[] = [];

    if (selectedTemplateId) {
      const template = projectTemplates.find(t => t.id === selectedTemplateId);
      if (template && template.items) {
        initialItems = template.items.map(item => ({
          ...item,
          id: crypto.randomUUID()
        }));
        initialVisibleCategories = Array.from(new Set(initialItems.map(item => item.category)));
      }
    }
    
    const newQuoteObj: Quotation = {
      id: id.trim(),
      customerName: customerName.trim(),
      phone: '',
      address: '',
      date: dateStr,
      status: 'pending',
      version: 'v1.0',
      items: initialItems,
      remarks: settings.defaultTerms,
      discount: 0,
      depositPercent: 35,
      progressPercent: 20,
      balancePercent: 15, // representing the legacy fallback values to match the new stages
      paymentStages: [
        { name: '第一期', percent: 35, remark: '簽約及進場前' },
        { name: '第二期', percent: 20, remark: '完成水、電、批盪、防水、試水48小時' },
        { name: '第三期', percent: 15, remark: '完成全部瓷磚安裝' },
        { name: '第四期', percent: 10, remark: '傢俬確認施工圖' },
        { name: '第五期', percent: 15, remark: '傢俬送貨前' },
        { name: '第六期', percent: 5, remark: '完工後' }
      ],
      assignedTo: currentUser?.username || 'whlee',
      meetingRecords: '',
      draftRemarks: '',
      internalNumber: '',
      visibleCategories: initialVisibleCategories.length > 0 ? initialVisibleCategories : undefined
    };

    setEditingQuote(newQuoteObj);
    setOriginalQuoteId(newQuoteObj.id);
    setLastSavedQuoteJson(JSON.stringify(newQuoteObj));
    setIsEditingNew(true);
    setNewQuoteModal(null);
    if (selectedTemplateId) {
      showToast('已套用專案範本並匯入項目！', 'success');
    }
  };

  // --- PROJECT TEMPLATE ACTIONS ---
  const handleOpenSaveTemplateModal = () => {
    if (!editingQuote) return;
    if (editingQuote.items.length === 0) {
      showToast('目前報價單沒有任何項目，無法儲存為範本', 'error');
      return;
    }
    setNewTemplateName(`${editingQuote.customerName || ''} 工程組合範本`);
    setIsSaveTemplateModalOpen(true);
  };

  const handleConfirmSaveTemplate = async () => {
    if (!editingQuote) return;
    if (!newTemplateName.trim()) {
      showToast('請輸入範本名稱', 'error');
      return;
    }

    try {
      const templateId = `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const cleanedItems = editingQuote.items.map(item => ({
        ...item
      }));

      const newTemplate: ProjectTemplate = {
        id: templateId,
        name: newTemplateName.trim(),
        items: cleanedItems,
        createdBy: currentUser?.username || 'whlee',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await saveProjectTemplateToFirestore(newTemplate);
      showToast(`已成功儲存專案範本【${newTemplate.name}】！`, 'success');
      setIsSaveTemplateModalOpen(false);
      setNewTemplateName('');
    } catch (err) {
      console.error(err);
      showToast('儲存範本時發生錯誤', 'error');
    }
  };

  const handleApplyTemplateToCurrentQuote = (templateId: string) => {
    if (!editingQuote) return;
    const template = projectTemplates.find(t => t.id === templateId);
    if (!template || !template.items) return;

    const newItems = template.items.map(item => ({
      ...item,
      id: crypto.randomUUID()
    }));

    const updatedItems = [...editingQuote.items, ...newItems];
    const uniqueCategories = Array.from(new Set(updatedItems.map(item => item.category)));

    const updatedQuote = {
      ...editingQuote,
      items: updatedItems,
      visibleCategories: Array.from(new Set([
        ...(editingQuote.visibleCategories || []),
        ...uniqueCategories
      ]))
    };

    updateEditingQuoteStateAndSync(updatedQuote);
    showToast(`成功套用範本【${template.name}】，已追加 ${newItems.length} 個細項！`, 'success');
  };

  const handleDeleteTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const template = projectTemplates.find(t => t.id === templateId);
    if (!template) return;

    showConfirm(
      '確認刪除專案範本',
      `確定要刪除專案範本【${template.name}】嗎？此操作無法復原，該範本將從雲端及所有裝置中永久刪除。`,
      async () => {
        try {
          await deleteProjectTemplateFromFirestore(templateId);
          showToast(`已成功刪除範本【${template.name}】`, 'success');
        } catch (err) {
          console.error(err);
          showToast('刪除範本失敗', 'error');
        }
      },
      '確認刪除',
      '取消'
    );
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
      isLocked: true, // Automatically lock after saving
      updatedAt: Date.now()
    };

    let updatedQuotes = [...quotations];
    const index = originalQuoteId ? quotations.findIndex(q => q.id === originalQuoteId) : -1;

    if (index >= 0) {
      updatedQuotes[index] = finalizedQuote;
      showToast('報價單更新成功（內容已鎖定）', 'success');
    } else {
      updatedQuotes = [finalizedQuote, ...updatedQuotes];
      showToast('報價單創建成功（內容已鎖定）', 'success');
    }

    // Save only this single quote document to Firestore
    saveQuotationToFirestore(finalizedQuote)
      .then(() => {
        // Handle ID changes: if ID has changed, delete the old ID document from Firestore
        if (originalQuoteId && originalQuoteId !== finalizedQuote.id) {
          deleteQuotationFromFirestore(originalQuoteId).catch(err => console.error("Error deleting old quote on rename", err));
        }
      })
      .catch(err => {
        console.error("Firestore save error", err);
        showToast('儲存到雲端失敗，已儲存至本地快取', 'info');
      });

    // Update local state, localStorage, and IndexedDB immediately, but skip Firestore loop-write
    syncQuotes(updatedQuotes, true);
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

  // Previews the current editing VO quotation
  const handlePreviewEditingVOQuote = () => {
    if (!editingQuote) return;
    if (!editingQuote.id.trim()) {
      showToast('請填寫或確認報價合約單號', 'error');
      return;
    }
    if (!editingQuote.customerName.trim()) {
      showToast('請填寫客戶姓名', 'error');
      return;
    }
    const migrated = migrateQuotation(editingQuote);
    const activeVO = migrated.variationOrders?.find(v => v.id === editingActiveTab) || migrated.variationOrders?.[0];
    const finalizedQuote = {
      ...migrated,
      id: editingQuote.id.trim(),
      voItems: activeVO ? activeVO.items : migrated.voItems,
      voPaymentStages: activeVO ? activeVO.paymentStages : migrated.voPaymentStages,
      voRemarks: activeVO ? activeVO.remarks : migrated.voRemarks,
      voDiscount: activeVO ? activeVO.discount : migrated.voDiscount
    };
    updateEditingQuoteStateAndSync(finalizedQuote);
    setPreviewVOQuote(finalizedQuote);
  };

  // Prints the current editing VO quotation
  const handlePrintEditingVOQuote = () => {
    if (!editingQuote) return;
    if (!editingQuote.id.trim()) {
      showToast('請填寫或確認報價合約單號', 'error');
      return;
    }
    if (!editingQuote.customerName.trim()) {
      showToast('請填寫客戶姓名', 'error');
      return;
    }
    const migrated = migrateQuotation(editingQuote);
    const activeVO = migrated.variationOrders?.find(v => v.id === editingActiveTab) || migrated.variationOrders?.[0];
    const finalizedQuote = {
      ...migrated,
      id: editingQuote.id.trim(),
      voItems: activeVO ? activeVO.items : migrated.voItems,
      voPaymentStages: activeVO ? activeVO.paymentStages : migrated.voPaymentStages,
      voRemarks: activeVO ? activeVO.remarks : migrated.voRemarks,
      voDiscount: activeVO ? activeVO.discount : migrated.voDiscount
    };
    updateEditingQuoteStateAndSync(finalizedQuote);
    handleTriggerVOPrint(finalizedQuote);
  };

  // Deletes quotation
  const handleDeleteQuote = (id: string) => {
    showConfirm(
      '確認永久刪除',
      '確定要永久刪除此報價單嗎？此操作不可復原。',
      () => {
        deleteQuotationFromFirestore(id)
          .then(() => {
            showToast('報價單已刪除', 'info');
          })
          .catch(err => {
            console.error(err);
            showToast('刪除失敗，請稍後再試', 'error');
          });
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

    saveQuotationToFirestore(cloned)
      .then(() => {
        showToast('報價單複製成功，已生成新一頁草稿');
      })
      .catch(err => {
        console.error(err);
        showToast('複製失敗，請稍後再試', 'error');
      });
  };

  // Fast Update Status on Row
  const handleUpdateStatus = (id: string, newStatus: QuotationStatus) => {
    const target = quotations.find(q => q.id === id);
    if (!target) return;
    const updated = { ...target, status: newStatus, updatedAt: Date.now() };
    
    saveQuotationToFirestore(updated)
      .then(() => {
        showToast(`狀態已更新為【${getStatusLabel(newStatus)}】`);
      })
      .catch(err => {
        console.error(err);
        showToast('更新狀態失敗，請稍後再試', 'error');
      });
  };

  // Status mapping labels and styles
  const getStatusLabel = (status: QuotationStatus) => {
    const labels: Record<QuotationStatus, string> = {
      pending: '未報價',
      quoted: '報價待回覆',
      signed: '已簽約',
      constructing: '施工中',
      finished: '施工完成',
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
      finished: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
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
    return [
      { name: '第一期', percent: 35, remark: '簽約及進場前' },
      { name: '第二期', percent: 20, remark: '完成水、電、批盪、防水、試水48小時' },
      { name: '第三期', percent: 15, remark: '完成全部瓷磚安裝' },
      { name: '第四期', percent: 10, remark: '傢俬確認施工圖' },
      { name: '第五期', percent: 15, remark: '傢俬送貨前' },
      { name: '第六期', percent: 5, remark: '完工後' }
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

    const paidStagesInfo = stages.map((s, idx) => {
      const isPaid = !!s.isPaid;
      const fallbackVal = Math.round(grandTotal * (s.percent / 100));
      const lockedVal = isPaid ? (s.lockedAmount ?? fallbackVal) : null;
      return { index: idx, isPaid, lockedVal };
    });

    const totalLockedAmount = paidStagesInfo.reduce((sum, item) => sum + (item.lockedVal || 0), 0);
    const unpaidStages = stages.filter((_, idx) => !paidStagesInfo[idx].isPaid);
    const sumUnpaidPercents = unpaidStages.reduce((sum, s) => sum + s.percent, 0);

    const remainingToAllocate = grandTotal - totalLockedAmount;

    let cumulativeUnpaidAllocated = 0;
    let unpaidProcessedCount = 0;

    const stageValues = stages.map((s, idx) => {
      const paidInfo = paidStagesInfo[idx];
      if (paidInfo.isPaid) {
        return { ...s, val: paidInfo.lockedVal as number };
      } else {
        unpaidProcessedCount++;
        let val = 0;
        if (sumUnpaidPercents <= 0) {
          if (unpaidProcessedCount === unpaidStages.length) {
            val = Math.max(0, remainingToAllocate - cumulativeUnpaidAllocated);
          } else {
            val = Math.max(0, Math.round(remainingToAllocate / Math.max(1, unpaidStages.length)));
            cumulativeUnpaidAllocated += val;
          }
        } else {
          if (unpaidProcessedCount === unpaidStages.length) {
            val = Math.max(0, remainingToAllocate - cumulativeUnpaidAllocated);
          } else {
            val = Math.max(0, Math.round(remainingToAllocate * (s.percent / sumUnpaidPercents)));
            cumulativeUnpaidAllocated += val;
          }
        }
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

  const getVOFinancials = (input: VariationOrder | Quotation) => {
    let items: QuotationItem[] = [];
    let discount = 0;
    let stages: PaymentStage[] = [];
    
    if (!input) {
      return { subtotal: 0, grandTotal: 0, stageValues: [] };
    }
    
    if ('customerName' in input) {
      if (!input.hasVO) {
        return { subtotal: 0, grandTotal: 0, stageValues: [] };
      }
      items = input.voItems || [];
      discount = input.voDiscount || 0;
      stages = input.voPaymentStages || [];
    } else {
      items = input.items || [];
      discount = input.discount || 0;
      stages = input.paymentStages || [];
    }

    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const grandTotal = Math.max(0, subtotal - discount);
    
    const paidStagesInfo = stages.map((s, idx) => {
      const isPaid = !!s.isPaid;
      const fallbackVal = Math.round(grandTotal * (s.percent / 100));
      const lockedVal = isPaid ? (s.lockedAmount ?? fallbackVal) : null;
      return { index: idx, isPaid, lockedVal };
    });

    const totalLockedAmount = paidStagesInfo.reduce((sum, item) => sum + (item.lockedVal || 0), 0);
    const unpaidStages = stages.filter((_, idx) => !paidStagesInfo[idx].isPaid);
    const sumUnpaidPercents = unpaidStages.reduce((sum, s) => sum + s.percent, 0);

    const remainingToAllocate = grandTotal - totalLockedAmount;

    let cumulativeUnpaidAllocated = 0;
    let unpaidProcessedCount = 0;

    const stageValues = stages.map((s, idx) => {
      const paidInfo = paidStagesInfo[idx];
      if (paidInfo.isPaid) {
        return { ...s, val: paidInfo.lockedVal as number };
      } else {
        unpaidProcessedCount++;
        let val = 0;
        if (sumUnpaidPercents <= 0) {
          if (unpaidProcessedCount === unpaidStages.length) {
            val = Math.max(0, remainingToAllocate - cumulativeUnpaidAllocated);
          } else {
            val = Math.max(0, Math.round(remainingToAllocate / Math.max(1, unpaidStages.length)));
            cumulativeUnpaidAllocated += val;
          }
        } else {
          if (unpaidProcessedCount === unpaidStages.length) {
            val = Math.max(0, remainingToAllocate - cumulativeUnpaidAllocated);
          } else {
            val = Math.max(0, Math.round(remainingToAllocate * (s.percent / sumUnpaidPercents)));
            cumulativeUnpaidAllocated += val;
          }
        }
        return { ...s, val };
      }
    });

    return {
      subtotal,
      grandTotal,
      stageValues
    };
  };

  const getCombinedVOFinancials = (quote: Quotation) => {
    const migrated = migrateQuotation(quote);
    const vos = migrated.variationOrders || [];
    
    let subtotal = 0;
    let grandTotal = 0;
    const stageValues: (PaymentStage & { val: number; voId: string; stageIdx: number })[] = [];
    
    vos.forEach(vo => {
      const voFin = getVOFinancials(vo);
      subtotal += voFin.subtotal;
      grandTotal += voFin.grandTotal;
      voFin.stageValues.forEach((s, sIdx) => {
        stageValues.push({
          ...s,
          name: `[${vo.title}] ${s.name}`,
          voId: vo.id,
          stageIdx: sIdx
        });
      });
    });
    
    return {
      subtotal,
      grandTotal,
      stageValues
    };
  };

  // --- ACCOUNTANT PROGRESS CALCULATIONS ---
  const paymentContracts = useMemo(() => {
    const list = quotations.filter(q => ['signed', 'constructing', 'finished', 'completed'].includes(q.status));
    // Stable sort by ID descending (newest first) safely
    return list.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
  }, [quotations]);

  const filteredPaymentContracts = useMemo(() => {
    return paymentContracts.filter(q => {
      // 1. Search Query Filter
      const lowerQuery = searchQuery.trim().toLowerCase();
      const matchSearch = !lowerQuery || 
        (q.customerName || '').toLowerCase().includes(lowerQuery) ||
        (q.phone || '').includes(lowerQuery) ||
        (q.address || '').toLowerCase().includes(lowerQuery) ||
        (q.id || '').toLowerCase().includes(lowerQuery) ||
        (q.internalNumber && (q.internalNumber || '').toLowerCase().includes(lowerQuery));
        
      if (!matchSearch) return false;

      // 2. Outstanding Balance Filter
      const { grandTotal, stageValues } = getQuoteFinancials(q);
      const collectedVal = stageValues.reduce((sum, s) => s.isPaid ? sum + s.val : sum, 0);
      const isFullyPaid = grandTotal > 0 && collectedVal >= grandTotal;

      if (paymentOutstandingFilter === 'outstanding') {
        return !isFullyPaid;
      } else if (paymentOutstandingFilter === 'fully_paid') {
        return isFullyPaid;
      }
      
      return true;
    });
  }, [paymentContracts, searchQuery, paymentOutstandingFilter]);

  const paymentStats = useMemo(() => {
    let totalContractValue = 0;
    let totalCollected = 0;
    let totalUncollected = 0;
    let totalStagesCount = 0;
    let uncollectedStagesCount = 0;

    paymentContracts.forEach(q => {
      const { grandTotal: originalGrandTotal, stageValues: originalStageValues } = getQuoteFinancials(q);
      const voFinancials = getCombinedVOFinancials(q);
      const voGrandTotal = voFinancials.grandTotal;
      const voStageValues = voFinancials.stageValues;

      const grandTotal = originalGrandTotal + (q.hasVO ? voGrandTotal : 0);
      const stageValues = [...originalStageValues, ...(q.hasVO ? voStageValues : [])];

      totalContractValue += grandTotal;
      
      stageValues.forEach(stage => {
        totalStagesCount++;
        if (stage.isPaid) {
          totalCollected += stage.val;
        } else {
          totalUncollected += stage.val;
          uncollectedStagesCount++;
        }
      });
    });

    return {
      totalContractValue,
      totalCollected,
      totalUncollected,
      totalStagesCount,
      uncollectedStagesCount
    };
  }, [paymentContracts]);

  const handleTogglePaymentStagePaid = async (quote: Quotation, stageIndex: number) => {
    const currentStages = getPaymentStages(quote);
    const stage = currentStages[stageIndex];
    if (!stage) return;

    const isMarkingPaid = !stage.isPaid;
    const title = isMarkingPaid ? '確認標記為「已付款」' : '確認取消「已付款」狀態';

    // Format current date as YYYY-MM-DD
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const financials = getQuoteFinancials(quote);
    const calculatedStage = financials.stageValues[stageIndex];
    const stageVal = calculatedStage ? calculatedStage.val : Math.round(financials.grandTotal * (stage.percent / 100));

    const message = isMarkingPaid
      ? `確定要將「${quote.customerName}」的【${stage.name}】款項標記為「已付款」嗎？\n金額：HK$${stageVal.toLocaleString()}\n\n💡 系統將自動在該期備註後加上今日付款日期：${todayStr}`
      : `確定要將「${quote.customerName}」的【${stage.name}】款項取消收款狀態，並變更回「未付款」嗎？\n\n💡 系統將自動清除備註中的付款日期記錄。`;

    showConfirm(
      title,
      message,
      async () => {
        const updatedStages = currentStages.map((s, idx) => {
          if (idx === stageIndex) {
            const newPaidStatus = !s.isPaid;
            let newRemark = s.remark || '';
            
            // Clean up any existing "(付款日期: YYYY-MM-DD)" suffix
            newRemark = newRemark.replace(/\s*\(付款日期:\s*\d{4}-\d{2}-\d{2}\)/g, '');
            
            let newLockedAmount = s.lockedAmount;
            if (newPaidStatus) {
              // Append payment date
              newRemark = newRemark ? `${newRemark} (付款日期: ${todayStr})` : `付款日期: ${todayStr}`;
              newLockedAmount = stageVal;
            } else {
              newLockedAmount = undefined;
            }
            
            return { ...s, isPaid: newPaidStatus, remark: newRemark, lockedAmount: newLockedAmount };
          }
          return s;
        });

        const updatedQuote: Quotation = {
          ...quote,
          paymentStages: updatedStages,
          updatedAt: Date.now()
        };

        try {
          await saveQuotationToFirestore(updatedQuote);
          showToast(`已成功更新「${quote.customerName}」之收款狀態`);
        } catch (err) {
          console.error("Firestore save error on payment toggle:", err);
          showToast('同步至雲端時發生錯誤', 'error');
        }
      },
      '確定變更',
      '取消'
    );
  };

  const handleToggleVOPaymentStagePaid = async (quote: Quotation, flatStageIndex: number) => {
    const migrated = migrateQuotation(quote);
    const voFinancials = getCombinedVOFinancials(migrated);
    const clickedStage = voFinancials.stageValues[flatStageIndex];
    if (!clickedStage) return;

    const { voId, stageIdx } = clickedStage as any;
    const isMarkingPaid = !clickedStage.isPaid;
    const title = isMarkingPaid ? '確認標記為「已付款 (後加)」' : '確認取消「已付款 (後加)」狀態';

    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const targetVo = (migrated.variationOrders || []).find(v => v.id === voId);
    if (!targetVo) return;

    const voFin = getVOFinancials(targetVo);
    const calculatedStage = voFin.stageValues[stageIdx];
    const stageVal = calculatedStage ? calculatedStage.val : Math.round(voFin.grandTotal * (clickedStage.percent / 100));

    const message = isMarkingPaid
      ? `確定要將「${quote.customerName}」的後加項目【${clickedStage.name}】款項標記為「已付款」嗎？\n金額：HK$${stageVal.toLocaleString()}\n\n💡 系統將自動在該期備註後加上今日付款日期：${todayStr}`
      : `確定要將「${quote.customerName}」的後加項目【${clickedStage.name}】款項取消收款狀態，並變更回「未付款」嗎？\n\n💡 系統將自動清除備註中的付款日期記錄。`;

    showConfirm(
      title,
      message,
      async () => {
        const updatedVos = (migrated.variationOrders || []).map(vo => {
          if (vo.id === voId) {
            const updatedStages = (vo.paymentStages || []).map((s, idx) => {
              if (idx === stageIdx) {
                const newPaidStatus = !s.isPaid;
                let newRemark = s.remark || '';
                newRemark = newRemark.replace(/\s*\(付款日期:\s*\d{4}-\d{2}-\d{2}\)/g, '');
                
                let newLockedAmount = s.lockedAmount;
                if (newPaidStatus) {
                  newRemark = newRemark ? `${newRemark} (付款日期: ${todayStr})` : `付款日期: ${todayStr}`;
                  newLockedAmount = stageVal;
                } else {
                  newLockedAmount = undefined;
                }
                
                return { ...s, isPaid: newPaidStatus, remark: newRemark, lockedAmount: newLockedAmount };
              }
              return s;
            });
            return { ...vo, paymentStages: updatedStages };
          }
          return vo;
        });

        // Also update legacy fields for backward compatibility
        const legacyVoIndex = updatedVos.findIndex(v => v.id === 'vo-1');
        const legacyVo = legacyVoIndex >= 0 ? updatedVos[legacyVoIndex] : null;

        const updatedQuote: Quotation = {
          ...migrated,
          variationOrders: updatedVos,
          voPaymentStages: legacyVo ? legacyVo.paymentStages : migrated.voPaymentStages,
          updatedAt: Date.now()
        };

        try {
          await saveQuotationToFirestore(updatedQuote);
          showToast(`已成功更新「${quote.customerName}」後加之收款狀態`);
        } catch (err) {
          console.error("Firestore save error on VO payment toggle:", err);
          showToast('同步至雲端時發生錯誤', 'error');
        }
      },
      '確定變更',
      '取消'
    );
  };

  const handleMarkAllPaidToggle = async (quote: Quotation) => {
    const currentStages = getPaymentStages(quote);
    const anyUnpaid = currentStages.some(s => !s.isPaid);
    
    const updatedStages = currentStages.map(s => ({
      ...s,
      isPaid: anyUnpaid
    }));

    const updatedQuote: Quotation = {
      ...quote,
      paymentStages: updatedStages,
      updatedAt: Date.now()
    };

    try {
      await saveQuotationToFirestore(updatedQuote);
      showToast(`已更新「${quote.customerName}」所有期數為 ${anyUnpaid ? '已付 ✓' : '未付 ⏳'}`);
    } catch (err) {
      console.error("Firestore save error on mark all paid:", err);
      showToast('同步失敗', 'error');
    }
  };

  const handleCopyPaymentStatement = (quote: Quotation) => {
    const { grandTotal, stageValues } = getQuoteFinancials(quote);
    const collectedVal = stageValues.reduce((sum, s) => s.isPaid ? sum + s.val : sum, 0);
    const uncollectedVal = grandTotal - collectedVal;
    const collectedPct = grandTotal > 0 ? Math.round((collectedVal / grandTotal) * 100) : 0;
    
    const stagesText = stageValues.map((s, idx) => {
      const statusText = s.isPaid ? '【已付 ✓】' : '【待收 ⏳】';
      const remarkText = s.remark ? ` (${s.remark})` : '';
      return `${idx + 1}. ${s.name} (${s.percent}%): HK$${s.val.toLocaleString()} ${statusText}${remarkText}`;
    }).join('\n');

    let voText = '';
    const migrated = migrateQuotation(quote);
    if (migrated.variationOrders && migrated.variationOrders.length > 0) {
      const voFinancials = getCombinedVOFinancials(migrated);
      const voCollectedVal = voFinancials.stageValues.reduce((sum, s) => s.isPaid ? sum + s.val : sum, 0);
      const voUncollectedVal = voFinancials.grandTotal - voCollectedVal;
      const voCollectedPct = voFinancials.grandTotal > 0 ? Math.round((voCollectedVal / voFinancials.grandTotal) * 100) : 0;

      const voStagesText = voFinancials.stageValues.map((s, idx) => {
        const statusText = s.isPaid ? '【已付 ✓】' : '【待收 ⏳】';
        const remarkText = s.remark ? ` (${s.remark})` : '';
        return `${idx + 1}. ${s.name} (${s.percent}%): HK$${s.val.toLocaleString()} ${statusText}${remarkText}`;
      }).join('\n');

      voText = `

【後加項目(VO) 財務統計】
後加總額：HK$${voFinancials.grandTotal.toLocaleString()}
後加已收：HK$${voCollectedVal.toLocaleString()} (${voCollectedPct}%)
後加待收：HK$${voUncollectedVal.toLocaleString()} (${100 - voCollectedPct}%)

【後加項目分期收款明細】
${voStagesText}`;
    }

    const internalNoStr = quote.internalNumber ? ` / 內部號碼：${quote.internalNumber}` : '';
    const text = `【築匠 Artisan Studio 收款對帳單】
合約單號：${quote.id}${internalNoStr}
客戶姓名：${quote.customerName}
聯絡電話：${quote.phone || '--'}
裝修地址：${quote.address || '未填寫'}
合約狀態：${getStatusLabel(quote.status)}

【主合約財務統計】
合約總額：HK$${grandTotal.toLocaleString()}
累計已收：HK$${collectedVal.toLocaleString()} (${collectedPct}%)
待收餘額：HK$${uncollectedVal.toLocaleString()} (${100 - collectedPct}%)

【主合約分期收款明細】
${stagesText}${voText}

* 本對帳單由築匠系統自動產生。
產生日期：${new Date().toLocaleDateString('zh-HK')} ${new Date().toLocaleTimeString('zh-HK', { hour12: false }).slice(0, 5)}`;

    const fallbackCopy = (valToCopy: string) => {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = valToCopy;
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (success) {
          showToast(`「${quote.customerName}」對帳資訊已複製至剪貼簿`);
        } else {
          showToast("複製對帳失敗，請手動複製", "error");
        }
      } catch (err) {
        console.error("Fallback clipboard copy error:", err);
        showToast("複製對帳失敗，請在瀏覽器新分頁開啟重試", "error");
      }
    };

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text).then(() => {
        showToast(`「${quote.customerName}」對帳資訊已複製至剪貼簿`);
      }).catch(err => {
        console.warn("Navigator clipboard failed, falling back", err);
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
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

    const quoteCategories = getQuotationCategories(quote, categories);
    quoteCategories.forEach(cat => {
      const catItems = quote.items.filter(i => i.category === cat);
      if (catItems.length === 0) return;
      
      nodes.push({
        type: 'category-header',
        key: `cat-header-${cat}`,
        category: cat
      });

      let categoryIndex = 1;
      catItems.forEach(item => {
        const isSubHeader = item.unit === "/";
        nodes.push({
          type: 'item',
          key: `item-${item.id}`,
          item: { ...item, indexOnPageList: isSubHeader ? 0 : categoryIndex++ },
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
      if (node.type === 'category-header') return 1.3;
      if (node.type === 'category-subtotal') return 1.1;
      
      const base = 1.0;
      
      // Visual text length helper: Chinese characters count as 1.0, English/numbers as 0.45
      const getVisualLength = (str: string) => {
        let len = 0;
        for (let i = 0; i < str.length; i++) {
          if (str.charCodeAt(i) > 127) {
            len += 1.0;
          } else {
            len += 0.45;
          }
        }
        return len;
      };

      // Main quotation item name cell is about 32-35 characters wide in Chinese
      const name = node.item?.name || '';
      const nameLines = Math.max(1, Math.ceil(getVisualLength(name) / 32));
      
      const remark = node.item?.remark || '';
      let remarkLines = 0;
      if (remark) {
        const remarkParts = remark.split('\n');
        remarkParts.forEach(line => {
          remarkLines += Math.max(1, Math.ceil(getVisualLength(line) / 32));
        });
      }
      
      const totalVisualLines = nameLines + remarkLines;
      const additionalLines = Math.max(0, totalVisualLines - 1);
      
      return base + (additionalLines * 0.42);
    };

    const pages: RenderNode[][] = [];
    let currentPage: RenderNode[] = [];
    let currentWeight = 0;

    const totalWeight = nodes.reduce((sum, n) => sum + getNodeWeight(n), 0);
    const totalsWeight = 3.5;

    // Standard page capacities in weight units (optimized and safer to avoid cutoffs)
    const page1Limit = 29.5;
    const contPageLimit = 36.0;

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

      const remainingNodes = nodes.slice(i);
      const remainingWeight = remainingNodes.reduce((sum, n) => sum + getNodeWeight(n), 0);

      if (currentWeight + remainingWeight + totalsWeight <= limit) {
        currentPage.push(...remainingNodes);
        pages.push(currentPage);
        currentPage = [];
        break;
      }

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
      return {
        tdPadding: "py-1 px-2.5",
        fontSize: "text-[12px]",
        headerFontSize: "text-[13px]",
        remarkFontSize: "text-[10px]",
        tableTextSize: "text-[12px]"
      };
    };

    return (
      <div className={`flex flex-col ${isPrintMode ? 'w-full' : 'gap-8 w-[210mm] max-w-full'} text-black font-sans leading-relaxed text-[12px]`}>
        {/* ================= DYNAMIC ITEM PAGES ================= */}
        {itemPages.map((pageNodes, X) => {
          const spacing = getPageSpacing(pageNodes.length);
          return (
            <div 
              key={`page-${X}`} 
              className={`bg-white flex flex-col justify-between ${isPrintMode ? 'border-none p-[8mm_12mm_8mm_12mm] shadow-none m-0 rounded-none w-full' : 'p-[8mm_15mm_15mm_15mm] shadow-2xl border border-gray-300 rounded-sm w-full'}`} 
              style={isPrintMode ? { height: '277mm', maxHeight: '277mm', overflow: 'hidden', boxSizing: 'border-box', pageBreakAfter: 'always', breakAfter: 'always', pageBreakInside: 'avoid' } : { minHeight: '297mm', pageBreakAfter: 'always' }}
            >
              <div>
                {/* Header row */}
                {X === 0 ? (
                  /* Page 1 Cover style Header row with logo and text */
                  <div className="flex justify-between items-start border-b-2 border-gray-950 pb-3 mb-6">
                    <div className="flex items-center gap-3">
                      <img 
                        src="/icon-512.png" 
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
                      {quote.internalNumber && (
                        <div><span className="font-semibold text-gray-500">內部單號：</span><span className="font-mono text-gray-900 font-bold">{quote.internalNumber}</span></div>
                      )}
                      <div><span className="font-semibold text-gray-500">日期：</span><span className="font-mono text-gray-900">{quote.date}</span></div>
                    </div>
                  </div>
                ) : (
                  /* Continuation small header row */
                  <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-6">
                    <div className="flex items-center gap-2">
                      <img 
                        src="/icon-512.png" 
                        alt="Artisan Studio" 
                        className="h-8 w-auto object-contain"
                      />
                      <span className="font-bold text-slate-800 text-xs">Artisan Studio Limited</span>
                    </div>
                    <span className="text-[11px] text-gray-500 font-mono">（續頁）單號: {quote.id}{quote.internalNumber ? ` / 內部: ${quote.internalNumber}` : ''}</span>
                  </div>
                )}

                {/* Customer metadata structured block */}
                {X === 0 && (
                  <div className="grid grid-cols-2 gap-y-1.5 border border-gray-300 rounded-lg p-3 bg-slate-50 text-xs mb-5">
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
                          const isSubHeader = item.unit === "/";
                          return (
                            <tr key={node.key} className="border-b border-gray-200 hover:bg-slate-50">
                              <td className={`${spacing.tdPadding} border-r border-gray-300 text-center font-mono text-gray-500 leading-tight whitespace-nowrap`}>
                                <div className="my-0">{isSubHeader ? '' : item.indexOnPageList}</div>
                              </td>
                              <td className={`${spacing.tdPadding} border-r border-gray-300 text-left break-words whitespace-normal`}>
                                <div className="my-0">
                                  <div className={`font-bold text-gray-900 leading-tight ${spacing.fontSize} break-words whitespace-normal`}>{item.name}</div>
                                  {item.remark && (
                                    <div className={`text-black whitespace-pre-wrap mt-0.5 leading-tight ${spacing.remarkFontSize} break-words`}>{item.remark}</div>
                                  )}
                                </div>
                              </td>
                              <td className={`${spacing.tdPadding} border-r border-gray-300 text-center font-mono leading-tight whitespace-nowrap`}>
                                <div className="my-0">{isSubHeader ? '' : (item.quantity === 0 ? '' : item.quantity)}</div>
                              </td>
                              <td className={`${spacing.tdPadding} border-r border-gray-300 text-center leading-tight whitespace-nowrap`}>
                                <div className="my-0">{isSubHeader ? '' : (item.quantity === 0 ? '' : item.unit)}</div>
                              </td>
                              <td className={`${spacing.tdPadding} border-r border-gray-300 text-right font-mono text-gray-600 leading-tight whitespace-nowrap`}>
                                <div className="my-0">{isSubHeader ? '' : `HK$${item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</div>
                              </td>
                              <td className={`${spacing.tdPadding} text-right font-mono font-bold text-slate-900 leading-tight whitespace-nowrap`}>
                                <div className="my-0">{isSubHeader ? '' : (item.quantity === 0 ? '' : `HK$${(item.quantity * item.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)}</div>
                              </td>
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

                <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono border-t border-gray-200 pt-3">
                  <span>© Artisan Studio Limited ． QUOTATION ． CONFIDENTIAL DOCUMENT</span>
                  <span>第 {X + 1} 頁，共 {totalPages} 頁</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* ================= FINAL PAGE (TERMS, SCHEDULING, SIGNATURES & BANKS) ================= */}
        <div 
          className={`bg-white flex flex-col justify-between ${isPrintMode ? 'border-none p-[8mm_12mm_8mm_12mm] shadow-none m-0 rounded-none w-full' : 'p-[8mm_15mm_15mm_15mm] shadow-2xl border border-gray-300 rounded-sm w-full'}`} 
          style={isPrintMode ? { height: '277mm', maxHeight: '277mm', overflow: 'hidden', boxSizing: 'border-box', pageBreakAfter: 'avoid', breakAfter: 'avoid', pageBreakInside: 'avoid' } : { minHeight: '297mm' }}
        >
          <div className="flex flex-col flex-grow">
            {/* Header row */}
            <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-4">
              <div className="flex items-center gap-2">
                <img 
                  src="/icon-512.png" 
                  alt="Artisan Studio" 
                  className="h-8 w-auto object-contain"
                />
                <span className="font-bold text-slate-800 text-xs">Artisan Studio Limited</span>
              </div>
              <span className="text-[11px] text-gray-500 font-mono">單號: {quote.id}{quote.internalNumber ? ` / 內部: ${quote.internalNumber}` : ''}</span>
            </div>

            {/* Payments stage schedule list */}
            <div className={isPrintMode ? "mb-1.5" : "mb-4"}>
              <h4 className="bg-slate-800 text-white font-bold rounded flex items-center justify-between text-[12px] py-1 px-2.5 mb-2">
                <span>付款條款 (Payment Schedule Breakdown)</span>
                <span className="text-[10px] text-amber-400">依工程合約進度支付款項</span>
              </h4>
              <table className="w-full table-fixed text-left border-collapse border border-gray-300 text-[12px]">
                <colgroup>
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '50%' }} />
                </colgroup>
                <thead>
                  <tr className="bg-slate-100 border-b border-gray-300 font-bold">
                    <th className="p-1 px-2.5 border-r border-gray-300 text-left">期數</th>
                    <th className="p-1 border-r border-gray-300 text-center">支付比例</th>
                    <th className="p-1 px-2.5 border-r border-gray-300 text-right">金額 (HKD)</th>
                    <th className="p-1 pl-3 text-left">備註</th>
                  </tr>
                </thead>
                <tbody>
                  {getQuoteFinancials(quote).stageValues.map((stage, idx) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="p-1 px-2.5 border-r border-gray-300 font-bold text-left break-words">{stage.name}</td>
                      <td className="p-1 border-r border-gray-300 text-center font-mono break-words">{stage.percent}%</td>
                      <td className="p-1 px-2.5 border-r border-gray-300 text-right font-mono font-bold break-words whitespace-nowrap">HK${stage.val.toLocaleString()}</td>
                      <td className="p-1 pl-3 text-gray-500 text-left break-words">{stage.remark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Contract rules 1 - 22 (Full width layout sequential downwards to prevent overflow, optimized font size and spacing to fit page bounds) */}
            <div className={isPrintMode ? "mb-1" : "mb-3"}>
              <h4 className="bg-[#E07A5F]/15 text-[#E07A5F] font-bold rounded border-l-4 border-[#E07A5F] text-left text-[13px] py-1 px-3 mb-1.5">
                合約條款 (Contract Terms & Clauses)
              </h4>
              {(() => {
                const termsList = (quote.remarks || settings.defaultTerms).split('\n').filter(line => line.trim() !== '');
                // Dynamically adjust styling based on number of clauses to prevent vertical push/split of the signature blocks
                const termsFontSize = termsList.length > 15 ? 'text-[8px]' : (termsList.length > 10 ? 'text-[8.5px]' : 'text-[9.5px]');
                const termsGap = termsList.length > 15 ? 'gap-0' : 'gap-0.5';
                
                return (
                  <div className={`flex flex-col text-gray-700 text-justify w-full ${termsGap} ${termsFontSize} leading-tight font-medium`}>
                    {termsList.map((line, idx) => (
                      <div key={idx} className="pl-0.5 text-left w-full text-gray-700">
                        {parseFormattedText(line)}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Signatures segment */}
            <div className={`grid grid-cols-2 relative mt-auto ${isPrintMode ? 'gap-4 bg-slate-50 border border-slate-200 rounded-lg p-2.5' : 'gap-8 bg-slate-50 border border-slate-200 rounded-xl p-4'}`}>
              {/* Client Confirmation */}
              <div className={`${isPrintMode ? 'space-y-2' : 'space-y-6'} text-left`}>
                <h5 className="font-black text-slate-800 text-[12px] border-b border-gray-200 pb-1">客戶確認 (Client Confirmation)</h5>
                <div className={isPrintMode ? "space-y-1.5" : "space-y-3"}>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-gray-500">客戶簽署 (Signature)：</span>
                    <div className={`border-b border-gray-400 w-44 ${isPrintMode ? 'h-5' : 'h-8'}`}></div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-gray-500">簽署日期 (Date)：</span>
                    <div className={`border-b border-gray-400 w-44 ${isPrintMode ? 'h-4' : 'h-5'}`}></div>
                  </div>
                </div>
              </div>

              {/* Company confirmation */}
              <div className={`${isPrintMode ? 'space-y-2 pl-4' : 'space-y-6 pl-8'} border-l border-slate-200 text-left`}>
                <h5 className="font-black text-slate-800 text-[12px] border-b border-gray-200 pb-1">公司確認 (Artisan Studio)</h5>
                <div className={isPrintMode ? "space-y-1.5" : "space-y-3"}>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-gray-500">代表簽名及蓋印 (Representative Signature)：</span>
                    <div className={`border-b border-gray-400 w-44 ${isPrintMode ? 'h-5' : 'h-8'}`}></div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-gray-500">簽署日期 (Date)：</span>
                    <div className={`border-b border-gray-400 w-44 ${isPrintMode ? 'h-4' : 'h-5'}`}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bank accounts information section fixed bottom */}
          <div className={`${isPrintMode ? 'mt-2 pt-1' : 'mt-4 pt-2'} border-t-2 border-gray-900 ${isPrintMode ? 'space-y-1.5' : 'space-y-3'}`}>
            <div className={`bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 gap-x-6 text-left p-2 gap-y-1 text-[11px]`}>
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

            <div className={`flex justify-between items-center text-[10px] text-gray-500 font-mono border-t border-gray-200 ${isPrintMode ? 'pt-1 mt-1' : 'pt-2'}`}>
              <span>© Artisan Studio Limited ． EST. 2026 ． REGULATED IN HK SAR</span>
              <span>第 {itemPages.length + 1} 頁，共 {totalPages} 頁</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStandaloneSchedulePage = (quote: Quotation, isPrintMode: boolean) => {
    const validSteps = (quote.scheduleSteps || []).filter(s => s.name && s.startDate && s.endDate);
    
    if (validSteps.length === 0) {
      return (
        <div className="bg-white p-12 text-center text-slate-500 font-bold border border-gray-200 rounded-lg">
          目前無有效施工步驟資料，無法列印時程表。
        </div>
      );
    }

    const parseDate = (dStr: string) => {
      return new Date(dStr + 'T00:00:00');
    };

    // Calculate overall weeks range for chunking
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

    const allWeeks: { start: Date; end: Date; label: string; days: Date[] }[] = [];
    let currentWeekStart = new Date(startOfWeek);
    
    let safetyCounter = 0;
    while (currentWeekStart <= endOfWeek && safetyCounter < 100) {
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
      
      allWeeks.push({
        start: new Date(currentWeekStart),
        end: currentWeekEnd,
        label: `W${allWeeks.length + 1} (${m1}/${d1})`,
        days: weekDays
      });
      
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    // Split weeks into chunks of at most 6 weeks
    const chunkWeeksLimit = 6;
    const chunks: { weeks: typeof allWeeks; steps: ScheduleStep[] }[] = [];
    
    for (let i = 0; i < allWeeks.length; i += chunkWeeksLimit) {
      const chunkWeeks = allWeeks.slice(i, i + chunkWeeksLimit);
      const chunkStartStr = formatDateKey(chunkWeeks[0].start);
      const chunkEndStr = formatDateKey(chunkWeeks[chunkWeeks.length - 1].end);
      
      // Filter steps that overlap with this chunk
      const chunkSteps = validSteps.filter(step => {
        return step.startDate! <= chunkEndStr && step.endDate! >= chunkStartStr;
      });
      
      chunks.push({
        weeks: chunkWeeks,
        steps: chunkSteps
      });
    }

    return (
      <div className="space-y-6 print:space-y-0 print:block">
        {chunks.map((chunk, cIdx) => {
          const pageNum = cIdx + 1;
          const totalPages = chunks.length;
          
          return (
            <div 
              key={cIdx}
              className={`bg-white flex flex-col justify-between ${isPrintMode ? 'print-landscape border-none p-[8mm_12mm_8mm_12mm] shadow-none m-0 rounded-none w-full' : 'p-[8mm_15mm_15mm_15mm] shadow-2xl border border-gray-300 rounded-sm w-[297mm] min-h-[210mm] max-w-full overflow-x-auto overflow-y-hidden mb-6'}`} 
              style={isPrintMode ? { height: '196mm', maxHeight: '196mm', overflow: 'hidden', boxSizing: 'border-box', pageBreakAfter: 'always', breakAfter: 'always', pageBreakInside: 'avoid' } : { minHeight: '210mm' }}
            >
              <div className="flex flex-col flex-grow text-left">
                {/* Header row */}
                <div className="flex justify-between items-center border-b border-gray-200 pb-1.5 mb-2.5">
                  <div className="flex items-center gap-2">
                    <img 
                      src="/icon-512.png" 
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
                      <span>工程施工時程進度表與橫向日曆排期圖 (Estimated Construction Schedule) - 頁 {pageNum}/{totalPages}</span>
                    </h3>
                    <div className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[9px] text-right shrink-0">
                      本頁區間: <span className="font-mono text-xs">{formatDateKey(chunk.weeks[0].start)} 至 {formatDateKey(chunk.weeks[chunk.weeks.length - 1].end)}</span>
                    </div>
                  </div>

                  <p className="text-[9px] text-slate-500 leading-tight text-left">
                    本施工時程與日曆表以預設開工日期為基準由系統高精準推算。星期六、日及公眾假期自動排休。本頁顯示週數：{chunk.weeks[0].label.split(' ')[0]} 至 {chunk.weeks[chunk.weeks.length - 1].label.split(' ')[0]} 的作業細項。
                  </p>

                  {/* Horizontal Gantt Calendar (Fits completely in Landscape) */}
                  <div className="w-full text-black">
                    <HorizonScheduleCalendar 
                      steps={chunk.steps} 
                      quote={quote} 
                      isEditable={false} 
                      isPrint={isPrintMode} 
                      customWeeks={chunk.weeks}
                    />
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
                        {chunk.steps.map((step, sIdx) => {
                          const hasDates = !!step.startDate;
                          const originalIdx = (quote.scheduleSteps || []).findIndex(s => s.name === step.name);
                          return (
                            <tr key={sIdx} className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50/50">
                              <td className="p-1 border-r border-slate-200 text-center font-mono font-bold text-slate-500">{(originalIdx !== -1 ? originalIdx : sIdx) + 1}</td>
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
                <span>獨立附頁 ． 頁 {pageNum} / {totalPages}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };


  const handleTriggerVOPrint = (quote: Quotation) => {
    setPrintVOQuote(quote);
    setTimeout(() => {
      window.print();
    }, 400);
  };

  const paginateVONodes = (quote: Quotation): RenderNode[][] => {
    const nodes: RenderNode[] = [];
    const voItemsList = quote.voItems || [];

    const quoteCategories = getQuotationCategories(quote, categories);
    quoteCategories.forEach(cat => {
      const catItems = voItemsList.filter(i => i.category === cat);
      if (catItems.length === 0) return;
      
      nodes.push({
        type: 'category-header',
        key: `vo-cat-header-${cat}`,
        category: cat
      });

      let categoryIndex = 1;
      catItems.forEach(item => {
        const isSubHeader = item.unit === "/";
        nodes.push({
          type: 'item',
          key: `vo-item-${item.id}`,
          item: { ...item, indexOnPageList: isSubHeader ? 0 : categoryIndex++ },
          category: cat
        });
      });

      const catSubtotal = catItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
      nodes.push({
        type: 'category-subtotal',
        key: `vo-cat-subtotal-${cat}`,
        category: cat,
        subtotal: catSubtotal
      });
    });

    const getNodeWeight = (node: RenderNode): number => {
      if (node.type === 'category-header') return 1.3;
      if (node.type === 'category-subtotal') return 1.1;
      
      const base = 1.0;
      
      // Visual text length helper: Chinese characters count as 1.0, English/numbers as 0.45
      const getVisualLength = (str: string) => {
        let len = 0;
        for (let i = 0; i < str.length; i++) {
          if (str.charCodeAt(i) > 127) {
            len += 1.0;
          } else {
            len += 0.45;
          }
        }
        return len;
      };

      // Main quotation item name cell is about 32-35 characters wide in Chinese
      const name = node.item?.name || '';
      const nameLines = Math.max(1, Math.ceil(getVisualLength(name) / 32));
      
      const remark = node.item?.remark || '';
      let remarkLines = 0;
      if (remark) {
        const remarkParts = remark.split('\n');
        remarkParts.forEach(line => {
          remarkLines += Math.max(1, Math.ceil(getVisualLength(line) / 32));
        });
      }
      
      const totalVisualLines = nameLines + remarkLines;
      const additionalLines = Math.max(0, totalVisualLines - 1);
      
      return base + (additionalLines * 0.42);
    };

    const pages: RenderNode[][] = [];
    let currentPage: RenderNode[] = [];
    let currentWeight = 0;

    const totalWeight = nodes.reduce((sum, n) => sum + getNodeWeight(n), 0);
    const totalsWeight = 3.5;

    // Standard page capacities in weight units (optimized and safer to avoid cutoffs)
    const page1Limit = 29.5;
    const contPageLimit = 36.0;

    if (totalWeight + totalsWeight <= page1Limit) {
      pages.push(nodes);
      return pages;
    }

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const weight = getNodeWeight(node);
      const isFirstPage = pages.length === 0;
      const limit = isFirstPage ? page1Limit : contPageLimit;

      const remainingNodes = nodes.slice(i);
      const remainingWeight = remainingNodes.reduce((sum, n) => sum + getNodeWeight(n), 0);

      if (currentWeight + remainingWeight + totalsWeight <= limit) {
        currentPage.push(...remainingNodes);
        pages.push(currentPage);
        currentPage = [];
        break;
      }

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

  const renderVOQuotationPages = (quote: Quotation, isPrintMode: boolean) => {
    const itemPages = paginateVONodes(quote);
    const totalPages = itemPages.length + 1;

    const getPageSpacing = (nodeCount: number) => {
      return {
        tdPadding: "py-1 px-2.5",
        fontSize: "text-[12px]",
        headerFontSize: "text-[13px]",
        remarkFontSize: "text-[10px]",
        tableTextSize: "text-[12px]"
      };
    };

    return (
      <div className={`flex flex-col ${isPrintMode ? 'w-full' : 'gap-8 w-[210mm] max-w-full'} text-black font-sans leading-relaxed text-[12px]`}>
        {/* ================= DYNAMIC ITEM PAGES ================= */}
        {itemPages.map((pageNodes, X) => {
          const spacing = getPageSpacing(pageNodes.length);
          return (
            <div 
              key={`vo-page-${X}`} 
              className={`bg-white flex flex-col justify-between ${isPrintMode ? 'border-none p-[8mm_12mm_8mm_12mm] shadow-none m-0 rounded-none w-full' : 'p-[8mm_15mm_15mm_15mm] shadow-2xl border border-gray-300 rounded-sm w-full'}`} 
              style={isPrintMode ? { height: '277mm', maxHeight: '277mm', overflow: 'hidden', boxSizing: 'border-box', pageBreakAfter: 'always', breakAfter: 'always', pageBreakInside: 'avoid' } : { minHeight: '297mm', pageBreakAfter: 'always' }}
            >
              <div>
                {/* Header row */}
                {X === 0 ? (
                  <div className="flex justify-between items-start border-b-2 border-amber-500 pb-3 mb-6">
                    <div className="flex items-center gap-3">
                      <img 
                        src="/icon-512.png" 
                        alt="Artisan Studio Limited Logo"
                        referrerPolicy="no-referrer"
                        className="h-12 w-auto object-contain"
                      />
                      <div className="text-left">
                        <h1 className="text-lg font-black text-slate-900 tracking-tight text-left">Artisan Studio Limited</h1>
                        <p className="text-[9px] text-amber-700 font-bold tracking-widest mt-0.5 uppercase text-left">
                          SUPPLEMENTARY QUOTATION (VO){quote.voTitle ? ` - ${quote.voTitle}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-[10px] space-y-1">
                      <div><span className="font-semibold text-gray-500">報價單號：</span><span className="font-mono text-gray-900 font-bold">{quote.id}-VO</span></div>
                      {quote.internalNumber && (
                        <div><span className="font-semibold text-gray-500">內部單號：</span><span className="font-mono text-gray-900 font-bold">{quote.internalNumber}</span></div>
                      )}
                      <div><span className="font-semibold text-gray-500">日期：</span><span className="font-mono text-gray-900">{quote.date}</span></div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-6">
                    <div className="flex items-center gap-2">
                      <img 
                        src="/icon-512.png" 
                        alt="Artisan Studio" 
                        className="h-8 w-auto object-contain"
                      />
                      <span className="font-bold text-slate-800 text-xs">Artisan Studio Limited</span>
                    </div>
                    <span className="text-[11px] text-gray-500 font-mono">（續頁）後加項目單號: {quote.id}-VO{quote.voTitle ? ` (${quote.voTitle})` : ''}{quote.internalNumber ? ` / 內部: ${quote.internalNumber}` : ''}</span>
                  </div>
                )}

                {/* Customer metadata structured block */}
                {X === 0 && (
                  <div className="grid grid-cols-2 gap-y-1.5 border border-amber-200 rounded-lg p-3 bg-amber-50/20 text-xs mb-5">
                    <div className="flex text-left">
                      <span className="font-bold text-amber-800 w-20 flex-shrink-0">客戶姓名</span>
                      <span className="text-gray-900 font-bold">{quote.customerName}</span>
                    </div>
                    <div className="flex border-l border-amber-100 pl-4 text-left">
                      <span className="font-bold text-amber-800 w-20 flex-shrink-0">聯絡電話</span>
                      <span className="text-gray-900 font-semibold font-mono">{quote.phone}</span>
                    </div>
                    <div className="col-span-2 border-t border-amber-100 pt-1.5 flex text-left">
                      <span className="font-bold text-amber-800 w-20 flex-shrink-0">物業地址</span>
                      <span className="text-gray-900 font-semibold">{quote.address}</span>
                    </div>
                    <div className="col-span-2 border-t border-amber-100 pt-1.5 flex text-left">
                      <span className="font-bold text-amber-800 w-20 flex-shrink-0">備註說明</span>
                      <span className="text-gray-900 font-medium">
                        本合約為原合約 {quote.id} 之【{quote.voTitle || '後加施工項目明細'}】獨立報價與追加協議。
                      </span>
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
                      <tr className="bg-amber-50 border-b border-gray-300">
                        <th className="p-1 border-r border-gray-300 font-bold text-amber-900 text-center whitespace-nowrap">編號</th>
                        <th className="p-1 border-r border-gray-300 font-bold text-amber-900 text-left">後加項目描述</th>
                        <th className="p-1 border-r border-gray-300 font-bold text-amber-900 text-center whitespace-nowrap">數量</th>
                        <th className="p-1 border-r border-gray-300 font-bold text-amber-900 text-center whitespace-nowrap">單位</th>
                        <th className="p-1 border-r border-gray-300 font-bold text-amber-900 text-right whitespace-nowrap">單價(HKD)</th>
                        <th className="p-1 font-bold text-amber-900 text-right whitespace-nowrap">金額(HKD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageNodes.map((node) => {
                        if (node.type === 'category-header') {
                          return (
                            <tr key={node.key} className="bg-amber-50/30 border-b border-gray-300">
                              <td className="bg-amber-100/50 border-t border-r border-gray-300"></td>
                              <td colSpan={5} className={`${spacing.tdPadding} font-black text-amber-900 tracking-wide ${spacing.headerFontSize} bg-amber-100/50 border-t border-gray-300 text-left leading-tight break-words`}>
                                {node.category}
                              </td>
                            </tr>
                          );
                        } else if (node.type === 'category-subtotal') {
                          return (
                            <tr key={node.key} className="border-b border-gray-300 bg-amber-50/10">
                              <td colSpan={5} className={`${spacing.tdPadding} text-right font-semibold text-amber-800 border-r border-gray-300 leading-tight`}>小計</td>
                              <td className={`${spacing.tdPadding} text-right font-mono font-black text-amber-900 bg-amber-50/20 leading-tight whitespace-nowrap`}>HK${node.subtotal?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                          );
                        } else {
                          const item = node.item!;
                          const isSubHeader = item.unit === "/";
                          return (
                            <tr key={node.key} className="border-b border-gray-200 hover:bg-amber-50/5">
                              <td className={`${spacing.tdPadding} border-r border-gray-300 text-center font-mono text-gray-500 leading-tight whitespace-nowrap`}>
                                <div className="my-0">{isSubHeader ? '' : item.indexOnPageList}</div>
                              </td>
                              <td className={`${spacing.tdPadding} border-r border-gray-300 text-left break-words`}>
                                <div className="my-0">
                                  <div className={`font-bold text-gray-900 leading-tight ${spacing.fontSize} break-words`}>{item.name}</div>
                                  {item.remark && (
                                    <div className={`text-black whitespace-pre-wrap mt-0.5 leading-tight ${spacing.remarkFontSize} break-words`}>{item.remark}</div>
                                  )}
                                </div>
                              </td>
                              <td className={`${spacing.tdPadding} border-r border-gray-300 text-center font-mono leading-tight whitespace-nowrap`}>
                                <div className="my-0">{isSubHeader ? '' : (item.quantity === 0 ? '' : item.quantity)}</div>
                              </td>
                              <td className={`${spacing.tdPadding} border-r border-gray-300 text-center leading-tight whitespace-nowrap`}>
                                <div className="my-0">{isSubHeader ? '' : (item.quantity === 0 ? '' : item.unit)}</div>
                              </td>
                              <td className={`${spacing.tdPadding} border-r border-gray-300 text-right font-mono text-gray-600 leading-tight whitespace-nowrap`}>
                                <div className="my-0">{isSubHeader ? '' : `HK$${item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</div>
                              </td>
                              <td className={`${spacing.tdPadding} text-right font-mono font-bold text-slate-900 leading-tight whitespace-nowrap`}>
                                <div className="my-0">{isSubHeader ? '' : (item.quantity === 0 ? '' : `HK$${(item.quantity * item.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)}</div>
                              </td>
                            </tr>
                          );
                        }
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom total calculation segment & page footer */}
              <div className="mt-8 pt-4 border-t-2 border-amber-500 space-y-4">
                {X === itemPages.length - 1 && (
                  <div className="flex justify-end">
                    <div className="w-80 border border-amber-300 rounded-lg overflow-hidden text-[10px]">
                      {quote.voDiscount ? (
                        <>
                          <div className="flex justify-between items-center p-2 border-b border-gray-200 bg-white">
                            <span className="font-bold text-gray-500">原價小計 Subtotal</span>
                            <span className="font-mono text-gray-700">HK${getVOFinancials(quote).subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between items-center p-1.5 px-2 border-b border-gray-100 bg-rose-50 text-rose-700">
                            <span className="font-bold">後加項目特別折讓 (Discount)</span>
                            <span className="font-mono font-bold">-HK${(quote.voDiscount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </>
                      ) : null}
                      <div className="flex justify-between items-center p-2.5 bg-amber-50 text-amber-950 font-bold">
                        <span className="font-black text-[11px]">後加工程總金額 (VO Total)</span>
                        <span className="font-mono font-black text-xs text-amber-700">HK${getVOFinancials(quote).grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono border-t border-gray-200 pt-3">
                  <span>© Artisan Studio Limited ． ADDITIONAL QUOTATION ． CONFIDENTIAL VO DOCUMENT</span>
                  <span>第 {X + 1} 頁，共 {totalPages} 頁</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* ================= FINAL PAGE (TERMS, SIGNATURES & BANKS) ================= */}
        <div 
          className={`bg-white flex flex-col justify-between ${isPrintMode ? 'border-none p-[8mm_12mm_8mm_12mm] shadow-none m-0 rounded-none w-full' : 'p-[8mm_15mm_15mm_15mm] shadow-2xl border border-gray-300 rounded-sm w-full'}`} 
          style={isPrintMode ? { height: '277mm', maxHeight: '277mm', overflow: 'hidden', boxSizing: 'border-box', pageBreakAfter: 'avoid', breakAfter: 'avoid', pageBreakInside: 'avoid' } : { minHeight: '297mm' }}
        >
          <div className="flex flex-col flex-grow">
            {/* Header row */}
            <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-4">
              <div className="flex items-center gap-2">
                <img 
                  src="/icon-512.png" 
                  alt="Artisan Studio" 
                  className="h-8 w-auto object-contain"
                />
                <span className="font-bold text-slate-800 text-xs text-left">Artisan Studio Limited</span>
              </div>
              <span className="text-[11px] text-gray-500 font-mono text-right">後加項目單號: {quote.id}-VO{quote.internalNumber ? ` / 內部: ${quote.internalNumber}` : ''}</span>
            </div>

            {/* Payments stage schedule list */}
            <div className={isPrintMode ? "mb-1.5" : "mb-4"}>
              <h4 className="bg-amber-600 text-white font-bold rounded flex items-center justify-between text-[12px] py-1 px-2.5 mb-2">
                <span>收款條款 (後加期數比例 Payment Schedule Breakdown)</span>
                <span className="text-[10px] text-amber-200">依後加工程確認與施工進度支付</span>
              </h4>
              <table className="w-full table-fixed text-left border-collapse border border-gray-300 text-[12px]">
                <colgroup>
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '50%' }} />
                </colgroup>
                <thead>
                  <tr className="bg-amber-50 border-b border-gray-300 font-bold text-amber-950">
                    <th className="p-1 px-2.5 border-r border-gray-300 text-left">期數</th>
                    <th className="p-1 border-r border-gray-300 text-center">支付比例</th>
                    <th className="p-1 px-2.5 border-r border-gray-300 text-right">金額 (HKD)</th>
                    <th className="p-1 pl-3 text-left">備註</th>
                  </tr>
                </thead>
                <tbody>
                  {getVOFinancials(quote).stageValues.map((stage, idx) => (
                    <tr key={idx} className="border-b border-gray-200 bg-white">
                      <td className="p-1 px-2.5 border-r border-gray-300 font-bold text-left">{stage.name}</td>
                      <td className="p-1 border-r border-gray-300 text-center font-mono">{stage.percent}%</td>
                      <td className="p-1 px-2.5 border-r border-gray-300 text-right font-mono font-bold whitespace-nowrap">HK${stage.val.toLocaleString()}</td>
                      <td className="p-1 pl-3 text-gray-500 text-left">{stage.remark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Contract rules (optimized font size and spacing to fit page bounds) */}
            <div className={isPrintMode ? "mb-1" : "mb-3"}>
              <h4 className="bg-amber-600/10 text-amber-800 font-bold rounded border-l-4 border-amber-600 text-left text-[13px] py-1 px-3 mb-1.5">
                後加工程條款與說明 (Supplementary VO Terms)
              </h4>
              {(() => {
                const defaultVOTerms = "1. 本後加工程明細一經簽署即視為原合約 (單號: " + quote.id + ") 之附屬有效條款，工程款將獨立予以計算及跟進收訖。\n2. 所有後加工程保養、施工及驗收標準，均比照並嚴格遵照原合約中載明之各項相關施工保養細項執行。";
                const termsList = (quote.voRemarks || defaultVOTerms).split('\n').filter(line => line.trim() !== '');
                // Dynamically adjust styling based on number of clauses to prevent vertical push/split of the signature blocks
                const termsFontSize = termsList.length > 15 ? 'text-[8px]' : (termsList.length > 10 ? 'text-[8.5px]' : 'text-[9.5px]');
                const termsGap = termsList.length > 15 ? 'gap-0' : 'gap-0.5';

                return (
                  <div className={`flex flex-col text-gray-700 text-justify w-full ${termsGap} ${termsFontSize} leading-tight font-medium`}>
                    {termsList.map((line, idx) => (
                      <div key={idx} className="pl-0.5 text-left w-full text-gray-700">
                        {parseFormattedText(line)}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Signatures segment */}
            <div className={`grid grid-cols-2 relative mt-auto ${isPrintMode ? 'gap-4 bg-amber-50/20 border border-amber-200 rounded-lg p-2.5' : 'gap-8 bg-amber-50/20 border border-amber-200 rounded-xl p-4'}`}>
              {/* Client Confirmation */}
              <div className={`${isPrintMode ? 'space-y-2' : 'space-y-6'} text-left`}>
                <h5 className="font-black text-amber-950 text-[12px] border-b border-amber-100 pb-1">客戶確認 (Client VO Confirmation)</h5>
                <div className={isPrintMode ? "space-y-1.5" : "space-y-3"}>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-gray-500">客戶簽署 (Signature)：</span>
                    <div className={`border-b border-gray-400 w-44 ${isPrintMode ? 'h-5' : 'h-8'}`}></div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-gray-500">簽署日期 (Date)：</span>
                    <div className={`border-b border-gray-400 w-44 ${isPrintMode ? 'h-4' : 'h-5'}`}></div>
                  </div>
                </div>
              </div>

              {/* Company confirmation */}
              <div className={`${isPrintMode ? 'space-y-2 pl-4' : 'space-y-6 pl-8'} border-l border-amber-200 text-left`}>
                <h5 className="font-black text-amber-950 text-[12px] border-b border-amber-100 pb-1">公司確認 (Artisan Studio)</h5>
                <div className={isPrintMode ? "space-y-1.5" : "space-y-3"}>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-gray-500">代表簽名及蓋印 (Representative Signature)：</span>
                    <div className={`border-b border-gray-400 w-44 ${isPrintMode ? 'h-5' : 'h-8'}`}></div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-gray-500">簽署日期 (Date)：</span>
                    <div className={`border-b border-gray-400 w-44 ${isPrintMode ? 'h-4' : 'h-5'}`}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bank accounts information section fixed bottom */}
          <div className={`${isPrintMode ? 'mt-2 pt-1' : 'mt-4 pt-2'} border-t-2 border-amber-500 ${isPrintMode ? 'space-y-1.5' : 'space-y-3'}`}>
            <div className={`bg-amber-50/10 rounded-lg border border-amber-200 grid grid-cols-2 gap-x-6 text-left p-2 gap-y-1 text-[11px]`}>
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

            <div className={`flex justify-between items-center text-[10px] text-gray-500 font-mono border-t border-gray-200 ${isPrintMode ? 'pt-1 mt-1' : 'pt-2'}`}>
              <span>© Artisan Studio Limited ． EST. 2026 ． REGULATED IN HK SAR</span>
              <span>第 {itemPages.length + 1} 頁，共 {totalPages} 頁</span>
            </div>
          </div>
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

  const handleAddCategoryAllFromLibrary = (category: string) => {
    if (!editingQuote) return;
    const sItems = getStandardItemsForCategory(category);
    if (sItems.length === 0) {
      showToast('標準庫中無此類別項目');
      return;
    }

    const newItems: QuotationItem[] = sItems.map(standardItem => {
      let defaultPrice = 0;
      if (standardItem.priceRange) {
        const parts = standardItem.priceRange.split('-');
        if (parts.length === 2) {
          defaultPrice = Math.round((parseFloat(parts[0]) + parseFloat(parts[1])) / 2);
        } else {
          defaultPrice = parseFloat(standardItem.priceRange) || 0;
        }
      }
      return {
        id: crypto.randomUUID(),
        category,
        name: standardItem.name,
        unit: standardItem.unit,
        quantity: 1,
        unitPrice: defaultPrice,
        remark: standardItem.defaultRemark || ''
      };
    });

    const updatedQuote = {
      ...editingQuote,
      items: [...editingQuote.items, ...newItems]
    };
    updateEditingQuoteStateAndSync(updatedQuote);
    
    showToast(`已將 ${newItems.length} 個標準項目全部加入「${category}」`);
  };

  const getUniqueCategoryName = (baseName: string, existingList: string[]): string => {
    if (!existingList.includes(baseName)) return baseName;
    const chineseNumbers = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
    let index = 2;
    while (true) {
      const suffix = index <= 10 ? chineseNumbers[index - 1] : index.toString();
      const candidate = `${baseName}${suffix}`;
      if (!existingList.includes(candidate)) {
        return candidate;
      }
      index++;
    }
  };

  const getStandardItemsForCategory = (categoryName: string): StandardItem[] => {
    if (standardItems[categoryName]) return standardItems[categoryName];
    // Find standard items key that is a substring of categoryName (e.g. "打拆工程" is a substring of "打拆工程二" or "打拆工程(一期)")
    // or vice versa
    const matchKey = Object.keys(standardItems).find(k => categoryName.includes(k) || k.includes(categoryName));
    if (matchKey && standardItems[matchKey]) return standardItems[matchKey];
    return [];
  };

  const handleRenameCategory = (oldName: string, newName: string) => {
    if (!editingQuote) return;
    const trimmedNew = newName.trim();
    if (!trimmedNew) {
      showToast('分類名稱不能為空', 'error');
      return;
    }
    if (trimmedNew === oldName) return;
    
    const visibleCats = editingQuote.visibleCategories || [];
    if (visibleCats.includes(trimmedNew)) {
      showToast('此分類名稱已存在於該報價單中', 'error');
      return;
    }

    const updatedQuote = {
      ...editingQuote,
      visibleCategories: (editingQuote.visibleCategories || []).map(cat => cat === oldName ? trimmedNew : cat),
      items: (editingQuote.items || []).map(item => item.category === oldName ? { ...item, category: trimmedNew } : item),
      voItems: (editingQuote.voItems || []).map(item => item.category === oldName ? { ...item, category: trimmedNew } : item),
      variationOrders: (editingQuote.variationOrders || []).map(vo => ({
        ...vo,
        items: (vo.items || []).map(item => item.category === oldName ? { ...item, category: trimmedNew } : item)
      }))
    };
    
    updateEditingQuoteStateAndSync(updatedQuote);
    showToast(`分類【${oldName}】已更名為【${trimmedNew}】`);
  };

  const handleAddVisibleCategory = (categoryName: string) => {
    if (!editingQuote) return;
    const current = editingQuote.visibleCategories || [];
    const uniqueName = getUniqueCategoryName(categoryName, current);
    
    const updatedQuote = {
      ...editingQuote,
      visibleCategories: [...current, uniqueName]
    };
    updateEditingQuoteStateAndSync(updatedQuote);
    showToast(`施工大類【${uniqueName}】已新增並顯示`);
  };

  const handleRemoveVisibleCategory = (categoryName: string) => {
    if (!editingQuote) return;
    const current = editingQuote.visibleCategories || [];
    const updatedQuote = {
      ...editingQuote,
      visibleCategories: current.filter(cat => cat !== categoryName)
    };
    updateEditingQuoteStateAndSync(updatedQuote);
    showToast(`施工大類【${categoryName}】已隱藏`);
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

  const handleAddVO = () => {
    if (!editingQuote) return;
    if (editingQuote.isLocked) return;
    const migrated = migrateQuotation(editingQuote);
    const vos = migrated.variationOrders || [];
    const nextNum = vos.length + 1;
    const newVO: VariationOrder = {
      id: `vo-${Date.now()}`,
      title: `後加工程 ${nextNum}`,
      items: [],
      paymentStages: [
        { name: '後加第一期', percent: 50, remark: '後加工程確認並安排物料' },
        { name: '後加第二期', percent: 50, remark: '後加工程完工驗收' }
      ],
      remarks: '1. 本後加工程明細一經簽署即視為原合約 (單號: ' + editingQuote.id + ') 之附屬有效條款，工程款將獨立予以計算及跟進收訖。\n2. 所有後加工程保養、施工及驗收標準，均比照並嚴格遵照原合約中載明之各項相關施工保養細項執行。',
      discount: 0,
      createdAt: Date.now()
    };
    const updatedQuote = {
      ...migrated,
      hasVO: true,
      variationOrders: [...vos, newVO],
      updatedAt: Date.now()
    };
    updateEditingQuoteStateAndSync(updatedQuote);
    setEditingActiveTab(newVO.id);
    showToast(`已新增 ${newVO.title}`);
  };

  const handleDeleteVO = (voId: string, voTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingQuote) return;
    if (editingQuote.isLocked) return;
    showConfirm(
      '確認刪除後加報價',
      `確定要永久刪除「${voTitle}」嗎？此操作不可復原。`,
      () => {
        if (!editingQuote) return;
        const migrated = migrateQuotation(editingQuote);
        const updatedVos = (migrated.variationOrders || []).filter(v => v.id !== voId);
        const updatedQuote = {
          ...migrated,
          hasVO: updatedVos.length > 0,
          variationOrders: updatedVos,
          updatedAt: Date.now()
        };
        updateEditingQuoteStateAndSync(updatedQuote);
        setEditingActiveTab('original');
        showToast(`已刪除 ${voTitle}`);
      },
      '確定刪除',
      '取消'
    );
  };

  const updateActiveVO = (updater: (vo: VariationOrder) => VariationOrder) => {
    if (!editingQuote) return;
    if (editingQuote.isLocked) return;
    const migrated = migrateQuotation(editingQuote);
    const updatedVos = (migrated.variationOrders || []).map(vo => {
      if (vo.id === editingActiveTab) {
        return updater(vo);
      }
      return vo;
    });

    const firstVo = updatedVos.find(v => v.id === 'vo-1');
    const updatedQuote = {
      ...migrated,
      variationOrders: updatedVos,
      voItems: firstVo ? firstVo.items : migrated.voItems,
      voPaymentStages: firstVo ? firstVo.paymentStages : migrated.voPaymentStages,
      voRemarks: firstVo ? firstVo.remarks : migrated.voRemarks,
      voDiscount: firstVo ? firstVo.discount : migrated.voDiscount,
      updatedAt: Date.now()
    };
    updateEditingQuoteStateAndSync(updatedQuote);
  };

  const handleAddVOMember = (category: string) => {
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
    updateActiveVO(vo => ({
      ...vo,
      items: [...(vo.items || []), newItem]
    }));
  };

  const handleAddVOFromLibrary = (category: string, standardItem: StandardItem) => {
    if (!editingQuote) return;
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
    updateActiveVO(vo => ({
      ...vo,
      items: [...(vo.items || []), newItem]
    }));
    showToast(`後加項目【${standardItem.name}】已加入「${category}」`);
  };

  const handleAddVOCategoryAllFromLibrary = (category: string) => {
    if (!editingQuote) return;
    const sItems = standardItems[category] || [];
    if (sItems.length === 0) {
      showToast('標準庫中無此類別項目');
      return;
    }

    const newItems = sItems.map(standardItem => {
      let defaultPrice = 0;
      if (standardItem.priceRange) {
        const parts = standardItem.priceRange.split('-');
        if (parts.length === 2) {
          defaultPrice = Math.round((parseFloat(parts[0]) + parseFloat(parts[1])) / 2);
        } else {
          defaultPrice = parseFloat(standardItem.priceRange) || 0;
        }
      }
      return {
        id: crypto.randomUUID(),
        category,
        name: standardItem.name,
        unit: standardItem.unit,
        quantity: 1,
        unitPrice: defaultPrice,
        remark: standardItem.defaultRemark || ''
      };
    });

    updateActiveVO(vo => ({
      ...vo,
      items: [...(vo.items || []), ...newItems]
    }));
    
    showToast(`已將 ${newItems.length} 個標準項目全部加入追加「${category}」`);
  };

  const handleUpdateVOItemField = (itemId: string, field: keyof QuotationItem, value: any) => {
    if (!editingQuote) return;
    updateActiveVO(vo => {
      const updatedItems = (vo.items || []).map(item => {
        if (item.id === itemId) {
          return { ...item, [field]: value };
        }
        return item;
      });
      return { ...vo, items: updatedItems };
    });
  };

  const handleRemoveVOItem = (itemId: string) => {
    if (!editingQuote) return;
    updateActiveVO(vo => ({
      ...vo,
      items: (vo.items || []).filter(item => item.id !== itemId)
    }));
  };

  const handleMoveVOItem = (itemId: string, direction: 'up' | 'down') => {
    if (!editingQuote) return;
    updateActiveVO(vo => {
      const list = [...(vo.items || [])];
      const index = list.findIndex(i => i.id === itemId);
      if (index === -1) return vo;
      
      const cat = list[index].category;
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
      } else if (direction === 'down' && positionInCat < catIndices.length - 1) {
        const nextIdx = catIndices[positionInCat + 1];
        const temp = list[index];
        list[index] = list[nextIdx];
        list[nextIdx] = temp;
      }
      return { ...vo, items: list };
    });
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

  // --- DRAG & DROP FOR QUOTATION ITEMS ---
  const handleItemDragStart = (e: React.DragEvent, itemId: string, type: 'original' | 'vo') => {
    if (editingQuote?.isLocked) return;
    setDraggedItemId(itemId);
    setDraggedItemType(type);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
  };

  const handleItemDragOver = (e: React.DragEvent, targetId: string, type: 'original' | 'vo') => {
    if (editingQuote?.isLocked) return;
    if (draggedItemId === targetId || draggedItemType !== type) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleItemDrop = (e: React.DragEvent, targetId: string, type: 'original' | 'vo') => {
    e.preventDefault();
    if (editingQuote?.isLocked) return;
    if (!draggedItemId || draggedItemId === targetId || draggedItemType !== type || !editingQuote) return;

    if (type === 'original') {
      const list = [...editingQuote.items];
      const draggedIdx = list.findIndex(i => i.id === draggedItemId);
      const targetIdx = list.findIndex(i => i.id === targetId);

      if (draggedIdx !== -1 && targetIdx !== -1) {
        const targetCategory = list[targetIdx].category;
        const [draggedItem] = list.splice(draggedIdx, 1);
        draggedItem.category = targetCategory; // adapt the category
        list.splice(targetIdx, 0, draggedItem);
        
        updateEditingQuoteStateAndSync({ ...editingQuote, items: list });
      }
    } else {
      updateActiveVO(vo => {
        const list = [...(vo.items || [])];
        const draggedIdx = list.findIndex(i => i.id === draggedItemId);
        const targetIdx = list.findIndex(i => i.id === targetId);

        if (draggedIdx !== -1 && targetIdx !== -1) {
          const targetCategory = list[targetIdx].category;
          const [draggedItem] = list.splice(draggedIdx, 1);
          draggedItem.category = targetCategory; // adapt the category
          list.splice(targetIdx, 0, draggedItem);
        }
        return { ...vo, items: list };
      });
    }
  };

  const handleItemDragEnd = () => {
    setDraggedItemId(null);
    setDraggedItemType(null);
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
    const updatedCategories = [...categories, trimmed];
    const updatedLib = { ...standardItems, [trimmed]: [] };
    const updatedCategoryOrder = [...categoryOrder, trimmed];

    syncCategoriesAndLibrary(updatedCategories, updatedLib, updatedCategoryOrder);
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
        const updatedLib = { ...standardItems };
        delete updatedLib[cat];
        const updatedCategoryOrder = categoryOrder.filter(c => c !== cat);

        syncCategoriesAndLibrary(updatedCats, updatedLib, updatedCategoryOrder);
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

    syncLibrary(updatedLib, categoryOrder);
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
    syncLibrary(updatedLib, categoryOrder);
    showToast('工程項目已從標準庫中移除');
  };

  const handleMoveStandardItem = (category: string, itemIdx: number, direction: 'up' | 'down') => {
    const currentList = standardItems[category] || [];
    if (currentList.length <= 1) return;

    const targetIdx = direction === 'up' ? itemIdx - 1 : itemIdx + 1;
    if (targetIdx < 0 || targetIdx >= currentList.length) return;

    const updatedList = [...currentList];
    const temp = updatedList[itemIdx];
    updatedList[itemIdx] = updatedList[targetIdx];
    updatedList[targetIdx] = temp;

    const updatedLib = {
      ...standardItems,
      [category]: updatedList
    };
    syncLibrary(updatedLib, categoryOrder);
    showToast('已調整標準項目排序');
  };

  const handleUpdateStandardItem = () => {
    if (!editingLibItem) return;
    if (!editingLibItem.name.trim()) {
      showToast('項目名稱不可空白', 'error');
      return;
    }

    const { category, itemIdx, name, unit, priceRange, defaultRemark } = editingLibItem;
    const currentList = standardItems[category] || [];
    
    const updatedList = currentList.map((item, idx) => {
      if (idx === itemIdx) {
        return {
          name: name.trim(),
          unit: unit.trim(),
          priceRange: priceRange.trim(),
          defaultRemark: defaultRemark.trim()
        };
      }
      return item;
    });

    const updatedLib = {
      ...standardItems,
      [category]: updatedList
    };

    syncLibrary(updatedLib, categoryOrder);
    setEditingLibItem(null);
    showToast('成功修改標準庫項目');
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

  // Export standard library JSON to local
  const handleExportStandardItemsJSON = () => {
    const libraryBackup = {
      standardItems,
      categories,
      categoryOrder
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(libraryBackup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    
    const now = new Date();
    const dateStamp = now.toISOString().split('T')[0];
    downloadAnchor.setAttribute("download", `築匠工程標準項目庫_${dateStamp}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('成功導出標準項目庫 JSON 檔！');
  };

  // Import standard library JSON to local and restore settings
  const handleImportStandardItemsJSON = (event: ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = event.target.files;
    if (!files || files.length === 0) return;

    fileReader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string) as any;
        
        // Extract standard items
        const importedItems = parsed.standardItems || parsed.customStandardItems;
        // Extract category order or categories
        const importedCategoryOrder = parsed.categoryOrder || parsed.categories || parsed.customCategories;
        const importedCategories = parsed.categories || parsed.customCategories || parsed.categoryOrder;

        if (!importedItems || typeof importedItems !== 'object') {
          showToast('匯入失敗：找不到有效的標準項目數據！', 'error');
          return;
        }

        const finalCategoryOrder = Array.isArray(importedCategoryOrder) 
          ? importedCategoryOrder 
          : Object.keys(importedItems);

        const finalCategories = Array.isArray(importedCategories)
          ? importedCategories
          : finalCategoryOrder;

        syncCategoriesAndLibrary(finalCategories, importedItems, finalCategoryOrder);
        
        showToast('標準項目庫已成功恢復與載入！');
        // Reset file input value
        event.target.value = '';
      } catch (err) {
        showToast('匯入失敗：JSON 格式損毀或無效！', 'error');
      }
    };
    fileReader.readAsText(files[0]);
  };

  const handleFirebaseBackup = async () => {
    try {
      await saveStandardLibraryToFirebase(standardItems, categoryOrder);
      showToast('成功備份標準庫至雲端');
    } catch (error) {
      showToast('備份至雲端失敗', 'error');
    }
  };

  const handleFirebaseRestore = async () => {
    try {
      const data = await loadStandardLibraryFromFirebase();
      if (data) {
        syncCategoriesAndLibrary(data.categoryOrder, data.data, data.categoryOrder);
        showToast('成功從雲端還原標準庫');
      } else {
        showToast('雲端找不到備份', 'error');
      }
    } catch (error) {
      showToast('從雲端還原失敗', 'error');
    }
  };

  const handleImportBackup = (event: ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = event.target.files;
    if (!files || files.length === 0) return;

    fileReader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string) as any;
        
        let hasLibrary = false;
        let hasCategories = false;
        let finalLib = standardItems;
        let finalCats = categories;
        let finalOrder = categoryOrder;

        if (parsed.quotations && Array.isArray(parsed.quotations)) {
          syncQuotes(parsed.quotations);
        }
        if (parsed.customStandardItems && typeof parsed.customStandardItems === 'object') {
          finalLib = parsed.customStandardItems as Record<string, StandardItem[]>;
          finalOrder = parsed.categoryOrder || categoryOrder;
          hasLibrary = true;
        }
        if (parsed.customCategories && Array.isArray(parsed.customCategories)) {
          finalCats = parsed.customCategories;
          hasCategories = true;
        }

        if (hasLibrary || hasCategories) {
          syncCategoriesAndLibrary(finalCats, finalLib, finalOrder);
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
      '確定要登出並重置本地偏好設定嗎？',
      () => {
        localStorage.removeItem('artisan_token');
        localStorage.removeItem('artisan_user');
        localStorage.removeItem('artisan_is_dark_mode');
        setCurrentUser(null);
        setSessionToken(null);
        showToast('已回復出廠預設值，並安全登出', 'info');
      },
      '確定重置',
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
          paymentStages: parsed.paymentStages,
          meetingRecords: parsed.meetingRecords || '',
          draftRemarks: parsed.draftRemarks || '',
          internalNumber: parsed.internalNumber || ''
        };

        const updatedQuotes = [importedQuoteObj, ...quotations];
        saveQuotationToFirestore(importedQuoteObj)
          .catch(err => console.error("Firestore save error on import:", err));
        
        syncQuotes(updatedQuotes, true);

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
    const quoteCategories = getQuotationCategories(quote, categories);
    quoteCategories.forEach(cat => {
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
      depositPercent: 35,
      progressPercent: 20,
      balancePercent: 15,
      paymentStages: [
        { name: '第一期', percent: 35, remark: '簽約及進場前' },
        { name: '第二期', percent: 20, remark: '完成水、電、批盪、防水、試水48小時' },
        { name: '第三期', percent: 15, remark: '完成全部瓷磚安裝' },
        { name: '第四期', percent: 10, remark: '傢俬確認施工圖' },
        { name: '第五期', percent: 15, remark: '傢俬送貨前' },
        { name: '第六期', percent: 5, remark: '完工後' }
      ]
    };
    
    saveQuotationToFirestore(sample)
      .catch(err => console.error("Firestore save error on sample load:", err));
    
    syncQuotes([sample, ...quotations], true);
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

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 antialiased font-sans relative text-slate-800">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-500 via-orange-600 to-amber-700"></div>
        
        <div className="w-full max-w-md bg-white rounded-2xl shadow-md border border-slate-200 relative overflow-hidden transition-all">
          
          {/* Card Header matching editing quote page header style */}
          <div className="bg-slate-50 border-b border-slate-200 px-8 py-5 flex items-center gap-3.5">
            <div className="p-1.5 bg-white rounded-xl shadow-xs shrink-0 border border-slate-200">
              <img src="/icon-512.png" alt="Artisan Studio Logo" className="w-8 h-8 object-contain" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">築匠 Artisan Studio</h2>
              <p className="text-2xs text-slate-500 mt-0.5 font-medium">報價審核與多用戶實時同步系統</p>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-600 tracking-wider uppercase mb-1.5">使用者帳號</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="請輸入使用者名稱"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-slate-900"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-600 tracking-wider uppercase mb-1.5">密碼</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="請輸入密碼"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-slate-900"
                    required
                  />
                </div>
              </div>
              
              {loginError && (
                <div className="p-3 bg-rose-50 border border-rose-150 text-rose-600 rounded-xl flex items-start gap-2 text-xs leading-tight">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}
              
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                {loginLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>正在安全登入並連線雲端...</span>
                  </>
                ) : (
                  <span>登入系統</span>
                )}
              </button>
            </form>
            
            <div className="mt-6 pt-6 border-t border-gray-150 flex flex-col items-center gap-3">
              <button
                onClick={handleEnterLocalMode}
                className="text-xs text-amber-600 hover:text-amber-700 font-bold transition-colors cursor-pointer"
              >
                進入離線預覽調試模式
              </button>
            </div>
          </div>
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
          <div className="flex flex-col items-center gap-8 w-full">
            {renderQuotationPages(previewQuote, false)}
            
            {/* If there are variation orders, render them behind the original contract */}
            {(() => {
              const migrated = migrateQuotation(previewQuote);
              const vos = migrated.variationOrders || [];
              if (vos.length > 0) {
                return vos.map((vo, idx) => {
                  if (!vo.items || vo.items.length === 0) return null;
                  const tempQuote: Quotation = {
                    ...migrated,
                    voItems: vo.items,
                    voPaymentStages: vo.paymentStages || [],
                    voRemarks: vo.remarks || '',
                    voDiscount: vo.discount || 0,
                    voTitle: vo.title || `後加工程 ${idx + 1}`
                  };
                  return (
                    <div key={vo.id || idx} className="w-full flex flex-col items-center gap-8">
                      {renderVOQuotationPages(tempQuote, false)}
                    </div>
                  );
                });
              } else if (migrated.voItems && migrated.voItems.length > 0) {
                return (
                  <div className="w-full flex flex-col items-center gap-8">
                    {renderVOQuotationPages(migrated, false)}
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
      )}

      {previewVOQuote && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] overflow-y-auto p-4 md:p-8 flex flex-col items-center animate-fade-in">
          {/* Top floating control and status bar */}
          <div className="w-full max-w-[210mm] bg-slate-900 text-white rounded-xl shadow-lg px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 sticky top-0 z-50 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-600 rounded-lg text-white">
                <FileText className="w-5 h-5" />
              </div>
              <div className="text-left font-sans">
                <h3 className="font-bold text-sm tracking-wide text-white">築匠後加合約審單 ． 系統排版預覽</h3>
                <p className="text-xs text-slate-400 mt-0.5">目前單號 : <span className="font-mono text-amber-400 font-bold">{previewVOQuote.id}</span></p>
              </div>
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={() => {
                  const quoteToPrint = previewVOQuote;
                  setPreviewVOQuote(null);
                  handleTriggerVOPrint(quoteToPrint);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>直接列印 / 下載 PDF</span>
              </button>
              <button
                onClick={() => setPreviewVOQuote(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
              >
                <X className="w-4 h-4" />
                <span>關閉預覽</span>
              </button>
            </div>
          </div>

          {/* Document pages mock sheets layout container */}
          {renderVOQuotationPages(previewVOQuote, false)}
        </div>
      )}

      {/* --- STANDALONE VO PRINT PREVIEW CONTAINER --- */}
      {printVOQuote && (
        <div className="hidden print:block print:static print:w-full print:h-auto print:overflow-visible bg-white text-black p-0 print:p-0 z-[9999] font-sans leading-relaxed fixed inset-0 overflow-y-auto">
          {renderVOQuotationPages(printVOQuote, true)}
          {/* Back button printable guide helper */}
          <div className="print:hidden fixed bottom-6 right-6 flex gap-2">
            <button 
              onClick={() => setPrintVOQuote(null)}
              className="bg-black text-white px-4 py-2 rounded-full cursor-pointer hover:bg-gray-800 shadow"
            >
              結束預覽
            </button>
          </div>
        </div>
      )}

      {/* --- PRINT SHEET CONTAINER OVERLAY (Hidden during screen work, only active for printed viewport) --- */}
      {printQuote && (
        <div className="hidden print:block print:static print:w-full print:h-auto print:overflow-visible bg-white text-black p-0 print:p-0 z-[9999] font-sans leading-relaxed fixed inset-0 overflow-y-auto">
          <div>
            {renderQuotationPages(printQuote, true)}
            
            {/* If there are variation orders, render them behind the original contract */}
            {(() => {
              const migrated = migrateQuotation(printQuote);
              const vos = migrated.variationOrders || [];
              if (vos.length > 0) {
                return vos.map((vo, idx) => {
                  if (!vo.items || vo.items.length === 0) return null;
                  const tempQuote: Quotation = {
                    ...migrated,
                    voItems: vo.items,
                    voPaymentStages: vo.paymentStages || [],
                    voRemarks: vo.remarks || '',
                    voDiscount: vo.discount || 0,
                    voTitle: vo.title || `後加工程 ${idx + 1}`
                  };
                  return (
                    <div key={vo.id || idx} style={{ pageBreakBefore: 'always', breakBefore: 'always' }}>
                      {renderVOQuotationPages(tempQuote, true)}
                    </div>
                  );
                });
              } else if (migrated.voItems && migrated.voItems.length > 0) {
                return (
                  <div style={{ pageBreakBefore: 'always', breakBefore: 'always' }}>
                    {renderVOQuotationPages(migrated, true)}
                  </div>
                );
              }
              return null;
            })()}
          </div>
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
      <div 
        className={`print:hidden ${isMobile && !editingQuote ? 'pb-16' : ''}`}
        style={{
          zoom: (isMobile && activeMainTab !== 'calendar') 
            ? 0.85 
            : (settings.appFontSize === 'sm' ? 0.92 : settings.appFontSize === 'lg' ? 1.08 : settings.appFontSize === 'xl' ? 1.16 : 1)
        }}
      >
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
        {!isMobile && (
          <header className="bg-white border-b border-gray-200 stick sticky top-0 z-40 shadow-sm">
            <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
              <div 
                onClick={handleGoHome} 
                className="flex items-center gap-3 cursor-pointer hover:opacity-95 select-none group active:scale-[0.99] transition-all"
                title="返回首頁：合約報價總覽"
              >
                <img 
                  src="/icon-512.png" 
                  alt="Artisan Studio"
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 object-contain rounded-md outline-1 outline-amber-600/10 group-hover:scale-105 transition-transform bg-white"
                />
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold text-slate-800 flex flex-wrap items-center gap-2 group-hover:text-amber-600 transition-colors">
                    <span>築匠 Artisan Studio｜匠心工藝・專業與細節</span>
                  </h1>
                  <p className="text-xs text-gray-500 font-medium">報價系統</p>
                </div>
              </div>

              {/* Middle Online Action Badge & Settings controls */}
              <div className="flex items-center gap-3">
                {currentUser && (
                  <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-50 border border-gray-150 rounded-lg text-xs font-semibold text-slate-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                    <span>{currentUser.displayName}</span>
                    <span className="text-slate-400">({currentUser.role === 'admin' ? '管理員' : '員工'})</span>
                  </div>
                )}

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

                  <button 
                    onClick={handleLogout}
                    className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="登出系統"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </header>
        )}

        {/* --- MAIN PAGE CONTENT --- */}
        <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
          
          {!isMobile && !editingQuote && (
            <div id="admin-main-tabs" className="flex border-b border-gray-200 mb-2">
              <button
                type="button"
                onClick={() => setActiveMainTab('calendar')}
                className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                  activeMainTab === 'calendar'
                    ? 'border-amber-600 text-amber-600 font-extrabold'
                    : 'border-transparent text-gray-500 hover:text-slate-800'
                }`}
              >
                <Calendar className="w-4.5 h-4.5 text-amber-500" />
                <span>行事曆 & 工程日曆</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMainTab('contracts')}
                className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                  activeMainTab === 'contracts'
                    ? 'border-amber-600 text-amber-600 font-extrabold'
                    : 'border-transparent text-gray-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-4.5 h-4.5" />
                <span>工程合約報價總覽</span>
              </button>
              {currentUser?.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => setActiveMainTab('payments')}
                  className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                    activeMainTab === 'payments'
                      ? 'border-amber-600 text-amber-600 font-extrabold'
                      : 'border-transparent text-gray-500 hover:text-slate-800'
                  }`}
                >
                  <Coins className="w-4.5 h-4.5 text-amber-500" />
                  <span>分期收款進度</span>
                </button>
              )}
            </div>
          )}

          {/* Mobile optimization banner for non-calendar views */}
          {isMobile && !editingQuote && activeMainTab !== 'calendar' && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center gap-2.5 shadow-2xs text-[11px] sm:text-xs font-bold leading-relaxed mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="text-left">
                <span>⚠️ 建議使用桌面模式或橫屏顯示，以獲得最佳系統操作與表格對帳體驗</span>
              </div>
            </div>
          )}

          {/* Quick Search and Control Toolbar */}
          {!editingQuote && activeMainTab !== 'calendar' && (
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
                    <option value="finished">施工完成</option>
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
              <div className="bg-slate-50 border-b border-slate-200/80 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-slate-900 animate-fade-in">
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <FileText className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      {isEditingNew ? '新購置裝修工程合約：草稿編制' : `編輯報價合約：${editingQuote.id}`}
                    </h3>
                    <p className="text-2xs text-slate-500 mt-0.5">離線狀態安全。修改儲存即寫入 PWA 硬碟快取</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button 
                    onClick={handleExitEditing}
                    className="p-1.5 hover:bg-slate-200/70 rounded-full transition-colors cursor-pointer"
                    title="退出草稿"
                  >
                    <X className="w-5 h-5 text-slate-500 hover:text-slate-800" />
                  </button>
                </div>
              </div>
              
              {/* Lock Banner */}
              {editingQuote.isLocked && (
                <div className="mx-6 mt-6 bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-3 text-left animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-600 text-white rounded-lg shrink-0">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-rose-900">🔒 此合約報價單已儲存鎖定（唯讀模式）</h4>
                      <p className="text-xs text-rose-700 mt-1">
                        為了防止誤觸與保障報價單一致性，儲存後已自動鎖定內容。如需修改，請點擊右側「解鎖編輯」按鈕。
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDialog({
                        isOpen: true,
                        title: '解鎖合約報價單',
                        message: '您確定要解鎖此合約報價單進行編輯嗎？編輯並儲存後會重新自動鎖定。',
                        onConfirm: () => {
                          setEditingQuote({ ...editingQuote, isLocked: false });
                          setConfirmDialog(null);
                          showToast('已成功解鎖，現在可以編輯項目與金額');
                        },
                        confirmText: '確定解鎖',
                        cancelText: '取消'
                      });
                    }}
                    className="px-4 py-2 bg-white hover:bg-rose-100 border border-rose-300 text-rose-800 font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0 shadow-3xs"
                  >
                    解鎖編輯
                  </button>
                </div>
              )}

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
                    disabled={editingQuote.isLocked}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-amber-600 text-slate-800 font-semibold font-mono disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">公司內部號碼 (Internal No.)</label>
                  <input 
                    type="text" 
                    placeholder="例如：CO-2026-001" 
                    value={editingQuote.internalNumber || ''}
                    onChange={(e) => setEditingQuote({...editingQuote, internalNumber: e.target.value})}
                    disabled={editingQuote.isLocked}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-600 text-slate-800 font-semibold disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">合約日期</label>
                  <input 
                    type="date"
                    value={editingQuote.date}
                    onChange={(e) => setEditingQuote({...editingQuote, date: e.target.value})}
                    disabled={editingQuote.isLocked}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-600 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">客戶姓名 *</label>
                  <input 
                    type="text" 
                    placeholder="例如：陳大文先生" 
                    value={editingQuote.customerName}
                    onChange={(e) => setEditingQuote({...editingQuote, customerName: e.target.value})}
                    disabled={editingQuote.isLocked}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-600 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">電話號碼</label>
                  <input 
                    type="text" 
                    placeholder="客戶聯絡號碼" 
                    value={editingQuote.phone}
                    onChange={(e) => setEditingQuote({...editingQuote, phone: e.target.value})}
                    disabled={editingQuote.isLocked}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-600 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                  />
                </div>

                <div className={currentUser?.role === 'admin' ? "col-span-1 md:col-span-2" : "col-span-1 md:col-span-3"}>
                  <label className="block text-xs font-bold text-gray-600 mb-1">裝修施工地址</label>
                  <input 
                    type="text" 
                    placeholder="施工樓宇地段、層室詳細地址" 
                    value={editingQuote.address}
                    onChange={(e) => setEditingQuote({...editingQuote, address: e.target.value})}
                    disabled={editingQuote.isLocked}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-600 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                  />
                </div>

                {currentUser?.role === 'admin' && (
                  <div className="col-span-1 md:col-span-1">
                    <label className="block text-xs font-bold text-amber-800 mb-1">負責員工</label>
                    <select
                      value={editingQuote.assignedTo || 'whlee'}
                      onChange={(e) => setEditingQuote({...editingQuote, assignedTo: e.target.value})}
                      disabled={editingQuote.isLocked}
                      className="w-full px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-lg text-sm font-semibold text-amber-900 focus:outline-none focus:border-amber-600 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                    >
                      <option value="whlee">預設管理員 (whlee)</option>
                      {accountsList
                        .filter(a => a.username !== 'whlee')
                        .map(a => (
                          <option key={a.username} value={a.username}>
                            {a.displayName} (@{a.username})
                          </option>
                        ))
                      }
                    </select>
                  </div>
                )}

                <div className="col-span-1 md:col-span-1">
                  <label className="block text-xs font-bold text-gray-600 mb-1">合約狀態</label>
                  <select
                    value={editingQuote.status || 'pending'}
                    onChange={(e) => setEditingQuote({...editingQuote, status: e.target.value as QuotationStatus})}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-800 focus:outline-none focus:border-amber-600"
                  >
                    <option value="pending">未報價 (Pending)</option>
                    <option value="quoted">報價待回覆 (Quoted)</option>
                    <option value="signed">已簽約 (Signed)</option>
                    <option value="constructing">施工中 (Constructing)</option>
                    <option value="finished">施工完成 (Finished)</option>
                    <option value="completed">完工結清 (Completed)</option>
                    <option value="cancelled">作廢 (Cancelled)</option>
                  </select>
                </div>
              </div>

              {/* Tab Bar for switching between Original Quotation and Variation Order (VO) */}
              {(() => {
                const migrated = migrateQuotation(editingQuote);
                const vos = migrated.variationOrders || [];
                return (
                  <div className="bg-slate-100/60 border-b border-gray-200 px-6 py-1 flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingActiveTab('original')}
                      className={`px-5 py-3 text-xs sm:text-sm font-black border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                        editingActiveTab === 'original'
                          ? 'border-amber-600 text-amber-700'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                      }`}
                    >
                      📝 主合約報價單 (Main Quotation)
                    </button>
                    {vos.map((vo, voIdx) => (
                      <div
                        key={vo.id}
                        className="group relative flex items-center bg-slate-50 border border-slate-200/60 rounded-lg hover:border-amber-200 m-1"
                      >
                        <button
                          type="button"
                          onClick={() => setEditingActiveTab(vo.id)}
                          className={`pl-4 pr-9 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer rounded-lg ${
                            editingActiveTab === vo.id
                              ? 'border-amber-600 text-amber-600 bg-amber-50/30'
                              : 'border-transparent text-gray-500 hover:text-amber-600 hover:bg-amber-50/20'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                          <span>{vo.title || `後加工程 ${voIdx + 1}`}</span>
                        </button>
                        {!editingQuote.isLocked && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteVO(vo.id, vo.title, e)}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-rose-600 rounded-full hover:bg-slate-200/80 transition-all cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="刪除此張後加報價單"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {editingQuote.isLocked && (
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-300">
                            <Lock className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    ))}
                    {!editingQuote.isLocked && (
                      <button
                        type="button"
                        onClick={handleAddVO}
                        className="ml-auto px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all active:scale-95 cursor-pointer my-1 sm:my-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>新增後加工程報價 (VO)</span>
                      </button>
                    )}
                    {editingQuote.isLocked && (
                      <span className="ml-auto text-2xs text-slate-400 bg-slate-200/50 px-2 py-1 rounded font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-450" />
                        合約鎖定中
                      </span>
                    )}
                  </div>
                );
              })()}

              {editingActiveTab === 'original' ? (
                <>
                  {/* Items Management list (Grouped by Category) */}
                  <div className="p-4 sm:p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-150 pb-1.5">
                      <h4 className="text-gray-700 font-bold border-l-4 border-slate-900 pl-2 text-md">工程施工項目詳情：</h4>
                    </div>

                    {(() => {
                      const visibleCats = getQuotationCategories(editingQuote, categories);
                      if (visibleCats.length === 0) {
                        return (
                          <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                            <p className="text-sm font-bold text-slate-600">目前尚無顯示任何工程分類</p>
                            <p className="text-xs text-slate-400 mt-1">請使用下方的「增加施工大類」選擇並加入分類，例如：打拆工程、水泥工程等。</p>
                          </div>
                        );
                      }
                      return null;
                    })()}
                
                {getQuotationCategories(editingQuote, categories).map((cat) => {
                  const items = editingQuote.items.filter(i => i.category === cat);
                  const catSubtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
                  
                  return (
                    <div key={cat} className="border border-slate-100 rounded-xl bg-slate-50/50 py-2.5 px-4 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-1.5">
                        <div className="flex items-center gap-2.5 w-full sm:w-auto">
                          {editingCategoryName?.oldName === cat ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={editingCategoryName.value}
                                onChange={(e) => setEditingCategoryName({ ...editingCategoryName, value: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleRenameCategory(cat, editingCategoryName.value);
                                    setEditingCategoryName(null);
                                  } else if (e.key === 'Escape') {
                                    setEditingCategoryName(null);
                                  }
                                }}
                                className="px-2 py-0.5 text-xs font-bold border border-slate-300 rounded focus:outline-none bg-white max-w-[150px]"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  handleRenameCategory(cat, editingCategoryName.value);
                                  setEditingCategoryName(null);
                                }}
                                className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer transition-colors"
                                title="儲存"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCategoryName(null)}
                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                                title="取消"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-slate-800 text-sm">{cat}</span>
                              {!editingQuote.isLocked && (
                                <button
                                  type="button"
                                  onClick={() => setEditingCategoryName({ oldName: cat, value: cat })}
                                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                                  title="重命名此大類"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                          {items.length > 0 && (
                            <span className="px-2 py-0.5 bg-slate-200/80 text-slate-700 rounded-full text-[11px] font-bold font-mono">
                              小計: HK${catSubtotal.toLocaleString()}
                            </span>
                          )}
                        </div>
                        
                        {/* Selector/Adder shortcut from standard library items */}
                        {!editingQuote.isLocked && (
                          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                            {(() => {
                              const sItems = getStandardItemsForCategory(cat);
                              if (sItems.length === 0) return null;
                              return (
                                <div className="flex gap-1 items-center">
                                  <select 
                                    onChange={(e) => {
                                      const selectIndex = parseInt(e.target.value);
                                      if (!isNaN(selectIndex)) {
                                        handleAddFromLibrary(cat, sItems[selectIndex]);
                                        e.target.value = ''; // reset selection
                                      }
                                    }}
                                    className="text-[12px] px-2 bg-white border border-gray-300 rounded-lg cursor-pointer max-w-[130px] h-7 focus:outline-amber-600"
                                  >
                                    <option value="">請選擇標準項目...</option>
                                    {sItems.map((si, sidx) => (
                                      <option key={sidx} value={sidx}>{si.name}</option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => handleAddCategoryAllFromLibrary(cat)}
                                    className="px-2 text-[12px] bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold rounded-lg flex items-center gap-0.5 h-7 transition-colors cursor-pointer shrink-0"
                                    title="將此大類的所有標準項目一鍵全部帶入"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                                    加入類別全部
                                  </button>
                                </div>
                              );
                            })()}
                            <button 
                              type="button"
                              onClick={() => handleAddCustomItem(cat)}
                              className="px-2.5 text-[12px] bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg flex items-center gap-0.5 h-7 transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" /> 自訂新項
                            </button>
                            {items.length === 0 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveVisibleCategory(cat)}
                                className="px-2 text-[12px] text-gray-500 hover:text-rose-600 bg-white hover:bg-rose-50 border border-gray-200 hover:border-rose-200 rounded-lg h-7 transition-colors flex items-center gap-0.5 cursor-pointer"
                                title="隱藏此大類"
                              >
                                <X className="w-3 h-3 text-gray-400" /> 隱藏
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Items table layout inside category */}
                      {items.length === 0 ? (
                        <p className="text-2xs text-gray-400 italic text-center py-2">目前沒有【{cat}】大類的細項，請點選上方按鈕創建或從標準庫帶入</p>
                      ) : (
                        <div className="space-y-2">
                          <div className="hidden md:grid grid-cols-12 gap-2 text-2xs font-bold text-gray-500 pl-9 pr-3 select-none">
                            <span className="col-span-3">項目工程描述</span>
                            <span className="col-span-1 text-center">單位</span>
                            <span className="col-span-1 text-center">數量</span>
                            <span className="col-span-1 text-right">單價(HKD)</span>
                            <span className="col-span-5">詳細備註說明</span>
                            <span className="col-span-1 text-center">操作</span>
                          </div>

                          {items.map((item) => (
                            <div 
                              key={item.id} 
                              draggable={!editingQuote.isLocked}
                              onDragStart={(e) => handleItemDragStart(e, item.id, 'original')}
                              onDragOver={(e) => handleItemDragOver(e, item.id, 'original')}
                              onDrop={(e) => handleItemDrop(e, item.id, 'original')}
                              onDragEnd={handleItemDragEnd}
                              className={`grid grid-cols-1 md:grid-cols-12 gap-2 bg-white py-1.5 px-3 pl-8 md:pl-9 rounded-lg border text-sm items-start relative shadow-2xs transition-all ${
                                draggedItemId === item.id 
                                  ? 'opacity-45 border-amber-400 bg-amber-50/10 scale-[0.98]' 
                                  : 'border-gray-200 hover:border-slate-350 hover:bg-slate-50/20'
                              }`}
                            >
                              {/* Drag Handle */}
                              {!editingQuote.isLocked && (
                                <div 
                                  className="absolute left-2 top-[18px] md:top-1/2 md:-translate-y-1/2 cursor-grab active:cursor-grabbing text-gray-300 hover:text-amber-600 flex items-center justify-center p-1 rounded hover:bg-slate-100 transition-colors"
                                  title="按住拖曳調整順序"
                                >
                                  <GripVertical className="w-4 h-4 shrink-0" />
                                </div>
                              )}

                              {/* Item Description */}
                              <div className="col-span-1 md:col-span-3">
                                <input 
                                  type="text"
                                  placeholder="修繕工程項目名稱..."
                                  value={item.name}
                                  onChange={(e) => handleUpdateItemField(item.id, 'name', e.target.value)}
                                  disabled={editingQuote.isLocked}
                                  className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-slate-800 font-semibold focus:outline-amber-600 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                />
                              </div>

                              {/* Unit */}
                              <div className="col-span-1 md:col-span-1 text-center">
                                <input 
                                  type="text"
                                  placeholder="項目"
                                  value={item.unit}
                                  onChange={(e) => handleUpdateItemField(item.id, 'unit', e.target.value)}
                                  disabled={editingQuote.isLocked}
                                  className="w-full px-1 py-1 border border-gray-200 rounded text-center text-xs focus:outline-amber-600 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                />
                              </div>

                              {/* Quantity */}
                              <div className="col-span-1 md:col-span-1">
                                <input 
                                  type="number"
                                  value={item.quantity === 0 ? '' : item.quantity}
                                  onChange={(e) => handleUpdateItemField(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                  disabled={editingQuote.isLocked}
                                  className="w-full px-1 py-1 border border-gray-200 rounded text-center text-xs font-mono focus:outline-amber-600 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                />
                              </div>

                              {/* Unit Price */}
                              <div className="col-span-1 md:col-span-1">
                                <input 
                                  type="number"
                                  value={item.unitPrice === 0 ? '' : item.unitPrice}
                                  onChange={(e) => handleUpdateItemField(item.id, 'unitPrice', Math.max(0, parseInt(e.target.value) || 0))}
                                  disabled={editingQuote.isLocked}
                                  className="w-full px-2 py-1 border border-gray-200 rounded text-right text-xs font-mono text-amber-700 focus:outline-amber-600 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                />
                              </div>

                              {/* Remark */}
                              <div className="col-span-1 md:col-span-5">
                                <textarea 
                                  placeholder="非必填：備註規格或施工備別..."
                                  rows={Math.max(1, item.remark ? item.remark.split('\n').length : 1)}
                                  value={item.remark}
                                  onChange={(e) => handleUpdateItemField(item.id, 'remark', e.target.value)}
                                  disabled={editingQuote.isLocked}
                                  className="w-full px-2 py-1.5 border border-gray-250 rounded text-[11px] text-gray-650 focus:outline-amber-600 focus:ring-1 focus:ring-amber-500/20 bg-white transition-all resize-y min-h-[30px] leading-relaxed font-sans disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                />
                              </div>

                              {/* Action Remove & Sorting */}
                              <div className="col-span-1 md:col-span-1 flex justify-center items-center gap-1 select-none">
                                {!editingQuote.isLocked ? (
                                  <>
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
                                  </>
                                ) : (
                                  <span className="text-3xs text-gray-400 font-bold select-none">唯讀</span>
                                )}
                              </div>
                            </div>
                          ))}

                          {/* Category Subtotal Footer Row */}
                          <div className="flex justify-end items-center gap-2 border-t border-gray-200/80 pt-1.5 mt-1 px-2">
                            <span className="text-xs text-gray-500 font-bold">【{cat}】分類小計 (Subtotal):</span>
                            <span className="text-sm font-black text-amber-600 font-mono">
                              HK${catSubtotal.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Bottom Category Selector/Adder UI */}
                {!editingQuote.isLocked && (
                  <div className="flex justify-center pt-4 border-t border-gray-150">
                    <div className="flex flex-wrap justify-center gap-3">
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 px-4 py-2.5 rounded-xl shadow-2xs">
                        <span className="text-xs font-extrabold text-slate-500">增加施工大類：</span>
                        <select
                          value=""
                          onChange={(e) => {
                            const cat = e.target.value;
                            if (cat) {
                              handleAddVisibleCategory(cat);
                              e.target.value = ''; // reset selection
                            }
                          }}
                          className="text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg cursor-pointer font-semibold text-slate-800 focus:outline-amber-600 shadow-3xs"
                        >
                          <option value="" disabled>-- 請選擇分類 --</option>
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      {projectTemplates && projectTemplates.length > 0 && (
                        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-150 px-4 py-2.5 rounded-xl shadow-2xs">
                          <span className="text-xs font-extrabold text-indigo-700">套用常用範本：</span>
                          <select
                            value=""
                            onChange={(e) => {
                              const tplId = e.target.value;
                              if (tplId) {
                                handleApplyTemplateToCurrentQuote(tplId);
                                e.target.value = '';
                              }
                            }}
                            className="text-xs px-2.5 py-1.5 bg-white border border-indigo-250 rounded-lg cursor-pointer font-semibold text-indigo-800 focus:outline-indigo-600 shadow-3xs"
                          >
                            <option value="" disabled>-- 選擇要套用的組合範本 --</option>
                            {projectTemplates.map((tpl) => (
                              <option key={tpl.id} value={tpl.id}>
                                {tpl.name} ({tpl.items?.length || 0} 個項目)
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
                          disabled={editingQuote.isLocked}
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
                          className="w-4 h-4 text-rose-600 rounded border-gray-300 focus:ring-rose-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                disabled={editingQuote.isLocked}
                                onChange={(e) => {
                                  const list = [...(editingQuote.discounts || [])];
                                  list[idx] = { ...list[idx], targetItemId: e.target.value || undefined };
                                  setEditingQuote({ ...editingQuote, discounts: list });
                                }}
                                className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-xs focus:outline-none focus:border-rose-500 font-sans disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
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
                                disabled={editingQuote.isLocked}
                                onChange={(e) => {
                                  const list = [...(editingQuote.discounts || [])];
                                  list[idx] = { ...list[idx], amount: Math.max(0, parseFloat(e.target.value) || 0) };
                                  setEditingQuote({ ...editingQuote, discounts: list });
                                }}
                                className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-xs font-mono text-rose-600 focus:outline-none focus:border-rose-500 disabled:bg-gray-100 disabled:text-rose-400 disabled:cursor-not-allowed"
                                placeholder="0"
                              />
                            </div>

                            {/* Remove button */}
                            <div className="col-span-1 sm:col-span-1 flex justify-center pb-0.5">
                              {!editingQuote.isLocked ? (
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
                              ) : (
                                <span className="text-3xs text-gray-400 font-bold">唯讀</span>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Add button */}
                        {!editingQuote.isLocked && (
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
                        )}
                      </div>
                    )}
                  </div>

                  {/* VO / Variation Order 追加項目 section (Add Variation Order Button instead of Switch) */}
                  <div className="bg-amber-50/20 border border-amber-200/60 rounded-2xl p-5 space-y-4 shadow-3xs text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-amber-500 rounded-lg text-white">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-800">後加工程項目 (Variation Order / VO)</h4>
                          <p className="text-[11px] text-gray-500 mt-0.5">當客戶有較多後加施工項目時，可建立一張或多張獨立的追加施工報價單，獨立核算與列印。</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={handleAddVO}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-black flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer self-start sm:self-center"
                      >
                        <Plus className="w-4 h-4 text-white" />
                        <span>新增後加工程報價 (VO)</span>
                      </button>
                    </div>
                  </div>

                  {false && (
                    <div className="bg-amber-50/20 border border-amber-200/60 rounded-2xl p-5 space-y-4 shadow-3xs text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-amber-500 rounded-lg text-white">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">後加工程項目 (Variation Order / VO)</h4>
                          <p className="text-[11px] text-gray-500 mt-0.5">當客戶有較多後加施工項目時，可啟用本功能進行獨立預算、獨立出單及獨立收款</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={!!editingQuote.hasVO}
                          onChange={(e) => {
                            const hasVO = e.target.checked;
                            const voPaymentStages = editingQuote.voPaymentStages && editingQuote.voPaymentStages.length > 0 
                              ? editingQuote.voPaymentStages 
                              : [
                                  { name: '後加第一期', percent: 50, remark: '後加工程確認並安排物料' },
                                  { name: '後加第二期', percent: 50, remark: '後加工程完工驗收' }
                                ];
                            setEditingQuote({
                              ...editingQuote,
                              hasVO,
                              voItems: editingQuote.voItems || [],
                              voPaymentStages,
                              voRemarks: editingQuote.voRemarks || '1. 本後加工程明細一經簽署即視為原合約 (單號: ' + editingQuote.id + ') 之附屬有效條款，工程款將獨立予以計算及跟進收訖。\n2. 所有後加工程保養、施工及驗收標準，均比照並嚴格遵照原合約中載明之各項相關施工保養細項執行。'
                            });
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                        <span className="ml-2.5 text-xs font-bold text-gray-700">{editingQuote.hasVO ? '已啟用' : '未開啟'}</span>
                      </label>
                    </div>

                    {editingQuote.hasVO && (
                      <div className="space-y-5 pt-3 border-t border-amber-200/50 animate-fade-in text-left">
                        {/* 1. VO Items detail input */}
                        <div className="space-y-3">
                          <h5 className="text-xs font-bold text-amber-800 flex items-center gap-1">
                            <span>一、後加工程項目細項輸入</span>
                            <span className="text-2xs text-gray-400 font-normal">（請在下方選擇類別並添加細項，數據結構與主報價單完全一致）</span>
                          </h5>

                          <div className="space-y-4">
                            {getQuotationCategories(editingQuote, categories).map((cat) => {
                              const voItems = (editingQuote.voItems || []).filter(item => item.category === cat);
                              return (
                                <div key={cat} className="bg-white rounded-xl border border-gray-200/80 p-4 space-y-3 shadow-3xs">
                                  <div className="flex justify-between items-center bg-slate-50/80 px-3 py-2 rounded-lg border border-gray-100">
                                    <span className="text-xs font-extrabold text-slate-800">{cat}</span>
                                    {!editingQuote.isLocked ? (
                                      <div className="flex items-center gap-2">
                                        {standardItems[cat] && standardItems[cat].length > 0 && (
                                          <div className="flex gap-1 items-center">
                                            <select 
                                              onChange={(e) => {
                                                const selectIndex = parseInt(e.target.value);
                                                if (!isNaN(selectIndex)) {
                                                  handleAddVOFromLibrary(cat, standardItems[cat][selectIndex]);
                                                  e.target.value = '';
                                                }
                                              }}
                                              className="text-[11px] px-2 bg-white border border-gray-300 rounded-lg cursor-pointer h-7 focus:outline-amber-600"
                                            >
                                              <option value="">從標準庫帶入...</option>
                                              {standardItems[cat].map((si, sidx) => (
                                                <option key={sidx} value={sidx}>{si.name}</option>
                                              ))}
                                            </select>
                                            <button
                                              type="button"
                                              onClick={() => handleAddVOCategoryAllFromLibrary(cat)}
                                              className="px-2 text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold rounded-lg flex items-center gap-0.5 h-7 transition-colors cursor-pointer shrink-0"
                                              title="將此大類的所有追加標準項目一鍵全部帶入"
                                            >
                                              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                                              加入類別全部
                                            </button>
                                          </div>
                                        )}
                                        <button 
                                          type="button"
                                          onClick={() => handleAddVOMember(cat)}
                                          className="px-2.5 text-[11px] bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg flex items-center gap-0.5 h-7 transition-colors cursor-pointer"
                                        >
                                          <Plus className="w-3.5 h-3.5" /> 新增自訂
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-3xs text-gray-400 font-bold select-none">唯讀鎖定中</span>
                                    )}
                                  </div>

                                  {voItems.length === 0 ? (
                                    <p className="text-2xs text-gray-400 italic py-1 pl-1">目前沒有後加【{cat}】項目</p>
                                  ) : (
                                    <div className="space-y-2.5">
                                      {voItems.map((item) => (
                                        <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 bg-slate-50/50 p-3 rounded-lg border border-gray-200 text-sm items-start relative">
                                          <div className="col-span-1 md:col-span-3">
                                            <input 
                                              type="text"
                                              placeholder="後加項目名稱..."
                                              value={item.name}
                                              disabled={editingQuote.isLocked}
                                              onChange={(e) => handleUpdateVOItemField(item.id, 'name', e.target.value)}
                                              className="w-full px-2 py-1.5 border border-gray-200 bg-white rounded text-xs font-semibold text-slate-800 focus:outline-amber-600 disabled:bg-gray-100 disabled:text-gray-500"
                                            />
                                          </div>
                                          <div className="col-span-1 md:col-span-1 text-center">
                                            <input 
                                              type="text"
                                              placeholder="單位"
                                              value={item.unit}
                                              disabled={editingQuote.isLocked}
                                              onChange={(e) => handleUpdateVOItemField(item.id, 'unit', e.target.value)}
                                              className="w-full px-1 py-1.5 border border-gray-200 bg-white rounded text-center text-xs font-semibold text-slate-800 focus:outline-amber-600 disabled:bg-gray-100 disabled:text-gray-500"
                                            />
                                          </div>
                                          <div className="col-span-1 md:col-span-1 text-center">
                                            <input 
                                              type="number"
                                              placeholder="數量"
                                              value={item.quantity === 0 ? '' : item.quantity}
                                              disabled={editingQuote.isLocked}
                                              onChange={(e) => {
                                                const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                                handleUpdateVOItemField(item.id, 'quantity', isNaN(val) ? 0 : val);
                                              }}
                                              className="w-full px-1 py-1.5 border border-gray-200 bg-white rounded text-center font-mono text-xs font-bold text-slate-800 focus:outline-amber-600 disabled:bg-gray-100 disabled:text-gray-400"
                                            />
                                          </div>
                                          <div className="col-span-1 md:col-span-2 text-right">
                                            <div className="relative">
                                              <span className="absolute left-1.5 top-1.5 text-2xs font-bold text-gray-400">HK$</span>
                                              <input 
                                                type="number"
                                                placeholder="單價"
                                                value={item.unitPrice === 0 ? '' : item.unitPrice}
                                                disabled={editingQuote.isLocked}
                                                onChange={(e) => {
                                                  const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                                  handleUpdateVOItemField(item.id, 'unitPrice', isNaN(val) ? 0 : val);
                                                }}
                                                className="w-full pl-6 pr-1 py-1.5 border border-gray-200 bg-white rounded text-right font-mono text-xs font-bold text-amber-700 focus:outline-amber-600 disabled:bg-gray-100 disabled:text-gray-400"
                                              />
                                            </div>
                                          </div>
                                          <div className="col-span-1 md:col-span-4">
                                            <textarea 
                                              placeholder="此細項之備註或特別工藝說明..."
                                              value={item.remark}
                                              rows={1}
                                              disabled={editingQuote.isLocked}
                                              onChange={(e) => handleUpdateVOItemField(item.id, 'remark', e.target.value)}
                                              className="w-full px-2 py-1.5 border border-gray-200 bg-white rounded text-xs text-gray-500 focus:outline-amber-600 resize-y min-h-[32px] disabled:bg-gray-100 disabled:text-gray-500"
                                            />
                                          </div>
                                          <div className="col-span-1 md:col-span-1 flex items-center justify-center pt-1 md:pt-0">
                                            {!editingQuote.isLocked ? (
                                              <button 
                                                type="button"
                                                onClick={() => handleRemoveVOItem(item.id)}
                                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                                                title="刪除後加細項"
                                              >
                                                <Trash2 className="w-4 h-4" />
                                              </button>
                                            ) : (
                                              <span className="text-3xs text-gray-400 font-bold select-none">唯讀</span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* 2. VO Financial subtotal and Discount */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-50/40 p-4 rounded-xl border border-amber-200/50">
                          <div>
                            <span className="text-2xs font-bold text-gray-500 block">後加細項原價總計</span>
                            <span className="font-mono font-black text-slate-800 text-sm">
                              HK${(editingQuote.voItems || []).reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0).toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <label className="text-2xs font-black text-amber-800 block mb-1">後加項目特別折讓 (Discount Amount, HKD)</label>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-400">HK$</span>
                              <input 
                                type="number"
                                placeholder="輸入特別扣減折讓金額..."
                                value={editingQuote.voDiscount === 0 ? '' : editingQuote.voDiscount}
                                disabled={editingQuote.isLocked}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                  setEditingQuote({
                                    ...editingQuote,
                                    voDiscount: isNaN(val) ? 0 : val
                                  });
                                }}
                                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-amber-600 font-mono disabled:bg-gray-100 disabled:text-gray-400"
                              />
                            </div>
                            <span className="text-2xs text-gray-400 mt-1 block">折讓後實際追加淨總額：
                              <span className="font-bold text-emerald-600 font-mono">
                                HK${Math.max(0, ((editingQuote.voItems || []).reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0) - (editingQuote.voDiscount || 0))).toLocaleString()}
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* 3. VO Payment Stages block */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center border-b border-amber-200/60 pb-1.5">
                            <h5 className="text-xs font-bold text-amber-800 flex items-center gap-1">
                              <span>二、後加收款期數與比例調配 (VO Payment Stages)</span>
                            </h5>
                            <button
                              type="button"
                              onClick={() => {
                                const stages = [...(editingQuote.voPaymentStages || [])];
                                const nextIdx = stages.length + 1;
                                const stageName = `後加第${nextIdx}期`;
                                stages.push({
                                  name: stageName,
                                  percent: 0,
                                  remark: ''
                                });
                                setEditingQuote({
                                  ...editingQuote,
                                  voPaymentStages: stages
                                });
                              }}
                              className="flex items-center gap-1 px-2 py-0.5 text-2xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-md transition-colors animate-fade-in"
                            >
                              <Plus className="w-3 h-3" /> 新增後加期數
                            </button>
                          </div>

                          <div className="space-y-2.5">
                            {(editingQuote.voPaymentStages || []).map((stage, idx) => (
                              <div key={idx} className="flex flex-col sm:flex-row gap-3 items-center bg-white p-3 rounded-lg border border-gray-100 shadow-3xs">
                                <div className="w-full sm:w-28 flex items-center gap-1.5">
                                  <span className="text-2xs text-amber-500 font-mono font-bold">#VO-{idx + 1}</span>
                                  <input
                                    type="text"
                                    value={stage.name}
                                    onChange={(e) => {
                                      const stages = [...(editingQuote.voPaymentStages || [])];
                                      stages[idx] = { ...stages[idx], name: e.target.value };
                                      setEditingQuote({ ...editingQuote, voPaymentStages: stages });
                                    }}
                                    className="w-full px-2 py-1 border border-gray-200 rounded text-xs font-bold text-amber-900 bg-amber-50/10 focus:outline-amber-600"
                                    placeholder="期數名稱"
                                  />
                                </div>
                                <div className="w-full sm:w-32 flex items-center gap-1">
                                  <span className="text-2xs text-gray-400 whitespace-nowrap">比例</span>
                                  <div className="relative w-full">
                                    <input
                                      type="number"
                                      value={stage.percent === 0 ? '' : stage.percent}
                                      onChange={(e) => {
                                        const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                        const stages = [...(editingQuote.voPaymentStages || [])];
                                        stages[idx] = { ...stages[idx], percent: isNaN(val) ? 0 : val };
                                        setEditingQuote({ ...editingQuote, voPaymentStages: stages });
                                      }}
                                      className="w-full pl-2 pr-5 py-1 border border-gray-200 rounded font-mono text-xs font-bold text-slate-800 text-center focus:outline-amber-600"
                                      placeholder="0"
                                    />
                                    <span className="absolute right-1.5 top-1 text-xs text-gray-400 font-bold">%</span>
                                  </div>
                                </div>
                                <div className="w-full sm:w-44 flex items-center gap-2">
                                  <span className="text-2xs text-gray-400 whitespace-nowrap">試算金額</span>
                                  <span className="font-mono text-xs font-black text-amber-600 bg-amber-50/30 px-2 py-1 rounded">
                                    HK${Math.round(Math.max(0, ((editingQuote.voItems || []).reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0) - (editingQuote.voDiscount || 0))) * (stage.percent / 100)).toLocaleString()}
                                  </span>
                                </div>
                                <div className="w-full sm:flex-1">
                                  <input
                                    type="text"
                                    value={stage.remark}
                                    onChange={(e) => {
                                      const stages = [...(editingQuote.voPaymentStages || [])];
                                      stages[idx] = { ...stages[idx], remark: e.target.value };
                                      setEditingQuote({ ...editingQuote, voPaymentStages: stages });
                                    }}
                                    className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-gray-500 focus:outline-amber-600"
                                    placeholder="此期工程收款進度備註 (例如：後加瓷磚鋪設完成)"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const stages = (editingQuote.voPaymentStages || []).filter((_, sIdx) => sIdx !== idx);
                                    setEditingQuote({ ...editingQuote, voPaymentStages: stages });
                                  }}
                                  className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 cursor-pointer"
                                  title="刪除此後加期數"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>

                          <div className="flex flex-col sm:flex-row justify-between items-center bg-amber-50/20 p-2 px-3 rounded-lg border border-amber-200/30 text-2xs font-bold">
                            <span className="text-slate-500">
                              後加比例累計：
                              <span className={`text-[13px] font-black font-mono ${
                                (editingQuote.voPaymentStages || []).reduce((sum, s) => sum + s.percent, 0) === 100
                                  ? 'text-emerald-600'
                                  : 'text-rose-500'
                              }`}>
                                {(editingQuote.voPaymentStages || []).reduce((sum, s) => sum + s.percent, 0)}%
                              </span>
                              <span className="font-normal text-gray-400"> (必須剛好等於 100%)</span>
                            </span>
                            {(editingQuote.voPaymentStages || []).reduce((sum, s) => sum + s.percent, 0) !== 100 && (
                              <span className="text-rose-500 text-right">⚠️ 後加比例總和不等於 100%，請調整各期比例。</span>
                            )}
                          </div>
                        </div>

                        {/* 4. VO Remarks/Terms block */}
                        <div className="space-y-2">
                          <h5 className="text-xs font-bold text-amber-800">三、後加合約附屬條款 (VO Terms)</h5>
                          <textarea 
                            value={editingQuote.voRemarks}
                            rows={3}
                            onChange={(e) => setEditingQuote({ ...editingQuote, voRemarks: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 bg-white rounded-lg text-xs text-gray-600 focus:outline-amber-600 font-medium leading-relaxed"
                            placeholder="請輸入後加合約專屬條款..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  )}

                  <div className="h-4"></div>

                  <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                    <h4 className="text-gray-700 font-bold border-l-4 border-slate-900 pl-2 text-xs flex items-center gap-2">
                      <Coins className="w-4 h-4 text-amber-500" />
                      工程款期數與比率調配 (Payment Stages & Rates)
                    </h4>
                    {!editingQuote.isLocked && (
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
                    )}
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
                            disabled={editingQuote.isLocked}
                            onChange={(e) => {
                              const stages = [...getPaymentStages(editingQuote)];
                              stages[idx] = { ...stages[idx], name: e.target.value };
                              setEditingQuote({ ...editingQuote, paymentStages: stages });
                            }}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs font-semibold text-gray-700 disabled:bg-gray-100 disabled:text-gray-500"
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
                            disabled={editingQuote.isLocked}
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
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs font-mono text-center font-bold text-slate-800 disabled:bg-gray-100 disabled:text-gray-400"
                            placeholder="0"
                          />
                          <span className="text-xs text-gray-400 font-mono font-bold">%</span>
                        </div>

                        {/* Fast dropdown */}
                        {!editingQuote.isLocked && (
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
                        )}

                        {/* Remark input */}
                        <div className="flex-1 w-full">
                          <input
                            type="text"
                            value={stage.remark}
                            disabled={editingQuote.isLocked}
                            onChange={(e) => {
                              const stages = [...getPaymentStages(editingQuote)];
                              stages[idx] = { ...stages[idx], remark: e.target.value };
                              setEditingQuote({ ...editingQuote, paymentStages: stages });
                            }}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs text-gray-700 disabled:bg-gray-100 disabled:text-gray-500"
                            placeholder="輸入備註款項內容..."
                          />
                        </div>

                        {/* Action - Delete stage */}
                        {!editingQuote.isLocked ? (
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
                        ) : (
                          <div className="text-3xs text-gray-400 font-bold select-none px-2">唯讀</div>
                        )}
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-600">本報價合約特別專約規定 T&C (載於頁尾)</label>
                    <span className="text-[10px] text-gray-400 font-bold">選取文字後點擊工具列可快速排版</span>
                  </div>
                  
                  {/* Formatting Toolbar */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-1 bg-slate-50 border border-gray-200 p-1.5 rounded-t-lg">
                    <button
                      type="button"
                      onClick={() => insertFormatting(
                        'edit-quote-remarks-textarea',
                        '**',
                        '**',
                        editingQuote.remarks || '',
                        (val) => setEditingQuote({ ...editingQuote, remarks: val })
                      )}
                      className="px-2 py-1 text-2xs font-bold bg-white border border-gray-300 rounded hover:bg-slate-100 flex items-center gap-1 cursor-pointer transition-all active:scale-95 text-slate-800"
                      title="加粗文字 Bold"
                    >
                      <span className="font-extrabold text-[11px]">B</span>
                      <span>粗體</span>
                    </button>
                    
                    <div className="h-4 w-px bg-gray-300 mx-1"></div>
                    
                    <span className="text-[10px] text-gray-400 font-bold ml-1 mr-0.5">顏色:</span>
                    {[
                      { label: '紅', tag: 'red', color: '#e11d48' },
                      { label: '藍', tag: 'blue', color: '#2563eb' },
                      { label: '綠', tag: 'green', color: '#059669' },
                      { label: '金', tag: 'amber', color: '#d97706' },
                      { label: '橘', tag: 'orange', color: '#ea580c' },
                      { label: '紫', tag: 'purple', color: '#7c3aed' },
                    ].map((c) => (
                      <button
                        key={c.tag}
                        type="button"
                        onClick={() => insertFormatting(
                          'edit-quote-remarks-textarea',
                          `[${c.tag}]`,
                          `[/${c.tag}]`,
                          editingQuote.remarks || '',
                          (val) => setEditingQuote({ ...editingQuote, remarks: val })
                        )}
                        className="px-2 py-1 text-3xs font-extrabold bg-white border border-gray-200 rounded hover:bg-slate-50 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                        style={{ color: c.color }}
                        title={`${c.label}色文字`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color }}></span>
                        {c.label}
                      </button>
                    ))}

                    {/* Custom hex color picker */}
                    <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 border border-gray-200 rounded ml-auto">
                      <span className="text-[9px] text-gray-400 font-bold">自訂色:</span>
                      <input 
                        type="color"
                        defaultValue="#000000"
                        onChange={(e) => {
                          const hex = e.target.value;
                          insertFormatting(
                            'edit-quote-remarks-textarea',
                            `[color=${hex}]`,
                            `[/color]`,
                            editingQuote.remarks || '',
                            (val) => setEditingQuote({ ...editingQuote, remarks: val })
                          );
                        }}
                        className="w-4 h-4 p-0 border-0 cursor-pointer rounded overflow-hidden"
                        title="選擇自訂顏色"
                      />
                    </div>
                  </div>

                  <textarea 
                    id="edit-quote-remarks-textarea"
                    rows={4}
                    value={editingQuote.remarks}
                    onChange={(e) => setEditingQuote({...editingQuote, remarks: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-b-lg border-t-0 text-xs leading-relaxed font-sans focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500"
                    placeholder="請輸入付款方式、工程保固及材料規範之合約聲明..."
                  />

                  {/* Real-time formatted preview */}
                  <div className="mt-1.5 p-2 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                    <span className="text-[10px] font-bold text-gray-400 block mb-1">合約中預覽 (Live Preview)：</span>
                    <div className="text-[10.5px] leading-tight space-y-0.5 text-slate-700 bg-white p-2.5 border border-slate-150 rounded-md max-h-32 overflow-y-auto">
                      {(editingQuote.remarks || settings.defaultTerms || '').split('\n').map((line, idx) => (
                        <div key={idx} className="text-left">
                          {parseFormattedText(line)}
                        </div>
                      ))}
                    </div>
                  </div>
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
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Schedule steps table */}
                      <div className="mt-4 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200">
                              <th className="p-2 border-r border-slate-200 dark:border-slate-800 text-center w-[10%]">序號</th>
                              <th className="p-2 border-r border-slate-200 dark:border-slate-800 pl-3 w-[40%]">施工作業步驟名稱</th>
                              <th className="p-2 border-r border-slate-200 dark:border-slate-800 text-center w-[15%]">工作天數 (Days)</th>
                              <th className="p-2 border-r border-slate-200 dark:border-slate-800 pl-3 w-[20%]">預估期程</th>
                              <th className="p-2 text-center w-[15%]">操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(editingQuote.scheduleSteps || DEFAULT_SCHEDULE_STEPS).map((step, sIdx, arr) => (
                              <tr key={sIdx} className="border-b border-slate-150 dark:border-slate-800 last:border-b-0 hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                                <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-center font-mono font-bold text-gray-400">#{sIdx + 1}</td>
                                <td className="p-2 border-r border-slate-200 dark:border-slate-800 pl-3">
                                  <input 
                                    type="text"
                                    value={step.name}
                                    onChange={(e) => {
                                      const currentSteps = editingQuote.scheduleSteps && editingQuote.scheduleSteps.length > 0 
                                        ? editingQuote.scheduleSteps 
                                        : DEFAULT_SCHEDULE_STEPS;
                                      const updatedSteps = [...currentSteps];
                                      updatedSteps[sIdx] = { ...updatedSteps[sIdx], name: e.target.value };
                                      const recalculated = calculateScheduleAndAssign(editingQuote.scheduleStartDate || '', updatedSteps);
                                      setEditingQuote({
                                        ...editingQuote,
                                        scheduleSteps: recalculated
                                      });
                                    }}
                                    className="w-full px-2 py-1 border border-gray-250 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white rounded text-xs text-slate-800 font-semibold focus:outline-amber-600"
                                  />
                                </td>
                                <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-center">
                                  <input 
                                    type="number"
                                    min="0"
                                    value={step.days}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value) || 0;
                                      const currentSteps = editingQuote.scheduleSteps && editingQuote.scheduleSteps.length > 0 
                                        ? editingQuote.scheduleSteps 
                                        : DEFAULT_SCHEDULE_STEPS;
                                      const updatedSteps = [...currentSteps];
                                      updatedSteps[sIdx] = { ...updatedSteps[sIdx], days: val };
                                      const recalculated = calculateScheduleAndAssign(editingQuote.scheduleStartDate || '', updatedSteps);
                                      setEditingQuote({
                                        ...editingQuote,
                                        scheduleSteps: recalculated
                                      });
                                    }}
                                    className="w-16 px-1.5 py-1 border border-gray-250 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white rounded text-center font-mono text-xs font-bold focus:outline-amber-600"
                                  />
                                </td>
                                <td className="p-2 border-r border-slate-200 dark:border-slate-800 pl-3 text-2xs text-gray-500 font-mono">
                                  {step.startDate ? `${step.startDate.substring(5)} 至 ${step.endDate?.substring(5)}` : '未排程'}
                                </td>
                                <td className="p-2 text-center flex items-center justify-center gap-1.5 min-h-[38px]">
                                  <button
                                    type="button"
                                    disabled={sIdx === 0}
                                    onClick={() => {
                                      const currentSteps = editingQuote.scheduleSteps && editingQuote.scheduleSteps.length > 0 
                                        ? editingQuote.scheduleSteps 
                                        : DEFAULT_SCHEDULE_STEPS;
                                      if (sIdx > 0) {
                                        const updatedSteps = [...currentSteps];
                                        const temp = updatedSteps[sIdx];
                                        updatedSteps[sIdx] = updatedSteps[sIdx - 1];
                                        updatedSteps[sIdx - 1] = temp;
                                        const recalculated = calculateScheduleAndAssign(editingQuote.scheduleStartDate || '', updatedSteps);
                                        setEditingQuote({
                                          ...editingQuote,
                                          scheduleSteps: recalculated
                                        });
                                      }
                                    }}
                                    className={`p-1 rounded transition-all cursor-pointer ${sIdx === 0 ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                    title="上移"
                                  >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={sIdx === arr.length - 1}
                                    onClick={() => {
                                      const currentSteps = editingQuote.scheduleSteps && editingQuote.scheduleSteps.length > 0 
                                        ? editingQuote.scheduleSteps 
                                        : DEFAULT_SCHEDULE_STEPS;
                                      if (sIdx < currentSteps.length - 1) {
                                        const updatedSteps = [...currentSteps];
                                        const temp = updatedSteps[sIdx];
                                        updatedSteps[sIdx] = updatedSteps[sIdx + 1];
                                        updatedSteps[sIdx + 1] = temp;
                                        const recalculated = calculateScheduleAndAssign(editingQuote.scheduleStartDate || '', updatedSteps);
                                        setEditingQuote({
                                          ...editingQuote,
                                          scheduleSteps: recalculated
                                        });
                                      }
                                    }}
                                    className={`p-1 rounded transition-all cursor-pointer ${sIdx === arr.length - 1 ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                    title="下移"
                                  >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="w-px h-3 bg-slate-200 dark:bg-slate-800 self-center"></span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentSteps = editingQuote.scheduleSteps && editingQuote.scheduleSteps.length > 0 
                                        ? editingQuote.scheduleSteps 
                                        : DEFAULT_SCHEDULE_STEPS;
                                      const updatedSteps = currentSteps.filter((_, idx) => idx !== sIdx);
                                      const recalculated = calculateScheduleAndAssign(editingQuote.scheduleStartDate || '', updatedSteps);
                                      setEditingQuote({
                                        ...editingQuote,
                                        scheduleSteps: recalculated
                                      });
                                    }}
                                    className="p-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition-all cursor-pointer inline-flex items-center justify-center"
                                    title="刪除此步驟"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-start">
                        <button
                          type="button"
                          onClick={() => {
                            const currentSteps = editingQuote.scheduleSteps && editingQuote.scheduleSteps.length > 0 
                              ? editingQuote.scheduleSteps 
                              : DEFAULT_SCHEDULE_STEPS;
                            const updatedSteps = [...currentSteps, { name: '新施工步驟', days: 1 }];
                            const recalculated = calculateScheduleAndAssign(editingQuote.scheduleStartDate || '', updatedSteps);
                            setEditingQuote({
                              ...editingQuote,
                              scheduleSteps: recalculated
                            });
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-200 text-slate-700 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-bold transition-all shadow-3xs flex items-center gap-1.5 cursor-pointer hover:shadow-2xs active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                          <span>新增自訂施工步驟</span>
                        </button>
                      </div>

                      {/* Interactive Gantt Calendar Preview */}
                      <div className="mt-4 p-3 bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl">
                        <span className="text-2xs font-bold text-gray-400 block mb-2">日曆可視化預覽 (Interactive Calendar Map):</span>
                        <HorizonScheduleCalendar 
                          steps={editingQuote.scheduleSteps || []} 
                          quote={editingQuote} 
                          onChange={(updated) => setEditingQuote(updated)} 
                          isEditable={true} 
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* --- VARIATION ORDER (VO) EDITOR VIEW --- */
            <>
                  {(() => {
                    const migrated = migrateQuotation(editingQuote);
                    const activeVO = migrated.variationOrders?.find(v => v.id === editingActiveTab) || migrated.variationOrders?.[0] || {
                      id: 'vo-1',
                      title: '後加工程 1',
                      items: [],
                      paymentStages: [],
                      remarks: '',
                      discount: 0
                    };
                    const voTotal = (activeVO.items || []).reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
                    const netVOTotal = Math.max(0, voTotal - (activeVO.discount || 0));
                    
                    return (
                      <>
                        {/* VO Items detail input */}
                        <div className="p-6 space-y-6">
                          <div className="bg-amber-50/45 border border-amber-200 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-amber-500 rounded-xl text-white mt-0.5 shadow-sm">
                                <Sparkles className="w-5 h-5 text-white animate-pulse" />
                              </div>
                              <div className="text-left">
                                <h4 className="text-sm font-extrabold text-amber-900">後加工程項目 (Variation Order / VO) 獨立管理</h4>
                                <p className="text-[11px] text-amber-850/80 mt-1 leading-relaxed">
                                  此功能用於編制獨立的追加施工項目。所有項目金額獨立核算與列印，不影響原本合約的主體總額與付款期數。
                                </p>
                              </div>
                            </div>
                            {/* Rename VO Title input */}
                            <div className="flex items-center gap-2 border border-amber-200 bg-white p-2 rounded-xl shadow-3xs w-full md:w-auto">
                              <span className="text-xs text-amber-800 font-extrabold whitespace-nowrap">後加工程報價單名稱:</span>
                              <input
                                type="text"
                                value={activeVO.title}
                                disabled={editingQuote.isLocked}
                                onChange={(e) => {
                                  const newTitle = e.target.value;
                                  updateActiveVO(vo => ({
                                    ...vo,
                                    title: newTitle || '未命名後加'
                                  }));
                                }}
                                className="px-2.5 py-1 text-xs font-bold text-amber-950 bg-amber-50/50 border border-amber-250 rounded-lg focus:outline-amber-600 focus:bg-white w-full sm:w-48 disabled:opacity-75 disabled:cursor-not-allowed"
                                placeholder="例如: 廚房追加水電"
                              />
                            </div>
                          </div>

                          <div className="space-y-3.5 text-left">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200 pb-1.5">
                              <h5 className="text-xs font-bold text-amber-800 flex items-center gap-1.5 border-l-4 border-amber-500 pl-2">
                                <span>一、後加工程施工項目詳情 ({activeVO.title})：</span>
                              </h5>
                            </div>

                            {(() => {
                              const visibleCats = getQuotationCategories(editingQuote, categories);
                              if (visibleCats.length === 0) {
                                return (
                                  <div className="text-center py-10 border border-dashed border-amber-200 rounded-2xl bg-amber-50/10">
                                    <p className="text-sm font-bold text-amber-800">目前尚無顯示任何工程分類</p>
                                    <p className="text-xs text-amber-700 mt-1">請使用下方的「增加施工大類」選擇並加入分類，例如：打拆工程、水泥工程等。</p>
                                  </div>
                                );
                              }
                              return null;
                            })()}
 
                             <div className="space-y-4">
                               {getQuotationCategories(editingQuote, categories).map((cat) => {
                                 const items = (activeVO.items || []).filter(item => item.category === cat);
                                 const catSubtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
                                 return (
                                   <div key={cat} className="border border-amber-100 rounded-xl bg-amber-50/10 py-2.5 px-4 space-y-2 text-left">
                                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200 pb-1.5">
                                       <div className="flex items-center gap-2.5 w-full sm:w-auto">
                                         {editingCategoryName?.oldName === cat ? (
                                           <div className="flex items-center gap-1.5">
                                             <input
                                               type="text"
                                               value={editingCategoryName.value}
                                               onChange={(e) => setEditingCategoryName({ ...editingCategoryName, value: e.target.value })}
                                               onKeyDown={(e) => {
                                                 if (e.key === 'Enter') {
                                                   handleRenameCategory(cat, editingCategoryName.value);
                                                   setEditingCategoryName(null);
                                                 } else if (e.key === 'Escape') {
                                                   setEditingCategoryName(null);
                                                 }
                                               }}
                                               className="px-2 py-0.5 text-xs font-bold border border-slate-300 rounded focus:outline-none bg-white max-w-[150px]"
                                               autoFocus
                                             />
                                             <button
                                               type="button"
                                               onClick={() => {
                                                 handleRenameCategory(cat, editingCategoryName.value);
                                                 setEditingCategoryName(null);
                                               }}
                                               className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer transition-colors"
                                               title="儲存"
                                             >
                                               <Check className="w-3.5 h-3.5" />
                                             </button>
                                             <button
                                               type="button"
                                               onClick={() => setEditingCategoryName(null)}
                                               className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                                               title="取消"
                                             >
                                               <X className="w-3.5 h-3.5" />
                                             </button>
                                           </div>
                                         ) : (
                                           <div className="flex items-center gap-1.5">
                                             <span className="font-extrabold text-amber-900 text-sm">{cat}</span>
                                             {!editingQuote.isLocked && (
                                               <button
                                                 type="button"
                                                 onClick={() => setEditingCategoryName({ oldName: cat, value: cat })}
                                                 className="p-1 text-amber-700 hover:text-amber-955 hover:bg-amber-100/50 rounded-full transition-colors cursor-pointer"
                                                 title="重命名此大類"
                                               >
                                                 <Edit className="w-3 h-3" />
                                               </button>
                                             )}
                                           </div>
                                         )}
                                         {items.length > 0 && (
                                           <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[11px] font-bold font-mono">
                                             後加小計: HK${catSubtotal.toLocaleString()}
                                           </span>
                                         )}
                                       </div>
                                       
                                       {/* Selector/Adder shortcut from standard library items */}
                                       <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                                         {!editingQuote.isLocked && (
                                           <>
                                             {(() => {
                                               const sItems = getStandardItemsForCategory(cat);
                                               if (sItems.length === 0) return null;
                                               return (
                                                 <div className="flex gap-1 items-center">
                                                   <select 
                                                     onChange={(e) => {
                                                       const selectIndex = parseInt(e.target.value);
                                                       if (!isNaN(selectIndex)) {
                                                         handleAddVOFromLibrary(cat, sItems[selectIndex]);
                                                         e.target.value = ''; // reset selection
                                                       }
                                                     }}
                                                     className="text-[12px] px-2 bg-white border border-amber-200 rounded-lg cursor-pointer max-w-[130px] h-7 focus:outline-amber-600"
                                                   >
                                                     <option value="">請選擇標準項目...</option>
                                                     {sItems.map((si, sidx) => (
                                                       <option key={sidx} value={sidx}>{si.name}</option>
                                                     ))}
                                                   </select>
                                                 </div>
                                               );
                                             })()}
                                             <button 
                                               type="button"
                                               onClick={() => handleAddVOMember(cat)}
                                               className="px-2.5 text-[12px] bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg flex items-center gap-0.5 h-7 transition-colors cursor-pointer"
                                             >
                                               <Plus className="w-3.5 h-3.5" /> 自訂新項
                                             </button>
                                             {items.length === 0 && (
                                               <button
                                                 type="button"
                                                 onClick={() => handleRemoveVisibleCategory(cat)}
                                                 className="px-2 text-[12px] text-gray-500 hover:text-rose-600 bg-white hover:bg-rose-50 border border-gray-200 hover:border-rose-200 rounded-lg h-7 transition-colors flex items-center gap-0.5 cursor-pointer"
                                                 title="隱藏此大類"
                                               >
                                                 <X className="w-3 h-3 text-gray-400" /> 隱藏
                                               </button>
                                             )}
                                           </>
                                         )}
                                        {editingQuote.isLocked && (
                                          <span className="text-2xs text-slate-400 font-bold flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                                            <Lock className="w-3 h-3 text-slate-400" />
                                            唯讀模式
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {items.length === 0 ? (
                                      <p className="text-2xs text-gray-400 italic text-center py-2">目前沒有【{cat}】大類的追加細項，請點選上方按鈕創建或從標準庫帶入</p>
                                    ) : (
                                      <div className="space-y-2">
                                        <div className="hidden md:grid grid-cols-12 gap-2 text-2xs font-bold text-gray-500 pl-9 pr-3 select-none text-left">
                                          <span className="col-span-3">後加項目工程描述</span>
                                          <span className="col-span-1 text-center">單位</span>
                                          <span className="col-span-1 text-center">數量</span>
                                          <span className="col-span-1 text-right">單價(HKD)</span>
                                          <span className="col-span-5">詳細備註說明</span>
                                          <span className="col-span-1 text-center">操作</span>
                                        </div>

                                        {items.map((item) => (
                                          <div 
                                            key={item.id} 
                                            draggable={!editingQuote.isLocked}
                                            onDragStart={(e) => handleItemDragStart(e, item.id, 'vo')}
                                            onDragOver={(e) => handleItemDragOver(e, item.id, 'vo')}
                                            onDrop={(e) => handleItemDrop(e, item.id, 'vo')}
                                            onDragEnd={handleItemDragEnd}
                                            className={`grid grid-cols-1 md:grid-cols-12 gap-2 bg-white py-1.5 px-3 ${
                                              editingQuote.isLocked ? 'pl-3 md:pl-4' : 'pl-8 md:pl-9'
                                            } rounded-lg border text-sm items-start relative shadow-2xs transition-all ${
                                              draggedItemId === item.id 
                                                ? 'opacity-45 border-amber-400 bg-amber-50/10 scale-[0.98]' 
                                                : 'border-gray-200 hover:border-slate-350 hover:bg-slate-50/20'
                                            }`}
                                          >
                                            {/* Drag Handle */}
                                            {!editingQuote.isLocked && (
                                              <div 
                                                className="absolute left-2 top-[18px] md:top-1/2 md:-translate-y-1/2 cursor-grab active:cursor-grabbing text-gray-300 hover:text-amber-600 flex items-center justify-center p-1 rounded hover:bg-slate-100 transition-colors"
                                                title="按住拖曳調整順序"
                                              >
                                                <GripVertical className="w-4 h-4 shrink-0" />
                                              </div>
                                            )}

                                            {/* Item Description */}
                                            <div className="col-span-1 md:col-span-3">
                                              <input 
                                                type="text"
                                                placeholder="後加工程項目名稱..."
                                                value={item.name}
                                                disabled={editingQuote.isLocked}
                                                onChange={(e) => handleUpdateVOItemField(item.id, 'name', e.target.value)}
                                                className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs text-slate-800 font-semibold focus:outline-amber-600 disabled:bg-slate-50 disabled:text-gray-500"
                                              />
                                            </div>

                                            {/* Unit */}
                                            <div className="col-span-1 md:col-span-1 text-center">
                                              <input 
                                                type="text"
                                                placeholder="項目"
                                                value={item.unit}
                                                disabled={editingQuote.isLocked}
                                                onChange={(e) => handleUpdateVOItemField(item.id, 'unit', e.target.value)}
                                                className="w-full px-1 py-1.5 border border-gray-200 rounded text-center text-xs focus:outline-amber-600 disabled:bg-slate-50 disabled:text-gray-500"
                                              />
                                            </div>

                                            {/* Quantity */}
                                            <div className="col-span-1 md:col-span-1">
                                              <input 
                                                type="number"
                                                value={item.quantity === 0 ? '' : item.quantity}
                                                disabled={editingQuote.isLocked}
                                                onChange={(e) => handleUpdateVOItemField(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                                className="w-full px-1 py-1.5 border border-gray-200 rounded text-center text-xs font-mono focus:outline-amber-600 disabled:bg-slate-50 disabled:text-gray-500"
                                              />
                                            </div>

                                            {/* Unit Price */}
                                            <div className="col-span-1 md:col-span-1">
                                              <input 
                                                type="number"
                                                value={item.unitPrice === 0 ? '' : item.unitPrice}
                                                disabled={editingQuote.isLocked}
                                                onChange={(e) => handleUpdateVOItemField(item.id, 'unitPrice', Math.max(0, parseInt(e.target.value) || 0))}
                                                className="w-full px-2 py-1.5 border border-gray-200 rounded text-right text-xs font-mono text-amber-700 focus:outline-amber-600 disabled:bg-slate-50 disabled:text-gray-450"
                                              />
                                            </div>

                                            {/* Remark */}
                                            <div className="col-span-1 md:col-span-5">
                                              <textarea 
                                                placeholder="非必填：備註規格或施工備別..."
                                                rows={Math.max(1, item.remark ? item.remark.split('\n').length : 1)}
                                                value={item.remark}
                                                disabled={editingQuote.isLocked}
                                                onChange={(e) => handleUpdateVOItemField(item.id, 'remark', e.target.value)}
                                                className="w-full px-2 py-1.5 border border-gray-250 rounded text-[11px] text-gray-650 focus:outline-amber-600 focus:ring-1 focus:ring-amber-500/20 bg-white transition-all resize-y min-h-[30px] leading-relaxed font-sans disabled:bg-slate-50 disabled:text-gray-550"
                                              />
                                            </div>

                                            {/* Action Remove & Sorting */}
                                            <div className="col-span-1 md:col-span-1 flex justify-center items-center gap-1 select-none">
                                              {editingQuote.isLocked ? (
                                                <span className="p-1.5 text-slate-400 bg-slate-50 border border-slate-100 rounded-md" title="合約已鎖定，無法修改此項目">
                                                  <Lock className="w-3.5 h-3.5" />
                                                </span>
                                              ) : (
                                                <>
                                                  <button 
                                                    type="button"
                                                    onClick={() => handleMoveVOItem(item.id, 'up')}
                                                    className="p-1 hover:text-amber-600 hover:bg-amber-50 text-gray-400 border border-gray-100 rounded transition-colors"
                                                    title="往上爬升一格"
                                                  >
                                                    <ChevronUp className="w-3.5 h-3.5" />
                                                  </button>
                                                  <button 
                                                    type="button"
                                                    onClick={() => handleMoveVOItem(item.id, 'down')}
                                                    className="p-1 hover:text-amber-600 hover:bg-amber-50 text-gray-400 border border-gray-100 rounded transition-colors"
                                                    title="往下沉降一格"
                                                  >
                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                  </button>
                                                  <button 
                                                    type="button"
                                                    onClick={() => handleRemoveVOItem(item.id)}
                                                    className="p-1.5 hover:bg-rose-50 text-rose-500 rounded hover:scale-110 transition-transform ml-0.5"
                                                    title="移除此項"
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        ))}

                                        {/* Category Subtotal Footer Row */}
                                        <div className="flex justify-end items-center gap-2 border-t border-gray-200/80 pt-1.5 mt-1 px-2">
                                          <span className="text-xs text-gray-500 font-bold">【{cat}】後加小計 (Subtotal):</span>
                                          <span className="text-sm font-black text-amber-600 font-mono">
                                            HK${catSubtotal.toLocaleString()}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              {/* Bottom Category Selector/Adder UI for VO */}
                              {!editingQuote.isLocked && (
                                <div className="flex justify-center pt-4 border-t border-amber-100">
                                  <div className="flex items-center gap-2 bg-amber-50/20 border border-amber-150 px-4 py-2.5 rounded-xl shadow-2xs">
                                    <span className="text-xs font-extrabold text-amber-700">➕ 增加施工大類：</span>
                                    <select
                                      value=""
                                      onChange={(e) => {
                                        const cat = e.target.value;
                                        if (cat) {
                                          handleAddVisibleCategory(cat);
                                          e.target.value = ''; // reset selection
                                        }
                                      }}
                                      className="text-xs px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg cursor-pointer font-semibold text-amber-900 focus:outline-amber-600 shadow-3xs"
                                    >
                                      <option value="" disabled>-- 請選擇分類 --</option>
                                      {categories.map((cat) => (
                                        <option key={cat} value={cat}>
                                          {cat}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Calculations & Remarks for VO */}
                        <div className="p-6 bg-amber-50/15 border-t border-amber-200/40 grid grid-cols-1 lg:grid-cols-2 gap-6 leading-relaxed">
                          
                          {/* Left Column: Special Discount & Terms */}
                          <div className="space-y-4 col-span-1">
                            {/* --- VO SPECIAL DISCOUNT --- */}
                            <div className="border border-amber-200 rounded-xl bg-white p-5 space-y-3 text-left shadow-2xs">
                              <label className="text-xs font-black text-amber-800 block mb-1">
                                設定追加項目特別扣減折讓 (Discount Amount, HKD)
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-400">HK$</span>
                                <input 
                                  type="number"
                                  placeholder="輸入特別扣減折讓金額..."
                                  value={activeVO.discount === 0 ? '' : activeVO.discount}
                                  disabled={editingQuote.isLocked}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                    updateActiveVO(vo => ({
                                      ...vo,
                                      discount: isNaN(val) ? 0 : val
                                    }));
                                  }}
                                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-amber-600 font-mono disabled:bg-gray-100 disabled:text-gray-400"
                                />
                              </div>
                              <span className="text-2xs text-gray-400 mt-1 block font-semibold">
                                折讓後實際追加淨總額：
                                <span className="font-extrabold text-emerald-600 font-mono ml-1">
                                  HK${netVOTotal.toLocaleString()}
                                </span>
                              </span>
                            </div>

                            {/* --- VO TERMS AND REMARKS --- */}
                            <div className="border border-amber-200 rounded-xl bg-white p-5 space-y-3 text-left shadow-2xs">
                              <label className="text-xs font-black text-amber-800 block mb-1">
                                後加合約附屬條款 (VO Terms)
                              </label>
                              <textarea 
                                value={activeVO.remarks || ''}
                                rows={6}
                                disabled={editingQuote.isLocked}
                                onChange={(e) => {
                                  updateActiveVO(vo => ({
                                    ...vo,
                                    remarks: e.target.value
                                  }));
                                }}
                                className="w-full px-3 py-2 border border-amber-100 bg-white rounded-lg text-xs text-gray-650 focus:outline-amber-600 font-medium leading-relaxed disabled:bg-gray-100 disabled:text-gray-500"
                                placeholder="請輸入後加工程合約專屬附屬條款..."
                              />
                            </div>
                          </div>

                          {/* Right Column: Payment Stages and Financial Summary */}
                          <div className="space-y-4 col-span-1">
                            {/* --- VO PAYMENT STAGES --- */}
                            <div className="border border-amber-200 rounded-xl bg-white p-5 space-y-3 text-left shadow-2xs">
                              <div className="flex justify-between items-center border-b border-amber-100 pb-2">
                                <label className="text-xs font-black text-amber-800 block">
                                  二、後加收款期數與比例調配 (VO Payment Stages)
                                </label>
                                {!editingQuote.isLocked && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateActiveVO(vo => {
                                        const stages = [...(vo.paymentStages || [])];
                                        const nextIdx = stages.length + 1;
                                        stages.push({
                                          name: `後加第${nextIdx}期`,
                                          percent: 0,
                                          remark: ''
                                        });
                                        return { ...vo, paymentStages: stages };
                                      });
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 text-3xs font-extrabold text-white bg-amber-500 hover:bg-amber-600 rounded-md transition-colors cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" /> 新增收款期數
                                  </button>
                                )}
                              </div>

                              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                                {(activeVO.paymentStages || []).length === 0 ? (
                                  <p className="text-2xs text-gray-400 italic text-center py-2">尚未設定期數。點選上方按鈕新增期數。</p>
                                ) : (
                                  (activeVO.paymentStages || []).map((stage, idx) => (
                                    <div key={idx} className="space-y-2 p-2.5 bg-amber-50/20 border border-amber-100 rounded-lg text-xs">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-amber-500 font-mono font-bold">#VO-{idx + 1}</span>
                                        <input
                                          type="text"
                                          value={stage.name}
                                          disabled={editingQuote.isLocked}
                                          onChange={(e) => {
                                            const newVal = e.target.value;
                                            updateActiveVO(vo => {
                                              const stages = [...(vo.paymentStages || [])];
                                              stages[idx] = { ...stages[idx], name: newVal };
                                              return { ...vo, paymentStages: stages };
                                            });
                                          }}
                                          className="flex-1 px-2 py-0.5 border border-gray-200 rounded text-2xs font-bold text-amber-900 focus:outline-amber-600 bg-white disabled:bg-slate-50 disabled:text-gray-500"
                                          placeholder="期數名稱"
                                        />
                                        <div className="relative w-16">
                                          <input
                                            type="number"
                                            value={stage.percent === 0 ? '' : stage.percent}
                                            disabled={editingQuote.isLocked}
                                            onChange={(e) => {
                                              const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                              updateActiveVO(vo => {
                                                const stages = [...(vo.paymentStages || [])];
                                                stages[idx] = { ...stages[idx], percent: isNaN(val) ? 0 : val };
                                                return { ...vo, paymentStages: stages };
                                              });
                                            }}
                                            className="w-full pl-1.5 pr-4 py-0.5 border border-gray-200 rounded font-mono text-2xs font-bold text-slate-800 text-center focus:outline-amber-600 bg-white disabled:bg-slate-50 disabled:text-gray-500"
                                            placeholder="0"
                                          />
                                          <span className="absolute right-1 top-0.5 text-[10px] text-gray-400 font-bold">%</span>
                                        </div>
                                        {!editingQuote.isLocked && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              updateActiveVO(vo => {
                                                const stages = (vo.paymentStages || []).filter((_, sIdx) => sIdx !== idx);
                                                return { ...vo, paymentStages: stages };
                                              });
                                            }}
                                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                                            title="刪除此期"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                      <div className="flex gap-2 items-center">
                                        <input
                                          type="text"
                                          value={stage.remark}
                                          disabled={editingQuote.isLocked}
                                          onChange={(e) => {
                                            const newVal = e.target.value;
                                            updateActiveVO(vo => {
                                              const stages = [...(vo.paymentStages || [])];
                                              stages[idx] = { ...stages[idx], remark: newVal };
                                              return { ...vo, paymentStages: stages };
                                            });
                                          }}
                                          className="flex-1 px-2 py-0.5 border border-gray-200 rounded text-[10px] text-gray-500 focus:outline-amber-600 bg-white disabled:bg-slate-50 disabled:text-gray-550"
                                          placeholder="此期款項備註..."
                                        />
                                        <span className="font-mono text-[10px] font-black text-amber-600 bg-amber-50/50 px-1.5 py-0.5 rounded shrink-0">
                                          試算: HK${Math.round(netVOTotal * (stage.percent / 100)).toLocaleString()}
                                        </span>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>

                              <div className="flex items-center justify-between border-t border-amber-100 pt-2 text-2xs font-bold text-amber-900">
                                <span>比例加總 Forecast Sum:</span>
                                <div>
                                  <span className={`text-xs font-mono font-black ${
                                    (activeVO.paymentStages || []).reduce((sum, s) => sum + s.percent, 0) === 100
                                      ? 'text-emerald-600'
                                      : 'text-rose-500'
                                  }`}>
                                    {(activeVO.paymentStages || []).reduce((sum, s) => sum + s.percent, 0)}%
                                  </span>
                                  <span className="font-normal text-gray-400"> (必須等於 100%)</span>
                                </div>
                              </div>
                            </div>

                            {/* --- VO FINANCIAL精算總結 --- */}
                            <div className="border border-amber-200 rounded-xl bg-amber-50/20 p-5 space-y-3 text-left shadow-2xs">
                              <h4 className="text-amber-800 font-extrabold border-l-4 border-amber-500 pl-2 text-xs">後加合約財務精算匯總：</h4>
                              <div className="space-y-1.5 pt-1 text-xs font-bold text-slate-800">
                                <div className="flex justify-between text-gray-500">
                                  <span>後加項目小計 Subtotal:</span>
                                  <span className="font-mono">HK${voTotal.toLocaleString()}</span>
                                </div>

                                {activeVO.discount > 0 && (
                                  <div className="flex justify-between text-rose-600 font-bold animate-fade-in">
                                    <span className="flex items-center gap-1.5">
                                      <span className="bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded text-[10px]">折扣 Discount</span>
                                      <span>追加特別折讓</span>
                                    </span>
                                    <span className="font-mono">-${(activeVO.discount || 0).toLocaleString()} HKD</span>
                                  </div>
                                )}

                                <div className="flex justify-between text-sm font-extrabold text-amber-600 pt-2 border-t border-gray-200/50">
                                  <span>追加實際淨總額 Net VO Total:</span>
                                  <span className="font-mono scale-110 origin-right">
                                    HK${netVOTotal.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </>
              )}


              {/* Internal Remarks / Memo Section (Only for internal view, won't show on the printed quote) */}
              <div className="p-6 border-t border-gray-250 bg-slate-50/50">
                <div className="max-w-4xl text-left">
                  <div className="flex items-start gap-2.5 mb-2">
                    <div className="p-1.5 bg-slate-200 text-slate-700 rounded-lg shrink-0 mt-0.5">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex flex-wrap items-center gap-1.5">
                        <span>內部草稿備註 / 工作備忘 (Internal Memo)</span>
                        <span className="text-[10px] bg-slate-200 text-slate-650 px-1.5 py-0.5 rounded font-black tracking-wide uppercase">
                          僅供內部觀看
                        </span>
                      </h4>
                      <p className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5">
                        此備註欄位僅儲存在系統後端，列印或匯出報價單時**絕對不會**顯示給客戶。
                      </p>
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    value={editingQuote.draftRemarks || ''}
                    onChange={(e) => setEditingQuote({ ...editingQuote, draftRemarks: e.target.value })}
                    disabled={editingQuote.isLocked}
                    placeholder="例如：需要特別留意要求、後續追蹤備忘等..."
                    className="w-full p-3 bg-white border border-gray-300 rounded-lg text-xs leading-relaxed font-sans focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-all shadow-3xs disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                  />
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
                {editingActiveTab === 'original' && (
                  <button 
                    onClick={handleOpenSaveTemplateModal}
                    type="button"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm shrink-0"
                  >
                    <Sparkles className="w-4 h-4" /> 儲存為專案範本
                  </button>
                )}
                <button 
                  onClick={editingActiveTab !== 'original' ? handlePreviewEditingVOQuote : handlePreviewEditingQuote}
                  className={`px-4 py-2 ${editingActiveTab !== 'original' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-700 hover:bg-slate-800'} text-white rounded-lg font-bold text-sm transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm shrink-0`}
                >
                  <Eye className="w-4 h-4" /> {editingActiveTab !== 'original' ? '預覽後加合約' : '預覽合約'}
                </button>
                <button 
                  onClick={editingActiveTab !== 'original' ? handlePrintEditingVOQuote : handlePrintEditingQuote}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm shrink-0"
                >
                  <Printer className="w-4 h-4" /> {editingActiveTab !== 'original' ? '列印後加合約' : '列印 / 匯出'}
                </button>
                <button 
                  onClick={() => handleSaveQuotation(false)}
                  disabled={editingQuote.isLocked}
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-lg font-bold text-sm transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm shrink-0"
                >
                  <Save className="w-4 h-4" /> {editingQuote.isLocked ? '儲存鎖定中' : '儲存合約變更'}
                </button>
              </div>
            </section>
          ) : activeMainTab === 'calendar' ? (
            /* --- CALENDAR AND ENGINEERING SCHEDULE DASHBOARD --- */
            <CalendarDashboard
              currentUser={currentUser}
              quotations={quotations}
              calendarEvents={calendarEvents}
              onSaveEvent={handleSaveCalendarEvent}
              onDeleteEvent={handleDeleteCalendarEvent}
            />
          ) : activeMainTab === 'payments' && currentUser?.role === 'admin' ? (
            /* --- PAYMENT PROGRESS DASHBOARD (ACCOUNTANT VIEW) --- */
            <div id="payments-progress-dashboard" className="space-y-6">
              {/* Accountant Sub-filters bar */}
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-gray-500">收款狀態篩選：</span>
                  <div className="inline-flex bg-gray-100 p-1 rounded-lg select-none border border-gray-200">
                    {[
                      { value: 'all', label: '全部合約' },
                      { value: 'outstanding', label: '僅顯示待收款項目' },
                      { value: 'fully_paid', label: '已全數收清' }
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPaymentOutstandingFilter(opt.value as any)}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                          paymentOutstandingFilter === opt.value
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-gray-600 hover:text-slate-800'
                        }`}
                      >
                        {opt.value === 'outstanding' && paymentStats.uncollectedStagesCount > 0 && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-400 mr-1 animate-pulse"></span>
                        )}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-[11px] text-gray-400 font-bold flex items-center gap-1">
                  <span> 點選各期數，可直接標記付款狀態。</span>
                </p>
              </div>

              {/* Main Table Card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
                <div className="border-b border-gray-100 bg-slate-50 px-6 py-4 flex items-center justify-between text-left">
                  <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-600" />
                    <span>分期收款進度對帳表</span>
                    <span className="text-2xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-mono">
                      符合條件共 {filteredPaymentContracts.length} 筆
                    </span>
                  </h3>
                </div>

                {filteredPaymentContracts.length === 0 ? (
                  <div className="p-16 text-center text-gray-400 max-w-md mx-auto">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100 shadow-3xs">
                      <Coins className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="font-extrabold text-slate-700 text-md">暫無符合條件的收款合約</p>
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                      僅有「已簽合約」、「施工中」或「完工結清」狀態之訂單才會出現在收款進度看板。
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-100/70 border-b border-gray-200 text-xs font-bold text-gray-500">
                          <th className="px-4 py-3 text-left w-32">單號</th>
                          <th className="px-4 py-3 text-left w-44">客戶資訊</th>
                          <th className="px-4 py-3 text-left">裝修地址</th>
                          <th className="px-4 py-3 text-right w-32">款項彙總</th>
                          <th className="px-4 py-3 text-center w-24">已收進度</th>
                          <th className="px-4 py-3 text-left min-w-[420px]">分期收款明細 (點選切換已付)</th>
                          <th className="px-4 py-3 text-center w-28">會計快捷操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredPaymentContracts.map((quote) => {
                          const migrated = migrateQuotation(quote);
                          const mainFinancials = getQuoteFinancials(migrated);
                          const voFinancials = getCombinedVOFinancials(migrated);
                          const hasAnyVO = migrated.variationOrders && migrated.variationOrders.length > 0;
                          
                          const combinedGrandTotal = mainFinancials.grandTotal + (hasAnyVO ? voFinancials.grandTotal : 0);
                          const mainCollected = mainFinancials.stageValues.reduce((sum, s) => s.isPaid ? sum + s.val : sum, 0);
                          const voCollected = hasAnyVO ? voFinancials.stageValues.reduce((sum, s) => s.isPaid ? sum + s.val : sum, 0) : 0;
                          
                          const combinedCollected = mainCollected + voCollected;
                          const combinedUncollected = combinedGrandTotal - combinedCollected;
                          const combinedCollectedPct = combinedGrandTotal > 0 ? Math.round((combinedCollected / combinedGrandTotal) * 100) : 0;
                          
                          const totalStagesCount = mainFinancials.stageValues.length + (hasAnyVO ? voFinancials.stageValues.length : 0);
                          const totalPaidStagesCount = mainFinancials.stageValues.filter(s => s.isPaid).length + (hasAnyVO ? voFinancials.stageValues.filter(s => s.isPaid).length : 0);

                          return (
                            <tr key={quote.id} className="hover:bg-slate-50/40 transition-colors">
                              {/* Quotation & Internal ID */}
                              <td className="px-4 py-2 font-mono text-left">
                                <div className="font-bold text-xs text-slate-700">{quote.id}</div>
                                {quote.internalNumber ? (
                                  <div className="mt-1 inline-block text-[10px] bg-amber-50 text-amber-800 border border-amber-150 px-1.5 py-0.5 rounded font-bold font-sans">
                                    內部: {quote.internalNumber}
                                  </div>
                                ) : (
                                  <div className="mt-1 text-[10px] text-gray-400 italic">無內部號碼</div>
                                )}
                              </td>

                              {/* Customer Information & Status */}
                              <td className="px-4 py-2 text-left">
                                <div className="font-extrabold text-slate-800">{quote.customerName}</div>
                                <div className="text-xs text-gray-500 font-mono mt-0.5">{quote.phone || '--'}</div>
                                <div className="mt-1">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusStyle(quote.status).bg} ${getStatusStyle(quote.status).text}`}>
                                    {getStatusLabel(quote.status)}
                                  </span>
                                </div>
                              </td>

                              {/* Property Address */}
                              <td className="px-4 py-2 max-w-xs text-left animate-fade-in">
                                {(() => {
                                  const assignedUser = accountsList.find(a => a.username === quote.assignedTo);
                                  const assignedName = assignedUser ? assignedUser.displayName : (quote.assignedTo || '未分配');
                                  return (
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <Users className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                      <span className="text-2xs font-extrabold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/50">
                                        負責人員: {assignedName}
                                      </span>
                                    </div>
                                  );
                                })()}
                                <div className="text-[13px] text-gray-600 truncate" title={quote.address}>
                                  {quote.address || '未填寫裝修地址'}
                                </div>
                              </td>

                              {/* Net grandTotal */}
                              <td className="px-4 py-2 text-right font-mono text-slate-900 font-bold">
                                <div className="text-slate-800">${combinedGrandTotal.toLocaleString()}</div>
                                {hasAnyVO && voFinancials.grandTotal > 0 && (
                                  <div className="text-[10px] text-amber-600 font-bold mt-0.5">
                                    含後加: ${voFinancials.grandTotal.toLocaleString()}
                                  </div>
                                )}
                                <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
                                  待收: ${combinedUncollected.toLocaleString()}
                                </div>
                              </td>

                              {/* Visual progress bar & percent */}
                              <td className="px-4 py-2 text-center">
                                <div className="flex flex-col items-center">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-extrabold font-mono text-slate-700">{combinedCollectedPct}%</span>
                                    <span className="text-[9px] text-gray-400 font-medium">({totalPaidStagesCount}/{totalStagesCount} 期)</span>
                                  </div>
                                  <div className="w-20 bg-gray-100 rounded-full h-1 mt-1 overflow-hidden border border-gray-150">
                                    <div 
                                      className={`h-full transition-all duration-300 ${combinedCollectedPct === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                      style={{ width: `${combinedCollectedPct}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </td>

                              {/* Interactive horizontal capsules - Space efficient & compact! */}
                              <td className="px-4 py-2 text-left">
                                <div className="space-y-1.5">
                                  {/* 1. VO / 追加收款期數 (顯示在上方) */}
                                  {hasAnyVO && voFinancials.stageValues.length > 0 && (
                                    <div className="space-y-0.5">
                                      <div className="text-[10px] font-black text-amber-700 flex items-center gap-1">
                                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                        <span>追加工程 (VO) 收款期數：</span>
                                      </div>
                                      <div className="flex flex-wrap gap-1 items-center">
                                        {voFinancials.stageValues.map((stage, vIdx) => (
                                          <button
                                            key={`vo-${vIdx}`}
                                            type="button"
                                            onClick={() => handleToggleVOPaymentStagePaid(quote, vIdx)}
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] transition-all cursor-pointer select-none font-bold ${
                                              stage.isPaid
                                                ? 'bg-amber-600 border-amber-600 text-white shadow-3xs hover:bg-amber-700'
                                                : 'bg-amber-50/50 hover:bg-amber-100/50 border-amber-200 text-amber-800 hover:border-amber-300 shadow-3xs'
                                            }`}
                                            title={stage.remark ? `${stage.name}: ${stage.remark}` : `點擊切換為${stage.isPaid ? '未付' : '已付'}`}
                                          >
                                            <span className="text-[10px] font-bold">{stage.isPaid ? '✓' : '⏳'}</span>
                                            <span>{stage.name}</span>
                                            <span className="font-mono text-[10px] opacity-90">({stage.percent}%)</span>
                                            <span className="font-mono text-[10px] bg-black/10 px-1 py-0.2 rounded-sm">${stage.val.toLocaleString()}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* 2. 主合約收款期數 (顯示在下方) */}
                                  <div className="space-y-0.5">
                                    {quote.hasVO && voFinancials.stageValues.length > 0 && (
                                      <div className="text-[10px] font-black text-slate-500">
                                        <span>主合約收款期數：</span>
                                      </div>
                                    )}
                                    <div className="flex flex-wrap gap-1 items-center">
                                      {mainFinancials.stageValues.map((stage, sIdx) => {
                                        const overdueInfo = checkStageOverdue(quote, sIdx);
                                        const isOverdue = !stage.isPaid && overdueInfo.isOverdue;
                                        return (
                                          <button
                                            key={`main-${sIdx}`}
                                            type="button"
                                            onClick={() => handleTogglePaymentStagePaid(quote, sIdx)}
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] transition-all cursor-pointer select-none font-semibold ${
                                              stage.isPaid
                                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-3xs hover:bg-emerald-700'
                                                : isOverdue
                                                  ? 'bg-rose-50 hover:bg-rose-100 border-rose-500 text-rose-700 hover:border-rose-600 shadow-3xs ring-1 ring-rose-500/20'
                                                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 hover:border-slate-300 shadow-3xs'
                                            }`}
                                            title={stage.remark 
                                              ? `${stage.name}: ${stage.remark}${isOverdue ? ` (已逾期，應付日: ${overdueInfo.dueDate})` : ''}` 
                                              : `點擊切換為${stage.isPaid ? '未付' : '已付'}${isOverdue ? ` (已逾期，應付日: ${overdueInfo.dueDate})` : ''}`
                                            }
                                          >
                                            <span className={`text-[10px] font-bold ${isOverdue ? 'text-rose-600 animate-pulse' : ''}`}>{stage.isPaid ? '✓' : isOverdue ? '⚠️' : '⏳'}</span>
                                            <span>{stage.name}</span>
                                            <span className="font-mono text-[10px] opacity-90">({stage.percent}%)</span>
                                            <span className={`font-mono text-[10px] px-1 py-0.2 rounded-sm ${isOverdue ? 'bg-rose-100 text-rose-800 font-bold' : 'bg-black/10'}`}>${stage.val.toLocaleString()}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Accountant Actions */}
                              <td className="px-4 py-2 text-center">
                                <div className="flex flex-col gap-1.5 justify-center items-center max-w-[100px] mx-auto">
                                  <button
                                    type="button"
                                    onClick={() => handleCopyPaymentStatement(quote)}
                                    className="inline-flex items-center justify-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-[11px] font-bold text-amber-800 transition-all cursor-pointer active:scale-95 w-full"
                                    title="複製該合約之收款對帳單文字 Reminders"
                                  >
                                    <Copy className="w-3 h-3 shrink-0" />
                                    <span>明細</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewQuote(quote)}
                                    className="inline-flex items-center justify-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-gray-200 rounded-lg text-[11px] font-bold text-slate-700 hover:text-slate-900 transition-all cursor-pointer active:scale-95 w-full"
                                    title="預覽報價合約"
                                  >
                                    <Eye className="w-3 h-3 shrink-0" />
                                    <span>Preview</span>
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
              </div>
            </div>
          ) : activeMainTab === 'settings' ? (
            /* --- INTEGRATED SETTINGS & USER PAGE --- */
            <div id="integrated-settings-tab-view" className="space-y-6 animate-fade-in text-left">
              {/* User profile & Logout */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 text-white font-black flex items-center justify-center text-lg shadow-sm">
                    {currentUser?.displayName?.[0] || 'U'}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm">
                      當前登入：{currentUser?.displayName} ({currentUser?.role === 'admin' ? '管理員' : '員工'})
                    </h4>
                    <p className="text-[10.5px] text-gray-500 font-semibold mt-0.5">
                      帳號：@{currentUser?.username} ｜ 系統狀態：{isOnline ? '🟢 在線同步中' : '🟠 離線本地存儲'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95 duration-150"
                >
                  <LogOut className="w-4 h-4" />
                  登出系統
                </button>
              </div>

              {/* Main settings container styled like the modal but inline */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                <div className="border-b border-gray-150 bg-slate-50 px-6 py-4 flex items-center justify-between text-left">
                  <h4 className="font-extrabold text-slate-800 text-base flex items-center gap-1.5">
                    <Settings className="w-5 h-5 text-amber-500 animate-spin-slow" />
                    <span>築匠合約系統 ． 離線參數設定庫</span>
                  </h4>
                </div>

                {/* Inner Settings Body */}
                {settingsRendererRef.current ? settingsRendererRef.current(false) : (
                  <div className="p-12 text-center text-gray-500 font-medium">載入設定參數中...</div>
                )}
              </div>
            </div>
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
                        <th className="px-4 py-3 w-52">客戶姓名  聯絡電話</th>
                        <th className="px-4 py-3">地址</th>
                        <th className="px-4 py-3 text-right">款項總金額 </th>
                        <th className="px-4 py-3 text-center">狀態</th>
                        <th className="px-5 py-3 text-right">管理操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredQuotations.map((quote) => {
                        const financials = getQuoteFinancials(quote);
                        return (
                          <tr key={quote.id} className="hover:bg-slate-50/50 transition-colors">
                            {/* Quotation ID */}
                            <td className="px-5 py-4 font-mono text-left">
                              <div className="font-bold text-xs text-slate-700">{quote.id}</div>
                              {quote.internalNumber ? (
                                <div className="mt-1 inline-block text-[10px] bg-amber-50 text-amber-800 border border-amber-150 px-1.5 py-0.5 rounded font-bold font-sans">
                                  內部: {quote.internalNumber}
                                </div>
                              ) : (
                                <div className="mt-1 text-[10px] text-gray-400 italic font-sans">無內部號碼</div>
                              )}
                            </td>
                            
                            {/* Client particulars */}
                            <td className="px-4 py-4 w-52">
                              <div className="font-bold text-slate-800">{quote.customerName}</div>
                              <div className="text-xs text-gray-500 font-mono mt-0.5">{quote.phone || '--'}</div>
                            </td>

                            {/* Address details */}
                            <td className="px-4 py-4 max-w-xs truncate text-[13px] text-gray-600" title={quote.address}>
                              {quote.address || '未填寫修繕地址'}
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
          {/* --- FLOATING BOTTOM STATUS DASHBOARD --- */}
          {!editingQuote && settings.showStatsDashboard && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-fade-in print:hidden">
              {isStatsExpanded ? (
                <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4 max-w-[95vw] md:max-w-4xl transition-all duration-300">
                  {/* Dashboard Title & Icon */}
                  <div className="flex items-center gap-2 border-r border-slate-800 pr-4 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    <span className="text-xs font-bold tracking-wider text-slate-300">數據看板</span>
                  </div>

                  {/* Main statistics metrics */}
                  <div className="flex items-center gap-4 md:gap-6 overflow-x-auto no-scrollbar py-0.5">
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                      <span className="text-xs text-slate-400 font-medium">未報價:</span>
                      <span className="text-sm font-black text-slate-100">{stats.pending}</span>
                    </div>
                    <div className="w-px h-3 bg-slate-800 shrink-0"></div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      <span className="text-xs text-amber-400 font-medium">待回覆:</span>
                      <span className="text-sm font-black text-amber-500">{stats.quoted}</span>
                    </div>
                    <div className="w-px h-3 bg-slate-800 shrink-0"></div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span className="text-xs text-emerald-400 font-medium">已簽約:</span>
                      <span className="text-sm font-black text-emerald-500">{stats.signed}</span>
                    </div>
                    <div className="w-px h-3 bg-slate-800 shrink-0"></div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      <span className="text-xs text-blue-400 font-medium">施工中:</span>
                      <span className="text-sm font-black text-blue-500">{stats.constructing}</span>
                    </div>
                    <div className="w-px h-3 bg-slate-800 shrink-0"></div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                      <span className="text-xs text-indigo-400 font-medium">施工完成:</span>
                      <span className="text-sm font-black text-indigo-500">{stats.finished}</span>
                    </div>
                    <div className="w-px h-3 bg-slate-800 shrink-0"></div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                      <span className="text-xs text-purple-400 font-medium">完工結清:</span>
                      <span className="text-sm font-black text-purple-500">{stats.completed}</span>
                    </div>
                    <div className="w-px h-3 bg-slate-800 shrink-0"></div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      <span className="text-xs text-rose-400 font-medium">作廢:</span>
                      <span className="text-sm font-black text-rose-500">{stats.cancelled}</span>
                    </div>
                  </div>

                  {/* Collapse Control Button */}
                  <button 
                    onClick={() => setIsStatsExpanded(false)}
                    className="p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-slate-400 hover:text-white shrink-0 border-l border-slate-800 pl-3 ml-2"
                    title="收合看板"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* Compact minimized dock node */
                <button
                  onClick={() => setIsStatsExpanded(true)}
                  className="bg-slate-900/95 dark:bg-slate-950/95 text-white hover:bg-slate-800/95 border border-slate-800 rounded-full shadow-2xl px-4 py-2 flex items-center gap-2 transition-all duration-300 cursor-pointer animate-fade-in group"
                  title="展開數據看板"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                  <span className="text-xs font-bold text-slate-300 tracking-wider">展開數據看板</span>
                  <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-white transition-transform" />
                </button>
              )}
            </div>
          )}
        </main>



        {/* --- SYSTEM WORKSPACE SETTINGS MODAL OVERLAY --- */}
        {(() => {
          const renderSettingsPanelContent = (isModal: boolean) => {
            return (
              <>

              {/* Tabs nav rail */}
              <div className="flex border-b border-gray-200 bg-slate-50 flex-wrap">
                <button 
                  onClick={() => setSettingsTab('library')}
                  className={`flex-1 min-w-[80px] px-3 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${settingsTab === 'library' ? 'border-amber-600 text-amber-700 bg-white' : 'border-transparent text-gray-500 hover:text-slate-800'}`}
                >
                  <BookOpen className="w-4 h-4" />
                  標準項目庫
                </button>
                <button 
                  onClick={() => setSettingsTab('footer')}
                  className={`flex-1 min-w-[80px] px-3 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${settingsTab === 'footer' ? 'border-amber-600 text-amber-700 bg-white' : 'border-transparent text-gray-500 hover:text-slate-800'}`}
                >
                  <Coins className="w-4 h-4" />
                  一般與頁腳設定
                </button>
                {currentUser && isProtectedAdmin(currentUser.username) && (
                  <button 
                    onClick={() => setSettingsTab('accounts')}
                    className={`flex-1 min-w-[80px] px-3 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${settingsTab === 'accounts' ? 'border-amber-600 text-amber-700 bg-white' : 'border-transparent text-gray-500 hover:text-slate-800'}`}
                  >
                    <Users className="w-4 h-4 text-amber-600" />
                    <span>雲端帳戶管理</span>
                  </button>
                )}
                <button 
                  onClick={() => setSettingsTab('backup')}
                  className={`flex-1 min-w-[80px] px-3 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${settingsTab === 'backup' ? 'border-amber-600 text-amber-700 bg-white' : 'border-transparent text-gray-500 hover:text-slate-800'}`}
                >
                  <Upload className="w-4 h-4" />
                  資料庫備份管理
                </button>
                <button 
                  onClick={() => setSettingsTab('developer')}
                  className={`flex-1 min-w-[80px] px-3 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${settingsTab === 'developer' ? 'border-amber-600 text-amber-700 bg-white' : 'border-transparent text-gray-500 hover:text-slate-800'}`}
                >
                  <FileJson className="w-4 h-4" />
                  資料除錯診斷
                </button>
              </div>

              {/* Tab views contents */}
              <div className={`${isModal ? 'flex-1 overflow-y-auto' : ''} p-6 space-y-6`}>
                
                {/* 1. LIBRARY WORKSPACE */}
                {settingsTab === 'library' && (
                  <div className="space-y-6">
                    <p className="text-xs text-gray-500">
                      標準項目庫：可在此修改或定置各項預設的單價或備註範本，新造項目不用每次打字編寫。
                      <span className="font-extrabold text-amber-700 font-sans block mt-1">💡 提示：此處所做的修改僅作為未來新造項目的範本/模板，數據與已有報價合約完全分離，修改標準庫項目絕不會影響已創建或已儲存的任何合約內容。</span>
                    </p>
                    
                    {/* JSON Import & Export for Standard Item Library */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200/80 rounded-xl p-4 shadow-3xs">
                      <div>
                        <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5 mb-1">
                          <Download className="w-4 h-4 text-amber-600" />
                          <span>備份標準細項庫 (Export JSON)</span>
                        </h5>
                        <p className="text-[11px] text-gray-500 mb-2.5">
                          將當前所有的「標準細項數據」與「大類順序」導出為本地 JSON 檔案保存。
                        </p>
                        <button 
                          onClick={handleExportStandardItemsJSON}
                          className="w-full py-1.5 bg-white border border-gray-300 hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-3xs cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> 下載標準庫 JSON 到本地
                        </button>
                      </div>

                      <div className="border-t sm:border-t-0 sm:border-l border-gray-200 pt-3.5 sm:pt-0 sm:pl-4">
                        <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5 mb-1">
                          <Upload className="w-4 h-4 text-emerald-600" />
                          <span>還原標準細項庫 (Import JSON)</span>
                        </h5>
                        <p className="text-[11px] text-gray-500 mb-2.5">
                          上傳先前備份的標準庫 JSON 檔案，一鍵回復/重設您的所有標準項目定價。
                        </p>
                        <div className="relative">
                          <input 
                            type="file" 
                            accept=".json"
                            onChange={handleImportStandardItemsJSON}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <button 
                            className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-3xs pointer-events-none"
                          >
                            <Upload className="w-3.5 h-3.5" /> 上載 JSON 回復標準庫設定
                          </button>
                        </div>
                      </div>
                    </div>

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
                      {categoryOrder.map((cat) => (
                        <div key={cat} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-3">
                          <div className="flex justify-between items-center bg-gray-100 p-2 rounded-lg">
                            <span className="font-extrabold text-sm text-slate-800">{cat}</span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleMoveCategory(cat, -1)}
                                className="text-xs bg-white px-2 py-1 rounded border border-gray-300 hover:bg-gray-200"
                              >
                                ↑
                              </button>
                              <button
                                onClick={() => handleMoveCategory(cat, 1)}
                                className="text-xs bg-white px-2 py-1 rounded border border-gray-300 hover:bg-gray-200"
                              >
                                ↓
                              </button>
                              <button 
                                onClick={() => handleDeleteCategory(cat)}
                                className="text-2xs text-rose-500 font-bold hover:underline"
                              >
                                刪除
                              </button>
                            </div>
                          </div>

                          {/* Items in category library */}
                          <div className="space-y-1.5">
                            {standardItems[cat]?.map((item, itemIdx) => {
                              const isEditing = editingLibItem && editingLibItem.category === cat && editingLibItem.itemIdx === itemIdx;
                              if (isEditing) {
                                return (
                                  <div key={itemIdx} className="bg-amber-50/50 p-3 border border-amber-300 rounded-lg space-y-2 text-xs w-full">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                      <div>
                                        <label className="block text-3xs text-gray-400">項目名稱 *</label>
                                        <input 
                                          type="text"
                                          value={editingLibItem.name}
                                          onChange={(e) => setEditingLibItem({ ...editingLibItem, name: e.target.value })}
                                          className="w-full p-1 border border-gray-300 rounded text-xs bg-white focus:outline-amber-600"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-3xs text-gray-400">單位 *</label>
                                        <input 
                                          type="text"
                                          value={editingLibItem.unit}
                                          onChange={(e) => setEditingLibItem({ ...editingLibItem, unit: e.target.value })}
                                          className="w-full p-1 border border-gray-300 rounded text-xs bg-white text-center focus:outline-amber-600"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-3xs text-gray-400">HKD 參考單價 *</label>
                                        <input 
                                          type="text"
                                          value={editingLibItem.priceRange}
                                          onChange={(e) => setEditingLibItem({ ...editingLibItem, priceRange: e.target.value })}
                                          className="w-full p-1 border border-gray-300 rounded text-xs bg-white text-right focus:outline-amber-600"
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <label className="block text-3xs text-gray-400">預設此細項工程合約標準備註工法</label>
                                      <input 
                                        type="text"
                                        value={editingLibItem.defaultRemark}
                                        onChange={(e) => setEditingLibItem({ ...editingLibItem, defaultRemark: e.target.value })}
                                        className="w-full p-1 border border-gray-300 rounded text-xs bg-white focus:outline-amber-600"
                                      />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-1">
                                      <button 
                                        onClick={() => setEditingLibItem(null)}
                                        className="px-2.5 py-1 bg-gray-200 text-gray-700 rounded text-3xs font-bold hover:bg-gray-300 transition-colors cursor-pointer"
                                      >
                                        取消
                                      </button>
                                      <button 
                                        onClick={handleUpdateStandardItem}
                                        className="px-2.5 py-1 bg-amber-600 text-white rounded text-3xs font-bold hover:bg-amber-700 transition-colors cursor-pointer"
                                      >
                                        保存修改
                                      </button>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div key={itemIdx} className="flex justify-between items-start bg-white p-2.5 border border-gray-100 rounded-lg shadow-3xs text-xs w-full group/item hover:border-amber-200 transition-all">
                                  <div className="flex-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold text-slate-700 break-words">{item.name}</span>
                                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                                        單位：{item.unit}
                                      </span>
                                      <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-mono font-bold">
                                        HKD 參考單價: {item.priceRange}
                                      </span>
                                    </div>
                                    {item.defaultRemark && (
                                      <p className="text-[10px] text-gray-400 mt-1 pl-1 border-l border-gray-200 break-words">{item.defaultRemark}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover/item:opacity-100 transition-all">
                                    <button 
                                      onClick={() => handleMoveStandardItem(cat, itemIdx, 'up')}
                                      disabled={itemIdx === 0}
                                      className={`p-1 rounded transition-all ${itemIdx === 0 ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-amber-600 hover:bg-slate-50 cursor-pointer'}`}
                                      title="向上移動"
                                    >
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => handleMoveStandardItem(cat, itemIdx, 'down')}
                                      disabled={itemIdx === (standardItems[cat]?.length || 0) - 1}
                                      className={`p-1 rounded transition-all ${itemIdx === (standardItems[cat]?.length || 0) - 1 ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-amber-600 hover:bg-slate-50 cursor-pointer'}`}
                                      title="向下移動"
                                    >
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => setEditingLibItem({
                                        category: cat,
                                        itemIdx,
                                        name: item.name,
                                        unit: item.unit,
                                        priceRange: item.priceRange,
                                        defaultRemark: item.defaultRemark || ''
                                      })}
                                      className="text-gray-400 hover:text-amber-600 p-1 hover:bg-slate-50 rounded transition-all cursor-pointer"
                                      title="編輯項目"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => handleRemoveStandardItem(cat, itemIdx)}
                                      className="text-gray-400 hover:text-rose-500 p-1 hover:bg-slate-50 rounded transition-all cursor-pointer"
                                      title="刪除項目"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
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
                          onChange={(e) => {
                            const updated = { ...settings, showMainFooter: e.target.checked };
                            syncSettings(updated);
                          }}
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

                    {/* Data Dashboard Display Toggler */}
                    <div id="stats-dashboard-toggle-container" className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between text-left">
                      <div>
                        <span id="stats-dashboard-toggle-title" className="text-xs font-black text-slate-800 block mb-0.5">顯示首頁數據看板 (Data Dashboard)</span>
                        <span id="stats-dashboard-toggle-description" className="text-[10px] text-gray-500 font-medium">在系統首頁下方顯示合約狀態的統計數據與彙總看板（預設為關閉）。</span>
                      </div>
                      <label id="stats-dashboard-toggle-label" className="relative inline-flex items-center cursor-pointer select-none">
                        <input 
                          id="stats-dashboard-toggle-checkbox"
                          type="checkbox"
                          checked={!!settings.showStatsDashboard}
                          onChange={(e) => {
                            const updated = { ...settings, showStatsDashboard: e.target.checked };
                            syncSettings(updated);
                          }}
                          className="sr-only peer"
                        />
                        <div id="stats-dashboard-toggle-switch" className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                      </label>
                    </div>

                    {/* Font Size Adjustment Toggler */}
                    <div id="font-size-setting-container" className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
                      <div>
                        <span id="font-size-setting-title" className="text-xs font-black text-slate-800 block mb-0.5">調整系統文字大小 (Font Size)</span>
                        <span id="font-size-setting-description" className="text-[10px] text-gray-500 font-medium">調整全系統操作介面之文字比例。此設定僅影響畫面操作，不會影響列印、審單與匯出文件之排版。</span>
                      </div>
                      <div className="flex bg-gray-200 p-0.5 rounded-lg shrink-0 select-none">
                        {[
                          { value: 'sm', label: '偏小' },
                          { value: 'base', label: '標準' },
                          { value: 'lg', label: '偏大' },
                          { value: 'xl', label: '放大' }
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              const updated = { ...settings, appFontSize: opt.value as any };
                              syncSettings(updated);
                            }}
                            className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                              (settings.appFontSize || 'base') === opt.value
                                ? 'bg-amber-600 text-white shadow-sm'
                                : 'text-gray-600 hover:text-slate-850 hover:bg-gray-300/50'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
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
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-gray-600">承載預設合約特別條約規範</label>
                        <span className="text-[10px] text-gray-400 font-bold">選取文字後點擊工具列可快速排版</span>
                      </div>
                      
                      {/* Formatting Toolbar */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-1 bg-slate-50 border border-gray-200 p-1.5 rounded-t-lg">
                        <button
                          type="button"
                          onClick={() => insertFormatting(
                            'settings-default-terms-textarea',
                            '**',
                            '**',
                            settings.defaultTerms || '',
                            (val) => setSettings({...settings, defaultTerms: val})
                          )}
                          className="px-2 py-1 text-2xs font-bold bg-white border border-gray-300 rounded hover:bg-slate-100 flex items-center gap-1 cursor-pointer transition-all active:scale-95 text-slate-800"
                          title="加粗文字 Bold"
                        >
                          <span className="font-extrabold text-[11px]">B</span>
                          <span>粗體</span>
                        </button>
                        
                        <div className="h-4 w-px bg-gray-300 mx-1"></div>
                        
                        <span className="text-[10px] text-gray-400 font-bold ml-1 mr-0.5">顏色:</span>
                        {[
                          { label: '紅', tag: 'red', color: '#e11d48' },
                          { label: '藍', tag: 'blue', color: '#2563eb' },
                          { label: '綠', tag: 'green', color: '#059669' },
                          { label: '金', tag: 'amber', color: '#d97706' },
                          { label: '橘', tag: 'orange', color: '#ea580c' },
                          { label: '紫', tag: 'purple', color: '#7c3aed' },
                        ].map((c) => (
                          <button
                            key={c.tag}
                            type="button"
                            onClick={() => insertFormatting(
                              'settings-default-terms-textarea',
                              `[${c.tag}]`,
                              `[/${c.tag}]`,
                              settings.defaultTerms || '',
                              (val) => setSettings({...settings, defaultTerms: val})
                            )}
                            className="px-2 py-1 text-3xs font-extrabold bg-white border border-gray-200 rounded hover:bg-slate-50 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                            style={{ color: c.color }}
                            title={`${c.label}色文字`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color }}></span>
                            {c.label}
                          </button>
                        ))}

                        {/* Custom hex color picker */}
                        <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 border border-gray-200 rounded ml-auto">
                          <span className="text-[9px] text-gray-400 font-bold">自訂色:</span>
                          <input 
                            type="color"
                            defaultValue="#000000"
                            onChange={(e) => {
                              const hex = e.target.value;
                              insertFormatting(
                                'settings-default-terms-textarea',
                                `[color=${hex}]`,
                                `[/color]`,
                                settings.defaultTerms || '',
                                (val) => setSettings({...settings, defaultTerms: val})
                              );
                            }}
                            className="w-4 h-4 p-0 border-0 cursor-pointer rounded overflow-hidden"
                            title="選擇自訂顏色"
                          />
                        </div>
                      </div>

                      <textarea 
                        id="settings-default-terms-textarea"
                        rows={10}
                        value={settings.defaultTerms}
                        onChange={(e) => setSettings({...settings, defaultTerms: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-b-lg border-t-0 text-xs leading-relaxed font-sans bg-white focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500"
                        placeholder="在此輸入公司標準保固期、退還規則、泥水工程進度付款聲明..."
                      />

                      {/* Real-time formatted preview */}
                      <div className="mt-1.5 p-2 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                        <span className="text-[10px] font-bold text-gray-400 block mb-1">預設範本效果預覽 (Live Preview)：</span>
                        <div className="text-[10.5px] leading-tight space-y-0.5 text-slate-700 bg-white p-2.5 border border-slate-150 rounded-md max-h-48 overflow-y-auto">
                          {(settings.defaultTerms || '').split('\n').map((line, idx) => (
                            <div key={idx} className="text-left">
                              {parseFormattedText(line)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                  </div>
                )}

                {/* 2.5 CLOUD ACCOUNTS WORKSPACE */}
                {settingsTab === 'accounts' && isProtectedAdmin(currentUser?.username) && (
                  <div className="space-y-6">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                      <Users className="w-8 h-8 text-amber-600 shrink-0 animate-pulse" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-850">多用戶雲端帳號管理中心</h4>
                        <p className="text-2xs text-gray-500">
                          作為系統最高管理員，您可以安全地建立、管理或變更員工帳號。可搜尋並篩選過濾，亦可隨時為其重設密碼或修改身分與顯示姓名。
                        </p>
                      </div>
                    </div>

                    {/* Overview stats cards */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center shadow-xs">
                        <span className="text-gray-500 text-3xs font-bold uppercase tracking-wider block">總雲端帳戶</span>
                        <span className="text-xl font-black text-slate-800 mt-0.5 block">{accountStats.total}</span>
                      </div>
                      <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 text-center shadow-xs">
                        <span className="text-amber-750 text-3xs font-bold uppercase tracking-wider block">管理員數</span>
                        <span className="text-xl font-black text-amber-800 mt-0.5 block">{accountStats.admins}</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center shadow-xs">
                        <span className="text-gray-500 text-3xs font-bold uppercase tracking-wider block">員工/技術員</span>
                        <span className="text-xl font-black text-slate-800 mt-0.5 block">{accountStats.staff}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Left side: creation / editing form (col-span-5) */}
                      <div className="lg:col-span-5 space-y-4">
                        {editingAccount ? (
                          /* Edit Account Form */
                          <form onSubmit={handleUpdateAccount} className="bg-slate-50 border border-amber-200 rounded-xl p-4 space-y-3 relative overflow-hidden shadow-xs">
                            <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs font-bold text-slate-850 flex items-center gap-1.5">
                                <Edit className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                                <span>編輯用戶: @{editingAccount.username}</span>
                              </h5>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAccount(null);
                                  setEditAccPassword('');
                                }}
                                className="text-3xs text-gray-450 hover:text-slate-750 font-bold transition-all cursor-pointer"
                              >
                                取消編輯
                              </button>
                            </div>

                            <div className="space-y-2.5">
                              <div>
                                <label className="block text-3xs text-gray-500 font-bold mb-1">顯示姓名 (Display Name)</label>
                                <input 
                                  type="text"
                                  value={editAccDisplayName}
                                  onChange={(e) => setEditAccDisplayName(e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-amber-500"
                                  placeholder="員工顯示姓名"
                                  required
                                />
                              </div>

                              <div>
                                <label className="block text-3xs text-gray-500 font-bold mb-1">角色身分 (Role)</label>
                                <select
                                  value={editAccRole}
                                  onChange={(e) => setEditAccRole(e.target.value as any)}
                                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-slate-700"
                                  disabled={editingAccount.username.toLowerCase() === 'whlee' || editingAccount.username.toLowerCase() === 'king' || editingAccount.username.toLowerCase() === 'mat'}
                                >
                                  <option value="staff">員工 (Staff - 僅可查閱自己被分派之報價)</option>
                                  <option value="admin">管理員 (Admin - 完整最高權限)</option>
                                </select>
                                {(editingAccount.username.toLowerCase() === 'whlee' || editingAccount.username.toLowerCase() === 'king' || editingAccount.username.toLowerCase() === 'mat') && (
                                  <p className="text-[10px] text-amber-600 mt-1 font-medium">系統預設最高管理員不允許變更身分</p>
                                )}
                              </div>

                              <div>
                                <label className="block text-3xs text-gray-500 font-bold mb-1">重設密碼 (留空則不修改密碼)</label>
                                <div className="relative">
                                  <input 
                                    type={showEditPassword ? "text" : "password"}
                                    placeholder="輸入新密碼以覆蓋舊密碼"
                                    value={editAccPassword}
                                    onChange={(e) => setEditAccPassword(e.target.value)}
                                    className="w-full pl-2.5 pr-8 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowEditPassword(!showEditPassword)}
                                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-slate-600 cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {accountActionError && (
                              <p className="text-3xs text-rose-500 font-bold bg-rose-50 p-2 rounded border border-rose-150">{accountActionError}</p>
                            )}

                            <div className="flex gap-2 pt-2 justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAccount(null);
                                  setEditAccPassword('');
                                }}
                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
                              >
                                取消
                              </button>
                              <button
                                type="submit"
                                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm flex items-center gap-1"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>儲存更新</span>
                              </button>
                            </div>
                          </form>
                        ) : (
                          /* Create Account Form */
                          <form onSubmit={handleCreateAccount} className="bg-slate-50 border border-slate-150 rounded-xl p-4 space-y-3 shadow-xs">
                            <h5 className="text-xs font-bold text-slate-750 flex items-center gap-1.5">
                              <PlusCircle className="w-4 h-4 text-amber-600 animate-pulse" />
                              <span>建立雲端子用戶帳戶</span>
                            </h5>
                            
                            <div className="space-y-2.5">
                              <div>
                                <label className="block text-3xs text-gray-500 font-bold mb-1">帳號名稱 (Username - 英文/數字)</label>
                                <input 
                                  type="text"
                                  placeholder="例如: john_lee"
                                  value={newAccUsername}
                                  onChange={(e) => setNewAccUsername(e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono"
                                  required
                                />
                              </div>
                              
                              <div>
                                <label className="block text-3xs text-gray-500 font-bold mb-1">密碼 (Password)</label>
                                <div className="relative">
                                  <input 
                                    type={showCreatePassword ? "text" : "password"}
                                    placeholder="請輸入密碼"
                                    value={newAccPassword}
                                    onChange={(e) => setNewAccPassword(e.target.value)}
                                    className="w-full pl-2.5 pr-8 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                                    required
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-slate-600 cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div>
                                <label className="block text-3xs text-gray-500 font-bold mb-1">顯示姓名 (Display Name)</label>
                                <input 
                                  type="text"
                                  placeholder="例如: 裝修部-阿輝"
                                  value={newAccDisplayName}
                                  onChange={(e) => setNewAccDisplayName(e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                                />
                              </div>

                              <div>
                                <label className="block text-3xs text-gray-500 font-bold mb-1">角色身分 (Role)</label>
                                <select
                                  value={newAccRole}
                                  onChange={(e) => setNewAccRole(e.target.value as any)}
                                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-slate-700"
                                >
                                  <option value="staff">員工 (Staff - 僅可查閱自己被分派之報價)</option>
                                  <option value="admin">管理員 (Admin - 完整最高權限)</option>
                                </select>
                              </div>
                            </div>
                            
                            {accountActionError && (
                              <p className="text-3xs text-rose-500 font-bold bg-rose-50 p-2 rounded border border-rose-150">{accountActionError}</p>
                            )}
                            
                            <div className="flex justify-end pt-2">
                              <button
                                type="submit"
                                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm flex items-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>建立子用戶</span>
                              </button>
                            </div>
                          </form>
                        )}
                      </div>

                      {/* Right side: Accounts list with Search & Filter (col-span-7) */}
                      <div className="lg:col-span-7 space-y-3">
                        <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
                          <h6 className="text-xs font-bold text-slate-700 w-full sm:w-auto">目前雲端用戶名單 ({filteredAccounts.length})</h6>
                          
                          {/* Search and Role Filter Toolbar */}
                          <div className="flex gap-2 w-full sm:w-auto shrink-0 select-none">
                            <div className="relative w-full sm:w-44">
                              <Search className="w-3.5 h-3.5 text-gray-450 absolute left-2.5 top-2" />
                              <input
                                type="text"
                                placeholder="搜尋帳號/姓名..."
                                value={accountSearchQuery}
                                onChange={(e) => setAccountSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-2.5 py-1 bg-white border border-gray-200 rounded-lg text-3xs focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-medium"
                              />
                            </div>
                            
                            <select
                              value={accountRoleFilter}
                              onChange={(e) => setAccountRoleFilter(e.target.value as any)}
                              className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-3xs font-semibold text-slate-600 focus:outline-none"
                            >
                              <option value="all">所有角色</option>
                              <option value="admin">管理員</option>
                              <option value="staff">員工</option>
                            </select>
                          </div>
                        </div>

                        {/* Accounts Scrollable Container */}
                        <div className="divide-y divide-gray-150 border border-gray-150 rounded-xl overflow-hidden bg-white max-h-[380px] overflow-y-auto shadow-xs">
                          {filteredAccounts.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-xs font-medium">
                              無符合篩選條件的帳戶。
                            </div>
                          ) : (
                            filteredAccounts.map((acc) => {
                              const isProtected = acc.username.toLowerCase() === 'whlee' || acc.username.toLowerCase() === 'king' || acc.username.toLowerCase() === 'mat';
                              const assignedQuotesCount = quotations.filter(q => q.assignedTo?.trim().toLowerCase() === acc.username.trim().toLowerCase()).length;
                              const isSelf = acc.username.toLowerCase() === currentUser?.username.toLowerCase();

                              return (
                                <div key={acc.username} className={`px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-xs ${isSelf ? 'bg-amber-50/20' : ''}`}>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold text-slate-800">{acc.displayName}</span>
                                      <span className="font-mono text-gray-400 text-3xs bg-slate-100 px-1.5 py-0.5 rounded">@{acc.username}</span>
                                      
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${acc.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                                        {acc.role === 'admin' ? '管理員' : '員工'}
                                      </span>

                                      {isSelf && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                          目前登入
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center gap-4 text-[10px] text-gray-500 flex-wrap">
                                      <span>建立時間: {acc.createdAt ? new Date(acc.createdAt).toLocaleString('zh-HK', {hour12: false}) : '系統預設'}</span>
                                      <span className="font-semibold text-slate-650 bg-slate-100/85 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        <FileText className="w-3 h-3 text-gray-400" />
                                        <span>已分派合約: {assignedQuotesCount} 張</span>
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2.5 shrink-0 ml-4 select-none">
                                    {/* Edit button */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingAccount(acc);
                                        setEditAccDisplayName(acc.displayName);
                                        setEditAccRole(acc.role === 'admin' ? 'admin' : 'staff');
                                        setEditAccPassword('');
                                        setAccountActionError(null);
                                      }}
                                      className="text-2xs text-amber-655 hover:text-amber-700 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                                    >
                                      <Edit className="w-3 h-3" />
                                      <span>編輯</span>
                                    </button>

                                    <span className="text-gray-300 text-3xs">|</span>

                                    {/* Action items based on protection status */}
                                    {!isProtected ? (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteAccount(acc.username)}
                                        className="text-2xs text-rose-500 hover:text-rose-600 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        <span>刪除</span>
                                      </button>
                                    ) : (
                                      <span className="text-2xs text-gray-400 italic cursor-not-allowed">系統保護</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
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

                    {/* Firebase Cloud Sync */}
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 text-amber-900">
                        <Database className="w-5 h-5 text-amber-600" />
                        <h5 className="font-bold text-xs">雲端標準庫同步</h5>
                      </div>
                      <p className="text-xs text-amber-700">將您的「標準項目庫」與「大類順序」即時備份至雲端，確保在不同裝置間都能同步。</p>
                      <div className="flex gap-2">
                        <button 
                          onClick={handleFirebaseBackup}
                          className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors"
                        >
                          備份至雲端
                        </button>
                        <button 
                          onClick={handleFirebaseRestore}
                          className="flex-1 px-4 py-2 bg-amber-800 text-white rounded-lg text-xs font-bold hover:bg-amber-900 transition-colors"
                        >
                          從雲端還原
                        </button>
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
                {isModal && (
                  <button 
                    onClick={() => setIsSettingsOpen(false)}
                    className="flex-1 px-4 py-2 text-slate-700 bg-gray-200 hover:bg-gray-300 rounded-lg text-xs font-bold text-center transition-colors cursor-pointer"
                  >
                    關閉
                  </button>
                )}
                <button 
                  onClick={handleSaveSettings}
                  className="flex-1 px-4 py-2 text-white bg-amber-600 hover:bg-amber-700 rounded-lg text-xs font-bold text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  儲存系統參數設定
                </button>
              </div>
            </>
          );
        };

        settingsRendererRef.current = renderSettingsPanelContent;

          return (
            <>
              {isSettingsOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl h-[680px] max-h-[85vh] overflow-hidden flex flex-col border border-slate-100 animate-fade-in">
                    {/* Modal header */}
                    <div className="px-6 py-4 border-b border-gray-150 bg-slate-900 text-white flex justify-between items-center text-left">
                      <h4 className="font-extrabold text-base flex items-center gap-1.5">
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
                    {renderSettingsPanelContent(true)}
                  </div>
                </div>
              )}
            </>
          );
        })()}

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
 
                {projectTemplates && projectTemplates.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      套用專案範本 (選填)
                    </label>
                    <select
                      value={newQuoteModal.selectedTemplateId || ''}
                      onChange={(e) => setNewQuoteModal({ ...newQuoteModal, selectedTemplateId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-350 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500/20 focus:border-amber-600 bg-white cursor-pointer"
                    >
                      <option value="">不套用範本（建立空白報價）</option>
                      {projectTemplates.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.name} ({tpl.items?.length || 0} 個細項)
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-gray-400 mt-1">選取後將一鍵載入該範本所設定的所有工程類別與細項項目。</p>
                  </div>
                )}
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
                  onClick={() => handleConfirmCreateQuote(newQuoteModal.id, newQuoteModal.customerName, newQuoteModal.selectedTemplateId)}
                  className="px-5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-sm flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  確認並開始編制
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- CUSTOM MODAL FOR SAVING AS TEMPLATE --- */}
        {isSaveTemplateModalOpen && (
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs z-[110] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 p-6 flex flex-col gap-4 text-left">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                <div className="p-2 bg-indigo-50 rounded-full text-indigo-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-slate-800">儲存為專案範本</h3>
              </div>
              
              <div className="space-y-4 py-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">專案範本名稱 *</label>
                  <input 
                    type="text" 
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-350 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-600"
                    placeholder="例如：標準兩房裝修範本、三睡房全屋訂製組合"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    這會將當前報價單中的所有施工大類與細項（共 {editingQuote?.items?.length || 0} 個項目）儲存為一組常用範本，隨時能在新報價單中一鍵套用。
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5 mt-2 justify-end border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsSaveTemplateModalOpen(false);
                    setNewTemplateName('');
                  }}
                  className="px-4 py-1.5 border border-gray-200 hover:bg-gray-50 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSaveTemplate}
                  className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-sm flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  確認儲存
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

      {/* --- MOBILE BOTTOM TAB BAR --- */}
      {isMobile && !editingQuote && (
        <div id="mobile-bottom-tabs" className="fixed bottom-0 left-0 right-0 z-[999] bg-white border-t border-gray-200 flex justify-around items-center py-2.5 shadow-[0_-4px_10px_rgba(0,0,0,0.06)] md:hidden">
          <button
            type="button"
            onClick={() => setActiveMainTab('calendar')}
            className={`flex flex-col items-center justify-center p-2 cursor-pointer transition-all ${
              activeMainTab === 'calendar' ? 'text-amber-600 font-extrabold scale-105' : 'text-gray-400 font-medium'
            }`}
          >
            <Calendar className="w-5.5 h-5.5 text-amber-500" />
            <span className="text-[10px] mt-0.5">行事曆</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab('contracts')}
            className={`flex flex-col items-center justify-center p-2 cursor-pointer transition-all ${
              activeMainTab === 'contracts' ? 'text-amber-600 font-extrabold scale-105' : 'text-gray-400 font-medium'
            }`}
          >
            <FileText className="w-5.5 h-5.5 text-amber-600" />
            <span className="text-[10px] mt-0.5">合約報價</span>
          </button>
          {currentUser?.role === 'admin' && (
            <button
              type="button"
              onClick={() => setActiveMainTab('payments')}
              className={`flex flex-col items-center justify-center p-2 cursor-pointer transition-all ${
                activeMainTab === 'payments' ? 'text-amber-600 font-extrabold scale-105' : 'text-gray-400 font-medium'
              }`}
            >
              <Coins className="w-5.5 h-5.5 text-amber-500" />
              <span className="text-[10px] mt-0.5">收款進度</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveMainTab('settings')}
            className={`flex flex-col items-center justify-center p-2 cursor-pointer transition-all ${
              activeMainTab === 'settings' ? 'text-amber-600 font-extrabold scale-105' : 'text-gray-400 font-medium'
            }`}
          >
            <Settings className="w-5.5 h-5.5 text-amber-500" />
            <span className="text-[10px] mt-0.5">系統設定</span>
          </button>
        </div>
      )}
    </div>
  );
}
