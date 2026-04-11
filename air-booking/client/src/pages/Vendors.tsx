// @TASK P3-S2-T1 - 거래처 관리 화면
// @SPEC 유형 필터, 거래처 목록 테이블, 추가/편집 모달

import { useState, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import '../styles/vendors.css';

interface Vendor {
  id: string;
  name: string;
  type: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  remarks: string | null;
  created_at: string;
}

type TypeFilter = '' | '항공사' | '여행사';

const emptyForm = { name: '', type: '', contact_name: '', phone: '', email: '', remarks: '' };

export function Vendors() {
  const { toast } = useToast();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('');
  const [search, setSearch] = useState('');

  // Form modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchVendors = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/vendors?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setVendors(data.data.vendors);
        setTotal(data.data.total);
      }
    } catch (err) {
      console.error('[vendors] Failed to fetch vendors:', err);
      toast.error('거래처 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, search]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEditModal = (v: Vendor) => {
    setEditingId(v.id);
    setForm({
      name: v.name,
      type: v.type || '',
      contact_name: v.contact_name || '',
      phone: v.phone || '',
      email: v.email || '',
      remarks: v.remarks || '',
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.warning('거래처 이름을 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      const url = editingId ? `/api/vendors/${editingId}` : '/api/vendors';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(editingId ? '거래처가 수정되었습니다.' : '거래처가 등록되었습니다.');
        setFormOpen(false);
        fetchVendors();
      }
    } catch (err) {
      console.error('[vendors] Failed to save vendor:', err);
      toast.error('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/vendors/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('거래처가 삭제되었습니다.');
        fetchVendors();
      }
    } catch (err) {
      console.error('[vendors] Failed to delete vendor:', err);
      toast.error('삭제에 실패했습니다.');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="vendors-page">
      {/* Toolbar */}
      <div className="vendors-toolbar">
        <div className="toolbar-left">
          <input
            type="text"
            className="search-input"
            placeholder="거래처명 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="거래처 검색"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            aria-label="유형 필터"
          >
            <option value="">전체</option>
            <option value="항공사">항공사</option>
            <option value="여행사">여행사</option>
          </select>
        </div>
        <button className="add-btn" onClick={openCreateModal}>
          거래처 추가
        </button>
      </div>

      {/* Table */}
      <div className="vendors-table-wrapper">
        <table className="vendors-table">
          <thead>
            <tr>
              <th>거래처명</th>
              <th>유형</th>
              <th>담당자</th>
              <th>연락처</th>
              <th>이메일</th>
              <th>비고</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {vendors.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-cell">거래처 데이터가 없습니다.</td>
              </tr>
            ) : (
              vendors.map((v) => (
                <tr key={v.id} className="vendor-row">
                  <td className="vendor-name">{v.name}</td>
                  <td>{v.type || '-'}</td>
                  <td>{v.contact_name || '-'}</td>
                  <td>{v.phone || '-'}</td>
                  <td>{v.email || '-'}</td>
                  <td>{v.remarks || '-'}</td>
                  <td className="vendor-actions">
                    <button
                      className="action-btn-sm"
                      onClick={() => openEditModal(v)}
                      aria-label={`${v.name} 편집`}
                    >
                      편집
                    </button>
                    <button
                      className="action-btn-sm action-danger"
                      onClick={() => handleDelete(v.id)}
                      aria-label={`${v.name} 삭제`}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="vendors-footer">총 {total}건</div>

      {/* Form Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? '거래처 수정' : '거래처 추가'}
        size="md"
      >
        <div className="vendor-form">
          <div className="form-group">
            <label htmlFor="vendor-name">거래처명 *</label>
            <input
              id="vendor-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="거래처명"
            />
          </div>
          <div className="form-group">
            <label htmlFor="vendor-type">유형</label>
            <select
              id="vendor-type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="">선택</option>
              <option value="항공사">항공사</option>
              <option value="여행사">여행사</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="vendor-contact">담당자</label>
            <input
              id="vendor-contact"
              type="text"
              value={form.contact_name}
              onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label htmlFor="vendor-phone">연락처</label>
            <input
              id="vendor-phone"
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label htmlFor="vendor-email">이메일</label>
            <input
              id="vendor-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label htmlFor="vendor-remarks">비고</label>
            <textarea
              id="vendor-remarks"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              rows={3}
            />
          </div>
          <div className="modal-actions">
            <button onClick={() => setFormOpen(false)} className="cancel-btn">취소</button>
            <button onClick={handleSubmit} className="submit-btn" disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
