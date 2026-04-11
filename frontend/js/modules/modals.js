// js/modules/modals.js
import { state } from './state.js';
// eslint-disable-next-line no-unused-vars
import { openModal, closeModal } from './ui.js';

// Helper function, should be in ui.js but placed here for simplicity for now
export function removePassportFile() {
  document.getElementById('customerPassportFile').value = '';
  document.getElementById('passportFileName').textContent = '선택된 파일 없음';
  document.getElementById('btnRemovePassport').style.display = 'none';
  document.getElementById('passportPreview').innerHTML = '';
  document.getElementById('btnPassportOcr').disabled = true;
  document.getElementById('passportOcrLoading').style.display = 'none';
  const infoTable = document.getElementById('passportInfoTable');
  if (infoTable) infoTable.style.display = 'none';
}

// 여권 정보 테이블 채우기
function fillPassportInfoTable(customer) {
  const table = document.getElementById('passportInfoTable');
  if (!table) return;

  const nameEng = customer.name_eng || '';
  let surname = '-',
    givenName = '-';
  if (nameEng.includes('/')) {
    const parts = nameEng.split('/');
    surname = parts[0].trim();
    givenName = parts.slice(1).join(' ').trim();
  } else if (nameEng.includes(' ')) {
    const parts = nameEng.split(/\s+/);
    surname = parts[0];
    givenName = parts.slice(1).join(' ');
  } else if (nameEng) {
    surname = nameEng;
  }

  const gender =
    customer.gender === 'M'
      ? 'M / 남'
      : customer.gender === 'F'
        ? 'F / 여'
        : '-';

  document.getElementById('piSurname').textContent = surname || '-';
  document.getElementById('piGivenName').textContent = givenName || '-';
  document.getElementById('piPassportNo').textContent =
    customer.passport_number || '-';
  document.getElementById('piGender').textContent = gender;
  document.getElementById('piExpiry').textContent =
    customer.passport_expiry || '-';
  document.getElementById('piBirth').textContent = customer.birth_date || '-';

  table.style.display = 'block';
}

export function openCustomerModal(customerId = null) {
  const _modal = document.getElementById('modalCustomer');
  const title = document.getElementById('modalCustomerTitle');
  const form = document.getElementById('formCustomer');

  form.reset();
  document.getElementById('customerId').value = '';
  removePassportFile();

  if (customerId) {
    const customer = state.customers.find((c) => c.id === customerId);
    if (customer) {
      title.textContent = '고객 수정';
      document.getElementById('customerId').value = customer.id;
      document.getElementById('customerNameKor').value =
        customer.name_kor || '';
      document.getElementById('customerNameEng').value =
        customer.name_eng || '';
      document.getElementById('customerPassportNumber').value =
        customer.passport_number || '';
      document.getElementById('customerBirthDate').value =
        customer.birth_date || '';
      document.getElementById('customerGender').value = customer.gender || '';
      document.getElementById('customerPassportExpiry').value =
        customer.passport_expiry || '';
      document.getElementById('customerPhone').value = customer.phone || '';
      document.getElementById('customerEmail').value = customer.email || '';
      document.getElementById('customerAddress').value = customer.address || '';
      document.getElementById('customerDepartureDate').value =
        customer.departure_date || '';
      document.getElementById('customerGroupName').value =
        customer.group_name || '';
      document.getElementById('customerTravelRegion').value =
        customer.travel_region || '';
      document.getElementById('customerTravelHistory').value =
        customer.travel_history || '';
      document.getElementById('customerNotes').value = customer.notes || '';

      if (customer.passport_file_name) {
        document.getElementById('passportFileName').textContent =
          customer.passport_file_name;
        document.getElementById('btnRemovePassport').style.display =
          'inline-block';

        if (customer.passport_file_data) {
          const preview = document.getElementById('passportPreview');
          const fileName = customer.passport_file_name || 'passport';
          const fileData = customer.passport_file_data;

          // 전역에 현재 여권 데이터 저장 (base64가 너무 길어 인라인 onclick 불가)
          window._currentPassportData = fileData;
          window._currentPassportName = fileName;

          if (fileName.toLowerCase().endsWith('.pdf')) {
            preview.innerHTML = `
                            <p><i class="fas fa-file-pdf"></i> PDF 파일</p>
                            <div class="passport-actions">
                                <button type="button" class="btn btn-sm btn-secondary" onclick="downloadPassportFile(window._currentPassportName, window._currentPassportData)">
                                    <i class="fas fa-download"></i> 다운로드
                                </button>
                            </div>`;
          } else {
            preview.innerHTML = `
                            <img src="${fileData}" alt="여권 미리보기" onclick="openPassportLightbox(this.src)" title="클릭하여 확대">
                            <div class="passport-actions">
                                <button type="button" class="btn btn-sm btn-secondary" onclick="openPassportLightbox(window._currentPassportData)">
                                    <i class="fas fa-search-plus"></i> 확대
                                </button>
                                <button type="button" class="btn btn-sm btn-primary" onclick="downloadPassportFile(window._currentPassportName, window._currentPassportData)">
                                    <i class="fas fa-download"></i> 다운로드
                                </button>
                            </div>`;
          }
        }
      }

      // 여권 정보 요약 테이블 표시
      fillPassportInfoTable(customer);
    }
  } else {
    title.textContent = '고객 추가';
  }

  openModal('modalCustomer');
}

