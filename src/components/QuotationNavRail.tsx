import React, { useState, useEffect } from 'react';
import { 
  ArrowUp, 
  ArrowDown, 
  ChevronRight, 
  ChevronLeft 
} from 'lucide-react';
import { Quotation } from '../types';

export interface QuotationNavRailProps {
  editingQuote: Quotation;
  categories: string[];
  activeTab: string; // 'original' or vo.id
  isMobile: boolean;
}

export const QuotationNavRail: React.FC<QuotationNavRailProps> = ({
  editingQuote,
  categories,
  activeTab,
  isMobile,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    // Mobile defaults to collapsed so it doesn't obstruct narrow screens; desktop/tablet defaults to open
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return true;
    }
    return false;
  });
  const [activeSectionId, setActiveSectionId] = useState<string>('quote-section-info');

  // Compute category items based on activeTab
  const isOriginal = activeTab === 'original';
  
  // Category items list
  const categoryNavItems = React.useMemo(() => {
    if (isOriginal) {
      return categories.map((cat) => {
        const items = editingQuote.items.filter(i => i.category === cat);
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const cleanId = `quote-category-${cat.replace(/\s+/g, '-')}`;
        // Extract first 2 characters
        const shortName = cat.trim().slice(0, 2) || cat.trim();
        return {
          id: cleanId,
          shortName,
          fullName: cat,
          count: items.length,
          subtotal,
        };
      });
    } else {
      // In VO mode
      return categories.map((cat) => {
        const cleanId = `quote-vo-category-${cat.replace(/\s+/g, '-')}`;
        const shortName = cat.trim().slice(0, 2) || cat.trim();
        return {
          id: cleanId,
          shortName,
          fullName: cat,
          count: 0,
          subtotal: 0,
        };
      });
    }
  }, [categories, editingQuote.items, isOriginal]);

  // All sections list for scroll detection
  const allSectionIds = React.useMemo(() => {
    const list = ['quote-section-info'];
    categoryNavItems.forEach(item => list.push(item.id));
    if (isOriginal) {
      list.push('quote-section-payment');
      list.push('quote-section-terms');
      if (editingQuote.scheduleEnabled) {
        list.push('quote-section-schedule');
      }
    } else {
      list.push('quote-section-vo-payment');
      list.push('quote-section-vo-terms');
    }
    list.push('quote-section-memo');
    return list;
  }, [categoryNavItems, isOriginal, editingQuote.scheduleEnabled]);

  // Scroll spy to highlight active section
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollPos = window.pageYOffset + 140;
          let currentId = allSectionIds[0];

          for (const id of allSectionIds) {
            const el = document.getElementById(id);
            if (el) {
              const top = el.offsetTop;
              if (scrollPos >= top) {
                currentId = id;
              }
            }
          }
          setActiveSectionId(currentId);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [allSectionIds]);

  const scrollToSection = (targetId: string) => {
    if (targetId === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setActiveSectionId('quote-section-info');
      return;
    }
    if (targetId === 'bottom') {
      const bottomEl = document.getElementById('quote-section-bottom');
      if (bottomEl) {
        bottomEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
      } else {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
      }
      return;
    }

    const el = document.getElementById(targetId);
    if (el) {
      const yOffset = -75; // Account for sticky top header
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      setActiveSectionId(targetId);
    }
  };

  const paymentSectionId = isOriginal ? 'quote-section-payment' : 'quote-section-vo-payment';
  const termsSectionId = isOriginal ? 'quote-section-terms' : 'quote-section-vo-terms';

  return (
    <aside
      id="floating-quotation-nav-rail"
      aria-label="報價單右側快速導覽條"
      className={`fixed right-1.5 sm:right-3 md:right-4 top-1/2 -translate-y-1/2 z-40 select-none print:hidden transition-all duration-250 ${
        isCollapsed ? 'translate-x-0' : ''
      }`}
    >
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-2xl rounded-2xl p-1.5 flex flex-col items-center gap-1 text-slate-700 min-w-[50px] max-w-[62px]">
        {/* Toggle Collapse Header */}
        <button
          type="button"
          onClick={() => setIsCollapsed(prev => !prev)}
          className="w-full h-6 flex items-center justify-center text-slate-400 hover:text-amber-700 rounded-lg hover:bg-amber-50/80 transition-colors cursor-pointer"
          title={isCollapsed ? "展開右側快速導覽條" : "收合導覽條"}
          aria-label={isCollapsed ? "展開右側快速導覽條" : "收合導覽條"}
        >
          {isCollapsed ? (
            <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
          ) : (
            <div className="flex items-center gap-0.5 text-slate-400 hover:text-amber-700">
              <span className="text-[9px] font-black tracking-tighter">收合</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          )}
        </button>

        {/* Collapsed State Mini Pill */}
        {isCollapsed && (
          <div 
            onClick={() => setIsCollapsed(false)}
            className="py-1 flex flex-col items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
            title="點擊展開報價單右側快速導覽條"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                scrollToSection('top');
              }}
              className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200/80 transition-all active:scale-90"
              title="回到頁頂 (Top)"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <div className="w-5 h-px bg-slate-200 my-0.5" />
            <span className="text-[10px] font-black text-amber-700 writing-vertical select-none tracking-widest py-1 flex flex-col items-center leading-none gap-0.5">
              <span>導</span>
              <span>覽</span>
            </span>
            <div className="w-5 h-px bg-slate-200 my-0.5" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                scrollToSection('bottom');
              }}
              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center border border-slate-200 transition-all active:scale-90"
              title="前往頁底 (Bottom)"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Expanded State Full Nav Menu */}
        {!isCollapsed && (
          <>
            {/* Top button */}
            <div className="flex flex-col items-center w-full">
              <button
                type="button"
                onClick={() => scrollToSection('top')}
                className="w-full h-6 rounded-md bg-slate-50 hover:bg-amber-100 text-slate-600 hover:text-amber-800 text-[10px] font-bold flex items-center justify-center gap-0.5 transition-all active:scale-95 cursor-pointer border border-slate-200/60"
                title="回到頁頂 (Top)"
              >
                <ArrowUp className="w-3 h-3 text-amber-600" />
                <span className="text-[9px]">頁頂</span>
              </button>
            </div>

            <div className="w-full h-px bg-slate-200/80 my-0.5" />

            {/* Scrollable list of Nav Chips */}
            <div className="w-full max-h-[62vh] overflow-y-auto overflow-x-hidden flex flex-col items-center gap-1 py-0.5 pr-0.5 scrollbar-none">
              {/* 資料 (Particulars) */}
              <button
                type="button"
                onClick={() => scrollToSection('quote-section-info')}
                className={`w-full py-1 px-1 rounded-lg text-xs font-black transition-all cursor-pointer flex flex-col items-center justify-center leading-tight shadow-3xs active:scale-95 ${
                  activeSectionId === 'quote-section-info'
                    ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-300'
                    : 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200/70 hover:border-amber-300'
                }`}
                title="報價單基本資料（單號、客戶姓名、電話、裝修地址等）"
              >
                <span className="text-[11px] font-black">資料</span>
              </button>

              {/* Construction Categories (First 2 chars of each category) */}
              {categoryNavItems.map((catItem) => {
                const isActive = activeSectionId === catItem.id;
                return (
                  <button
                    key={catItem.id}
                    type="button"
                    onClick={() => scrollToSection(catItem.id)}
                    className={`w-full py-1 px-1 rounded-lg text-xs font-black transition-all cursor-pointer flex flex-col items-center justify-center leading-tight shadow-3xs active:scale-95 ${
                      isActive
                        ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-300'
                        : 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200/70 hover:border-amber-300'
                    }`}
                    title={`${catItem.fullName}${catItem.count > 0 ? ` (${catItem.count}項 · HK$${catItem.subtotal.toLocaleString()})` : ''}`}
                  >
                    <span className="text-[11px] font-black tracking-tight">{catItem.shortName}</span>
                  </button>
                );
              })}

              <div className="w-full h-px bg-slate-200/80 my-0.5" />

              {/* 收款 (Payment Stages) - User requested rename */}
              <button
                type="button"
                onClick={() => scrollToSection(paymentSectionId)}
                className={`w-full py-1 px-1 rounded-lg text-xs font-black transition-all cursor-pointer flex flex-col items-center justify-center leading-tight shadow-3xs active:scale-95 ${
                  activeSectionId === paymentSectionId
                    ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-300'
                    : 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200/70 hover:border-amber-300'
                }`}
                title="收款（工程期數與比例調配、各期試算與收款日期）"
              >
                <span className="text-[11px] font-black">收款</span>
              </button>

              {/* 合約 (T&C) */}
              <button
                type="button"
                onClick={() => scrollToSection(termsSectionId)}
                className={`w-full py-1 px-1 rounded-lg text-xs font-black transition-all cursor-pointer flex flex-col items-center justify-center leading-tight shadow-3xs active:scale-95 ${
                  activeSectionId === termsSectionId
                    ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-300'
                    : 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200/70 hover:border-amber-300'
                }`}
                title="合約專約條款與範本規定 (T&C)"
              >
                <span className="text-[11px] font-black">合約</span>
              </button>

              {/* 時程 (Schedule - if enabled) */}
              {editingQuote.scheduleEnabled && isOriginal && (
                <button
                  type="button"
                  onClick={() => scrollToSection('quote-section-schedule')}
                  className={`w-full py-1 px-1 rounded-lg text-xs font-black transition-all cursor-pointer flex flex-col items-center justify-center leading-tight shadow-3xs active:scale-95 ${
                    activeSectionId === 'quote-section-schedule'
                      ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-300'
                      : 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200/70 hover:border-amber-300'
                  }`}
                  title="施工時間表（施工作業步驟與工作天排程）"
                >
                  <span className="text-[11px] font-black">時程</span>
                </button>
              )}

              {/* 備注 (Memo) */}
              <button
                type="button"
                onClick={() => scrollToSection('quote-section-memo')}
                className={`w-full py-1 px-1 rounded-lg text-xs font-black transition-all cursor-pointer flex flex-col items-center justify-center leading-tight shadow-3xs active:scale-95 ${
                  activeSectionId === 'quote-section-memo'
                    ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-300'
                    : 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200/70 hover:border-amber-300'
                }`}
                title="內部草稿備註 / 工作備忘 (Internal Memo) 及待辦事項"
              >
                <span className="text-[11px] font-black">備注</span>
              </button>
            </div>

            <div className="w-full h-px bg-slate-200/80 my-0.5" />

            {/* Bottom Button */}
            <button
              type="button"
              onClick={() => scrollToSection('bottom')}
              className="w-full h-6 rounded-md bg-slate-50 hover:bg-amber-100 text-slate-600 hover:text-amber-800 text-[10px] font-bold flex items-center justify-center gap-0.5 transition-all active:scale-95 cursor-pointer border border-slate-200/60"
              title="前往頁底 (儲存 / 預覽 / 列印按鈕)"
            >
              <ArrowDown className="w-3 h-3 text-amber-600" />
              <span className="text-[9px]">頁底</span>
            </button>
          </>
        )}
      </div>
    </aside>
  );
};
