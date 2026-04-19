import { useState, useEffect } from 'react';
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core';
import type { ItineraryItem } from '@tourworld/shared';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { DayColumn } from './DayColumn';
import { ScheduleItem } from './ScheduleItem';

export interface ItineraryEditorProps {
  itineraryId: string;
  title: string;
  startDate?: string;
  items: ItineraryItem[];
  onSave: (items: ItineraryItem[]) => void;
  onAddItem: (dayNumber: number) => void;
  onEditItem: (item: ItineraryItem) => void;
  onDeleteItem: (id: string) => void;
}

/**
 * Main itinerary editor component with drag and drop
 */
export function ItineraryEditor({
  title,
  startDate,
  items,
  onSave,
  onAddItem,
  onEditItem,
  onDeleteItem,
}: ItineraryEditorProps) {
  const [localItems, setLocalItems] = useState<ItineraryItem[]>(items);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const handleReorder = (reorderedItems: ItineraryItem[]) => {
    setLocalItems(reorderedItems);
    setHasChanges(true);
  };

  const {
    sensors,
    activeId,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    dayItems,
  } = useDragAndDrop({
    items: localItems,
    onReorder: handleReorder,
  });

  const handleSave = () => {
    onSave(localItems);
    setHasChanges(false);
  };

  const handlePreview = () => {
    // Generate preview text
    const previewText = localItems.length === 0
      ? '일정이 없습니다.'
      : days.map((dayNumber) => {
          const dayItems = localItems.filter((item) => item.dayNumber === dayNumber);
          const dayDate = getDayDate(dayNumber);
          const dateStr = dayDate ? new Date(dayDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }) : '';
          const itemsStr = dayItems.length === 0
            ? '  - 일정이 없습니다.'
            : dayItems.map((item) => `  - ${item.time || ''} ${item.title}${item.location ? ` (${item.location})` : ''}`).join('\n');
          return `[Day ${dayNumber}] ${dateStr}\n${itemsStr}`;
        }).join('\n\n');

    alert(`=== ${title} 미리보기 ===\n\n${previewText}`);
  };

  // Calculate the number of days
  const dayCount = Math.max(...localItems.map((item) => item.dayNumber), 0);
  const days = Array.from({ length: dayCount }, (_, i) => i + 1);

  // Calculate dates for each day
  const getDayDate = (dayNumber: number): string | undefined => {
    if (!startDate) return undefined;
    const date = new Date(startDate);
    date.setDate(date.getDate() + dayNumber - 1);
    return date.toISOString();
  };

  // Get active item for DragOverlay
  const activeItem = activeId ? localItems.find((item) => item.id === activeId) : null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title} 편집</h1>
          <p className="text-sm text-gray-500 mt-1">
            일정을 드래그하여 순서를 변경하거나 다른 날짜로 이동할 수 있습니다.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handlePreview}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            미리보기
          </button>

          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              hasChanges
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
              />
            </svg>
            저장
            {hasChanges && <span className="text-xs">(변경됨)</span>}
          </button>
        </div>
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-x-auto bg-gray-100 p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6">
            {days.map((dayNumber) => (
              <DayColumn
                key={dayNumber}
                dayNumber={dayNumber}
                date={getDayDate(dayNumber)}
                items={dayItems[dayNumber] || []}
                onAddItem={onAddItem}
                onEditItem={onEditItem}
                onDeleteItem={onDeleteItem}
              />
            ))}

            {/* Add Day button */}
            <div className="flex-shrink-0 w-80">
              <button
                onClick={() => onAddItem(days.length + 1)}
                className="w-full h-full min-h-[400px] border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center gap-3"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-12 h-12"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                <span className="font-medium text-lg">Day {days.length + 1} 추가</span>
              </button>
            </div>
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activeItem ? (
              <div className="w-80">
                <ScheduleItem
                  item={activeItem}
                  onEdit={() => {}}
                  onDelete={() => {}}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
