// js/modules/sampleData.js
import * as api from './api.js';

export async function checkAndAddSampleData() {
  try {
    const customersResponse = await api.getTableData('customers', 'limit=1');
    if (customersResponse.data && customersResponse.data.length > 0) {
      return;
    }
    await addSampleData();
  } catch (error) {
    console.error('샘플 데이터 확인 중 오류:', error);
  }
}

async function addSampleData() {
  try {
    // 샘플 고객 추가
    const sampleCustomers = [
      {
        name_kor: '김철수',
        name_eng: 'KIM CHULSOO',
        passport_number: 'M12345678',
        birth_date: '1985-03-15',
        passport_expiry: '2028-03-14',
        phone: '010-1234-5678',
        email: 'kim@example.com',
        address: '서울시 강남구',
        travel_history: '일본(2022), 태국(2023)',
        notes: '',
      },
      {
        name_kor: '이영희',
        name_eng: 'LEE YOUNGHEE',
        passport_number: 'M87654321',
        birth_date: '1990-07-22',
        passport_expiry: '2027-07-21',
        phone: '010-2345-6789',
        email: 'lee@example.com',
        address: '서울시 서초구',
        travel_history: '베트남(2021), 싱가포르(2023)',
        notes: '',
      },
      {
        name_kor: '박민수',
        name_eng: 'PARK MINSU',
        passport_number: 'M11223344',
        birth_date: '1988-11-30',
        passport_expiry: '2029-11-29',
        phone: '010-3456-7890',
        email: 'park@example.com',
        address: '경기도 성남시',
        travel_history: '프랑스(2019), 스페인(2022)',
        notes: '단체 여행 선호',
      },
    ];

    const addedCustomers = await Promise.all(
      sampleCustomers.map((customer) =>
        api.createTableData('customers', customer)
      )
    );

    // 샘플 상품 추가
    const sampleProducts = [
      {
        name: '도쿄 자유여행 4일',
        destination: '일본 도쿄',
        duration: 4,
        price: 850000,
        status: '활성',
        description: '도쿄의 주요 명소를 자유롭게 여행하는 패키지입니다.',
      },
      {
        name: '방콕 휴양 5일',
        destination: '태국 방콕',
        duration: 5,
        price: 650000,
        status: '활성',
        description: '방콕과 파타야의 아름다운 해변을 즐기는 여행입니다.',
      },
      {
        name: '파리 문화탐방 7일',
        destination: '프랑스 파리',
        duration: 7,
        price: 2500000,
        status: '활성',
        description: '파리의 예술과 문화를 체험하는 프리미엄 여행입니다.',
      },
    ];

    const addedProducts = await Promise.all(
      sampleProducts.map((product) => api.createTableData('products', product))
    );

    // 샘플 예약 추가
    const today = new Date();
    const futureDate = (days) => {
      const d = new Date(today);
      d.setDate(today.getDate() + days);
      return d.toISOString().split('T')[0];
    };

    const sampleBookings = [
      {
        customer_id: addedCustomers[0].id,
        customer_name: addedCustomers[0].name_kor,
        product_id: addedProducts[0].id,
        product_name: addedProducts[0].name,
        departure_date: futureDate(10),
        return_date: futureDate(14),
        participants: 2,
        total_price: addedProducts[0].price * 2,
        hotel_name: '도쿄 타워 호텔',
        flight_number: 'KE701',
        status: '예약확정',
        notes: '신혼여행',
      },
      {
        customer_id: addedCustomers[1].id,
        customer_name: addedCustomers[1].name_kor,
        product_id: addedProducts[1].id,
        product_name: addedProducts[1].name,
        departure_date: futureDate(30),
        return_date: futureDate(35),
        participants: 1,
        total_price: addedProducts[1].price,
        hotel_name: '방콕 리버사이드 호텔',
        flight_number: 'TG659',
        status: '견적발송',
        notes: '개인 휴양',
      },
      {
        customer_id: addedCustomers[2].id,
        customer_name: addedCustomers[2].name_kor,
        product_id: addedProducts[2].id,
        product_name: addedProducts[2].name,
        departure_date: futureDate(60),
        return_date: futureDate(67),
        participants: 3,
        total_price: addedProducts[2].price * 3,
        hotel_name: '파리 에펠 호텔',
        flight_number: 'AF267',
        status: '문의',
        notes: '가족 여행',
      },
    ];

    await Promise.all(
      sampleBookings.map((booking) => api.createTableData('bookings', booking))
    );
  } catch (error) {
    console.error('샘플 데이터 추가 중 오류 발생:', error);
  }
}
