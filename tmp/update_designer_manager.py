import sys

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update APP_CHANGELOG
old_changelog = """  {
    version: '3.1.30',
    date: '2026-08-31',
    details: [
      '移除報價單頂部「一鍵封存過期報價單」按鈕 (Remove Batch Archive Button)：順應 UI 精簡要求移除一鍵批次封存按鈕，保留個別報價單之手動封存與解封功能，使分頁工具列更為簡潔。'
    ]
  }];"""

new_changelog = """  {
    version: '3.1.30',
    date: '2026-08-31',
    details: [
      '移除報價單頂部「一鍵封存過期報價單」按鈕 (Remove Batch Archive Button)：順應 UI 精簡要求移除一鍵批次封存按鈕，保留個別報價單之手動封存與解封功能，使分頁工具列更為簡潔。'
    ]
  },
  {
    version: '3.1.31',
    date: '2026-08-31',
    details: [
      '欄位更名為「管理人員」 (Rename Assigned Staff to Manager)：將編輯表單與篩選器中的負責員工/人員統一名稱為「管理人員」。',
      '新增「負責設計師」獨立欄位 (Add Lead Designer Field)：於合約報價單表單中新增專屬「負責設計師」文字輸入欄位，並支援關鍵字即時搜索與列表檢視呈現。',
      '隱藏「合約報價號碼」輸入欄位 (Hide Quotation ID Input)：於表單中隱藏報價合約號碼欄位以簡化使用者介面，保持內部單號與資料結構完整。'
    ]
  }];"""

assert old_changelog in content, "old_changelog target not found"
content = content.replace(old_changelog, new_changelog, 1)

# 2. Update search matches to include designer
old_search_1 = """        (quote.internalNumber && (quote.internalNumber || '').toLowerCase().includes(lowerQuery)) ||
        (quote.assignedTo || '').toLowerCase().includes(lowerQuery) ||
        assignedName.toLowerCase().includes(lowerQuery);"""

new_search_1 = """        (quote.internalNumber && (quote.internalNumber || '').toLowerCase().includes(lowerQuery)) ||
        (quote.assignedTo || '').toLowerCase().includes(lowerQuery) ||
        (quote.designer || '').toLowerCase().includes(lowerQuery) ||
        assignedName.toLowerCase().includes(lowerQuery);"""

assert old_search_1 in content, "old_search_1 target not found"
content = content.replace(old_search_1, new_search_1, 1)

old_search_2 = """        (q.internalNumber && (q.internalNumber || '').toLowerCase().includes(lowerQuery)) ||
        (q.assignedTo || '').toLowerCase().includes(lowerQuery) ||
        assignedName.toLowerCase().includes(lowerQuery);"""

new_search_2 = """        (q.internalNumber && (q.internalNumber || '').toLowerCase().includes(lowerQuery)) ||
        (q.assignedTo || '').toLowerCase().includes(lowerQuery) ||
        (q.designer || '').toLowerCase().includes(lowerQuery) ||
        assignedName.toLowerCase().includes(lowerQuery);"""

assert old_search_2 in content, "old_search_2 target not found"
content = content.replace(old_search_2, new_search_2, 1)

# 3. Update search filter bar labels
old_filter_bar = """                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-bold text-gray-600">負責人員：</label>
                  <select 
                    value={assignedToFilter}
                    onChange={(e) => setAssignedToFilter(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white min-w-[130px] focus:outline-amber-600"
                  >
                    <option value="all">所有負責人員</option>
                    {accountsList.map((acc) => (
                      <option key={acc.username} value={acc.username}>
                        {acc.displayName || acc.username}
                      </option>
                    ))}
                  </select>
                </div>"""

new_filter_bar = """                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-bold text-gray-600">管理人員：</label>
                  <select 
                    value={assignedToFilter}
                    onChange={(e) => setAssignedToFilter(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white min-w-[130px] focus:outline-amber-600"
                  >
                    <option value="all">所有管理人員</option>
                    {accountsList.map((acc) => (
                      <option key={acc.username} value={acc.username}>
                        {acc.displayName || acc.username}
                      </option>
                    ))}
                  </select>
                </div>"""

assert old_filter_bar in content, "old_filter_bar target not found"
content = content.replace(old_filter_bar, new_filter_bar, 1)

old_placeholder = 'placeholder="搜索客戶姓名 / 裝修地址 / 合約單號 / 負責人員..."'
new_placeholder = 'placeholder="搜索客戶姓名 / 裝修地址 / 合約單號 / 設計師 / 管理人員..."'
if old_placeholder in content:
    content = content.replace(old_placeholder, new_placeholder, 1)

# 4. Update the Quotation Form Client fields
old_form_fields = """              {/* Form client fields */}
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
                    className="w-full min-w-0 max-w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-600 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed appearance-none"
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
                  <label className="block text-xs font-bold text-gray-600 mb-1">合約狀態</label>"""

