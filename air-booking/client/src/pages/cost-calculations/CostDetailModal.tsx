// CostDetailModal — 원가 계산서 상세 보기 모달

import { Modal } from '../../components/common/Modal';

interface FlightFare {
  name: string;
  price: number;
  pax: number;
}

interface EtcCost {
  name: string;
  type: string; // 'per_person' | 'total'
  amount: number;
}

interface LandCost {
  exchangeUSD?: number;
  exchangeEUR?: number;
  exchangeJPY?: number;
  landUSD?: number;
  landEUR?: number;
  landJPY?: number;
  landKRW?: number;
}

export interface CostCalcDetail {
  id: number;
  code: string;
  name: string;
  destination: string | null;
  departure_date: string | null;
  arrival_date: string | null;
  nights: number | null;
  days: number | null;
  adults: number;
  children: number;
  infants: number;
  tc: number;
  domestic_vehicle_type: string | null;
  domestic_vehicle_total: number;
  flight_data: FlightFare[] | null;
  etc_costs: EtcCost[] | null;
  land_cost_1: LandCost | null;
  land_cost_2: LandCost | null;
  margin_amount_1: number;
  margin_amount_2: number;
  notes_1: string | null;
  notes_2: string | null;
}

function formatNum(n: number | null | undefined): string {
  if (n == null) return '-';
  return n.toLocaleString('ko-KR');
}

function calcLandTotal(lc: LandCost | null): number {
  if (!lc) return 0;
  const usd = (lc.landUSD || 0) * (lc.exchangeUSD || 0);
  const eur = (lc.landEUR || 0) * (lc.exchangeEUR || 0);
  const jpy = (lc.landJPY || 0) * (lc.exchangeJPY || 0);
  const krw = lc.landKRW || 0;
  return Math.round(usd + eur + jpy + krw);
}

interface Props {
  open: boolean;
  detail: CostCalcDetail | null;
  onClose: () => void;
}

