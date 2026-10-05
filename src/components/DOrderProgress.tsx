import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardCheck, ListTodo, Plus, Search, Trash2, Check, DollarSign,
  MapPin, Clock, ArrowRight, User, AlertTriangle, X, CalendarDays, MapPinned, CalendarDays as Calendar, FileX,
  FileText, ExternalLink, Link2, Unlink, Receipt, Printer, Edit, Phone,
  SlidersHorizontal, CheckCircle2, Sparkles, Layers
} from 'lucide-react';
import { DOrder, UserAccount, CalendarEvent, Quotation } from '../types';

interface DOrderProgressProps {
  dOrders: DOrder[];
  quotations?: Quotation[];
  accountsList?: UserAccount[];
  currentUser: UserAccount | null;
  onSaveDOrder: (order: DOrder) => Promise<void>;
  onDeleteDOrder: (id: string) => Promise<void>;
  onSaveEvent?: (event: CalendarEvent) => Promise<void>;
  onOpenQuotation?: (quote: Quotation) => void;
  onCreateAndPairQuotation?: (order: DOrder) => Promise<void>;
  onUpdateQuotationDesignerAndInternalNumber?: (quotationId: string, designer: string, internalNumber: string) => Promise<void>;
  onPrintSurveyReceipt?: (order: DOrder) => void;
  onPrintStep5Receipt?: (order: DOrder) => void;
}

