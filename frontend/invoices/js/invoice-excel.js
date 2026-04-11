const { showToast } = window;
import { collectFormData, API_BASE_URL } from './invoice-editor.js';

/**
 * Invoice Excel Export
 * SheetJS를 사용한 Excel 내보내기 기능
 */

// Excel 내보내기 (Advanced Mode)
async function exportToExcel(invoiceId) {
  try {
    // 인보이스 데이터 가져오기
    let invoiceData;

    if (invoiceId) {
      const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}`);
      invoiceData = await response.json();
    } else {
      // 현재 폼 데이터 사용
      invoiceData = collectFormData();
    }

    // SheetJS 라이브러리 확인
    if (typeof XLSX === 'undefined') {
      showToast(
        'Excel 내보내기 기능을 사용하려면 SheetJS 라이브러리가 필요합니다.',
        'error'
      );
      return;
    }

    // 워크북 생성
    const wb = XLSX.utils.book_new();

    if (invoiceData.calculation_mode === 'advanced') {
      const adv = invoiceData.advanced_calculation || invoiceData;
      const items = adv.additional_items || {};
      const groups = items.groups || [];
      const extras = items.extras || [];
      const isNewFormat = !Array.isArray(adv.additional_items) && groups.length > 0;

      // 기본 정보 시트
      const basicData = [
        ['인보이스 정보'],
        ['수신', invoiceData.recipient],
        ['일자', invoiceData.invoice_date],
        ['내역', invoiceData.description],
        ['계산 모드', 'Advanced Mode (고급 계산)'],
      ];

      if (isNewFormat) {
        // 그룹별 여행경비
        basicData.push([], ['인원 그룹별 여행경비']);
        basicData.push(['그룹명', '인원', '1인 여행경비', '소계', '1인 계약금', '계약금 소계']);

        let airfareTotal = 0;
        let depositTotal = 0;

        groups.forEach((g) => {
          const sub = (g.unitPrice || 0) * (g.count || 0);
          const depSub = (g.deposit || 0) * (g.count || 0);
          airfareTotal += sub;
          depositTotal += depSub;
          basicData.push([g.name || '', g.count || 0, g.unitPrice || 0, sub, g.deposit || 0, depSub]);
        });
        basicData.push(['합계', '', '', airfareTotal, '', depositTotal]);

        // 추가 항목
        if (extras.length > 0) {
          basicData.push([], ['추가 항목']);
          basicData.push(['항목명', '단가', '인원', '소계', '구분']);
          let extrasTotal = 0;
          extras.forEach((ex) => {
            const sub = (ex.unitPrice || 0) * (ex.count || 0);
            extrasTotal += ex.type === 'subtract' ? -sub : sub;
            basicData.push([ex.name, ex.unitPrice || 0, ex.count || 0, sub, ex.type === 'add' ? '청구(+)' : '차감(-)']);
          });
          basicData.push(['추가 항목 합계', '', '', extrasTotal]);
        }

        // 요약
        const extrasTotal = extras.reduce((s, ex) => {
          const sub = (ex.unitPrice || 0) * (ex.count || 0);
          return ex.type === 'subtract' ? s - sub : s + sub;
        }, 0);
        const totalCharge = airfareTotal + extrasTotal;
        const balance = totalCharge - depositTotal;

        basicData.push([], ['청구 요약']);
        basicData.push(['여행경비 소계', airfareTotal]);
        basicData.push(['추가 항목 소계', extrasTotal]);
        basicData.push(['총 청구액', totalCharge]);
        basicData.push(['총 계약금', depositTotal]);
        basicData.push(['잔금', balance]);
        if (adv.deposit_description) {
          basicData.push(['비고', adv.deposit_description]);
        }
      } else {
        // 구 형식 호환
        basicData.push([], ['여행 경비 계산']);
        basicData.push(['1인당 요금', adv.base_price_per_person || 0]);
        basicData.push(['총 인원', adv.total_participants || 0]);
        basicData.push(['총 여행경비', adv.total_travel_cost || 0]);
        basicData.push([], ['계약금']);
        basicData.push(['계약금 금액', adv.deposit_amount || 0]);
        basicData.push(['계약금 설명', adv.deposit_description || '']);
        basicData.push([], ['잔금', adv.balance_due || 0]);
      }

      const ws1 = XLSX.utils.aoa_to_sheet(basicData);
      XLSX.utils.book_append_sheet(wb, ws1, '인보이스');
    } else {
      // Simple Mode 데이터
      const simpleData = [
        ['인보이스 정보'],
        ['수신', invoiceData.recipient],
        ['일자', invoiceData.invoice_date],
        ['내역', invoiceData.description],
        ['계산 모드', 'Simple Mode (간편 계산)'],
        [],
        ['항목 목록'],
        ['항목명', '단가', '수량', '합계'],
      ];

      if (invoiceData.items && invoiceData.items.length > 0) {
        invoiceData.items.forEach((item) => {
          simpleData.push([
            item.name,
            item.unit_price,
            item.quantity,
            item.total,
          ]);
        });

        const total = invoiceData.items.reduce(
          (sum, item) => sum + item.total,
          0
        );
        simpleData.push([]);
        simpleData.push(['총액', '', '', total]);
      }

      const ws = XLSX.utils.aoa_to_sheet(simpleData);
      XLSX.utils.book_append_sheet(wb, ws, '인보이스');
    }

    // 파일 다운로드
    const fileName = `Invoice_${invoiceData.recipient || 'Unknown'}_${invoiceData.invoice_date || 'NoDate'}.xlsx`;
    XLSX.writeFile(wb, fileName);
  } catch (error) {
    console.error('Excel 내보내기 오류:', error);
    showToast('Excel 내보내기 실패: ' + error.message, 'error');
  }
}

// 간단한 버전 (SheetJS 없이 CSV로 내보내기)
function exportToCSV() {
  try {
    const formData = collectFormData();

    let csv = '';

    csv += '인보이스 정보\n';
    csv += `수신,${formData.recipient}\n`;
    csv += `일자,${formData.invoice_date}\n`;
    csv += `내역,${formData.description}\n`;
    csv += `계산 모드,${formData.calculation_mode === 'advanced' ? 'Advanced Mode' : 'Simple Mode'}\n`;
    csv += '\n';

    if (formData.calculation_mode === 'advanced') {
      const adv = formData.advanced_calculation;
      const items = adv.additional_items || {};
      const groups = items.groups || [];
      const extras = items.extras || [];
      const isNewFormat = !Array.isArray(adv.additional_items) && groups.length > 0;

      if (isNewFormat) {
        csv += '인원 그룹별 여행경비\n';
        csv += '그룹명,인원,1인 여행경비,소계,1인 계약금,계약금 소계\n';
        let airfareTotal = 0;
        let depositTotal = 0;
        groups.forEach((g) => {
          const sub = (g.unitPrice || 0) * (g.count || 0);
          const depSub = (g.deposit || 0) * (g.count || 0);
          airfareTotal += sub;
          depositTotal += depSub;
          csv += `${g.name || ''},${g.count || 0},${g.unitPrice || 0},${sub},${g.deposit || 0},${depSub}\n`;
        });
        csv += '\n';

        if (extras.length > 0) {
          csv += '추가 항목\n';
          csv += '항목명,단가,인원,소계,구분\n';
          extras.forEach((ex) => {
            const sub = (ex.unitPrice || 0) * (ex.count || 0);
            csv += `${ex.name},${ex.unitPrice || 0},${ex.count || 0},${sub},${ex.type === 'add' ? '청구' : '차감'}\n`;
          });
          csv += '\n';
        }

        const extrasTotal = extras.reduce((s, ex) => {
          const sub = (ex.unitPrice || 0) * (ex.count || 0);
          return ex.type === 'subtract' ? s - sub : s + sub;
        }, 0);

        csv += '청구 요약\n';
        csv += `여행경비 소계,${airfareTotal}\n`;
        csv += `추가 항목 소계,${extrasTotal}\n`;
        csv += `총 청구액,${airfareTotal + extrasTotal}\n`;
        csv += `총 계약금,${depositTotal}\n`;
        csv += `잔금,${airfareTotal + extrasTotal - depositTotal}\n`;
        if (adv.deposit_description) csv += `비고,${adv.deposit_description}\n`;
      } else {
        csv += '여행 경비 계산\n';
        csv += `1인당 요금,${adv.base_price_per_person}\n`;
        csv += `총 인원,${adv.total_participants}\n`;
        csv += `총 여행경비,${adv.total_travel_cost}\n`;
        csv += `계약금,${adv.deposit_amount}\n`;
        csv += `잔금,${adv.balance_due}\n`;
      }
    } else {
      csv += '항목 목록\n';
      csv += '항목명,단가,수량,합계\n';

      formData.items.forEach((item) => {
        csv += `${item.name},${item.unit_price},${item.quantity},${item.total}\n`;
      });

      const total = formData.items.reduce((sum, item) => sum + item.total, 0);
      csv += `\n총액,,,${total}\n`;
    }

    // BOM 추가 (UTF-8 인코딩을 위해)
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice_${formData.recipient}_${formData.invoice_date}.csv`;
    link.click();
  } catch (error) {
    console.error('CSV 내보내기 오류:', error);
    showToast('CSV 내보내기 실패: ' + error.message, 'error');
  }
}

// onclick 핸들러용 window 노출
window.exportToCSV = exportToCSV;
window.exportToExcel = exportToExcel;

export { exportToExcel, exportToCSV };
