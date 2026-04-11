import { useState, useCallback } from 'react';
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { ItineraryItem } from '@tourworld/shared';

export interface DayItems {
  [day: number]: ItineraryItem[];
}

export interface UseDragAndDropProps {
  items: ItineraryItem[];
  onReorder: (items: ItineraryItem[]) => void;
}

export interface UseDragAndDropReturn {
  sensors: ReturnType<typeof useSensors>;
  activeId: string | null;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  handleDragOver: (event: DragOverEvent) => void;
  dayItems: DayItems;
}

// Group items by day number (declared outside hook to avoid hoisting issues)
function groupItemsByDay(itemList: ItineraryItem[]): DayItems {
  const grouped: DayItems = {};
  itemList.forEach((item) => {
    if (!grouped[item.dayNumber]) {
      grouped[item.dayNumber] = [];
    }
    grouped[item.dayNumber]!.push(item);
  });

  // Sort items within each day by sortOrder
  Object.keys(grouped).forEach((day) => {
    grouped[Number(day)]!.sort((a, b) => a.sortOrder - b.sortOrder);
  });

  return grouped;
}

/**
 * Custom hook for drag and drop functionality using @dnd-kit
 */
export function useDragAndDrop({
  items,
  onReorder,
}: UseDragAndDropProps): UseDragAndDropReturn {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dayItems, setDayItems] = useState<DayItems>(() =>
    groupItemsByDay(items)
  );

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;

      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // Find active and over items
      let activeItem: ItineraryItem | undefined;
      let activeDay: number = 0;
      let overDay: number = 0;

      Object.entries(dayItems).forEach(([day, items]) => {
        const dayNum = Number(day);
        const foundActive = items.find(
          (item: ItineraryItem) => item.id === activeId
        );
        const foundOver = items.find(
          (item: ItineraryItem) => item.id === overId
        );

        if (foundActive) {
          activeItem = foundActive;
          activeDay = dayNum;
        }
        if (foundOver || overId.startsWith('day-')) {
          overDay = overId.startsWith('day-')
            ? Number(overId.split('-')[1])
            : dayNum;
        }
      });

      if (!activeItem) return;

      // If moving to a different day
      if (activeDay !== overDay) {
        setDayItems((prev) => {
          const newDayItems = { ...prev };

          // Remove from active day
          newDayItems[activeDay] = newDayItems[activeDay]!.filter(
            (item) => item.id !== activeId
          );

          // Add to over day
          if (!newDayItems[overDay]) {
            newDayItems[overDay] = [];
          }

          const updatedItem = { ...activeItem!, dayNumber: overDay };
          newDayItems[overDay] = [...newDayItems[overDay]!, updatedItem];

          return newDayItems;
        });
      }
    },
    [dayItems]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveId(null);

      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // Find which day contains the items
      let targetDay: number | null = null;

      Object.entries(dayItems).forEach(([day, items]) => {
        if (
          items.find((item: ItineraryItem) => item.id === activeId) ||
          items.find((item: ItineraryItem) => item.id === overId)
        ) {
          targetDay = Number(day);
        }
      });

      // Handle drop on day container
      if (overId.startsWith('day-')) {
        targetDay = Number(overId.split('-')[1]);
      }

      if (targetDay === null) return;

      setDayItems((prev) => {
        const newDayItems = { ...prev };
        const dayItemsList = [...(newDayItems[targetDay!] || [])];

        const activeIndex = dayItemsList.findIndex(
          (item) => item.id === activeId
        );
        const overIndex = dayItemsList.findIndex((item) => item.id === overId);

        if (
          activeIndex !== -1 &&
          overIndex !== -1 &&
          activeIndex !== overIndex
        ) {
          const reordered = arrayMove(dayItemsList, activeIndex, overIndex);
          newDayItems[targetDay!] = reordered;
        }

        // Recalculate sortOrder for all items
        const allItems: ItineraryItem[] = [];
        Object.entries(newDayItems).forEach(([day, items]) => {
          items.forEach((item: ItineraryItem, index: number) => {
            allItems.push({
              ...item,
              dayNumber: Number(day),
              sortOrder: index + 1,
            });
          });
        });

        // Call onReorder with updated items
        onReorder(allItems);

        return newDayItems;
      });
    },
    [dayItems, onReorder]
  );

  // Update dayItems when items prop changes
  useState(() => {
    setDayItems(groupItemsByDay(items));
  });

  return {
    sensors,
    activeId,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    dayItems,
  };
}
