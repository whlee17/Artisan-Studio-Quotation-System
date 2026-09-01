import sys

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Folder sub-row
old_sub = """                                        <span>管理:</span>
                                        <span className="bg-amber-50 px-1 py-0.5 rounded text-amber-800 font-black inline-flex items-center gap-1">
                                          {(() => {
                                            const assignedUser = accountsList.find(a => a.username === quote.assignedTo);
                                            return assignedUser ? assignedUser.displayName : (quote.assignedTo || '未分配');
                                          })()}
                                          {Boolean(quote.checklist && quote.checklist.some(chk => !chk.completed)) && (
                                            <span className="relative flex h-2 w-2 ml-0.5 shrink-0" title="此報價單有未完成待辦事項">
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                            </span>
                                          )}
                                        </span>"""

new_sub = """                                        <span>管理:</span>
                                        <span className="bg-amber-50 px-1 py-0.5 rounded text-amber-800 font-black inline-flex items-center gap-1">
                                          {(() => {
                                            const assignedUser = accountsList.find(a => a.username === quote.assignedTo);
                                            return assignedUser ? assignedUser.displayName : (quote.assignedTo || '未分配');
                                          })()}
                                          {Boolean(quote.checklist && quote.checklist.some(chk => !chk.completed)) && (
                                            <span className="relative flex h-2 w-2 ml-0.5 shrink-0" title="此報價單有未完成待辦事項">
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                            </span>
                                          )}
                                        </span>
                                        {quote.designer && (
                                          <span className="bg-indigo-50 text-indigo-800 px-1 py-0.5 rounded font-black inline-flex items-center text-[10px]">
                                            設計師: {quote.designer}
                                          </span>
                                        )}"""

assert old_sub in content, "old_sub target not found"
content = content.replace(old_sub, new_sub, 1)

# 2. Single row
old_single = """                                  <span>管理:</span>
                                  <span className="bg-amber-50 px-1 py-0.5 rounded text-amber-800 font-black inline-flex items-center gap-1">
                                    {(() => {
                                      const assignedUser = accountsList.find(a => a.username === quote.assignedTo);
                                      return assignedUser ? assignedUser.displayName : (quote.assignedTo || '未分配');
                                    })()}
                                    {Boolean(quote.checklist && quote.checklist.some(chk => !chk.completed)) && (
                                      <span 
                                        className="relative flex h-2 w-2 ml-0.5 shrink-0" 
                                        title="此報價單有未完成待辦事項"
                                      >
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                      </span>
                                    )}
                                  </span>"""

new_single = """                                  <span>管理:</span>
                                  <span className="bg-amber-50 px-1 py-0.5 rounded text-amber-800 font-black inline-flex items-center gap-1">
                                    {(() => {
                                      const assignedUser = accountsList.find(a => a.username === quote.assignedTo);
                                      return assignedUser ? assignedUser.displayName : (quote.assignedTo || '未分配');
                                    })()}
                                    {Boolean(quote.checklist && quote.checklist.some(chk => !chk.completed)) && (
                                      <span 
                                        className="relative flex h-2 w-2 ml-0.5 shrink-0" 
                                        title="此報價單有未完成待辦事項"
                                      >
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                      </span>
                                    )}
                                  </span>
                                  {quote.designer && (
                                    <span className="bg-indigo-50 text-indigo-800 px-1 py-0.5 rounded font-black inline-flex items-center text-[10px]">
                                      設計師: {quote.designer}
                                    </span>
                                  )}"""

assert old_single in content, "old_single target not found"
content = content.replace(old_single, new_single, 1)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully added designer tag to table rows!")
