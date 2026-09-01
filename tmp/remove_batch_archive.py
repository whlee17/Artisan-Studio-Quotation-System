import sys

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update APP_CHANGELOG
old_changelog = """  {
    version: '3.1.29',
    date: '2026-08-31',
    details: [
      '新增報價單「封存」功能 (Quotation Archiving System)：於報價單列表操作欄新增「封存」按鈕 (Archive Button)，允許將過期或無需常駐之報價單輕鬆移動至「已封存資料夾」。',
      '全新「已封存資料夾」分類頁籤：於報價單列表頂部加入封存專用 Tab 與獨立數據統計，使主列表維持乾淨清爽，遠離混亂與擁擠。',
      '智慧一鍵封存過期報價單 (Batch Archive Expired Quotes)：自動判別逾期30天或工期已結束之過期報價單，支援一鍵批次歸檔至封存資料夾，並可隨時一鍵解封復原。'
    ]
  }];"""

new_changelog = """  {
    version: '3.1.29',
    date: '2026-08-31',
    details: [
      '新增報價單「封存」功能 (Quotation Archiving System)：於報價單列表操作欄新增「封存」按鈕 (Archive Button)，允許將過期或無需常駐之報價單輕鬆移動至「已封存資料夾」。',
      '全新「已封存資料夾」分類頁籤：於報價單列表頂部加入封存專用 Tab 與獨立數據統計，使主列表維持乾淨清爽，遠離混亂與擁擠。',
      '智慧一鍵封存過期報價單 (Batch Archive Expired Quotes)：自動判別逾期30天或工期已結束之過期報價單，支援一鍵批次歸檔至封存資料夾，並可隨時一鍵解封復原。'
    ]
  },
  {
    version: '3.1.30',
    date: '2026-08-31',
    details: [
      '移除報價單頂部「一鍵封存過期報價單」按鈕 (Remove Batch Archive Button)：順應 UI 精簡要求移除一鍵批次封存按鈕，保留個別報價單之手動封存與解封功能，使分頁工具列更為簡潔。'
    ]
  }];"""

assert old_changelog in content, "old_changelog target not found"
content = content.replace(old_changelog, new_changelog, 1)

# 2. Remove the batch archive button block from subtabs
old_button_block = """                <div className="flex items-center gap-2 flex-wrap">
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

                  {contractCategoryTab !== 'active' && ("""

new_button_block = """                <div className="flex items-center gap-2 flex-wrap">
                  {contractCategoryTab !== 'active' && ("""

assert old_button_block in content, "old_button_block target not found"
content = content.replace(old_button_block, new_button_block, 1)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully removed batch archive button and updated changelog to 3.1.30")
