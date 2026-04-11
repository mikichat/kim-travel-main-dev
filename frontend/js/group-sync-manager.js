// TASK-508: GroupSyncManager 모듈
// 그룹 명단 자동 동기화 오케스트레이션 매니저

class GroupSyncManager {
  /**
   * 그룹 전체 동기화 (고객, 달력, 상품)
   * @param {Object} group - 그룹 데이터
   * @param {Object} options - 동기화 옵션 { confirm: boolean }
   * @returns {Promise<Object>} 동기화 결과
   */
  static async syncGroup(group, options = {}) {
    try {
      const { confirm = true } = options;

      // 1. 동기화 미리보기
      const preview = await this.previewSync(group);

      // 2. 확인 다이얼로그 표시 (옵션)
      if (confirm) {
        const userConfirmed = await this.showSyncConfirmDialog(preview);
        if (!userConfirmed) {
          return { cancelled: true };
        }
      }

      // 3. 동기화 진행 표시
      this.showSyncProgress(0, 3, '고객 동기화 준비 중...');

      // 4. 고객 동기화
      this.showSyncProgress(1, 3, '고객 동기화 중...');
      const customerResult = await this.syncCustomers(group);

      // 5. 달력 동기화
      this.showSyncProgress(2, 3, '달력 동기화 중...');
      const calendarResult = await this.syncToCalendar(group);

      // 6. 상품 매칭/생성
      this.showSyncProgress(3, 3, '상품 매칭 중...');
      const productResult = await this.syncProduct(group);

      // 7. 완료
      this.hideSyncProgress();

      // 8. 결과 표시
      const result = {
        customers: customerResult,
        calendar: calendarResult,
        product: productResult,
      };
      this.showSyncResult(result);

      return result;
    } catch (error) {
      this.hideSyncProgress();
      this.showSyncError(error);
      throw error;
    }
  }

  /**
   * 동기화 미리보기
   * @param {Object} group - 그룹 데이터
   * @returns {Promise<Object>} 미리보기 정보
   */
  static async previewSync(group) {
    const members = group.members.filter((m) => m.nameKor || m.nameEn);

    const preview = {
      newCustomers: 0,
      existingCustomers: 0,
      totalMembers: members.length,
      departureDate: group.departureDate,
      returnDate: group.returnDate,
      destination: group.destination,
      groupName: group.name,
    };

    // API를 통한 검증
    try {
      const validation = await fetchJSON('/api/sync/validate', {
        method: 'POST',
        body: JSON.stringify({ members }),
      });
      preview.newCustomers = validation.valid.length;
      preview.existingCustomers = validation.duplicates.length;
    } catch (error) {
      console.error('검증 오류:', error);
      // 로컬 추정
      preview.newCustomers = members.length;
      preview.existingCustomers = 0;
    }

    // 상품 매칭 확인
    if (group.destination) {
      const product = await this.findMatchingProduct(group.destination);
      preview.productAction = product
        ? `기존 상품 연결: ${product.name}`
        : `신규 상품 생성: ${group.destination}`;
    }

    preview.totalOperations = 3;
    return preview;
  }

  /**
   * 고객 배치 동기화
   * @param {Object} group - 그룹 데이터
   * @returns {Promise<Object>} 동기화 결과
   */
  static async syncCustomers(group) {
    const members = group.members.filter((m) => m.nameKor || m.nameEn);

    // 필드명 변환: camelCase → snake_case (백엔드 호환)
    const convertedMembers = members.map((m) => ({
      nameKor: m.nameKor || m.name_kor || '',
      nameEn: m.nameEn || m.name_eng || '',
      passportNo: m.passportNo || m.passport_number || '',
      birthDate: m.birthDate || m.birth_date || '',
      passportExpire: m.passportExpire || m.passport_expiry || '',
      phone: m.phone || '',
      gender: m.gender || 'M',
    }));

    return await fetchJSON('/api/sync/customers/batch', {
      method: 'POST',
      body: JSON.stringify({
        group_id: group.id,
        group_name: group.name,
        departure_date: group.departureDate || group.departure_date || '',
        return_date: group.returnDate || group.return_date || '',
        destination: group.destination || '',
        members: convertedMembers,
      }),
    });
  }

  /**
   * 달력 동기화
   * @param {Object} group - 그룹 데이터
   * @returns {Promise<Object>} 동기화 결과
   */
  static async syncToCalendar(_group) {
    // 그룹이 이미 DB에 저장되어 있으므로, 달력만 갱신
    return {
      success: true,
      message: '달력이 자동으로 갱신됩니다.',
    };
  }

