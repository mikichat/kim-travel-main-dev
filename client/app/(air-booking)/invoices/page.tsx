// 인보이스 관리 — Legacy migration from air-booking

'use client';

import { useState, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface InvoiceListItem {
  id: string;
  invoice_number: string;
  recipient: string;
  invoice_date: string;
  description: string | null;
  total_amount: number;
  calculation_mode: string | null;
  created_at: string;
}

function formatNum(n: number | null | undefined): string {
  if (n == null) return '-';
  return n.toLocaleString('ko-KR');
}

export default function InvoicesPage() {
  const [items, setItems] = useState<InvoiceListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = (msg: string, type: string = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchItems = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/invoices?${params}`);
      const data = await res.json();
      if (data.success) { setItems(data.data.invoices); setTotal(data.data.total); }
    } catch { showToast('인보이스 목록을 불러올 수 없습니다.', 'error'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('이 인보이스를 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { showToast('삭제되었습니다.'); fetchItems(); }
      else showToast(data.error || '삭제에 실패했습니다.', 'error');
    } catch { showToast('삭제에 실패했습니다.', 'error'); }
  };

  const formatDate = (d: string | null) => d ? d.slice(0, 10) : '-';

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg text-sm font-medium z-50 ${
          toast.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>{toast.msg}</div>
      )}
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">인보이스 관리</h1>
          <span className="text-sm text-gray-500">인보이스 생성은 예약장부에서</span>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="수신인, 인보이스 번호, 설명 검색..." className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          {items.length === 0 ? (
            <div className="p-8 text-center text-gray-400">인보이스 데이터가 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left font-medium text-gray-600">인보이스 번호</th>
                    <th className="p-3 text-left font-medium text-gray-600">수신인</th>
                    <th className="p-3 text-left font-medium text-gray-600">발행일</th>
                    <th className="p-3 text-left font-medium text-gray-600">설명</th>
                    <th className="p-3 text-left font-medium text-gray-600">모드</th>
                    <th className="p-3 text-left font-medium text-gray-600">총액</th>
                    <th className="p-3 text-left font-medium text-gray-600">등록일</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="p-3 font-mono text-xs font-semibold">{item.invoice_number}</td>
                      <td className="p-3">{item.recipient}</td>
                      <td className="p-3">{formatDate(item.invoice_date)}</td>
                      <td className="p-3 text-xs max-w-xs truncate text-gray-500">{item.description || '-'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.calculation_mode === 'advanced' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                          {item.calculation_mode === 'advanced' ? '상세' : '간편'}
                        </span>
                      </td>
                      <td className="p-3 font-semibold">{formatNum(item.total_amount)}원</td>
                      <td className="p-3 text-xs text-gray-400">{formatDate(item.created_at)}</td>
                      <td className="p-3 flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); window.open(`/api/invoices/${item.id}/pdf`, '_blank'); }} className="px-3 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700">PDF</button>
                        <button onClick={(e) => handleDelete(item.id, e)} className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600">삭제</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="p-3 border-t text-sm text-gray-500">총 {total}건</div>
        </div>
      </div>
    </div>
  );
}
