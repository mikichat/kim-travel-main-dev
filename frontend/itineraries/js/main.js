const { showToast, showConfirmModal } = window;
import { sanitizeHtml } from '../../js/modules/ui.js';

// Storage key
const STORAGE_KEY = 'hanatour_packages';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeEventListeners();
  loadSavedPackages();
});

// Event Listeners
function initializeEventListeners() {
  // Form submission
  document
    .getElementById('packageForm')
    .addEventListener('submit', handleFormSubmit);

  // Add buttons
  document
    .getElementById('btnAddDate')
    .addEventListener('click', addDepartureDate);
  document.getElementById('btnAddHotel').addEventListener('click', addHotel);
  document
    .getElementById('btnAddItinerary')
    .addEventListener('click', addItinerary);
  document
    .getElementById('btnAddOptional')
    .addEventListener('click', addOptionalTour);

  // Header buttons
  document.getElementById('btnSaveData').addEventListener('click', () => {
    document.getElementById('packageForm').dispatchEvent(new Event('submit'));
  });
  document.getElementById('btnReset').addEventListener('click', resetForm);
  document
    .getElementById('btnDownloadSample')
    .addEventListener('click', downloadSampleExcel);
  document.getElementById('btnImportExcel').addEventListener('click', () => {
    document.getElementById('excelFileInput').click();
  });
  document
    .getElementById('excelFileInput')
    .addEventListener('change', importFromExcel);
  document
    .getElementById('btnExportData')
    .addEventListener('click', exportToExcel);

  // Dynamic remove buttons
  document.addEventListener('click', (e) => {
    if (
      e.target.classList.contains('remove-date') ||
      e.target.closest('.remove-date')
    ) {
      e.target.closest('.departure-item').remove();
    }
    if (
      e.target.classList.contains('remove-hotel') ||
      e.target.closest('.remove-hotel')
    ) {
      e.target.closest('.hotel-item').remove();
    }
    if (
      e.target.classList.contains('remove-itinerary') ||
      e.target.closest('.remove-itinerary')
    ) {
      e.target.closest('.itinerary-item').remove();
    }
    if (
      e.target.classList.contains('remove-optional') ||
      e.target.closest('.remove-optional')
    ) {
      e.target.closest('.optional-tour-item').remove();
    }
  });
}

// Add departure date
function addDepartureDate() {
  const container = document.getElementById('departureDatesList');
  const item = document.createElement('div');
  item.className = 'departure-item';
  item.innerHTML = `
        <input type="date" class="departure-date" placeholder="출발일">
        <input type="number" class="available-seats" placeholder="잔여석" min="0">
        <button type="button" class="btn-icon btn-danger remove-date">
            <i class="fas fa-times"></i>
        </button>
    `;
  container.appendChild(item);
}

// Add hotel
function addHotel() {
  const container = document.getElementById('hotelsList');
  const item = document.createElement('div');
  item.className = 'hotel-item';
  item.innerHTML = `
        <div class="form-grid">
            <div class="form-group">
                <label>호텔명</label>
                <input type="text" class="hotel-name" placeholder="호텔명을 입력하세요">
            </div>
            <div class="form-group">
                <label>등급</label>
                <select class="hotel-rating">
                    <option value="">선택</option>
                    <option value="5성급">5성급</option>
                    <option value="4성급">4성급</option>
                    <option value="3성급">3성급</option>
                    <option value="특급">특급</option>
                    <option value="1급">1급</option>
                </select>
            </div>
            <div class="form-group">
                <label>지역</label>
                <input type="text" class="hotel-location" placeholder="호텔 위치">
            </div>
        </div>
        <button type="button" class="btn-icon btn-danger remove-hotel">
            <i class="fas fa-times"></i>
        </button>
    `;
  container.appendChild(item);
}

// Add itinerary
function addItinerary() {
  const container = document.getElementById('itineraryList');
  const items = container.querySelectorAll('.itinerary-item');
  const nextDay = items.length + 1;

  const item = document.createElement('div');
  item.className = 'itinerary-item';
  item.innerHTML = `
        <div class="day-header">
            <label>DAY <input type="number" class="day-number" value="${nextDay}" min="1"></label>
            <button type="button" class="btn-icon btn-danger remove-itinerary">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="form-grid">
            <div class="form-group">
                <label>일자</label>
                <input type="date" class="itinerary-date" placeholder="일자">
            </div>
            <div class="form-group">
                <label>지역</label>
                <input type="text" class="itinerary-region" placeholder="예: 인천 → 다낭">
            </div>
            <div class="form-group">
                <label>교통편</label>
                <input type="text" class="itinerary-transport" placeholder="예: OZ123편 또는 전용차량">
            </div>
            <div class="form-group">
                <label>시간</label>
                <input type="text" class="itinerary-time" placeholder="예: 09:00 또는 09:00-18:00">
            </div>
        </div>
        <div class="form-group">
            <label>일정 내용</label>
            <textarea class="itinerary-schedule" rows="4" placeholder="상세 일정을 입력하세요"></textarea>
        </div>
        <div class="form-grid">
            <div class="form-group">
                <label>식사</label>
                <input type="text" class="itinerary-meals" placeholder="예: 조/중/석">
            </div>
            <div class="form-group">
                <label>숙박</label>
                <input type="text" class="itinerary-accommodation" placeholder="예: 호텔명">
            </div>
        </div>
    `;
  container.appendChild(item);
}

