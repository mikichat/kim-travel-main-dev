import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { ItineraryItem } from '@tourworld/shared';
import { ScheduleItem } from './ScheduleItem';

export interface DayColumnProps {
  dayNumber: number;
  date?: string;
  items: ItineraryItem[];
  onAddItem: (dayNumber: number) => void;
  onEditItem: (item: ItineraryItem) => void;
  onDeleteItem: (id: string) => void;
}

/**
 * Day column component with droppable area
 */
export function DayColumn({
  dayNumber,
  date,
  items,
  onAddItem,
  onEditItem,
  onDeleteItem,
}: DayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dayNumber}`,
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
    return `${month}/${day} (${dayOfWeek})`;
  };

  return (
    <div className="flex-shrink-0 w-80">
      <div className="bg-gray-50 rounded-lg border-2 border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
          <h3 className="font-bold text-lg">Day {dayNumber}</h3>
          {date && <p className="text-sm text-blue-100">{formatDate(date)}</p>}
        </div>

        {/* Droppable area */}
        <div
          ref={setNodeRef}
          className={`p-4 min-h-[400px] transition-colors ${
            isOver ? 'bg-blue-50 border-blue-300' : ''
          }`}
        >
          <SortableContext
            items={items.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            {items.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-12 h-12 mx-auto mb-2 opacity-50"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                  />
                </svg>
                <p className="text-sm">일정을 추가하세요</p>
              </div>
            ) : (
              items.map((item) => (
                <ScheduleItem
                  key={item.id}
                  item={item}
                  onEdit={onEditItem}
                  onDelete={onDeleteItem}
                />
              ))
            )}
          </SortableContext>

          {/* Add button */}
          <button
            onClick={() => onAddItem(dayNumber)}
            className="w-full mt-2 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            <span className="font-medium">항목 추가</span>
          </button>
        </div>
      </div>
    </div>
  );
}
