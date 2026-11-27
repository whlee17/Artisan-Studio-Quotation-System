import React, { useMemo, useState } from 'react';
import {
  History,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
  Search,
  PlusCircle,
  Edit3,
  Trash2,
  FolderPlus,
  FolderMinus,
  FolderEdit,
  Layers,
  X,
} from 'lucide-react';
import { QuotationEditLog, QuotationLogAction, QuotationLogChangeEntry } from '../types';

interface QuotationEditLogPanelProps {
  logs?: QuotationEditLog[];
}

const ACTION_BADGE_MAP: Record<
  QuotationLogAction,
  { label: string; className: string; icon: React.ReactNode }
> = {
  added: {
    label: '新增細項',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: <PlusCircle className="w-3 h-3" />,
  },
  modified: {
    label: '修改細項',
    className: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: <Edit3 className="w-3 h-3" />,
  },
  removed: {
    label: '刪除細項',
    className: 'bg-rose-100 text-rose-800 border-rose-200',
    icon: <Trash2 className="w-3 h-3" />,
  },
  category_added: {
    label: '新增大類',
    className: 'bg-teal-100 text-teal-800 border-teal-200',
    icon: <FolderPlus className="w-3 h-3" />,
  },
  category_removed: {
    label: '移除大類',
    className: 'bg-slate-200 text-slate-700 border-slate-300',
    icon: <FolderMinus className="w-3 h-3" />,
  },
  category_renamed: {
    label: '大類更名',
    className: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    icon: <FolderEdit className="w-3 h-3" />,
  },
};

type ScopeFilter = 'all' | 'original' | 'vo' | 'meta';

