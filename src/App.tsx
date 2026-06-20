import React, { useState, useEffect, useMemo, useRef, ChangeEvent } from 'react';
import { 
  Plus, Search, FileText, Settings, RefreshCw, Edit, Trash2, 
  Copy, Printer, Download, Upload, X, Save, PlusCircle, Check, 
  AlertTriangle, ChevronDown, ChevronUp, BookOpen, Coins, FileSpreadsheet,
  CheckCircle, FileJson, Info, Share2, Eye, History
} from 'lucide-react';
import { Quotation, QuotationItem, QuotationStatus, StandardItem, QuoteSettings, BackupData, PaymentStage } from './types';
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
  }
];

const APP_CURRENT_VERSION = APP_CHANGELOG.length > 0 
  ? APP_CHANGELOG[APP_CHANGELOG.length - 1].version 
  : '1.43';


export default function App() {
  // --- STATE DECLARATIONS ---
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [standardItems, setStandardItems] = useState<Record<string, StandardItem[]>>(DEFAULT_STANDARD_ITEMS);
  const [settings, setSettings] = useState<QuoteSettings>(DEFAULT_SETTINGS);
  
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

  // --- DUAL STORAGE INITIALIZATION & SYNC ---
  useEffect(() => {
    // Synchronize IndexedDB and localStorage for a specific key
    const resolveSyncValue = async <T,>(
      localStorageKey: string,
      indexedDBKey: string,
      defaultValue: T
    ): Promise<{ data: T, timestamp: number }> => {
      // 1. Get localStorage value and timestamp
      let lsData: T | null = null;
      let lsTime = 0;
      try {
        const stored = localStorage.getItem(localStorageKey);
        if (stored) {
          lsData = JSON.parse(stored);
          const storedTime = localStorage.getItem(`${localStorageKey}_time`);
          // If there's data but no timestamp, we assume it's pre-existing, so set timestamp to Date.now() to bootstrap
          lsTime = storedTime ? parseInt(storedTime, 10) : Date.now();
        }
      } catch (e) {
        console.error(`Error reading ${localStorageKey} from localStorage`, e);
      }

      // 2. Get IndexedDB value and timestamp
      let idbRecord = null;
      try {
        idbRecord = await dbGet(indexedDBKey);
      } catch (e) {
        console.error(`Error reading ${indexedDBKey} from IndexedDB`, e);
      }

      const idbData = idbRecord ? (idbRecord.data as T) : null;
      const idbTime = idbRecord ? idbRecord.updatedAt : 0;

      // 3. Last-Write-Wins Comparison
      if (lsData && (!idbData || lsTime >= idbTime)) {
        // localStorage is newer or same-age, or IndexedDB is empty
        // Sync localStorage to IndexedDB
        try {
          await dbSet(indexedDBKey, lsData, lsTime);
          localStorage.setItem(`${localStorageKey}_time`, lsTime.toString());
        } catch (e) {
          console.error(`Error syncing ${localStorageKey} to IndexedDB`, e);
        }
        return { data: lsData, timestamp: lsTime };
      } else if (idbData && (!lsData || idbTime > lsTime)) {
        // IndexedDB is newer
        // Sync IndexedDB to localStorage
        try {
          localStorage.setItem(localStorageKey, JSON.stringify(idbData));
          localStorage.setItem(`${localStorageKey}_time`, idbTime.toString());
        } catch (e) {
          console.error(`Error syncing ${indexedDBKey} to localStorage`, e);
        }
        return { data: idbData, timestamp: idbTime };
      } else {
        // Both are empty, use default
        const bootstrapTime = Date.now();
        try {
          localStorage.setItem(localStorageKey, JSON.stringify(defaultValue));
          localStorage.setItem(`${localStorageKey}_time`, bootstrapTime.toString());
          await dbSet(indexedDBKey, defaultValue, bootstrapTime);
        } catch (e) {
          console.error(`Error bootstrapping defaults for ${localStorageKey}`, e);
        }
        return { data: defaultValue, timestamp: bootstrapTime };
      }
    };

    async function initDualStorage() {
      try {
        const syncQuotesRes = await resolveSyncValue('artisan_quotes', 'quotes', [] as Quotation[]);
        setQuotations(syncQuotesRes.data);

        const syncCategoriesRes = await resolveSyncValue('artisan_categories', 'categories', DEFAULT_CATEGORIES);
        setCategories(syncCategoriesRes.data);

        const syncLibraryRes = await resolveSyncValue('artisan_library', 'library', DEFAULT_STANDARD_ITEMS);
        setStandardItems(syncLibraryRes.data);

        const syncSettingsRes = await resolveSyncValue('artisan_settings', 'settings', DEFAULT_SETTINGS);
        let settingsData = syncSettingsRes.data;
        if (settingsData.defaultTerms && settingsData.defaultTerms.includes('小額錢債審裁處')) {
          settingsData = { ...settingsData, defaultTerms: DEFAULT_SETTINGS.defaultTerms };
          const now = Date.now();
          await dbSet('settings', settingsData, now);
          localStorage.setItem('artisan_settings', JSON.stringify(settingsData));
          localStorage.setItem('artisan_settings_time', now.toString());
        }
        setSettings(settingsData);
      } catch (e) {
        console.error("Error initializing dual storage", e);
      }
    }

    initDualStorage();
  }, []);

  // Sync state to local storage and IndexedDB helper
  const syncQuotes = (newQuotes: Quotation[]) => {
    setQuotations(newQuotes);
    const now = Date.now();
    localStorage.setItem('artisan_quotes', JSON.stringify(newQuotes));
    localStorage.setItem('artisan_quotes_time', now.toString());
    dbSet('quotes', newQuotes, now).catch(err => console.error("Error setting IndexedDB quotes", err));
  };

  const syncLibrary = (newLibrary: Record<string, StandardItem[]>) => {
    setStandardItems(newLibrary);
    const now = Date.now();
    localStorage.setItem('artisan_library', JSON.stringify(newLibrary));
    localStorage.setItem('artisan_library_time', now.toString());
    dbSet('library', newLibrary, now).catch(err => console.error("Error setting IndexedDB library", err));
  };

  const syncCategories = (newCategories: string[]) => {
    setCategories(newCategories);
    const now = Date.now();
    localStorage.setItem('artisan_categories', JSON.stringify(newCategories));
    localStorage.setItem('artisan_categories_time', now.toString());
    dbSet('categories', newCategories, now).catch(err => console.error("Error setting IndexedDB categories", err));
  };

  const syncSettings = (newSettings: QuoteSettings) => {
    setSettings(newSettings);
    const now = Date.now();
    localStorage.setItem('artisan_settings', JSON.stringify(newSettings));
    localStorage.setItem('artisan_settings_time', now.toString());
    dbSet('settings', newSettings, now).catch(err => console.error("Error setting IndexedDB settings", err));
  };

  // Synchronizes the current active editingQuote's modifications directly to the quotation list in state & storage
  const updateEditingQuoteStateAndSync = (updatedQuote: Quotation) => {
    setEditingQuote(updatedQuote);
    
    // Check if we can find the matching contract using originalQuoteId
    const index = originalQuoteId ? quotations.findIndex(q => q.id === originalQuoteId) : -1;
    let updatedQuotes: Quotation[];
    
    if (index >= 0) {
      updatedQuotes = [...quotations];
      updatedQuotes[index] = updatedQuote;
    } else {
      // Fallback: If originalQuoteId is null or not found, check if it already exists by the new ID
      const existsIdx = quotations.findIndex(q => q.id === updatedQuote.id);
      if (existsIdx >= 0) {
        updatedQuotes = [...quotations];
        updatedQuotes[existsIdx] = updatedQuote;
      } else {
        // If it doesn't exist yet, prepends it to the list
        updatedQuotes = [updatedQuote, ...quotations];
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
    setTimeout(() => {
      setNotification(null);
    }, 3000);
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
      balancePercent: 20
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
      id: editingQuote.id.trim()
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
      version: `${sourceQuote.version || 'v1.0'} (複本)`
    };

    const updated = [cloned, ...quotations];
    syncQuotes(updated);
    showToast('報價單複製成功，已生成新一頁草稿');
  };

  // Fast Update Status on Row
  const handleUpdateStatus = (id: string, newStatus: QuotationStatus) => {
    const updated = quotations.map(q => {
      if (q.id === id) {
        return { ...q, status: newStatus };
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
      <div className={`flex flex-col ${isPrintMode ? 'w-full' : 'gap-8 w-full max-w-[210mm]'} text-black font-sans leading-relaxed text-[11px]`}>
        {/* ================= DYNAMIC ITEM PAGES ================= */}
        {itemPages.map((pageNodes, X) => {
          const spacing = getPageSpacing(pageNodes.length);
          return (
            <div 
              key={`page-${X}`} 
              className={`bg-white p-[15mm] flex flex-col justify-between ${isPrintMode ? 'border-none p-[15mm] shadow-none m-0 rounded-none w-full' : 'shadow-2xl border border-gray-300 rounded-sm w-full'}`} 
              style={{ minHeight: '297mm', pageBreakAfter: 'always' }}
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
                        <p className="text-[9px] text-amber-700 font-bold tracking-widest mt-0.5 uppercase text-left text-left">QUOTATION</p>
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
                      <col style={{ width: '6.5%' }} />
                      <col style={{ width: '51.5%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '13%' }} />
                      <col style={{ width: '13%' }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-slate-100 border-b border-gray-300">
                        <th className="p-1 border-r border-gray-300 font-bold text-gray-700 text-center">編號</th>
                        <th className="p-1 border-r border-gray-300 font-bold text-gray-700">項目描述</th>
                        <th className="p-1 border-r border-gray-300 font-bold text-gray-700 text-center">數量</th>
                        <th className="p-1 border-r border-gray-300 font-bold text-gray-700 text-center">單位</th>
                        <th className="p-1 border-r border-gray-300 font-bold text-gray-700 text-right">單價(HKD)</th>
                        <th className="p-1 font-bold text-gray-700 text-right">金額(HKD)</th>
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
                              <td className={`${spacing.tdPadding} text-right font-mono font-black text-slate-900 bg-slate-100 leading-tight`}>HK${node.subtotal?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                          );
                        } else {
                          const item = node.item!;
                          return (
                            <tr key={node.key} className="border-b border-gray-200 hover:bg-slate-50">
                              <td className={`${spacing.tdPadding} border-r border-gray-300 text-center font-mono text-gray-500 leading-tight break-words`}>{item.indexOnPageList}</td>
                              <td className={`${spacing.tdPadding} border-r border-gray-300 text-left break-words whitespace-normal`}>
                                <div className={`font-bold text-gray-900 leading-tight ${spacing.fontSize} break-words whitespace-normal`}>{item.name}</div>
                                {item.remark && (
                                  <div className={`text-gray-500 whitespace-pre-wrap mt-0.5 leading-tight bg-slate-50 p-1 rounded ${spacing.remarkFontSize} break-words`}>{item.remark}</div>
                                )}
                              </td>
                              <td className={`${spacing.tdPadding} border-r border-gray-300 text-center font-mono leading-tight break-words`}>{item.quantity}</td>
                              <td className={`${spacing.tdPadding} border-r border-gray-300 text-center leading-tight break-words`}>{item.unit}</td>
                              <td className={`${spacing.tdPadding} border-r border-gray-300 text-right font-mono text-gray-600 leading-tight break-words`}>HK${item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className={`${spacing.tdPadding} text-right font-mono font-bold text-slate-900 leading-tight break-words`}>HK${(item.quantity * item.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
          className={`bg-white p-[15mm] flex flex-col justify-between ${isPrintMode ? 'border-none p-[15mm] shadow-none m-0 rounded-none w-full' : 'shadow-2xl border border-gray-300 rounded-sm w-full'}`} 
          style={{ minHeight: '297mm' }}
        >
          <div>
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
            <div className="mb-4">
              <h4 className="bg-slate-800 text-white font-bold text-[9.5px] py-1 px-2.5 rounded mb-2 flex items-center justify-between">
                <span>付款條款 (Payment Schedule Breakdown)</span>
                <span className="text-[8px] text-amber-400">依工程合約進度支付款項</span>
              </h4>
              <table className="w-full table-fixed text-left border-collapse border border-gray-300 text-[8.5px]">
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
                      <td className="p-1 border-r border-gray-300 font-bold text-left break-words">{stage.name}</td>
                      <td className="p-1 border-r border-gray-300 text-center font-mono break-words">{stage.percent}%</td>
                      <td className="p-1 border-r border-gray-300 text-right font-mono font-bold break-words">HK${stage.val.toLocaleString()}</td>
                      <td className="p-1 text-gray-500 pl-3 text-left break-words">{stage.remark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Contract rules 1 - 22 (Full width layout sequential downwards to prevent overflow) */}
            <div className="mb-3">
              <h4 className="bg-[#E07A5F]/15 text-[#E07A5F] font-bold text-[9px] py-0.5 px-2.5 rounded mb-1.5 border-l-4 border-[#E07A5F] text-left">
                合約條款 (Contract Terms & Clauses)
              </h4>
              <div className="flex flex-col gap-0.5 text-[8.5px] leading-normal text-gray-700 text-justify w-full">
                {(() => {
                  const termsList = (quote.remarks || settings.defaultTerms).split('\n').filter(line => line.trim() !== '');
                  return termsList.map((line, idx) => (
                    <div key={idx} className="pl-0.5 text-left w-full font-medium text-gray-700">
                      {line}
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Signatures segment */}
            <div className="grid grid-cols-2 gap-8 mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 relative">
              {/* Client Confirmation */}
              <div className="space-y-6 text-left">
                <h5 className="font-black text-slate-800 text-[10px] border-b border-gray-200 pb-1">客戶確認 (Client Confirmation)</h5>
                <div className="space-y-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8.5px] text-gray-400">客戶簽署 (Signature)：</span>
                    <div className="border-b border-gray-400 w-44 h-8"></div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8.5px] text-gray-400">簽署日期 (Date)：</span>
                    <div className="border-b border-gray-400 w-44 h-5"></div>
                  </div>
                </div>
              </div>

              {/* Company confirmation */}
              <div className="space-y-6 border-l border-slate-200 pl-8 text-left">
                <h5 className="font-black text-slate-800 text-[10px] border-b border-gray-200 pb-1">公司確認 (Artisan Studio)</h5>
                <div className="space-y-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8.5px] text-gray-400">代表簽名及蓋印 (Representative Signature)：</span>
                    <div className="border-b border-gray-400 w-44 h-8"></div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8.5px] text-gray-400">簽署日期 (Date)：</span>
                    <div className="border-b border-gray-400 w-44 h-5"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bank accounts information section fixed bottom */}
          <div className="mt-4 pt-2 border-t-2 border-gray-900 space-y-3">
            <div className="bg-slate-50 rounded-lg p-2 border border-slate-200 grid grid-cols-2 gap-x-6 gap-y-1 text-[9px] text-left">
              <div>
                <span className="font-bold text-gray-400">往來專用款項銀行：</span>
                <span className="text-slate-800 font-semibold">{settings.bankName || '中國銀行（香港）'}</span>
              </div>
              <div>
                <span className="font-bold text-gray-400">往來收款人全體：</span>
                <span className="text-slate-800 font-semibold">{settings.companyName || 'Artisan Studio Limited'}</span>
              </div>
              <div>
                <span className="font-bold text-gray-400">官方指定帳戶號碼：</span>
                <span className="text-slate-800 font-semibold font-mono">{settings.bankAccount || '012-586-2-109941-2'}</span>
              </div>
              <div>
                <span className="font-bold text-gray-400">轉數快 ID (FPS ID)：</span>
                <span className="text-amber-700 font-black font-mono text-[9px]">{settings.fpsId || '121966964'}</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-[8px] text-gray-400 font-mono border-t border-gray-200 pt-2">
              <span>© Artisan Studio Limited ． EST. 2026 ． REGULATED IN HK SAR</span>
              <span>第 {totalPages} 頁，共 {totalPages} 頁</span>
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

  return (
    <div id="applet-container" className="min-h-screen bg-[#F5F5F0] text-gray-800 font-sans antialiased pb-24">
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
        <div className="hidden print:block fixed inset-0 bg-white text-black p-0 z-[9999] overflow-y-auto font-sans leading-relaxed">
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

      {/* --- STANDARD SCREEN DESKTOP LAYOUT --- */}
      <div className="print:hidden">
        {/* Toast notifications */}
        {notification && (
          <div className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-lg shadow-xl animate-bounce">
            {notification.type === 'success' && <Check className="text-emerald-500 w-5 h-5" />}
            {notification.type === 'error' && <AlertTriangle className="text-rose-500 w-5 h-5" />}
            <span className="text-sm font-medium">{notification.message}</span>
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

            {/* Middle Online Action Badge */}
            <div className="flex items-center gap-2.5">
              <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                <span>{isOnline ? '在線' : '離線模式'}</span>
              </div>
              
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
              <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-500" />
                  <div>
                    <h3 className="font-bold text-base">
                      {isEditingNew ? '新購置裝修工程合約：草稿編制' : `編輯報價合約：${editingQuote.id}`}
                    </h3>
                    <p className="text-2xs text-gray-400 mt-0.5">離線狀態安全。修改儲存即寫入 PWA 硬碟快取</p>
                  </div>
                </div>
                <button 
                  onClick={handleExitEditing}
                  className="p-1 hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                  title="退出草稿"
                >
                  <X className="w-5 h-5 text-gray-300" />
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
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">裝修施工地址</label>
                  <input 
                    type="text" 
                    placeholder="施工樓宇地段、層室詳細地址" 
                    value={editingQuote.address}
                    onChange={(e) => setEditingQuote({...editingQuote, address: e.target.value})}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-600"
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



              </div>

              {/* Items Management list (Grouped by Category) */}
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
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateItemField(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                  className="w-full px-1 py-1 border border-gray-200 rounded text-center text-xs font-mono focus:outline-amber-600"
                                />
                              </div>

                              {/* Unit Price */}
                              <div className="col-span-1 md:col-span-1">
                                <input 
                                  type="number"
                                  value={item.unitPrice}
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
                                  onClick={() => handleExportQuoteCSV(quote)}
                                  className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded cursor-pointer transition-colors"
                                  title="匯出 Excel / CSV 封包"
                                >
                                  <FileSpreadsheet className="w-4 h-4" />
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
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-100">
              
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
                  頁腳與帳戶管理
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
                                加密合細項庫
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
                    <div className="bg-slate-900 text-emerald-500 p-4 rounded-xl font-mono text-2xs overflow-x-auto max-h-[40vh] space-y-1">
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
        <footer className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 text-gray-400 py-3 px-6 z-30 shadow-2xl flex flex-col md:flex-row items-center justify-between text-xs font-semibold select-none gap-2 md:gap-0">
          <div className="flex items-center gap-2.5 flex-wrap justify-center md:justify-start">
            <span className="w-2.5 h-2.5 bg-amber-600 rounded-sm shrink-0"></span>
            <span className="text-white shrink-0">裝修報價助手</span>
            <span className="text-[11px] text-amber-500 font-mono font-bold bg-slate-800 px-2 py-0.5 rounded border border-slate-700 shrink-0">
              V{APP_CURRENT_VERSION}
            </span>
            <button
              onClick={() => setIsChangelogOpen(true)}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-650 text-amber-500 hover:text-amber-400 transition-colors rounded text-[10px] font-bold border border-slate-705/80 cursor-pointer flex items-center gap-1 shrink-0"
              title="檢視詳細歷史更新紀錄"
            >
              <Info className="w-3 h-3" /> 更新詳情
            </button>
            <span className="text-gray-500 text-[10px] hidden sm:inline shrink-0">|</span>
            <span className="text-gray-400 text-[11px] shrink-0">製作人: WHLEE</span>
            <span className="text-gray-500 text-[10px] hidden sm:inline shrink-0">|</span>
            <span className="text-gray-500 text-[10px] shrink-0">© 2026 WHLEE. All Rights Reserved.</span>
          </div>
          <div className="flex gap-4 items-center justify-center">
            <button 
              onClick={() => {
                setIsSettingsOpen(true);
                setSettingsTab('backup');
              }}
              className="hover:text-amber-500 flex items-center gap-1 text-xs cursor-pointer transition-colors"
            >
              <Upload className="w-3.5 h-3.5" /> 匯入還原
            </button>
            <span className="text-slate-800">|</span>
            <button 
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
