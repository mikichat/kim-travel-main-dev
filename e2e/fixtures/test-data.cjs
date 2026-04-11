// @ts-check
/**
 * E2E 테스트 데이터
 * 모든 스펙 파일에서 공유하는 테스트 데이터
 */

const testUser = {
  email: 'admin@test.com',
  password: 'admin123',
  name: 'Test Admin',
};

const testSchedule = {
  groupName: 'E2E 테스트 단체',
  eventDate: '2026-04-15',
  destination: '제주도',
  days: '3일 2박',
  members: '30명',
  notes: 'E2E 자동화 테스트 일정',
};

const testScheduleUpdate = {
  groupName: 'E2E 테스트 단체 (수정)',
  eventDate: '2026-04-20',
  destination: '부산',
  days: '2일 1박',
  members: '35명',
  notes: '수정된 E2E 테스트 일정',
};

const testCustomer = {
  name: 'E2E 테스트 고객',
  email: 'customer@test.com',
  phone: '010-1234-5678',
  company: 'E2E 테스트 회사',
  address: '서울시 강남구',
};

const testCustomerSearch = {
  keyword: 'E2E 테스트',
};

const testInvoice = {
  invoiceNumber: 'INV-E2E-001',
  date: '2026-03-17',
  dueDate: '2026-04-17',
  clientName: 'E2E 테스트 클라이언트',
  amount: '5000000',
  description: 'E2E 자동화 테스트 인보이스',
};

const testFlight = {
  airline: 'Korean Air',
  flightNumber: 'KE001',
  departureAirport: 'ICN',
  arrivalAirport: 'CJU',
  departureTime: '09:00',
  arrivalTime: '10:30',
  aircraft: 'Boeing 737',
  seats: '150',
  price: '180000',
};

const testFlightUpdate = {
  airline: 'Asiana',
  flightNumber: 'OZ002',
  departureAirport: 'ICN',
  arrivalAirport: 'PUS',
  departureTime: '13:00',
  arrivalTime: '14:15',
  aircraft: 'Airbus A330',
  seats: '250',
  price: '200000',
};

module.exports = {
  testUser,
  testSchedule,
  testScheduleUpdate,
  testCustomer,
  testCustomerSearch,
  testInvoice,
  testFlight,
  testFlightUpdate,
};
