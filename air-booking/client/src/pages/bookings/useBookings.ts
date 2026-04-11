// @TASK P2-S3-T1 - 예약장부 상태 관리 훅
// @SPEC 예약 목록 조회, 삭제, 발권, 행 확장

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '../../components/common/Toast';
import type { Booking, StatusFilter, SortField } from './types';

export function useBookings() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Highlight from navigation
  const highlightId = searchParams.get('highlight');

  const fetchBookings = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      params.set('sort', sortField);
      params.set('order', 'desc');

      const res = await fetch(`/api/bookings?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setBookings(data.data.bookings);
        setTotal(data.data.total);
      }
    } catch (err) {
      console.error('[bookings] Failed to fetch bookings:', err);
      toast.error('예약 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sortField, dateFrom, dateTo]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    if (highlightId) {
      setExpandedId(highlightId);
    }
  }, [highlightId]);

  const handleTicketing = async (id: string) => {
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'ticketed' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('발권 처리가 완료되었습니다.');
        fetchBookings();
      } else {
        toast.error(data.error || '발권 처리에 실패했습니다.');
      }
    } catch (err) {
      console.error('[bookings] Ticketing failed:', err);
      toast.error('발권 처리 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('예약이 삭제되었습니다.');
        setExpandedId(null);
        fetchBookings();
      }
    } catch (err) {
      console.error('[bookings] Delete failed:', err);
      toast.error('삭제에 실패했습니다.');
    }
  };

  const fetchBookingDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/bookings/${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.data.booking) {
        setBookings(prev => prev.map(b =>
          b.id === id
            ? { ...b, passengers: data.data.booking.passengers, segments: data.data.booking.segments, pax_count: data.data.booking.pax_count }
            : b
        ));
      }
    } catch (err) {
      console.error('[bookings] Detail fetch failed:', err);
      toast.error('예약 상세 정보를 불러올 수 없습니다.');
    }
  }, []);

  const handleExpand = useCallback((id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      // passengers가 없으면 상세 조회
      const b = bookings.find(x => x.id === id);
      if (b && !b.passengers) {
        fetchBookingDetail(id);
      }
    }
  }, [expandedId, bookings, fetchBookingDetail]);

  return {
    bookings,
    setBookings,
    total,
    loading,
    expandedId,
    setExpandedId,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    sortField,
    setSortField,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    highlightId,
    fetchBookings,
    handleTicketing,
    handleDelete,
    handleExpand,
  };
}