export function CostDetailModal({ open, detail, onClose }: Props) {
  const formatDate = (d: string | null) => d ? d.slice(0, 10) : '-';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={detail ? `${detail.code} — ${detail.name}` : '원가 계산서 상세'}
      size="lg"
    >
      {detail && (
        <div className="cc-detail">
          {/* 기본 정보 */}
          <div className="cc-section-title">기본 정보</div>
          <div className="cc-info-grid">
            <div className="cc-info-item">
              <span className="label">여행지</span>
              <span className="value">{detail.destination || '-'}</span>
            </div>
            <div className="cc-info-item">
              <span className="label">출발일</span>
              <span className="value">{formatDate(detail.departure_date)}</span>
            </div>
            <div className="cc-info-item">
              <span className="label">귀국일</span>
              <span className="value">{formatDate(detail.arrival_date)}</span>
            </div>
            <div className="cc-info-item">
              <span className="label">기간</span>
              <span className="value">{detail.nights ?? '-'}박 {detail.days ?? '-'}일</span>
            </div>
          </div>

          {/* 인원 */}
          <div className="cc-section-title">인원</div>
          <div className="cc-info-grid">
            <div className="cc-info-item">
              <span className="label">성인</span>
              <span className="value">{detail.adults}명</span>
            </div>
            <div className="cc-info-item">
              <span className="label">소아</span>
              <span className="value">{detail.children}명</span>
            </div>
            <div className="cc-info-item">
              <span className="label">유아</span>
              <span className="value">{detail.infants}명</span>
            </div>
            <div className="cc-info-item">
              <span className="label">인솔자(TC)</span>
              <span className="value">{detail.tc}명</span>
            </div>
          </div>

          {/* 국내 이동 */}
          {(detail.domestic_vehicle_type || detail.domestic_vehicle_total > 0) && (
            <>
              <div className="cc-section-title">국내 이동</div>
              <div className="cc-info-grid">
                <div className="cc-info-item">
                  <span className="label">차량</span>
                  <span className="value">{detail.domestic_vehicle_type || '-'}</span>
                </div>
                <div className="cc-info-item">
                  <span className="label">비용</span>
                  <span className="value">{formatNum(detail.domestic_vehicle_total)}원</span>
                </div>
              </div>
            </>
          )}

          {/* 항공요금 */}
          {detail.flight_data && detail.flight_data.length > 0 && (
            <>
              <div className="cc-section-title">항공요금</div>
              <table className="cc-table">
                <thead>
                  <tr>
                    <th>구분</th>
                    <th>단가</th>
                    <th>인원</th>
                    <th>소계</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.flight_data as FlightFare[]).map((f, i) => (
                    <tr key={i}>
                      <td>{f.name || `요금 ${String.fromCharCode(65 + i)}`}</td>
                      <td className="num">{formatNum(f.price)}원</td>
                      <td className="num">{f.pax}명</td>
                      <td className="num">{formatNum(f.price * f.pax)}원</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* 기타 원가 */}
          {detail.etc_costs && (detail.etc_costs as EtcCost[]).length > 0 && (
            <>
              <div className="cc-section-title">기타 원가</div>
              <table className="cc-table">
                <thead>
                  <tr>
                    <th>항목</th>
                    <th>유형</th>
                    <th>금액</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.etc_costs as EtcCost[]).map((c, i) => (
                    <tr key={i}>
                      <td>{c.name}</td>
                      <td>{c.type === 'per_person' ? '인당' : '총액'}</td>
                      <td className="num">{formatNum(c.amount)}원</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* 랜드 원가 */}
          {(detail.land_cost_1 || detail.land_cost_2) && (
            <>
              <div className="cc-section-title">랜드 원가</div>
              <div className="cc-land-grid">
                {[detail.land_cost_1, detail.land_cost_2].map((lc, idx) => {
                  if (!lc) return null;
                  const lco = lc as LandCost;
                  return (
                    <div key={idx} className="cc-land-card">
                      <div className="cc-land-title">시나리오 {idx + 1}</div>
                      {lco.exchangeUSD && <div className="cc-land-row"><span>USD 환율</span><span>{formatNum(lco.exchangeUSD)}</span></div>}
                      {lco.landUSD ? <div className="cc-land-row"><span>USD 비용</span><span>${formatNum(lco.landUSD)}</span></div> : null}
                      {lco.exchangeEUR && <div className="cc-land-row"><span>EUR 환율</span><span>{formatNum(lco.exchangeEUR)}</span></div>}
                      {lco.landEUR ? <div className="cc-land-row"><span>EUR 비용</span><span>€{formatNum(lco.landEUR)}</span></div> : null}
                      {lco.exchangeJPY && <div className="cc-land-row"><span>JPY 환율</span><span>{formatNum(lco.exchangeJPY)}</span></div>}
                      {lco.landJPY ? <div className="cc-land-row"><span>JPY 비용</span><span>¥{formatNum(lco.landJPY)}</span></div> : null}
                      {lco.landKRW ? <div className="cc-land-row"><span>KRW 비용</span><span>{formatNum(lco.landKRW)}원</span></div> : null}
                      <div className="cc-land-row total">
                        <span>합계(원화)</span>
                        <span>{formatNum(calcLandTotal(lco))}원</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* 마진 & 비고 */}
          <div className="cc-section-title">마진 & 비고</div>
          <div className="cc-info-grid">
            <div className="cc-info-item">
              <span className="label">마진 1</span>
              <span className="value">{formatNum(detail.margin_amount_1)}원</span>
            </div>
            <div className="cc-info-item">
              <span className="label">마진 2</span>
              <span className="value">{formatNum(detail.margin_amount_2)}원</span>
            </div>
          </div>
          {(detail.notes_1 || detail.notes_2) && (
            <div className="cc-notes">
              {detail.notes_1 && <div className="cc-note"><span className="label">비고 1</span><p>{detail.notes_1}</p></div>}
              {detail.notes_2 && <div className="cc-note"><span className="label">비고 2</span><p>{detail.notes_2}</p></div>}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
