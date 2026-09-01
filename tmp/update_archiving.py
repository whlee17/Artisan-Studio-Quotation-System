import sys

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update APP_CHANGELOG
old_changelog = """    details: [
      '行動端日曆視覺純化 (Mobile Calendar Badge Optimization)：於手機/行動端 (Mobile View) 自動隱藏「🏖️ 放假」標籤 SPAN，保留精簡清爽的日期與粉紅外框提示，僅於電腦大螢幕 (Desktop View) 呈現放假文字標籤，精簡行動端空間。'
    ]
  }];"""

new_changelog = """    details: [
      '行動端日曆視覺純化 (Mobile Calendar Badge Optimization)：於手機/行動端 (Mobile View) 自動隱藏「🏖️ 放假」標籤 SPAN，保留精簡清爽的日期與粉紅外框提示，僅於電腦大螢幕 (Desktop View) 呈現放假文字標籤，精簡行動端空間。'
    ]
  },
  {
    version: '3.1.29',
    date: '2026-08-31',
    details: [
      '新增報價單「封存」功能 (Quotation Archiving System)：於報價單列表操作欄新增「封存」按鈕 (Archive Button)，允許將過期或無需常駐之報價單輕鬆移動至「已封存資料夾」。',
      '全新「已封存資料夾」分類頁籤：於報價單列表頂部加入封存專用 Tab 與獨立數據統計，使主列表維持乾淨清爽，遠離混亂與擁擠。',
      '智慧一鍵封存過期報價單 (Batch Archive Expired Quotes)：自動判別逾期30天或工期已結束之過期報價單，支援一鍵批次歸檔至封存資料夾，並可隨時一鍵解封復原。'
    ]
  }];"""

assert old_changelog in content, "old_changelog target not found"
content = content.replace(old_changelog, new_changelog, 1)

# 2. Update contractCategoryTab state type
old_tab_state = "const [contractCategoryTab, setContractCategoryTab] = useState<'active' | 'completed' | 'cancelled'>('active');"
new_tab_state = "const [contractCategoryTab, setContractCategoryTab] = useState<'active' | 'completed' | 'cancelled' | 'archived'>('active');"

assert old_tab_state in content, "old_tab_state target not found"
content = content.replace(old_tab_state, new_tab_state, 1)

# 3. Helper isQuoteExpired, counts, and filteredQuotations
old_counts = """  // Category counts for quotation directory tabs
  const activeQuotesCount = useMemo(() => quotations.filter(q => q.status !== 'completed' && q.status !== 'cancelled').length, [quotations]);
  const completedQuotesCount = useMemo(() => quotations.filter(q => q.status === 'completed').length, [quotations]);
  const cancelledQuotesCount = useMemo(() => quotations.filter(q => q.status === 'cancelled').length, [quotations]);"""

new_counts = """  // Helper to determine if a quotation is expired
  const isQuoteExpired = (quote: Quotation): boolean => {
    if (quote.isArchived) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (quote.endDate) {
      const endObj = new Date(quote.endDate + 'T23:59:59');
      if (!isNaN(endObj.getTime()) && endObj < today && quote.status !== 'signed' && quote.status !== 'constructing' && quote.status !== 'completed') {
        return true;
      }
    }

    if (quote.date) {
      const qDate = new Date(quote.date + 'T00:00:00');
      if (!isNaN(qDate.getTime())) {
        const diffDays = Math.floor((today.getTime() - qDate.getTime()) / (1000 * 60 * 60 * 24));
        if ((quote.status === 'pending' || quote.status === 'quoted') && diffDays >= 30) {
          return true;
        }
        if (quote.status === 'cancelled' && diffDays >= 14) {
          return true;
        }
      }
    }
    return false;
  };

  // Category counts for quotation directory tabs
  const activeQuotesCount = useMemo(() => quotations.filter(q => !q.isArchived && q.status !== 'completed' && q.status !== 'cancelled').length, [quotations]);
  const completedQuotesCount = useMemo(() => quotations.filter(q => !q.isArchived && q.status === 'completed').length, [quotations]);
  const cancelledQuotesCount = useMemo(() => quotations.filter(q => !q.isArchived && q.status === 'cancelled').length, [quotations]);
  const archivedQuotesCount = useMemo(() => quotations.filter(q => Boolean(q.isArchived)).length, [quotations]);
  const expiredQuotesList = useMemo(() => quotations.filter(isQuoteExpired), [quotations]);"""

