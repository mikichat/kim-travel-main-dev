/**
 * flight-sync-manager.js unit tests (Phase 68)
 */

// ---- global shims ----
global.window = global;

const localStorageData = {};
global.localStorage = {
  getItem: jest.fn((key) => localStorageData[key] || null),
  setItem: jest.fn((key, value) => { localStorageData[key] = value; }),
  removeItem: jest.fn((key) => { delete localStorageData[key]; }),
};

// AirportDatabase is not defined → formatAirport uses fallback logic
global.AirportDatabase = undefined;

// addEventListener stub
global.window.addEventListener = jest.fn();

require('../../js/flight-sync-manager.js');
const FlightSyncManager = global.FlightSyncManager;

beforeEach(() => {
  // Clear localStorage data
  Object.keys(localStorageData).forEach((k) => delete localStorageData[k]);
  jest.clearAllMocks();
});

// ============================================================
// parseFlightDate
// ============================================================
describe('FlightSyncManager.parseFlightDate', () => {
  test('normal date "2025.01.20(월)" → "2025-01-20"', () => {
    expect(FlightSyncManager.parseFlightDate('2025.01.20(월)')).toBe('2025-01-20');
  });

  test('date without day of week "2025.3.5"', () => {
    expect(FlightSyncManager.parseFlightDate('2025.3.5')).toBe('2025-03-05');
  });

  test('null → empty string', () => {
    expect(FlightSyncManager.parseFlightDate(null)).toBe('');
  });

  test('empty string → empty string', () => {
    expect(FlightSyncManager.parseFlightDate('')).toBe('');
  });

  test('no match returns original', () => {
    expect(FlightSyncManager.parseFlightDate('invalid')).toBe('invalid');
  });
});

// ============================================================
// formatFlightDate
// ============================================================
describe('FlightSyncManager.formatFlightDate', () => {
  test('normal date "2025-01-20" → "2025.01.20(월)"', () => {
    const result = FlightSyncManager.formatFlightDate('2025-01-20');
    expect(result).toMatch(/^2025\.01\.20\(.+\)$/);
  });

  test('null → empty string', () => {
    expect(FlightSyncManager.formatFlightDate(null)).toBe('');
  });

  test('empty string → empty string', () => {
    expect(FlightSyncManager.formatFlightDate('')).toBe('');
  });
});

// ============================================================
// extractAirportName
// ============================================================
describe('FlightSyncManager.extractAirportName', () => {
  test('"인천국제공항 (ICN)" → "인천국제공항"', () => {
    expect(FlightSyncManager.extractAirportName('인천국제공항 (ICN)')).toBe('인천국제공항');
  });

  test('no parentheses → returns as-is', () => {
    expect(FlightSyncManager.extractAirportName('인천국제공항')).toBe('인천국제공항');
  });

  test('null → empty string', () => {
    expect(FlightSyncManager.extractAirportName(null)).toBe('');
  });

  test('empty string → empty string', () => {
    expect(FlightSyncManager.extractAirportName('')).toBe('');
  });
});

// ============================================================
// extractAirportCode
// ============================================================
describe('FlightSyncManager.extractAirportCode', () => {
  test('"인천국제공항 (ICN)" → "ICN"', () => {
    expect(FlightSyncManager.extractAirportCode('인천국제공항 (ICN)')).toBe('ICN');
  });

  test('no parentheses → empty string', () => {
    expect(FlightSyncManager.extractAirportCode('인천국제공항')).toBe('');
  });

  test('null → empty string', () => {
    expect(FlightSyncManager.extractAirportCode(null)).toBe('');
  });

  test('empty string → empty string', () => {
    expect(FlightSyncManager.extractAirportCode('')).toBe('');
  });
});