new_form_fields = """              {/* Form client fields */}
              <div className="p-6 border-b border-gray-100 bg-gray-50/50 grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* 內部號碼 */}
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

                {/* 合約日期 */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">合約日期</label>
                  <input 
                    type="date"
                    value={editingQuote.date}
                    onChange={(e) => setEditingQuote({...editingQuote, date: e.target.value})}
                    disabled={editingQuote.isLocked}
                    className="w-full min-w-0 max-w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-600 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed appearance-none"
                  />
                </div>

                {/* 客戶姓名 */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">客戶姓名 *</label>
                  <input 
                    type="text" 
                    placeholder="例如：陳大文先生" 
                    value={editingQuote.customerName}
                    onChange={(e) => setEditingQuote({...editingQuote, customerName: e.target.value})}
                    disabled={editingQuote.isLocked}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-600 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed font-semibold text-slate-800"
                  />
                </div>

                {/* 電話號碼 */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">電話號碼</label>
                  <input 
                    type="text" 
                    placeholder="客戶聯絡號碼" 
                    value={editingQuote.phone}
                    onChange={(e) => setEditingQuote({...editingQuote, phone: e.target.value})}
                    disabled={editingQuote.isLocked}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-600 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed font-mono"
                  />
                </div>

                {/* 裝修施工地址 */}
                <div className="col-span-1 md:col-span-2">
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

                {/* 管理人員 */}
                {currentUser?.role === 'admin' ? (
                  <div className="col-span-1 md:col-span-1">
                    <label className="block text-xs font-bold text-amber-800 mb-1">管理人員</label>
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
                ) : (
                  <div className="col-span-1 md:col-span-1">
                    <label className="block text-xs font-bold text-gray-600 mb-1">管理人員</label>
                    <input
                      type="text"
                      value={(() => {
                        const u = accountsList.find(a => a.username === (editingQuote.assignedTo || 'whlee'));
                        return u ? `${u.displayName} (@${u.username})` : (editingQuote.assignedTo || 'whlee');
                      })()}
                      disabled
                      className="w-full px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-sm font-semibold text-gray-500 cursor-not-allowed"
                    />
                  </div>
                )}

                {/* 負責設計師 */}
                <div className="col-span-1 md:col-span-1">
                  <label className="block text-xs font-bold text-gray-600 mb-1">負責設計師</label>
                  <input 
                    type="text" 
                    placeholder="例如：Alex / 陳設計師" 
                    value={editingQuote.designer || ''}
                    onChange={(e) => setEditingQuote({...editingQuote, designer: e.target.value})}
                    disabled={editingQuote.isLocked}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-600 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed font-semibold text-slate-800"
                  />
                </div>

                <div className="col-span-1 md:col-span-1">
                  <label className="block text-xs font-bold text-gray-600 mb-1">合約狀態</label>"""

assert old_form_fields in content, "old_form_fields target not found"
content = content.replace(old_form_fields, new_form_fields, 1)

# 5. Update designer in Card view and Table rows
old_card_assigned = """                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                <span>負責人員: {assignedName}</span>"""

new_card_assigned = """                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                <span>管理: {assignedName}</span>
                                {quote.designer && (
                                  <span className="text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded text-[11px] font-bold">
                                    設計師: {quote.designer}
                                  </span>
                                )}"""

if old_card_assigned in content:
    content = content.replace(old_card_assigned, new_card_assigned, 1)

old_table_sub_assigned = """                                        <span>負責:</span>
                                        <span className="bg-amber-50 px-1 py-0.5 rounded text-amber-800 font-black inline-flex items-center gap-1">
                                          {(() => {
                                            const assignedUser = accountsList.find(a => a.username === quote.assignedTo);
                                            return assignedUser ? assignedUser.displayName : (quote.assignedTo || '未分配');
                                          })()}"""

new_table_sub_assigned = """                                        <span>管理:</span>
                                        <span className="bg-amber-50 px-1 py-0.5 rounded text-amber-800 font-black inline-flex items-center gap-1">
                                          {(() => {
                                            const assignedUser = accountsList.find(a => a.username === quote.assignedTo);
                                            return assignedUser ? assignedUser.displayName : (quote.assignedTo || '未分配');
                                          })()}"""

if old_table_sub_assigned in content:
    content = content.replace(old_table_sub_assigned, new_table_sub_assigned, 1)

old_table_single_assigned = """                                  <span>負責人員:</span>
                                  <span className="bg-amber-50 px-1 py-0.5 rounded text-amber-800 font-black inline-flex items-center gap-1">
                                    {(() => {
                                      const assignedUser = accountsList.find(a => a.username === quote.assignedTo);
                                      return assignedUser ? assignedUser.displayName : (quote.assignedTo || '未分配');
                                    })()}"""

new_table_single_assigned = """                                  <span>管理:</span>
                                  <span className="bg-amber-50 px-1 py-0.5 rounded text-amber-800 font-black inline-flex items-center gap-1">
                                    {(() => {
                                      const assignedUser = accountsList.find(a => a.username === quote.assignedTo);
                                      return assignedUser ? assignedUser.displayName : (quote.assignedTo || '未分配');
                                    })()}"""

if old_table_single_assigned in content:
    content = content.replace(old_table_single_assigned, new_table_single_assigned, 1)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully updated manager, designer, and hidden quote.id in App.tsx!")