assert old_counts in content, "old_counts target not found"
content = content.replace(old_counts, new_counts, 1)

old_filtering = """      // Filter by category tab first (active / completed / cancelled)
      if (contractCategoryTab === 'active') {
        if (quote.status === 'completed' || quote.status === 'cancelled') {
          return false;
        }
      } else if (contractCategoryTab === 'completed') {
        if (quote.status !== 'completed') {
          return false;
        }
      } else if (contractCategoryTab === 'cancelled') {
        if (quote.status !== 'cancelled') {
          return false;
        }
      }"""

new_filtering = """      // Filter by category tab first (active / completed / cancelled / archived)
      if (contractCategoryTab === 'archived') {
        if (!quote.isArchived) {
          return false;
        }
      } else {
        if (quote.isArchived) {
          return false;
        }
        if (contractCategoryTab === 'active') {
          if (quote.status === 'completed' || quote.status === 'cancelled') {
            return false;
          }
        } else if (contractCategoryTab === 'completed') {
          if (quote.status !== 'completed') {
            return false;
          }
        } else if (contractCategoryTab === 'cancelled') {
          if (quote.status !== 'cancelled') {
            return false;
          }
        }
      }"""

assert old_filtering in content, "old_filtering target not found"
content = content.replace(old_filtering, new_filtering, 1)

# 4. Action handlers handleToggleArchiveQuote and handleBatchArchiveExpired
old_handlers = """    saveQuotationToFirestore(cloned)
      .then(() => {
        showToast('報價單複製成功，已生成新一頁草稿');
        fetchAllData(false);
      })
      .catch(err => {
        console.error(err);
        showToast('複製失敗，請稍後再試', 'error');
      });
  };"""

new_handlers = """    saveQuotationToFirestore(cloned)
      .then(() => {
        showToast('報價單複製成功，已生成新一頁草稿');
        fetchAllData(false);
      })
      .catch(err => {
        console.error(err);
        showToast('複製失敗，請稍後再試', 'error');
      });
  };

  // Toggle archive status for a single quotation
  const handleToggleArchiveQuote = (quote: Quotation) => {
    const nextArchived = !quote.isArchived;
    const updated: Quotation = {
      ...quote,
      isArchived: nextArchived,
      updatedAt: Date.now()
    };

    saveQuotationToFirestore(updated)
      .then(() => {
        showToast(
          nextArchived
            ? `報價單「${quote.id}」已成功移動至「已封存資料夾」`
            : `報價單「${quote.id}」已解鎖復原至一般列表`,
          'info'
        );
        fetchAllData(false);
      })
      .catch(err => {
        console.error(err);
        showToast('封存操作失敗，請稍後再試', 'error');
      });
  };

  // Batch archive all expired quotations
  const handleBatchArchiveExpired = () => {
    if (expiredQuotesList.length === 0) {
      showToast('目前沒有已過期的報價單', 'info');
      return;
    }

    showConfirm(
      '一鍵封存過期報價單',
      `發現 ${expiredQuotesList.length} 份已過期 (逾期超過30天或已結束) 的報價單，確定要將它們全部移動至「封存資料夾」以保持列表整潔嗎？`,
      () => {
        const updatePromises = expiredQuotesList.map(q =>
          saveQuotationToFirestore({
            ...q,
            isArchived: true,
            updatedAt: Date.now()
          })
        );
        Promise.all(updatePromises)
          .then(() => {
            showToast(`已成功將 ${expiredQuotesList.length} 份過期報價單移至封存資料夾`, 'info');
            fetchAllData(false);
          })
          .catch(err => {
            console.error(err);
            showToast('批次封存失敗，請稍後再試', 'error');
          });
      },
      '確定一鍵封存',
      '取消'
    );
  };"""

assert old_handlers in content, "old_handlers target not found"
content = content.replace(old_handlers, new_handlers, 1)