// Add optional tour
function addOptionalTour() {
  const container = document.getElementById('optionalToursList');
  const item = document.createElement('div');
  item.className = 'optional-tour-item';
  item.innerHTML = `
        <div class="form-grid">
            <div class="form-group">
                <label>관광지명</label>
                <input type="text" class="optional-name" placeholder="관광지명">
            </div>
            <div class="form-group">
                <label>가격</label>
                <input type="number" class="optional-price" placeholder="가격" min="0">
            </div>
            <div class="form-group full-width">
                <label>설명</label>
                <textarea class="optional-description" rows="2" placeholder="설명"></textarea>
            </div>
        </div>
        <button type="button" class="btn-icon btn-danger remove-optional">
            <i class="fas fa-times"></i>
        </button>
    `;
  container.appendChild(item);
}

// Handle form submit
function handleFormSubmit(e) {
  e.preventDefault();

  const packageData = collectFormData();
  const packages = getStoredPackages();

  // Check if editing existing package
  const editingId = document.getElementById('packageForm').dataset.editingId;
  if (editingId) {
    const index = packages.findIndex((p) => p.id === editingId);
    if (index !== -1) {
      packageData.id = editingId;
      packages[index] = packageData;
    }
    delete document.getElementById('packageForm').dataset.editingId;
  } else {
    packageData.id = generateId();
    packages.push(packageData);
  }

  savePackages(packages);
  showToast('패키지가 저장되었습니다!', 'success');
  resetForm();
  loadSavedPackages();
}

// Collect form data
function collectFormData() {
  const data = {
    timestamp: new Date().toISOString(),
    basicInfo: {
      packageCode: document.getElementById('packageCode').value,
      packageName: document.getElementById('packageName').value,
      destination: document.getElementById('destination').value,
      duration: document.getElementById('duration').value,
      departureCity: document.getElementById('departureCity').value,
      airline: document.getElementById('airline').value,
    },
    pricing: {
      priceAdult: document.getElementById('priceAdult').value,
      priceChild: document.getElementById('priceChild').value,
      priceInfant: document.getElementById('priceInfant').value,
      fuelSurcharge: document.getElementById('fuelSurcharge').value,
      taxFee: document.getElementById('taxFee').value,
      singleSupplement: document.getElementById('singleSupplement').value,
    },
    departureDates: collectDepartureDates(),
    hotels: collectHotels(),
    itinerary: collectItinerary(),
    included: document.getElementById('included').value,
    excluded: document.getElementById('excluded').value,
    benefits: document.getElementById('benefits').value,
    notes: document.getElementById('notes').value,
    shopping: document.getElementById('shopping').value,
    optionalTours: collectOptionalTours(),
  };

  return data;
}

// Collect departure dates
function collectDepartureDates() {
  const items = document.querySelectorAll(
    '#departureDatesList .departure-item'
  );
  const dates = [];
  items.forEach((item) => {
    const date = item.querySelector('.departure-date').value;
    const seats = item.querySelector('.available-seats').value;
    if (date) {
      dates.push({ date, seats });
    }
  });
  return dates;
}

// Collect hotels
function collectHotels() {
  const items = document.querySelectorAll('#hotelsList .hotel-item');
  const hotels = [];
  items.forEach((item) => {
    const name = item.querySelector('.hotel-name').value;
    const rating = item.querySelector('.hotel-rating').value;
    const location = item.querySelector('.hotel-location').value;
    if (name) {
      hotels.push({ name, rating, location });
    }
  });
  return hotels;
}

// Collect itinerary
function collectItinerary() {
  const items = document.querySelectorAll('#itineraryList .itinerary-item');
  const itinerary = [];
  items.forEach((item) => {
    const day = item.querySelector('.day-number').value;
    const date = item.querySelector('.itinerary-date').value;
    const region = item.querySelector('.itinerary-region').value;
    const transport = item.querySelector('.itinerary-transport').value;
    const time = item.querySelector('.itinerary-time').value;
    const schedule = item.querySelector('.itinerary-schedule').value;
    const meals = item.querySelector('.itinerary-meals').value;
    const accommodation = item.querySelector('.itinerary-accommodation').value;

    if (region || schedule) {
      itinerary.push({
        day,
        date,
        region,
        transport,
        time,
        schedule,
        meals,
        accommodation,
      });
    }
  });
  return itinerary;
}

