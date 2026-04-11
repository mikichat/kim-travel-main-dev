// js/modules/state.js
export const state = {
  customers: [],
  products: [],
  bookings: [],
  notifications: [],
  todos: [],
  groups: [], // 단체 데이터
  schedules: [], // 일정 데이터
  currentPage: 'dashboard',
  currentMonth: new Date(),
  charts: {},
  securityMode: true, // 보안 모드 (기본값: 활성화)
  selectedCustomers: [], // 선택된 고객 ID 배열

  // 고객 관리 페이지네이션/탭 상태
  customerPage: 1, // 현재 페이지 (1부터 시작)
  customerPageSize: 20, // 페이지당 표시 수
  customerTab: 'all', // 현재 탭 ('all' | 'group')
  selectedGroup: null, // 단체별 조회에서 선택된 단체명
  groupFilter: 'active', // 단체 필터 ('active' | 'past')
  productFilter: 'active', // 상품 필터 ('active' | 'past')
  filteredCustomers: [], // 검색 필터링된 고객 목록
};