  /**
   * 상품 매칭/생성
   * @param {Object} group - 그룹 데이터
   * @returns {Promise<Object>} 상품 정보
   */
  static async syncProduct(group) {
    if (!group.destination) {
      return { message: '목적지 정보 없음' };
    }

    const product = await this.findMatchingProduct(group.destination);

    if (product) {
      return { matched: true, product };
    } else {
      // 신규 상품 생성 로직 (선택적)
      return {
        matched: false,
        message: `신규 상품 생성 필요: ${group.destination}`,
      };
    }
  }

  /**
   * 기존 고객 찾기 (클라이언트 측 - 참고용)
   * @param {Object} member - 멤버 데이터
   * @returns {Promise<Object>} 검색 결과
   */
  static async findExistingCustomer(_member) {
    // 서버 API를 통한 검증 권장
    // 클라이언트 측에서는 간단한 확인만 수행
    return { found: false };
  }

  /**
   * 상품 매칭 찾기
   * @param {String} destination - 목적지
   * @returns {Promise<Object|null>} 매칭된 상품 또는 null
   */
  static async findMatchingProduct(destination) {
    try {
      const result = await fetchJSON(
        `/api/products/match?destination=${encodeURIComponent(destination)}`
      );
      return (
        result.exact_match ||
        (result.similar_matches && result.similar_matches[0]) ||
        null
      );
    } catch (error) {
      console.error('상품 매칭 오류:', error);
      return null;
    }
  }

  /**
   * 동기화 확인 다이얼로그 표시
   * @param {Object} preview - 미리보기 정보
   * @returns {Promise<boolean>} 사용자 확인 여부
   */
  static async showSyncConfirmDialog(preview) {
    return new Promise((resolve) => {
      const existingDialog = document.getElementById('syncConfirmDialog');
      if (existingDialog) {
        existingDialog.remove();
      }

      const dialog = document.createElement('div');
      dialog.id = 'syncConfirmDialog';
      dialog.className = 'sync-confirm-dialog';
      dialog.innerHTML = `
                <div class="sync-confirm-content">
                    <h3>🔄 동기화 확인</h3>
                    <div class="sync-preview">
                        <div class="preview-item">
                            <span class="icon">👥</span>
                            <span class="label">고객 생성:</span>
                            <span class="value">${preview.newCustomers}명</span>
                        </div>
                        <div class="preview-item">
                            <span class="icon">🔄</span>
                            <span class="label">고객 업데이트:</span>
                            <span class="value">${preview.existingCustomers}명</span>
                        </div>
                        <div class="preview-item">
                            <span class="icon">📅</span>
                            <span class="label">달력 일정:</span>
                            <span class="value">${preview.departureDate} ~ ${preview.returnDate}</span>
                        </div>
                        ${
                          preview.productAction
                            ? `
                        <div class="preview-item">
                            <span class="icon">🎯</span>
                            <span class="label">상품:</span>
                            <span class="value">${preview.productAction}</span>
                        </div>
                        `
                            : ''
                        }
                    </div>
                    <div class="dialog-actions">
                        <button class="btn btn-secondary" id="cancelSyncBtn">취소</button>
                        <button class="btn btn-primary" id="confirmSyncBtn">동기화 시작</button>
                    </div>
                </div>
            `;

      document.body.appendChild(dialog);

      document.getElementById('cancelSyncBtn').addEventListener('click', () => {
        dialog.remove();
        resolve(false);
      });

      document
        .getElementById('confirmSyncBtn')
        .addEventListener('click', () => {
          dialog.remove();
          resolve(true);
        });
    });
  }

  /**
   * 동기화 진행 표시
   * @param {Number} current - 현재 진행 단계
   * @param {Number} total - 전체 단계
   * @param {String} message - 진행 메시지
   */
  static showSyncProgress(current, total, message) {
    let progressEl = document.getElementById('syncProgress');

    if (!progressEl) {
      progressEl = document.createElement('div');
      progressEl.id = 'syncProgress';
      progressEl.className = 'sync-progress';
      document.body.appendChild(progressEl);
    }

    const percent = Math.round((current / total) * 100);

    progressEl.innerHTML = `
            <h4>🔄 동기화 진행 중...</h4>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${percent}%"></div>
            </div>
            <p class="progress-text">${current} / ${total}</p>
            <p class="progress-step">${message}</p>
        `;
  }

  /**
   * 동기화 진행 숨기기
   */
  static hideSyncProgress() {
    const progressEl = document.getElementById('syncProgress');
    if (progressEl) {
      progressEl.remove();
    }
  }

