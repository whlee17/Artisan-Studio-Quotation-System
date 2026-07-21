import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardCheck, ListTodo, Plus, Search, Trash2, Check, DollarSign,
  MapPin, Clock, ArrowRight, User, AlertTriangle, X, CalendarDays, MapPinned, CalendarDays as Calendar
} from 'lucide-react';
import { DOrder, UserAccount, CalendarEvent } from '../types';

interface DOrderProgressProps {
  dOrders: DOrder[];
  currentUser: UserAccount | null;
  onSaveDOrder: (order: DOrder) => Promise<void>;
  onDeleteDOrder: (id: string) => Promise<void>;
  onSaveEvent?: (event: CalendarEvent) => Promise<void>;
}

export default function DOrderProgress({
  dOrders,
  currentUser,
  onSaveDOrder,
  onDeleteDOrder,
  onSaveEvent
}: DOrderProgressProps) {
  // Tabs: In-Progress (進行中 D單) vs Confirmed A-Orders (已確認 A單)
  const [activeTab, setActiveTab] = useState<'inprogress' | 'confirmed'>('inprogress');
  
  // Search and form states
  const [searchQuery, setSearchQuery] = useState('');
  const [newOrderNo, setNewOrderNo] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Meeting states for step 5
  const [meetingModalOrder, setMeetingModalOrder] = useState<DOrder | null>(null);
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [meetingError, setMeetingError] = useState<string | null>(null);

  // Deposit states for step 1
  const [depositModalOrder, setDepositModalOrder] = useState<DOrder | null>(null);
  const [depositMethod, setDepositMethod] = useState('轉數快 (FPS)');
  const [depositAmount, setDepositAmount] = useState<number>(500);
  const [depositDate, setDepositDate] = useState('');
  const [depositError, setDepositError] = useState<string | null>(null);

  // Deposit states for step 5
  const [step5DepositModalOrder, setStep5DepositModalOrder] = useState<DOrder | null>(null);
  const [step5DepositMethod, setStep5DepositMethod] = useState('轉數快 (FPS)');
  const [step5DepositAmount, setStep5DepositAmount] = useState<number>(20000);
  const [step5DepositDate, setStep5DepositDate] = useState('');
  const [step5DepositError, setStep5DepositError] = useState<string | null>(null);

  const handleSaveStep5Deposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!step5DepositModalOrder) return;
    setStep5DepositError(null);

    if (!step5DepositMethod) {
      setStep5DepositError('請選擇收款方式');
      return;
    }
    if (step5DepositAmount <= 0) {
      setStep5DepositError('收款金額必須大於零');
      return;
    }
    if (!step5DepositDate) {
      setStep5DepositError('請選擇收款日期');
      return;
    }

    const currentUserName = currentUser?.displayName || currentUser?.username || 'Louis';
    const updatedOrder: DOrder = {
      ...step5DepositModalOrder,
      step5: true,
      step5CheckedBy: currentUserName,
      step5DepositMethod: step5DepositMethod,
      step5DepositAmount: step5DepositAmount,
      step5DepositDate: step5DepositDate,
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
      setStep5DepositModalOrder(null);
    } catch (err) {
      console.error('Failed to save step 5 deposit', err);
      setStep5DepositError('儲存大訂登記失敗，請稍後再試');
    }
  };

  const handleSaveDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositModalOrder) return;
    setDepositError(null);

    if (!depositMethod) {
      setDepositError('請選擇收款方式');
      return;
    }
    if (depositAmount <= 0) {
      setDepositError('收款金額必須大於零');
      return;
    }
    if (!depositDate) {
      setDepositError('請選擇收款日期');
      return;
    }

    const currentUserName = currentUser?.displayName || currentUser?.username || 'Louis';
    const updatedOrder: DOrder = {
      ...depositModalOrder,
      step1: true,
      step1CheckedBy: currentUserName,
      depositMethod: depositMethod,
      depositAmount: depositAmount,
      depositDate: depositDate,
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
      setDepositModalOrder(null);
    } catch (err) {
      console.error('Failed to save deposit', err);
      setDepositError('儲存訂金登記失敗，請稍後再試');
    }
  };

  const handleSaveMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingModalOrder) return;
    setMeetingError(null);

    if (!meetingDate) {
      setMeetingError('請選擇約見日期');
      return;
    }

    const updatedOrder: DOrder = {
      ...meetingModalOrder,
      step5: meetingModalOrder.step5, // Do not auto-confirm step 5 when meeting is scheduled; step 5 must be manually confirmed
      step5MeetingDate: meetingDate,
      step5MeetingTime: meetingTime || '',
      step5MeetingLocation: meetingLocation || '',
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
      // Save DOrder progress
      await onSaveDOrder(updatedOrder);

      // Create and save calendar event
      if (onSaveEvent) {
        const eventTitle = `[約見客戶] ${meetingModalOrder.orderNo} | ${meetingModalOrder.address}`;
        const newEvent: CalendarEvent = {
          id: `evt-dorder-step5-${meetingModalOrder.id}`,
          title: eventTitle,
          type: 'visit',
          date: meetingDate,
          time: meetingTime || '14:00',
          location: meetingLocation || meetingModalOrder.address || '',
          remarks: `由 D單工作進度管理表 步驟5 自動同步新增。\n建立人: ${currentUser?.displayName || currentUser?.username || 'System'}`,
          createdBy: currentUser?.displayName || currentUser?.username || 'System',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        await onSaveEvent(newEvent);
      }

      setMeetingModalOrder(null);
    } catch (err) {
      console.error('Failed to save meeting or event', err);
      setMeetingError('儲存會議或建立日程失敗，請稍後再試');
    }
  };

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
      setIsCreateModalOpen(false);
      // Toast notification is managed by App.tsx, but local confirmation can clear errors
    } catch (err) {
      setFormError('建立進度表失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle a single step state and update complete state if all checked
  const handleToggleStep = async (order: DOrder, stepKey: 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'step6') => {
    const isNowChecked = !order[stepKey];

    if (stepKey === 'step1') {
      if (isNowChecked) {
        // Trigger the deposit popup
        setDepositModalOrder(order);
        setDepositMethod(order.depositMethod || '轉數快 (FPS)');
        setDepositAmount(order.depositAmount !== undefined ? order.depositAmount : 500);
        
        const today = new Date();
        const localDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        setDepositDate(order.depositDate || localDateString);
        setDepositError(null);
        return;
      } else {
        // Clear deposit fields on unchecking
        const updatedOrder: DOrder = {
          ...order,
          step1: false,
          step1CheckedBy: undefined,
          depositMethod: undefined,
          depositAmount: undefined,
          depositDate: undefined,
          isCompleted: false,
          updatedAt: Date.now()
        } as any;

        try {
          await onSaveDOrder(updatedOrder);
        } catch (err) {
          console.error("Failed to clear deposit info", err);
        }
        return;
      }
    }

    if (stepKey === 'step5') {
      if (isNowChecked) {
        // Trigger the step 5 deposit popup
        setStep5DepositModalOrder(order);
        setStep5DepositMethod(order.step5DepositMethod || '轉數快 (FPS)');
        setStep5DepositAmount(order.step5DepositAmount !== undefined ? order.step5DepositAmount : 20000);
        
        const today = new Date();
        const localDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        setStep5DepositDate(order.step5DepositDate || localDateString);
        setStep5DepositError(null);
        return;
      } else {
        // Clear step 5 deposit fields on unchecking
        const updatedOrder: DOrder = {
          ...order,
          step5: false,
          step5CheckedBy: undefined,
          step5DepositMethod: undefined,
          step5DepositAmount: undefined,
          step5DepositDate: undefined,
          isCompleted: false,
          updatedAt: Date.now()
        } as any;

        try {
          await onSaveDOrder(updatedOrder);
        } catch (err) {
          console.error("Failed to clear step 5 deposit info", err);
        }
        return;
      }
    }

    const currentUserName = currentUser?.displayName || currentUser?.username || 'Louis';
    const checkedByKey = `${stepKey}CheckedBy`;

    const updatedOrder: DOrder = {
      ...order,
      [stepKey]: isNowChecked,
      [checkedByKey]: isNowChecked ? currentUserName : undefined,
      updatedAt: Date.now()
    } as any;

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

  // Filter, Search & Sort orders by "D單單號" descending
  const filteredOrders = useMemo(() => {
    const filtered = dOrders.filter(order => {
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

    // Extract numeric portion of orderNo for comparison (e.g. "D10394" -> 10394)
    const getNumericPart = (str: string): number => {
      const match = str.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    };

    // Sort by orderNo descending (larger numbers/digits positioned higher up)
    return filtered.sort((a, b) => {
      const numA = getNumericPart(a.orderNo);
      const numB = getNumericPart(b.orderNo);
      if (numA !== numB) {
        return numB - numA;
      }
      return b.orderNo.localeCompare(a.orderNo, 'zh-HK', { numeric: true });
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
      {/* --- SEARCH & TAB FILTER CONTROLS --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tab Switcher & Create Button */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-black rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
            title="開立 D單 進度追蹤"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">新開立 D單</span>
          </button>

          <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
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
                    <div className="relative hidden md:block mb-8 mt-4 mx-8">
                      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-slate-100 border-y border-slate-200/30 z-0" />
                      <div 
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-amber-500 transition-all duration-500 z-0" 
                        style={{ width: `${Math.max(0, (completedCount - 1) / 5) * 100}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 relative z-10">
                      {STEPS.map((step, idx) => {
                        const isChecked = order[step.key];
                        const stepNum = idx + 1;
                        
                        return (
                          <div 
                            key={step.key}
                            onClick={() => handleToggleStep(order, step.key)}
                            className={`p-2 rounded-xl border flex flex-col justify-between min-h-[92px] h-auto select-none cursor-pointer transition-all active:scale-97 group relative ${
                              isChecked 
                                ? 'bg-emerald-50/50 border-emerald-200 ring-1 ring-emerald-500/10' 
                                : 'bg-slate-50/40 border-slate-200 hover:border-amber-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black border transition-all ${
                                isChecked 
                                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-3xs' 
                                  : 'bg-white border-slate-200 text-slate-500 group-hover:border-amber-400'
                              }`}>
                                {isChecked ? <Check className="w-2.5 h-2.5 font-black" /> : stepNum}
                              </span>
                              
                              {/* Large 48x48 touch-target overlay for mobile checkboxes */}
                              <div className="w-12 h-12 absolute right-0 top-0 hidden group-hover:block" />
                              
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} // Controlled via card click for fat-finger ergonomics
                                className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-400/50 border-slate-300 pointer-events-none"
                              />
                            </div>
                            
                            <div className="space-y-0.5 mt-1.5 flex-1 flex flex-col justify-between">
                              <div>
                                <span className={`block text-[11px] font-black leading-tight ${
                                  isChecked ? 'text-emerald-800' : 'text-slate-700'
                                }`}>
                                  {step.label}
                                </span>
                                <span className="block text-[8.5px] text-slate-400 font-bold truncate">
                                  {step.desc}
                                </span>
                              </div>

                              {isChecked && (
                                <div className="mt-1">
                                  <span className="inline-block text-[8.5px] text-emerald-700 bg-emerald-100/60 border border-emerald-200/50 rounded-md px-1.5 py-0.5 font-extrabold leading-none truncate max-w-full" title={`Confirm by ${order[`${step.key}CheckedBy` as keyof DOrder] || order.createdBy || 'System'}`}>
                                    Confirm by {order[`${step.key}CheckedBy` as keyof DOrder] || order.createdBy || 'System'}
                                  </span>
                                </div>
                              )}

                              {/* Step 1 Deposit Details */}
                              {step.key === 'step1' && (
                                <div className="mt-1 w-full">
                                  {order.step1 && order.depositMethod ? (
                                    <div 
                                      className="p-1 bg-emerald-50/90 border border-emerald-100 rounded text-[8px] text-emerald-900 leading-tight font-bold flex flex-col gap-0.5 select-text"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="flex items-center justify-between border-b border-emerald-200/30 pb-0.5 mb-0.5">
                                        <span className="font-black text-emerald-800">已收訂金</span>
                                        <span className="font-mono font-black text-[8.5px] text-emerald-700">HK${order.depositAmount}</span>
                                      </div>
                                      <div className="flex items-center gap-0.5 text-[8px] text-emerald-800/80">
                                        <span className="font-bold shrink-0">方式:</span>
                                        <span className="truncate">{order.depositMethod}</span>
                                      </div>
                                      <div className="flex items-center gap-0.5 text-[8px] text-emerald-800/80">
                                        <span className="font-bold shrink-0">日期:</span>
                                        <span className="truncate">{order.depositDate}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDepositModalOrder(order);
                                          setDepositMethod(order.depositMethod || '轉數快 (FPS)');
                                          setDepositAmount(order.depositAmount !== undefined ? order.depositAmount : 500);
                                          setDepositDate(order.depositDate || '');
                                          setDepositError(null);
                                        }}
                                        className="text-[8px] font-extrabold text-emerald-700 hover:text-emerald-900 text-right underline cursor-pointer mt-0.5"
                                      >
                                        變更登記
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                              )}

                              {/* New Step 5 Meeting Details & Date Button */}
                              {step.key === 'step5' && (
                                <div className="mt-1 w-full flex flex-col gap-1">
                                  {order.step5MeetingDate ? (
                                    <div 
                                      className="p-1 bg-amber-50/90 border border-amber-100 rounded text-[8px] text-amber-900 leading-tight font-bold flex flex-col gap-0.5 select-text"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="flex items-center gap-0.5">
                                        <Calendar className="w-2 h-2 text-amber-600 shrink-0" />
                                        <span className="truncate">{order.step5MeetingDate} {order.step5MeetingTime}</span>
                                      </div>
                                      {order.step5MeetingLocation && (
                                        <div className="flex items-center gap-0.5">
                                          <MapPin className="w-2 h-2 text-amber-600 shrink-0" />
                                          <span className="truncate" title={order.step5MeetingLocation}>
                                            {order.step5MeetingLocation}
                                          </span>
                                        </div>
                                      )}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setMeetingModalOrder(order);
                                          setMeetingDate(order.step5MeetingDate || '');
                                          setMeetingTime(order.step5MeetingTime || '');
                                          setMeetingLocation(order.step5MeetingLocation || '');
                                        }}
                                        className="text-[8px] font-extrabold text-amber-700 hover:text-amber-900 text-right underline cursor-pointer"
                                      >
                                        變更約見
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setMeetingModalOrder(order);
                                        setMeetingDate('');
                                        setMeetingTime('');
                                        setMeetingLocation('');
                                      }}
                                      className="w-full py-0.5 px-1 bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 text-[8px] font-black rounded border border-amber-200 flex items-center justify-center gap-0.5 transition-colors cursor-pointer"
                                    >
                                      <Calendar className="w-2 h-2 text-amber-500" />
                                      <span>約見日期</span>
                                    </button>
                                  )}

                                  {/* Step 5 Deposit Details */}
                                  {order.step5 && order.step5DepositMethod ? (
                                    <div 
                                      className="p-1 bg-emerald-50/90 border border-emerald-100 rounded text-[8px] text-emerald-900 leading-tight font-bold flex flex-col gap-0.5 select-text"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="flex items-center justify-between border-b border-emerald-200/30 pb-0.5 mb-0.5">
                                        <span className="font-black text-emerald-800">已收大訂</span>
                                        <span className="font-mono font-black text-[8.5px] text-emerald-700">HK${order.step5DepositAmount}</span>
                                      </div>
                                      <div className="flex items-center gap-0.5 text-[8px] text-emerald-800/80">
                                        <span className="font-bold shrink-0">方式:</span>
                                        <span className="truncate">{order.step5DepositMethod}</span>
                                      </div>
                                      <div className="flex items-center gap-0.5 text-[8px] text-emerald-800/80">
                                        <span className="font-bold shrink-0">日期:</span>
                                        <span className="truncate">{order.step5DepositDate}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setStep5DepositModalOrder(order);
                                          setStep5DepositMethod(order.step5DepositMethod || '轉數快 (FPS)');
                                          setStep5DepositAmount(order.step5DepositAmount !== undefined ? order.step5DepositAmount : 20000);
                                          setStep5DepositDate(order.step5DepositDate || '');
                                          setStep5DepositError(null);
                                        }}
                                        className="text-[8px] font-extrabold text-emerald-700 hover:text-emerald-900 text-right underline cursor-pointer mt-0.5"
                                      >
                                        變更登記
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                              )}
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

      {/* --- STEP 5 MEETING SETTINGS MODAL (POP UP SCREEN) --- */}
      {meetingModalOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[120] flex items-center justify-center p-4 animate-fade-in text-left">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 p-6 flex flex-col gap-4 relative">
            {/* Close button */}
            <button 
              type="button"
              onClick={() => setMeetingModalOrder(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-full p-1 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">步驟 5: 約見客戶日程設定</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">單號：{meetingModalOrder.orderNo} | {meetingModalOrder.address}</p>
              </div>
            </div>

            <form onSubmit={handleSaveMeeting} className="space-y-4 mt-2">
              {/* Meeting Date */}
              <div>
                <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase">
                  約見日期 (Meeting Date) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:bg-white"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                />
              </div>

              {/* Meeting Time */}
              <div>
                <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase">
                  約見時間 (Meeting Time)
                </label>
                <input
                  type="time"
                  className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:bg-white"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                />
              </div>

              {/* Meeting Location */}
              <div>
                <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase">
                  約見地點 (Meeting Location)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="例如: 屯門德榮工業大廈 19 樓 C 或 現場"
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:bg-white pr-16"
                    value={meetingLocation}
                    onChange={(e) => setMeetingLocation(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setMeetingLocation(meetingModalOrder.address)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-amber-600 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-1.5 py-1 rounded transition-colors cursor-pointer"
                  >
                    帶入地址
                  </button>
                </div>
              </div>

              {meetingError && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500 bg-rose-50 border border-rose-100 p-2 rounded-lg">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{meetingError}</span>
                </div>
              )}

              <p className="text-[10px] text-amber-600 font-bold leading-normal">
                💡 儲存後將自動：
                <br />1. 把此訂單「步驟 5」標記為已確認
                <br />2. 在系統「互動行事曆」中加入此日程，供團隊查閱！
              </p>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setMeetingModalOrder(null)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer text-center"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  確認並加入行事曆
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- STEP 1 DEPOSIT REGISTRATION MODAL (POP UP SCREEN) --- */}
      {depositModalOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[120] flex items-center justify-center p-4 animate-fade-in text-left">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 p-6 flex flex-col gap-4 relative animate-scale-up">
            {/* Close button */}
            <button 
              type="button"
              onClick={() => setDepositModalOrder(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-full p-1 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">步驟 1: 登記訂金設定</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">單號：{depositModalOrder.orderNo} | {depositModalOrder.address}</p>
              </div>
            </div>

            <form onSubmit={handleSaveDeposit} className="space-y-4 mt-2">
              {/* Payment Method Selection */}
              <div>
                <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase">
                  收款方式 (Payment Method) <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white"
                  value={depositMethod}
                  onChange={(e) => setDepositMethod(e.target.value)}
                >
                  <option value="轉數快 (FPS)">轉數快 (FPS)</option>
                  <option value="銀行轉帳 (Bank Transfer)">銀行轉帳 (Bank Transfer)</option>
                  <option value="現金 (Cash)">現金 (Cash)</option>
                  <option value="支票 (Cheque)">支票 (Cheque)</option>
                  <option value="其他 (Other)">其他 (Other)</option>
                </select>
              </div>

              {/* Payment Amount */}
              <div>
                <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase">
                  收款金額 (Payment Amount) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">HK$</span>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full text-xs font-semibold pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white font-mono"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                  />
                  <button
                    type="button"
                    onClick={() => setDepositAmount(500)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-1 rounded transition-colors cursor-pointer"
                  >
                    重置為$500
                  </button>
                </div>
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase">
                  收款日期 (Payment Date) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white"
                  value={depositDate}
                  onChange={(e) => setDepositDate(e.target.value)}
                />
              </div>

              {depositError && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500 bg-rose-50 border border-rose-100 p-2 rounded-lg">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{depositError}</span>
                </div>
              )}

              <p className="text-[10px] text-emerald-600 font-bold leading-normal">
                💡 儲存後將自動把此訂單「步驟 1: 登記訂金」標記為已確認，並自動記錄確認人與收款明細。
              </p>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDepositModalOrder(null)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer text-center"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  確認登記
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- STEP 5 DEPOSIT REGISTRATION MODAL (POP UP SCREEN) --- */}
      {step5DepositModalOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[120] flex items-center justify-center p-4 animate-fade-in text-left">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 p-6 flex flex-col gap-4 relative animate-scale-up">
            {/* Close button */}
            <button 
              type="button"
              onClick={() => setStep5DepositModalOrder(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-full p-1 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">步驟 5: 確認報價單及大訂設定</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">單號：{step5DepositModalOrder.orderNo} | {step5DepositModalOrder.address}</p>
              </div>
            </div>

            <form onSubmit={handleSaveStep5Deposit} className="space-y-4 mt-2">
              {/* Payment Method Selection */}
              <div>
                <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase">
                  收款方式 (Payment Method) <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white"
                  value={step5DepositMethod}
                  onChange={(e) => setStep5DepositMethod(e.target.value)}
                >
                  <option value="轉數快 (FPS)">轉數快 (FPS)</option>
                  <option value="銀行轉帳 (Bank Transfer)">銀行轉帳 (Bank Transfer)</option>
                  <option value="現金 (Cash)">現金 (Cash)</option>
                  <option value="支票 (Cheque)">支票 (Cheque)</option>
                  <option value="其他 (Other)">其他 (Other)</option>
                </select>
              </div>

              {/* Payment Amount */}
              <div>
                <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase">
                  收款金額 (Payment Amount) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">HK$</span>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full text-xs font-semibold pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white font-mono"
                    value={step5DepositAmount}
                    onChange={(e) => setStep5DepositAmount(Number(e.target.value))}
                  />
                  <button
                    type="button"
                    onClick={() => setStep5DepositAmount(20000)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-1 rounded transition-colors cursor-pointer"
                  >
                    重置為$20000
                  </button>
                </div>
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase">
                  收款日期 (Payment Date) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white"
                  value={step5DepositDate}
                  onChange={(e) => setStep5DepositDate(e.target.value)}
                />
              </div>

              {step5DepositError && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500 bg-rose-50 border border-rose-100 p-2 rounded-lg">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{step5DepositError}</span>
                </div>
              )}

              <p className="text-[10px] text-emerald-600 font-bold leading-normal">
                💡 儲存後將自動把此訂單「步驟 5: 確認報價單及大訂」標記為已確認，並自動記錄確認人與收款明細。
              </p>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setStep5DepositModalOrder(null)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer text-center"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  確認登記
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD NEW PROGRESS TRACKER MODAL (POP UP SCREEN) --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[120] flex items-center justify-center p-4 animate-fade-in text-left">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 p-6 flex flex-col gap-4 relative">
            {/* Close button */}
            <button 
              type="button"
              onClick={() => {
                setIsCreateModalOpen(false);
                setFormError(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-full p-1 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600">
                <PlusCircleIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">新開立 D單 進度追蹤</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">新增一筆 D單 進行施工進度追蹤</p>
              </div>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4 mt-2">
              <div>
                <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase">
                  D單單號 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如: D10459"
                  value={newOrderNo}
                  onChange={(e) => setNewOrderNo(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:bg-white uppercase text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase">
                  裝修單位地址 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如: 灣仔軒尼詩道 128 號 15 樓 B 室"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:bg-white text-slate-700"
                />
              </div>

              {formError && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500 bg-rose-50 border border-rose-100 p-2.5 rounded-lg">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setFormError(null);
                  }}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer text-center"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmitting ? '建立中...' : '開立進度追蹤'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
