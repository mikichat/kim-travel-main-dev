import React from 'react';

interface ExistingBooking {
  pnr: string;
  airline: string;
  flight_number: string;
  departure_date: string;
  source: string;
}

interface PnrDuplicateWarningProps {
  pnr: string;
  existingBooking?: ExistingBooking;
  onUpdate: () => void;
  onCreateNew: () => void;
  onViewExisting: () => void;
  onCancel: () => void;
}

const containerStyle: React.CSSProperties = {
  backgroundColor: '#fff8e1',
  border: '1px solid #ffc107',
  borderRadius: '8px',
  padding: '16px',
  margin: '12px 0',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '12px',
  fontWeight: 600,
  color: '#e65100',
};

const infoStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: '4px',
  padding: '10px 12px',
  marginBottom: '12px',
  fontSize: '13px',
  lineHeight: 1.6,
};

const btnGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
};

const btnBase: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: '4px',
  border: '1px solid #ccc',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 500,
};

export function PnrDuplicateWarning({
  pnr,
  existingBooking,
  onUpdate,
  onCreateNew,
  onViewExisting,
  onCancel,
}: PnrDuplicateWarningProps) {
  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <span style={{ fontSize: '18px' }}>&#9888;</span>
        <span>PNR {pnr}는 이미 등록되었습니다.</span>
      </div>

      {existingBooking && (
        <div style={infoStyle}>
          <div><strong>항공사:</strong> {existingBooking.airline || '-'}</div>
          <div><strong>편명:</strong> {existingBooking.flight_number || '-'}</div>
          <div><strong>출발일:</strong> {existingBooking.departure_date || '-'}</div>
          <div><strong>출처:</strong> {existingBooking.source || '-'}</div>
        </div>
      )}

      <div style={btnGroupStyle}>
        <button style={{ ...btnBase, backgroundColor: '#1976d2', color: '#fff', border: 'none' }} onClick={onViewExisting}>
          기존 예약 보기
        </button>
        <button style={{ ...btnBase, backgroundColor: '#f57c00', color: '#fff', border: 'none' }} onClick={onUpdate}>
          UPDATE (갱신)
        </button>
        <button style={{ ...btnBase }} onClick={onCreateNew}>
          새 항공편 등록
        </button>
        <button style={{ ...btnBase }} onClick={onCancel}>
          취소
        </button>
      </div>
    </div>
  );
}
