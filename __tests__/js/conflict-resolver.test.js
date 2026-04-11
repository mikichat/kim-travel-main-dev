const { ConflictResolver } = require('../../js/conflict-resolver.js');

describe('ConflictResolver.resolve', () => {
  test('customer가 최신이면 customer 데이터 반환', () => {
    const customer = {
      name_kor: '홍길동',
      last_modified: '2026-02-20T12:00:00Z',
    };
    const member = { nameKor: '홍길동', updatedAt: '2026-02-19T12:00:00Z' };

    const result = ConflictResolver.resolve(customer, member);
    expect(result.source).toBe('customer');
    expect(result.data).toBe(customer);
  });

  test('member가 최신이면 member → customer 변환 반환', () => {
    const customer = {
      name_kor: '홍길동',
      last_modified: '2026-02-19T12:00:00Z',
    };
    const member = { nameKor: '홍길동', updatedAt: '2026-02-20T12:00:00Z' };

    const result = ConflictResolver.resolve(customer, member);
    expect(result.source).toBe('member');
    expect(result.data.sync_source).toBe('group_roster');
  });

  test('5초 이내 변경 → merged', () => {
    const now = new Date();
    const customer = { name_kor: '홍길동', last_modified: now.toISOString() };
    const member = {
      nameKor: '홍길동',
      updatedAt: new Date(now.getTime() + 3000).toISOString(),
    };

    const result = ConflictResolver.resolve(customer, member);
    expect(result.source).toBe('merged');
  });

  test('5초 초과 변경 → merged 아님', () => {
    const now = new Date();
    const customer = { name_kor: '홍길동', last_modified: now.toISOString() };
    const member = {
      nameKor: '홍길동',
      updatedAt: new Date(now.getTime() + 6000).toISOString(),
    };

    const result = ConflictResolver.resolve(customer, member);
    expect(result.source).not.toBe('merged');
  });

  test('타임스탬프 없으면 epoch(0)으로 처리', () => {
    const customer = { name_kor: '홍길동' };
    const member = { nameKor: '홍길동' };

    const result = ConflictResolver.resolve(customer, member);
    // 둘 다 0 → 5초 이내 → merged
    expect(result.source).toBe('merged');
  });
});