export const QuotationEditLogPanel: React.FC<QuotationEditLogPanelProps> = ({ logs = [] }) => {
  const [isSectionExpanded, setIsSectionExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({});
  const [expandAll, setExpandAll] = useState(false);

  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortedLogs
      .map((log) => {
        const filteredChanges = (log.changes || []).filter((ch) => {
          if (scopeFilter !== 'all' && ch.scope !== scopeFilter) return false;
          if (!q) return true;
          return (
            (log.editedBy || '').toLowerCase().includes(q) ||
            (log.editedByUsername || '').toLowerCase().includes(q) ||
            (log.dateStr || '').toLowerCase().includes(q) ||
            (ch.category || '').toLowerCase().includes(q) ||
            (ch.itemName || '').toLowerCase().includes(q) ||
            (ch.details || []).some((d) => d.toLowerCase().includes(q))
          );
        });
        return {
          ...log,
          changes: filteredChanges,
        };
      })
      .filter((log) => log.changes.length > 0);
  }, [sortedLogs, searchQuery, scopeFilter]);

  const isLogExpanded = (logId: string, idx: number) => {
    if (expandAll || searchQuery.trim() !== '' || scopeFilter !== 'all') return true;
    if (expandedLogIds[logId] !== undefined) return expandedLogIds[logId];
    return idx < 2; // Default expand latest 2 save logs
  };

  const toggleLogExpand = (logId: string, currentExpanded: boolean) => {
    setExpandedLogIds((prev) => ({
      ...prev,
      [logId]: !currentExpanded,
    }));
  };

  const groupChangesByCategory = (changes: QuotationLogChangeEntry[]) => {
    const groups: Array<{ category: string; items: QuotationLogChangeEntry[] }> = [];
    const map = new Map<string, QuotationLogChangeEntry[]>();
    for (const ch of changes) {
      const cat = ch.category || '其他';
      if (!map.has(cat)) {
        const arr: QuotationLogChangeEntry[] = [];
        map.set(cat, arr);
        groups.push({ category: cat, items: arr });
      }
      map.get(cat)!.push(ch);
    }
    return groups;
  };

  const latestLog = sortedLogs[0];

  return (
    <div
      id="quote-section-log"
      className={`border-t border-slate-200 bg-white scroll-mt-20 text-left transition-all ${
        isSectionExpanded ? 'p-6' : 'px-6 py-4'
      }`}
    >
      <div className="max-w-5xl">
        {/* Section Header */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isSectionExpanded ? 'mb-4' : ''}`}>
          <button
            type="button"
            onClick={() => setIsSectionExpanded((prev) => !prev)}
            aria-expanded={isSectionExpanded}
            className="flex items-start gap-2.5 text-left cursor-pointer group flex-1 min-w-0"
          >
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5 border border-amber-200/80 group-hover:bg-amber-200/70 transition-colors">
              <History className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex flex-wrap items-center gap-2">
                <span>報價單修改紀錄 (Edit Log)</span>
                <span className="text-[10px] bg-slate-800 text-white px-2 py-0.5 rounded-full font-bold">
                  共 {sortedLogs.length} 次變更紀錄
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold border border-slate-200">
                  僅供內部查核
                </span>
              </h4>
              <p className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5">
                {isSectionExpanded
                  ? '每次點擊「儲存」時自動對比儲存前版本，記錄修改日期、修改大類、細項變動內容及修改者。'
                  : '預設為收合隱藏以精簡頁面高度，點擊此處手動展開查閱修改紀錄。'}
                {latestLog && (
                  <span className="ml-1.5 text-amber-700 font-semibold">
                    最近儲存：{latestLog.dateStr}（{latestLog.editedBy}）
                  </span>
                )}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            {isSectionExpanded && sortedLogs.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setExpandAll((prev) => !prev);
                  setExpandedLogIds({});
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 border border-slate-200"
              >
                {expandAll ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>{expandAll ? '全部收合' : '全部展開'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsSectionExpanded((prev) => !prev)}
              aria-expanded={isSectionExpanded}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 border ${
                isSectionExpanded
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                  : 'bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border-slate-200 hover:border-amber-200'
              }`}
            >
              {isSectionExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>{isSectionExpanded ? '收合紀錄' : '展開紀錄'}</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        {isSectionExpanded && sortedLogs.length > 0 && (
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 mb-4 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋修改大類、細項名稱、變動數字或修改者..."
                className="w-full pl-8 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  title="清除搜尋"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: '全部類別' },
                  { id: 'original', label: '主報價大類/細項' },
                  { id: 'vo', label: '後加項目 (VO)' },
                  { id: 'meta', label: '基本/收款/備忘' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setScopeFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                    scopeFilter === tab.id
                      ? 'bg-amber-600 text-white border-amber-600 shadow-3xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Log Entries List */}
        {isSectionExpanded && (
          sortedLogs.length === 0 ? (
            <div className="text-center py-6 px-4 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
              尚無儲存變更紀錄。當您編輯報價單並點擊「儲存合約變更」後，系統會自動在此建立前後版本差異對比紀錄。
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-6 px-4 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs">
              找不到符合篩選條件的修改紀錄，請嘗試更換搜尋關鍵字或分類。
            </div>
          ) : (
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {filteredLogs.map((log, idx) => {
                const expanded = isLogExpanded(log.id, idx);
                const grouped = groupChangesByCategory(log.changes);

                return (
                  <div
                    key={log.id}
                    className="border border-slate-200 rounded-xl bg-white shadow-2xs overflow-hidden transition-all"
                  >
                    {/* Log Entry Header */}
                    <button
                      type="button"
                      onClick={() => toggleLogExpand(log.id, expanded)}
                      className="w-full px-4 py-3 bg-slate-50/80 hover:bg-amber-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left transition-colors cursor-pointer"
                    >
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px] font-mono font-bold shadow-3xs">
                          <Calendar className="w-3 h-3 text-amber-600" />
                          <span>{log.dateStr}</span>
                        </span>

                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold">
                          <User className="w-3 h-3 text-amber-700" />
                          <span>修改者：{log.editedBy}</span>
                          {log.editedByUsername && log.editedByUsername !== log.editedBy && (
                            <span className="text-[10px] text-amber-700/80 font-mono">
                              (@{log.editedByUsername})
                            </span>
                          )}
                        </span>

                        <span className="text-xs font-bold text-slate-700 truncate">
                          {log.summary}
                        </span>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                        <div className="flex flex-wrap items-center gap-1">
                          {grouped.slice(0, 3).map((g) => (
                            <span
                              key={g.category}
                              className="px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700 text-[10px] font-bold max-w-[120px] truncate"
                              title={g.category}
                            >
                              {g.category}
                            </span>
                          ))}
                          {grouped.length > 3 && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-bold">
                              +{grouped.length - 3}
                            </span>
                          )}
                        </div>
                        <span className="p-1 text-slate-400">
                          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                      </div>
                    </button>

                    {/* Expanded Category & Item Details */}
                    {expanded && (
                      <div className="p-3.5 space-y-3 border-t border-slate-100 bg-white">
                        {grouped.map((group) => (
                          <div
                            key={group.category}
                            className="rounded-lg border border-slate-200/80 bg-slate-50/40 overflow-hidden"
                          >
                            <div className="px-3 py-1.5 bg-slate-100/80 border-b border-slate-200/70 flex items-center justify-between gap-2">
                              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>修改大類：{group.category}</span>
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                {group.items.length} 項異動
                              </span>
                            </div>

                            <div className="divide-y divide-slate-100">
                              {group.items.map((item, itemIdx) => {
                                const badge = ACTION_BADGE_MAP[item.action] || ACTION_BADGE_MAP.modified;
                                return (
                                  <div key={`${item.itemName}-${itemIdx}`} className="px-3 py-2 bg-white/90">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span
                                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold border shrink-0 ${badge.className}`}
                                      >
                                        {badge.icon}
                                        <span>{badge.label}</span>
                                      </span>
                                      <span className="text-xs font-bold text-slate-800 break-words">
                                        {item.itemName}
                                      </span>
                                    </div>
                                    {item.details && item.details.length > 0 && (
                                      <ul className="mt-1.5 pl-4 space-y-0.5 text-[11px] text-slate-600 list-disc">
                                        {item.details.map((detail, dIdx) => (
                                          <li key={dIdx} className="leading-snug break-words">
                                            {detail}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
};
