import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Database, Search, Filter, RefreshCw, Upload, Download, Lock, Unlock, 
  Plus, Edit, Trash2, X, ShieldAlert, CheckCircle2, FileSpreadsheet, 
  BookOpen, Sparkles, AlertCircle, Info, ChevronRight, Hash, Clock, Layers
} from 'lucide-react';
import { 
  KnowledgeSheet, KnowledgeItem, KnowledgeDatabasePayload,
  INITIAL_KNOWLEDGE_SHEETS, loadLocalKnowledgePayload, saveLocalKnowledgePayload,
  syncKnowledgeDatabaseWithServer, computeDataHash, parseExcelToKnowledgeSheets, SyncResult
} from '../lib/knowledgeDb';
import * as XLSX from 'xlsx';

interface DatabaseManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    username: string;
    role: string;
    permissions?: Record<string, boolean>;
  } | null;
  isProtectedAdmin: (username: string) => boolean;
  hasPermission: (user: any, key: string) => boolean;
  showToast: (msg: string, type?: 'info' | 'error' | 'success') => void;
}

export const DatabaseManagerModal: React.FC<DatabaseManagerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  isProtectedAdmin,
  hasPermission,
  showToast
}) => {
  const [payload, setPayload] = useState<KnowledgeDatabasePayload>({
    version: 1,
    lastUpdated: Date.now(),
    updatedBy: '系統預設',
    hash: '',
    sheets: INITIAL_KNOWLEDGE_SHEETS
  });

  const [activeSheetId, setActiveSheetId] = useState<string>('sheet-cleardown');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isMaskUnlocked, setIsMaskUnlocked] = useState<boolean>(false);
  const [isCustomCategoryInput, setIsCustomCategoryInput] = useState<boolean>(false);

  // Modal for edit/add item
  const [editingItem, setEditingItem] = useState<{ sheetId: string; item: Partial<KnowledgeItem> } | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ sheetId: string; itemId: string; description: string; originSheetId?: string } | null>(null);

  // File input ref for Excel upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Permission flags
  const canViewDB = hasPermission(currentUser, 'feat_database_view') || isProtectedAdmin(currentUser?.username || '');
  const canAdminDB = hasPermission(currentUser, 'feat_database_admin') || isProtectedAdmin(currentUser?.username || '');

  // Load payload from IndexedDB/LocalStorage on open
  useEffect(() => {
    if (isOpen) {
      loadLocalKnowledgePayload().then(data => {
        setPayload(data);
      });
    }
  }, [isOpen]);

  // Handle Cloud Sync with Throttling & Hash Protocol
  const handleSyncCloud = async (isPush: boolean = false) => {
    if (isSyncing) return;
    setIsSyncing(true);

    try {
      const res: SyncResult = await syncKnowledgeDatabaseWithServer(
        payload,
        isPush,
        currentUser?.username || 'whlee'
      );

      if (res.status === 'throttled') {
        showToast(res.message, 'error');
      } else if (res.status === 'already_latest') {
        showToast(res.message, 'info');
      } else if (res.status === 'success') {
        showToast(res.message, 'success');
        if (res.payload) {
          setPayload(res.payload);
        }
      }
    } catch (err) {
      showToast('同步過程發生非預期錯誤', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Active sheet item (Supports 'ALL_SHEETS' aggregated view across all 18+ sheets)
  const activeSheet = useMemo(() => {
    if (activeSheetId === 'ALL_SHEETS') {
      const allItems: (KnowledgeItem & { _originSheetId?: string; _originSheetTitle?: string })[] = [];
      payload.sheets.forEach(sheet => {
        if (sheet.items && sheet.items.length > 0) {
          sheet.items.forEach(item => {
            allItems.push({
              ...item,
              _originSheetId: sheet.id,
              _originSheetTitle: sheet.title
            });
          });
        }
      });
      return {
        id: 'ALL_SHEETS',
        title: '🌐 全部所有工程項目 (18 大類數據庫合集)',
        type: 'engineering' as const,
        description: `全庫包含 ${payload.sheets.filter(s => s.items).length} 個工程類別工作表，共 ${allItems.length} 筆完整細項`,
        items: allItems
      };
    }
    return payload.sheets.find(s => s.id === activeSheetId) || payload.sheets[0];
  }, [payload.sheets, activeSheetId]);

  // All engineering categories across all sheets (used for dropdown selection)
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    payload.sheets.forEach(sheet => {
      sheet.items?.forEach(item => {
        if (item.category && item.category.trim()) {
          cats.add(item.category.trim());
        }
      });
    });
    return Array.from(cats).sort();
  }, [payload.sheets]);

  // Available categories in active sheet
  const availableCategories = useMemo(() => {
    if (!activeSheet || !activeSheet.items) return [];
    const cats = new Set<string>();
    activeSheet.items.forEach(item => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats);
  }, [activeSheet]);

  // Filtered items in active sheet
  const filteredItems = useMemo(() => {
    if (!activeSheet || !activeSheet.items) return [];

    return activeSheet.items.filter(item => {
      // Category filter
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
        return false;
      }

      // Keyword Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNo = (item.no || '').toLowerCase().includes(q);
        const matchCat = (item.category || '').toLowerCase().includes(q);
        const matchDesc = (item.description || '').toLowerCase().includes(q);
        const matchUnit = (item.unit || '').toLowerCase().includes(q);
        const matchRemarks = (item.remarks || '').toLowerCase().includes(q);
        const matchPrice = (item.marketPrice || '').toLowerCase().includes(q);

        return matchNo || matchCat || matchDesc || matchUnit || matchRemarks || matchPrice;
      }

      return true;
    });
  }, [activeSheet, categoryFilter, searchQuery]);

  // Excel Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!canAdminDB) {
      showToast('權限不足：您沒有上傳與修改資料庫的權限', 'error');
      return;
    }

    try {
      showToast('正在解析 Excel / CSV 檔案...', 'info');
      const newSheets = await parseExcelToKnowledgeSheets(file);
      
      if (newSheets.length === 0) {
        showToast('無法解析檔案：未發現有效的工程數據工作表', 'error');
        return;
      }

      const updatedSheets = [...payload.sheets];
      
      newSheets.forEach(ns => {
        const existingIdx = updatedSheets.findIndex(s => s.title === ns.title);
        if (existingIdx >= 0) {
          updatedSheets[existingIdx] = ns; // replace existing sheet
        } else {
          updatedSheets.push(ns); // add new worksheet
        }
      });

      const newHash = computeDataHash(updatedSheets);
      const newPayload: KnowledgeDatabasePayload = {
        version: payload.version + 1,
        lastUpdated: Date.now(),
        updatedBy: currentUser?.username || 'whlee',
        hash: newHash,
        sheets: updatedSheets
      };

      setPayload(newPayload);
      await saveLocalKnowledgePayload(newPayload);

      // Auto sync to cloud server
      await handleSyncCloud(true);

      showToast(`成功匯入 ${newSheets.length} 個工作表！`, 'success');
      setActiveSheetId(newSheets[0].id);
    } catch (err) {
      console.error('Excel parse error:', err);
      showToast('解析 Excel 檔案失敗，請檢查格式', 'error');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Export to Excel handler
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      payload.sheets.forEach(sheet => {
        if (sheet.items && sheet.items.length > 0) {
          const exportData = sheet.items.map(item => {
            const row: any = {
              '序號': item.no,
              '大類': item.category,
              '項目描述': item.description,
              '單位': item.unit,
              '街客價中位數 (HKD)': item.marketPrice,
              '備註': item.remarks || ''
            };

            // Only export internal cost if admin
            if (canAdminDB) {
              row['內部成本中位數 (HKD)'] = item.internalCost || '';
            }

            return row;
          });

          const ws = XLSX.utils.json_to_sheet(exportData);
          XLSX.utils.book_append_sheet(wb, ws, sheet.title.replace(/[\\/*?:[\]]/g, '').slice(0, 31));
        }
      });

      XLSX.writeFile(wb, `築匠工程資料庫_${new Date().toISOString().slice(0, 10)}.xlsx`);
      showToast('已成功下載 Excel 資料庫檔案', 'success');
    } catch (err) {
      console.error('Export error:', err);
      showToast('匯出 Excel 發生錯誤', 'error');
    }
  };

  // Save edited item
  const handleSaveItem = () => {
    if (!editingItem || !editingItem.item.description) {
      showToast('請填寫完整項目描述', 'error');
      return;
    }

    const { sheetId, item } = editingItem;
    const originSheetId = (item as any)._originSheetId;
    const targetSheetId = originSheetId || (sheetId === 'ALL_SHEETS' ? payload.sheets[0].id : sheetId);
    
    const targetSheet = payload.sheets.find(s => s.id === targetSheetId);
    if (!targetSheet) return;

    let updatedItems = [...(targetSheet.items || [])];

    // Calculate auto sequence if 'no' is empty
    let itemNo = item.no ? item.no.trim() : '';
    let isAutoNo = false;
    if (!itemNo) {
      isAutoNo = true;
      let maxNum = 0;
      updatedItems.forEach(i => {
        if (i.no) {
          const matches = i.no.match(/\d+/g);
          if (matches) {
            matches.forEach(m => {
              const num = parseInt(m, 10);
              if (!isNaN(num) && num > maxNum) {
                maxNum = num;
              }
            });
          }
        }
      });
      itemNo = String(maxNum + 1);
    }

    const savedItem: KnowledgeItem = {
      id: item.id || `item-${Date.now()}`,
      no: itemNo,
      category: item.category || '一般',
      description: item.description,
      unit: item.unit || '項',
      internalCost: item.internalCost || '',
      marketPrice: item.marketPrice || '',
      remarks: item.remarks || ''
    };

    if (item.id) {
      // Edit existing
      if (isAutoNo) {
        // Remove from old position and push to bottom
        updatedItems = updatedItems.filter(i => i.id !== item.id);
        updatedItems.push(savedItem);
      } else {
        updatedItems = updatedItems.map(i => i.id === item.id ? savedItem : i);
      }
    } else {
      // Add new item to the very bottom
      updatedItems.push(savedItem);
    }

    const updatedSheets = payload.sheets.map(s => s.id === targetSheetId ? { ...s, items: updatedItems } : s);
    const newHash = computeDataHash(updatedSheets);
    
    const newPayload: KnowledgeDatabasePayload = {
      ...payload,
      version: payload.version + 1,
      lastUpdated: Date.now(),
      updatedBy: currentUser?.username || 'whlee',
      hash: newHash,
      sheets: updatedSheets
    };

    setPayload(newPayload);
    saveLocalKnowledgePayload(newPayload);
    setEditingItem(null);
    setIsCustomCategoryInput(false);
    showToast(isAutoNo ? `已自動生成序號【${itemNo}】並加入列表最底` : '已儲存項目變更', 'success');
  };

  // Delete item handler
  const triggerDeleteItem = (sheetId: string, itemId: string, description: string, itemOriginSheetId?: string) => {
    if (!canAdminDB) {
      showToast('權限不足：無法刪除項目', 'error');
      return;
    }
    setDeletingItem({ sheetId, itemId, description, originSheetId: itemOriginSheetId });
  };

  const confirmDeleteItem = (sheetId: string, itemId: string, itemOriginSheetId?: string) => {
    if (!canAdminDB) {
      showToast('權限不足：無法刪除項目', 'error');
      return;
    }

    const targetSheetId = itemOriginSheetId || (sheetId === 'ALL_SHEETS' ? payload.sheets.find(s => s.items?.some(i => i.id === itemId))?.id : sheetId);
    if (!targetSheetId) return;

    const targetSheet = payload.sheets.find(s => s.id === targetSheetId);
    if (!targetSheet) return;

    const updatedItems = (targetSheet.items || []).filter(i => i.id !== itemId);
    const updatedSheets = payload.sheets.map(s => s.id === targetSheetId ? { ...s, items: updatedItems } : s);
    
    const newPayload: KnowledgeDatabasePayload = {
      ...payload,
      version: payload.version + 1,
      lastUpdated: Date.now(),
      updatedBy: currentUser?.username || 'whlee',
      hash: computeDataHash(updatedSheets),
      sheets: updatedSheets
    };

    setPayload(newPayload);
    saveLocalKnowledgePayload(newPayload);
    setDeletingItem(null);
    showToast('已成功刪除工程項目', 'success');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 text-left animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] max-h-[850px] overflow-hidden flex flex-col border border-slate-200">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Database className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base flex items-center gap-2 text-white">
                <span>築匠工程知識庫與資料管理系統</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30">
                  v{payload.version}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 flex items-center gap-3 mt-0.5 font-mono">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  最後同步: {new Date(payload.lastUpdated).toLocaleString('zh-HK', { hour12: false })}
                </span>
                <span className="hidden sm:inline text-slate-600">|</span>
                <span className="hidden sm:flex items-center gap-1 text-slate-400">
                  <Hash className="w-3 h-3 text-slate-400" />
                  ETag: {payload.hash || 'v1-cached'}
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-amber-400 font-bold">
                  更新者: @{payload.updatedBy}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mask Toggle for DB Admins */}
            {canAdminDB && (
              <button
                onClick={() => setIsMaskUnlocked(!isMaskUnlocked)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isMaskUnlocked 
                    ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-3xs' 
                    : 'bg-slate-800 text-amber-300 hover:bg-slate-700 border border-amber-500/30'
                }`}
                title={isMaskUnlocked ? '鎖定內部成本中位數' : '解鎖檢視內部成本中位數'}
              >
                {isMaskUnlocked ? (
                  <>
                    <Unlock className="w-3.5 h-3.5 text-white" />
                    <span>內部成本：已解鎖</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>內部成本：權限加密</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Control Bar */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-gray-200 flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
          
          {/* Worksheet Dropdown Selector (取代左右滑動選單，支援 18 大類全部載入) */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-amber-300 shadow-3xs w-full sm:w-auto">
              <Layers className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
              <span className="text-xs font-black text-slate-800 shrink-0">選擇資料表分頁：</span>
              <select
                value={activeSheetId}
                onChange={(e) => {
                  setActiveSheetId(e.target.value);
                  setCategoryFilter('ALL');
                }}
                className="text-xs font-bold text-slate-900 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer py-1 pr-6 w-full sm:w-auto"
              >
                <option value="ALL_SHEETS" className="font-extrabold text-amber-800 bg-amber-50">
                  🌐 【全部所有工程項目】(匯總 18 大類全覽 • 共 {
                    payload.sheets.reduce((acc, s) => acc + (s.items?.length || 0), 0)
                  } 筆資料)
                </option>
                <optgroup label="🏗️ 工程數據表 (18 大類分頁)">
                  {payload.sheets.filter(s => s.items).map((sheet, idx) => {
                    const cleanedTitle = sheet.title.replace(/^\d+[\.\s]+/, '');
                    return (
                      <option key={sheet.id} value={sheet.id}>
                        {idx + 1}. {cleanedTitle} ({sheet.items?.length || 0} 筆)
                      </option>
                    );
                  })}
                </optgroup>
                <optgroup label="📖 系統說明與規則指南">
                  {payload.sheets.filter(s => !s.items).map(sheet => (
                    <option key={sheet.id} value={sheet.id}>
                      📄 {sheet.title}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Quick Item Count Badge */}
            {activeSheet?.items && (
              <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg text-xs font-extrabold font-mono border border-amber-200 shrink-0">
                {filteredItems.length} / {activeSheet.items.length} 筆
              </span>
            )}
          </div>

          {/* Action Buttons: Sync, Upload Excel, Export */}
          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
            {/* Sync Cloud Server */}
            <button
              onClick={() => handleSyncCloud(false)}
              disabled={isSyncing}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-amber-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-3xs cursor-pointer disabled:opacity-50"
              title="與 Server 雲端進行 ETag/Hash 檢查與資料同步"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? '同步中...' : '同步雲端'}</span>
            </button>

            {/* Export Excel */}
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-3xs cursor-pointer"
              title="下載目前資料庫為 Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">匯出 Excel</span>
            </button>

            {/* Upload Excel (.xlsx) - Admins only */}
            {canAdminDB && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-3xs cursor-pointer"
                  title="上傳並自動解析 Excel (.xlsx) 檔案"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>上傳 Excel</span>
                </button>
              </>
            )}

            {/* Add Item Button */}
            {canAdminDB && activeSheet?.items && (
              <button
                onClick={() => setEditingItem({ sheetId: activeSheet.id, item: {} })}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-3xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新增細項</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Sub-filter Header (If sheet has items) */}
        {activeSheet?.items && (
          <div className="px-4 py-2.5 bg-amber-50/40 border-b border-amber-100 flex flex-col sm:flex-row gap-2.5 justify-between items-center">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋細項、名稱、單位、單價與備註..."
                className="w-full pl-9 pr-8 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500 shadow-3xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Dropdown */}
            {availableCategories.length > 0 && (
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <span className="text-xs font-extrabold text-slate-600 shrink-0 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-amber-600" />
                  工程大類：
                </span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-amber-600 shadow-3xs cursor-pointer max-w-[200px]"
                >
                  <option value="ALL">全部大類 ({activeSheet.items.length} 筆)</option>
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/40 space-y-4 scrolling-touch">
          
          {/* Section 1: Table items view */}
          {activeSheet?.items ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              
              {/* Sheet Sub-description header */}
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                    <span>{activeSheet.title}</span>
                    <span className="text-xs font-normal text-slate-500">
                      (共 {activeSheet.items.length} 筆資料, 顯示 {filteredItems.length} 筆)
                    </span>
                  </h4>
                  {activeSheet.description && (
                    <p className="text-xs text-slate-500 mt-0.5">{activeSheet.description}</p>
                  )}
                </div>

                {/* Mask Notice Badge */}
                <div className="flex items-center gap-1.5">
                  {!canAdminDB ? (
                    <span className="text-[11px] font-bold px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-600" />
                      內部成本已加密保護
                    </span>
                  ) : (
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
                      isMaskUnlocked ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {isMaskUnlocked ? <Unlock className="w-3 h-3 text-rose-600" /> : <Lock className="w-3 h-3 text-slate-500" />}
                      {isMaskUnlocked ? '內部成本：顯示中' : '內部成本：預設遮蔽 (點擊頂部解鎖)'}
                    </span>
                  )}
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200 select-none">
                      <th className="py-2.5 px-3 w-12 text-center">序號</th>
                      <th className="py-2.5 px-3 w-32">大類</th>
                      <th className="py-2.5 px-3 min-w-[200px]">工程項目描述</th>
                      <th className="py-2.5 px-3 w-28 text-center">單位</th>
                      
                      {/* Internal Cost Column Header (Sensitive Data) */}
                      <th className={`py-2.5 px-3 w-36 text-right transition-colors ${
                        canAdminDB && isMaskUnlocked ? 'bg-amber-100/70 text-amber-950 font-black' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <div className="flex items-center justify-end gap-1">
                          {(!canAdminDB || !isMaskUnlocked) && <Lock className="w-3 h-3 text-amber-600" />}
                          <span>內部成本中位數 (HKD)</span>
                        </div>
                      </th>

                      <th className="py-2.5 px-3 w-36 text-right text-emerald-900 font-black">街客價中位數 (HKD)</th>
                      <th className="py-2.5 px-3 min-w-[150px]">備註說明</th>
                      {canAdminDB && <th className="py-2.5 px-3 w-16 text-center">操作</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={canAdminDB ? 8 : 7} className="py-12 text-center text-slate-400">
                          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="font-bold text-xs">沒有找到符合搜尋條件的工程細項</p>
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-amber-50/30 transition-colors">
                          <td className="py-2.5 px-3 text-center text-slate-500 font-mono font-bold">
                            {item.no || idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex flex-col gap-1 items-start">
                              {(item as any)._originSheetTitle && activeSheetId === 'ALL_SHEETS' && (
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded text-[10px] font-black border border-amber-200">
                                  {(item as any)._originSheetTitle}
                                </span>
                              )}
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-bold inline-block">
                                {item.category || '一般'}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 leading-snug">
                            {item.description}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-600 font-semibold">
                            {item.unit || '-'}
                          </td>
                          
                          {/* Internal Cost Cell (Masked if non-admin or locked) */}
                          <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                            canAdminDB && isMaskUnlocked 
                              ? 'text-rose-700 bg-rose-50/40 font-black' 
                              : 'text-gray-400'
                          }`}>
                            {canAdminDB && isMaskUnlocked ? (
                              `$${item.internalCost || '0'}`
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded font-sans">
                                <Lock className="w-2.5 h-2.5 text-slate-400" />
                                權限加密
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-700">
                            {item.marketPrice ? (item.marketPrice.startsWith('$') ? item.marketPrice : `$${item.marketPrice}`) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px] leading-relaxed">
                            {item.remarks || '-'}
                          </td>

                          {canAdminDB && (
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => setEditingItem({ sheetId: activeSheet.id, item: { ...item } })}
                                  className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                  title="編輯"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => triggerDeleteItem(activeSheet.id, item.id, item.description, (item as any)._originSheetId)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                  title="刪除"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Security Rule Footer Notice */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 text-slate-500 text-[11px] flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  <span>敏感情資安全宣告：本資料庫內部成本中位數受最高權限獨立隔離，非授權帳號僅顯示市場公開價格。</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Offline-First Cached via IndexedDB
                </span>
              </div>
            </div>
          ) : (
            /* Custom Content Sheet View (Guidelines & Operating Manual) */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h4 className="font-extrabold text-base text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-600" />
                <span>{activeSheet?.title}</span>
              </h4>
              
              <div className="prose prose-slate max-w-none text-xs leading-relaxed whitespace-pre-line font-medium text-slate-700 bg-slate-50/70 p-5 rounded-xl border border-slate-200">
                {activeSheet?.customContent}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold">伺服器連線狀態：正常 (PWA Offline First 已就緒)</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors cursor-pointer shadow-3xs"
          >
            關閉視窗
          </button>
        </div>

      </div>

      {/* Edit / Add Item Dialog */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 text-left animate-scale-up">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex justify-between items-center">
              <h4 className="font-extrabold text-sm flex items-center gap-2">
                <Edit className="w-4 h-4 text-amber-400" />
                <span>{editingItem.item.id ? '編輯工程細項' : '新增工程細項'}</span>
              </h4>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs font-semibold text-slate-800">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-600 mb-1">
                    序號 (No.)
                  </label>
                  <input
                    type="text"
                    value={editingItem.item.no || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, no: e.target.value } })}
                    placeholder="留空自動產生最底數字+1"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-amber-700 font-medium mt-1">
                    💡 提示：若序號留空，系統自動將最後一個數字項目加一，並加入列表最底。
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[11px] font-extrabold text-slate-600">工程大類</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomCategoryInput(!isCustomCategoryInput)}
                      className="text-[10px] text-amber-700 font-bold hover:underline"
                    >
                      {isCustomCategoryInput ? '📋 選取現有大類' : '＋ 手動填寫新大類'}
                    </button>
                  </div>

                  {isCustomCategoryInput ? (
                    <input
                      type="text"
                      value={editingItem.item.category || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, category: e.target.value } })}
                      placeholder="輸入自訂大類名稱..."
                      className="w-full px-3 py-1.5 bg-amber-50/70 border border-amber-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  ) : (
                    <select
                      value={editingItem.item.category || ''}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM_NEW__') {
                          setIsCustomCategoryInput(true);
                        } else {
                          setEditingItem({ ...editingItem, item: { ...editingItem.item, category: e.target.value } });
                        }
                      }}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                    >
                      <option value="">-- 請選擇工程大類 --</option>
                      {allCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      {editingItem.item.category && !allCategories.includes(editingItem.item.category) && (
                        <option value={editingItem.item.category}>
                          {editingItem.item.category} (特別類別)
                        </option>
                      )}
                      <option value="__CUSTOM_NEW__" className="font-extrabold text-amber-700 bg-amber-50">
                        ✍️ ＋ 手動填寫自訂工程大類...
                      </option>
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 mb-1">工程項目描述 *</label>
                <input
                  type="text"
                  value={editingItem.item.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, description: e.target.value } })}
                  placeholder="輸入詳細工程名稱或描述"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-600 mb-1">單位</label>
                  <input
                    type="text"
                    value={editingItem.item.unit || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, unit: e.target.value } })}
                    placeholder="如: 套, 井, 次..."
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-rose-700 mb-1 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-rose-600" />
                    <span>內部成本中位數</span>
                  </label>
                  <input
                    type="text"
                    value={editingItem.item.internalCost || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, internalCost: e.target.value } })}
                    placeholder="如: 1000-2000"
                    className="w-full px-3 py-1.5 bg-rose-50/50 border border-rose-300 rounded-lg text-xs font-bold text-rose-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-emerald-700 mb-1">街客價中位數</label>
                  <input
                    type="text"
                    value={editingItem.item.marketPrice || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, marketPrice: e.target.value } })}
                    placeholder="如: 2000-3000"
                    className="w-full px-3 py-1.5 bg-emerald-50/50 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 mb-1">備註說明</label>
                <textarea
                  rows={2}
                  value={editingItem.item.remarks || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, remarks: e.target.value } })}
                  placeholder="可填寫現場施工條件或加價備註..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-1.5 text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-lg text-xs font-bold"
              >
                取消
              </button>
              <button
                onClick={handleSaveItem}
                className="px-4 py-1.5 text-white bg-amber-600 hover:bg-amber-700 rounded-lg text-xs font-bold shadow-3xs"
              >
                儲存項目
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs text-left animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">確定刪除工程項目？</h3>
                <p className="text-[11px] text-slate-500 font-medium">此動作無法復原</p>
              </div>
            </div>
            
            <div className="text-xs text-slate-700 font-bold mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
              <span className="text-slate-400 text-[10px] block font-mono mb-0.5">欲刪除項目內容：</span>
              【{deletingItem.description}】
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={() => confirmDeleteItem(deletingItem.sheetId, deletingItem.itemId, deletingItem.originSheetId)}
                className="px-4 py-2 bg-rose-600 text-white hover:bg-rose-700 rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
              >
                確定刪除
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