# 5. Sub-tabs UI
old_subtabs = """              {/* Category sub-tabs: 所有報價單 (進行中) / 完工結清 / 已作廢 */}
              <div className="border-b border-gray-200 bg-slate-100/70 px-6 py-3 flex flex-wrap items-center justify-between gap-3 select-none">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setContractCategoryTab('active');
                      setStatusFilter('all');
                    }}
                    className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-2xs ${
                      contractCategoryTab === 'active'
                        ? 'bg-amber-600 text-white shadow-xs scale-[1.02]'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>所有報價單 (進行中)</span>
                    <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
                      contractCategoryTab === 'active' ? 'bg-amber-700 text-amber-100' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {activeQuotesCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setContractCategoryTab('completed');
                      setStatusFilter('all');
                    }}
                    className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-2xs ${
                      contractCategoryTab === 'completed'
                        ? 'bg-emerald-600 text-white shadow-xs scale-[1.02]'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />
                    <span>完工結清</span>
                    <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
                      contractCategoryTab === 'completed' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {completedQuotesCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setContractCategoryTab('cancelled');
                      setStatusFilter('all');
                    }}
                    className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-2xs ${
                      contractCategoryTab === 'cancelled'
                        ? 'bg-rose-600 text-white shadow-xs scale-[1.02]'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <X className="w-3.5 h-3.5 text-rose-200" />
                    <span>已作廢</span>
                    <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
                      contractCategoryTab === 'cancelled' ? 'bg-rose-700 text-rose-100' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {cancelledQuotesCount}
                    </span>
                  </button>
                </div>

                {contractCategoryTab !== 'active' && (
                  <span className="text-[11px] font-bold text-slate-500 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1 rounded-lg">
                    {contractCategoryTab === 'completed' ? '💡 顯示所有已標記為「完工結清」的歷史報價單' : '💡 顯示所有已標記為「作廢」的無效報價單'}
                  </span>
                )}
              </div>"""

new_subtabs = """              {/* Category sub-tabs: 所有報價單 (進行中) / 完工結清 / 已作廢 / 已封存資料夾 */}
              <div className="border-b border-gray-200 bg-slate-100/70 px-6 py-3 flex flex-wrap items-center justify-between gap-3 select-none">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setContractCategoryTab('active');
                      setStatusFilter('all');
                    }}
                    className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-2xs ${
                      contractCategoryTab === 'active'
                        ? 'bg-amber-600 text-white shadow-xs scale-[1.02]'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>所有報價單 (進行中)</span>
                    <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
                      contractCategoryTab === 'active' ? 'bg-amber-700 text-amber-100' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {activeQuotesCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setContractCategoryTab('completed');
                      setStatusFilter('all');
                    }}
                    className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-2xs ${
                      contractCategoryTab === 'completed'
                        ? 'bg-emerald-600 text-white shadow-xs scale-[1.02]'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />
                    <span>完工結清</span>
                    <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
                      contractCategoryTab === 'completed' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {completedQuotesCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setContractCategoryTab('cancelled');
                      setStatusFilter('all');
                    }}
                    className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-2xs ${
                      contractCategoryTab === 'cancelled'
                        ? 'bg-rose-600 text-white shadow-xs scale-[1.02]'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <X className="w-3.5 h-3.5 text-rose-200" />
                    <span>已作廢</span>
                    <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
                      contractCategoryTab === 'cancelled' ? 'bg-rose-700 text-rose-100' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {cancelledQuotesCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setContractCategoryTab('archived');
                      setStatusFilter('all');
                    }}
                    className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-2xs ${
                      contractCategoryTab === 'archived'
                        ? 'bg-purple-700 text-white shadow-xs scale-[1.02]'
                        : 'bg-white text-purple-800 hover:text-purple-900 border border-purple-200 hover:border-purple-300'
                    }`}
                  >
                    <Archive className="w-3.5 h-3.5 text-purple-300" />
                    <span>已封存資料夾</span>
                    <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
                      contractCategoryTab === 'archived' ? 'bg-purple-900 text-purple-100' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {archivedQuotesCount}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {expiredQuotesList.length > 0 && contractCategoryTab !== 'archived' && (
                    <button
                      type="button"
                      onClick={handleBatchArchiveExpired}
                      className="px-3.5 py-1.5 text-xs font-black text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-300 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                      title="將逾期超過30天或已結束之過期報價單一鍵歸檔至封存資料夾"
                    >
                      <Archive className="w-3.5 h-3.5 text-purple-700" />
                      <span>一鍵封存過期報價單 ({expiredQuotesList.length})</span>
                    </button>
                  )}

                  {contractCategoryTab !== 'active' && (
                    <span className="text-[11px] font-bold text-slate-500 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1 rounded-lg">
                      {contractCategoryTab === 'completed'
                        ? '💡 顯示所有已標記為「完工結清」的歷史報價單'
                        : contractCategoryTab === 'cancelled'
                        ? '💡 顯示所有已標記為「作廢」的無效報價單'
                        : '💡 顯示所有已移動至「封存資料夾」的報價單（可點擊封存按鈕隨時復原）'}
                    </span>
                  )}
                </div>
              </div>"""

