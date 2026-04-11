import type { Tour, TourSchedule, TourActivity } from '@tourworld/shared';

/**
 * Mock tour data for development and testing
 */
export const mockTours: Tour[] = [
  {
    id: 'tour-001',
    title: '제주도 3박 4일 힐링 여행',
    description:
      '아름다운 제주의 자연과 함께하는 힐링 여행. 한라산, 성산일출봉, 우도를 방문합니다.',
    destination: '제주도',
    duration: 4,
    price: 890000,
    currency: 'KRW',
    maxParticipants: 20,
    status: 'published',
    startDate: new Date('2025-03-01'),
    endDate: new Date('2025-03-04'),
    createdAt: new Date('2025-01-10'),
    updatedAt: new Date('2025-01-15'),
  },
  {
    id: 'tour-002',
    title: '일본 오사카 4박 5일',
    description: '오사카 성, 도톤보리, 유니버설 스튜디오를 즐기는 알찬 일정',
    destination: '일본 오사카',
    duration: 5,
    price: 1590000,
    currency: 'KRW',
    maxParticipants: 15,
    status: 'published',
    startDate: new Date('2025-04-10'),
    endDate: new Date('2025-04-14'),
    createdAt: new Date('2025-01-05'),
    updatedAt: new Date('2025-01-12'),
  },
  {
    id: 'tour-003',
    title: '베트남 다낭 5박 6일',
    description: '호이안 야경, 바나힐, 미케비치에서의 휴양을 즐기는 여행',
    destination: '베트남 다낭',
    duration: 6,
    price: 1290000,
    currency: 'KRW',
    maxParticipants: 25,
    status: 'draft',
    startDate: new Date('2025-05-15'),
    endDate: new Date('2025-05-20'),
    createdAt: new Date('2025-01-20'),
    updatedAt: new Date('2025-01-20'),
  },
  {
    id: 'tour-004',
    title: '태국 방콕-파타야 6박 7일',
    description: '왕궁, 왓포, 파타야 해변과 산호섬 투어',
    destination: '태국',
    duration: 7,
    price: 1490000,
    currency: 'KRW',
    maxParticipants: 30,
    status: 'published',
    startDate: new Date('2025-06-01'),
    endDate: new Date('2025-06-07'),
    createdAt: new Date('2025-01-08'),
    updatedAt: new Date('2025-01-18'),
  },
];

/**
 * Mock activities data
 */
const mockActivities: Record<string, TourActivity[]> = {
  'schedule-001': [
    {
      id: 'activity-001',
      scheduleId: 'schedule-001',
      time: '09:00',
      title: '인천공항 출발',
      description: '제주행 항공편 탑승',
      location: '인천국제공항',
      duration: 60,
    },
    {
      id: 'activity-002',
      scheduleId: 'schedule-001',
      time: '11:00',
      title: '제주공항 도착',
      description: '가이드 미팅 및 버스 탑승',
      location: '제주국제공항',
      duration: 30,
    },
    {
      id: 'activity-003',
      scheduleId: 'schedule-001',
      time: '12:00',
      title: '점심 식사',
      description: '제주 흑돼지 점심',
      location: '흑돼지 전문점',
      duration: 90,
    },
    {
      id: 'activity-004',
      scheduleId: 'schedule-001',
      time: '14:00',
      title: '성산일출봉 관광',
      description: '유네스코 세계자연유산 성산일출봉 등반',
      location: '성산일출봉',
      duration: 120,
    },
  ],
  'schedule-002': [
    {
      id: 'activity-005',
      scheduleId: 'schedule-002',
      time: '08:00',
      title: '호텔 조식',
      description: '호텔 뷔페 조식',
      duration: 60,
    },
    {
      id: 'activity-006',
      scheduleId: 'schedule-002',
      time: '10:00',
      title: '한라산 등반',
      description: '영실코스로 한라산 등반',
      location: '한라산 영실탐방로',
      duration: 300,
    },
  ],
};

/**
 * Mock tour schedules data
 */
export const mockSchedules: TourSchedule[] = [
  {
    id: 'schedule-001',
    tourId: 'tour-001',
    day: 1,
    title: '제주 도착 및 동부 관광',
    description: '제주 동부 지역의 주요 명소를 방문합니다.',
    activities: mockActivities['schedule-001'] || [],
  },
  {
    id: 'schedule-002',
    tourId: 'tour-001',
    day: 2,
    title: '한라산 등반',
    description: '영실코스로 한라산을 등반합니다.',
    activities: mockActivities['schedule-002'] || [],
  },
  {
    id: 'schedule-003',
    tourId: 'tour-001',
    day: 3,
    title: '서부 관광',
    description: '협재해수욕장, 오설록 등 서부 명소를 방문합니다.',
    activities: [],
  },
  {
    id: 'schedule-004',
    tourId: 'tour-001',
    day: 4,
    title: '귀환',
    description: '제주공항 출발, 인천 도착',
    activities: [],
  },
];

/**
 * Get mock tour by ID
 */
export function getMockTourById(id: string): Tour | undefined {
  return mockTours.find((tour) => tour.id === id);
}

/**
 * Get mock schedules by tour ID
 */
export function getMockSchedulesByTourId(tourId: string): TourSchedule[] {
  return mockSchedules.filter((schedule) => schedule.tourId === tourId);
}