// ============================================================
// formatAirport
// ============================================================
describe('FlightSyncManager.formatAirport', () => {
  test('null → empty string', () => {
    expect(FlightSyncManager.formatAirport(null)).toBe('');
  });

  test('string → returns as-is', () => {
    expect(FlightSyncManager.formatAirport('인천')).toBe('인천');
  });

  test('object with airport and code', () => {
    expect(FlightSyncManager.formatAirport({ airport: '인천국제공항', code: 'ICN' })).toBe('인천국제공항 (ICN)');
  });

  test('object with name and code', () => {
    expect(FlightSyncManager.formatAirport({ name: '나리타', code: 'NRT' })).toBe('나리타 (NRT)');
  });

  test('object with name only', () => {
    expect(FlightSyncManager.formatAirport({ airport: '인천국제공항' })).toBe('인천국제공항');
  });

  test('object with code only', () => {
    expect(FlightSyncManager.formatAirport({ code: 'ICN' })).toBe('ICN');
  });

  test('empty object → empty string', () => {
    expect(FlightSyncManager.formatAirport({})).toBe('');
  });
});

// ============================================================
// getAirlineName
// ============================================================
describe('FlightSyncManager.getAirlineName', () => {
  test('KE → 대한항공', () => {
    expect(FlightSyncManager.getAirlineName('KE')).toBe('대한항공');
  });

  test('OZ → 아시아나항공', () => {
    expect(FlightSyncManager.getAirlineName('OZ')).toBe('아시아나항공');
  });

  test('unknown code returns code itself', () => {
    expect(FlightSyncManager.getAirlineName('XX')).toBe('XX');
  });

  test('empty string → "기타"', () => {
    expect(FlightSyncManager.getAirlineName('')).toBe('기타');
  });

  test('undefined → "기타"', () => {
    expect(FlightSyncManager.getAirlineName(undefined)).toBe('기타');
  });
});

// ============================================================
// convertPassengers
// ============================================================
describe('FlightSyncManager.convertPassengers', () => {
  test('null → empty array', () => {
    expect(FlightSyncManager.convertPassengers(null)).toEqual([]);
  });

  test('passengers array with objects', () => {
    const info = { passengers: [{ name: '홍길동', index: 0 }, { name: '김철수', index: 1 }] };
    expect(FlightSyncManager.convertPassengers(info)).toEqual(['홍길동', '김철수']);
  });

  test('passengers array with strings', () => {
    const info = { passengers: ['홍길동', '김철수'] };
    expect(FlightSyncManager.convertPassengers(info)).toEqual(['홍길동', '김철수']);
  });

  test('passengers array with non-object/non-string → fallback', () => {
    const info = { passengers: [123] };
    expect(FlightSyncManager.convertPassengers(info)).toEqual(['승객 1']);
  });

  test('no passengers array, has name and totalPeople', () => {
    const info = { name: '홍길동', totalPeople: '3' };
    const result = FlightSyncManager.convertPassengers(info);
    expect(result).toEqual(['홍길동', '승객 2', '승객 3']);
  });

  test('no passengers, no name, totalPeople=2', () => {
    const info = { totalPeople: '2' };
    const result = FlightSyncManager.convertPassengers(info);
    expect(result).toEqual(['승객 1', '승객 2']);
  });

  test('empty passengers array falls through to name logic', () => {
    const info = { passengers: [], name: '대표자', totalPeople: '1' };
    const result = FlightSyncManager.convertPassengers(info);
    expect(result).toEqual(['대표자']);
  });
});

// ============================================================
// convertFromPassengers
// ============================================================
describe('FlightSyncManager.convertFromPassengers', () => {
  test('null → empty default', () => {
    const result = FlightSyncManager.convertFromPassengers(null);
    expect(result).toEqual({ name: '', phone: '', totalPeople: '0' });
  });

  test('empty array → empty default', () => {
    const result = FlightSyncManager.convertFromPassengers([]);
    expect(result).toEqual({ name: '', phone: '', totalPeople: '0' });
  });

  test('normal array picks first as representative', () => {
    const passengers = [
      { name: '홍길동', phone: '010-1234-5678' },
      { name: '김철수', phone: '010-9999-0000' },
    ];
    const result = FlightSyncManager.convertFromPassengers(passengers);
    expect(result.name).toBe('홍길동');
    expect(result.phone).toBe('010-1234-5678');
    expect(result.totalPeople).toBe('2');
  });

  test('representative flag honored', () => {
    const passengers = [
      { name: '김철수', phone: '010-1111-1111' },
      { name: '홍길동', phone: '010-2222-2222', isRepresentative: true },
    ];
    const result = FlightSyncManager.convertFromPassengers(passengers);
    expect(result.name).toBe('홍길동');
  });

  test('string passengers (no name property)', () => {
    const passengers = ['홍길동', '김철수'];
    const result = FlightSyncManager.convertFromPassengers(passengers);
    expect(result.name).toBe('');
    expect(result.totalPeople).toBe('2');
  });
});

