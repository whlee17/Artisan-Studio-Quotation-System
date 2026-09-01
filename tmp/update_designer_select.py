import sys

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update APP_CHANGELOG
old_changelog = """  {
    version: '3.1.31',
    date: '2026-08-31',
    details: [
      '欄位更名為「管理人員」 (Rename Assigned Staff to Manager)：將編輯表單與篩選器中的負責員工/人員統一名稱為「管理人員」。',
      '新增「負責設計師」獨立欄位 (Add Lead Designer Field)：於合約報價單表單中新增專屬「負責設計師」文字輸入欄位，並支援關鍵字即時搜索與列表檢視呈現。',
      '隱藏「合約報價號碼」輸入欄位 (Hide Quotation ID Input)：於表單中隱藏報價合約號碼欄位以簡化使用者介面，保持內部單號與資料結構完整。'
    ]
  }];"""

new_changelog = """  {
    version: '3.1.31',
    date: '2026-08-31',
    details: [
      '欄位更名為「管理人員」 (Rename Assigned Staff to Manager)：將編輯表單與篩選器中的負責員工/人員統一名稱為「管理人員」。',
      '新增「負責設計師」獨立欄位 (Add Lead Designer Field)：於合約報價單表單中新增專屬「負責設計師」文字輸入欄位，並支援關鍵字即時搜索與列表檢視呈現。',
      '隱藏「合約報價號碼」輸入欄位 (Hide Quotation ID Input)：於表單中隱藏報價合約號碼欄位以簡化使用者介面，保持內部單號與資料結構完整。'
    ]
  },
  {
    version: '3.1.32',
    date: '2026-08-31',
    details: [
      '負責設計師改為員工下拉選單 (Lead Designer Employee Dropdown)：負責設計師欄位設置為下拉式選單列出所有系統員工帳號供快速選取，預設為空 (未指定)，提升表單輸入便利性與標準化。'
    ]
  }];"""

assert old_changelog in content, "old_changelog target not found"
content = content.replace(old_changelog, new_changelog, 1)

# 2. Update newQuoteObj to include designer: ''
old_new_quote = """      assignedTo: currentUser?.username || 'whlee',
      meetingRecords: '',"""

new_new_quote = """      assignedTo: currentUser?.username || 'whlee',
      designer: '',
      meetingRecords: '',"""

if old_new_quote in content:
    content = content.replace(old_new_quote, new_new_quote, 1)

# 3. Update 負責設計師 input to select dropdown
old_designer_field = """                {/* 負責設計師 */}
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
                </div>"""

new_designer_field = """                {/* 負責設計師 */}
                <div className="col-span-1 md:col-span-1">
                  <label className="block text-xs font-bold text-gray-600 mb-1">負責設計師</label>
                  <select
                    value={editingQuote.designer || ''}
                    onChange={(e) => setEditingQuote({...editingQuote, designer: e.target.value})}
                    disabled={editingQuote.isLocked}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-800 focus:outline-none focus:border-amber-600 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                  >
                    <option value="">-- 未指定設計師 (預設為空) --</option>
                    {accountsList.map(a => (
                      <option key={a.username} value={a.displayName}>
                        {a.displayName} (@{a.username})
                      </option>
                    ))}
                    {editingQuote.designer && !accountsList.some(a => a.displayName === editingQuote.designer) && (
                      <option value={editingQuote.designer}>
                        {editingQuote.designer}
                      </option>
                    )}
                  </select>
                </div>"""

assert old_designer_field in content, "old_designer_field target not found"
content = content.replace(old_designer_field, new_designer_field, 1)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully converted 負責設計師 into dropdown select in App.tsx!")
