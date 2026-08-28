import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, AreaChart, Area, CartesianGrid
} from 'recharts';
import { 
  TrendingUp, Coins, FileText, CheckCircle, Clock, AlertCircle, Users, 
  ChevronRight, Calendar, ArrowUpRight, DollarSign, PieChart as PieIcon,
  BarChart3, ShieldCheck, FileSpreadsheet, Percent, Wrench
} from 'lucide-react';
import { Quotation, DOrder, UserAccount } from '../types';

interface AnalyticsDashboardProps {
  quotations: Quotation[];
  dOrders: DOrder[];
  accountsList: UserAccount[];
  getQuoteFinancials: (quote: Quotation) => {
    subtotal: number;
    totalDiscount?: number;
    deductDeposit: number;
    contractTotalBeforeDeposit: number;
    grandTotal: number;
    depositVal: number;
    progressVal: number;
    balanceVal: number;
    stageValues: { name: string; percent: number; val: number; isPaid?: boolean }[];
  };
  getCombinedVOFinancials: (quote: Quotation) => {
    subtotal: number;
    totalDiscount?: number;
    grandTotal: number;
    stageValues: { name: string; percent: number; val: number; isPaid?: boolean }[];
  };
  migrateQuotation: (quote: Quotation) => Quotation;
  onOpenQuotation?: (quote: Quotation) => void;
  onNavigateTab?: (tab: 'contracts' | 'payments' | 'd_orders') => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending: { label: '未報價', color: '#8884d8', bg: 'bg-purple-50', border: 'border-purple-200' },
  quoted: { label: '報價待回覆', color: '#3b82f6', bg: 'bg-blue-50', border: 'border-blue-200' },
  signed: { label: '已簽約', color: '#f59e0b', bg: 'bg-amber-50', border: 'border-amber-200' },
  constructing: { label: '施工中', color: '#6366f1', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  finished: { label: '施工完成', color: '#10b981', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  completed: { label: '完工結清', color: '#059669', bg: 'bg-green-50', border: 'border-green-200' },
  cancelled: { label: '已作廢', color: '#f43f5e', bg: 'bg-rose-50', border: 'border-rose-200' },
};

export function AnalyticsDashboard({
  quotations,
  dOrders,
  accountsList,
  getQuoteFinancials,
  getCombinedVOFinancials,
  migrateQuotation,
  onOpenQuotation,
  onNavigateTab,
}: AnalyticsDashboardProps) {
  const [scopeFilter, setScopeFilter] = useState<'all' | 'contracted' | 'completed'>('all');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');

  // Filtered quotations based on top controls
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      // User filter
      if (selectedUserFilter !== 'all' && q.assignedTo !== selectedUserFilter) {
        return false;
      }
      // Scope filter
      if (scopeFilter === 'contracted') {
        return ['signed', 'constructing', 'finished', 'completed'].includes(q.status);
      }
      if (scopeFilter === 'completed') {
        return q.status === 'completed';
      }
      return true;
    });
  }, [quotations, scopeFilter, selectedUserFilter]);

  // Overall Financial & Progress Metrics
  const metrics = useMemo(() => {
    let totalQuotationsCount = filteredQuotations.length;
    let totalQuotedAmount = 0;

    let contractedCount = 0;
    let contractedAmount = 0;

    let totalReceivable = 0;
    let totalCollected = 0;

    // Payment Stage Breakdown
    let stage1Total = 0, stage1Paid = 0;
    let stage2Total = 0, stage2Paid = 0;
    let stage3Total = 0, stage3Paid = 0;
    let voTotal = 0, voPaid = 0;

    // Category Revenue Distribution
    const categoryTotals: Record<string, number> = {};

    filteredQuotations.forEach((q) => {
      const migrated = migrateQuotation(q);
      const mainFin = getQuoteFinancials(migrated);
      const voFin = getCombinedVOFinancials(migrated);
      const hasVO = migrated.variationOrders && migrated.variationOrders.length > 0;

      const grandTotal = mainFin.grandTotal + (hasVO ? voFin.grandTotal : 0);
      totalQuotedAmount += grandTotal;

      const isContracted = ['signed', 'constructing', 'finished', 'completed'].includes(migrated.status);
      if (isContracted) {
        contractedCount++;
        contractedAmount += grandTotal;
        totalReceivable += grandTotal;

        // Calculate main stage values
        mainFin.stageValues.forEach((stage, idx) => {
          if (idx === 0) {
            stage1Total += stage.val;
            if (stage.isPaid) stage1Paid += stage.val;
          } else if (idx === 1) {
            stage2Total += stage.val;
            if (stage.isPaid) stage2Paid += stage.val;
          } else {
            stage3Total += stage.val;
            if (stage.isPaid) stage3Paid += stage.val;
          }
          if (stage.isPaid) {
            totalCollected += stage.val;
          }
        });

        // Calculate VO stage values
        if (hasVO) {
          voTotal += voFin.grandTotal;
          voFin.stageValues.forEach((s) => {
            if (s.isPaid) {
              voPaid += s.val;
              totalCollected += s.val;
            }
          });
        }

        // Aggregate category totals for active/signed contracts
        migrated.items.forEach((item) => {
          let cat = item.category?.trim() || '其他大類';
          if (cat.includes('傢俬') || cat.includes('家具') || cat.includes('傢俱')) {
            cat = '傢俬工程';
          }
          const itemVal = (item.quantity || 0) * (item.unitPrice || 0);
          categoryTotals[cat] = (categoryTotals[cat] || 0) + itemVal;
        });
      }
    });

    const conversionRate = totalQuotationsCount > 0 
      ? Math.round((contractedCount / totalQuotationsCount) * 100) 
      : 0;

    const collectionRate = totalReceivable > 0 
      ? Math.round((totalCollected / totalReceivable) * 100) 
      : 0;

    const outstandingBalance = Math.max(0, totalReceivable - totalCollected);

    return {
      totalQuotationsCount,
      totalQuotedAmount,
      contractedCount,
      contractedAmount,
      totalReceivable,
      totalCollected,
      outstandingBalance,
      conversionRate,
      collectionRate,
      stage1Total,
      stage1Paid,
      stage2Total,
      stage2Paid,
      stage3Total,
      stage3Paid,
      voTotal,
      voPaid,
      categoryTotals,
    };
  }, [filteredQuotations, migrateQuotation, getQuoteFinancials, getCombinedVOFinancials]);

  // Status Distribution Data for Pie/Bar Chart
  const statusChartData = useMemo(() => {
    const counts: Record<string, { count: number; totalAmount: number }> = {
      pending: { count: 0, totalAmount: 0 },
      quoted: { count: 0, totalAmount: 0 },
      signed: { count: 0, totalAmount: 0 },
      constructing: { count: 0, totalAmount: 0 },
      finished: { count: 0, totalAmount: 0 },
      completed: { count: 0, totalAmount: 0 },
      cancelled: { count: 0, totalAmount: 0 },
    };

    filteredQuotations.forEach((q) => {
      const migrated = migrateQuotation(q);
      const mainFin = getQuoteFinancials(migrated);
      const voFin = getCombinedVOFinancials(migrated);
      const grandTotal = mainFin.grandTotal + (migrated.variationOrders?.length ? voFin.grandTotal : 0);

      if (counts[q.status]) {
        counts[q.status].count++;
        counts[q.status].totalAmount += grandTotal;
      }
    });

    return Object.entries(STATUS_CONFIG).map(([key, config]) => ({
      key,
      name: config.label,
      value: counts[key]?.count || 0,
      amount: counts[key]?.totalAmount || 0,
      color: config.color,
    }));
  }, [filteredQuotations, migrateQuotation, getQuoteFinancials, getCombinedVOFinancials]);

  // Category Revenue Chart Data
  const categoryChartData = useMemo(() => {
    return Object.entries(metrics.categoryTotals)
      .map(([name, amount]) => ({
        name,
        amount: Math.round(Number(amount) || 0),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8); // Top 8 categories
  }, [metrics.categoryTotals]);

  // Overall Collection Pie Data (所有工程總數及收款率圓形圖)
  const collectionPieData = useMemo(() => {
    return [
      { name: '已實收金額', value: Math.round(metrics.totalCollected), color: '#10b981' },
      { name: '尚欠尾款', value: Math.round(metrics.outstandingBalance), color: '#f43f5e' },
    ];
  }, [metrics.totalCollected, metrics.outstandingBalance]);

  // User/Assigned-To Performance Breakdown
  const userPerformanceData = useMemo(() => {
    const userMap: Record<string, { name: string; quotes: number; contracted: number; totalAmount: number; collected: number }> = {};

    accountsList.forEach((acc) => {
      userMap[acc.username] = {
        name: acc.displayName || acc.username,
        quotes: 0,
        contracted: 0,
        totalAmount: 0,
        collected: 0,
      };
    });

    quotations.forEach((q) => {
      const u = q.assignedTo || 'Louis';
      if (!userMap[u]) {
        userMap[u] = { name: u, quotes: 0, contracted: 0, totalAmount: 0, collected: 0 };
      }
      const migrated = migrateQuotation(q);
      const mainFin = getQuoteFinancials(migrated);
      const voFin = getCombinedVOFinancials(migrated);
      const hasVO = migrated.variationOrders && migrated.variationOrders.length > 0;
      const grandTotal = mainFin.grandTotal + (hasVO ? voFin.grandTotal : 0);

      userMap[u].quotes++;
      if (['signed', 'constructing', 'finished', 'completed'].includes(migrated.status)) {
        userMap[u].contracted++;
        userMap[u].totalAmount += grandTotal;

        mainFin.stageValues.forEach((s) => {
          if (s.isPaid) userMap[u].collected += s.val;
        });
        if (hasVO) {
          voFin.stageValues.forEach((s) => {
            if (s.isPaid) userMap[u].collected += s.val;
          });
        }
      }
    });

    return Object.values(userMap).filter((item) => item.quotes > 0);
  }, [accountsList, quotations, migrateQuotation, getQuoteFinancials, getCombinedVOFinancials]);

  // D-Order Pipeline Metrics
  const dOrderMetrics = useMemo(() => {
    const total = dOrders.length;
    if (total === 0) return { total: 0, completed: 0, percent: 0, step1: 0, step2: 0, step3: 0, step4: 0, step5: 0, step6: 0 };

    let completed = 0;
    let step1 = 0, step2 = 0, step3 = 0, step4 = 0, step5 = 0, step6 = 0;

    dOrders.forEach((order) => {
      if (order.isCompleted) completed++;
      if (order.step1) step1++;
      if (order.step2) step2++;
      if (order.step3) step3++;
      if (order.step4) step4++;
      if (order.step5) step5++;
      if (order.step6) step6++;
    });

    return {
      total,
      completed,
      percent: Math.round((completed / total) * 100),
      step1: Math.round((step1 / total) * 100),
      step2: Math.round((step2 / total) * 100),
      step3: Math.round((step3 / total) * 100),
      step4: Math.round((step4 / total) * 100),
      step5: Math.round((step5 / total) * 100),
      step6: Math.round((step6 / total) * 100),
    };
  }, [dOrders]);

  return (
    <div className="space-y-6 text-left animate-fade-in pb-10">
      {/* Top Banner & Filters */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 md:p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[11px] font-black rounded-full flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5" />
              營運與財務精算總覽
            </span>
            <span className="text-slate-400 text-xs font-mono">Realtime Analytics</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
            築匠工程 ‧ 數據分析與收入整合 Dashboard
          </h2>
          <p className="text-slate-300 text-xs mt-1 font-medium">
            即時彙總所有狀況。
          </p>
        </div>

        {/* Filter Selection Controls */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-800/90 p-1.5 rounded-xl border border-slate-700/80">
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-900 text-white border border-slate-700 rounded-lg text-xs font-extrabold focus:outline-amber-500 cursor-pointer"
          >
            <option value="all">所有報價單 (All Quotes)</option>
            <option value="contracted">成單合約 (Signed/Active)</option>
            <option value="completed">完工結清 (Completed)</option>
          </select>

          {accountsList.length > 0 && (
            <select
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-900 text-white border border-slate-700 rounded-lg text-xs font-extrabold focus:outline-amber-500 cursor-pointer"
            >
              <option value="all">所有負責人員</option>
              {accountsList.map((acc) => (
                <option key={acc.username} value={acc.username}>
                  👤 {acc.displayName || acc.username}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 4 Core KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Quotations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">總報價單數量 / 報價總額</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 font-mono">
              HK${metrics.totalQuotedAmount.toLocaleString()}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs font-bold text-slate-600">
              <span>報價單總份數：</span>
              <span className="font-black text-blue-600">{metrics.totalQuotationsCount} 份</span>
            </div>
          </div>
        </div>

        {/* Card 2: Signed Contracted Total */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">成單/已簽約工程金額</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-600 font-mono">
              HK${metrics.contractedAmount.toLocaleString()}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs font-bold text-slate-600">
              <span>簽約轉化率 (Conversion):</span>
              <span className="font-black text-amber-600">{metrics.conversionRate}% ({metrics.contractedCount} 份)</span>
            </div>
          </div>
        </div>

        {/* Card 3: Collection Progress */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">A單已實收金額</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-600 font-mono">
              HK${metrics.totalCollected.toLocaleString()}
            </div>
            {/* Collection Progress Bar */}
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-500">尚欠尾款: HK${metrics.outstandingBalance.toLocaleString()}</span>
                <span className="text-emerald-700 font-black">{metrics.collectionRate}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, metrics.collectionRate)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: D-Order Pipeline Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">D單前置工程 pipeline</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-indigo-900 font-mono">
              {dOrderMetrics.total} <span className="text-xs font-bold text-slate-500">個工程案</span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs font-bold text-slate-600">
              <span>全流程完工率:</span>
              <span className="font-black text-indigo-600">{dOrderMetrics.percent}% ({dOrderMetrics.completed} 案完工)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row 1: Status Distribution & Category Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Status Distribution */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <PieIcon className="w-4.5 h-4.5 text-amber-500" />
              <span>報價單狀態分佈與數量</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-bold">按狀態類別統計</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val: any, name: any, props: any) => [
                    `${val} 份 (HK$${(Number(props?.payload?.amount) || 0).toLocaleString()})`, 
                    name
                  ]}
                  contentStyle={{ borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  align="center"
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Status Details List */}
          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
            {statusChartData.map((s) => (
              <div key={s.key} className="flex items-center justify-between text-xs font-bold py-1 px-2 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-slate-700">{s.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-mono">{s.value} 份</span>
                  <span className="text-slate-900 font-mono font-black min-w-[90px] text-right">
                    HK${s.amount.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Category Revenue Breakdown */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-4.5 h-4.5 text-blue-500" />
              <span>工程大類 (分類) 收入統計 (Top Categories)</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-bold">已簽約/成單項目小計</span>
          </div>

          {categoryChartData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <FileText className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs font-bold">尚無成單的工程項目分類數據</p>
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fontWeight: 700 }} width={100} />
                  <Tooltip 
                    formatter={(val: number) => [`HK$${val.toLocaleString()}`, '工程總金額']}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="amount" fill="#f59e0b" radius={[0, 8, 8, 0]}>
                    {categoryChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#d97706' : '#f59e0b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Main Charts Row 2: Payment Stages Collection & Sales Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 3: Overall Revenue & Collection Rate Pie Chart */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <Coins className="w-4.5 h-4.5 text-emerald-500" />
              <span>所有工程總數與整體收款率 (Collection Progress)</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-bold">成單工程實收 vs 尾款</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Pie / Donut Chart - Enlarged radii and container to eliminate top/bottom whitespace */}
            <div className="md:col-span-6 h-72 sm:h-80 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={collectionPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={4}
                  >
                    {collectionPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => [`HK$${Number(val || 0).toLocaleString()}`, '金額']}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    wrapperStyle={{ fontSize: '12px', paddingTop: '0px' }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Collection Rate Percentage */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                <span className="text-3xl font-black text-emerald-600 font-mono tracking-tight">
                  {metrics.collectionRate}%
                </span>
                <span className="text-[11px] font-extrabold text-slate-400">整體收款率</span>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="md:col-span-6 space-y-3">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                <span className="text-xs font-bold text-slate-500">成單合約應收總額 (Total Contract Value)</span>
                <div className="text-lg font-black text-slate-900 font-mono">
                  HK${metrics.totalReceivable.toLocaleString()}
                </div>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs font-extrabold text-emerald-800">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    已實收總金額 (Collected)
                  </span>
                  <span className="font-mono">{metrics.collectionRate}%</span>
                </div>
                <div className="text-lg font-black text-emerald-700 font-mono">
                  HK${metrics.totalCollected.toLocaleString()}
                </div>
              </div>

              <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs font-extrabold text-rose-800">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    尚欠未收尾款 (Outstanding)
                  </span>
                  <span className="font-mono">
                    {metrics.totalReceivable > 0 ? (100 - metrics.collectionRate) : 0}%
                  </span>
                </div>
                <div className="text-lg font-black text-rose-700 font-mono">
                  HK${metrics.outstandingBalance.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chart 4: Team Member Performance Table */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <Users className="w-4.5 h-4.5 text-indigo-500" />
              <span>人員/負責人業績數據分析</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-bold">獨立統計</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <th className="p-2.5">負責人</th>
                  <th className="p-2.5 text-center">報價數</th>
                  <th className="p-2.5 text-center">成單數</th>
                  <th className="p-2.5 text-right">簽約總額</th>
                  <th className="p-2.5 text-right">已收款</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                {userPerformanceData.map((u) => {
                  const rate = u.quotes > 0 ? Math.round((u.contracted / u.quotes) * 100) : 0;
                  return (
                    <tr key={u.name} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5 font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        {u.name}
                      </td>
                      <td className="p-2.5 text-center font-mono">{u.quotes}</td>
                      <td className="p-2.5 text-center font-mono">
                        <span className="text-amber-600 font-black">{u.contracted}</span>
                        <span className="text-[10px] text-slate-400 block">({rate}%)</span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold">
                        HK${u.totalAmount.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-right font-mono font-black text-emerald-600">
                        HK${u.collected.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* D-Order Pipeline Step-by-Step Progress Bar Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-indigo-500" />
              <span>D單前置工程全流程 6 大步驟達成進度分析</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              追蹤從「登記訂金」至「確認A單」的各環節關卡完成比例
            </p>
          </div>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('d_orders')}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              進入 D單進度表 &rarr;
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: '步驟 1：登記訂金', val: dOrderMetrics.step1, icon: '💰' },
            { label: '步驟 2：度尺工程', val: dOrderMetrics.step2, icon: '📐' },
            { label: '步驟 3：平面圖繪製', val: dOrderMetrics.step3, icon: '🗺️' },
            { label: '步驟 4：出報價單', val: dOrderMetrics.step4, icon: '📄' },
            { label: '步驟 5：確認及大訂', val: dOrderMetrics.step5, icon: '🤝' },
            { label: '步驟 6：確認 A單', val: dOrderMetrics.step6, icon: '✅' },
          ].map((item, idx) => (
            <div key={idx} className="p-3 bg-slate-50/80 border border-slate-200/60 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-black text-slate-800">
                <span>{item.icon} {item.label.split('：')[1]}</span>
                <span className="font-mono text-indigo-600">{item.val}%</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${item.val}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400 font-bold block text-right">
                {item.label.split('：')[0]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Project Financials Detail Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-4.5 h-4.5 text-amber-600" />
            <span>近期成單合約與財務明細 (Contracts Breakdown)</span>
          </h3>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('payments')}
              className="text-xs font-bold text-amber-600 hover:text-amber-800 underline cursor-pointer"
            >
              檢視完整 A單收款進度表 &rarr;
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200">
                <th className="p-3">報價單號 / 客戶</th>
                <th className="p-3">地址</th>
                <th className="p-3 text-center">狀態</th>
                <th className="p-3 text-right">合約總額</th>
                <th className="p-3 text-right">已收金額</th>
                <th className="p-3 text-right">尚欠尾款</th>
                <th className="p-3 text-center">進度</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
              {filteredQuotations.slice(0, 10).map((quote) => {
                const migrated = migrateQuotation(quote);
                const mainFin = getQuoteFinancials(migrated);
                const voFin = getCombinedVOFinancials(migrated);
                const hasVO = migrated.variationOrders && migrated.variationOrders.length > 0;
                const grandTotal = mainFin.grandTotal + (hasVO ? voFin.grandTotal : 0);

                let collected = 0;
                mainFin.stageValues.forEach((s) => { if (s.isPaid) collected += s.val; });
                if (hasVO) {
                  voFin.stageValues.forEach((s) => { if (s.isPaid) collected += s.val; });
                }

                const unpaid = Math.max(0, grandTotal - collected);
                const percent = grandTotal > 0 ? Math.round((collected / grandTotal) * 100) : 0;
                const statusCfg = STATUS_CONFIG[quote.status] || { label: quote.status, bg: 'bg-slate-50', color: '#64748b' };

                return (
                  <tr key={quote.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="p-3">
                      <div className="font-mono font-bold text-slate-900">{quote.internalNumber || quote.id}</div>
                      <div className="text-[11px] text-slate-500 font-medium">{quote.customerName}</div>
                    </td>
                    <td className="p-3 text-slate-600 max-w-[200px] truncate">{quote.address || '無地址'}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 text-[10px] font-black rounded-md ${statusCfg.bg}`} style={{ color: statusCfg.color }}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-black text-slate-900">
                      HK${grandTotal.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono font-black text-emerald-600">
                      HK${collected.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-rose-600">
                      HK${unpaid.toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center gap-1.5 justify-center">
                        <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full" 
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-500">{percent}%</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (onOpenQuotation) onOpenQuotation(quote);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-amber-500 hover:text-white text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                      >
                        開啟
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