// Collect optional tours
function collectOptionalTours() {
  const items = document.querySelectorAll(
    '#optionalToursList .optional-tour-item'
  );
  const tours = [];
  items.forEach((item) => {
    const name = item.querySelector('.optional-name').value;
    const price = item.querySelector('.optional-price').value;
    const description = item.querySelector('.optional-description').value;
    if (name) {
      tours.push({ name, price, description });
    }
  });
  return tours;
}

// Storage functions
function getStoredPackages() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

function savePackages(packages) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(packages));
}

function generateId() {
  return 'pkg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Load saved packages
function loadSavedPackages() {
  const packages = getStoredPackages();
  const container = document.getElementById('savedPackagesList');

  if (packages.length === 0) {
    container.innerHTML =
      '<div class="empty-message">저장된 패키지가 없습니다.</div>';
    return;
  }

  container.innerHTML = packages
    .map(
      (pkg) => `
        <div class="package-card" data-id="${pkg.id}">
            <div class="package-header">
                <h3>${sanitizeHtml(pkg.basicInfo.packageName)}</h3>
                <span class="package-code">${sanitizeHtml(pkg.basicInfo.packageCode)}</span>
            </div>
            <div class="package-info">
                <div class="info-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${sanitizeHtml(pkg.basicInfo.destination)}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-clock"></i>
                    <span>${sanitizeHtml(pkg.basicInfo.duration)}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-plane"></i>
                    <span>${sanitizeHtml(pkg.basicInfo.airline)}</span>
                </div>
                <div class="info-item price">
                    <i class="fas fa-won-sign"></i>
                    <span>${Number(pkg.pricing.priceAdult).toLocaleString()}원</span>
                </div>
            </div>
            <div class="package-actions">
                <button class="btn btn-sm btn-info" onclick="viewPackage('${pkg.id}')">
                    <i class="fas fa-eye"></i> 보기
                </button>
                <button class="btn btn-sm btn-success" onclick="printItinerary('${pkg.id}')">
                    <i class="fas fa-file-alt"></i> 일정표
                </button>
                <button class="btn btn-sm btn-warning" style="background:#ff9800;" onclick="printQuote('${pkg.id}')">
                    <i class="fas fa-file-invoice"></i> 견적서
                </button>
                <button class="btn btn-sm btn-primary" onclick="editPackage('${pkg.id}')">
                    <i class="fas fa-edit"></i> 수정
                </button>
                <button class="btn btn-sm btn-danger" onclick="deletePackage('${pkg.id}')">
                    <i class="fas fa-trash"></i> 삭제
                </button>
            </div>
        </div>
    `
    )
    .join('');
}

// View package details
function viewPackage(id) {
  const packages = getStoredPackages();
  const pkg = packages.find((p) => p.id === id);
  if (!pkg) return;

  const modal = document.getElementById('viewModal');
  const content = document.getElementById('modalContent');

  content.innerHTML = `
        <div class="package-detail">
            <section>
                <h4><i class="fas fa-info-circle"></i> 기본 정보</h4>
                <table class="detail-table">
                    <tr><th>상품코드</th><td>${sanitizeHtml(pkg.basicInfo.packageCode)}</td></tr>
                    <tr><th>상품명</th><td>${sanitizeHtml(pkg.basicInfo.packageName)}</td></tr>
                    <tr><th>목적지</th><td>${sanitizeHtml(pkg.basicInfo.destination)}</td></tr>
                    <tr><th>여행기간</th><td>${sanitizeHtml(pkg.basicInfo.duration)}</td></tr>
                    <tr><th>출발도시</th><td>${sanitizeHtml(pkg.basicInfo.departureCity)}</td></tr>
                    <tr><th>항공사</th><td>${sanitizeHtml(pkg.basicInfo.airline)}</td></tr>
                </table>
            </section>

            <section>
                <h4><i class="fas fa-won-sign"></i> 가격 정보</h4>
                <table class="detail-table">
                    <tr><th>성인</th><td>${Number(pkg.pricing.priceAdult).toLocaleString()}원</td></tr>
                    ${pkg.pricing.priceChild ? `<tr><th>아동</th><td>${Number(pkg.pricing.priceChild).toLocaleString()}원</td></tr>` : ''}
                    ${pkg.pricing.priceInfant ? `<tr><th>유아</th><td>${Number(pkg.pricing.priceInfant).toLocaleString()}원</td></tr>` : ''}
                    ${pkg.pricing.fuelSurcharge ? `<tr><th>유류할증료</th><td>${Number(pkg.pricing.fuelSurcharge).toLocaleString()}원</td></tr>` : ''}
                    ${pkg.pricing.taxFee ? `<tr><th>제세공과금</th><td>${Number(pkg.pricing.taxFee).toLocaleString()}원</td></tr>` : ''}
                    ${pkg.pricing.singleSupplement ? `<tr><th>1인 추가요금</th><td>${Number(pkg.pricing.singleSupplement).toLocaleString()}원</td></tr>` : ''}
                </table>
            </section>

            ${
              pkg.departureDates.length > 0
                ? `
            <section>
                <h4><i class="fas fa-calendar-alt"></i> 출발일</h4>
                <div class="departure-dates-list">
                    ${pkg.departureDates
                      .map(
                        (d) => `
                        <div class="date-badge">${sanitizeHtml(d.date)} (잔여: ${sanitizeHtml(d.seats)}석)</div>
                    `
                      )
                      .join('')}
                </div>
            </section>
            `
                : ''
            }

            ${
              pkg.hotels.length > 0
                ? `
            <section>
                <h4><i class="fas fa-hotel"></i> 숙박 정보</h4>
                <ul class="detail-list">
                    ${pkg.hotels
                      .map(
                        (h) => `
                        <li><strong>${sanitizeHtml(h.name)}</strong> (${sanitizeHtml(h.rating)}) - ${sanitizeHtml(h.location)}</li>
                    `
                      )
                      .join('')}
                </ul>
            </section>
            `
                : ''
            }

            ${
              pkg.itinerary.length > 0
                ? `
            <section>
                <h4><i class="fas fa-map-marked-alt"></i> 일정</h4>
                ${pkg.itinerary
                  .map(
                    (i) => `
                    <div class="itinerary-detail">
                        <h5>DAY ${i.day}${i.date ? ` (${i.date})` : ''}</h5>
                        ${i.region ? `<p><strong><i class="fas fa-map-marker-alt"></i> 지역:</strong> ${i.region}</p>` : ''}
                        ${i.transport ? `<p><strong><i class="fas fa-bus"></i> 교통편:</strong> ${i.transport}</p>` : ''}
                        ${i.time ? `<p><strong><i class="fas fa-clock"></i> 시간:</strong> ${i.time}</p>` : ''}
                        ${i.schedule ? `<p style="white-space: pre-line; margin-top: 10px;"><strong>일정:</strong><br>${i.schedule}</p>` : ''}
                        <div class="itinerary-meta">
                            <span><i class="fas fa-utensils"></i> ${i.meals || '-'}</span>
                            <span><i class="fas fa-bed"></i> ${i.accommodation || '-'}</span>
                        </div>
                    </div>
                `
                  )
                  .join('')}
            </section>
            `
                : ''
            }

            ${
              pkg.included
                ? `
            <section>
                <h4><i class="fas fa-check-circle"></i> 포함 사항</h4>
                <pre class="detail-text">${pkg.included}</pre>
            </section>
            `
                : ''
            }

            ${
              pkg.excluded
                ? `
            <section>
                <h4><i class="fas fa-times-circle"></i> 불포함 사항</h4>
                <pre class="detail-text">${pkg.excluded}</pre>
            </section>
            `
                : ''
            }

            ${
              pkg.benefits
                ? `
            <section>
                <h4><i class="fas fa-gift"></i> 특전</h4>
                <pre class="detail-text">${pkg.benefits}</pre>
            </section>
            `
                : ''
            }

            ${
              pkg.optionalTours.length > 0
                ? `
            <section>
                <h4><i class="fas fa-map-signs"></i> 선택관광</h4>
                <ul class="detail-list">
                    ${pkg.optionalTours
                      .map(
                        (t) => `
                        <li>
                            <strong>${t.name}</strong> - ${Number(t.price).toLocaleString()}원
                            ${t.description ? `<br><small>${t.description}</small>` : ''}
                        </li>
                    `
                      )
                      .join('')}
                </ul>
            </section>
            `
                : ''
            }
        </div>
    `;

  modal.style.display = 'block';
  document.getElementById('btnEditFromModal').onclick = () => {
    closeViewModal();
    editPackage(id);
  };
}

function closeViewModal() {
  document.getElementById('viewModal').style.display = 'none';
}

// Edit package
function editPackage(id) {
  const packages = getStoredPackages();
  const pkg = packages.find((p) => p.id === id);
  if (!pkg) return;

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Fill basic info
  document.getElementById('packageCode').value = pkg.basicInfo.packageCode;
  document.getElementById('packageName').value = pkg.basicInfo.packageName;
  document.getElementById('destination').value = pkg.basicInfo.destination;
  document.getElementById('duration').value = pkg.basicInfo.duration;
  document.getElementById('departureCity').value = pkg.basicInfo.departureCity;
  document.getElementById('airline').value = pkg.basicInfo.airline;

  // Fill pricing
  document.getElementById('priceAdult').value = pkg.pricing.priceAdult;
  document.getElementById('priceChild').value = pkg.pricing.priceChild;
  document.getElementById('priceInfant').value = pkg.pricing.priceInfant;
  document.getElementById('fuelSurcharge').value = pkg.pricing.fuelSurcharge;
  document.getElementById('taxFee').value = pkg.pricing.taxFee;
  document.getElementById('singleSupplement').value =
    pkg.pricing.singleSupplement;

  // Fill departure dates
  const datesContainer = document.getElementById('departureDatesList');
  datesContainer.innerHTML = '';
  pkg.departureDates.forEach((date) => {
    const item = document.createElement('div');
    item.className = 'departure-item';
    item.innerHTML = `
            <input type="date" class="departure-date" value="${sanitizeHtml(date.date)}">
            <input type="number" class="available-seats" value="${sanitizeHtml(date.seats)}" min="0">
            <button type="button" class="btn-icon btn-danger remove-date">
                <i class="fas fa-times"></i>
            </button>
        `;
    datesContainer.appendChild(item);
  });

  // Fill hotels
  const hotelsContainer = document.getElementById('hotelsList');
  hotelsContainer.innerHTML = '';
  pkg.hotels.forEach((hotel) => {
    const item = document.createElement('div');
    item.className = 'hotel-item';
    item.innerHTML = `
            <div class="form-grid">
                <div class="form-group">
                    <label>호텔명</label>
                    <input type="text" class="hotel-name" value="${sanitizeHtml(hotel.name)}">
                </div>
                <div class="form-group">
                    <label>등급</label>
                    <select class="hotel-rating">
                        <option value="">선택</option>
                        <option value="5성급" ${hotel.rating === '5성급' ? 'selected' : ''}>5성급</option>
                        <option value="4성급" ${hotel.rating === '4성급' ? 'selected' : ''}>4성급</option>
                        <option value="3성급" ${hotel.rating === '3성급' ? 'selected' : ''}>3성급</option>
                        <option value="특급" ${hotel.rating === '특급' ? 'selected' : ''}>특급</option>
                        <option value="1급" ${hotel.rating === '1급' ? 'selected' : ''}>1급</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>지역</label>
                    <input type="text" class="hotel-location" value="${sanitizeHtml(hotel.location)}">
                </div>
            </div>
            <button type="button" class="btn-icon btn-danger remove-hotel">
                <i class="fas fa-times"></i>
            </button>
        `;
    hotelsContainer.appendChild(item);
  });

  // Fill itinerary
  const itineraryContainer = document.getElementById('itineraryList');
  itineraryContainer.innerHTML = '';
  pkg.itinerary.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'itinerary-item';
    div.innerHTML = `
            <div class="day-header">
                <label>DAY <input type="number" class="day-number" value="${item.day}" min="1"></label>
                <button type="button" class="btn-icon btn-danger remove-itinerary">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="form-grid">
                <div class="form-group">
                    <label>일자</label>
                    <input type="date" class="itinerary-date" value="${sanitizeHtml(item.date || '')}">
                </div>
                <div class="form-group">
                    <label>지역</label>
                    <input type="text" class="itinerary-region" value="${sanitizeHtml(item.region || '')}">
                </div>
                <div class="form-group">
                    <label>교통편</label>
                    <input type="text" class="itinerary-transport" value="${sanitizeHtml(item.transport || '')}">
                </div>
                <div class="form-group">
                    <label>시간</label>
                    <input type="text" class="itinerary-time" value="${sanitizeHtml(item.time || '')}">
                </div>
            </div>
            <div class="form-group">
                <label>일정 내용</label>
                <textarea class="itinerary-schedule" rows="4">${sanitizeHtml(item.schedule || '')}</textarea>
            </div>
            <div class="form-grid">
                <div class="form-group">
                    <label>식사</label>
                    <input type="text" class="itinerary-meals" value="${sanitizeHtml(item.meals || '')}">
                </div>
                <div class="form-group">
                    <label>숙박</label>
                    <input type="text" class="itinerary-accommodation" value="${sanitizeHtml(item.accommodation || '')}">
                </div>
            </div>
        `;
    itineraryContainer.appendChild(div);
  });

  // Fill other fields
  document.getElementById('included').value = pkg.included;
  document.getElementById('excluded').value = pkg.excluded;
  document.getElementById('benefits').value = pkg.benefits;
  document.getElementById('notes').value = pkg.notes;
  document.getElementById('shopping').value = pkg.shopping;

  // Fill optional tours
  const optionalContainer = document.getElementById('optionalToursList');
  optionalContainer.innerHTML = '';
  pkg.optionalTours.forEach((tour) => {
    const item = document.createElement('div');
    item.className = 'optional-tour-item';
    item.innerHTML = `
            <div class="form-grid">
                <div class="form-group">
                    <label>관광지명</label>
                    <input type="text" class="optional-name" value="${sanitizeHtml(tour.name)}">
                </div>
                <div class="form-group">
                    <label>가격</label>
                    <input type="number" class="optional-price" value="${sanitizeHtml(tour.price)}" min="0">
                </div>
                <div class="form-group full-width">
                    <label>설명</label>
                    <textarea class="optional-description" rows="2">${sanitizeHtml(tour.description)}</textarea>
                </div>
            </div>
            <button type="button" class="btn-icon btn-danger remove-optional">
                <i class="fas fa-times"></i>
            </button>
        `;
    optionalContainer.appendChild(item);
  });

  // Set editing flag
  document.getElementById('packageForm').dataset.editingId = id;
  showToast('수정 모드로 전환되었습니다', 'info');
}