export default function DOrderProgress({
  dOrders,
  quotations = [],
  accountsList = [],
  currentUser,
  onSaveDOrder,
  onDeleteDOrder,
  onSaveEvent,
  onOpenQuotation,
  onCreateAndPairQuotation,
  onUpdateQuotationDesignerAndInternalNumber,
  onPrintSurveyReceipt,
  onPrintStep5Receipt
}: DOrderProgressProps) {
  // Tabs: In-Progress (進行中 D單) vs Confirmed A-Orders (已確認 A單) vs Unsigned (未簽約 D單)
  const [activeTab, setActiveTab] = useState<'inprogress' | 'confirmed' | 'unsigned'>('inprogress');
  
  // Search and form states
  const [searchQuery, setSearchQuery] = useState('');
  const [newOrderNo, setNewOrderNo] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Edit D-Order modal states
  const [editModalOrder, setEditModalOrder] = useState<DOrder | null>(null);
  const [editTab, setEditTab] = useState<'basic' | 'steps'>('basic');
  const [editOrderNo, setEditOrderNo] = useState('');
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editIsUnsigned, setEditIsUnsigned] = useState(false);
  const [editStep1, setEditStep1] = useState(false);
  const [editStep2, setEditStep2] = useState(false);
  const [editStep3, setEditStep3] = useState(false);
  const [editStep4, setEditStep4] = useState(false);
  const [editStep5, setEditStep5] = useState(false);
  const [editStep6, setEditStep6] = useState(false);
  const [editStep1CheckedBy, setEditStep1CheckedBy] = useState('');
  const [editStep2CheckedBy, setEditStep2CheckedBy] = useState('');
  const [editStep3CheckedBy, setEditStep3CheckedBy] = useState('');
  const [editStep4CheckedBy, setEditStep4CheckedBy] = useState('');
  const [editStep5CheckedBy, setEditStep5CheckedBy] = useState('');
  const [editStep6CheckedBy, setEditStep6CheckedBy] = useState('');
  const [editDepositMethod, setEditDepositMethod] = useState('轉數快 (FPS)');
  const [editDepositAmount, setEditDepositAmount] = useState<number>(500);
  const [editDepositDate, setEditDepositDate] = useState('');
  const [editStep5MeetingDate, setEditStep5MeetingDate] = useState('');
  const [editStep5MeetingTime, setEditStep5MeetingTime] = useState('');
  const [editStep5MeetingLocation, setEditStep5MeetingLocation] = useState('');
  const [editStep5DepositMethod, setEditStep5DepositMethod] = useState('轉數快 (FPS)');
  const [editStep5DepositAmount, setEditStep5DepositAmount] = useState<number>(20000);
  const [editStep5DepositDate, setEditStep5DepositDate] = useState('');
  const [editQuotationNumber, setEditQuotationNumber] = useState('');
  const [editQuotationCustomerName, setEditQuotationCustomerName] = useState('');
  const [editStep6Designer, setEditStep6Designer] = useState('');
  const [editStep6InternalNumber, setEditStep6InternalNumber] = useState('');
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Step 6 Assign Designer & Set Internal Ref No modal states
  const [step6ModalOrder, setStep6ModalOrder] = useState<DOrder | null>(null);
  const [step6Designer, setStep6Designer] = useState('');
  const [step6InternalNumber, setStep6InternalNumber] = useState('');
  const [step6CheckedBy, setStep6CheckedBy] = useState('');
  const [step6SyncToQuote, setStep6SyncToQuote] = useState(true);
  const [step6Error, setStep6Error] = useState<string | null>(null);
  const [step6IsSubmitting, setStep6IsSubmitting] = useState(false);

  // Available designers computed from accounts and quotations
  const availableDesignersList = useMemo(() => {
    const set = new Set<string>();
    (accountsList || []).forEach(a => {
      if (a.displayName && a.displayName.trim()) set.add(a.displayName.trim());
      else if (a.username && a.username.trim()) set.add(a.username.trim());
    });
    (quotations || []).forEach(q => {
      if (q.designer && q.designer.trim()) set.add(q.designer.trim());
    });
    ['Louis', 'whlee', 'King', 'Mat', 'Tracy', 'Acy'].forEach(name => set.add(name));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-HK'));
  }, [accountsList, quotations]);

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

  // Quotation selector modal states for Step 4
  const [quoteModalOrder, setQuoteModalOrder] = useState<DOrder | null>(null);
  const [quoteSearchQuery, setQuoteSearchQuery] = useState('');

  // Filter quotations for the modal
  const filteredQuotationsForModal = useMemo(() => {
    if (!quotations) return [];
    if (!quoteSearchQuery.trim()) return quotations;
    const query = quoteSearchQuery.toLowerCase().trim();
    return quotations.filter((q) => {
      const qNum = (q.internalNumber || q.id || '').toLowerCase();
      const customer = (q.customerName || '').toLowerCase();
      const address = (q.address || '').toLowerCase();
      const phone = (q.phone || '').toLowerCase();
      return qNum.includes(query) || customer.includes(query) || address.includes(query) || phone.includes(query);
    });
  }, [quotations, quoteSearchQuery]);

  // Handle open paired quotation
  const handleOpenPairedQuotation = (order: DOrder) => {
    if (!onOpenQuotation) return;
    let targetQuote: Quotation | undefined;
    if (order.quotationId) {
      targetQuote = quotations.find((q) => q.id === order.quotationId);
    }
    if (!targetQuote && order.quotationNumber) {
      targetQuote = quotations.find(
        (q) => q.internalNumber === order.quotationNumber || q.id === order.quotationNumber
      );
    }

    if (targetQuote) {
      onOpenQuotation(targetQuote);
    } else {
      alert(`找不到配對的報價單 (${order.quotationNumber || order.quotationId})，可能已被刪除或尚未載入。`);
    }
  };

  // Pair a quotation to the DOrder and check Step 4
  const handlePairQuotation = async (order: DOrder, quote: Quotation) => {
    const currentUserName = currentUser?.displayName || currentUser?.username || 'Louis';
    const qNum = quote.internalNumber || quote.id;

    const updatedOrder: DOrder = {
      ...order,
      step4: true,
      step4CheckedBy: currentUserName,
      quotationId: quote.id,
      quotationNumber: qNum,
      quotationCustomerName: quote.customerName || '',
      updatedAt: Date.now()
    };

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
      setQuoteModalOrder(null);
    } catch (err) {
      console.error("Failed to pair quotation", err);
    }
  };

  // Confirm step 4 without pairing
  const handleConfirmStep4WithoutPairing = async (order: DOrder) => {
    const currentUserName = currentUser?.displayName || currentUser?.username || 'Louis';
    const updatedOrder: DOrder = {
      ...order,
      step4: true,
      step4CheckedBy: currentUserName,
      updatedAt: Date.now()
    };

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
      setQuoteModalOrder(null);
    } catch (err) {
      console.error("Failed to update step 4", err);
    }
  };

  // Unpair quotation
  const handleUnpairQuotation = async (order: DOrder) => {
    const updatedOrder: DOrder = {
      ...order,
      quotationId: undefined,
      quotationNumber: undefined,
      quotationCustomerName: undefined,
      updatedAt: Date.now()
    };

    try {
      await onSaveDOrder(updatedOrder);
      setQuoteModalOrder(null);
    } catch (err) {
      console.error("Failed to unpair quotation", err);
    }
  };

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
    const cleanCustomerName = newCustomerName.trim();
    const cleanPhone = newPhone.trim();
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
      customerName: cleanCustomerName || undefined,
      phone: cleanPhone || undefined,
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
      setNewCustomerName('');
      setNewPhone('');
      setNewAddress('');
      setIsCreateModalOpen(false);
      // Toast notification is managed by App.tsx, but local confirmation can clear errors
    } catch (err) {
      setFormError('建立進度表失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit D-Order modal with all details populated
  const handleOpenEditOrder = (order: DOrder, initialTab: 'basic' | 'steps' = 'basic') => {
    setEditModalOrder(order);
    setEditTab(initialTab);
    setEditOrderNo(order.orderNo || '');
    setEditCustomerName(order.customerName || order.quotationCustomerName || '');
    setEditPhone(order.phone || '');
    setEditAddress(order.address || '');
    setEditIsUnsigned(Boolean(order.isUnsigned));
    
    // Steps
    setEditStep1(Boolean(order.step1));
    setEditStep2(Boolean(order.step2));
    setEditStep3(Boolean(order.step3));
    setEditStep4(Boolean(order.step4));
    setEditStep5(Boolean(order.step5));
    setEditStep6(Boolean(order.step6));
    
    // Step confirmations
    setEditStep1CheckedBy(order.step1CheckedBy || '');
    setEditStep2CheckedBy(order.step2CheckedBy || '');
    setEditStep3CheckedBy(order.step3CheckedBy || '');
    setEditStep4CheckedBy(order.step4CheckedBy || '');
    setEditStep5CheckedBy(order.step5CheckedBy || '');
    setEditStep6CheckedBy(order.step6CheckedBy || '');
    
    // Step 1 details
    setEditDepositMethod(order.depositMethod || '轉數快 (FPS)');
    setEditDepositAmount(order.depositAmount !== undefined ? order.depositAmount : 500);
    const today = new Date();
    const localDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setEditDepositDate(order.depositDate || localDateString);
    
    // Step 4 pairing
    setEditQuotationNumber(order.quotationNumber || '');
    setEditQuotationCustomerName(order.quotationCustomerName || '');
    
    // Step 5 details
    setEditStep5MeetingDate(order.step5MeetingDate || '');
    setEditStep5MeetingTime(order.step5MeetingTime || '');
    setEditStep5MeetingLocation(order.step5MeetingLocation || '');
    setEditStep5DepositMethod(order.step5DepositMethod || '轉數快 (FPS)');
    setEditStep5DepositAmount(order.step5DepositAmount !== undefined ? order.step5DepositAmount : 20000);
    setEditStep5DepositDate(order.step5DepositDate || localDateString);
    
    setEditFormError(null);
  };

  // Handle saving edited D-Order basic information and progress tracking content
  const handleSaveEditOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalOrder) return;
    setEditFormError(null);

    const cleanOrderNo = editOrderNo.trim();
    const cleanCustomerName = editCustomerName.trim();
    const cleanPhone = editPhone.trim();
    const cleanAddress = editAddress.trim();

    if (!cleanOrderNo) {
      setEditFormError('請輸入單號 (如: D10394)');
      return;
    }
    if (!cleanAddress) {
      setEditFormError('請輸入單位地址');
      return;
    }

    setIsEditSubmitting(true);
    const currentUserName = currentUser?.displayName || currentUser?.username || 'Louis';
    
    // Calculate if all 6 steps are checked
    const allChecked = editStep1 && editStep2 && editStep3 && editStep4 && editStep5 && editStep6;

    const updatedOrder: DOrder = {
      ...editModalOrder,
      orderNo: cleanOrderNo,
      customerName: cleanCustomerName || undefined,
      phone: cleanPhone || undefined,
      address: cleanAddress,
      isUnsigned: editIsUnsigned,
      
      // Step 1: 登記訂金
      step1: editStep1,
      step1CheckedBy: editStep1 ? (editStep1CheckedBy.trim() || editModalOrder.step1CheckedBy || currentUserName) : undefined,
      depositMethod: editStep1 ? editDepositMethod : undefined,
      depositAmount: editStep1 ? Number(editDepositAmount) : undefined,
      depositDate: editStep1 ? editDepositDate : undefined,
      
      // Step 2: 度尺
      step2: editStep2,
      step2CheckedBy: editStep2 ? (editStep2CheckedBy.trim() || editModalOrder.step2CheckedBy || currentUserName) : undefined,
      
      // Step 3: 平面圖
      step3: editStep3,
      step3CheckedBy: editStep3 ? (editStep3CheckedBy.trim() || editModalOrder.step3CheckedBy || currentUserName) : undefined,
      
      // Step 4: 報價單
      step4: editStep4,
      step4CheckedBy: editStep4 ? (editStep4CheckedBy.trim() || editModalOrder.step4CheckedBy || currentUserName) : undefined,
      quotationNumber: editQuotationNumber.trim() || undefined,
      quotationCustomerName: editQuotationCustomerName.trim() || undefined,
      
      // Step 5: 確認報價單及大訂
      step5: editStep5,
      step5CheckedBy: editStep5 ? (editStep5CheckedBy.trim() || editModalOrder.step5CheckedBy || currentUserName) : undefined,
      step5MeetingDate: editStep5MeetingDate.trim() || undefined,
      step5MeetingTime: editStep5MeetingTime.trim() || undefined,
      step5MeetingLocation: editStep5MeetingLocation.trim() || undefined,
      step5DepositMethod: editStep5 ? editStep5DepositMethod : undefined,
      step5DepositAmount: editStep5 ? Number(editStep5DepositAmount) : undefined,
      step5DepositDate: editStep5 ? editStep5DepositDate : undefined,
      
      // Step 6: 確認A單
      step6: editStep6,
      step6CheckedBy: editStep6 ? (editStep6CheckedBy.trim() || editModalOrder.step6CheckedBy || currentUserName) : undefined,
      
      isCompleted: allChecked,
      updatedAt: Date.now()
    };

    try {
      await onSaveDOrder(updatedOrder);
      setEditModalOrder(null);
    } catch (err) {
      setEditFormError('儲存修改失敗，請稍後再試');
    } finally {
      setIsEditSubmitting(false);
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

    if (stepKey === 'step4') {
      if (isNowChecked) {
        // Pop up quotation selector modal when checking Step 4
        setQuoteModalOrder(order);
        setQuoteSearchQuery('');
        return;
      } else {
        // Clear step 4 and paired quotation info on unchecking
        const updatedOrder: DOrder = {
          ...order,
          step4: false,
          step4CheckedBy: undefined,
          quotationId: undefined,
          quotationNumber: undefined,
          quotationCustomerName: undefined,
          isCompleted: false,
          updatedAt: Date.now()
        } as any;

        try {
          await onSaveDOrder(updatedOrder);
        } catch (err) {
          console.error("Failed to clear step 4 info", err);
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

  // Toggle unsigned status
  const handleToggleUnsigned = async (order: DOrder) => {
    const updatedOrder: DOrder = {
      ...order,
      isUnsigned: !order.isUnsigned,
      updatedAt: Date.now()
    };
    try {
      await onSaveDOrder(updatedOrder);
    } catch (err) {
      console.error("Failed to update unsigned status", err);
    }
  };

  // Filter, Search & Sort orders by "D單單號" descending
  const filteredOrders = useMemo(() => {
    const filtered = dOrders.filter(order => {
      // Step 1: Filter by tab status
      if (activeTab === 'unsigned') {
        if (!order.isUnsigned) return false;
      } else if (activeTab === 'inprogress') {
        if (order.isUnsigned || order.isCompleted) return false;
      } else if (activeTab === 'confirmed') {
        if (order.isUnsigned || !order.isCompleted) return false;
      }

      // Step 2: Filter by search query
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        order.orderNo.toLowerCase().includes(query) ||
        order.address.toLowerCase().includes(query) ||
        (order.customerName && order.customerName.toLowerCase().includes(query)) ||
        (order.quotationCustomerName && order.quotationCustomerName.toLowerCase().includes(query)) ||
        (order.phone && order.phone.toLowerCase().includes(query)) ||
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

          <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 overflow-x-auto">
            <button
              onClick={() => setActiveTab('inprogress')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'inprogress'
                  ? 'bg-white text-amber-600 shadow-3xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ListTodo className="w-4 h-4 text-amber-500" />
              <span>進行中 D單 ({dOrders.filter(o => !o.isCompleted && !o.isUnsigned).length})</span>
            </button>
            <button
              onClick={() => setActiveTab('confirmed')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'confirmed'
                  ? 'bg-white text-emerald-600 shadow-3xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ClipboardCheck className="w-4 h-4 text-emerald-500" />
              <span>已確認 A單 ({dOrders.filter(o => o.isCompleted && !o.isUnsigned).length})</span>
            </button>
            <button
              onClick={() => setActiveTab('unsigned')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'unsigned'
                  ? 'bg-white text-rose-600 shadow-3xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileX className="w-4 h-4 text-rose-500" />
              <span>未簽約 D單 ({dOrders.filter(o => Boolean(o.isUnsigned)).length})</span>
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
                {searchQuery 
                  ? '請嘗試更換關鍵字重新搜尋' 
                  : activeTab === 'inprogress' 
                    ? '目前沒有正在進行中的 D單。請點選上方表單建立一個！' 
                    : activeTab === 'confirmed'
                      ? '目前尚無完成 6 大步驟移入的 A單。'
                      : '目前尚無被標記為未簽約的 D單。'
                }
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
                  onDoubleClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('button, input, a, select')) return;
                    handleOpenEditOrder(order);
                  }}
                  className={`bg-white rounded-2xl border shadow-3xs overflow-hidden transition-all duration-300 ${
                    order.isUnsigned
                      ? 'border-rose-200 bg-rose-50/10'
                      : order.isCompleted 
                        ? 'border-emerald-200 ring-1 ring-emerald-500/5 hover:border-emerald-300' 
                        : 'border-slate-150 hover:border-slate-250'
                  }`}
                >
                  {/* Card Title & Info Bar */}
                  <div 
                    onDoubleClick={() => handleOpenEditOrder(order)}
                    title="雙擊 (Double Click) 快速修改此 D單 資料與進度追蹤內容"
                    className="px-5 py-4 border-b border-slate-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/30 cursor-pointer select-none"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span 
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditOrder(order);
                          }}
                          title="雙擊 (Double Click) 快速修改 D單 進度追蹤內容"
                          className={`px-2.5 py-1 rounded-lg text-xs font-black tracking-wider cursor-pointer hover:ring-2 hover:ring-amber-400/70 transition-all ${
                            order.isUnsigned
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : order.isCompleted 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' 
                                : 'bg-amber-50 text-amber-700 border border-amber-150'
                          }`}
                        >
                          {order.orderNo}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleUnsigned(order);
                          }}
                          className={`px-2 py-0.5 text-[11px] font-extrabold rounded-md border transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                            order.isUnsigned
                              ? 'bg-rose-600 text-white border-rose-600 shadow-2xs hover:bg-rose-700'
                              : 'bg-white text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300 shadow-3xs'
                          }`}
                          title={order.isUnsigned ? '點擊取消未簽約標記 (移回進行中/已確認)' : '點擊標記為未簽約 (將此單移至未簽約D單)'}
                        >
                          <FileX className="w-3 h-3" />
                          <span>{order.isUnsigned ? '已標記未簽約' : '未簽約'}</span>
                        </button>
                        
                        <span className="text-slate-400 text-xs">|</span>
                        
                        {/* Address Title Area - Clickable when paired */}
                        <button
                          type="button"
                          onClick={() => {
                            if (order.quotationNumber) {
                              handleOpenPairedQuotation(order);
                            }
                          }}
                          className={`flex items-center gap-1 text-xs font-bold transition-colors ${
                            order.quotationNumber 
                              ? 'text-slate-800 hover:text-amber-600 cursor-pointer underline decoration-amber-300 decoration-2 underline-offset-2' 
                              : 'text-slate-600'
                          }`}
                          title={order.quotationNumber ? '點擊進入配對的報價單 (或雙擊編輯 D單)' : `${order.address} (雙擊編輯 D單)`}
                        >
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{order.address}</span>
                          {order.quotationNumber && (
                            <span className="ml-1 text-[10px] text-amber-600 font-extrabold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                              進入報價單 &rarr;
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Customer Name & Phone Tags */}
                      {(order.customerName || order.quotationCustomerName || order.phone) && (
                        <div 
                          className="flex items-center gap-2 flex-wrap pt-0.5"
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditOrder(order);
                          }}
                        >
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200/80 font-bold text-xs" title="雙擊修改客戶資訊">
                            <User className="w-3 h-3 text-amber-600" />
                            <span>客戶: <strong>{order.customerName || order.quotationCustomerName || '未命名'}</strong></span>
                          </span>
                          {order.phone && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-mono font-bold text-[11px]" title="雙擊修改聯絡電話">
                              <Phone className="w-3 h-3 text-slate-500" />
                              <span>{order.phone}</span>
                            </span>
                          )}
                        </div>
                      )}
                      
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
                        <span className="hidden md:inline-flex items-center gap-1 text-amber-600/80 font-normal">
                          • 💡 雙擊卡片或單號可直接修改進度內容
                        </span>
                      </div>
                    </div>

                    {/* Progress Badge or Action menu */}
                    <div className="flex items-center gap-2.5 self-end sm:self-auto">
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

                      {/* Quick Edit Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditOrder(order)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors shrink-0 cursor-pointer border border-transparent hover:border-amber-200"
                        title="編輯 D單 資料與進度追蹤 (亦可直接 Double Click 卡片)"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      {/* Receipt & Delete buttons */}
                      {onPrintSurveyReceipt && (
                        <button
                          type="button"
                          onClick={() => onPrintSurveyReceipt(order)}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-3xs active:scale-95"
                          title="列印「現場勘測及平面圖」收據 (與A單一致格式)"
                        >
                          <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="text-[10px] font-black hidden md:inline">列印收據</span>
                        </button>
                      )}

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
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              if (step.key === 'step1') {
                                setDepositModalOrder(order);
                                setDepositMethod(order.depositMethod || '轉數快 (FPS)');
                                setDepositAmount(order.depositAmount !== undefined ? order.depositAmount : 500);
                                const today = new Date();
                                const localDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                                setDepositDate(order.depositDate || localDateString);
                                setDepositError(null);
                              } else if (step.key === 'step4') {
                                setQuoteModalOrder(order);
                                setQuoteSearchQuery('');
                              } else if (step.key === 'step5') {
                                if (order.step5MeetingDate && !order.step5DepositMethod) {
                                  setMeetingModalOrder(order);
                                  setMeetingDate(order.step5MeetingDate || '');
                                  setMeetingTime(order.step5MeetingTime || '');
                                  setMeetingLocation(order.step5MeetingLocation || '');
                                } else {
                                  setStep5DepositModalOrder(order);
                                  setStep5DepositMethod(order.step5DepositMethod || '轉數快 (FPS)');
                                  setStep5DepositAmount(order.step5DepositAmount !== undefined ? order.step5DepositAmount : 20000);
                                  const today = new Date();
                                  const localDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                                  setStep5DepositDate(order.step5DepositDate || localDateString);
                                  setStep5DepositError(null);
                                }
                              } else {
                                handleOpenEditOrder(order, 'steps');
                              }
                            }}
                            title={`點擊切換勾選；雙擊 (Double Click) 快速編輯此步驟內容`}
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
                                      <div className="flex items-center justify-between mt-1 pt-0.5 border-t border-emerald-200/40">
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
                                          className="text-[8px] font-extrabold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                                        >
                                          變更登記
                                        </button>
                                        {onPrintSurveyReceipt && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onPrintSurveyReceipt(order);
                                            }}
                                            className="inline-flex items-center gap-0.5 text-[8px] font-black text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200/70 transition-colors cursor-pointer"
                                            title="列印「現場勘測及平面圖」收據"
                                          >
                                            <Receipt className="w-2.5 h-2.5" />
                                            <span>列印收據</span>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              )}

                              {/* Step 4 Quotation Pairing Details */}
                              {step.key === 'step4' && (
                                <div className="mt-1 w-full flex flex-col gap-1">
                                  {order.quotationNumber ? (
                                    <div 
                                      className="p-1 bg-amber-50/90 border border-amber-200 rounded text-[8px] text-amber-900 leading-tight font-bold flex flex-col gap-0.5 select-text"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="flex items-center justify-between border-b border-amber-200/50 pb-0.5 mb-0.5">
                                        <span className="font-black text-amber-800 flex items-center gap-0.5">
                                          <FileText className="w-2.5 h-2.5 text-amber-600" />
                                          配對報價單
                                        </span>
                                        <span className="font-mono font-black text-[8.5px] text-amber-700">{order.quotationNumber}</span>
                                      </div>
                                      {order.quotationCustomerName && (
                                        <div className="text-[8px] text-amber-800/80 truncate">
                                          客戶: {order.quotationCustomerName}
                                        </div>
                                      )}
                                      <div className="flex items-center justify-between mt-0.5 pt-0.5 border-t border-amber-200/30">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenPairedQuotation(order);
                                          }}
                                          className="text-[8px] font-black text-amber-700 hover:text-amber-900 underline cursor-pointer flex items-center gap-0.5"
                                          title="開啟此報價單編輯"
                                        >
                                          <ExternalLink className="w-2 h-2" />
                                          開啟
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setQuoteModalOrder(order);
                                            setQuoteSearchQuery('');
                                          }}
                                          className="text-[8px] font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                                          title="更換配對其他報價單或另開新單"
                                        >
                                          更換
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                                      {/* Main Action: Create & Pair New Quote with existing data */}
                                      <button
                                        type="button"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (onCreateAndPairQuotation) {
                                            await onCreateAndPairQuotation(order);
                                          } else {
                                            setQuoteModalOrder(order);
                                            setQuoteSearchQuery('');
                                          }
                                        }}
                                        className="w-full py-1 px-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-white text-[8px] font-black rounded border border-amber-400 flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer"
                                        title="用現有D單資料 (客戶、地址、電話、已收訂金) 一鍵開立新報價單並開啟編輯"
                                      >
                                        <Sparkles className="w-2.5 h-2.5 text-amber-200 shrink-0" />
                                        <span>開啟及配對報價單</span>
                                      </button>

                                      {/* Secondary Action: Select existing quote to pair */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setQuoteModalOrder(order);
                                          setQuoteSearchQuery('');
                                        }}
                                        className="w-full py-0.5 px-1 bg-white hover:bg-amber-50 text-slate-600 hover:text-amber-800 text-[7.5px] font-bold rounded border border-slate-200 hover:border-amber-200 flex items-center justify-center gap-0.5 transition-colors cursor-pointer"
                                        title="從現有報價單清單中搜尋並配對"
                                      >
                                        <Link2 className="w-2 h-2 text-slate-400" />
                                        <span>配對現有報價單</span>
                                      </button>
                                    </div>
                                  )}
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
                                        <span className="font-black text-emerald-800">已收初訂</span>
                                        <span className="font-mono font-black text-[8.5px] text-emerald-700">HK${order.step5DepositAmount !== undefined ? order.step5DepositAmount.toLocaleString() : '20,000'}</span>
                                      </div>
                                      <div className="flex items-center gap-0.5 text-[8px] text-emerald-800/80">
                                        <span className="font-bold shrink-0">方式:</span>
                                        <span className="truncate">{order.step5DepositMethod}</span>
                                      </div>
                                      <div className="flex items-center gap-0.5 text-[8px] text-emerald-800/80">
                                        <span className="font-bold shrink-0">日期:</span>
                                        <span className="truncate">{order.step5DepositDate}</span>
                                      </div>
                                      <div className="flex items-center justify-between mt-1 pt-0.5 border-t border-emerald-200/40">
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
                                          className="text-[8px] font-extrabold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                                        >
                                          變更登記
                                        </button>
                                        {onPrintStep5Receipt && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onPrintStep5Receipt(order);
                                            }}
                                            className="inline-flex items-center gap-0.5 text-[8px] font-black text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200/70 transition-colors cursor-pointer"
                                            title="列印「初訂」收據 (預設HK$20,000)"
                                          >
                                            <Receipt className="w-2.5 h-2.5" />
                                            <span>列印收據</span>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    onPrintStep5Receipt && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onPrintStep5Receipt(order);
                                        }}
                                        className="w-full py-0.5 px-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 text-[8px] font-black rounded border border-indigo-200/80 flex items-center justify-center gap-0.5 transition-colors cursor-pointer"
                                        title="列印「初訂」收據 (預設HK$20,000，可查核及編輯)"
                                      >
                                        <Receipt className="w-2 h-2 text-indigo-600" />
                                        <span>列印初訂收據</span>
                                      </button>
                                    )
                                  )}
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
                            此單已正式轉為「A單」。
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
                  className="w-full min-w-0 max-w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:bg-white appearance-none"
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
                  className="w-full min-w-0 max-w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:bg-white appearance-none"
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
                  <option value="VISA">VISA</option>
                  <option value="Mastercard">Mastercard</option>
                  <option value="AE (American Express)">AE (American Express)</option>
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
                  className="w-full min-w-0 max-w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white appearance-none"
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
                {onPrintSurveyReceipt && (
                  <button
                    type="button"
                    onClick={async (e) => {
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
                        onPrintSurveyReceipt(updatedOrder);
                      } catch (err) {
                        setDepositError('儲存失敗，請重試');
                      }
                    }}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    title="登記並立即開啟收據列印"
                  >
                    <Printer className="w-4 h-4" />
                    登記並列印
                  </button>
                )}
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
                  <option value="VISA">VISA</option>
                  <option value="Mastercard">Mastercard</option>
                  <option value="AE (American Express)">AE (American Express)</option>
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
                  className="w-full min-w-0 max-w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white appearance-none"
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
                {onPrintStep5Receipt && (
                  <button
                    type="button"
                    onClick={async (e) => {
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
                        onPrintStep5Receipt(updatedOrder);
                      } catch (err) {
                        setStep5DepositError('儲存失敗，請重試');
                      }
                    }}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    title="登記並立即開啟初訂收據列印 (預設HK$20,000)"
                  >
                    <Printer className="w-4 h-4" />
                    登記並列印
                  </button>
                )}
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

            <form onSubmit={handleCreateOrder} className="space-y-3.5 mt-2">
              <div>
                <label className="block text-xs font-black text-slate-500 mb-1 uppercase">
                  D單單號 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如: D10459"
                  value={newOrderNo}
                  onChange={(e) => setNewOrderNo(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:bg-white uppercase text-slate-700 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1 uppercase">
                    客戶姓名
                  </label>
                  <input
                    type="text"
                    placeholder="例如: 陳大文先生 / 李小姐"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:bg-white text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1 uppercase">
                    聯絡電話
                  </label>
                  <input
                    type="text"
                    placeholder="例如: 9123 4567"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:bg-white text-slate-700 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 mb-1 uppercase">
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

      {/* --- EDIT D-ORDER BASIC INFO & PROGRESS TRACKING MODAL --- */}
      {editModalOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[120] flex items-center justify-center p-4 animate-fade-in text-left">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-slate-100 flex flex-col relative animate-scale-up">
            {/* Close button */}
            <button 
              type="button"
              onClick={() => {
                setEditModalOrder(null);
                setEditFormError(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-full p-1 transition-all cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black flex items-center gap-2">
                    <span>修改 D單 與進度追蹤內容</span>
                    <span className="text-[10px] bg-amber-500 text-slate-900 px-2 py-0.5 rounded-full font-mono font-black">
                      {editOrderNo || editModalOrder.orderNo}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-300 font-medium mt-0.5 truncate max-w-md">
                    {editAddress || editModalOrder.address || '裝修工程進度'}
                  </p>
                </div>
              </div>
            </div>

            {/* Tab Selector */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
              <button
                type="button"
                onClick={() => setEditTab('basic')}
                className={`pb-2.5 px-4 text-xs font-black flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                  editTab === 'basic'
                    ? 'border-amber-600 text-amber-700 bg-white rounded-t-lg border-t border-x border-slate-200 shadow-3xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>基本資料 (單號/客戶/地址)</span>
              </button>
              <button
                type="button"
                onClick={() => setEditTab('steps')}
                className={`pb-2.5 px-4 text-xs font-black flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                  editTab === 'steps'
                    ? 'border-amber-600 text-amber-700 bg-white rounded-t-lg border-t border-x border-slate-200 shadow-3xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>6 大步驟推進狀態 & 款項明細</span>
                <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-mono font-bold">
                  {[editStep1, editStep2, editStep3, editStep4, editStep5, editStep6].filter(Boolean).length}/6
                </span>
              </button>
            </div>

            <form onSubmit={handleSaveEditOrder} className="flex-1 overflow-y-auto p-6 space-y-4 text-left">
              {editTab === 'basic' ? (
                /* TAB 1: BASIC INFORMATION */
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-500 mb-1 uppercase">
                        D單單號 <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="例如: D10459"
                        value={editOrderNo}
                        onChange={(e) => setEditOrderNo(e.target.value)}
                        className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:bg-white uppercase text-slate-800 font-mono"
                      />
                    </div>

                    <div className="flex items-center pt-6">
                      <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-lg border border-slate-200 w-full transition-colors">
                        <input
                          type="checkbox"
                          checked={editIsUnsigned}
                          onChange={(e) => setEditIsUnsigned(e.target.checked)}
                          className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500 border-slate-300 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-700">
                          標記為「未簽約 D單」
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-500 mb-1 uppercase">
                        客戶姓名 (Customer Name)
                      </label>
                      <input
                        type="text"
                        placeholder="例如: 陳大文先生 / 李小姐"
                        value={editCustomerName}
                        onChange={(e) => setEditCustomerName(e.target.value)}
                        className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:bg-white text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-500 mb-1 uppercase">
                        聯絡電話 (Phone)
                      </label>
                      <input
                        type="text"
                        placeholder="例如: 9123 4567"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:bg-white text-slate-800 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 mb-1 uppercase">
                      裝修單位地址 (Address) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="例如: 灣仔軒尼詩道 128 號 15 樓 B 室"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:bg-white text-slate-800"
                    />
                  </div>

                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-900 font-medium">
                    <p className="font-bold flex items-center gap-1 text-amber-800">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      提示：點擊上方「6 大步驟推進狀態」標籤可進一步微調所有步驟完成狀態、收據訂金金額及約見日程。
                    </p>
                  </div>
                </div>
              ) : (
                /* TAB 2: STEP PROGRESS DETAILS */
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-black text-slate-700">6 大工程推進步驟開關與明細</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditStep1(true);
                          setEditStep2(true);
                          setEditStep3(true);
                          setEditStep4(true);
                          setEditStep5(true);
                          setEditStep6(true);
                        }}
                        className="text-[10px] font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-md transition-colors cursor-pointer"
                      >
                        一鍵全選完成 (轉A單)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditStep1(false);
                          setEditStep2(false);
                          setEditStep3(false);
                          setEditStep4(false);
                          setEditStep5(false);
                          setEditStep6(false);
                        }}
                        className="text-[10px] font-black text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md transition-colors cursor-pointer"
                      >
                        一鍵重置為初始
                      </button>
                    </div>
                  </div>

                  {/* Step 1 */}
                  <div className={`p-3 rounded-xl border transition-all ${editStep1 ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50/50 border-slate-200'}`}>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editStep1}
                          onChange={(e) => setEditStep1(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300 cursor-pointer"
                        />
                        <span className="text-xs font-black text-slate-800">步驟 1: 登記訂金 (首期勘測款)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="確認人 (例如 Louis)"
                        value={editStep1CheckedBy}
                        onChange={(e) => setEditStep1CheckedBy(e.target.value)}
                        className="text-[10px] px-2 py-0.5 bg-white border border-slate-200 rounded font-semibold w-28 text-slate-700"
                        title="確認人"
                      />
                    </div>
                    {editStep1 && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2.5 pt-2 border-t border-emerald-100">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 mb-0.5">收款方式</label>
                          <select
                            value={editDepositMethod}
                            onChange={(e) => setEditDepositMethod(e.target.value)}
                            className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded font-semibold text-slate-700"
                          >
                            <option value="轉數快 (FPS)">轉數快 (FPS)</option>
                            <option value="銀行轉帳 (Bank Transfer)">銀行轉帳 (Bank Transfer)</option>
                            <option value="VISA">VISA</option>
                            <option value="Mastercard">Mastercard</option>
                            <option value="AE (American Express)">AE (American Express)</option>
                            <option value="現金 (Cash)">現金 (Cash)</option>
                            <option value="支票 (Cheque)">支票 (Cheque)</option>
                            <option value="其他 (Other)">其他 (Other)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 mb-0.5">收款金額 (HK$)</label>
                          <input
                            type="number"
                            value={editDepositAmount}
                            onChange={(e) => setEditDepositAmount(Number(e.target.value))}
                            className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded font-semibold text-slate-700 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 mb-0.5">收款日期</label>
                          <input
                            type="date"
                            value={editDepositDate}
                            onChange={(e) => setEditDepositDate(e.target.value)}
                            className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded font-semibold text-slate-700"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 2 */}
                  <div className={`p-3 rounded-xl border transition-all ${editStep2 ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50/50 border-slate-200'}`}>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editStep2}
                          onChange={(e) => setEditStep2(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300 cursor-pointer"
                        />
                        <span className="text-xs font-black text-slate-800">步驟 2: 度尺 (現場尺寸測量)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="確認人 (例如 Louis)"
                        value={editStep2CheckedBy}
                        onChange={(e) => setEditStep2CheckedBy(e.target.value)}
                        className="text-[10px] px-2 py-0.5 bg-white border border-slate-200 rounded font-semibold w-28 text-slate-700"
                        title="確認人"
                      />
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className={`p-3 rounded-xl border transition-all ${editStep3 ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50/50 border-slate-200'}`}>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editStep3}
                          onChange={(e) => setEditStep3(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300 cursor-pointer"
                        />
                        <span className="text-xs font-black text-slate-800">步驟 3: 平面圖 (規劃設計圖)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="確認人 (例如 Louis)"
                        value={editStep3CheckedBy}
                        onChange={(e) => setEditStep3CheckedBy(e.target.value)}
                        className="text-[10px] px-2 py-0.5 bg-white border border-slate-200 rounded font-semibold w-28 text-slate-700"
                        title="確認人"
                      />
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className={`p-3 rounded-xl border transition-all ${editStep4 ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50/50 border-slate-200'}`}>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editStep4}
                          onChange={(e) => setEditStep4(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300 cursor-pointer"
                        />
                        <span className="text-xs font-black text-slate-800">步驟 4: 報價單 (項目工程估算)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="確認人 (例如 Louis)"
                        value={editStep4CheckedBy}
                        onChange={(e) => setEditStep4CheckedBy(e.target.value)}
                        className="text-[10px] px-2 py-0.5 bg-white border border-slate-200 rounded font-semibold w-28 text-slate-700"
                        title="確認人"
                      />
                    </div>
                    {editStep4 && (
                      <div className="space-y-2 mt-2.5 pt-2 border-t border-emerald-100">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 mb-0.5">配對報價單號 (Quotation Number)</label>
                            <input
                              type="text"
                              placeholder="例如: 2026-A102 或點下方按鈕開立"
                              value={editQuotationNumber}
                              onChange={(e) => setEditQuotationNumber(e.target.value)}
                              className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded font-semibold text-slate-700 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 mb-0.5">報價單客戶名稱</label>
                            <input
                              type="text"
                              placeholder="報價單載明之客戶"
                              value={editQuotationCustomerName}
                              onChange={(e) => setEditQuotationCustomerName(e.target.value)}
                              className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded font-semibold text-slate-700"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-1 border-t border-emerald-100/60">
                          <button
                            type="button"
                            onClick={async () => {
                              if (onCreateAndPairQuotation && editModalOrder) {
                                setEditModalOrder(null);
                                await onCreateAndPairQuotation({
                                  ...editModalOrder,
                                  orderNo: editOrderNo || editModalOrder.orderNo,
                                  customerName: editCustomerName || editModalOrder.customerName,
                                  phone: editPhone || editModalOrder.phone,
                                  address: editAddress || editModalOrder.address
                                });
                              }
                            }}
                            className="px-2.5 py-1 text-[11px] font-black bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                          >
                            <Sparkles className="w-3 h-3 text-amber-200" />
                            <span>用此 D 單現有資料開立並配對新報價單</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 5 */}
                  <div className={`p-3 rounded-xl border transition-all ${editStep5 ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50/50 border-slate-200'}`}>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editStep5}
                          onChange={(e) => setEditStep5(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300 cursor-pointer"
                        />
                        <span className="text-xs font-black text-slate-800">步驟 5: 確認報價單及大訂 (簽署及二期款)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="確認人 (例如 Louis)"
                        value={editStep5CheckedBy}
                        onChange={(e) => setEditStep5CheckedBy(e.target.value)}
                        className="text-[10px] px-2 py-0.5 bg-white border border-slate-200 rounded font-semibold w-28 text-slate-700"
                        title="確認人"
                      />
                    </div>
                    {editStep5 && (
                      <div className="space-y-2 mt-2.5 pt-2 border-t border-emerald-100">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 mb-0.5">約見日期</label>
                            <input
                              type="date"
                              value={editStep5MeetingDate}
                              onChange={(e) => setEditStep5MeetingDate(e.target.value)}
                              className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded font-semibold text-slate-700"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 mb-0.5">約見時間</label>
                            <input
                              type="time"
                              value={editStep5MeetingTime}
                              onChange={(e) => setEditStep5MeetingTime(e.target.value)}
                              className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded font-semibold text-slate-700"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 mb-0.5">約見地點</label>
                            <input
                              type="text"
                              placeholder="例如: 旺角門市 / 現場"
                              value={editStep5MeetingLocation}
                              onChange={(e) => setEditStep5MeetingLocation(e.target.value)}
                              className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded font-semibold text-slate-700"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-emerald-100/60">
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 mb-0.5">初訂收款方式</label>
                            <select
                              value={editStep5DepositMethod}
                              onChange={(e) => setEditStep5DepositMethod(e.target.value)}
                              className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded font-semibold text-slate-700"
                            >
                              <option value="轉數快 (FPS)">轉數快 (FPS)</option>
                              <option value="銀行轉帳 (Bank Transfer)">銀行轉帳 (Bank Transfer)</option>
                              <option value="VISA">VISA</option>
                              <option value="Mastercard">Mastercard</option>
                              <option value="AE (American Express)">AE (American Express)</option>
                              <option value="現金 (Cash)">現金 (Cash)</option>
                              <option value="支票 (Cheque)">支票 (Cheque)</option>
                              <option value="其他 (Other)">其他 (Other)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 mb-0.5">初訂收款金額 (HK$)</label>
                            <input
                              type="number"
                              value={editStep5DepositAmount}
                              onChange={(e) => setEditStep5DepositAmount(Number(e.target.value))}
                              className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded font-semibold text-slate-700 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 mb-0.5">初訂收款日期</label>
                            <input
                              type="date"
                              value={editStep5DepositDate}
                              onChange={(e) => setEditStep5DepositDate(e.target.value)}
                              className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded font-semibold text-slate-700"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 6 */}
                  <div className={`p-3 rounded-xl border transition-all ${editStep6 ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50/50 border-slate-200'}`}>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editStep6}
                          onChange={(e) => setEditStep6(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300 cursor-pointer"
                        />
                        <span className="text-xs font-black text-slate-800">步驟 6: 確認A單 (分配設計師 / 結案生產)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="確認人 (例如 Louis)"
                        value={editStep6CheckedBy}
                        onChange={(e) => setEditStep6CheckedBy(e.target.value)}
                        className="text-[10px] px-2 py-0.5 bg-white border border-slate-200 rounded font-semibold w-28 text-slate-700"
                        title="確認人"
                      />
                    </div>
                  </div>
                </div>
              )}

              {editFormError && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500 bg-rose-50 border border-rose-100 p-2.5 rounded-lg">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{editFormError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditModalOrder(null);
                    setEditFormError(null);
                  }}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer text-center"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>{isEditSubmitting ? '儲存中...' : '儲存變更'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- QUOTATION SELECTION & PAIRING MODAL (STEP 4) --- */}
      {quoteModalOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[130] flex items-center justify-center p-4 animate-fade-in text-left">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh] relative animate-scale-up">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black flex items-center gap-2">
                    <span>配對報價單 (Select & Pair Quotation)</span>
                    <span className="text-[10px] bg-amber-500 text-slate-900 px-2 py-0.5 rounded-full font-extrabold">
                      步驟 4
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                    D單號：<span className="font-mono text-amber-300 font-black">{quoteModalOrder.orderNo}</span> ｜ 地址：{quoteModalOrder.address}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuoteModalOrder(null)}
                className="p-1 text-slate-400 hover:text-white rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="搜尋報價單號、內部號碼、客戶姓名、電話、地址..."
                  value={quoteSearchQuery}
                  onChange={(e) => setQuoteSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-3xs"
                />
                {quoteSearchQuery && (
                  <button
                    onClick={() => setQuoteSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Action: Create & Pair with Current D-Order Data */}
            <div className="p-4 pb-0">
              <div className="p-3.5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 rounded-xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md border border-amber-400/40">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 bg-slate-900 text-amber-300 rounded-md text-[10px] font-mono font-black shadow-2xs">
                      {quoteModalOrder.orderNo}
                    </span>
                    <span className="font-extrabold text-xs flex items-center gap-1 text-white">
                      <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse shrink-0" />
                      開啟及配對新報價單
                    </span>
                    <span className="px-1.5 py-0.2 bg-white/20 text-white rounded text-[9px] font-bold">
                      一鍵代入現有資料
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-50 font-medium leading-tight">
                    自動帶入客戶「{quoteModalOrder.customerName || quoteModalOrder.quotationCustomerName || '客戶'}」、電話「{quoteModalOrder.phone || '無'}」、工程地址與訂金紀錄，立即開立並開啟編輯合約！
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (onCreateAndPairQuotation) {
                      setQuoteModalOrder(null);
                      await onCreateAndPairQuotation(quoteModalOrder);
                    }
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-black active:scale-95 text-amber-300 hover:text-amber-200 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shrink-0 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>立即開立並配對</span>
                </button>
              </div>
            </div>

            {/* Quotation List Body */}
            <div className="p-4 overflow-y-auto flex-1 space-y-2 text-left">
              {filteredQuotationsForModal.length === 0 ? (
                <div className="text-center py-10">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-extrabold text-slate-600">未找到相關的報價單</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-bold">請切換關鍵字搜尋，或先在「合約與報價單」頁面建立報價單。</p>
                </div>
              ) : (
                filteredQuotationsForModal.map((quote) => {
                  const qNum = quote.internalNumber || quote.id;
                  const isCurrentlyPaired = quoteModalOrder.quotationId === quote.id || quoteModalOrder.quotationNumber === qNum;
                  const subtotal = quote.items?.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0) || 0;

                  const isAddressMatch = quoteModalOrder.address && (
                    quote.address?.includes(quoteModalOrder.address) || 
                    quoteModalOrder.address?.includes(quote.address || '')
                  );

                  return (
                    <div
                      key={quote.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isCurrentlyPaired
                          ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/30'
                          : isAddressMatch
                            ? 'bg-sky-50/50 border-sky-200 hover:border-sky-300'
                            : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 bg-slate-900 text-amber-400 rounded-md text-xs font-mono font-black">
                            {qNum}
                          </span>
                          {isAddressMatch && (
                            <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded-md text-[10px] font-extrabold">
                              ✨ 建議配對 (地址相符)
                            </span>
                          )}
                          {isCurrentlyPaired && (
                            <span className="px-2 py-0.5 bg-amber-500 text-white rounded-md text-[10px] font-black flex items-center gap-1">
                              <Check className="w-3 h-3" /> 目前已配對
                            </span>
                          )}
                          <span className="text-xs text-slate-800 font-black">
                            {quote.customerName || '未命名客戶'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[11px] text-slate-500 font-semibold">
                          <span>📍 {quote.address || '無地址'}</span>
                          {quote.phone && <span>📞 {quote.phone}</span>}
                          <span>📅 {quote.date}</span>
                          <span className="font-mono font-bold text-slate-800">
                            HK${subtotal.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenQuotation) onOpenQuotation(quote);
                          }}
                          className="px-2.5 py-1.5 text-xs font-extrabold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                          title="檢視/編輯此報價單"
                        >
                          查看內容
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePairQuotation(quoteModalOrder, quote)}
                          className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                            isCurrentlyPaired
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-amber-500 hover:bg-amber-600 text-white'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isCurrentlyPaired ? '已配對 (可重新點擊)' : '配對此報價單'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
              <div className="flex items-center gap-2">
                {quoteModalOrder.quotationNumber && (
                  <button
                    type="button"
                    onClick={() => handleUnpairQuotation(quoteModalOrder)}
                    className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>解除配對</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleConfirmStep4WithoutPairing(quoteModalOrder)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  暫不配對，直接標記第4步完成
                </button>
              </div>

              <button
                type="button"
                onClick={() => setQuoteModalOrder(null)}
                className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                關閉 (Close)
              </button>
            </div>
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
