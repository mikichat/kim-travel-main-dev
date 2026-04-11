// js/modules/iframe-bridge.js
// Extracted from index.html inline scripts.
// Contains: postMessage handling, customer sync, wizard navigation, auth IIFE, 401 interceptor.

const { showToast, showConfirmModal } = window;
import { sanitizeHtml } from './ui.js';
import { formatPhoneNumber } from './eventHandlers.js';

// ============================================
// Module-scoped variables
// ============================================
let processingQueue = Promise.resolve();
let currentWizardStep = 1;
const totalWizardSteps = 3;

/**
 * 여권 이미지 확대 (새 탭)
 */
// eslint-disable-next-line no-unused-vars
function openPassportLightbox(imgSrc) {
  const newTab = window.open('', '_blank');
  newTab.document.write(`<!DOCTYPE html>
        <html><head><title>여권 사본</title>
        <style>body{margin:0;background:#1a1a1a;display:flex;align-items:center;justify-content:center;min-height:100vh;}
        img{max-width:100%;max-height:100vh;object-fit:contain;}</style></head>
        <body><img src="${imgSrc}" alt="여권 사본"></body></html>`);
  newTab.document.close();
}

/**
 * 여권 사본 다운로드
 */
// eslint-disable-next-line no-unused-vars
function downloadPassportFile(fileName, fileData) {
  const link = document.createElement('a');
  link.download = fileName;
  link.href = fileData;
  link.click();
}

/**
 * 고객을 데이터베이스에 추가하는 함수
 */
