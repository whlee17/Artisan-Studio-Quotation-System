import React, { useState } from 'react';
import { ChecklistItem, UserAccount } from '../types';
import { CheckSquare, Square, Plus, Trash2, ListTodo, UserCheck, Clock } from 'lucide-react';

interface InternalChecklistProps {
  checklist?: ChecklistItem[];
  onUpdateChecklist: (newChecklist: ChecklistItem[]) => void;
  currentUser: UserAccount | null;
  isLocked?: boolean;
}

export const InternalChecklist: React.FC<InternalChecklistProps> = ({
  checklist = [],
  onUpdateChecklist,
  currentUser,
  isLocked = false,
}) => {
  const [newItemText, setNewItemText] = useState('');

  const userName = currentUser?.displayName || currentUser?.username || 'System';

  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newItemText.trim();
    if (!trimmed) return;

    const nowStr = new Date().toLocaleString('zh-HK', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const newItem: ChecklistItem = {
      id: `chk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: trimmed,
      completed: false,
      createdBy: userName,
      createdAt: nowStr,
    };

    onUpdateChecklist([...checklist, newItem]);
    setNewItemText('');
  };

  const handleToggleItem = (itemId: string) => {
    const nowStr = new Date().toLocaleString('zh-HK', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const updated = checklist.map((item) => {
      if (item.id === itemId) {
        const isNowCompleted = !item.completed;
        return {
          ...item,
          completed: isNowCompleted,
          completedBy: isNowCompleted ? userName : undefined,
          completedAt: isNowCompleted ? nowStr : undefined,
        };
      }
      return item;
    });

    onUpdateChecklist(updated);
  };

  const handleDeleteItem = (itemId: string) => {
    onUpdateChecklist(checklist.filter((item) => item.id !== itemId));
  };

  const completedCount = checklist.filter((item) => item.completed).length;
  const totalCount = checklist.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="mt-4 pt-4 border-t border-slate-200/80 text-left">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg shrink-0">
            <ListTodo className="w-4 h-4" />
          </div>
          <div>
            <h5 className="text-xs sm:text-sm font-bold text-slate-800 flex flex-wrap items-center gap-2">
              <span>內部待辦事項 Check List</span>
              {totalCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  {completedCount} / {totalCount} 已完成 ({progressPercent}%)
                </span>
              )}
            </h5>
            <p className="text-[10px] text-slate-500">
              跟進項目完成後勾選，系統會自動記錄並顯示 Confirm by "User"
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-3">
          <div
            className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Add Item Form */}
      {!isLocked && (
        <form onSubmit={handleAddItem} className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder="+ 輸入新待辦事項，按 Enter 快速新增..."
            className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-sans focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all shadow-3xs"
          />
          <button
            type="submit"
            disabled={!newItemText.trim()}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-3xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增</span>
          </button>
        </form>
      )}

      {/* Checklist items */}
      {checklist.length === 0 ? (
        <div className="text-center py-4 px-3 bg-white/60 border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
          目前尚未建立任何待辦事項，可於上方輸入欄位加入。
        </div>
      ) : (
        <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
          {checklist.map((item) => (
            <div
              key={item.id}
              className={`group flex items-start justify-between gap-2 p-2.5 rounded-lg border transition-all ${
                item.completed
                  ? 'bg-emerald-50/40 border-emerald-200/80 text-slate-600'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
              }`}
            >
              <div
                className="flex items-start gap-2.5 flex-1 min-w-0 cursor-pointer select-none"
                onClick={() => handleToggleItem(item.id)}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleItem(item.id);
                  }}
                  className={`mt-0.5 shrink-0 transition-all cursor-pointer ${
                    item.completed ? 'text-emerald-600' : 'text-slate-300 hover:text-slate-400'
                  }`}
                >
                  {item.completed ? (
                    <CheckSquare className="w-4 h-4 fill-emerald-100 text-emerald-600" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs font-medium leading-relaxed break-words ${
                      item.completed ? 'line-through text-slate-400 font-normal' : 'text-slate-800'
                    }`}
                  >
                    {item.text}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {item.completed ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100/80 text-emerald-800 border border-emerald-200/90 shadow-3xs">
                        <UserCheck className="w-3 h-3 text-emerald-600" />
                        <span>Confirm by "{item.completedBy || 'User'}"</span>
                        {item.completedAt && (
                          <span className="text-[9px] text-emerald-700/80 font-normal">({item.completedAt})</span>
                        )}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock className="w-2.5 h-2.5" />
                        <span>建立人: {item.createdBy || 'System'}</span>
                        {item.createdAt && <span>· {item.createdAt}</span>}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!isLocked && (
                <button
                  type="button"
                  onClick={() => handleDeleteItem(item.id)}
                  title="刪除待辦事項"
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