export function openProductModal(productId = null) {
  const _modal = document.getElementById('modalProduct');
  const title = document.getElementById('modalProductTitle');
  const form = document.getElementById('formProduct');

  form.reset();
  document.getElementById('productId').value = '';

  // 항공편 목록 로드
  loadFlightOptionsForProduct();

  if (productId) {
    const product = state.products.find((p) => p.id === productId);
    if (product) {
      title.textContent = '상품 진행';
      document.getElementById('productId').value = product.id;

      // 기본 정보
      document.getElementById('productName').value = product.name;
      document.getElementById('productDestination').value = product.destination;
      document.getElementById('productDuration').value = product.duration;
      document.getElementById('productPrice').value = product.price;
      document.getElementById('productStatus').value = product.status;
      document.getElementById('productDescription').value =
        product.description || '';

      // 항공편 정보
      if (product.flight_id) {
        document.getElementById('productFlightSelector').value =
          product.flight_id;
      }
      document.getElementById('productAirline').value = product.airline || '';
      document.getElementById('productOutboundFlight').value =
        product.outbound_flight || '';
      document.getElementById('productReturnFlight').value =
        product.return_flight || '';
      document.getElementById('productFlightNote').value =
        product.flight_note || '';

      // 호텔 정보
      document.getElementById('productHotelName').value =
        product.hotel_name || '';
      document.getElementById('productHotelCheckin').value =
        product.hotel_checkin || '';
      document.getElementById('productHotelCheckout').value =
        product.hotel_checkout || '';
      document.getElementById('productHotelRoomType').value =
        product.hotel_room_type || '';
      document.getElementById('productHotelRooms').value =
        product.hotel_rooms || '';
      document.getElementById('productHotelNote').value =
        product.hotel_note || '';

      // 차량 정보
      document.getElementById('productVehicleType').value =
        product.vehicle_type || '';
      document.getElementById('productVehicleCount').value =
        product.vehicle_count || '';
      document.getElementById('productVehicleCompany').value =
        product.vehicle_company || '';
      document.getElementById('productVehicleNote').value =
        product.vehicle_note || '';

      // 가이드 정보
      document.getElementById('productGuideName').value =
        product.guide_name || '';
      document.getElementById('productGuidePhone').value =
        product.guide_phone || '';
      document.getElementById('productGuideLanguage').value =
        product.guide_language || '';
      document.getElementById('productGuideNote').value =
        product.guide_note || '';

      // 수배업무
      document.getElementById('productProcurementFlight').checked =
        product.procurement_flight || false;
      document.getElementById('productProcurementHotel').checked =
        product.procurement_hotel || false;
      document.getElementById('productProcurementVehicle').checked =
        product.procurement_vehicle || false;
      document.getElementById('productProcurementGuide').checked =
        product.procurement_guide || false;
      document.getElementById('productProcurementVisa').checked =
        product.procurement_visa || false;
      document.getElementById('productProcurementInsurance').checked =
        product.procurement_insurance || false;
      document.getElementById('productProcurementStatus').value =
        product.procurement_status || '';
      document.getElementById('productProcurementNote').value =
        product.procurement_note || '';
    }
  } else {
    title.textContent = '상품 추가';
    document.getElementById('productStatus').value = '활성';
  }

  openModal('modalProduct');
}

/**
 * 서버 DB에서 항공편 목록을 불러와서 셀렉터에 추가
 */