  /**
   * 동기화 결과 표시
   * @param {Object} result - 동기화 결과
   */
  static showSyncResult(result) {
    const { customers, calendar: _calendar, product: _product } = result;

    const dialog = document.createElement('div');
    dialog.className = 'sync-result-dialog';
    dialog.innerHTML = `
            <div class="sync-result-content">
                <h3>✅ 동기화 완료</h3>
                <table>
                    <tr>
                        <td>고객 생성:</td>
                        <td><strong>${customers.created}명</strong></td>
                    </tr>
                    <tr>
                        <td>고객 업데이트:</td>
                        <td><strong>${customers.updated}명</strong></td>
                    </tr>
                    <tr>
                        <td>건너뜀:</td>
                        <td>${customers.skipped}명</td>
                    </tr>
                    <tr style="${customers.errors.length > 0 ? 'color: #f44336;' : ''}">
                        <td>오류:</td>
                        <td><strong>${customers.errors.length}건</strong></td>
                    </tr>
                </table>

                ${
                  customers.errors.length > 0
                    ? `
                <details>
                    <summary>오류 상세보기</summary>
                    <ul class="error-list">
                        ${customers.errors
                          .map(
                            (err) =>
                              `<li>${err.member.nameKor || err.member.nameEn}: ${err.errors.join(', ')}</li>`
                          )
                          .join('')}
                    </ul>
                </details>
                `
                    : ''
                }

                <button class="btn btn-primary" onclick="this.parentElement.parentElement.remove()">확인</button>
            </div>
        `;

    document.body.appendChild(dialog);
  }

  /**
   * 동기화 오류 표시
   * @param {Error} error - 오류 객체
   */
  static showSyncError(error) {
    if (typeof showToast === 'function') {
      showToast(`동기화 오류: ${error.message}`, 'error');
    }
  }

  /**
   * TASK-515: 고객 → 그룹 역동기화
   * @param {String} customerId - 고객 ID
   * @param {Object} customerData - 고객 데이터
   */
  static async syncCustomerToGroup(customerId, customerData) {
    try {
      // 1. DB에서 그룹 데이터 가져오기
      const groupsResult = await fetchJSON('/tables/groups');
      const groups = groupsResult.data || groupsResult;

      if (!groups || groups.length === 0) {
        return;
      }

      let _updated = false;

      // 2. 각 그룹에서 해당 고객 찾기 및 업데이트
      for (const group of groups) {
        let members = [];
        try {
          members =
            typeof group.members === 'string'
              ? JSON.parse(group.members)
              : group.members || [];
        } catch (_e) {
          continue;
        }

        let groupUpdated = false;
        members.forEach((member) => {
          // 여권번호 또는 이름으로 매칭
          const isMatch =
            (customerData.passport_number &&
              member.passportNo === customerData.passport_number) ||
            (customerData.name_kor &&
              member.nameKor === customerData.name_kor) ||
            (customerData.name_eng && member.nameEn === customerData.name_eng);
          if (isMatch) {
            // 충돌 해결 (ConflictResolver 사용)
            const shouldUpdate = window.ConflictResolver
              ? ConflictResolver.resolve(customerData, member).source ===
                'customer'
              : true;

            if (shouldUpdate) {
              member.nameKor = customerData.name_kor || member.nameKor;
              member.nameEn = customerData.name_eng || member.nameEn;
              member.birthDate = customerData.birth_date || member.birthDate;
              member.passportExpire =
                customerData.passport_expiry || member.passportExpire;
              member.gender = customerData.gender || member.gender;
              member.phone = customerData.phone || member.phone;
              member.updatedAt = new Date().toISOString();
              groupUpdated = true;
              _updated = true;
            }
          }
        });

        // 변경된 그룹만 DB 업데이트
        if (groupUpdated) {
          await fetchJSON(`/tables/groups/${group.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              ...group,
              members: JSON.stringify(members),
            }),
          });
        }
      }
    } catch (error) {
      console.error('❌ 역동기화 오류:', error);
    }
  }

  /**
   * 그룹 데이터를 데이터베이스에 동기화
   * @param {Array} groups - 그룹 목록
   */
  static async syncGroupsToDatabase(groups) {
    try {
      // 각 그룹을 순차적으로 업데이트
      for (const group of groups) {
        await fetchJSON(`/tables/groups/${group.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...group,
            members: JSON.stringify(group.members),
          }),
        });
      }
    } catch (error) {
      console.error('❌ 그룹 DB 동기화 오류:', error);
    }
  }
}

// 전역 사용을 위해 window 객체에 추가
if (typeof window !== 'undefined') {
  window.GroupSyncManager = GroupSyncManager;
}
