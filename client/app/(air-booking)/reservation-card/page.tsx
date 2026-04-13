'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ReservationCardPage() {
  const [cards] = useState<any[]>([]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">예약 카드</h1>
        <p className="text-gray-500 mt-1">예약 카드 목록</p>
      </div>

      {cards.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <p className="text-gray-500">예약 카드가 없습니다.</p>
          <Link
            href="/bookings"
            className="inline-block mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            예약장부로 이동
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <Link
              key={card.id}
              href={`/reservation-card/${card.id}`}
              className="bg-white rounded-xl shadow p-4 hover:shadow-lg transition-shadow"
            >
              <h3 className="font-semibold">{card.pnr}</h3>
              <p className="text-sm text-gray-500">{card.airline}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