async function addCustomerToDatabase(customerData) {
  try {
    // 서버 API를 통해 고객 데이터 가져오기
    const response = await fetch('/tables/customers');
    const customersResult = await response.json();
    const customers = customersResult.data || customersResult;

    // 중복 확인 (여권번호 기준 - 비어있지 않은 경우만)
    const passportNum = (
      customerData.passportNumber ||
      customerData.여권번호 ||
      ''
    ).trim();
    if (passportNum) {
      const exists = customers.some((c) => c.passport_number === passportNum);
      if (exists) {
        return;
      }
    } else {
      // 여권번호가 없는 경우 이름으로 중복 체크
      const nameKor = customerData.nameKor || customerData.한글명 || '';
      const nameEng = customerData.nameEng || customerData.영문명 || '';

      if (nameKor || nameEng) {
        const exists = customers.some(
          (c) =>
            (nameKor && c.name_kor === nameKor) ||
            (nameEng && c.name_eng === nameEng)
        );
        if (exists) {
          return;
        }
      }
    }

    // 여권번호 처리 (빈 문자열은 null로 변환)
    const passportNumber =
      customerData.passportNumber || customerData.여권번호 || '';
    const finalPassportNumber =
      passportNumber.trim() === '' ? null : passportNumber.trim();

    // 여행지역과 여행이력 동기화 로직
    const groupName = customerData.groupName || customerData.단체명 || '';

    // 기존 고객인지 확인 (여권번호로)
    const existingCustomer = passportNum
      ? customers.find((c) => c.passport_number === passportNum)
      : null;

    let travelHistory =
      customerData.travelHistory ||
      (existingCustomer ? existingCustomer.travel_history : '') ||
      '';

    // 전달받은 여행지역 우선 사용, 없으면 DB에서 단체 정보 조회
    let travelRegion = customerData.destination || customerData.여행지역 || '';
    if (!travelRegion && groupName) {
      try {
        const groupsRes = await fetch('/tables/groups');
        const groupsResult = await groupsRes.json();
        const groups = groupsResult.data || groupsResult;
        const group = groups.find((g) => g.name === groupName);
        if (group && group.destination) {
          travelRegion = group.destination;
        }
      } catch (error) {
        console.warn('단체 정보 조회 실패:', error);
      }
    }

    // 출발일 정보 가져오기
    const departureDate =
      customerData.departureDate || customerData.출발일 || '';

    // 규칙 1: 단체명단에서 고객 추가/수정 시
    if (travelRegion) {
      if (existingCustomer) {
        // 기존 고객의 출발일/여행지역 비교 및 자동 추가
        const existingDepartureDate = existingCustomer.departure_date || '';
        const existingTravelRegion = existingCustomer.travel_region || '';

        // 여행이력에서 기존 항목 추출
        const existingHistory = existingCustomer.travel_history || '';
        const historyItems = existingHistory
          ? existingHistory.split(',').map((item) => item.trim())
          : [];

        // 조건 체크
        const sameDepartureDate = existingDepartureDate === departureDate;
        const sameTravelRegion = existingTravelRegion === travelRegion;

        let shouldAddToHistory = false;
        let newHistoryItem = '';

        if (departureDate) {
          // 출발일이 있으면 "여행지역(출발일)" 형식
          newHistoryItem = `${travelRegion}(${departureDate})`;

          if (sameDepartureDate && !sameTravelRegion) {
            // 조건 1: 출발일 동일 + 여행지역 다름 -> 추가
            shouldAddToHistory = true;
          } else if (!sameDepartureDate && sameTravelRegion) {
            // 조건 2: 출발일 다름 + 여행지역 동일 -> 추가
            shouldAddToHistory = true;
          } else if (!sameDepartureDate && !sameTravelRegion) {
            // 조건 3: 모두 다름 -> 추가
            shouldAddToHistory = true;
          }
          // 조건 4: 모두 동일 -> 추가하지 않음
        } else {
          // 출발일이 없으면 "여행지역"만
          newHistoryItem = travelRegion;
          if (!sameTravelRegion) {
            shouldAddToHistory = true;
          }
        }

        // 중복 체크: 동일한 항목이 이미 있으면 추가하지 않음
        if (
          shouldAddToHistory &&
          !historyItems.some((item) => item === newHistoryItem)
        ) {
          travelHistory = travelHistory
            ? `${newHistoryItem}, ${travelHistory}`
            : newHistoryItem;
        } else {
          // 기존 여행이력 유지
          travelHistory = existingHistory;
        }

        // 단체명단의 여행지역을 travel_region에 항상 업데이트
        // 단체명단의 destination이 있으면 고객의 travel_region에 동일하게 설정
        if (!travelRegion) {
          // 단체명단에 여행지역이 없으면 기존 값 유지
          travelRegion = existingTravelRegion || '';
        }
      } else {
        // 새 고객인 경우
        if (departureDate) {
          const newHistoryItem = `${travelRegion}(${departureDate})`;
          travelHistory = travelHistory
            ? `${newHistoryItem}, ${travelHistory}`
            : newHistoryItem;
        } else {
          travelHistory = travelHistory
            ? `${travelRegion}, ${travelHistory}`
            : travelRegion;
        }
      }
    }

    // 규칙 3: 여행이력에서 여행지역 추출 (가장 최근 항목)
    if (!travelRegion && travelHistory) {
      const firstItem = travelHistory.split(',')[0].trim();
      const match = firstItem.match(/^([^(]+)/);
      if (match) {
        travelRegion = match[1].trim();
      }
    }

    // 서버 API 형식에 맞춰 데이터 변환
    const newCustomer = {
      name_kor: customerData.nameKor || customerData.한글명 || '',
      name_eng: customerData.nameEng || customerData.영문명 || '',
      passport_number: finalPassportNumber,
      birth_date: customerData.birthDate || customerData.생년월일 || '',
      passport_expiry:
        customerData.passportExpiry || customerData.여권만료일 || '',
      phone: formatPhoneNumber(customerData.phone || customerData.연락처 || ''),
      email: customerData.email || customerData.이메일 || '',
      address: customerData.address || '',
      group_name: groupName || '',
      departure_date: departureDate || '',
      travel_region: travelRegion || '',
      travel_history: travelHistory,
      gender: customerData.gender || customerData.성별 || '',
      notes: customerData.notes || '',
      passport_file_name: null,
      passport_file_data: null,
    };

    // 서버 API를 통해 고객 추가
    const createResponse = await fetch('/tables/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCustomer),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(
        `고객 추가 실패 (${createResponse.status}): ${errorText}`
      );
    }

    await createResponse.json();

    // 항상 데이터 새로고침 (고객 관리 페이지가 아니어도 state 업데이트)
    window.dispatchEvent(new CustomEvent('reloadCustomers'));
  } catch (error) {
    throw error;
  }
}

/**
 * 단체명단에서 고객 정보를 수정하는 함수
 */
