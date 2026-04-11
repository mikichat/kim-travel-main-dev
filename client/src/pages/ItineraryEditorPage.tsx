import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ItineraryItem } from '@tourworld/shared';
import { ItineraryEditor } from '../components/ItineraryEditor';

// Mock itinerary data - will be replaced with API calls
const mockItinerary = {
  id: '1',
  title: '도쿄 3박 4일',
  startDate: '2024-03-01',
  endDate: '2024-03-04',
};

/**
 * Itinerary editor page
 */
export default function ItineraryEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch itinerary items
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/itineraries/${id}/items`);
        const data = await response.json();

        if (data.success) {
          setItems(data.data);
        } else {
          setError(data.error?.message || 'Failed to load items');
        }
      } catch (err) {
        setError('Failed to fetch items');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchItems();
    }
  }, [id]);

  const handleSave = async (updatedItems: ItineraryItem[]) => {
    try {
      // Prepare reorder data
      const reorderData = updatedItems.map((item) => ({
        id: item.id,
        dayNumber: item.dayNumber,
        sortOrder: item.sortOrder,
      }));

      const response = await fetch(`/api/itineraries/${id}/items/reorder`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: reorderData }),
      });

      const data = await response.json();

      if (data.success) {
        setItems(data.data);
        alert('변경사항이 저장되었습니다.');
      } else {
        alert('저장에 실패했습니다: ' + data.error?.message);
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleAddItem = async (dayNumber: number) => {
    try {
      const response = await fetch(`/api/itineraries/${id}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dayNumber,
          title: '새 일정',
          startTime: '09:00',
          endTime: '10:00',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setItems((prev) => [...prev, data.data]);
      } else {
        alert('추가에 실패했습니다: ' + data.error?.message);
      }
    } catch (err) {
      console.error('Add error:', err);
      alert('추가 중 오류가 발생했습니다.');
    }
  };

  const handleEditItem = async (item: ItineraryItem) => {
    // TODO: Open modal for editing
    const newTitle = prompt('제목을 입력하세요:', item.title);
    if (!newTitle) return;

    try {
      const response = await fetch(`/api/itineraries/${id}/items/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...item,
          title: newTitle,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? data.data : i))
        );
      } else {
        alert('수정에 실패했습니다: ' + data.error?.message);
      }
    } catch (err) {
      console.error('Edit error:', err);
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/itineraries/${id}/items/${itemId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setItems((prev) => prev.filter((i) => i.id !== itemId));
      } else {
        alert('삭제에 실패했습니다: ' + data.error?.message);
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/itineraries')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen">
      <ItineraryEditor
        itineraryId={id!}
        title={mockItinerary.title}
        startDate={mockItinerary.startDate}
        items={items}
        onSave={handleSave}
        onAddItem={handleAddItem}
        onEditItem={handleEditItem}
        onDeleteItem={handleDeleteItem}
      />
    </div>
  );
}