// ============================================================
// CRUD operations (getFlights, addFlight, updateFlight, deleteFlight)
// ============================================================
describe('FlightSyncManager CRUD', () => {
  const sampleFlight = {
    id: 'FLIGHT-1',
    saveDate: '2026-01-01T00:00:00.000Z',
    name: 'Test Flight',
    flights: [],
  };

  describe('getFlights', () => {
    test('empty localStorage → empty array', () => {
      expect(FlightSyncManager.getFlights()).toEqual([]);
    });

    test('returns sorted flights (newest first)', () => {
      localStorageData[FlightSyncManager.STORAGE_KEY] = JSON.stringify([
        { id: 'F1', saveDate: '2026-01-01T00:00:00Z' },
        { id: 'F2', saveDate: '2026-02-01T00:00:00Z' },
      ]);
      const flights = FlightSyncManager.getFlights();
      expect(flights[0].id).toBe('F2');
      expect(flights[1].id).toBe('F1');
    });

    test('invalid JSON → empty array', () => {
      localStorageData[FlightSyncManager.STORAGE_KEY] = 'not-json';
      expect(FlightSyncManager.getFlights()).toEqual([]);
    });
  });

  describe('getFlightById', () => {
    test('found', () => {
      localStorageData[FlightSyncManager.STORAGE_KEY] = JSON.stringify([sampleFlight]);
      expect(FlightSyncManager.getFlightById('FLIGHT-1')).toEqual(sampleFlight);
    });

    test('not found → null', () => {
      localStorageData[FlightSyncManager.STORAGE_KEY] = JSON.stringify([sampleFlight]);
      expect(FlightSyncManager.getFlightById('FLIGHT-999')).toBeNull();
    });
  });

  describe('addFlight', () => {
    test('adds with auto-generated id if missing', () => {
      const flight = { name: 'New Flight' };
      const result = FlightSyncManager.addFlight(flight);
      expect(result.id).toMatch(/^FLIGHT-/);
      expect(result.saveDate).toBeTruthy();
    });

    test('preserves existing id', () => {
      const flight = { id: 'MY-ID', name: 'Custom' };
      const result = FlightSyncManager.addFlight(flight);
      expect(result.id).toBe('MY-ID');
    });

    test('duplicate id throws', () => {
      localStorageData[FlightSyncManager.STORAGE_KEY] = JSON.stringify([sampleFlight]);
      expect(() => FlightSyncManager.addFlight({ id: 'FLIGHT-1' })).toThrow('중복');
    });
  });

  describe('updateFlight', () => {
    test('updates existing flight', () => {
      localStorageData[FlightSyncManager.STORAGE_KEY] = JSON.stringify([sampleFlight]);
      const result = FlightSyncManager.updateFlight('FLIGHT-1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
      expect(result.id).toBe('FLIGHT-1');
      expect(result.updateDate).toBeTruthy();
    });

    test('not found throws', () => {
      localStorageData[FlightSyncManager.STORAGE_KEY] = JSON.stringify([]);
      expect(() => FlightSyncManager.updateFlight('MISSING', {})).toThrow('찾을 수 없음');
    });
  });

  describe('deleteFlight', () => {
    test('deletes existing flight', () => {
      localStorageData[FlightSyncManager.STORAGE_KEY] = JSON.stringify([sampleFlight]);
      expect(FlightSyncManager.deleteFlight('FLIGHT-1')).toBe(true);
      const stored = JSON.parse(localStorageData[FlightSyncManager.STORAGE_KEY]);
      expect(stored).toHaveLength(0);
    });

    test('not found throws', () => {
      localStorageData[FlightSyncManager.STORAGE_KEY] = JSON.stringify([]);
      expect(() => FlightSyncManager.deleteFlight('MISSING')).toThrow('찾을 수 없음');
    });
  });
});

// ============================================================
// convertToScheduleFormat
// ============================================================
describe('FlightSyncManager.convertToScheduleFormat', () => {
  test('null/empty → empty array', () => {
    expect(FlightSyncManager.convertToScheduleFormat(null)).toEqual([]);
    expect(FlightSyncManager.convertToScheduleFormat({})).toEqual([]);
    expect(FlightSyncManager.convertToScheduleFormat({ flights: [] })).toEqual([]);
  });

  test('single flight → segmentType "출발"', () => {
    const save = {
      id: 'F1',
      name: 'Test',
      pnr: 'ABC123',
      flights: [{
        flightNumber: 'KE123',
        date: '2025.01.20(월)',
        departure: { airport: '인천국제공항', code: 'ICN', time: '10:00' },
        arrival: { airport: '나리타', code: 'NRT', time: '12:30' },
      }],
      customerInfo: { name: '홍길동', totalPeople: '1' },
    };

    const result = FlightSyncManager.convertToScheduleFormat(save);
    expect(result).toHaveLength(1);
    expect(result[0].segmentType).toBe('출발');
    expect(result[0].departureDate).toBe('2025-01-20');
    expect(result[0].pnr).toBe('ABC123');
    expect(result[0].passengers).toEqual(['홍길동']);
  });

  test('multiple flights → first=출발, last=도착, middle=경유', () => {
    const save = {
      id: 'F2',
      flights: [
        { flightNumber: 'KE001', date: '2025.01.20(월)', departure: {}, arrival: {} },
        { flightNumber: 'KE002', date: '2025.01.20(월)', departure: {}, arrival: {} },
        { flightNumber: 'KE003', date: '2025.01.21(화)', departure: {}, arrival: {} },
      ],
    };

    const result = FlightSyncManager.convertToScheduleFormat(save);
    expect(result).toHaveLength(3);
    expect(result[0].segmentType).toBe('출발');
    expect(result[1].segmentType).toBe('경유');
    expect(result[2].segmentType).toBe('도착');
  });

  test('airline code extracted from flightNumber', () => {
    const save = {
      id: 'F3',
      flights: [{ flightNumber: 'KE 123', departure: {}, arrival: {} }],
    };

    const result = FlightSyncManager.convertToScheduleFormat(save);
    expect(result[0].airline).toBe('대한항공');
  });
});

// ============================================================
// convertFromScheduleFormat
// ============================================================
describe('FlightSyncManager.convertFromScheduleFormat', () => {
  test('creates new flight from schedule (no sourceId)', () => {
    const schedule = {
      flightNumber: 'OZ361',
      airline: '아시아나항공',
      departureDate: '2025-01-20',
      departureTime: '10:00',
      arrival: '나리타 (NRT)',
      arrivalTime: '12:30',
      departure: '인천 (ICN)',
      groupName: 'Test Group',
      pnr: 'DEF456',
      passengers: [],
    };

    const result = FlightSyncManager.convertFromScheduleFormat(schedule);
    expect(result.name).toBe('Test Group');
    expect(result.pnr).toBe('DEF456');
    expect(result.flights).toHaveLength(1);
    expect(result.flights[0].flightNumber).toBe('OZ361');
    expect(result.flights[0].departure.code).toBe('ICN');
    expect(result.flights[0].arrival.code).toBe('NRT');
  });

  test('updates existing flight (with sourceId)', () => {
    const existing = {
      id: 'FLIGHT-X',
      flights: [
        { flightNumber: 'KE001', departure: {}, arrival: {} },
      ],
    };
    localStorageData[FlightSyncManager.STORAGE_KEY] = JSON.stringify([existing]);

    const schedule = {
      sourceId: 'FLIGHT-X',
      sourceIndex: 0,
      flightNumber: 'KE999',
      airline: '대한항공',
      departureDate: '2025-02-01',
      departureTime: '09:00',
      arrivalTime: '11:00',
      departure: '인천 (ICN)',
      arrival: '부산 (PUS)',
    };

    const result = FlightSyncManager.convertFromScheduleFormat(schedule);
    expect(result.id).toBe('FLIGHT-X');
    expect(result.flights[0].flightNumber).toBe('KE999');
  });

  test('sourceId not found → creates new', () => {
    localStorageData[FlightSyncManager.STORAGE_KEY] = JSON.stringify([]);

    const schedule = {
      sourceId: 'NONEXISTENT',
      sourceIndex: 0,
      flightNumber: 'TW100',
      departure: '인천 (ICN)',
      arrival: '다낭 (DAD)',
      passengers: [],
    };

    const result = FlightSyncManager.convertFromScheduleFormat(schedule);
    expect(result.flights).toHaveLength(1);
    expect(result.flights[0].flightNumber).toBe('TW100');
  });
});

// ============================================================
// backup / restore / clear
// ============================================================
describe('FlightSyncManager backup/restore/clear', () => {
  test('backup returns JSON string', () => {
    localStorageData[FlightSyncManager.STORAGE_KEY] = JSON.stringify([{ id: 'F1' }]);
    const backup = FlightSyncManager.backup();
    const parsed = JSON.parse(backup);
    expect(parsed[0].id).toBe('F1');
  });

  test('restore valid JSON', () => {
    const data = JSON.stringify([{ id: 'F2', saveDate: '2026-01-01' }]);
    expect(FlightSyncManager.restore(data)).toBe(true);
    const stored = JSON.parse(localStorageData[FlightSyncManager.STORAGE_KEY]);
    expect(stored[0].id).toBe('F2');
  });

  test('restore non-array throws', () => {
    expect(() => FlightSyncManager.restore('{"id": 1}')).toThrow('올바른 형식');
  });

  test('restore invalid JSON throws', () => {
    expect(() => FlightSyncManager.restore('not-json')).toThrow();
  });

  test('clear removes storage key', () => {
    localStorageData[FlightSyncManager.STORAGE_KEY] = 'data';
    FlightSyncManager.clear();
    expect(global.localStorage.removeItem).toHaveBeenCalledWith(FlightSyncManager.STORAGE_KEY);
  });
});

// ============================================================
// getStats
// ============================================================
describe('FlightSyncManager.getStats', () => {
  test('empty flights', () => {
    const stats = FlightSyncManager.getStats();
    expect(stats.total).toBe(0);
    expect(stats.totalPassengers).toBe(0);
  });

  test('calculates stats correctly', () => {
    localStorageData[FlightSyncManager.STORAGE_KEY] = JSON.stringify([
      {
        id: 'F1',
        saveDate: '2025-01-01',
        flights: [{ airline: 'KE', date: '2025.01.20(월)' }],
        customerInfo: { totalPeople: '3' },
      },
      {
        id: 'F2',
        saveDate: '2025-01-02',
        flights: [{ airline: 'KE', date: '2025.01.25(토)' }],
        customerInfo: { totalPeople: '2' },
      },
    ]);

    const stats = FlightSyncManager.getStats();
    expect(stats.total).toBe(2);
    expect(stats.byAirline['KE']).toBe(2);
    expect(stats.totalPassengers).toBe(5);
  });
});

// ============================================================
// onFlightChange
// ============================================================
describe('FlightSyncManager.onFlightChange', () => {
  test('non-function callback throws', () => {
    expect(() => FlightSyncManager.onFlightChange('not-a-function')).toThrow('함수');
  });

  test('registers storage event listener', () => {
    const cb = jest.fn();
    FlightSyncManager.onFlightChange(cb);
    expect(global.window.addEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
  });
});

// ============================================================
// notifyChange
// ============================================================
describe('FlightSyncManager.notifyChange', () => {
  test('sets and removes sync event key', () => {
    FlightSyncManager.notifyChange('add', 'F1');
    expect(global.localStorage.setItem).toHaveBeenCalledWith(
      FlightSyncManager.SYNC_EVENT_KEY,
      expect.any(String)
    );
    expect(global.localStorage.removeItem).toHaveBeenCalledWith(FlightSyncManager.SYNC_EVENT_KEY);
  });
});
