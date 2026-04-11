// 상품/단체 생성 및 수정 — Legacy group_form.html 마이그레이션

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
  nights: number;
  days: number;
  total_price: number;
  balance: number;
  balance_due_date: string;
  airline: string;
  outbound_flight: string;
  return_flight: string;
  flight_note: string;
  hotel_name: string;
  hotel_checkin: string;
  hotel_checkout: string;
  hotel_room_type: string;
  hotel_rooms: number;
  hotel_note: string;
  vehicle_type: string;
  vehicle_count: number;
  vehicle_company: string;
  vehicle_note: string;
  guide_name: string;
  guide_phone: string;
  guide_language: string;
  guide_note: string;
  status: string;
}

const EMPTY: Group = {
  id: 0,
  name: '',
  start_date: '',
  end_date: '',
  pax: 0,
  price_per_pax: 0,
  deposit: 0,
  nights: 0,
  days: 0,
  total_price: 0,
  balance: 0,
  balance_due_date: '',
  airline: '',
  outbound_flight: '',
  return_flight: '',
  flight_note: '',
  hotel_name: '',
  hotel_checkin: '',
  hotel_checkout: '',
  hotel_room_type: '',
  hotel_rooms: 0,
  hotel_note: '',
  vehicle_type: '',
  vehicle_count: 0,
  vehicle_company: '',
  vehicle_note: '',
  guide_name: '',
  guide_phone: '',
  guide_language: '',
  guide_note: '',
  status: 'estimate',
};

const STATUS_LABELS: Record<string, string> = {
  estimate: '견적',
  contract: '계약',
  confirmed: '확정',
};

