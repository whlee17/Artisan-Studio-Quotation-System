import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

pos_start = text.find('if (!isVO) {')
pos_end = text.find('updatedQuote = {\n        ...migrated,', pos_start)

if pos_start != -1 and pos_end != -1:
    new_segment = """if (!isVO) {
      const currentStages = getPaymentStages(quote);
      const nextUnpaidIdx = currentStages.findIndex((st, i) => i > stageIndex && !st.isPaid);

      const updatedStages = currentStages.map((s, idx) => {
        if (idx === stageIndex) {
          let newRemark = s.remark || '';
          newRemark = newRemark.replace(/\\s*\\(付款日期:\\s*\\d{4}-\\d{2}-\\d{2}\\)/g, '');
          newRemark = newRemark.replace(/\\s*\\(實收\\s*HK\\$[\\d,.]+,.*?\\)/g, '');
          newRemark = newRemark.trim() + currentStageDetail;
          return { ...s, isPaid: true, remark: newRemark, lockedAmount: receivedAmt };
        }
        if (idx === nextUnpaidIdx && nextUnpaidIdx !== -1) {
          const nextAdj = (s.adjustmentAmount || 0) - diff;
          let nextRemark = s.remark || '';
          nextRemark = nextRemark.replace(/\\s*\\(上期調整:.*?\\)/g, '');
          if (diff !== 0) {
            const adjDetail = diff > 0 
              ? ` (上期調整: 扣除溢收 HK$${diff.toLocaleString('en-US')})`
              : ` (上期調整: 加回欠收 HK$${Math.abs(diff).toLocaleString('en-US')})`;
            nextRemark = nextRemark.trim() + adjDetail;
          } else {
            nextRemark = nextRemark.trim();
          }
          return { ...s, adjustmentAmount: nextAdj, remark: nextRemark };
        }
        return s;
      });

      updatedQuote = {
        ...quote,
        paymentStages: updatedStages,
        draftRemarks: (quote.draftRemarks || '').trim() + newLogEntry,
        updatedAt: Date.now()
      };
    } else {
      // VO logic
      const migrated = migrateQuotation(quote);
      const updatedVos = (migrated.variationOrders || []).map(vo => {
        if (vo.id === voId) {
          const voStages = vo.paymentStages || [];
          const nextVoUnpaidIdx = voStages.findIndex((st, i) => i > (voStageIdx as number) && !st.isPaid);

          const updatedStages = voStages.map((s, idx) => {
            if (idx === voStageIdx) {
              let newRemark = s.remark || '';
              newRemark = newRemark.replace(/\\s*\\(付款日期:\\s*\\d{4}-\\d{2}-\\d{2}\\)/g, '');
              newRemark = newRemark.replace(/\\s*\\(實收\\s*HK\\$[\\d,.]+,.*?\\)/g, '');
              newRemark = newRemark.trim() + currentStageDetail;
              return { ...s, isPaid: true, remark: newRemark, lockedAmount: receivedAmt };
            }
            if (idx === nextVoUnpaidIdx && nextVoUnpaidIdx !== -1) {
              const nextAdj = (s.adjustmentAmount || 0) - diff;
              let nextRemark = s.remark || '';
              nextRemark = nextRemark.replace(/\\s*\\(上期調整:.*?\\)/g, '');
              if (diff !== 0) {
                const adjDetail = diff > 0 
                  ? ` (上期調整: 扣除溢收 HK$${diff.toLocaleString('en-US')})`
                  : ` (上期調整: 加回欠收 HK$${Math.abs(diff).toLocaleString('en-US')})`;
                nextRemark = nextRemark.trim() + adjDetail;
              } else {
                nextRemark = nextRemark.trim();
              }
              return { ...s, adjustmentAmount: nextAdj, remark: nextRemark };
            }
            return s;
          });
          return { ...vo, paymentStages: updatedStages };
        }
        return vo;
      });

      const legacyVoIndex = updatedVos.findIndex(v => v.id === 'vo-1');
      const legacyVo = legacyVoIndex >= 0 ? updatedVos[legacyVoIndex] : null;
"""
    text = text[:pos_start] + new_segment + text[pos_end:]
    with open('src/App.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Successfully updated handleConfirmStageReceivedAmount!")