describe('ConflictResolver.mergeData', () => {
  test('customer 우선, 빈 필드는 member에서 채움', () => {
    const customer = {
      id: 1,
      name_kor: '홍길동',
      name_eng: '',
      phone: '010-1234-5678',
    };
    const member = {
      nameKor: '홍길동2',
      nameEn: 'Hong',
      phone: '010-0000-0000',
    };

    const merged = ConflictResolver.mergeData(customer, member);
    expect(merged.id).toBe(1);
    expect(merged.name_kor).toBe('홍길동'); // customer 우선
    expect(merged.name_eng).toBe('Hong'); // customer 빈값 → member
    expect(merged.phone).toBe('010-1234-5678'); // customer 우선
    expect(merged.sync_source).toBe('merged');
  });

  test('모든 필드 null/빈값이면 빈 문자열', () => {
    const customer = { id: 2 };
    const member = {};

    const merged = ConflictResolver.mergeData(customer, member);
    expect(merged.name_kor).toBe('');
    expect(merged.name_eng).toBe('');
    expect(merged.passport_number).toBe('');
  });

  test('last_modified는 현재 시간', () => {
    const before = new Date();
    const merged = ConflictResolver.mergeData({ id: 1 }, {});
    const after = new Date();

    const mergedTime = new Date(merged.last_modified);
    expect(mergedTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(mergedTime.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});

describe('ConflictResolver.memberToCustomer', () => {
  test('멤버 필드 → 고객 필드 매핑', () => {
    const member = {
      nameKor: '홍길동',
      nameEn: 'Hong Gildong',
      passportNo: 'M12345678',
      birthDate: '1990-01-01',
      passportExpire: '2030-12-31',
      phone: '010-1234-5678',
      groupId: 'G001',
    };

    const customer = ConflictResolver.memberToCustomer(member);
    expect(customer.name_kor).toBe('홍길동');
    expect(customer.name_eng).toBe('Hong Gildong');
    expect(customer.passport_number).toBe('M12345678');
    expect(customer.birth_date).toBe('1990-01-01');
    expect(customer.passport_expiry).toBe('2030-12-31');
    expect(customer.phone).toBe('010-1234-5678');
    expect(customer.sync_source).toBe('group_roster');
    expect(customer.sync_group_id).toBe('G001');
    expect(customer.is_active).toBe(1);
  });

  test('빈 멤버 → 빈 문자열 기본값', () => {
    const customer = ConflictResolver.memberToCustomer({});
    expect(customer.name_kor).toBe('');
    expect(customer.name_eng).toBe('');
    expect(customer.passport_number).toBe('');
  });
});

describe('ConflictResolver.customerToMember', () => {
  test('고객 필드 → 멤버 필드 매핑', () => {
    const customer = {
      name_kor: '홍길동',
      name_eng: 'Hong Gildong',
      passport_number: 'M12345678',
      birth_date: '1990-01-01',
      passport_expiry: '2030-12-31',
      phone: '010-1234-5678',
      gender: 'M',
      last_modified: '2026-02-20T12:00:00Z',
      sync_group_id: 'G001',
    };

    const member = ConflictResolver.customerToMember(customer);
    expect(member.nameKor).toBe('홍길동');
    expect(member.nameEn).toBe('Hong Gildong');
    expect(member.passportNo).toBe('M12345678');
    expect(member.birthDate).toBe('1990-01-01');
    expect(member.passportExpire).toBe('2030-12-31');
    expect(member.phone).toBe('010-1234-5678');
    expect(member.gender).toBe('M');
    expect(member.groupId).toBe('G001');
  });

  test('gender 누락 시 빈 문자열', () => {
    const member = ConflictResolver.customerToMember({});
    expect(member.gender).toBe('');
  });
});

describe('ConflictResolver.explainResolution', () => {
  test('customer source 설명', () => {
    expect(ConflictResolver.explainResolution({ source: 'customer' })).toBe(
      '고객 관리 데이터가 최신으로 적용되었습니다.'
    );
  });

  test('member source 설명', () => {
    expect(ConflictResolver.explainResolution({ source: 'member' })).toBe(
      '그룹 명단 데이터가 최신으로 적용되었습니다.'
    );
  });

  test('merged source 설명', () => {
    expect(ConflictResolver.explainResolution({ source: 'merged' })).toBe(
      '두 데이터가 병합되었습니다 (5초 이내 동시 변경 감지).'
    );
  });

  test('알 수 없는 source', () => {
    expect(ConflictResolver.explainResolution({ source: 'unknown' })).toBe(
      '알 수 없는 해결 방법'
    );
  });
});

describe('ConflictResolver.resolveBatch', () => {
  test('여권번호로 매칭', () => {
    const customers = [
      {
        passport_number: 'M12345678',
        name_kor: '홍길동',
        last_modified: '2026-02-20T12:00:00Z',
      },
    ];
    const members = [
      {
        passportNo: 'M12345678',
        nameKor: '홍길동',
        updatedAt: '2026-02-19T12:00:00Z',
      },
    ];

    const results = ConflictResolver.resolveBatch(customers, members);
    expect(results).toHaveLength(1);
    expect(results[0].action).toBe('update');
    expect(results[0].customer).toBeTruthy();
  });

  test('이름+생년 매칭', () => {
    const customers = [
      {
        passport_number: '',
        name_kor: '홍길동',
        birth_date: '1990-01-01',
        last_modified: '2026-02-20T12:00:00Z',
      },
    ];
    const members = [
      {
        passportNo: 'NEW123',
        nameKor: '홍길동',
        birthDate: '1990-01-01',
        updatedAt: '2026-02-19T12:00:00Z',
      },
    ];

    const results = ConflictResolver.resolveBatch(customers, members);
    expect(results).toHaveLength(1);
    expect(results[0].action).toBe('update');
  });

  test('매칭 없으면 create', () => {
    const customers = [];
    const members = [
      {
        passportNo: 'NEW999',
        nameKor: '새사람',
        updatedAt: '2026-02-20T12:00:00Z',
      },
    ];

    const results = ConflictResolver.resolveBatch(customers, members);
    expect(results).toHaveLength(1);
    expect(results[0].action).toBe('create');
    expect(results[0].customer).toBeNull();
  });

  test('여러 멤버 처리', () => {
    const customers = [
      {
        passport_number: 'M111',
        name_kor: '김철수',
        last_modified: '2026-02-20T12:00:00Z',
      },
    ];
    const members = [
      {
        passportNo: 'M111',
        nameKor: '김철수',
        updatedAt: '2026-02-19T12:00:00Z',
      },
      {
        passportNo: 'M222',
        nameKor: '이영희',
        updatedAt: '2026-02-19T12:00:00Z',
      },
    ];

    const results = ConflictResolver.resolveBatch(customers, members);
    expect(results).toHaveLength(2);
    expect(results[0].action).toBe('update');
    expect(results[1].action).toBe('create');
  });
});
