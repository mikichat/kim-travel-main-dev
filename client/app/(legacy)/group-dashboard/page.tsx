// 단체 관리 대시보드 — Legacy group_dashboard.html 마이그레이션

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface Group {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  pax: number;
  price_per_pax: number;
  deposit: number;
  total_price: number;
  balance: number;
  status: string;
  airline: string;
  hotel_name: string;
  hotel_checkin: string;
  hotel_checkout: string;
}

const STATUS_LABELS: Record<string, string> = {
  estimate: '견적',
  contract: '계약',
  confirmed: '확정',
};

export default function GroupDashboardPage() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get('id');
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    fetch(`/tables/groups/${id}`)
      .then(r => r.json())
      .then(data => { if (data && data.id) setGroup(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const res = await fetch(`/tables/groups/${id}`, { method: 'DELETE' });
    if (res.ok) { alert('삭제되었습니다.'); router.push('/group-list'); }
    else alert('삭제 실패');
  };

  const handleChangeStatus = async () => {
    if (!group) return;
    const next = group.status === 'estimate' ? 'contract' : group.status === 'contract' ? 'confirmed' : 'estimate';
    const res = await fetch(`/tables/groups/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...group, status: next }),
    });
    if (res.ok) setGroup({ ...group, status: next });
    else alert('상태 변경 실패');
  };

  if (loading) return <LoadingSpinner />;
  if (!group) return (
    <div className="min-h-screen flex items-center justify-center text-gray-500">
      단체 정보를 찾을 수 없습니다.
    </div>
  );

  const nights = group.start_date && group.end_date
    ? Math.ceil((new Date(group.end_date).getTime() - new Date(group.start_date).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const TABS = [
    { id: 'info', label: '기본 정보' },
    { id: 'itinerary', label: '일정 관리' },
    { id: 'cancel-rules', label: '취소 규정' },
    { id: 'includes', label: '포함/불포함' },
    { id: 'documents', label: '문서 출력' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
            <div className="text-sm text-gray-500 mt-1">홈 &gt; 단체 관리 &gt; {group.name}</div>
          </div>
          <div className={`px-3 py-1 rounded text-sm font-semibold ${group.status === 'confirmed' ? 'bg-green-100 text-green-800' : group.status === 'contract' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {STATUS_LABELS[group.status] || group.status}
          </div>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: '총액', value: `${group.total_price.toLocaleString()}원`, color: 'from-purple-600 to-purple-800' },
            { label: '잔액', value: `${group.balance.toLocaleString()}원`, color: 'from-red-500 to-red-700' },
            { label: '인원', value: `${group.pax}명`, color: 'from-blue-600 to-blue-800' },
            { label: '기간', value: `${nights}박${nights + 1}일`, color: 'from-emerald-600 to-emerald-800' },
          ].map((c, i) => (
            <div key={i} className={`bg-gradient-to-br ${c.color} text-white rounded-lg p-4 shadow`}>
              <div className="text-xs opacity-80 mb-1">{c.label}</div>
              <div className="text-xl font-bold">{c.value}</div>
            </div>
          ))}
        </div>

        {/* 탭 */}
        <div className="flex gap-1 border-b-2 border-blue-500 mb-4">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 text-sm font-medium rounded-t-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 탭 컨텐츠 */}
        <div className="bg-white rounded-lg shadow">
          {activeTab === 'info' && (
            <div className="p-5">
              <div className="flex gap-2 mb-4">
                <button onClick={() => router.push(`/group-form?id=${id}`)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">✏️ 기본 정보 수정</button>
                <button onClick={handleChangeStatus} className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm">🔄 상태 변경</button>
                <button onClick={handleDelete} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm">🗑️ 단체 삭제</button>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {[
                    ['단체명', group.name],
                    ['출발일', group.start_date],
                    ['도착일', group.end_date],
                    ['인원', `${group.pax}명`],
                    ['1인당 요금', `${group.price_per_pax.toLocaleString()}원`],
                    ['총액', `${group.total_price.toLocaleString()}원`],
                    ['계약금', `${group.deposit.toLocaleString()}원`],
                    ['잔액', `${group.balance.toLocaleString()}원`],
                    ['항공사', group.airline || '-'],
                    ['호텔', group.hotel_name || '-'],
                    ['체크인', group.hotel_checkin || '-'],
                    ['체크아웃', group.hotel_checkout || '-'],
                  ].map(([label, value]) => (
                    <tr key={label} className="border-b border-gray-100">
                      <td className="py-2 font-medium text-gray-600 w-32">{label}</td>
                      <td className="py-2 text-gray-900">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'itinerary' && (
            <div className="p-5">
              <div className="mb-4">
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">+ 일정 추가</button>
              </div>
              <div className="py-8 text-center text-gray-400">일정 데이터가 없습니다.</div>
            </div>
          )}

          {activeTab === 'cancel-rules' && (
            <div className="p-5">
              <div className="mb-4">
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">+ 취소 규정 추가</button>
              </div>
              <div className="py-8 text-center text-gray-400">취소 규정 데이터가 없습니다.</div>
            </div>
          )}

          {activeTab === 'includes' && (
            <div className="p-5">
              <div className="flex gap-2 mb-4">
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">+ 포함 항목 추가</button>
                <button className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm">+ 불포함 항목 추가</button>
              </div>
              <div className="py-8 text-center text-gray-400">포함/불포함 데이터가 없습니다.</div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { icon: '📄', title: '견적서', desc: '기본 정보, 요금, 포함/불포함 사항' },
                  { icon: '📝', title: '계약서', desc: '계약 조건, 취소 규정, 서명란' },
                  { icon: '📅', title: '일정표', desc: '일자별 상세 일정, 교통, 숙박' },
                  { icon: '📦', title: '통합 문서', desc: '견적서 + 계약서 + 일정표' },
                ].map((doc, i) => (
                  <div key={i} className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <div className="text-4xl mb-3">{doc.icon}</div>
                    <h3 className="font-semibold mb-2">{doc.title}</h3>
                    <p className="text-xs text-gray-500 mb-3">{doc.desc}</p>
                    <button className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 mr-2">HTML 미리보기</button>
                    <button className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded">PDF 생성 (미지원)</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 돌아가기 */}
        <div className="mt-6 pt-4 border-t">
          <button onClick={() => router.push('/group-list')} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">← 단체 목록으로 돌아가기</button>
        </div>
      </div>
    </div>
  );
}