assert old_subtabs in content, "old_subtabs target not found"
content = content.replace(old_subtabs, new_subtabs, 1)

# 6. Empty state texts
old_empty = """                  <p className="font-extrabold text-slate-700 text-md">
                    {contractCategoryTab === 'completed' 
                      ? '暫無「完工結清」的報價單記錄' 
                      : contractCategoryTab === 'cancelled' 
                        ? '暫無「已作廢」的報價單記錄' 
                        : '暫無報價單記錄'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {contractCategoryTab === 'completed'
                      ? '當您將報價單狀態變更為「完工結清」後，該報價單將自動歸類至此分頁。'
                      : contractCategoryTab === 'cancelled'
                        ? '當您將報價單狀態變更為「作廢」後，該報價單將自動歸類至此分頁。'
                        : '目前本機 PWA 暫無任何已儲存的工程合約，點選下方按鈕，或透過設定匯入數據、載入演示用報價單，開始製作您的工程合約。'}
                  </p>"""

new_empty = """                  <p className="font-extrabold text-slate-700 text-md">
                    {contractCategoryTab === 'completed' 
                      ? '暫無「完工結清」的報價單記錄' 
                      : contractCategoryTab === 'cancelled' 
                        ? '暫無「已作廢」的報價單記錄' 
                        : contractCategoryTab === 'archived'
                          ? '封存資料夾內目前尚無報價單'
                          : '暫無報價單記錄'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {contractCategoryTab === 'completed'
                      ? '當您將報價單狀態變更為「完工結清」後，該報價單將自動歸類至此分頁。'
                      : contractCategoryTab === 'cancelled'
                        ? '當您將報價單狀態變更為「作廢」後，該報價單將自動歸類至此分頁。'
                        : contractCategoryTab === 'archived'
                          ? '點擊報價單列表中任何項目的「封存」按鈕，即可將過期或無需常駐之報價單移動至此資料夾，隨時可復原。'
                          : '目前本機 PWA 暫無任何已儲存的工程合約，點選下方按鈕，或透過設定匯入數據、載入演示用報價單，開始製作您的工程合約。'}
                  </p>"""

assert old_empty in content, "old_empty target not found"
content = content.replace(old_empty, new_empty, 1)

# 7. Add badges & Archive action buttons to quote sub-row & single row
old_sub_num = """                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          {quote.internalNumber ? (
                                            <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-200/80 px-2 py-0.5 rounded-md font-mono font-bold">
                                              {quote.internalNumber}
                                            </span>
                                          ) : (
                                            <span className="text-[10px] text-gray-400 italic font-sans">
                                              無內部號碼
                                            </span>
                                          )}
                                          <div className="relative group/qt inline-flex items-center">"""

