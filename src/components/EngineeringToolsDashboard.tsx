import React, { useState } from 'react';
import { 
  Calculator, 
  ExternalLink, 
  Maximize2, 
  RotateCcw, 
  Sparkles, 
  Layers, 
  Grid, 
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Info
} from 'lucide-react';

export interface EngineeringToolItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  badge?: string;
  badgeColor?: string;
  icon: string;
  description?: string;
  features?: string[];
  url: string;
  colorScheme: {
    bgGradient: string;
    border: string;
    hoverBorder: string;
    accentText: string;
    btnBg: string;
    btnHover: string;
  };
}

const TOOLS_CONFIG: EngineeringToolItem[] = [
  {
    id: 'scaffolding',
    title: '搭棚工程估算計算機',
    subtitle: '沈生搭棚',
    category: '外牆與棚架工程',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: '🪜',
    description: '專門針對香港裝修外牆搭棚工程設計，自動計算窗棚、低棚（窗台棚/冷氣棚/水喉棚）之階梯式定價與超長、超高加費，已含阻燃物料費用。',
    features: [
      '支援窗棚及低棚（窗台/冷氣/水喉棚）分類計價',
      '自訂 8 尺 / 10 尺 高度標準與超長加費即時累計',
      '多棚階梯式遞減優惠定價（首棚與次棚自動調價）',
      '特別區域與特殊樓宇結構（唐樓/村屋）注意事項'
    ],
    url: '/tools/棚架計數機.html',
    colorScheme: {
      bgGradient: 'from-amber-500/10 via-amber-50/50 to-orange-500/10',
      border: 'border-amber-200',
      hoverBorder: 'hover:border-amber-400',
      accentText: 'text-amber-800',
      btnBg: 'bg-amber-600',
      btnHover: 'hover:bg-amber-700'
    }
  },
  {
    id: 'aluminum_window',
    title: '鋁窗工程估算計算機',
    subtitle: 'BEN哥鋁窗',
    category: '鋁窗與玻璃工程',
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
    icon: '🪟',
    description: '提供尺數與毫米 (mm) 雙向自動換算，內建 50 料銀鋁/現有色版/內外雙色、開窗/梗窗最低標參、中空夾膠玻璃強化、窗花、冷氣機架及清拆舊窗全套計價。',
    features: [
      '支援「平方呎 (尺)」與「毫米 (mm)」雙模式無縫輸入',
      '開窗 (最低12尺) 與 梗窗 (最低10尺) 最低標參自動防呆',
      '中空/夾膠/磨砂/單雙面強化及大梗位厚料升級計算',
      '100 尺門檻最優惠計法一/計法二智慧比對與拆窗配件計算'
    ],
    url: '/tools/鋁窗估價價計算機.html',
    colorScheme: {
      bgGradient: 'from-sky-500/10 via-blue-50/50 to-indigo-500/10',
      border: 'border-sky-200',
      hoverBorder: 'hover:border-sky-400',
      accentText: 'text-sky-800',
      btnBg: 'bg-sky-600',
      btnHover: 'hover:bg-sky-700'
    }
  }
];

export default function EngineeringToolsDashboard() {
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState<number>(0);

  const activeTool = TOOLS_CONFIG.find(t => t.id === activeToolId);

  const handleOpenNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div id="engineering-tools-dashboard" className="space-y-6 text-left animate-fade-in">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-700/60 relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none text-white">
          <Calculator className="w-48 h-48" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
                <Calculator className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                其他工程報價小工具 (Specialized Quotation Tools)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-500/30">
                專項工種計價
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl font-medium">
              整合各專業分判與專項工種之獨立估算計算機。支援在系統內直接嵌入操作或開啟獨立視窗，快速計算搭棚及鋁窗工程金額。
            </p>
          </div>

          {activeTool && (
            <button
              type="button"
              onClick={() => setActiveToolId(null)}
              className="self-start md:self-auto px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-white/20 active:scale-95 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>返回工具選單</span>
            </button>
          )}
        </div>
      </div>

      {/* Embedded Iframe Tool View */}
      {activeTool ? (
        <div className="space-y-4 animate-scale-up">
          {/* Active Tool Control Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="text-2xl">{activeTool.icon}</div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-800">{activeTool.title}</h3>
                  {activeTool.badge && (
                    <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full border ${activeTool.badgeColor}`}>
                      {activeTool.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 font-bold">{activeTool.subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIframeKey(k => k + 1)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-3xs"
                title="重新整理計算機"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>重設計算</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenNewTab(activeTool.url)}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-3xs"
                title="於新分頁開啟"
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-700" />
                <span>獨立新分頁開啟</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveToolId(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-3xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>切換其他工具</span>
              </button>
            </div>
          </div>

          {/* Iframe Frame Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden min-h-[750px] relative">
            <iframe
              key={iframeKey}
              src={activeTool.url}
              title={activeTool.title}
              className="w-full h-[780px] border-0 rounded-2xl"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        </div>
      ) : (
        /* Tools Selection Grid (2 distinct entrance cards) */
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-black text-slate-800">請選擇欲使用的工程報價估算工具：</h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">共 2 款專項工具</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {TOOLS_CONFIG.map((tool) => (
              <div
                key={tool.id}
                className={`bg-white rounded-2xl border ${tool.colorScheme.border} ${tool.colorScheme.hoverBorder} shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:-translate-y-0.5`}
              >
                {/* Card Top Banner / Category */}
                <div className={`p-5 bg-gradient-to-br ${tool.colorScheme.bgGradient} border-b border-slate-100 flex items-start justify-between gap-3`}>
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200/80 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
                      {tool.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                          {tool.category}
                        </span>
                        {tool.badge && (
                          <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full border ${tool.badgeColor}`}>
                            {tool.badge}
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-black text-slate-900 mt-0.5">
                        {tool.title}
                      </h4>
                      <p className={`text-xs font-extrabold ${tool.colorScheme.accentText} mt-0.5`}>
                        {tool.subtitle}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-end">
                  {/* Action Entrance Buttons */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setActiveToolId(tool.id)}
                      className={`py-2.5 px-3 ${tool.colorScheme.btnBg} ${tool.colorScheme.btnHover} text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98`}
                      title="直接在此頁面開啟使用"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>進入系統內計算</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenNewTab(tool.url)}
                      className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200/80 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 shadow-3xs"
                      title="在新視窗/新分頁中開啟獨立網頁"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                      <span>新分頁開啟</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tips card */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-xs text-amber-900">
              <span className="font-black block">💡 專項工具使用提示：</span>
              <p className="text-[11px] leading-relaxed font-medium">
                上述小工具由獨立 HTML/JS 演算法驅動，計算完成後可直接複製結果或參考金額，並填入「工程合約報價總覽」或「標準細項庫」中，以便與客戶簽署合約及列印標準 PDF 報價單。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
