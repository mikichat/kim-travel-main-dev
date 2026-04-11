// TASK-509: ConflictResolver 모듈
// 데이터 충돌 해결 로직

class ConflictResolver {
  /**
   * 고객 데이터와 멤버 데이터 충돌 해결
   * @param {Object} customerData - 고객 관리의 데이터
   * @param {Object} memberData - 그룹 명단의 데이터
   * @returns {Object} 해결된 데이터
   */
  static resolve(customerData, memberData) {
    const customerTime = new Date(
      customerData.last_modified || customerData.created_at || 0
    );
    const memberTime = new Date(
      memberData.updatedAt || memberData.createdAt || 0
    );

    // 5초 이내 변경 → 같은 트랜잭션으로 간주, 병합
    const timeDiff = Math.abs(customerTime - memberTime);
    if (timeDiff < 5000) {
      return {
        source: 'merged',
        data: this.mergeData(customerData, memberData),
      };
    }

    // 최근 데이터 우선
    if (customerTime > memberTime) {
      return {
        source: 'customer',
        data: customerData,
      };
    } else {
      return {
        source: 'member',
        data: this.memberToCustomer(memberData),
      };
    }
  }

  /**
   * 두 데이터 병합 (빈 필드만 채우기 - Null Coalescing)
   * @param {Object} customer - 고객 데이터
   * @param {Object} member - 멤버 데이터
   * @returns {Object} 병합된 데이터
   */
  static mergeData(customer, member) {
    return {
      id: customer.id,
      name_kor: customer.name_kor || member.nameKor || '',
      name_eng: customer.name_eng || member.nameEn || '',
      passport_number: customer.passport_number || member.passportNo || '',
      birth_date: customer.birth_date || member.birthDate || '',
      passport_expiry: customer.passport_expiry || member.passportExpire || '',
      phone: customer.phone || member.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      travel_history: customer.travel_history || '',
      notes: customer.notes || '',
      sync_source: 'merged',
      sync_group_id: member.groupId || customer.sync_group_id,
      is_active: customer.is_active !== undefined ? customer.is_active : 1,
      last_modified: new Date().toISOString(),
    };
  }

  /**
   * 멤버 데이터를 고객 데이터 형식으로 변환
   * @param {Object} member - 멤버 데이터
   * @returns {Object} 고객 형식 데이터
   */
  static memberToCustomer(member) {
    return {
      name_kor: member.nameKor || '',
      name_eng: member.nameEn || '',
      passport_number: member.passportNo || '',
      birth_date: member.birthDate || '',
      passport_expiry: member.passportExpire || '',
      phone: member.phone || '',
      email: '',
      address: '',
      travel_history: '',
      notes: '',
      sync_source: 'group_roster',
      sync_group_id: member.groupId,
      is_active: 1,
      last_modified: new Date().toISOString(),
    };
  }

  /**
   * 고객 데이터를 멤버 데이터 형식으로 변환
   * @param {Object} customer - 고객 데이터
   * @returns {Object} 멤버 형식 데이터
   */
  static customerToMember(customer) {
    return {
      nameKor: customer.name_kor || '',
      nameEn: customer.name_eng || '',
      passportNo: customer.passport_number || '',
      birthDate: customer.birth_date || '',
      passportExpire: customer.passport_expiry || '',
      phone: customer.phone || '',
      gender: customer.gender || '',
      updatedAt:
        customer.last_modified ||
        customer.created_at ||
        new Date().toISOString(),
      groupId: customer.sync_group_id,
    };
  }

  /**
   * 충돌 해결 전략 설명 (디버깅/로그용)
   * @param {Object} resolution - resolve() 함수의 반환값
   * @returns {String} 충돌 해결 설명
   */
  static explainResolution(resolution) {
    switch (resolution.source) {
      case 'customer':
        return '고객 관리 데이터가 최신으로 적용되었습니다.';
      case 'member':
        return '그룹 명단 데이터가 최신으로 적용되었습니다.';
      case 'merged':
        return '두 데이터가 병합되었습니다 (5초 이내 동시 변경 감지).';
      default:
        return '알 수 없는 해결 방법';
    }
  }

  /**
   * 배치 충돌 해결 (여러 멤버 처리)
   * @param {Array} customers - 고객 목록
   * @param {Array} members - 멤버 목록
   * @returns {Array} 해결된 데이터 목록
   */
  static resolveBatch(customers, members) {
    const results = [];

    for (const member of members) {
      // 여권번호로 고객 찾기
      const customer = customers.find(
        (c) =>
          c.passport_number === member.passportNo ||
          (c.name_kor === member.nameKor && c.birth_date === member.birthDate)
      );

      if (customer) {
        const resolution = this.resolve(customer, member);
        results.push({
          member,
          customer,
          resolution,
          action: 'update',
        });
      } else {
        results.push({
          member,
          customer: null,
          resolution: { source: 'member', data: this.memberToCustomer(member) },
          action: 'create',
        });
      }
    }

    return results;
  }
}

// 전역 사용을 위해 window 객체에 추가
if (typeof window !== 'undefined') {
  window.ConflictResolver = ConflictResolver;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ConflictResolver };
}