async function updateCustomerFromRoster(customerData) {
  try {
    // 서버 API를 통해 고객 데이터 가져오기
    const response = await fetch('/tables/customers');
    const customersResult = await response.json();
    const customers = customersResult.data || customersResult;

    // 여권번호로 고객 찾기
    const passportNum = (
      customerData.passportNumber ||
      customerData.passportNo ||
      ''
    ).trim();
    let existingCustomer = null;

    if (passportNum) {
      existingCustomer = customers.find(
        (c) => c.passport_number === passportNum
      );
    }

    // 여권번호로 못 찾으면 이름으로 찾기
    if (!existingCustomer) {
      const nameKor = customerData.nameKor || customerData.nameKr || '';
      const nameEng = customerData.nameEng || customerData.nameEn || '';

      if (nameKor || nameEng) {
        existingCustomer = customers.find(
          (c) =>
            (nameKor && c.name_kor === nameKor) ||
            (nameEng && c.name_eng === nameEng)
        );
      }
    }

    if (!existingCustomer) {
      await addCustomerToDatabase(customerData);
      return;
    }

    // 단체명단에서 온 수정은 항상 고객 DB에 반영 (역동기화 제거 - 루프 방지)
    // 단체명단이 원본이므로, 고객 DB만 업데이트하고 역방향 전송하지 않음

    // 변경 이력 생성
    const changes = [];
    const now = new Date().toLocaleString('ko-KR');

    const newNameKor = customerData.nameKor || customerData.nameKr || '';
    const newNameEng = customerData.nameEng || customerData.nameEn || '';
    const newPassportNo =
      customerData.passportNumber || customerData.passportNo || '';
    const newBirthDate = customerData.birthDate || '';
    const newPhone = formatPhoneNumber(customerData.phone || '');
    const newEmail = customerData.email || '';
    const newPassportExpiry =
      customerData.passportExpiry || customerData.passportExpire || '';
    if (existingCustomer.name_kor !== newNameKor && newNameKor) {
      changes.push(`한글명: ${existingCustomer.name_kor} -> ${newNameKor}`);
    }
    if (existingCustomer.name_eng !== newNameEng && newNameEng) {
      changes.push(`영문명: ${existingCustomer.name_eng} -> ${newNameEng}`);
    }
    if (existingCustomer.passport_number !== newPassportNo && newPassportNo) {
      changes.push(
        `여권번호: ${existingCustomer.passport_number} -> ${newPassportNo}`
      );
    }
    if (existingCustomer.birth_date !== newBirthDate && newBirthDate) {
      changes.push(
        `생년월일: ${existingCustomer.birth_date} -> ${newBirthDate}`
      );
    }
    if (
      existingCustomer.passport_expiry !== newPassportExpiry &&
      newPassportExpiry
    ) {
      changes.push(
        `여권만료일: ${existingCustomer.passport_expiry} -> ${newPassportExpiry}`
      );
    }
    if (existingCustomer.phone !== newPhone && newPhone) {
      changes.push(`연락처: ${existingCustomer.phone} -> ${newPhone}`);
    }
    if (existingCustomer.email !== newEmail && newEmail) {
      changes.push(`이메일: ${existingCustomer.email} -> ${newEmail}`);
    }

    // 여행지역과 여행이력 동기화 로직
    let travelHistory = existingCustomer.travel_history || '';
    let travelRegion = customerData.destination || customerData.여행지역 || '';
    const departureDate =
      customerData.departureDate || customerData.출발일 || '';
    const existingDepartureDate = existingCustomer.departure_date || '';
    const existingTravelRegion = existingCustomer.travel_region || '';

    // 단체명단의 여행지역이 없으면 DB에서 단체 정보 조회
    if (!travelRegion) {
      const groupName = customerData.groupName || customerData.단체명 || '';
      if (groupName) {
        try {
          const groupsRes = await fetch('/tables/groups');
          const groupsResult = await groupsRes.json();
          const groups = groupsResult.data || groupsResult;
          const group = groups.find((g) => g.name === groupName);
          if (group && group.destination) {
            travelRegion = group.destination;
          }
        } catch (error) {
          console.warn('단체 정보 조회 실패:', error);
        }
      }
    }

    // 규칙 1: 단체명단에서 고객 수정 시
    if (travelRegion) {
      const historyItems = travelHistory
        ? travelHistory.split(',').map((item) => item.trim())
        : [];

      // 조건 체크
      const sameDepartureDate = existingDepartureDate === departureDate;
      const sameTravelRegion = existingTravelRegion === travelRegion;

      let shouldAddToHistory = false;
      let newHistoryItem = '';

      if (departureDate) {
        // 출발일이 있으면 "여행지역(출발일)" 형식
        newHistoryItem = `${travelRegion}(${departureDate})`;

        if (sameDepartureDate && !sameTravelRegion) {
          // 조건 1: 출발일 동일 + 여행지역 다름 -> 추가
          shouldAddToHistory = true;
        } else if (!sameDepartureDate && sameTravelRegion) {
          // 조건 2: 출발일 다름 + 여행지역 동일 -> 추가
          shouldAddToHistory = true;
        } else if (!sameDepartureDate && !sameTravelRegion) {
          // 조건 3: 모두 다름 -> 추가
          shouldAddToHistory = true;
        }
        // 조건 4: 모두 동일 -> 추가하지 않음
      } else {
        // 출발일이 없으면 "여행지역"만
        newHistoryItem = travelRegion;
        if (!sameTravelRegion) {
          shouldAddToHistory = true;
        }
      }

      // 중복 체크: 동일한 항목이 이미 있으면 추가하지 않음
      if (
        shouldAddToHistory &&
        !historyItems.some((item) => item === newHistoryItem)
      ) {
        travelHistory = travelHistory
          ? `${newHistoryItem}, ${travelHistory}`
          : newHistoryItem;
      }

      // 단체명단의 여행지역을 travel_region에 항상 업데이트
      // 단체명단의 destination이 있으면 고객의 travel_region에 동일하게 설정
      if (!travelRegion) {
        // 단체명단에 여행지역이 없으면 기존 값 유지
        travelRegion = existingTravelRegion || '';
      }
    }

    // 규칙 3: 여행이력에서 여행지역 추출 (가장 최근 항목)
    if (!travelRegion && travelHistory) {
      const firstItem = travelHistory.split(',')[0].trim();
      const match = firstItem.match(/^([^(]+)/);
      if (match) {
        travelRegion = match[1].trim();
      }
    }

    // 업데이트할 데이터 구성
    const updateData = {
      name_kor: newNameKor || existingCustomer.name_kor,
      name_eng: newNameEng || existingCustomer.name_eng,
      passport_number: newPassportNo || existingCustomer.passport_number,
      birth_date: newBirthDate || existingCustomer.birth_date,
      passport_expiry: newPassportExpiry || existingCustomer.passport_expiry,
      phone: newPhone || existingCustomer.phone,
      email: newEmail || existingCustomer.email,
      address: customerData.address || existingCustomer.address,
      group_name:
        customerData.groupName ||
        customerData.단체명 ||
        existingCustomer.group_name,
      departure_date: departureDate || existingCustomer.departure_date,
      travel_region: travelRegion || '',
      travel_history: travelHistory,
      gender:
        customerData.gender ||
        customerData.성별 ||
        existingCustomer.gender ||
        '',
      notes: existingCustomer.notes || '',
      passport_file_name: existingCustomer.passport_file_name,
      passport_file_data: existingCustomer.passport_file_data,
      last_modified: new Date().toISOString(),
    };

    // 변경 이력을 메모에 추가
    if (changes.length > 0) {
      const changeLog = `\n[${now} 단체명단에서 수정]\n${changes.join('\n')}`;
      updateData.notes += changeLog;
    }

    // 서버 API를 통해 고객 업데이트
    const updateResponse = await fetch(
      `/tables/customers/${existingCustomer.id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(
        `고객 수정 실패 (${updateResponse.status}): ${errorText}`
      );
    }

    await updateResponse.json();

    // 항상 데이터 새로고침
    window.dispatchEvent(new CustomEvent('reloadCustomers'));
  } catch (error) {
    throw error;
  }
}

/**
 * 단체 정보 변경 시 고객 정보 업데이트
 */
async function updateGroupInfoInCustomers(
  oldGroupName,
  newGroupName,
  destination,
  departureDate
) {
  try {
    // 서버 API를 통해 고객 데이터 가져오기
    const response = await fetch('/tables/customers');
    const customersResult = await response.json();
    const customers = customersResult.data || customersResult;

    // 해당 단체에 속한 고객들 찾기
    const affectedCustomers = customers.filter(
      (c) => c.group_name === oldGroupName
    );

    if (affectedCustomers.length === 0) {
      return;
    }

    // 각 고객 업데이트
    for (const customer of affectedCustomers) {
      const updateData = {
        ...customer,
        group_name: newGroupName,
        departure_date: departureDate || customer.departure_date,
      };

      // 여행지역이 있으면 여행이력 업데이트
      if (destination) {
        let travelHistory = customer.travel_history || '';

        // 여행지역(출발일) 형식으로 추가
        const travelEntry = departureDate
          ? `${destination}(${departureDate})`
          : destination;

        if (travelHistory) {
          if (!travelHistory.includes(travelEntry)) {
            travelHistory = `${travelEntry}, ${travelHistory}`;
          }
        } else {
          travelHistory = travelEntry;
        }
        updateData.travel_history = travelHistory;
      }

      // 서버 API를 통해 업데이트
      const updateResponse = await fetch(`/tables/customers/${customer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!updateResponse.ok) {
        console.error('❌ 고객 업데이트 실패:', customer.name_kor);
        continue;
      }
    }

    // 고객 관리 페이지가 현재 표시 중이면 새로고침
    const currentPage = document.querySelector('.page-content.active');
    if (currentPage && currentPage.id === 'page-customers') {
      window.dispatchEvent(new CustomEvent('reloadCustomers'));
    }
  } catch (error) {
    throw error;
  }
}

/**
 * 단체 데이터로 예약 생성
 */
async function createBookingFromGroupData(groupData) {
  try {
    const addedCustomerIds = [];
    let firstCustomerId = null;

    // 1단계: 모든 멤버를 고객 DB에 추가
    for (let index = 0; index < groupData.members.length; index++) {
      const member = groupData.members[index];
      const nameKor = member.nameKor || member.nameKr || '';
      const nameEng = member.nameEng || member.nameEn || '';

      if (!nameKor && !nameEng) {
        console.warn(`⚠️ 멤버 ${index + 1}: 이름이 없어 건너뜀`);
        continue;
      }

      try {
        // 여권번호로 기존 고객 확인
        const passportNumber = member.passportNo || '';
        let customerId = null;

        if (passportNumber) {
          const response = await fetch(
            `/tables/customers?filter=passport_number:${passportNumber}`
          );
          const result = await response.json();
          const existing =
            result.data && result.data.length > 0 ? result.data[0] : null;

          if (existing) {
            customerId = existing.id;
          }
        }

        if (!customerId) {
          // 새 고객 생성
          // 여권번호가 없으면 임시 고유 번호 생성 (NOT NULL UNIQUE 제약조건 때문)
          const finalPassportNumber =
            passportNumber ||
            `TEMP-${crypto.randomUUID()}`;

          const newCustomer = {
            name_kor: nameKor,
            name_eng: nameEng.toUpperCase() || nameKor,
            passport_number: finalPassportNumber,
            birth_date: member.birthDate || '미정',
            passport_expiry: member.passportExpire || '미정',
            phone: member.phone || '미정',
            email: '',
            address: '',
            departure_date: groupData.departureDate || '',
            group_name: groupData.name || '',
            travel_history: groupData.destination
              ? `${groupData.destination}(${groupData.departureDate || ''})`
              : '',
            notes: `단체: ${groupData.name}`,
            last_modified: new Date().toISOString(),
          };

          const createResponse = await fetch('/tables/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newCustomer),
          });

          if (!createResponse.ok) {
            throw new Error(`고객 생성 실패 (${createResponse.status})`);
          }

          const created = await createResponse.json();
          customerId = created.id;
        }

        addedCustomerIds.push(customerId);
        if (!firstCustomerId) {
          firstCustomerId = customerId;
        }

        // 서버 과부하 방지
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ 멤버 ${index + 1} (${nameKor}) 추가 실패:`, error);
      }
    }

    if (!firstCustomerId) {
      throw new Error('고객을 추가할 수 없습니다.');
    }

    // 2단계: 데이터 새로고침
    window.dispatchEvent(new CustomEvent('reloadCustomers'));
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 3단계: 예약 페이지로 이동
    document
      .querySelectorAll('.page-content')
      .forEach((page) => page.classList.remove('active'));
    document.querySelector('#page-bookings').classList.add('active');

    // 4단계: 상품 찾기 또는 생성 (여행지와 매칭)
    const productsResponse = await fetch('/tables/products');
    const productsResult = await productsResponse.json();
    const products = productsResult.data || productsResult;

    let productId = null;
    const matchingProduct = products.find(
      (p) =>
        p.name &&
        groupData.destination &&
        (p.name.includes(groupData.destination) ||
          groupData.destination.includes(p.name))
    );

    if (matchingProduct) {
      productId = matchingProduct.id;
    } else {
      // 새 상품 생성
      const newProduct = {
        name: groupData.destination || `${groupData.name} 여행`,
        destination: groupData.destination || '미정',
        duration:
          groupData.departureDate && groupData.returnDate
            ? Math.ceil(
                (new Date(groupData.returnDate) -
                  new Date(groupData.departureDate)) /
                  (1000 * 60 * 60 * 24)
              ) + 1
            : 1,
        price: 0,
        status: '활성',
        description: `${groupData.name} 단체 여행`,
      };

      const productResponse = await fetch('/tables/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct),
      });

      if (productResponse.ok) {
        const created = await productResponse.json();
        productId = created.id;
      } else {
        const errorText = await productResponse.text();
        throw new Error(`상품 생성 실패: ${productResponse.status}`);
      }
    }

    // productId 검증
    if (!productId) {
      throw new Error('상품 정보를 찾거나 생성할 수 없습니다.');
    }

    // 5단계: 예약 생성
    const productName = groupData.destination || `${groupData.name} 여행`;
    const bookingData = {
      customer_id: firstCustomerId,
      customer_name:
        groupData.members[0].nameKor || groupData.members[0].nameKr,
      product_id: productId,
      product_name: productName,
      departure_date: groupData.departureDate || '',
      return_date: groupData.returnDate || '',
      participants: addedCustomerIds.length,
      total_price: 0,
      hotel_name: '',
      flight_number: '',
      status: '예약확정',
      group_name: groupData.name,
      notes: `단체명: ${groupData.name}\n총 인원: ${addedCustomerIds.length}명`,
    };

    const bookingResponse = await fetch('/tables/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData),
    });

    if (!bookingResponse.ok) {
      const errorText = await bookingResponse.text();
      let errorMessage = '예약 생성 실패';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorMessage;
      } catch (_e) {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const createdBooking = await bookingResponse.json();

    // 데이터 새로고침
    window.dispatchEvent(new CustomEvent('reloadCustomers'));

    showToast(
      `예약이 생성되었습니다! 단체명: ${groupData.name}, 인원: ${addedCustomerIds.length}명, 예약번호: ${createdBooking.id.substring(0, 8).toUpperCase()}`,
      'success',
      5000
    );
  } catch (error) {
    showToast(`예약 생성 실패: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Step 1 필수 필드 검증
 */
function validateWizardStep1() {
  const productName = document.getElementById('productName');
  const productDestination = document.getElementById('productDestination');
  const productDuration = document.getElementById('productDuration');
  const productPrice = document.getElementById('productPrice');
  const productStatus = document.getElementById('productStatus');
  const errorDiv = document.getElementById('step1Error');

  const errors = [];

  // 필수 필드 검증
  if (!productName.value.trim()) {
    errors.push('단체명을 입력해주세요.');
    productName.style.borderColor = '#F85149';
  } else {
    productName.style.borderColor = '';
  }

  if (!productDestination.value.trim()) {
    errors.push('목적지를 입력해주세요.');
    productDestination.style.borderColor = '#F85149';
  } else {
    productDestination.style.borderColor = '';
  }

  if (!productDuration.value || productDuration.value < 1) {
    errors.push('여행 기간을 입력해주세요.');
    productDuration.style.borderColor = '#F85149';
  } else {
    productDuration.style.borderColor = '';
  }

  if (!productPrice.value || productPrice.value < 0) {
    errors.push('가격을 입력해주세요.');
    productPrice.style.borderColor = '#F85149';
  } else {
    productPrice.style.borderColor = '';
  }

  if (!productStatus.value) {
    errors.push('상태를 선택해주세요.');
    productStatus.style.borderColor = '#F85149';
  } else {
    productStatus.style.borderColor = '';
  }

  // 에러 메시지 표시
  if (errors.length > 0) {
    errorDiv.innerHTML =
      '<strong>다음 항목을 확인해주세요:</strong><br>' + errors.map(e => sanitizeHtml(e)).join('<br>');
    errorDiv.classList.add('show');

    // 3초 후 에러 메시지 숨기기
    setTimeout(() => {
      errorDiv.classList.remove('show');
    }, 5000);

    return false;
  }

  errorDiv.classList.remove('show');
  return true;
}

/**
 * Wizard UI 업데이트 (스텝 표시, 버튼 가시성)
 */
function updateWizardUI() {
  // 모든 스텝 숨기기
  document.querySelectorAll('.wizard-step').forEach((step) => {
    step.classList.remove('active');
  });

  // 현재 스텝 표시
  const currentStep = document.querySelector(
    `.wizard-step[data-step="${currentWizardStep}"]`
  );
  if (currentStep) {
    currentStep.classList.add('active');
  }

  // Progress Indicator 업데이트
  document.querySelectorAll('.wizard-step-item').forEach((item, index) => {
    const stepNumber = index + 1;
    const circle = item.querySelector('.wizard-step-circle');
    const connector = item.nextElementSibling;

    // 완료된 단계
    if (stepNumber < currentWizardStep) {
      circle.classList.add('completed');
      circle.classList.remove('active');
      item.classList.add('completed');
      item.classList.remove('active');
      circle.innerHTML = '<i class="fas fa-check"></i>';

      if (connector && connector.classList.contains('wizard-step-connector')) {
        connector.classList.add('completed');
        connector.classList.remove('active');
      }
    }
    // 현재 단계
    else if (stepNumber === currentWizardStep) {
      circle.classList.add('active');
      circle.classList.remove('completed');
      item.classList.add('active');
      item.classList.remove('completed');
      circle.textContent = stepNumber;

      if (connector && connector.classList.contains('wizard-step-connector')) {
        connector.classList.remove('completed');
        connector.classList.remove('active');
      }
    }
    // 미완료 단계
    else {
      circle.classList.remove('active', 'completed');
      item.classList.remove('active', 'completed');
      circle.textContent = stepNumber;

      if (connector && connector.classList.contains('wizard-step-connector')) {
        connector.classList.remove('completed', 'active');
      }
    }
  });

  // 버튼 가시성 업데이트
  const prevBtn = document.getElementById('wizardPrevBtn');
  const nextBtn = document.getElementById('wizardNextBtn');
  const submitBtn = document.getElementById('wizardSubmitBtn');

  // 이전 버튼
  if (currentWizardStep === 1) {
    prevBtn.style.display = 'none';
  } else {
    prevBtn.style.display = 'flex';
  }

  // 다음/완료 버튼
  if (currentWizardStep === totalWizardSteps) {
    nextBtn.style.display = 'none';
    submitBtn.style.display = 'flex';
  } else {
    nextBtn.style.display = 'flex';
    submitBtn.style.display = 'none';

    // 다음 버튼 텍스트 업데이트
    const nextStepText =
      currentWizardStep === 1 ? '수배 세부사항' : '수배 관리';
    nextBtn.querySelector('span').textContent = `다음 단계: ${nextStepText}`;
  }
}

// ============================================
// Main initialization function
// ============================================

/**
 * Initialize iframe bridge: postMessage handlers, window globals, auth, 401 interceptor.
 * Call this once from index.html after classic scripts have loaded.
 */
export function initIframeBridge() {
  // ---- Window globals (used by HTML onclick attributes) ----

  // 드롭다운 메뉴 토글 함수
  window.toggleSubmenu = function (element) {
    const arrow = element.querySelector('.nav-dropdown-arrow');
    const submenu = element.nextElementSibling;

    // 토글
    arrow.classList.toggle('open');
    submenu.classList.toggle('open');
    element.classList.toggle('active');
    element.setAttribute('aria-expanded', submenu.classList.contains('open'));
  };

  // 고객 관리에서 고객을 추가할 때 단체명단에 알림
  window.notifyGroupRoster = function (customer) {
    const groupRosterFrame = document.getElementById('groupRosterFrame');
    if (groupRosterFrame) {
      groupRosterFrame.contentWindow.postMessage(
        {
          type: 'CUSTOMER_ADDED',
          customer: customer,
        },
        window.location.origin
      );
    }
  };

  // 견적서 고객 입력 방식 토글
  window.toggleQuoteCustomerInput = function () {
    const customerType = document.querySelector(
      'input[name="quoteCustomerType"]:checked'
    ).value;
    const selectGroup = document.getElementById('quoteCustomerSelectGroup');
    const manualGroup = document.getElementById('quoteCustomerManualGroup');
    const phoneGroup = document.getElementById('quoteCustomerPhoneGroup');

    if (customerType === 'existing') {
      // 기존 고객 선택
      selectGroup.style.display = 'block';
      manualGroup.style.display = 'none';
      phoneGroup.style.display = 'none';
      document.getElementById('quoteCustomerManual').value = '';
      document.getElementById('quoteCustomerPhone').value = '';
    } else {
      // 직접 입력
      selectGroup.style.display = 'none';
      manualGroup.style.display = 'block';
      phoneGroup.style.display = 'block';
      document.getElementById('quoteCustomer').value = '';
    }
  };

  // Wizard navigation
  window.nextWizardStep = function () {
    if (currentWizardStep === 1) {
      if (!validateWizardStep1()) {
        return;
      }
    }
    if (currentWizardStep < totalWizardSteps) {
      currentWizardStep++;
      updateWizardUI();
    }
  };

  window.prevWizardStep = function () {
    if (currentWizardStep > 1) {
      currentWizardStep--;
      updateWizardUI();
    }
  };

  // openModal/closeModal wrappers (capture from window since classic scripts already set them)
  const originalOpenModal = window.openModal;
  window.openModal = function (modalId) {
    if (originalOpenModal) {
      originalOpenModal(modalId);
    }

    // 상품 모달일 경우 wizard 초기화
    if (modalId === 'modalProduct') {
      currentWizardStep = 1;
      updateWizardUI();
    }
  };

  const originalCloseModal = window.closeModal;
  window.closeModal = function (modalId) {
    if (originalCloseModal) {
      originalCloseModal(modalId);
    }

    // 상품 모달일 경우 wizard 리셋
    if (modalId === 'modalProduct') {
      currentWizardStep = 1;
      updateWizardUI();

      // 에러 메시지 제거
      const errorDiv = document.getElementById('step1Error');
      if (errorDiv) {
        errorDiv.classList.remove('show');
      }

      // 필드 border 색상 초기화
      document
        .querySelectorAll(
          '.wizard-step input, .wizard-step select, .wizard-step textarea'
        )
        .forEach((field) => {
          field.style.borderColor = '';
        });
    }
  };

  // ---- postMessage handler ----

  window.addEventListener('message', function (event) {
    // origin 검증: 같은 origin 또는 개발환경 localhost 허용
    const isSameOrigin = event.origin === window.location.origin;
    const isDevLocalhost =
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(event.origin) &&
      /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
    if (!isSameOrigin && !isDevLocalhost) {
      console.warn('차단된 postMessage origin:', event.origin);
      return;
    }

    // 단체명단 iframe에서 고객 데이터를 받음
    if (event.data && event.data.type === 'ADD_CUSTOMER_FROM_ROSTER') {
      const customerData = event.data.customer;

      // 순차적으로 처리하기 위해 큐에 추가
      processingQueue = processingQueue.then(async () => {
        try {
          await addCustomerToDatabase(customerData);
        } catch (error) {
          console.error(
            '❌ 고객 추가 실패:',
            customerData.nameKor,
            error.message
          );
        }
      });
    }

    // 단체명단에서 고객 수정 요청
    if (event.data && event.data.type === 'UPDATE_CUSTOMER_FROM_ROSTER') {
      const customerData = event.data.customer;

      // 순차적으로 처리하기 위해 큐에 추가
      processingQueue = processingQueue.then(async () => {
        try {
          await updateCustomerFromRoster(customerData);
        } catch (error) {
          console.error(
            '❌ 고객 수정 실패:',
            customerData.nameKor,
            error.message
          );
        }
      });
    }

    // 단체명단 iframe이 고객 목록을 요청하는 경우
    if (event.data && event.data.type === 'REQUEST_CUSTOMERS') {
      // DB API에서 고객 목록 조회 (localStorage 대신)
      fetch('/tables/customers')
        .then((res) => res.json())
        .then((result) => {
          const customers = result.data || result;
          const groupRosterFrame = document.getElementById('groupRosterFrame');
          if (groupRosterFrame) {
            groupRosterFrame.contentWindow.postMessage(
              {
                type: 'CUSTOMERS_DATA',
                customers: customers,
              },
              window.location.origin
            );
          }
        })
        .catch((err) => console.error('고객 목록 조회 실패:', err));
    }

    // 단체명단에서 단체 정보 변경 시
    if (event.data && event.data.type === 'UPDATE_GROUP_INFO') {
      const { oldGroupName, newGroupName, destination, departureDate } =
        event.data;

      processingQueue = processingQueue.then(async () => {
        try {
          await updateGroupInfoInCustomers(
            oldGroupName,
            newGroupName,
            destination,
            departureDate
          );
        } catch (error) {
          console.error('❌ 고객 단체 정보 업데이트 실패:', error.message);
        }
      });
    }

    // 단체명단에서 예약 생성 요청
    if (event.data && event.data.type === 'CREATE_BOOKING_FROM_GROUP') {
      const { groupData } = event.data;

      processingQueue = processingQueue.then(async () => {
        try {
          await createBookingFromGroupData(groupData);
        } catch (error) {
          console.error('❌ 예약 생성 실패:', error.message);
        }
      });
    }
  });

  // ---- Auth: load user info ----

  (async function loadUserInfo() {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) return;
      const user = await res.json();
      const nameEl = document.getElementById('userName');
      const emailEl = document.getElementById('userEmail');
      if (nameEl) nameEl.textContent = user.name || '사용자';
      if (emailEl) emailEl.textContent = user.email || '';
    } catch (_e) {
      // 무시
    }
  })();

  // ---- Auth: logout ----

  window.handleLogout = async function () {
    if (!(await showConfirmModal('로그아웃', '로그아웃 하시겠습니까?'))) return;
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (_e) {
      // 무시
    }
    window.location.href = '/login.html';
  };

  // ---- 401 fetch interceptor ----

  const _originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await _originalFetch.apply(this, args);
    if (response.status === 401) {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
      // auth 관련 API는 제외
      if (!url.includes('/api/auth/')) {
        window.location.href = '/login.html';
      }
    }
    return response;
  };
}
