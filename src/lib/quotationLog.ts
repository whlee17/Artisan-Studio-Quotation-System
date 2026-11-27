import {
  Quotation,
  QuotationEditLog,
  QuotationItem,
  QuotationLogChangeEntry,
  QuotationStatus,
  VariationOrder,
} from '../types';

const STATUS_LABELS: Record<QuotationStatus, string> = {
  pending: '未報價',
  quoted: '報價待回覆',
  signed: '已簽約',
  constructing: '施工中',
  finished: '施工完成',
  completed: '完工結清',
  cancelled: '作廢',
};

const formatStatusLabel = (status?: string): string => {
  if (!status) return '無';
  return STATUS_LABELS[status as QuotationStatus] || status;
};

const formatCurrency = (val: number | undefined | null): string => {
  const num = Number(val) || 0;
  return `HK$${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const truncateText = (val: string | undefined | null, maxLen: number = 48): string => {
  const trimmed = (val || '').replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen)}...`;
};

export const formatLogDateTime = (ts: number): string => {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export const cloneQuotationBaseline = (quote: Quotation | null | undefined): Quotation | null => {
  if (!quote) return null;
  try {
    return JSON.parse(JSON.stringify(quote)) as Quotation;
  } catch {
    return { ...quote };
  }
};

const normalizeVariationOrdersForDiff = (quote: Quotation): VariationOrder[] => {
  if (Array.isArray(quote.variationOrders) && quote.variationOrders.length > 0) {
    return quote.variationOrders;
  }
  if (quote.hasVO || (Array.isArray(quote.voItems) && quote.voItems.length > 0)) {
    return [
      {
        id: 'vo-1',
        title: quote.voTitle || '後加工程 1',
        date: quote.voDate || quote.date || '',
        items: Array.isArray(quote.voItems) ? quote.voItems : [],
        paymentStages: Array.isArray(quote.voPaymentStages) ? quote.voPaymentStages : [],
        remarks: quote.voRemarks || '',
        discount: Number(quote.voDiscount) || 0,
      },
    ];
  }
  return [];
};

const diffItemsCollection = (
  prevItems: QuotationItem[],
  nextItems: QuotationItem[],
  prevVisibleCats: string[] | undefined,
  nextVisibleCats: string[] | undefined,
  scope: 'original' | 'vo',
  voTitle?: string
): QuotationLogChangeEntry[] => {
  const changes: QuotationLogChangeEntry[] = [];
  const categoryPrefix = scope === 'vo' ? `[後加: ${voTitle || '後加工程'}] ` : '';

  const prevCatSet = new Set<string>([
    ...(Array.isArray(prevVisibleCats) ? prevVisibleCats : []),
    ...prevItems.map((i) => (i.category || '').trim()).filter(Boolean),
  ]);
  const nextCatSet = new Set<string>([
    ...(Array.isArray(nextVisibleCats) ? nextVisibleCats : []),
    ...nextItems.map((i) => (i.category || '').trim()).filter(Boolean),
  ]);

  // Detect pure category renames (when items with same IDs move from oldCat -> newCat, and oldCat disappeared while newCat appeared)
  const prevMap = new Map<string, QuotationItem>();
  prevItems.forEach((item) => prevMap.set(item.id, item));
  const nextMap = new Map<string, QuotationItem>();
  nextItems.forEach((item) => nextMap.set(item.id, item));

  const renamedOldToNew = new Map<string, string>();
  const renamedNewSet = new Set<string>();

  for (const oldCat of prevCatSet) {
    if (nextCatSet.has(oldCat)) continue;
    const oldCatItemIds = prevItems.filter((i) => (i.category || '').trim() === oldCat).map((i) => i.id);
    if (oldCatItemIds.length === 0) continue;
    const targetCats = new Set(
      oldCatItemIds
        .map((id) => nextMap.get(id)?.category?.trim())
        .filter((c): c is string => Boolean(c))
    );
    if (targetCats.size === 1) {
      const [newCat] = Array.from(targetCats);
      if (!prevCatSet.has(newCat)) {
        renamedOldToNew.set(oldCat, newCat);
        renamedNewSet.add(newCat);
        changes.push({
          scope,
          voTitle,
          category: `${categoryPrefix}${newCat}`,
          itemName: `工程大類更名`,
          action: 'category_renamed',
          details: [`大類名稱：「${oldCat}」→「${newCat}」`],
        });
      }
    }
  }

  // Detect added/removed categories that don't have item-level logs (e.g. empty category added/hidden)
  for (const newCat of nextCatSet) {
    if (!prevCatSet.has(newCat) && !renamedNewSet.has(newCat)) {
      const hasAddedItemsInCat = nextItems.some(
        (i) => (i.category || '').trim() === newCat && !prevMap.has(i.id)
      );
      if (!hasAddedItemsInCat) {
        changes.push({
          scope,
          voTitle,
          category: `${categoryPrefix}${newCat}`,
          itemName: '施工大類',
          action: 'category_added',
          details: [`新增施工大類「${newCat}」`],
        });
      }
    }
  }
  for (const oldCat of prevCatSet) {
    if (!nextCatSet.has(oldCat) && !renamedOldToNew.has(oldCat)) {
      const hasRemovedItemsInCat = prevItems.some(
        (i) => (i.category || '').trim() === oldCat && !nextMap.has(i.id)
      );
      if (!hasRemovedItemsInCat) {
        changes.push({
          scope,
          voTitle,
          category: `${categoryPrefix}${oldCat}`,
          itemName: '施工大類',
          action: 'category_removed',
          details: [`移除/隱藏施工大類「${oldCat}」`],
        });
      }
    }
  }

  // Added items
  for (const nextItem of nextItems) {
    if (!prevMap.has(nextItem.id)) {
      const cat = (nextItem.category || '未分類').trim();
      const qty = Number(nextItem.quantity) || 0;
      const price = Number(nextItem.unitPrice) || 0;
      const total = qty * price;
      const details: string[] = [
        `數量：${qty} ${nextItem.unit || '項'}`,
        `單價：${formatCurrency(price)}（小計：${formatCurrency(total)}）`,
      ];
      const remarkStr = truncateText(nextItem.remark, 60);
      if (remarkStr) {
        details.push(`備註：${remarkStr}`);
      }
      changes.push({
        scope,
        voTitle,
        category: `${categoryPrefix}${cat}`,
        itemName: (nextItem.name || '').trim() || '(未命名細項)',
        action: 'added',
        details,
      });
    }
  }

  // Removed items
  for (const prevItem of prevItems) {
    if (!nextMap.has(prevItem.id)) {
      const cat = (prevItem.category || '未分類').trim();
      const qty = Number(prevItem.quantity) || 0;
      const price = Number(prevItem.unitPrice) || 0;
      const total = qty * price;
      const details: string[] = [
        `原數量：${qty} ${prevItem.unit || '項'}，原單價：${formatCurrency(price)}（原小計：${formatCurrency(total)}）`,
      ];
      changes.push({
        scope,
        voTitle,
        category: `${categoryPrefix}${cat}`,
        itemName: (prevItem.name || '').trim() || '(未命名細項)',
        action: 'removed',
        details,
      });
    }
  }

  // Modified items
  for (const nextItem of nextItems) {
    const prevItem = prevMap.get(nextItem.id);
    if (!prevItem) continue;

    const itemDetails: string[] = [];
    const prevCat = (prevItem.category || '未分類').trim();
    const nextCat = (nextItem.category || '未分類').trim();

    if (prevCat !== nextCat && renamedOldToNew.get(prevCat) !== nextCat) {
      itemDetails.push(`所屬大類：「${prevCat}」→「${nextCat}」`);
    }

    const prevName = (prevItem.name || '').trim();
    const nextName = (nextItem.name || '').trim();
    if (prevName !== nextName) {
      itemDetails.push(`項目名稱：「${truncateText(prevName, 40) || '空白'}」→「${truncateText(nextName, 40) || '空白'}」`);
    }

    const prevUnit = (prevItem.unit || '').trim();
    const nextUnit = (nextItem.unit || '').trim();
    if (prevUnit !== nextUnit) {
      itemDetails.push(`單位：${prevUnit || '無'} → ${nextUnit || '無'}`);
    }

    const prevQty = Number(prevItem.quantity) || 0;
    const nextQty = Number(nextItem.quantity) || 0;
    if (prevQty !== nextQty) {
      itemDetails.push(`數量：${prevQty} → ${nextQty}`);
    }

    const prevPrice = Number(prevItem.unitPrice) || 0;
    const nextPrice = Number(nextItem.unitPrice) || 0;
    if (prevPrice !== nextPrice) {
      itemDetails.push(`單價：${formatCurrency(prevPrice)} → ${formatCurrency(nextPrice)}`);
    }

    if (prevQty !== nextQty || prevPrice !== nextPrice) {
      const prevSub = prevQty * prevPrice;
      const nextSub = nextQty * nextPrice;
      if (prevSub !== nextSub) {
        itemDetails.push(`項目金額：${formatCurrency(prevSub)} → ${formatCurrency(nextSub)}`);
      }
    }

    const prevRemark = (prevItem.remark || '').trim();
    const nextRemark = (nextItem.remark || '').trim();
    if (prevRemark !== nextRemark) {
      itemDetails.push(
        `備註：「${truncateText(prevRemark, 45) || '無'}」→「${truncateText(nextRemark, 45) || '無'}」`
      );
    }

    if (itemDetails.length > 0) {
      changes.push({
        scope,
        voTitle,
        category: `${categoryPrefix}${nextCat}`,
        itemName: nextName || prevName || '(未命名細項)',
        action: 'modified',
        details: itemDetails,
      });
    }
  }

  return changes;
};

export const buildQuotationEditLog = (
  prevQuote: Quotation | null,
  nextQuote: Quotation,
  editor: { username?: string; displayName?: string } | null,
  options?: { isNewFirstSave?: boolean }
): QuotationEditLog | null => {
  const now = Date.now();
  const editedBy = (editor?.displayName || editor?.username || 'System').trim();
  const editedByUsername = (editor?.username || '').trim();
  const changes: QuotationLogChangeEntry[] = [];

  const prev = prevQuote || ({
    id: nextQuote.id,
    customerName: '',
    phone: '',
    address: '',
    date: '',
    status: 'pending',
    version: 'v1.0',
    items: [],
    remarks: '',
    discount: 0,
    depositPercent: 35,
    progressPercent: 20,
    balancePercent: 15,
  } as Quotation);

  // 1. Original quotation categories & items
  const prevItems = Array.isArray(prev.items) ? prev.items : [];
  const nextItems = Array.isArray(nextQuote.items) ? nextQuote.items : [];
  changes.push(
    ...diffItemsCollection(
      prevItems,
      nextItems,
      prev.visibleCategories,
      nextQuote.visibleCategories,
      'original'
    )
  );

  // 2. Variation Orders (VO)
  const prevVos = normalizeVariationOrdersForDiff(prev);
  const nextVos = normalizeVariationOrdersForDiff(nextQuote);
  const prevVoMap = new Map<string, VariationOrder>();
  prevVos.forEach((v) => prevVoMap.set(v.id, v));
  const nextVoMap = new Map<string, VariationOrder>();
  nextVos.forEach((v) => nextVoMap.set(v.id, v));

  for (const nextVo of nextVos) {
    const prevVo = prevVoMap.get(nextVo.id);
    const voLabel = (nextVo.title || '後加工程').trim();
    if (!prevVo) {
      changes.push({
        scope: 'vo',
        voTitle: voLabel,
        category: `[後加: ${voLabel}] 後加工程單`,
        itemName: voLabel,
        action: 'added',
        details: [
          `新增後加工程報價單${nextVo.date ? `（日期：${nextVo.date}）` : ''}`,
          `包含 ${(nextVo.items || []).length} 個施工細項`,
        ],
      });
      if (Array.isArray(nextVo.items) && nextVo.items.length > 0) {
        changes.push(
          ...diffItemsCollection([], nextVo.items, [], nextVo.visibleCategories, 'vo', voLabel)
        );
      }
      continue;
    }

    // VO metadata changes
    const voMetaDetails: string[] = [];
    if ((prevVo.title || '').trim() !== (nextVo.title || '').trim()) {
      voMetaDetails.push(`標題：「${prevVo.title || ''}」→「${nextVo.title || ''}」`);
    }
    if ((prevVo.date || '') !== (nextVo.date || '')) {
      voMetaDetails.push(`日期：${prevVo.date || '無'} → ${nextVo.date || '無'}`);
    }
    if ((Number(prevVo.discount) || 0) !== (Number(nextVo.discount) || 0)) {
      voMetaDetails.push(
        `特別折讓：${formatCurrency(prevVo.discount)} → ${formatCurrency(nextVo.discount)}`
      );
    }
    if ((prevVo.remarks || '').trim() !== (nextVo.remarks || '').trim()) {
      voMetaDetails.push('後加附屬條款已修改');
    }
    if (JSON.stringify(prevVo.paymentStages || []) !== JSON.stringify(nextVo.paymentStages || [])) {
      voMetaDetails.push('後加收款期數 / 收款狀態已更新');
    }
    if (voMetaDetails.length > 0) {
      changes.push({
        scope: 'vo',
        voTitle: voLabel,
        category: `[後加: ${voLabel}] 基本及收款設定`,
        itemName: voLabel,
        action: 'modified',
        details: voMetaDetails,
      });
    }

    // VO items diff
    changes.push(
      ...diffItemsCollection(
        Array.isArray(prevVo.items) ? prevVo.items : [],
        Array.isArray(nextVo.items) ? nextVo.items : [],
        prevVo.visibleCategories,
        nextVo.visibleCategories,
        'vo',
        voLabel
      )
    );
  }

  for (const prevVo of prevVos) {
    if (!nextVoMap.has(prevVo.id)) {
      const voLabel = (prevVo.title || '後加工程').trim();
      changes.push({
        scope: 'vo',
        voTitle: voLabel,
        category: `[後加: ${voLabel}] 後加工程單`,
        itemName: voLabel,
        action: 'removed',
        details: [`刪除後加工程報價單（原包含 ${(prevVo.items || []).length} 個細項）`],
      });
    }
  }

  // 3. Basic Contract Info
  const basicFieldPairs: Array<{ label: string; prevVal: string; nextVal: string }> = [
    { label: '報價單編號', prevVal: (prev.id || '').trim(), nextVal: (nextQuote.id || '').trim() },
    { label: '公司內部號碼', prevVal: (prev.internalNumber || '').trim(), nextVal: (nextQuote.internalNumber || '').trim() },
    { label: '客戶姓名', prevVal: (prev.customerName || '').trim(), nextVal: (nextQuote.customerName || '').trim() },
    { label: '聯絡電話', prevVal: (prev.phone || '').trim(), nextVal: (nextQuote.phone || '').trim() },
    { label: '工程地址', prevVal: (prev.address || '').trim(), nextVal: (nextQuote.address || '').trim() },
    { label: '報價日期', prevVal: prev.date || '', nextVal: nextQuote.date || '' },
    { label: '合約狀態', prevVal: formatStatusLabel(prev.status), nextVal: formatStatusLabel(nextQuote.status) },
    { label: '負責跟進人員', prevVal: prev.assignedTo || '', nextVal: nextQuote.assignedTo || '' },
    { label: '負責設計師', prevVal: (prev.designer || '').trim(), nextVal: (nextQuote.designer || '').trim() },
    { label: '實用面積', prevVal: (prev.usableArea || '').trim(), nextVal: (nextQuote.usableArea || '').trim() },
    { label: '開工日期', prevVal: prev.startDate || '', nextVal: nextQuote.startDate || '' },
    { label: '預計完工日期', prevVal: prev.endDate || '', nextVal: nextQuote.endDate || '' },
  ];

  const basicDetails = basicFieldPairs
    .filter((f) => f.prevVal !== f.nextVal)
    .map((f) => `${f.label}：「${f.prevVal || '空'}」→「${f.nextVal || '空'}」`);

  if (basicDetails.length > 0) {
    changes.push({
      scope: 'meta',
      category: '基本資料',
      itemName: '合約基本資料欄位',
      action: 'modified',
      details: basicDetails,
    });
  }

  // 4. Financials & Payment Stages
  const financeDetails: string[] = [];
  if ((Number(prev.discount) || 0) !== (Number(nextQuote.discount) || 0)) {
    financeDetails.push(
      `特別扣減折讓：${formatCurrency(prev.discount)} → ${formatCurrency(nextQuote.discount)}`
    );
  }
  if (!!prev.enableDiscounts !== !!nextQuote.enableDiscounts || JSON.stringify(prev.discounts || []) !== JSON.stringify(nextQuote.discounts || [])) {
    financeDetails.push('多項明細折讓設定已更新');
  }
  if ((Number(prev.receivedDeposit) || 0) !== (Number(nextQuote.receivedDeposit) || 0)) {
    financeDetails.push(
      `已收訂金：${formatCurrency(prev.receivedDeposit)} → ${formatCurrency(nextQuote.receivedDeposit)}`
    );
  }

  const prevStages = Array.isArray(prev.paymentStages) ? prev.paymentStages : [];
  const nextStages = Array.isArray(nextQuote.paymentStages) ? nextQuote.paymentStages : [];
  if (JSON.stringify(prevStages) !== JSON.stringify(nextStages)) {
    const maxLen = Math.max(prevStages.length, nextStages.length);
    let stageDiffFound = false;
    for (let i = 0; i < maxLen; i++) {
      const ps = prevStages[i];
      const ns = nextStages[i];
      if (!ps && ns) {
        financeDetails.push(`新增收款期數「${ns.name || `第${i + 1}期`}」(${ns.percent || 0}%)`);
        stageDiffFound = true;
      } else if (ps && !ns) {
        financeDetails.push(`移除收款期數「${ps.name || `第${i + 1}期`}」`);
        stageDiffFound = true;
      } else if (ps && ns) {
        const subParts: string[] = [];
        if ((ps.name || '') !== (ns.name || '')) subParts.push(`名稱「${ps.name}」→「${ns.name}」`);
        if ((Number(ps.percent) || 0) !== (Number(ns.percent) || 0)) subParts.push(`比例 ${ps.percent}% → ${ns.percent}%`);
        if (!!ps.isPaid !== !!ns.isPaid) subParts.push(ns.isPaid ? '標記為已收款' : '取消已收款');
        if ((ps.paymentDate || '') !== (ns.paymentDate || '')) subParts.push(`收款日期 ${ps.paymentDate || '無'} → ${ns.paymentDate || '無'}`);
        if ((Number(ps.adjustmentAmount) || 0) !== (Number(ns.adjustmentAmount) || 0)) {
          subParts.push(`實收調整 ${formatCurrency(ps.adjustmentAmount)} → ${formatCurrency(ns.adjustmentAmount)}`);
        }
        if ((ps.remark || '') !== (ns.remark || '')) subParts.push('備註已修改');
        if (subParts.length > 0) {
          financeDetails.push(`期數「${ns.name || `第${i + 1}期`}」：${subParts.join('、')}`);
          stageDiffFound = true;
        }
      }
    }
    if (!stageDiffFound) {
      financeDetails.push('收款期數資料已調整');
    }
  }

  if (financeDetails.length > 0) {
    changes.push({
      scope: 'meta',
      category: '收款及折讓',
      itemName: '收款期數 / 折讓金額',
      action: 'modified',
      details: financeDetails,
    });
  }

  // 5. Terms, Schedule & Internal Memo / Checklist
  const otherDetails: string[] = [];
  if ((prev.termsTemplateVersion || '') !== (nextQuote.termsTemplateVersion || '')) {
    otherDetails.push(`條款範本版本：${prev.termsTemplateVersion || '預設'} → ${nextQuote.termsTemplateVersion || '預設'}`);
  }
  if ((prev.remarks || '').trim() !== (nextQuote.remarks || '').trim()) {
    otherDetails.push('合約特別條款內容已修改');
  }
  if ((prev.draftRemarks || '').trim() !== (nextQuote.draftRemarks || '').trim()) {
    otherDetails.push(
      `內部備忘：「${truncateText(prev.draftRemarks, 40) || '無'}」→「${truncateText(nextQuote.draftRemarks, 40) || '無'}」`
    );
  }
  if ((prev.meetingRecords || '').trim() !== (nextQuote.meetingRecords || '').trim()) {
    otherDetails.push('會議紀錄已更新');
  }
  if (
    !!prev.scheduleEnabled !== !!nextQuote.scheduleEnabled ||
    (prev.scheduleStartDate || '') !== (nextQuote.scheduleStartDate || '') ||
    JSON.stringify(prev.scheduleSteps || []) !== JSON.stringify(nextQuote.scheduleSteps || [])
  ) {
    otherDetails.push('施工時間表 / 排期步驟已更新');
  }
  if (JSON.stringify(prev.checklist || []) !== JSON.stringify(nextQuote.checklist || [])) {
    const prevChk = prev.checklist || [];
    const nextChk = nextQuote.checklist || [];
    otherDetails.push(
      `內部待辦事項更新（共 ${nextChk.length} 項，已完成 ${nextChk.filter((c) => c.completed).length} 項；原 ${prevChk.length} 項）`
    );
  }

  if (otherDetails.length > 0) {
    changes.push({
      scope: 'meta',
      category: '條款及內部備忘',
      itemName: '合約條款 / 時程 / 內部備忘',
      action: 'modified',
      details: otherDetails,
    });
  }

  if (changes.length === 0) {
    if (options?.isNewFirstSave) {
      changes.push({
        scope: 'meta',
        category: '基本資料',
        itemName: '建立新報價單',
        action: 'added',
        details: [
          `單號：${nextQuote.id}，客戶：${nextQuote.customerName}`,
          `初始項目數：${nextItems.length} 項`,
        ],
      });
    } else {
      return null;
    }
  }

  // Build concise human summary
  const addedCount = changes.filter((c) => c.action === 'added' || c.action === 'category_added').length;
  const modifiedCount = changes.filter((c) => c.action === 'modified' || c.action === 'category_renamed').length;
  const removedCount = changes.filter((c) => c.action === 'removed' || c.action === 'category_removed').length;
  const uniqueCats = Array.from(new Set(changes.map((c) => c.category)));

  const actionParts: string[] = [];
  if (addedCount > 0) actionParts.push(`新增 ${addedCount} 項`);
  if (modifiedCount > 0) actionParts.push(`修改 ${modifiedCount} 項`);
  if (removedCount > 0) actionParts.push(`刪除 ${removedCount} 項`);

  const summary = `涉及 ${uniqueCats.length} 個大類（${actionParts.join('、')}）`;

  return {
    id: `log-${now}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: now,
    dateStr: formatLogDateTime(now),
    editedBy,
    editedByUsername: editedByUsername || undefined,
    summary,
    changes,
  };
};