async function loadFlightOptionsForProduct() {
  try {
    const selector = document.getElementById('productFlightSelector');
    if (!selector) return;

    // 기존 옵션 제거 (첫 번째 옵션은 유지)
    while (selector.options.length > 1) {
      selector.remove(1);
    }

    // 서버 DB에서 항공편 목록 가져오기
    const flights = await getFlightListFromStorage();

    // 항공편 옵션 추가
    flights.forEach((flight) => {
      const option = document.createElement('option');
      option.value = flight.id;

      // 항공편 요약 텍스트 생성: "단체명 + 예약번호" 형식
      const groupName = flight.name || '단체명 미정';
      const pnr = flight.pnr || '예약번호 미정';
      const date = flight.saveDate
        ? new Date(flight.saveDate).toLocaleDateString('ko-KR')
        : '';

      // 단체명 + 예약번호 (날짜) 형식으로 표시
      option.textContent = `${groupName} + ${pnr}${date ? ' (' + date + ')' : ''}`;
      selector.appendChild(option);
    });

    // 항공편 셀렉터 변경 이벤트 (중복 방지를 위해 기존 리스너 제거 후 재등록)
    selector.removeEventListener('change', handleProductFlightSelection);
    selector.addEventListener('change', handleProductFlightSelection);
  } catch (error) {
    console.error('항공편 옵션 로드 오류:', error);
  }
}

/**
 * 서버 DB에서 항공편 목록 가져오기 (FlightSyncManager 사용)
 */
async function getFlightListFromStorage() {
  try {
    const flights = (typeof FlightSyncManager !== 'undefined')
      ? await FlightSyncManager.getFlights()
      : [];

    if (flights.length === 0) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 출발일이 지난 항공편 제외
    const filtered = flights.filter((f) => {
      if (!f.flights || f.flights.length === 0) return true;
      const firstFlight = f.flights[0];
      if (!firstFlight.date) return true;
      const match = firstFlight.date.match(/(\d{4})\.(\d{2})\.(\d{2})/);
      if (!match) return true;
      const depDate = new Date(match[1], match[2] - 1, match[3]);
      return depDate >= today;
    });

    // 최신순으로 정렬
    return filtered.sort((a, b) => new Date(b.saveDate) - new Date(a.saveDate));
  } catch (error) {
    console.error('항공편 목록 조회 오류:', error);
    return [];
  }
}

/**
 * 항공편 선택 처리
 */
async function handleProductFlightSelection(e) {
  const flightId = e.target.value;

  if (!flightId) {
    // 선택 해제 시 항공편 필드 초기화
    document.getElementById('productAirline').value = '';
    document.getElementById('productOutboundFlight').value = '';
    document.getElementById('productReturnFlight').value = '';
    return;
  }

  try {
    // 서버 DB에서 항공편 데이터 가져오기
    const flights = await getFlightListFromStorage();
    const flight = flights.find((f) => f.id === flightId);

    if (!flight) {
      showToast('항공편 정보를 찾을 수 없습니다.', 'warning');
      return;
    }

    // 단체명 자동 채우기 (항공편의 name 필드 사용)
    if (flight.name) {
      const productNameField = document.getElementById('productName');
      if (productNameField && !productNameField.value) {
        // 단체명이 비어있을 때만 자동 입력
        productNameField.value = flight.name;
      }
    }

    // 항공편 필드 자동 채우기
    if (flight.airline) {
      document.getElementById('productAirline').value = flight.airline;
    }

    // flights 배열에서 항공편 정보 추출
    if (flight.flights && flight.flights.length > 0) {
      // 목적지 자동 채우기 (첫 번째 항공편의 도착지)
      const firstFlight = flight.flights[0];
      if (firstFlight.arrival) {
        const destination =
          firstFlight.arrival.airport || firstFlight.arrival.code || '';
        const productDestField = document.getElementById('productDestination');
        if (productDestField && !productDestField.value && destination) {
          productDestField.value = destination;
        }
      }

      // 여행 기간 자동 계산 (왕복편인 경우)
      if (flight.flights.length > 1) {
        try {
          const departureDate = firstFlight.date; // "2025.01.20(월)" 형식
          const lastFlight = flight.flights[flight.flights.length - 1];
          const returnDate = lastFlight.date;

          if (departureDate && returnDate) {
            // 날짜 파싱 (YYYY.MM.DD 형식에서 날짜 추출)
            const depMatch = departureDate.match(/(\d{4})\.(\d{2})\.(\d{2})/);
            const retMatch = returnDate.match(/(\d{4})\.(\d{2})\.(\d{2})/);

            if (depMatch && retMatch) {
              const depDateObj = new Date(
                depMatch[1],
                depMatch[2] - 1,
                depMatch[3]
              );
              const retDateObj = new Date(
                retMatch[1],
                retMatch[2] - 1,
                retMatch[3]
              );

              // 일수 차이 계산 (+1: 당일 포함)
              const diffTime = retDateObj - depDateObj;
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

              const durationField = document.getElementById('productDuration');
              if (durationField && !durationField.value && diffDays > 0) {
                durationField.value = diffDays;
              }
            }
          }
        } catch (error) {
          console.error('여행 기간 계산 오류:', error);
        }
      }

      // 출발편 정보 (첫 번째 항공편)
      const outbound = flight.flights[0];
      let outboundText = '';

      if (outbound.flightNumber) {
        outboundText += outbound.flightNumber + ' ';
      }
      if (outbound.departure) {
        const depAirport =
          outbound.departure.airport || outbound.departure.code || '';
        const depTime = outbound.departure.time || '';
        if (depAirport || depTime) {
          outboundText += `${depAirport} ${depTime}`.trim();
        }
      }
      if (outbound.arrival) {
        const arrAirport =
          outbound.arrival.airport || outbound.arrival.code || '';
        const arrTime = outbound.arrival.time || '';
        if (arrAirport || arrTime) {
          outboundText += ` → ${arrAirport} ${arrTime}`.trim();
        }
      }

      if (outboundText) {
        document.getElementById('productOutboundFlight').value =
          outboundText.trim();
      }

      // 귀국편 정보 (두 번째 항공편, 있는 경우)
      if (flight.flights.length > 1) {
        const returnFlight = flight.flights[1];
        let returnText = '';

        if (returnFlight.flightNumber) {
          returnText += returnFlight.flightNumber + ' ';
        }
        if (returnFlight.departure) {
          const depAirport =
            returnFlight.departure.airport || returnFlight.departure.code || '';
          const depTime = returnFlight.departure.time || '';
          if (depAirport || depTime) {
            returnText += `${depAirport} ${depTime}`.trim();
          }
        }
        if (returnFlight.arrival) {
          const arrAirport =
            returnFlight.arrival.airport || returnFlight.arrival.code || '';
          const arrTime = returnFlight.arrival.time || '';
          if (arrAirport || arrTime) {
            returnText += ` → ${arrAirport} ${arrTime}`.trim();
          }
        }

        if (returnText) {
          document.getElementById('productReturnFlight').value =
            returnText.trim();
        }
      }
    }

    showToast('항공편 정보가 자동으로 입력되었습니다.', 'success');
  } catch (error) {
    showToast('항공편 정보를 불러오는 중 오류가 발생했습니다.', 'error');
  }
}