new_sub_num = """                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          {quote.internalNumber ? (
                                            <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-200/80 px-2 py-0.5 rounded-md font-mono font-bold">
                                              {quote.internalNumber}
                                            </span>
                                          ) : (
                                            <span className="text-[10px] text-gray-400 italic font-sans">
                                              無內部號碼
                                            </span>
                                          )}
                                          {quote.isArchived && (
                                            <span className="text-[10px] font-extrabold text-purple-800 bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded-md inline-flex items-center gap-0.5">
                                              <Archive className="w-2.5 h-2.5 text-purple-600" /> 已封存
                                            </span>
                                          )}
                                          {!quote.isArchived && isQuoteExpired(quote) && (
                                            <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-md inline-flex items-center gap-0.5" title="此報價單已過期 (可點擊封存按鈕移至資料夾)">
                                              過期
                                            </span>
                                          )}
                                          <div className="relative group/qt inline-flex items-center">"""

assert old_sub_num in content, "old_sub_num target not found"
content = content.replace(old_sub_num, new_sub_num, 1)

old_single_num = """                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {quote.internalNumber ? (
                                    <span className="text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md font-mono">
                                      {quote.internalNumber}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-gray-400 italic font-sans">
                                      無內部號碼
                                    </span>
                                  )}
                                  <div className="relative group/qt inline-flex items-center">"""

new_single_num = """                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {quote.internalNumber ? (
                                    <span className="text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md font-mono">
                                      {quote.internalNumber}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-gray-400 italic font-sans">
                                      無內部號碼
                                    </span>
                                  )}
                                  {quote.isArchived && (
                                    <span className="text-[10px] font-extrabold text-purple-800 bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded-md inline-flex items-center gap-0.5">
                                      <Archive className="w-2.5 h-2.5 text-purple-600" /> 已封存
                                    </span>
                                  )}
                                  {!quote.isArchived && isQuoteExpired(quote) && (
                                    <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-md inline-flex items-center gap-0.5" title="此報價單已過期 (可點擊封存按鈕移至資料夾)">
                                      過期
                                    </span>
                                  )}
                                  <div className="relative group/qt inline-flex items-center">"""

assert old_single_num in content, "old_single_num target not found"
content = content.replace(old_single_num, new_single_num, 1)

old_sub_actions = """                                        <button 
                                          onClick={() => handleOpenPdfDownloadModal(quote)}
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
                                        </button>"""

new_sub_actions = """                                        <button 
                                          onClick={() => handleOpenPdfDownloadModal(quote)}
                                          className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded cursor-pointer transition-colors"
                                          title="合約列印與 PDF 下載"
                                        >
                                          <Printer className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => handleToggleArchiveQuote(quote)}
                                          className={`p-1.5 rounded cursor-pointer transition-colors ${
                                            quote.isArchived
                                              ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                              : 'hover:bg-purple-50 text-purple-600 hover:text-purple-700'
                                          }`}
                                          title={quote.isArchived ? "移出封存資料夾 (復原至列表)" : "移動至封存資料夾"}
                                        >
                                          <Archive className="w-4 h-4" />
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteQuote(quote.id)}
                                          className="p-1.5 hover:bg-rose-50 text-rose-500 rounded cursor-pointer transition-colors"
                                          title="永久銷毀此合約"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>"""

assert old_sub_actions in content, "old_sub_actions target not found"
content = content.replace(old_sub_actions, new_sub_actions, 1)

old_single_actions = """                                  <button 
                                    onClick={() => handleOpenPdfDownloadModal(quote)}
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
                                  </button>"""

new_single_actions = """                                  <button 
                                    onClick={() => handleOpenPdfDownloadModal(quote)}
                                    className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded cursor-pointer transition-colors"
                                    title="合約列印與 PDF 下載"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleToggleArchiveQuote(quote)}
                                    className={`p-1.5 rounded cursor-pointer transition-colors ${
                                      quote.isArchived
                                        ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                        : 'hover:bg-purple-50 text-purple-600 hover:text-purple-700'
                                    }`}
                                    title={quote.isArchived ? "移出封存資料夾 (復原至列表)" : "移動至封存資料夾"}
                                  >
                                    <Archive className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteQuote(quote.id)}
                                    className="p-1.5 hover:bg-rose-50 text-rose-500 rounded cursor-pointer transition-colors"
                                    title="永久銷毀此合約"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>"""

assert old_single_actions in content, "old_single_actions target not found"
content = content.replace(old_single_actions, new_single_actions, 1)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("All replacements successfully applied to src/App.tsx!")