// Print itinerary (일정표)
function printItinerary(id) {
  window.open(`export_itinerary.html?id=${id}`, '_blank');
}

// Print quote (견적서)
function printQuote(id) {
  window.open(`print_template.html?id=${id}`, '_blank');
}

// Delete package
async function deletePackage(id) {
  if (
    !(await showConfirmModal('삭제', '정말 삭제하시겠습니까?', {
      danger: true,
    }))
  )
    return;

  const packages = getStoredPackages();
  const filtered = packages.filter((p) => p.id !== id);
  savePackages(filtered);
  loadSavedPackages();
  showToast('패키지가 삭제되었습니다', 'success');
}

// Reset form
function resetForm() {
  document.getElementById('packageForm').reset();
  delete document.getElementById('packageForm').dataset.editingId;

  // Reset dynamic lists to initial state
  document.getElementById('departureDatesList').innerHTML = `
        <div class="departure-item">
            <input type="date" class="departure-date" placeholder="출발일">
            <input type="number" class="available-seats" placeholder="잔여석" min="0">
            <button type="button" class="btn-icon btn-danger remove-date">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

  document.getElementById('hotelsList').innerHTML = `
        <div class="hotel-item">
            <div class="form-grid">
                <div class="form-group">
                    <label>호텔명</label>
                    <input type="text" class="hotel-name" placeholder="호텔명을 입력하세요">
                </div>
                <div class="form-group">
                    <label>등급</label>
                    <select class="hotel-rating">
                        <option value="">선택</option>
                        <option value="5성급">5성급</option>
                        <option value="4성급">4성급</option>
                        <option value="3성급">3성급</option>
                        <option value="특급">특급</option>
                        <option value="1급">1급</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>지역</label>
                    <input type="text" class="hotel-location" placeholder="호텔 위치">
                </div>
            </div>
            <button type="button" class="btn-icon btn-danger remove-hotel">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

  document.getElementById('itineraryList').innerHTML = `
        <div class="itinerary-item">
            <div class="day-header">
                <label>DAY <input type="number" class="day-number" value="1" min="1"></label>
                <button type="button" class="btn-icon btn-danger remove-itinerary">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="form-grid">
                <div class="form-group">
                    <label>일자</label>
                    <input type="date" class="itinerary-date" placeholder="일자">
                </div>
                <div class="form-group">
                    <label>지역</label>
                    <input type="text" class="itinerary-region" placeholder="예: 인천 → 다낭">
                </div>
                <div class="form-group">
                    <label>교통편</label>
                    <input type="text" class="itinerary-transport" placeholder="예: OZ123편 또는 전용차량">
                </div>
                <div class="form-group">
                    <label>시간</label>
                    <input type="text" class="itinerary-time" placeholder="예: 09:00 또는 09:00-18:00">
                </div>
            </div>
            <div class="form-group">
                <label>일정 내용</label>
                <textarea class="itinerary-schedule" rows="4" placeholder="상세 일정을 입력하세요"></textarea>
            </div>
            <div class="form-grid">
                <div class="form-group">
                    <label>식사</label>
                    <input type="text" class="itinerary-meals" placeholder="예: 조/중/석">
                </div>
                <div class="form-group">
                    <label>숙박</label>
                    <input type="text" class="itinerary-accommodation" placeholder="예: 호텔명">
                </div>
            </div>
        </div>
    `;

  document.getElementById('optionalToursList').innerHTML = `
        <div class="optional-tour-item">
            <div class="form-grid">
                <div class="form-group">
                    <label>관광지명</label>
                    <input type="text" class="optional-name" placeholder="관광지명">
                </div>
                <div class="form-group">
                    <label>가격</label>
                    <input type="number" class="optional-price" placeholder="가격" min="0">
                </div>
                <div class="form-group full-width">
                    <label>설명</label>
                    <textarea class="optional-description" rows="2" placeholder="설명"></textarea>
                </div>
            </div>
            <button type="button" class="btn-icon btn-danger remove-optional">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
}

// Download Sample Excel
function downloadSampleExcel() {
  const sampleData = [
    {
      상품코드: 'PGB225251203RS2',
      상품명: '광저우 3박4일 자유여행',
      목적지: '광저우',
      여행기간: '3박 4일',
      출발도시: '인천',
      항공사: '아시아나항공',
      성인가격: 590000,
      아동가격: 550000,
      유아가격: 150000,
      유류할증료: 80000,
      제세공과금: 45000,
      '1인추가요금': 100000,
      출발일1: '2024-12-15',
      잔여석1: 10,
      출발일2: '2024-12-20',
      잔여석2: 8,
      출발일3: '',
      잔여석3: '',
      호텔명1: '광저우 그랜드 호텔',
      호텔등급1: '5성급',
      호텔지역1: '광저우 시내',
      호텔명2: '',
      호텔등급2: '',
      호텔지역2: '',
      DAY1일차: 1,
      DAY1일자: '2024-12-15',
      DAY1지역: '인천 → 광저우',
      DAY1교통편: 'OZ369편',
      DAY1시간: '08:20-11:30',
      DAY1일정: '인천공항 출발 → 광저우 도착 후 호텔 체크인 → 석식',
      DAY1식사: '기내식/석',
      DAY1숙박: '광저우 그랜드 호텔',
      DAY2일차: 2,
      DAY2일자: '2024-12-16',
      DAY2지역: '광저우',
      DAY2교통편: '전용차량',
      DAY2시간: '09:00-18:00',
      DAY2일정:
        '호텔 조식 후\n천단공원 관광\n사면불산 관광\n북경로 쇼핑\n석식 후 호텔 복귀',
      DAY2식사: '조/중/석',
      DAY2숙박: '광저우 그랜드 호텔',
      DAY3일차: '',
      DAY3일자: '',
      DAY3지역: '',
      DAY3교통편: '',
      DAY3시간: '',
      DAY3일정: '',
      DAY3식사: '',
      DAY3숙박: '',
      포함사항: '왕복 항공권\n전 일정 호텔 숙박\n일정상의 식사',
      불포함사항: '개인 경비\n가이드/기사 팁\n여행자 보험',
      특전: '공항 라운지 이용권 제공',
      참고사항: '여권 유효기간 6개월 이상 필요',
      쇼핑정보: '진주센터, 차센터',
      선택관광1명칭: '마카오 당일 투어',
      선택관광1가격: 150000,
      선택관광1설명: '마카오 주요 관광지 투어',
      선택관광2명칭: '',
      선택관광2가격: '',
      선택관광2설명: '',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);

  // Set column widths
  ws['!cols'] = [
    { wch: 20 },
    { wch: 30 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '샘플데이터');

  const fileName = `hanatour_sample_template.xlsx`;
  XLSX.writeFile(wb, fileName);

  showToast('샘플 엑셀 파일이 다운로드되었습니다', 'success');
}

// Import from Excel
function importFromExcel(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);

      if (jsonData.length === 0) {
        showToast('엑셀 파일에 데이터가 없습니다', 'warning');
        return;
      }

      // Convert Excel data to package format
      const packages = getStoredPackages();
      let importedCount = 0;

      jsonData.forEach((row) => {
        const packageData = convertExcelRowToPackage(row);
        if (packageData) {
          packageData.id = generateId();
          packageData.timestamp = new Date().toISOString();
          packages.push(packageData);
          importedCount++;
        }
      });

      savePackages(packages);
      loadSavedPackages();
      showToast(`${importedCount}개의 패키지를 불러왔습니다`, 'success');
    } catch (error) {
      showToast('엑셀 파일을 읽는 중 오류가 발생했습니다', 'error');
    }
  };

  reader.readAsArrayBuffer(file);
  e.target.value = ''; // Reset file input
}

// Convert Excel row to package format
function convertExcelRowToPackage(row) {
  try {
    // Collect departure dates
    const departureDates = [];
    for (let i = 1; i <= 10; i++) {
      const date = row[`출발일${i}`];
      const seats = row[`잔여석${i}`];
      if (date) {
        departureDates.push({
          date: typeof date === 'number' ? excelDateToJSDate(date) : date,
          seats: seats || 0,
        });
      }
    }

    // Collect hotels
    const hotels = [];
    for (let i = 1; i <= 5; i++) {
      const name = row[`호텔명${i}`];
      if (name) {
        hotels.push({
          name: name,
          rating: row[`호텔등급${i}`] || '',
          location: row[`호텔지역${i}`] || '',
        });
      }
    }

    // Collect itinerary
    const itinerary = [];
    for (let i = 1; i <= 10; i++) {
      const day = row[`DAY${i}일차`];
      const region = row[`DAY${i}지역`];
      const schedule = row[`DAY${i}일정`];

      if (region || schedule) {
        const dateValue = row[`DAY${i}일자`];
        itinerary.push({
          day: day || i,
          date:
            typeof dateValue === 'number'
              ? excelDateToJSDate(dateValue)
              : dateValue || '',
          region: region || '',
          transport: row[`DAY${i}교통편`] || '',
          time: row[`DAY${i}시간`] || '',
          schedule: schedule || '',
          meals: row[`DAY${i}식사`] || '',
          accommodation: row[`DAY${i}숙박`] || '',
        });
      }
    }

    // Collect optional tours
    const optionalTours = [];
    for (let i = 1; i <= 5; i++) {
      const name = row[`선택관광${i}명칭`];
      if (name) {
        optionalTours.push({
          name: name,
          price: row[`선택관광${i}가격`] || 0,
          description: row[`선택관광${i}설명`] || '',
        });
      }
    }

    return {
      basicInfo: {
        packageCode: row['상품코드'] || '',
        packageName: row['상품명'] || '',
        destination: row['목적지'] || '',
        duration: row['여행기간'] || '',
        departureCity: row['출발도시'] || '',
        airline: row['항공사'] || '',
      },
      pricing: {
        priceAdult: row['성인가격'] || 0,
        priceChild: row['아동가격'] || 0,
        priceInfant: row['유아가격'] || 0,
        fuelSurcharge: row['유류할증료'] || 0,
        taxFee: row['제세공과금'] || 0,
        singleSupplement: row['1인추가요금'] || 0,
      },
      departureDates: departureDates,
      hotels: hotels,
      itinerary: itinerary,
      included: row['포함사항'] || '',
      excluded: row['불포함사항'] || '',
      benefits: row['특전'] || '',
      notes: row['참고사항'] || '',
      shopping: row['쇼핑정보'] || '',
      optionalTours: optionalTours,
    };
  } catch (error) {
    console.error('Error converting row:', error);
    return null;
  }
}

// Convert Excel date number to JavaScript date string
function excelDateToJSDate(excelDate) {
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Export to Excel
function exportToExcel() {
  const packages = getStoredPackages();
  if (packages.length === 0) {
    showToast('내보낼 데이터가 없습니다', 'warning');
    return;
  }

  // Prepare data for Excel - expanded format
  const data = packages.map((pkg) => {
    const row = {
      상품코드: pkg.basicInfo.packageCode,
      상품명: pkg.basicInfo.packageName,
      목적지: pkg.basicInfo.destination,
      여행기간: pkg.basicInfo.duration,
      출발도시: pkg.basicInfo.departureCity,
      항공사: pkg.basicInfo.airline,
      성인가격: pkg.pricing.priceAdult,
      아동가격: pkg.pricing.priceChild,
      유아가격: pkg.pricing.priceInfant,
      유류할증료: pkg.pricing.fuelSurcharge,
      제세공과금: pkg.pricing.taxFee,
      '1인추가요금': pkg.pricing.singleSupplement,
    };

    // Add departure dates
    pkg.departureDates.forEach((d, i) => {
      row[`출발일${i + 1}`] = d.date;
      row[`잔여석${i + 1}`] = d.seats;
    });

    // Add hotels
    pkg.hotels.forEach((h, i) => {
      row[`호텔명${i + 1}`] = h.name;
      row[`호텔등급${i + 1}`] = h.rating;
      row[`호텔지역${i + 1}`] = h.location;
    });

    // Add itinerary
    pkg.itinerary.forEach((item, i) => {
      row[`DAY${i + 1}일차`] = item.day;
      row[`DAY${i + 1}일자`] = item.date || '';
      row[`DAY${i + 1}지역`] = item.region || '';
      row[`DAY${i + 1}교통편`] = item.transport || '';
      row[`DAY${i + 1}시간`] = item.time || '';
      row[`DAY${i + 1}일정`] = item.schedule || '';
      row[`DAY${i + 1}식사`] = item.meals || '';
      row[`DAY${i + 1}숙박`] = item.accommodation || '';
    });

    // Add other fields
    row['포함사항'] = pkg.included;
    row['불포함사항'] = pkg.excluded;
    row['특전'] = pkg.benefits;
    row['참고사항'] = pkg.notes;
    row['쇼핑정보'] = pkg.shopping;

    // Add optional tours
    pkg.optionalTours.forEach((t, i) => {
      row[`선택관광${i + 1}명칭`] = t.name;
      row[`선택관광${i + 1}가격`] = t.price;
      row[`선택관광${i + 1}설명`] = t.description;
    });

    row['저장일시'] = new Date(pkg.timestamp).toLocaleString('ko-KR');

    return row;
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '패키지목록');

  const fileName = `hanatour_packages_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);

  showToast('엑셀 파일이 다운로드되었습니다', 'success');
}

// Expose functions for onclick attributes in dynamically generated HTML
window.viewPackage = viewPackage;
window.editPackage = editPackage;
window.printItinerary = printItinerary;
window.printQuote = printQuote;
window.deletePackage = deletePackage;

// Close modal when clicking outside
window.onclick = (e) => {
  const modal = document.getElementById('viewModal');
  if (e.target === modal) {
    closeViewModal();
  }
};