export default function GroupFormPage() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get('id');
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Group>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Group, string>>>({});

  useEffect(() => {
    if (!id) return;
    fetch(`/tables/groups/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data && data.id) {
          setForm({ ...EMPTY, ...data, id: data.id });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const update = (field: keyof Group, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const calcDays = () => {
    if (!form.start_date || !form.end_date) return;
    const s = new Date(form.start_date);
    const e = new Date(form.end_date);
    const nights = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
    const total = form.pax * form.price_per_pax;
    const balance = total - form.deposit;
    const d = new Date(s);
    d.setDate(d.getDate() - 7);
    setForm(prev => ({
      ...prev,
      nights,
      days: nights + 1,
      total_price: total,
      balance,
      balance_due_date: d.toISOString().slice(0, 10),
    }));
  };

  useEffect(() => {
    if (form.pax && form.price_per_pax) calcDays();
  }, [form.pax, form.price_per_pax, form.start_date, form.end_date, form.deposit]);

  const validate = () => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = '단체명을 입력해주세요.';
    if (!form.start_date) e.start_date = '출발일을 입력해주세요.';
    if (!form.end_date) e.end_date = '도착일을 입력해주세요.';
    if (!form.pax || form.pax < 1) e.pax = '인원수를 입력해주세요.';
    if (!form.price_per_pax && form.price_per_pax !== 0) e.price_per_pax = '1인당 요금을 입력해주세요.';
    if (!form.deposit && form.deposit !== 0) e.deposit = '계약금을 입력해주세요.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const url = id ? `/tables/groups/${id}` : '/tables/groups';
      const method = id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        alert(id ? '수정 완료!' : '등록 완료!');
        router.push('/group-list');
      } else {
        alert('저장 실패');
      }
    } catch { alert('저장 중 오류'); }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{id ? '상품 수정' : '상품 생성'}</h1>
            <div className="text-sm text-gray-500 mt-1">홈 &gt; 상품 관리 &gt; {id ? '수정' : '생성'}</div>
          </div>
          <div className="text-right text-xs text-gray-500">
            <div><strong>상태:</strong> <span className={`px-2 py-0.5 rounded text-xs font-semibold ${form.status === 'confirmed' ? 'bg-green-100 text-green-800' : form.status === 'contract' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>{STATUS_LABELS[form.status] || form.status}</span></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold text-blue-600 mb-4 pb-2 border-b">📋 기본 정보</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">단체명 *</label>
                <input type="text" value={form.name} onChange={e => update('name', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                <select value={form.status} onChange={e => update('status', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option value="estimate">견적</option>
                  <option value="contract">계약</option>
                  <option value="confirmed">확정</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">출발일 *</label>
                <input type="date" value={form.start_date} onChange={e => update('start_date', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                {errors.start_date && <p className="text-red-500 text-xs mt-1">{errors.start_date}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">도착일 *</label>
                <input type="date" value={form.end_date} onChange={e => update('end_date', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                {errors.end_date && <p className="text-red-500 text-xs mt-1">{errors.end_date}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">인원수 *</label>
                <input type="number" value={form.pax} onChange={e => update('pax', Number(e.target.value))} min="1" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                {errors.pax && <p className="text-red-500 text-xs mt-1">{errors.pax}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">1인당 요금 *</label>
                <input type="number" value={form.price_per_pax} onChange={e => update('price_per_pax', Number(e.target.value))} min="0" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                {errors.price_per_pax && <p className="text-red-500 text-xs mt-1">{errors.price_per_pax}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">계약금 *</label>
                <input type="number" value={form.deposit} onChange={e => update('deposit', Number(e.target.value))} min="0" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                {errors.deposit && <p className="text-red-500 text-xs mt-1">{errors.deposit}</p>}
              </div>
            </div>
          </div>

          {/* 항공편 정보 */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold text-blue-600 mb-4 pb-2 border-b">✈️ 항공편 정보</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">항공사</label>
                <input type="text" value={form.airline} onChange={e => update('airline', e.target.value)} placeholder="예: 대한항공" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">출발편</label>
                <input type="text" value={form.outbound_flight} onChange={e => update('outbound_flight', e.target.value)} placeholder="예: KE123 인천 09:00 → 방콕 13:00" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">귀국편</label>
                <input type="text" value={form.return_flight} onChange={e => update('return_flight', e.target.value)} placeholder="예: KE124 방콕 14:30 → 인천 21:30" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">항공 비고</label>
                <textarea value={form.flight_note} onChange={e => update('flight_note', e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
            </div>
          </div>

          {/* 자동 계산 */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold text-blue-600 mb-4 pb-2 border-b">🧮 자동 계산 결과</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">박수</label>
                <input type="number" value={form.nights} readOnly className="w-full px-3 py-2 border border-blue-300 bg-blue-50 rounded-md" />
                <small className="text-blue-600 text-xs">자동 계산됨</small>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">일수</label>
                <input type="number" value={form.days} readOnly className="w-full px-3 py-2 border border-blue-300 bg-blue-50 rounded-md" />
                <small className="text-blue-600 text-xs">자동 계산됨</small>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">총액</label>
                <input type="number" value={form.total_price} readOnly className="w-full px-3 py-2 border border-blue-300 bg-blue-50 rounded-md" />
                <small className="text-blue-600 text-xs">인원 × 1인당 요금</small>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">잔액</label>
                <input type="number" value={form.balance} readOnly className="w-full px-3 py-2 border border-blue-300 bg-blue-50 rounded-md" />
                <small className="text-blue-600 text-xs">총액 - 계약금</small>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">잔액 완납일</label>
                <input type="date" value={form.balance_due_date} readOnly className="w-full px-3 py-2 border border-blue-300 bg-blue-50 rounded-md" />
                <small className="text-blue-600 text-xs">출발일 - 7일</small>
              </div>
            </div>
          </div>

          {/* 호텔 정보 */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold text-blue-600 mb-4 pb-2 border-b">🏨 호텔 정보</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">호텔명</label>
                <input type="text" value={form.hotel_name} onChange={e => update('hotel_name', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">체크인</label>
                <input type="date" value={form.hotel_checkin} onChange={e => update('hotel_checkin', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">체크아웃</label>
                <input type="date" value={form.hotel_checkout} onChange={e => update('hotel_checkout', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">객실 타입</label>
                <input type="text" value={form.hotel_room_type} onChange={e => update('hotel_room_type', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">객실 수</label>
                <input type="number" value={form.hotel_rooms} onChange={e => update('hotel_rooms', Number(e.target.value))} min="0" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">호텔 비고</label>
                <textarea value={form.hotel_note} onChange={e => update('hotel_note', e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
            </div>
          </div>

          {/* 차량 정보 */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold text-blue-600 mb-4 pb-2 border-b">🚌 차량 정보</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">차량 종류</label>
                <input type="text" value={form.vehicle_type} onChange={e => update('vehicle_type', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">차량 대수</label>
                <input type="number" value={form.vehicle_count} onChange={e => update('vehicle_count', Number(e.target.value))} min="0" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">차량 업체</label>
                <input type="text" value={form.vehicle_company} onChange={e => update('vehicle_company', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">차량 비고</label>
                <textarea value={form.vehicle_note} onChange={e => update('vehicle_note', e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
            </div>
          </div>

          {/* 가이드 정보 */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold text-blue-600 mb-4 pb-2 border-b">👤 가이드 정보</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">가이드명</label>
                <input type="text" value={form.guide_name} onChange={e => update('guide_name', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
                <input type="tel" value={form.guide_phone} onChange={e => update('guide_phone', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">가이드 언어</label>
                <input type="text" value={form.guide_language} onChange={e => update('guide_language', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">가이드 비고</label>
                <textarea value={form.guide_note} onChange={e => update('guide_note', e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
            </div>
          </div>

          {/* 제출 */}
          <div className="flex gap-3 pt-4 border-t">
            <button type="submit" disabled={saving} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">
              {saving ? '저장 중...' : '💾 저장'}
            </button>
            <button type="button" onClick={() => router.push('/group-list')} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}