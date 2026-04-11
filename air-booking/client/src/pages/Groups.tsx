// 단체상품 관리 — travel_agency.db groups 테이블 직접 조회

import { useState, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import '../styles/groups.css';

interface GroupMember {
  no: number;
  nameKr: string;
  nameEn: string;
  gender: string;
  passportNo: string;
  birthDate: string;
  passportExpire: string;
  phone: string;
}

interface Group {
  id: string;
  name: string;
  destination: string | null;
  departure_date: string | null;
  return_date: string | null;
  member_count: number;
  is_archived: number;
  created_at: string;
}

interface GroupDetail extends Group {
  members: GroupMember[];
}

type StatusFilter = '' | 'active' | 'archived';

export function Groups() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [selectedGroup, setSelectedGroup] = useState<GroupDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchGroups = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/groups?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setGroups(data.data.groups);
        setTotal(data.data.total);
      }
    } catch {
      toast.error('단체상품 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const openDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/groups/${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setSelectedGroup(data.data.group);
        setDetailOpen(true);
      }
    } catch {
      toast.error('단체 정보를 불러올 수 없습니다.');
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return d.slice(0, 10);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="groups-page">
      <div className="groups-toolbar">
        <div className="toolbar-left">
          <input
            type="text"
            className="search-input"
            placeholder="단체명, 여행지 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="단체 검색"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            aria-label="상태 필터"
          >
            <option value="">전체</option>
            <option value="active">진행중</option>
            <option value="archived">종료</option>
          </select>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="groups-empty">단체상품 데이터가 없습니다.</div>
      ) : (
        <div className="groups-grid">
          {groups.map((g) => (
            <div
              key={g.id}
              className="group-card"
              onClick={() => openDetail(g.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && openDetail(g.id)}
            >
              <div className="group-card-header">
                <span className="group-card-name">{g.name}</span>
                <span className={`group-card-badge ${g.is_archived ? 'archived' : 'active'}`}>
                  {g.is_archived ? '종료' : '진행중'}
                </span>
              </div>
              <div className="group-card-meta">
                <span>{g.destination || '미정'}</span>
                <span>
                  {formatDate(g.departure_date)} ~ {formatDate(g.return_date)}
                </span>
              </div>
              <div className="group-card-footer">
                <span className="group-pax-count">{g.member_count}명</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="groups-footer">총 {total}건</div>

      {/* Detail Modal */}
      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={selectedGroup?.name || '단체 상세'}
        size="lg"
      >
        {selectedGroup && (
          <div className="group-detail">
            <div className="group-info-row">
              <div className="group-info-item">
                <span className="label">여행지</span>
                <span className="value">{selectedGroup.destination || '-'}</span>
              </div>
              <div className="group-info-item">
                <span className="label">상태</span>
                <span className="value">{selectedGroup.is_archived ? '종료' : '진행중'}</span>
              </div>
              <div className="group-info-item">
                <span className="label">출발일</span>
                <span className="value">{formatDate(selectedGroup.departure_date)}</span>
              </div>
              <div className="group-info-item">
                <span className="label">귀국일</span>
                <span className="value">{formatDate(selectedGroup.return_date)}</span>
              </div>
            </div>

            <div className="members-section-title">
              명단 ({selectedGroup.members.length}명)
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="members-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>한글명</th>
                    <th>영문명</th>
                    <th>성별</th>
                    <th>여권번호</th>
                    <th>생년월일</th>
                    <th>여권만료</th>
                    <th>연락처</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedGroup.members.map((m, idx) => (
                    <tr key={idx}>
                      <td>{m.no || idx + 1}</td>
                      <td>{m.nameKr || '-'}</td>
                      <td>{m.nameEn || '-'}</td>
                      <td>{m.gender === 'M' ? '남' : m.gender === 'F' ? '여' : m.gender || '-'}</td>
                      <td>{m.passportNo || '-'}</td>
                      <td>{m.birthDate || '-'}</td>
                      <td>{m.passportExpire || '-'}</td>
                      <td>{m.phone || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
