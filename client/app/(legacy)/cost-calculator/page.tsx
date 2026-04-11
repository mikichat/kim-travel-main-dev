// 원가 계산서 — Legacy migration from frontend

'use client';

import { useState, useEffect } from 'react';

interface EtcCostItem {
  name: string;
  type: 'per_person' | 'total';
  amount: number;
}

interface FlightFareItem {
  name: string;
  price: number;
  pax: number;
}

interface CostSummary {
  domesticPerPerson: number;
  flightPerPerson: number;
  landPerPerson: number;
  etcPerPerson: number;
  netTotal: number;
  marginAmount: number;
  perPerson: number;
  sellTotal: number;
  breakEvenPoint: string;
  minParticipants: number;
  marginRate: number;
  notes: string;
}

export default function CostCalculatorPage() {
  // Basic Info
  const [destination, setDestination] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [nights, setNights] = useState(3);
  const [days, setDays] = useState(4);
  const [adults, setAdults] = useState(10);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [tc, setTc] = useState(0);

  // Save Info
  const [costCode, setCostCode] = useState('');
  const [costName, setCostName] = useState('');

  // Domestic
  const [vehicleType, setVehicleType] = useState('대형 버스');
  const [vehicleTotal, setVehicleTotal] = useState(0);

  // Etc Costs
  const [etcCosts, setEtcCosts] = useState<EtcCostItem[]>([
    { name: '여행자보험', type: 'per_person', amount: 0 },
    { name: '공항미팅', type: 'total', amount: 0 },
    { name: '예비비', type: 'total', amount: 0 },
    { name: '싱글차지', type: 'per_person', amount: 0 },
  ]);
  const [etcExpanded, setEtcExpanded] = useState(true);

  // Flight
  const [flightFares, setFlightFares] = useState<FlightFareItem[]>([
    { name: 'A요금', price: 0, pax: 0 },
  ]);

  // Land 1
  const [exchangeUSD1, setExchangeUSD1] = useState(1300);
  const [exchangeEUR1, setExchangeEUR1] = useState(1450);
  const [exchangeJPY1, setExchangeJPY1] = useState(950);
  const [landUSD1, setLandUSD1] = useState(0);
  const [landEUR1, setLandEUR1] = useState(0);
  const [landJPY1, setLandJPY1] = useState(0);
  const [landKRW1, setLandKRW1] = useState(0);

  // Land 2
  const [exchangeUSD2, setExchangeUSD2] = useState(1300);
  const [exchangeEUR2, setExchangeEUR2] = useState(1450);
  const [exchangeJPY2, setExchangeJPY2] = useState(950);
  const [landUSD2, setLandUSD2] = useState(0);
  const [landEUR2, setLandEUR2] = useState(0);
  const [landJPY2, setLandJPY2] = useState(0);
  const [landKRW2, setLandKRW2] = useState(0);

  // Summary 1
  const [summary1, setSummary1] = useState<CostSummary>({
    domesticPerPerson: 0, flightPerPerson: 0, landPerPerson: 0, etcPerPerson: 0,
    netTotal: 0, marginAmount: 0, perPerson: 0, sellTotal: 0,
    breakEvenPoint: '-', minParticipants: 10, marginRate: 0, notes: '',
  });

  // Summary 2
  const [summary2, setSummary2] = useState<CostSummary>({
    domesticPerPerson: 0, flightPerPerson: 0, landPerPerson: 0, etcPerPerson: 0,
    netTotal: 0, marginAmount: 0, perPerson: 0, sellTotal: 0,
    breakEvenPoint: '-', minParticipants: 10, marginRate: 0, notes: '',
  });

  const totalPax = adults + children + infants + tc;

  // Computed values
  const vehiclePerPerson = totalPax > 0 ? Math.round(vehicleTotal / totalPax) : 0;
  const etcTotal = etcCosts.reduce((sum, item) => {
    return sum + (item.type === 'per_person' ? item.amount * totalPax : item.amount);
  }, 0);
  const etcPerPerson = totalPax > 0 ? Math.round(etcTotal / totalPax) : 0;

  const flightTotal = flightFares.reduce((sum, f) => sum + f.price * f.pax, 0);
  const flightAvgPerPerson = totalPax > 0 ? Math.round(flightTotal / totalPax) : 0;

  // Land 1 conversions
  const landUSDConverted1 = landUSD1 * exchangeUSD1;
  const landEURConverted1 = landEUR1 * exchangeEUR1;
  const landJPYConverted1 = Math.round((landJPY1 * exchangeJPY1) / 100) * 100;
  const landTotalDisplay1 = landUSDConverted1 + landEURConverted1 + landJPYConverted1 + landKRW1;
  const landPerPerson1 = totalPax > 0 ? Math.round(landTotalDisplay1 / totalPax) : 0;

  // Land 2 conversions
  const landUSDConverted2 = landUSD2 * exchangeUSD2;
  const landEURConverted2 = landEUR2 * exchangeEUR2;
  const landJPYConverted2 = Math.round((landJPY2 * exchangeJPY2) / 100) * 100;
  const landTotalDisplay2 = landUSDConverted2 + landEURConverted2 + landJPYConverted2 + landKRW2;
  const landPerPerson2 = totalPax > 0 ? Math.round(landTotalDisplay2 / totalPax) : 0;

  useEffect(() => {
    const net1 = vehiclePerPerson + flightAvgPerPerson + landPerPerson1 + etcPerPerson;
    const marginRate1 = summary1.marginAmount > 0 && net1 > 0 ? (summary1.marginAmount / net1) * 100 : 0;
    setSummary1(prev => ({
      ...prev,
      domesticPerPerson: vehiclePerPerson,
      flightPerPerson: flightAvgPerPerson,
      landPerPerson: landPerPerson1,
      etcPerPerson: etcPerPerson,
      netTotal: net1,
      perPerson: net1 + prev.marginAmount,
      sellTotal: (net1 + prev.marginAmount) * totalPax,
      marginRate: marginRate1,
    }));
  }, [vehiclePerPerson, flightAvgPerPerson, landPerPerson1, etcPerPerson, totalPax, summary1.marginAmount]);

  useEffect(() => {
    const net2 = flightAvgPerPerson + landPerPerson2;
    const marginRate2 = summary2.marginAmount > 0 && net2 > 0 ? (summary2.marginAmount / net2) * 100 : 0;
    setSummary2(prev => ({
      ...prev,
      flightPerPerson: flightAvgPerPerson,
      landPerPerson: landPerPerson2,
      netTotal: net2,
      perPerson: net2 + prev.marginAmount,
      sellTotal: (net2 + prev.marginAmount) * totalPax,
      marginRate: marginRate2,
    }));
  }, [flightAvgPerPerson, landPerPerson2, totalPax, summary2.marginAmount]);

  const updateEtcCost = (index: number, field: keyof EtcCostItem, value: string | number) => {
    setEtcCosts(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const addEtcCost = () => {
    setEtcCosts(prev => [...prev, { name: '', type: 'per_person', amount: 0 }]);
  };

  const removeEtcCost = (index: number) => {
    setEtcCosts(prev => prev.filter((_, i) => i !== index));
  };

  const updateFlightFare = (index: number, field: keyof FlightFareItem, value: string | number) => {
    setFlightFares(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const addFlightFare = () => {
    setFlightFares(prev => [...prev, { name: '', price: 0, pax: 0 }]);
  };

  const removeFlightFare = (index: number) => {
    setFlightFares(prev => prev.filter((_, i) => i !== index));
  };

  const etcCostTotalDisplay = etcCosts.reduce((sum, item) => {
    return sum + (item.type === 'per_person' ? item.amount * totalPax : item.amount);
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">원가 계산서</h1>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">템플릿 불러오기</button>
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">템플릿 저장</button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="xl:col-span-3 space-y-6">
            {/* Basic Info & Save Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-purple-500">info</span>
                  <h3 className="font-bold text-gray-700">기본 정보</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">여행지</label>
                    <input type="text" value={destination} onChange={e => setDestination(e.target.value)} placeholder="예: 베트남 다낭" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">출발일</label>
                      <input type="date" value={departureDate} onChange={e => setDepartureDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">도착일</label>
                      <input type="date" value={arrivalDate} onChange={e => setArrivalDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">일정</label>
                    <div className="flex items-center gap-2">
                      <input type="number" value={nights} onChange={e => setNights(Number(e.target.value))} min="1" className="w-16 text-center px-2 py-2 border border-gray-300 rounded-md text-sm" />
                      <span className="text-gray-600">박</span>
                      <input type="number" value={days} onChange={e => setDays(Number(e.target.value))} min="2" className="w-16 text-center px-2 py-2 border border-gray-300 rounded-md text-sm" />
                      <span className="text-gray-600">일</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">인원</label>
                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-1"><label className="text-sm text-gray-600">성인</label><input type="number" value={adults} onChange={e => setAdults(Number(e.target.value))} min="0" className="w-16 text-center px-2 py-2 border border-gray-300 rounded-md text-sm" /></div>
                      <div className="flex items-center gap-1"><label className="text-sm text-gray-600">소아</label><input type="number" value={children} onChange={e => setChildren(Number(e.target.value))} min="0" className="w-16 text-center px-2 py-2 border border-gray-300 rounded-md text-sm" /></div>
                      <div className="flex items-center gap-1"><label className="text-sm text-gray-600">유아</label><input type="number" value={infants} onChange={e => setInfants(Number(e.target.value))} min="0" className="w-16 text-center px-2 py-2 border border-gray-300 rounded-md text-sm" /></div>
                      <div className="flex items-center gap-1"><label className="text-sm text-gray-600">인솔자</label><input type="number" value={tc} onChange={e => setTc(Number(e.target.value))} min="0" className="w-16 text-center px-2 py-2 border border-gray-300 rounded-md text-sm" /></div>
                    </div>
                    <div className="text-sm text-indigo-600 mt-1 font-medium">총 {totalPax}명</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-blue-500">save</span>
                  <h3 className="font-bold text-gray-700">저장 정보</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">저장 코드</label>
                    <input type="text" value={costCode} onChange={e => setCostCode(e.target.value)} placeholder="예: COST-2025-12-001" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">행사명</label>
                    <input type="text" value={costName} onChange={e => setCostName(e.target.value)} placeholder="예: 다낭 3박4일 단체여행" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button className="flex-1 bg-green-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-600">DB 저장</button>
                    <button className="flex-1 bg-cyan-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-cyan-600">DB 불러오기</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Domestic & Etc */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-green-500">directions_bus</span>
                  <h3 className="font-bold text-gray-700">국내 이동</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">차량 종류</label>
                    <input type="text" value={vehicleType} onChange={e => setVehicleType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">총 차량 비용</label>
                    <input type="number" value={vehicleTotal} onChange={e => setVehicleTotal(Number(e.target.value))} min="0" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm text-gray-700">1인당 차량 비용</span>
                    <span className="font-semibold text-gray-900">{vehiclePerPerson.toLocaleString()}원</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow">
                <div className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer" onClick={() => setEtcExpanded(v => !v)}>
                  <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <span className="text-yellow-500">more_horiz</span>
                    기타 원가
                    <span className="text-sm font-normal text-gray-500">({etcCostTotalDisplay.toLocaleString()}원)</span>
                  </h3>
                  <span className="text-gray-500">{etcExpanded ? 'expand_less' : 'expand_more'}</span>
                </div>
                {etcExpanded && (
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium text-gray-800 text-sm">기타 비용 항목</h4>
                      <button onClick={addEtcCost} className="bg-yellow-500 text-white px-3 py-1 rounded text-xs font-medium hover:bg-yellow-600">+ 항목 추가</button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {etcCosts.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-4">
                            <input type="text" value={item.name} onChange={e => updateEtcCost(idx, 'name', e.target.value)} placeholder="항목명" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
                          </div>
                          <div className="col-span-3">
                            <select value={item.type} onChange={e => updateEtcCost(idx, 'type', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm">
                              <option value="per_person">1인당</option><option value="total">총액</option>
                            </select>
                          </div>
                          <div className="col-span-3">
                            <input type="number" value={item.amount} onChange={e => updateEtcCost(idx, 'amount', Number(e.target.value))} min="0" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right" />
                          </div>
                          <div className="col-span-2 flex justify-end">
                            <button onClick={() => removeEtcCost(idx)} className="text-red-500 hover:text-red-700 text-xs">삭제</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t">
                      <span className="text-sm font-semibold text-gray-700">기타 총액</span>
                      <span className="font-bold text-yellow-600 text-lg">{etcCostTotalDisplay.toLocaleString()}원</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Flight */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-red-500">flight</span>
                <h3 className="font-bold text-gray-700">항공 원가</h3>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-800 text-sm">항공 요금 내역</h4>
                  <button onClick={addFlightFare} className="bg-red-500 text-white px-3 py-1 rounded text-xs font-medium hover:bg-red-600">+ 항공요금 추가</button>
                </div>
                <div className="space-y-2">
                  {flightFares.map((fare, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4">
                        <input type="text" value={fare.name} onChange={e => updateFlightFare(idx, 'name', e.target.value)} placeholder="예: A요금" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
                      </div>
                      <div className="col-span-3">
                        <input type="number" value={fare.price} onChange={e => updateFlightFare(idx, 'price', Number(e.target.value))} min="0" placeholder="1인 요금" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right" />
                      </div>
                      <div className="col-span-3">
                        <input type="number" value={fare.pax} onChange={e => updateFlightFare(idx, 'pax', Number(e.target.value))} min="0" placeholder="인원" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center" />
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <button onClick={() => removeFlightFare(idx)} className="text-red-500 hover:text-red-700 text-xs">삭제</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div><span className="text-gray-600 block mb-1">전체 인원</span><span className="text-lg font-bold">{totalPax}명</span></div>
                  <div><span className="text-gray-600 block mb-1">항공료 평균 (1인)</span><span className="text-lg font-bold text-blue-600">{flightAvgPerPerson.toLocaleString()}원</span></div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-red-200">
                  <span className="text-base font-semibold text-gray-700">항공 최종 총액</span>
                  <span className="text-2xl font-bold text-red-600">{flightTotal.toLocaleString()}원</span>
                </div>
              </div>
            </div>

            {/* Land 1 */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-indigo-500">landscape</span>
                <h3 className="font-bold text-gray-700">랜드 원가 1</h3>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="font-medium text-gray-800 text-sm mb-3">환율 설정</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2"><span className="text-sm font-medium text-gray-700">USD</span><span className="text-gray-600">1 USD =</span><input type="number" value={exchangeUSD1} onChange={e => setExchangeUSD1(Number(e.target.value))} className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm text-right" /><span className="text-gray-600">원</span></div>
                  <div className="flex items-center gap-2"><span className="text-sm font-medium text-gray-700">EUR</span><span className="text-gray-600">1 EUR =</span><input type="number" value={exchangeEUR1} onChange={e => setExchangeEUR1(Number(e.target.value))} className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm text-right" /><span className="text-gray-600">원</span></div>
                  <div className="flex items-center gap-2"><span className="text-sm font-medium text-gray-700">JPY</span><span className="text-gray-600">100 JPY =</span><input type="number" value={exchangeJPY1} onChange={e => setExchangeJPY1(Number(e.target.value))} className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm text-right" /><span className="text-gray-600">원</span></div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><label className="text-sm font-medium text-gray-700 block mb-1">USD 금액</label><input type="number" value={landUSD1} onChange={e => setLandUSD1(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700 block mb-1">원화 환산</label><p className="text-lg font-semibold text-gray-900">{landUSDConverted1.toLocaleString()}원</p></div>
                <div><label className="text-sm font-medium text-gray-700 block mb-1">EUR 금액</label><input type="number" value={landEUR1} onChange={e => setLandEUR1(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700 block mb-1">원화 환산</label><p className="text-lg font-semibold text-gray-900">{landEURConverted1.toLocaleString()}원</p></div>
                <div><label className="text-sm font-medium text-gray-700 block mb-1">JPY 금액</label><input type="number" value={landJPY1} onChange={e => setLandJPY1(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700 block mb-1">원화 환산</label><p className="text-lg font-semibold text-gray-900">{landJPYConverted1.toLocaleString()}원</p></div>
                <div><label className="text-sm font-medium text-gray-700 block mb-1">KRW 금액</label><input type="number" value={landKRW1} onChange={e => setLandKRW1(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700 block mb-1">원화</label><p className="text-lg font-semibold text-gray-900">{landKRW1.toLocaleString()}원</p></div>
              </div>
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <label className="text-sm font-medium text-gray-700 block mb-1">랜드 원가 1 총액 (원화 환산)</label>
                <p className="text-3xl font-bold text-blue-600 mt-1">{landTotalDisplay1.toLocaleString()}원</p>
              </div>
            </div>

            {/* Land 2 */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-green-500">terrain</span>
                <h3 className="font-bold text-gray-700">랜드 원가 2</h3>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="font-medium text-gray-800 text-sm mb-3">환율 설정</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2"><span className="text-sm font-medium text-gray-700">USD</span><span className="text-gray-600">1 USD =</span><input type="number" value={exchangeUSD2} onChange={e => setExchangeUSD2(Number(e.target.value))} className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm text-right" /><span className="text-gray-600">원</span></div>
                  <div className="flex items-center gap-2"><span className="text-sm font-medium text-gray-700">EUR</span><span className="text-gray-600">1 EUR =</span><input type="number" value={exchangeEUR2} onChange={e => setExchangeEUR2(Number(e.target.value))} className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm text-right" /><span className="text-gray-600">원</span></div>
                  <div className="flex items-center gap-2"><span className="text-sm font-medium text-gray-700">JPY</span><span className="text-gray-600">100 JPY =</span><input type="number" value={exchangeJPY2} onChange={e => setExchangeJPY2(Number(e.target.value))} className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm text-right" /><span className="text-gray-600">원</span></div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><label className="text-sm font-medium text-gray-700 block mb-1">USD 금액</label><input type="number" value={landUSD2} onChange={e => setLandUSD2(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700 block mb-1">원화 환산</label><p className="text-lg font-semibold text-gray-900">{landUSDConverted2.toLocaleString()}원</p></div>
                <div><label className="text-sm font-medium text-gray-700 block mb-1">EUR 금액</label><input type="number" value={landEUR2} onChange={e => setLandEUR2(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700 block mb-1">원화 환산</label><p className="text-lg font-semibold text-gray-900">{landEURConverted2.toLocaleString()}원</p></div>
                <div><label className="text-sm font-medium text-gray-700 block mb-1">JPY 금액</label><input type="number" value={landJPY2} onChange={e => setLandJPY2(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700 block mb-1">원화 환산</label><p className="text-lg font-semibold text-gray-900">{landJPYConverted2.toLocaleString()}원</p></div>
                <div><label className="text-sm font-medium text-gray-700 block mb-1">KRW 금액</label><input type="number" value={landKRW2} onChange={e => setLandKRW2(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700 block mb-1">원화</label><p className="text-lg font-semibold text-gray-900">{landKRW2.toLocaleString()}원</p></div>
              </div>
              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <label className="text-sm font-medium text-gray-700 block mb-1">랜드 원가 2 총액 (원화 환산)</label>
                <p className="text-3xl font-bold text-green-600 mt-1">{landTotalDisplay2.toLocaleString()}원</p>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Summary */}
          <div className="xl:col-span-1 space-y-4">
            {/* Summary 1 */}
            <div className="bg-white rounded-lg shadow p-4 sticky top-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center border-b pb-2">
                <span className="text-indigo-500 mr-2">calculate</span>
                원가 계산 요약 1
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between"><span>국내원가 (1인)</span><span className="font-medium">{summary1.domesticPerPerson.toLocaleString()}원</span></div>
                <div className="flex justify-between"><span>항공료 (1인)</span><span className="font-medium">{summary1.flightPerPerson.toLocaleString()}원</span></div>
                <div className="flex justify-between"><span>랜드원가 (1인)</span><span className="font-medium">{summary1.landPerPerson.toLocaleString()}원</span></div>
                <div className="flex justify-between"><span>기타원가 (1인)</span><span className="font-medium">{summary1.etcPerPerson.toLocaleString()}원</span></div>
                <div className="border-t my-2" />
                <div className="flex justify-between font-semibold text-gray-800"><span>순원가 합계 (1인)</span><span>{summary1.netTotal.toLocaleString()}원</span></div>
                <div className="flex justify-between items-center mt-2">
                  <span className="font-semibold">마진 금액</span>
                  <div className="flex items-center gap-1">
                    <input type="number" value={summary1.marginAmount} onChange={e => setSummary1(prev => ({ ...prev, marginAmount: Number(e.target.value) }))} min="0" className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right" />
                    <span className="text-green-600 font-medium text-xs">({summary1.marginRate.toFixed(1)}%)</span>
                  </div>
                </div>
                <div className="flex justify-between"><span>인당 판매가</span><span className="font-semibold text-indigo-600">{summary1.perPerson.toLocaleString()}원</span></div>
                <div className="flex justify-between"><span>총 판매가</span><span className="font-semibold text-indigo-600">{summary1.sellTotal.toLocaleString()}원</span></div>
                <div className="mt-4">
                  <label className="text-xs font-semibold text-gray-700 block mb-1">비고 사항</label>
                  <textarea value={summary1.notes} onChange={e => setSummary1(prev => ({ ...prev, notes: e.target.value }))} rows={2} placeholder="요약 1의 특징이나 차이점..." className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
                </div>
              </div>
            </div>

            {/* Summary 2 */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center border-b pb-2">
                <span className="text-green-500 mr-2">calculate</span>
                원가 계산 요약 2
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between"><span>항공료 (1인)</span><span className="font-medium">{summary2.flightPerPerson.toLocaleString()}원</span></div>
                <div className="flex justify-between"><span>랜드원가 (1인)</span><span className="font-medium">{summary2.landPerPerson.toLocaleString()}원</span></div>
                <div className="border-t my-2" />
                <div className="flex justify-between font-semibold text-gray-800"><span>순원가 합계 (1인)</span><span>{summary2.netTotal.toLocaleString()}원</span></div>
                <div className="flex justify-between items-center mt-2">
                  <span className="font-semibold">마진 금액</span>
                  <div className="flex items-center gap-1">
                    <input type="number" value={summary2.marginAmount} onChange={e => setSummary2(prev => ({ ...prev, marginAmount: Number(e.target.value) }))} min="0" className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right" />
                    <span className="text-green-600 font-medium text-xs">({summary2.marginRate.toFixed(1)}%)</span>
                  </div>
                </div>
                <div className="flex justify-between"><span>인당 판매가</span><span className="font-semibold text-green-600">{summary2.perPerson.toLocaleString()}원</span></div>
                <div className="flex justify-between"><span>총 판매가</span><span className="font-semibold text-green-600">{summary2.sellTotal.toLocaleString()}원</span></div>
                <div className="mt-4">
                  <label className="text-xs font-semibold text-gray-700 block mb-1">비고 사항</label>
                  <textarea value={summary2.notes} onChange={e => setSummary2(prev => ({ ...prev, notes: e.target.value }))} rows={2} placeholder="요약 2의 특징이나 차이점..." className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-center gap-2">
          <button className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-1">
            <span>print</span> 원가 계산서 인쇄
          </button>
          <button className="bg-green-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-600 flex items-center gap-1">
            <span>description</span> Excel 내보내기
          </button>
          <button className="bg-gray-700 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-600 flex items-center gap-1">
            <span>sync_alt</span> 견적서로 변환
          </button>
        </div>
      </div>
    </div>
  );
}