export function openBookingModal(bookingId = null) {
  const _modal = document.getElementById('modalBooking');
  const title = document.getElementById('modalBookingTitle');
  const form = document.getElementById('formBooking');
  const bookingNumberGroup = document.getElementById('bookingNumberGroup');
  const bookingNumberInput = document.getElementById('bookingNumber');

  form.reset();
  document.getElementById('bookingId').value = '';

  // 예약번호 필드 기본적으로 숨김
  if (bookingNumberGroup) {
    bookingNumberGroup.style.display = 'none';
  }

  if (bookingId) {
    const booking = state.bookings.find((b) => b.id === bookingId);
    if (booking) {
      title.textContent = '예약 수정';
      document.getElementById('bookingId').value = booking.id;

      // 예약번호 표시 (편집 모드에서만)
      if (bookingNumberGroup && bookingNumberInput) {
        bookingNumberGroup.style.display = 'block';
        bookingNumberInput.value = booking.id.substring(0, 8).toUpperCase();
      }

      document.getElementById('bookingCustomer').value = booking.customer_id;
      document.getElementById('bookingProduct').value = booking.product_id;
      document.getElementById('bookingDepartureDate').value =
        booking.departure_date;
      document.getElementById('bookingReturnDate').value = booking.return_date;
      document.getElementById('bookingParticipants').value =
        booking.participants;
      document.getElementById('bookingTotalPrice').value = booking.total_price;
      document.getElementById('bookingHotel').value = booking.hotel_name || '';
      document.getElementById('bookingFlight').value =
        booking.flight_number || '';
      document.getElementById('bookingStatus').value = booking.status;
      document.getElementById('bookingGroupName').value =
        booking.group_name || '';
      document.getElementById('bookingNotes').value = booking.notes || '';
    }
  } else {
    title.textContent = '예약 추가';
    document.getElementById('bookingStatus').value = '문의';
    document.getElementById('bookingParticipants').value = '1';
  }

  openModal('modalBooking');
}

export function openTodoModal(todoId = null) {
  const form = document.getElementById('formTodo');
  form.reset();
  document.getElementById('todoId').value = '';

  if (todoId) {
    const todo = state.todos.find((t) => t.id === todoId);
    if (todo) {
      document.getElementById('modalTodoTitle').textContent = '할 일 수정';
      document.getElementById('todoId').value = todo.id;
      document.getElementById('todoTitle').value = todo.title;
      document.getElementById('todoDate').value = todo.due_date;
      document.getElementById('todoPriority').value = todo.priority;
      document.getElementById('todoDescription').value = todo.description || '';
    }
  } else {
    document.getElementById('modalTodoTitle').textContent = '할 일 추가';
  }
  openModal('modalTodo');
}
