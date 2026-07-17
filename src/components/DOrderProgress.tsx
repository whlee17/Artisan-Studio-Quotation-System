import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardCheck, ListTodo, Plus, Search, Trash2, Check,
  MapPin, Clock, ArrowRight, User, AlertTriangle, X
} from 'lucide-react';
import { DOrder, UserAccount } from '../types';

interface DOrderProgressProps {
  dOrders: DOrder[];
  currentUser: UserAccount | null;
  onSaveDOrder: (order: DOrder) => Promise<void>;
  onDeleteDOrder: (id: string) => Promise<void>;
}

export default function DOrderProgress({
  dOrders,
  currentUser,
  onSaveDOrder,
  onDeleteDOrder
}: DOrderProgressProps) {
  // Tabs: In-Progress (進行中 D單) vs Confirmed A-Orders (已確認 A單)
  const [activeTab, setActiveTab] = useState<'inprogress' | 'confirmed'>('inprogress');
  
  // Search and form states
  const [searchQuery, setSearchQuery] = useState('');
  const [newOrderNo, setNewOrderNo] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Workflow steps metadata
  const STEPS = [
    { key: 'step1' as const, label: '登記訂金', desc: '首期款登記' },
    { key: 'step2' as const, label: '度尺', desc: '現場尺寸測量' },
    { key: 'step3' as const, label: '平面圖', desc: '規劃設計圖' },
    { key: 'step4' as const, label: '報價單', desc: '項目工程估算' },
    { key: 'step5' as const, label: '確認報價單及大訂', desc: '簽署及二期款' },
    { key: 'step6' as const, label: '確認A單', desc: '分配設計師' }
  ];

  // Handle creating a new D-Order tracker
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanOrderNo = newOrderNo.trim();
    const cleanAddress = newAddress.trim();

    if (!cleanOrderNo) {
      setFormError('請輸入單號 (如: D10394)');
      return;
    }
    if (!cleanAddress) {
      setFormError('請輸入單位地址');
      return;
    }

    // Check for duplicate in-progress orderNo to assist user workflow
    const isDuplicate = dOrders.some(
      o => o.orderNo.toLowerCase() === cleanOrderNo.toLowerCase() && !o.isCompleted
    );
    if (isDuplicate) {
      setFormError(`單號 ${cleanOrderNo} 仍在進行中，請勿重複建立`);
      return;
    }

    setIsSubmitting(true);
    const newOrder: DOrder = {
      id: `do-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      orderNo: cleanOrderNo,
      address: cleanAddress,
      step1: false,
      step2: false,
      step3: false,
      step4: false,
      step5: false,
      step6: false,
      isCompleted: false,
      createdBy: currentUser?.displayName || currentUser?.username || 'System',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    try {
      await onSaveDOrder(newOrder);
      setNewOrderNo('');
      setNewAddress('');
      // Toast notification is managed by App.tsx, but local confirmation can clear errors
    } catch (err) {
      setFormError('建立進度表失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle a single step state and update complete state if all checked
  const handleToggleStep = async (order: DOrder, stepKey: 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'step6') => {
    const updatedOrder = {
      ...order,
      [stepKey]: !order[stepKey],
      updatedAt: Date.now()
    };

    // Calculate if all 6 steps are checked
    const allChecked = 
      updatedOrder.step1 && 
      updatedOrder.step2 && 
      updatedOrder.step3 && 
      updatedOrder.step4 && 
      updatedOrder.step5 && 
      updatedOrder.step6;

    updatedOrder.isCompleted = allChecked;

    try {
      await onSaveDOrder(updatedOrder);
    } catch (err) {
      console.error("Failed to update step", err);
    }
  };

  // Delete an order progress tracker
  const handleDeleteConfirm = async (id: string) => {
    try {
      await onDeleteDOrder(id);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  // Filter & Search orders
  const filteredOrders = useMemo(() => {
    return dOrders.filter(order => {
      // Step 1: Filter by tab status
      if (activeTab === 'inprogress' && order.isCompleted) return false;
      if (activeTab === 'confirmed' && !order.isCompleted) return false;

      // Step 2: Filter by search query
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        order.orderNo.toLowerCase().includes(query) ||
        order.address.toLowerCase().includes(query) ||
        order.createdBy.toLowerCase().includes(query)
      );
    });
  }, [dOrders, activeTab, searchQuery]);

  // Calculate quick stats
  const stats = useMemo(() => {
    const total = dOrders.length;
    const completed = dOrders.filter(o => o.isCompleted).length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [dOrders]);

  return (
    <div className="space-y-6">
      {/* --- HEADER TITLE & METRICS --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-amber-500 shrink-0" />
            <span>D單工作進度管理表</span>
          </h2>
          <p className="text-xs text-slate-400 font-bold mt-1">
            追蹤訂單從登記訂金、現場度尺、方案平面圖到確認A單
          </p>
        </div>
        
        {/* Quick Bento Stats */}
        <div className="grid grid-cols-3 gap-3 md:w-auto w-full">
          <div className="bg-amber-50/50 border border-amber-100/60 rounded-xl px-4 py-2 text-center min-w-[90px]">
            <span className="block text-[10px] font-bold text-amber-600">進行中</span>
            <span className="text-lg font-black text-amber-700">{stats.pending}</span>
          </div>
          <div className="bg-emerald-50/50 border border-emerald-100/60 rounded-xl px-4 py-2 text-center min-w-[90px]">
            <span className="block text-[10px] font-bold text-emerald-600">已確認A單</span>
            <span className="text-lg font-black text-emerald-700">{stats.completed}</span>
          </div>
          <div className="bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-2 text-center min-w-[90px]">
            <span className="block text-[10px] font-bold text-slate-500">總單數</span>
            <span className="text-lg font-black text-slate-700">{stats.total}</span>
          </div>
        </div>
      </div>

      {/* --- ADD NEW PROGRESS TRACKER FORM --- */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-3xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <PlusCircleIcon className="w-5 h-5 text-amber-500 shrink-0" />
          <h3 className="text-sm font-black text-slate-700">新開立 D單 進度追蹤</h3>
        </div>
        <form onSubmit={handleCreateOrder} className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">D單單號 <span className="text-rose-500">*</span></label>
              <input
                type="text"
                placeholder="例如: D10459"
                value={newOrderNo}
                onChange={(e) => setNewOrderNo(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 placeholder:text-slate-400 outline-none focus:border-amber-500 focus:bg-white transition-all uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">裝修單位地址 <span className="text-rose-500">*</span></label>
              <input
                type="text"
                placeholder="例如: 灣仔軒尼詩道 128 號 15 樓 B 室"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 placeholder:text-slate-400 outline-none focus:border-amber-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {formError && (
            <div className="mt-3.5 flex items-center gap-1.5 text-xs font-bold text-rose-500 bg-rose-50 border border-rose-100 p-2.5 rounded-lg">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm active:scale-98 cursor-pointer disabled:opacity-60"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? '建立中...' : '開立進度追蹤'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* --- SEARCH & TAB FILTER CONTROLS --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 self-start">
          <button
            onClick={() => setActiveTab('inprogress')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'inprogress'
                ? 'bg-white text-amber-600 shadow-3xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ListTodo className="w-4 h-4 text-amber-500" />
            <span>進行中 D單 ({dOrders.filter(o => !o.isCompleted).length})</span>
          </button>
          <button
            onClick={() => setActiveTab('confirmed')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'confirmed'
                ? 'bg-white text-emerald-600 shadow-3xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardCheck className="w-4 h-4 text-emerald-500" />
            <span>已確認 A單 ({dOrders.filter(o => o.isCompleted).length})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="搜尋單號、地址或建立人..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-amber-500 focus:bg-white transition-all shadow-3xs"
          />
        </div>
      </div>

      {/* --- MAIN CARDS LISTING --- */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredOrders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-white p-12 text-center rounded-2xl border border-slate-150 shadow-3xs"
            >
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                <ClipboardCheck className="w-6 h-6 text-slate-400" />
              </div>
              <h4 className="text-sm font-black text-slate-700">未找到相關的 D單進度</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-bold leading-normal">
                {searchQuery ? '請嘗試更換關鍵字重新搜尋' : activeTab === 'inprogress' ? '目前沒有正在進行中的 D單。請點選上方表單建立一個！' : '目前尚無完成 6 大步驟移入的 A單。'}
              </p>
            </motion.div>
          ) : (
            filteredOrders.map((order) => {
              // Calculate steps progress percentage
              const completedCount = STEPS.filter(step => order[step.key]).length;
              const progressPct = Math.round((completedCount / 6) * 100);

              return (
                <motion.div
                  key={order.id}
                  layoutId={order.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                  className={`bg-white rounded-2xl border shadow-3xs overflow-hidden transition-all duration-300 ${
                    order.isCompleted 
                      ? 'border-emerald-200 ring-1 ring-emerald-500/5 hover:border-emerald-300' 
                      : 'border-slate-150 hover:border-slate-250'
                  }`}
                >
                  {/* Card Title & Info Bar */}
                  <div className="px-5 py-4 border-b border-slate-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/30">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black tracking-wider ${
                          order.isCompleted 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' 
                            : 'bg-amber-50 text-amber-700 border border-amber-150'
                        }`}>
                          {order.orderNo}
                        </span>
                        
                        <span className="text-slate-400 text-xs">|</span>
                        
                        <span className="flex items-center gap-1 text-xs text-slate-600 font-bold">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{order.address}</span>
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3.5 text-[10px] text-slate-400 font-bold">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>建立人: {order.createdBy}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>更新: {new Date(order.updatedAt).toLocaleString('zh-HK', { hour12: false })}</span>
                        </span>
                      </div>
                    </div>

                    {/* Progress Badge or Action menu */}
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <div className="text-right">
                        <span className={`text-[10px] font-black ${order.isCompleted ? 'text-emerald-600' : 'text-amber-500'}`}>
                          工作進度 {completedCount}/6
                        </span>
                        <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden border border-slate-200/50">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              order.isCompleted ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Delete buttons */}
                      {deleteConfirmId === order.id ? (
                        <div className="flex items-center gap-1 bg-rose-50 border border-rose-150 px-2 py-1 rounded-lg animate-fade-in">
                          <span className="text-[9px] font-black text-rose-600">確定刪除?</span>
                          <button
                            onClick={() => handleDeleteConfirm(order.id)}
                            className="p-1 hover:bg-rose-200/50 rounded-md text-rose-600 transition-all cursor-pointer"
                            title="確定"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="p-1 hover:bg-rose-200/50 rounded-md text-slate-500 transition-all cursor-pointer"
                            title="取消"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(order.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors shrink-0 cursor-pointer"
                          title="刪除追蹤"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Interactive Workflow Steps Grid */}
                  <div className="p-5 bg-white">
                    {/* Visual Timeline connector on Desktop */}
                    <div className="relative hidden lg:block mb-8 mt-4 mx-8">
                      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-slate-100 border-y border-slate-200/30 z-0" />
                      <div 
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-amber-500 transition-all duration-500 z-0" 
                        style={{ width: `${Math.max(0, (completedCount - 1) / 5) * 100}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 relative z-10">
                      {STEPS.map((step, idx) => {
                        const isChecked = order[step.key];
                        const stepNum = idx + 1;
                        
                        return (
                          <div 
                            key={step.key}
                            onClick={() => handleToggleStep(order, step.key)}
                            className={`p-3 rounded-xl border flex flex-col justify-between h-24 select-none cursor-pointer transition-all active:scale-97 group ${
                              isChecked 
                                ? 'bg-emerald-50/50 border-emerald-200 ring-1 ring-emerald-500/10' 
                                : 'bg-slate-50/40 border-slate-200 hover:border-amber-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border transition-all ${
                                isChecked 
                                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-3xs' 
                                  : 'bg-white border-slate-200 text-slate-500 group-hover:border-amber-400'
                              }`}>
                                {isChecked ? <Check className="w-3 h-3 font-black" /> : stepNum}
                              </span>
                              
                              {/* Large 48x48 touch-target overlay for mobile checkboxes */}
                              <div className="w-12 h-12 absolute right-0 top-0 hidden group-hover:block" />
                              
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} // Controlled via card click for fat-finger ergonomics
                                className="w-4.5 h-4.5 rounded text-amber-500 focus:ring-amber-400/50 border-slate-300 pointer-events-none"
                              />
                            </div>
                            
                            <div className="space-y-0.5 mt-auto">
                              <span className={`block text-xs font-black leading-tight ${
                                isChecked ? 'text-emerald-800' : 'text-slate-700'
                              }`}>
                                {step.label}
                              </span>
                              <span className="block text-[9px] text-slate-400 font-bold truncate">
                                {step.desc}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Completion Celebration Overlay for confirmed ones */}
                    {order.isCompleted && (
                      <div className="mt-4 pt-3.5 border-t border-emerald-100 flex items-center justify-between text-emerald-700 bg-emerald-50/20 px-4 py-2.5 rounded-xl border border-emerald-150">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-3xs">
                            <Check className="w-3.5 h-3.5 font-bold" />
                          </div>
                          <span className="text-xs font-bold">
                            🎉 6 大關鍵步驟已全部完成！此單已正式轉為「已確認 A單」並彙整歸檔。
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-500 hidden sm:inline-block bg-white px-2 py-1 rounded-md shadow-3xs border border-emerald-100">
                          狀態: 已結案生產
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Inline fallback icon components for robustness
function PlusCircleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
