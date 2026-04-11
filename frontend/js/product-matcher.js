// TASK-510: ProductMatcher 모듈
// 상품 매칭 및 생성 로직

class ProductMatcher {
  /**
   * 상품 찾기 또는 생성
   * @param {Object} group - 그룹 데이터
   * @returns {Promise<Object>} 상품 정보 및 생성 여부
   */
  static async findOrCreateProduct(group) {
    try {
      if (!group.destination) {
        return {
          product: null,
          created: false,
          message: '목적지 정보가 없습니다.',
        };
      }

      // 1. API를 통한 상품 매칭
      const response = await fetch(
        `/api/products/match?destination=${encodeURIComponent(group.destination)}`
      );

      if (!response.ok) {
        throw new Error(`상품 매칭 API 오류: ${response.statusText}`);
      }

      const result = await response.json();

      // 2. 정확한 매칭
      if (result.exact_match) {
        return {
          product: result.exact_match,
          created: false,
          matchType: 'exact',
        };
      }

      // 3. 유사 매칭
      if (result.similar_matches && result.similar_matches.length > 0) {
        const best = result.similar_matches[0];

        // 유사도가 0.7 이상이면 자동 매칭
        if (best.similarity >= 0.7) {
          return {
            product: best,
            created: false,
            matchType: 'similar',
            similarity: best.similarity,
            warning: `${result.similar_matches.length}개의 유사 상품 발견, 가장 유사한 상품 선택`,
          };
        }

        // 유사도가 낮으면 사용자 확인 필요
        return {
          product: null,
          created: false,
          matchType: 'manual_required',
          suggestions: result.similar_matches,
          message: '유사한 상품이 있지만, 수동 선택이 필요합니다.',
        };
      }

      // 4. 신규 상품 생성
      const duration = this.calculateDuration(
        group.departureDate,
        group.returnDate
      );
      const newProduct = {
        id: crypto.randomUUID(),
        name: `${group.destination} ${duration}일`,
        destination: group.destination,
        duration: duration,
        price: 0, // 기본값 0원
        status: 'active',
        description: `그룹에서 자동 생성: ${group.name}`,
        created_at: new Date().toISOString(),
      };

      // 상품 생성 API 호출
      const createResponse = await fetch('/tables/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct),
      });

      if (!createResponse.ok) {
        throw new Error('상품 생성 실패');
      }

      return {
        product: newProduct,
        created: true,
        matchType: 'new',
      };
    } catch (error) {
      console.error('상품 매칭/생성 오류:', error);
      return {
        product: null,
        created: false,
        error: error.message,
      };
    }
  }

  /**
   * Levenshtein Distance를 사용한 유사도 계산
   * @param {String} str1 - 첫 번째 문자열
   * @param {String} str2 - 두 번째 문자열
   * @returns {Number} 유사도 (0~1 사이)
   */
  static calculateSimilarity(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // 교체
            matrix[i][j - 1] + 1, // 삽입
            matrix[i - 1][j] + 1 // 삭제
          );
        }
      }
    }
    const distance = matrix[str2.length][str1.length];
    const maxLength = Math.max(str1.length, str2.length);
    return 1 - distance / maxLength; // 0~1 사이 값
  }

  /**
   * 여행 일수 계산
   * @param {String} departureDate - 출발일 (YYYY-MM-DD)
   * @param {String} returnDate - 귀국일 (YYYY-MM-DD)
   * @returns {Number} 일수
   */
  static calculateDuration(departureDate, returnDate) {
    if (!departureDate || !returnDate) {
      return 0;
    }

    const departure = new Date(departureDate);
    const returnDay = new Date(returnDate);
    const diffTime = Math.abs(returnDay - departure);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1: 출발일 포함

    return diffDays;
  }

  /**
   * 목적지 정규화 (비교를 위한 전처리)
   * @param {String} destination - 목적지
   * @returns {String} 정규화된 목적지
   */
  static normalizeDestination(destination) {
    return destination
      .replace(/\s+/g, '') // 공백 제거
      .replace(/[()]/g, '') // 괄호 제거
      .toLowerCase();
  }

  /**
   * 배치 상품 매칭 (여러 그룹 처리)
   * @param {Array} groups - 그룹 목록
   * @returns {Promise<Array>} 매칭 결과 목록
   */
  static async matchBatch(groups) {
    const results = [];

    for (const group of groups) {
      const result = await this.findOrCreateProduct(group);
      results.push({
        group,
        ...result,
      });
    }

    return results;
  }

  /**
   * 매칭 결과 설명 (UI 표시용)
   * @param {Object} matchResult - findOrCreateProduct() 반환값
   * @returns {String} 설명 문자열
   */
  static explainMatch(matchResult) {
    switch (matchResult.matchType) {
      case 'exact':
        return `정확히 일치하는 상품 발견: ${matchResult.product.name}`;
      case 'similar':
        return `유사한 상품 매칭 (유사도: ${Math.round(matchResult.similarity * 100)}%): ${matchResult.product.name}`;
      case 'new':
        return `신규 상품 생성: ${matchResult.product.name} (가격: ${matchResult.product.price}원)`;
      case 'manual_required':
        return `수동 선택 필요 (유사 상품 ${matchResult.suggestions.length}개)`;
      default:
        return '매칭 실패';
    }
  }
}

// 전역 사용을 위해 window 객체에 추가
if (typeof window !== 'undefined') {
  window.ProductMatcher = ProductMatcher;
}
