import sys

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update APP_CHANGELOG
old_changelog = """  {
    version: '3.1.32',
    date: '2026-08-31',
    details: [
      '負責設計師改為員工下拉選單 (Lead Designer Employee Dropdown)：負責設計師欄位設置為下拉式選單列出所有系統員工帳號供快速選取，預設為空 (未指定)，提升表單輸入便利性與標準化。'
    ]
  }];"""

new_changelog = """  {
    version: '3.1.32',
    date: '2026-08-31',
    details: [
      '負責設計師改為員工下拉選單 (Lead Designer Employee Dropdown)：負責設計師欄位設置為下拉式選單列出所有系統員工帳號供快速選取，預設為空 (未指定)，提升表單輸入便利性與標準化。'
    ]
  },
  {
    version: '3.1.33',
    date: '2026-08-31',
    details: [
      '列印報價單顯示「負責人/負責設計師」 (Display Lead Person / Lead Designer on Print Template)：將列印報價單中的負責人欄位更新為「負責人/負責設計師」，動態顯示合約指派之管理人員及/或負責設計師姓名。'
    ]
  }];"""

assert old_changelog in content, "old_changelog target not found"
content = content.replace(old_changelog, new_changelog, 1)

# 2. Update print template metadata block
old_print_block = """                    <div className="flex border-t border-gray-200 pt-1.5 border-l border-gray-200 pl-4 text-left">
                      <span className="font-bold text-gray-500 w-20 flex-shrink-0">負責人</span>
                      <span className="text-gray-900 font-semibold">LOUIS</span>
                    </div>"""

new_print_block = """                    <div className="flex border-t border-gray-200 pt-1.5 border-l border-gray-200 pl-4 text-left">
                      <span className="font-bold text-gray-500 w-auto min-w-[5rem] mr-2 shrink-0">負責人/負責設計師</span>
                      <span className="text-gray-900 font-semibold">
                        {(() => {
                          const assignedUser = accountsList.find(a => a.username === quote.assignedTo);
                          const assignedName = assignedUser ? assignedUser.displayName : (quote.assignedTo || '');
                          const designerName = quote.designer || '';
                          if (assignedName && designerName && assignedName !== designerName) {
                            return `${assignedName} / ${designerName}`;
                          }
                          return designerName || assignedName || 'LOUIS';
                        })()}
                      </span>
                    </div>"""

assert old_print_block in content, "old_print_block target not found"
content = content.replace(old_print_block, new_print_block, 1)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully updated print template responsible person/designer in App.tsx!")
