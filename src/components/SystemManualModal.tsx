import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  BookOpen, Printer, Download, X, Search, ChevronRight, CheckCircle2, 
  FileText, Calendar, Coins, ClipboardCheck, BarChart3, Settings, 
  Database, Shield, Wifi, Smartphone, Bell, Layers, Sparkles, Check, 
  ArrowRight, Clock, AlertTriangle, UserCheck, RefreshCw, FileSpreadsheet, 
  DollarSign, MapPin, Eye, Lock, Zap, ArrowDown, FolderArchive, HelpCircle,
  ExternalLink
} from 'lucide-react';

interface SystemManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemVersion?: string;
}

export const SystemManualModal: React.FC<SystemManualModalProps> = ({
  isOpen,
  onClose,
  systemVersion = '3.1.76'
}) => {
  const [activeSection, setActiveSection] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const manualContainerRef = useRef<HTMLDivElement>(null);

  // Set up print listeners to ensure clean styling when printing or saving as PDF
  useEffect(() => {
    if (!isOpen) return;
    const handleBeforePrint = () => {
      document.body.classList.add('printing-system-manual');
    };
    const handleAfterPrint = () => {
      document.body.classList.remove('printing-system-manual');
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      document.body.classList.remove('printing-system-manual');
    };
  }, [isOpen]);

  // Open full manual in a standalone top-level browser tab (independent of any iframe constraints)
  const handleOpenInNewTab = () => {
    const element = manualContainerRef.current;
    if (!element) return;

    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('請允許瀏覽器開啟快顯視窗 (Pop-up)，以便在新分頁開啟手冊。');
        return;
      }

      const htmlContent = element.innerHTML;
      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="zh-HK">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>築匠_系統功能操作手冊與業務流程圖_V${systemVersion}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .manual-page-break-after { page-break-after: always; break-after: page; }
                .manual-avoid-break { page-break-inside: avoid; break-inside: avoid; }
              }
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            </style>
          </head>
          <body class="bg-white p-6 sm:p-10 max-w-5xl mx-auto text-slate-800">
            <div class="print:hidden mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between shadow-sm">
              <div class="space-y-0.5">
                <div class="font-extrabold text-sm text-amber-950">築匠 Artisan Studio 系統操作手冊獨立檢視視窗</div>
                <div class="text-xs text-amber-800">獨立分頁不含任何 iframe 限制，可完整預覽或透過瀏覽器列印為 PDF。</div>
              </div>
              <button onclick="window.print()" style="padding: 8px 18px; background: #d97706; color: white; border-radius: 8px; font-weight: 700; cursor: pointer; border: none; font-size: 13px;">
                🖨️ 立即列印 / 另存為 PDF
              </button>
            </div>
            ${htmlContent}
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (e) {
      console.error('開啟獨立視窗失敗:', e);
    }
  };

  // Direct PDF Download Handler - renders unclipped DOM to standard A4 PDF file via html2pdf
  const handleDownloadPDF = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setDownloadSuccess(false);

    const prevSection = activeSection;
    const prevSearch = searchQuery;

    // Expand all sections and clear search query to guarantee full manual inclusion
    setActiveSection('all');
    setSearchQuery('');

    try {
      // Small pause for React state flush and DOM layout stabilization
      await new Promise((resolve) => setTimeout(resolve, 350));

      const element = manualContainerRef.current;
      if (!element) {
        throw new Error('找不到手冊容器');
      }

      // Clone content to isolated unclipped node with fixed desktop width
      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.width = '820px';
      clone.style.maxWidth = '820px';
      clone.style.height = 'auto';
      clone.style.maxHeight = 'none';
      clone.style.overflow = 'visible';
      clone.style.position = 'absolute';
      clone.style.left = '-99999px';
      clone.style.top = '0';
      clone.style.background = '#ffffff';
      clone.style.color = '#1e293b';
      clone.style.padding = '24px';
      clone.id = 'manual-direct-pdf-clone';

      document.body.appendChild(clone);

      // Load client-side html2pdf
      const html2pdfModule: any = await import('html2pdf.js');
      const html2pdf: any = html2pdfModule.default || html2pdfModule;

      const opt = {
        margin: [8, 8, 8, 8],
        filename: `築匠_系統功能操作手冊與業務流程圖_V${systemVersion}.pdf`,
        image: { type: 'jpeg', quality: 0.96 },
        html2canvas: {
          scale: 1.6,
          useCORS: true,
          logging: false,
          scrollY: 0,
          scrollX: 0,
          windowWidth: 1000
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait'
        },
        pagebreak: {
          mode: ['avoid-all', 'css', 'legacy']
        }
      };

      await html2pdf().set(opt).from(clone).save();

      // Remove temporary clone from DOM
      if (document.body.contains(clone)) {
        document.body.removeChild(clone);
      }

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('下載 PDF 失敗:', err);
      // Fallback: If html2pdf encountered a client restriction, offer standalone window
      alert('直接轉換 PDF 遭遇瀏覽器限制，系統已為您開啟獨立列印分頁，可點擊另存為 PDF。');
      handleOpenInNewTab();
    } finally {
      setIsGeneratingPdf(false);
      setActiveSection(prevSection);
      setSearchQuery(prevSearch);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      id="system-manual-modal-container"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto animate-fade-in print:p-0 print:bg-white print:static print:inset-auto"
    >
      {/* Modal Container */}
      <div 
        id="system-manual-modal-card"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[94vh] flex flex-col overflow-hidden print:border-none print:shadow-none print:w-full print:h-auto print:max-w-none print:rounded-none"
      >
        
        {/* Header - Screen Only */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white tracking-wide">系統功能操作手冊與業務流程圖</h3>
                <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  V{systemVersion}
                </span>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full hidden sm:inline-block">
                  支援直接下載 PDF
                </span>
              </div>
              <p className="text-xs text-slate-400">築匠 Artisan Studio｜全功能深度解析・操作規範・業務閉環流程導引</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
              title="直接下載完整系統說明書與業務流程圖 (PDF 檔案)"
            >
              {isGeneratingPdf ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : downloadSuccess ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>
                {isGeneratingPdf ? '正在生成 PDF...' : downloadSuccess ? '已成功下載 PDF！' : '直接下載 PDF 說明書'}
              </span>
            </button>

            <button
              onClick={handleOpenInNewTab}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-650 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
              title="在新視窗獨立開啟手冊（支援另存為 PDF）"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">新分頁開啟</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="關閉手冊"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar & Filter - Screen Only */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 text-xs font-bold text-slate-600">
            <span className="text-slate-400 text-2xs uppercase tracking-wider mr-1">目錄導覽：</span>
            {[
              { id: 'all', label: '📖 全部內容' },
              { id: 'flowcharts', label: '🗺️ 業務全流程圖' },
              { id: 'modules', label: '📋 核心功能模組' },
              { id: 'dorders', label: '🎯 D單進度管理' },
              { id: 'calendar', label: '📅 行事曆與推播' },
              { id: 'contracts', label: '📄 報價與合約' },
              { id: 'database', label: '🗄️ 資料庫與備份' },
              { id: 'tips', label: '💡 技巧與常見問答' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition-all cursor-pointer ${
                  activeSection === tab.id 
                    ? 'bg-amber-500 text-white shadow-xs font-bold' 
                    : 'bg-white text-slate-700 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜尋手冊章節、功能或關鍵字..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Content Container (Also Printable A4 Document Body) */}
        <div 
          id="system-manual-content-scroll"
          ref={manualContainerRef} 
          className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-12 text-slate-800 leading-relaxed print:p-0 print:space-y-8 print:overflow-visible"
        >
          
          {/* ============================================================ */}
          {/* 1. COVER / HEADER SECTION (A4 First Page in Print Mode)       */}
          {/* ============================================================ */}
          <div className="manual-section manual-page-break-after bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 text-white rounded-2xl p-6 sm:p-10 shadow-lg border border-slate-800 relative overflow-hidden print:rounded-none print:bg-white print:text-black print:border-b-2 print:border-amber-600 print:p-6 print:shadow-none">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-amber-500 text-slate-950 text-xs font-black tracking-widest uppercase rounded-md shadow-xs print:bg-amber-600 print:text-white">
                  OFFICIAL SYSTEM MANUAL
                </span>
                <span className="text-xs text-amber-300 font-mono font-bold">版本 Version {systemVersion}</span>
                <span className="text-xs text-slate-400 font-medium">發布日期：2026-09-09</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white print:text-slate-900">
                築匠 Artisan Studio 裝修工程管理系統
              </h1>
              <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed print:text-slate-700">
                全功能操作手冊・業務全流程導覽・圖文功能詳解・工程合約標準指引
              </p>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-700/80 text-xs print:border-slate-300 print:pt-3">
                <div>
                  <div className="text-slate-400 text-2xs print:text-slate-500">系統架構</div>
                  <div className="font-bold text-slate-200 print:text-slate-800">React 18 + PWA + Firebase 雲端</div>
                </div>
                <div>
                  <div className="text-slate-400 text-2xs print:text-slate-500">核心業務</div>
                  <div className="font-bold text-slate-200 print:text-slate-800">D單設計・A單報價・排程・收款</div>
                </div>
                <div>
                  <div className="text-slate-400 text-2xs print:text-slate-500">特色機制</div>
                  <div className="font-bold text-slate-200 print:text-slate-800">晨間8點推播・協同鎖・雙重備份</div>
                </div>
                <div>
                  <div className="text-slate-400 text-2xs print:text-slate-500">系統維護</div>
                  <div className="font-bold text-slate-200 print:text-slate-800">WHLEE | Artisan Studio</div>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* 2. TABLE OF CONTENTS                                         */}
          {/* ============================================================ */}
          <div className="manual-section manual-page-break-after bg-slate-50 border border-slate-200 rounded-xl p-5 print:bg-white print:border-slate-300">
            <h2 className="text-base font-black text-slate-900 mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              <span>說明書目錄章節 (Table of Contents)</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
              <div className="space-y-1.5">
                <div className="font-bold text-amber-800">第一部分：核心業務全流程圖 (Workflows)</div>
                <ul className="pl-4 space-y-1 text-slate-600 list-disc">
                  <li><b>流程圖一：</b>裝修工程全生命週期閉環流程 (接洽至完工)</li>
                  <li><b>流程圖二：</b>D單（設計訂金）6 階段推進與轉A單機制</li>
                  <li><b>流程圖三：</b>報價單與工程合約狀態機 (Quotation State Flow)</li>
                  <li><b>流程圖四：</b>工程日曆排程與每日 8:00 AM 晨間推播作業</li>
                  <li><b>流程圖五：</b>財務四期收款、收據列印與未收結餘管理</li>
                </ul>
              </div>
              <div className="space-y-1.5">
                <div className="font-bold text-amber-800">第二部分：主要功能模組詳細指南 (Module Guides)</div>
                <ul className="pl-4 space-y-1 text-slate-600 list-disc">
                  <li><b>模組 01：</b>報價單與工程合約管理（搜尋、進階篩選、狀態）</li>
                  <li><b>模組 02：</b>工程項目編輯器與浮動文字格式化工具列</li>
                  <li><b>模組 03：</b>D單專屬設計進度表與丈量大訂收據開立</li>
                  <li><b>模組 04：</b>行事曆與工程日曆（月/週/日/甘特、人員色彩）</li>
                  <li><b>模組 05：</b>A單收款進度、階段拆款與收據列印</li>
                  <li><b>模組 06：</b>數據分析與營運 Dashboard 儀表板</li>
                  <li><b>模組 07：</b>內部施工核對清單 (Checklist)</li>
                  <li><b>模組 08：</b>工藝標準與單價知識庫 (Excel 匯入/同步)</li>
                  <li><b>模組 09：</b>合約條款範本、自訂追加與公司防偽印章</li>
                  <li><b>模組 10：</b>Firebase 雲端同步、雙重安全備份與 IndexedDB 離線快取</li>
                </ul>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* 3. BUSINESS FLOWCHARTS (HIGH-DEFINITION VISUAL DIAGRAMS)     */}
          {/* ============================================================ */}
          {(activeSection === 'all' || activeSection === 'flowcharts') && (
            <div className="manual-section space-y-8 print:space-y-6">
              <div className="border-b-2 border-amber-500 pb-2">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="w-2.5 h-6 bg-amber-500 rounded-sm"></span>
                  <span>第一部分：系統核心業務流程圖 (Business Flowcharts)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  直觀掌握裝修合約、設計圖稿、施工進度、款項追蹤的端到端完整標準工作流程。
                </p>
              </div>

              {/* 流程圖一：總體閉環流程 */}
              <div className="manual-avoid-break bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 print:border-slate-300">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-xs font-black flex items-center justify-center">1</span>
                    <span>裝修工程總體業務閉環全流程 (End-to-End Workflow)</span>
                  </h3>
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    核心標準作業程序 (SOP)
                  </span>
                </div>

                {/* Visual Flow Blocks */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-xs text-center">
                  <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 space-y-1.5 flex flex-col justify-between">
                    <div className="font-bold text-amber-900 flex items-center justify-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-amber-600" />
                      <span>階段一：接洽開單</span>
                    </div>
                    <p className="text-2xs text-slate-600">登記客戶姓名、地址、電話，建立 D單 (設計訂金) 或 A單 (工程合約)</p>
                    <div className="text-3xs font-mono font-bold text-amber-700 bg-white/80 p-1 rounded border border-amber-100">
                      收開單訂金 $500~$2000
                    </div>
                  </div>

                  <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 space-y-1.5 flex flex-col justify-between">
                    <div className="font-bold text-blue-900 flex items-center justify-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      <span>階段二：度尺與設計</span>
                    </div>
                    <p className="text-2xs text-slate-600">行事曆安排度尺預約，現場實測出平面圖與初步報價草案</p>
                    <div className="text-3xs font-mono font-bold text-blue-700 bg-white/80 p-1 rounded border border-blue-100">
                      平面圖確認 & 草擬報價
                    </div>
                  </div>

                  <div className="bg-purple-50/70 border border-purple-200 rounded-lg p-3 space-y-1.5 flex flex-col justify-between">
                    <div className="font-bold text-purple-900 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                      <span>階段三：簽約轉A單</span>
                    </div>
                    <p className="text-2xs text-slate-600">預約會議講解項目明細、確認條款、簽約並轉為正式工程A單</p>
                    <div className="text-3xs font-mono font-bold text-purple-700 bg-white/80 p-1 rounded border border-purple-100">
                      收取大訂 (首期款 40%)
                    </div>
                  </div>

                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 space-y-1.5 flex flex-col justify-between">
                    <div className="font-bold text-emerald-900 flex items-center justify-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      <span>階段四：施工與排程</span>
                    </div>
                    <p className="text-2xs text-slate-600">行事曆排定泥木水電油漆各工期，施工核對清單逐項交收驗收</p>
                    <div className="text-3xs font-mono font-bold text-emerald-700 bg-white/80 p-1 rounded border border-emerald-100">
                      晨間8點行程推播追蹤
                    </div>
                  </div>

                  <div className="bg-rose-50/70 border border-rose-200 rounded-lg p-3 space-y-1.5 flex flex-col justify-between">
                    <div className="font-bold text-rose-900 flex items-center justify-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-rose-600" />
                      <span>階段五：收款與完工</span>
                    </div>
                    <p className="text-2xs text-slate-600">依中期款、傢俬款、完工驗收尾款推進，開立收據，合約歸檔</p>
                    <div className="text-3xs font-mono font-bold text-rose-700 bg-white/80 p-1 rounded border border-rose-100">
                      餘額清零，狀態改為完工
                    </div>
                  </div>
                </div>
              </div>

              {/* 流程圖二：D單 6 階段推進圖 */}
              <div className="manual-avoid-break bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 print:border-slate-300">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-xs font-black flex items-center justify-center">2</span>
                    <span>D單（設計訂金單）6 大推進步驟與轉A單機制</span>
                  </h3>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    D-Order 6-Step Pipeline
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
                    {[
                      { step: 'Step 1', title: '登記訂金', desc: '登記收取丈量訂金（如FPS $500），列印收據', role: '門市 / 設計師' },
                      { step: 'Step 2', title: '預約度尺', desc: '排入日曆、現場量度尺寸、記錄現場環境', role: '設計師 / 工程人員' },
                      { step: 'Step 3', title: '出平面圖', desc: '繪製傢俬與間隔平面規劃圖與客溝通', role: '設計師' },
                      { step: 'Step 4', title: '草擬報價', desc: '系統編制詳細工程報價單並連結 D單', role: '設計師 / 業務員' },
                      { step: 'Step 5', title: '確認報價/大訂', desc: '約客講解報價、確認總額、收取大訂金', role: '設計師 / 主管' },
                      { step: 'Step 6', title: '確認轉A單', desc: '正式轉為工程A單合約，自動進入施工管理', role: '工程部' },
                    ].map((item, i) => (
                      <div key={i} className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/50 flex flex-col justify-between">
                        <div>
                          <span className="text-2xs font-mono font-black text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded">
                            {item.step}
                          </span>
                          <h4 className="font-bold text-slate-900 mt-1">{item.title}</h4>
                          <p className="text-2xs text-slate-600 mt-1 leading-snug">{item.desc}</p>
                        </div>
                        <div className="mt-2 pt-1 border-t border-slate-200 text-3xs text-slate-400 font-bold">
                          負責：{item.role}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-3 flex items-center gap-3">
                    <div className="p-1.5 bg-amber-500 text-white rounded-md shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="text-2xs text-slate-700 leading-relaxed">
                      <b>重要業務特性：</b> 當 Step 1 至 Step 6 全部勾選完成後，系統會將此 D單標記為已完成 (Completed) 並自動從「進行中 D單」歸檔至「已確認 A單」分類，免去重複翻查，工作清單保持精簡乾淨！
                    </div>
                  </div>
                </div>
              </div>

              {/* 流程圖三：合約狀態生命週期 */}
              <div className="manual-avoid-break bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 print:border-slate-300">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-xs font-black flex items-center justify-center">3</span>
                    <span>工程合約報價狀態流轉狀態機 (Quotation State Flow)</span>
                  </h3>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    合約生命週期
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs text-center">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                    <div className="font-bold text-slate-700">未報價 (pending)</div>
                    <p className="text-3xs text-slate-500 mt-1">新建草稿，仍在填寫工程項目</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                    <div className="font-bold text-blue-700">已報價 (quoted)</div>
                    <p className="text-3xs text-slate-500 mt-1">報價單已發送客戶等待回覆</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                    <div className="font-bold text-amber-700">已簽約 (signed)</div>
                    <p className="text-3xs text-slate-500 mt-1">客戶確認簽字並交付首期款</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                    <div className="font-bold text-emerald-700">施工中 (constructing)</div>
                    <p className="text-3xs text-slate-500 mt-1">工地進場，泥水水電進行中</p>
                  </div>
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-2.5">
                    <div className="font-bold text-teal-700">施工完成 (finished)</div>
                    <p className="text-3xs text-slate-500 mt-1">現場清潔交吉，進行細節修補</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-2.5">
                    <div className="font-bold text-green-700">完工結清 (completed)</div>
                    <p className="text-3xs text-slate-500 mt-1">尾款收齊，餘額清零正式結案</p>
                  </div>
                </div>
              </div>

              {/* 流程圖四：行事曆排程與推播通知 */}
              <div className="manual-avoid-break bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 print:border-slate-300">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-xs font-black flex items-center justify-center">4</span>
                    <span>工程日曆排程與每日 8:00 AM 晨間行程推播 (Calendar & Push SOP)</span>
                  </h3>
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    智能排程與自動提醒
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                      <span>1. 登記排程事件</span>
                    </div>
                    <p className="text-2xs text-slate-600">登記度尺、複尺、駐場、送貨、驗收或假期。設定時間、地點與備註。</p>
                  </div>

                  <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>2. 人員色彩辨識</span>
                    </div>
                    <p className="text-2xs text-slate-600">自動綁定登記設計師專屬色彩標籤，支援按團隊成員獨立過濾檢視。</p>
                  </div>

                  <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-purple-600" />
                      <span>3. 每日晨間 8:00 推播</span>
                    </div>
                    <p className="text-2xs text-slate-600">系統每天早晨 8:00 自動彙整今日所有行程、度尺、駐場，發送手機與電腦推播。</p>
                  </div>

                  <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>4. 施工進度比對</span>
                    </div>
                    <p className="text-2xs text-slate-600">切換至甘特圖視圖，即時比對合約設定之工期（泥水/木工/油漆）與實際進度。</p>
                  </div>
                </div>
              </div>

              {/* 流程圖五：財務收款與收據流程 */}
              <div className="manual-avoid-break bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 print:border-slate-300">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-xs font-black flex items-center justify-center">5</span>
                    <span>工程款分期、收據開立與未收結餘管理 (Payment Workflow)</span>
                  </h3>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    財務收款閉環
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                  <div className="font-bold text-slate-800">標準四期付款比率規範：</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-2xs">
                    <div className="p-2 bg-white rounded border border-slate-200">
                      <span className="font-bold text-amber-700">第一期：訂金 (40%)</span>
                      <div className="text-slate-500">簽署合約時繳付</div>
                    </div>
                    <div className="p-2 bg-white rounded border border-slate-200">
                      <span className="font-bold text-amber-700">第二期：泥水款 (30%)</span>
                      <div className="text-slate-500">水電泥水完成時繳付</div>
                    </div>
                    <div className="p-2 bg-white rounded border border-slate-200">
                      <span className="font-bold text-amber-700">第三期：傢俬款 (20%)</span>
                      <div className="text-slate-500">訂造傢俬進場時繳付</div>
                    </div>
                    <div className="p-2 bg-white rounded border border-slate-200">
                      <span className="font-bold text-amber-700">第四期：尾款 (10%)</span>
                      <div className="text-slate-500">完工清潔驗收時結清</div>
                    </div>
                  </div>
                  <p className="text-2xs text-slate-600 mt-2">
                    💡 <b>收據列印功能：</b> 在「A單收款進度」分頁或合約編輯器中，可隨時針對已收期數點擊「列印收據」，自動套用公司名稱、銀行帳戶、FPS編號及紅色專屬印章，產出具備法律憑證之 A4 收款收據！
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 4. CORE FUNCTION MODULES (DETAILED USAGE GUIDELINES)         */}
          {/* ============================================================ */}
          {(activeSection === 'all' || activeSection === 'modules' || activeSection === 'contracts') && (
            <div className="manual-section space-y-8 print:space-y-6">
              <div className="border-b-2 border-amber-500 pb-2">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="w-2.5 h-6 bg-amber-500 rounded-sm"></span>
                  <span>第二部分：核心功能模組操作指南 (Module Detailed Guide)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  詳細解析各頁面模組的操作按鈕、操作步驟、欄位設定與實務注意事項。
                </p>
              </div>

              {/* 模組 01：合約報價總覽與進階篩選 */}
              <div className="manual-avoid-break bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 print:border-slate-300">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-600" />
                    <h3 className="text-sm font-bold text-slate-900">模組 01：合約報價管理、即時搜尋與多維度篩選</h3>
                  </div>
                  <span className="text-2xs text-slate-500 font-mono">頁面：工程合約報價總覽</span>
                </div>

                {/* UI Mockup Card */}
                <div className="bg-slate-900 text-slate-100 rounded-lg p-3.5 space-y-2.5 text-xs font-mono border border-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-slate-400 text-2xs">
                    <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                      <Eye className="w-3.5 h-3.5" /> 介面功能佈局模擬 (UI Breakdown)
                    </span>
                    <span>[頂部搜尋列 + 分段按鈕 + 篩選標籤]</span>
                  </div>
                  <div className="bg-slate-800/80 p-2.5 rounded border border-slate-700 space-y-2">
                    <div className="flex items-center gap-2 text-2xs">
                      <span className="bg-slate-700 px-2 py-1 rounded text-slate-300">🔍 搜尋：客戶/地址/單號</span>
                      <span className="bg-amber-600 text-white px-2 py-1 rounded font-bold">全部 (All)</span>
                      <span className="bg-slate-700 text-slate-300 px-2 py-1 rounded">D單 (訂金單)</span>
                      <span className="bg-slate-700 text-slate-300 px-2 py-1 rounded">A單 (工程合約)</span>
                      <span className="ml-auto bg-slate-700 px-2 py-1 rounded text-slate-300">篩選：負責設計師 ▼</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-3xs text-amber-300/80">
                      <span>🏷️ 已套用標籤：</span>
                      <span className="bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 rounded">設計師: Alex ×</span>
                      <span className="bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 rounded">未收餘額 &gt; 0 ×</span>
                      <span className="text-slate-400 underline cursor-pointer">清除全部</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                    <h4 className="font-bold text-slate-900">1. 單號類型快速切換</h4>
                    <p className="text-2xs text-slate-600">透過分段膠囊按鈕一鍵切換「全部」、「D單 (設計訂金單)」或「A單 (工程合約)」，快速聚焦目標合約。</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                    <h4 className="font-bold text-slate-900">2. 負責設計師專屬篩選</h4>
                    <p className="text-2xs text-slate-600">動態彙整所有建立與指派的設計師名冊，主管可迅速按設計師過濾其負責的報價與工程進度。</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                    <h4 className="font-bold text-slate-900">3. 單張 JSON 備份與上載</h4>
                    <p className="text-2xs text-slate-600">每張報價單均支援獨立導出為 JSON 檔，亦可透過「上載報價單」按鈕快速將歷史檔案匯入系統。</p>
                  </div>
                </div>
              </div>

              {/* 模組 02：報價項目編輯器與格式化工具列 */}
              <div className="manual-avoid-break bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 print:border-slate-300">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                    <h3 className="text-sm font-bold text-slate-900">模組 02：工程項目編輯器、單位計價與浮動修訂工具列</h3>
                  </div>
                  <span className="text-2xs text-slate-500 font-mono">組件：Quotation Item Editor</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900">工程項目與數量單價計算</h4>
                    <ul className="space-y-1.5 text-2xs text-slate-600 list-disc pl-4">
                      <li><b>標準工程大類：</b>涵蓋泥水、木工、油漆、水電、訂造傢俬、拆卸、鋁窗及雜項。</li>
                      <li><b>常用工程單位：</b>支援快速選擇【項】、【直呎】、【平方呎】、【個】、【式】、【位】、【組】、【套】。</li>
                      <li><b>智慧空值優化：</b>輸入單價或數量退格清空時自動留白，避免殘留「0」導致鍵入錯誤。</li>
                      <li><b>整單或單項折讓：</b>可針對指定項目折讓或輸入全單總折扣，金額自動即時重新計算。</li>
                    </ul>
                  </div>

                  <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3 space-y-2 text-2xs">
                    <h4 className="font-bold text-amber-900 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-600" />
                      <span>浮動格式化修訂工具列 (Formatting Toolbar)</span>
                    </h4>
                    <p className="text-slate-600 leading-relaxed">
                      在項目名稱或備註欄位選取文字時，浮動工具列會自動就緒，支援快速套用：
                    </p>
                    <div className="flex flex-wrap gap-1.5 text-3xs font-mono font-bold">
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded">[red] 紅字改動</span>
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 border border-blue-200 rounded">[blue] 藍字備註</span>
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded">[green] 綠字確認</span>
                      <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded line-through">~~刪除線~~</span>
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">**粗體標記**</span>
                    </div>
                    <p className="text-3xs text-slate-500">列印報價單時將如實渲染醒目高對比色彩，客戶與師傅對修改項目一目了然！</p>
                  </div>
                </div>
              </div>

              {/* 模組 03：D單進度表 */}
              <div className="manual-avoid-break bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 print:border-slate-300">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-amber-600" />
                    <h3 className="text-sm font-bold text-slate-900">模組 03：D單進度表（設計訂金單專屬管線）</h3>
                  </div>
                  <span className="text-2xs text-slate-500 font-mono">頁面：D單進度表</span>
                </div>

                <div className="text-xs space-y-2">
                  <p className="text-slate-700 leading-relaxed">
                    D單進度表專為室內設計與傢俬訂做前期流程設計，將原本容易遺漏的度尺、出圖、約見講報價等繁瑣環節標準化為 6 大看板步驟：
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-2xs">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="font-bold text-slate-900">三種進度分頁</div>
                      <p className="text-slate-600 mt-1">「進行中 D單」、「已確認 A單」與「未簽約單」，清晰區隔各案場推進狀態。</p>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="font-bold text-slate-900">會議時間地點預約</div>
                      <p className="text-slate-600 mt-1">Step 5 支援登記會議日期、時間與會面地點，自動同步至系統並可連動行事曆提醒。</p>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="font-bold text-slate-900">直接開立訂金收據</div>
                      <p className="text-slate-600 mt-1">Step 1 與 Step 5 均可登記收款方式與金額，一鍵列印出正式度尺或大訂收據。</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 模組 04：行事曆與排程 */}
              <div className="manual-avoid-break bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 print:border-slate-300">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-amber-600" />
                    <h3 className="text-sm font-bold text-slate-900">模組 04：工程行事曆、甘特工期圖與每日 8:00 AM 晨間推播</h3>
                  </div>
                  <span className="text-2xs text-slate-500 font-mono">組件：CalendarDashboard</span>
                </div>

                <div className="text-xs space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-2xs">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                      <div className="font-bold text-slate-900">多模式切換</div>
                      <p className="text-slate-600">支援【月曆網格 (Month Grid)】、【週曆 (Week)】、【日曆清單 (Day List)】及【工程甘特進度圖 (Gantt)】。</p>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                      <div className="font-bold text-slate-900">設計師專屬色彩標記</div>
                      <p className="text-slate-600">全面對接系統所有使用者帳號，每位同仁擁有專屬色調，並以規範名稱去重，行事曆清爽不混淆。</p>
                    </div>
                  </div>

                  <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-2xs space-y-1.5">
                    <div className="font-bold text-amber-900 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-amber-600" />
                      <span>每日早晨 8:00 AM 智慧晨間行程推播 (Web Push Briefing)</span>
                    </div>
                    <p className="text-slate-600">
                      系統內建 Service Worker 與推播排程演算法，每天上午 8:00 自動計算當天全公司或個人相關之工程度尺、會議、重要送貨與假期安排，自動向手機或桌面發送通知，確保當日行程零疏漏！
                    </p>
                  </div>
                </div>
              </div>

              {/* 模組 05：A單收款進度 */}
              <div className="manual-avoid-break bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 print:border-slate-300">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-600" />
                    <h3 className="text-sm font-bold text-slate-900">模組 05：A單收款進度與收款收據列印</h3>
                  </div>
                  <span className="text-2xs text-slate-500 font-mono">頁面：A單收款進度</span>
                </div>

                <div className="text-xs space-y-2">
                  <p className="text-slate-600 leading-relaxed">
                    即時匯總所有工程合約的應收總額、已收金額及剩餘未收結餘 (Outstanding Balance)。提供收款快速過濾功能（全部 / 尚有未收款 / 已全數結清）。
                  </p>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-2xs space-y-1.5">
                    <div className="font-bold text-slate-900">收據開立機制：</div>
                    <p className="text-slate-600">
                      當客戶完成某期工程款繳納後，只要將該階段標記為「已付款」，點擊收據圖示即可直接啟動列印，收據包含完整客戶地址、單號、已收款項大寫金額、收款方式及公司官方簽印章。
                    </p>
                  </div>
                </div>
              </div>

              {/* 模組 06：數據分析儀表板 */}
              <div className="manual-avoid-break bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 print:border-slate-300">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-amber-600" />
                    <h3 className="text-sm font-bold text-slate-900">模組 06：數據分析 & 營運 Dashboard</h3>
                  </div>
                  <span className="text-2xs text-slate-500 font-mono">組件：AnalyticsDashboard</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-2xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="font-bold text-slate-900">營收與合約總覽</div>
                    <p className="text-slate-600 mt-1">累計合約總額、已收總額、待收總額及簽單總數，直觀反映公司整體財務狀況。</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="font-bold text-slate-900">工程類別分佈</div>
                    <p className="text-slate-600 mt-1">圖表分析泥水、木工、水電、油漆各項工程金額佔比，掌握公司產能焦點。</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="font-bold text-slate-900">設計師業績排行</div>
                    <p className="text-slate-600 mt-1">統計各團隊成員的簽約合約數、成交總額與轉化效率，激勵業務成長。</p>
                  </div>
                </div>
              </div>

              {/* 模組 07：工藝知識庫與單價資料庫 */}
              <div className="manual-avoid-break bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 print:border-slate-300">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-amber-600" />
                    <h3 className="text-sm font-bold text-slate-900">模組 07：工藝標準與單價知識庫 (Knowledge Database)</h3>
                  </div>
                  <span className="text-2xs text-slate-500 font-mono">組件：DatabaseManagerModal</span>
                </div>

                <div className="text-xs space-y-2">
                  <p className="text-slate-600">
                    提供完整的裝修單價與標準施工細則庫。支援由 Excel (.xlsx) 檔案一鍵批量匯入或導出備份。具備「單價防護遮罩 (Mask Lock)」功能，需主管權限解鎖方可檢視底價或批次修改，確保報價標準與商業機密安全。
                  </p>
                </div>
              </div>

              {/* 模組 08：雲端同步與備份還原 */}
              <div className="manual-avoid-break bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 print:border-slate-300">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-600" />
                    <h3 className="text-sm font-bold text-slate-900">模組 08：Firebase 雲端同步、雙重驗證還原與 IndexedDB 離線支援</h3>
                  </div>
                  <span className="text-2xs text-slate-500 font-mono">核心架構</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-2xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="font-bold text-slate-900">Firebase 即時同步</div>
                    <p className="text-slate-600 mt-1">多裝置即時同步，並內建智慧省流模式，閒置自動暫停監聽以節省配額。</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="font-bold text-slate-900">雙重安全驗證還原</div>
                    <p className="text-slate-600 mt-1">備份還原操作具破壞性，系統設有防呆雙重驗證，徹底杜絕誤點覆寫事故。</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="font-bold text-slate-900">離線唯讀防護</div>
                    <p className="text-slate-600 mt-1">斷網時自動啟用 IndexedDB 離線快取瀏覽，並鎖定寫入防止資料版本衝突。</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 5. PRO TIPS, FAQ & SHORTCUTS                                 */}
          {/* ============================================================ */}
          {(activeSection === 'all' || activeSection === 'tips') && (
            <div className="manual-section space-y-6 print:space-y-4">
              <div className="border-b-2 border-amber-500 pb-2">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="w-2.5 h-6 bg-amber-500 rounded-sm"></span>
                  <span>第三部分：常見操作技巧與問答 (Pro Tips & FAQ)</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-1.5 manual-avoid-break">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    <span>Q1：如何將這份說明書保存為 PDF 文件？</span>
                  </div>
                  <p className="text-2xs text-slate-600 leading-relaxed">
                    在手冊右上角點擊<b>「🖨️ 列印 / 匯出 PDF 說明書」</b>按鈕，在瀏覽器彈出的列印視窗中，目標印表機選擇<b>「另存為 PDF (Save as PDF)」</b>，紙張尺寸選擇<b>「A4」</b>，邊距選擇<b>「預設」</b>，勾選<b>「背景圖形」</b>，點擊儲存即可！
                  </p>
                </div>

                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-1.5 manual-avoid-break">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    <span>Q2：合約多人編輯時如何避免被覆寫？</span>
                  </div>
                  <p className="text-2xs text-slate-600 leading-relaxed">
                    系統具備<b>協同鎖定 (Quotation Lock)</b> 機制。當一位使用者開啟編輯報價單時，系統會自動在雲端上鎖，其他使用者嘗試編輯時會收到正在編輯中之提示，保障數據完整。
                  </p>
                </div>

                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-1.5 manual-avoid-break">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    <span>Q3：報價單列印如何避免出現多餘空白頁？</span>
                  </div>
                  <p className="text-2xs text-slate-600 leading-relaxed">
                    系統已深度調優 A4 邊距與頁面拆分算法，付款條款與附則頁面採用智慧緊湊排版，列印時可精準將末頁內容完整收納於單頁中，杜絕無內容之空白頁。
                  </p>
                </div>

                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-1.5 manual-avoid-break">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    <span>Q4：手機上如何快速像 App 一樣使用？</span>
                  </div>
                  <p className="text-2xs text-slate-600 leading-relaxed">
                    在 iPhone Safari 點擊「分享」→「加入主畫面」，或 Android Chrome 點擊「安裝應用程式」，系統即可像原生 App 般全螢幕離線開啟並接收 8:00 AM 晨間推播。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 6. FOOTER SECTION                                            */}
          {/* ============================================================ */}
          <div className="border-t border-slate-200 pt-6 text-center text-xs text-slate-400 space-y-1">
            <p className="font-bold text-slate-600">築匠 Artisan Studio｜匠心工藝・專業與細節報價管理系統</p>
            <p>製作人: WHLEE | © 2026 WHLEE. All Rights Reserved.</p>
            <p className="text-2xs text-slate-400">系統版本：V{systemVersion}｜文檔代號：AS-MANUAL-2026-V1</p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SystemManualModal;
