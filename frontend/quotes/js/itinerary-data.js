/**
 * 일정표 데이터 구조
 * Phase 2: 이미지 기반 일정표 시스템
 */

// ==================================================================
// 일정표 데이터 스키마
// ==================================================================

/**
 * 일정표 전체 데이터
 * @typedef {Object} ItineraryData
 * @property {string} itinerary_id - 일정표 고유 ID
 * @property {string} group_name - 단체명
 * @property {DaySchedule[]} days - 일자별 일정
 */

/**
 * 일자별 일정
 * @typedef {Object} DaySchedule
 * @property {number} day_number - 일차 (1, 2, 3...)
 * @property {string} date - 날짜 (예: "11/14")
 * @property {string} day_of_week - 요일 (예: "목")
 * @property {string} title - 일정 제목
 * @property {ScheduleItem[]} schedule - 세부 일정
 * @property {MealInfo} meals - 식사 정보
 * @property {string} hotel - 호텔 정보
 * @property {string} background_image - 배경 이미지 경로 (선택사항)
 */

/**
 * 세부 일정 항목
 * @typedef {Object} ScheduleItem
 * @property {string} time - 시간 (예: "08:40", "종일")
 * @property {string} description - 일정 설명
 * @property {string} location - 장소
 */

/**
 * 식사 정보
 * @typedef {Object} MealInfo
 * @property {string} breakfast - 조식
 * @property {string} lunch - 중식
 * @property {string} dinner - 석식
 */

// ==================================================================
// 기본 샘플 데이터
// ==================================================================

const DEFAULT_ITINERARY_DATA = {
  itinerary_id: '',
  group_name: '중국 – 광저우 천저우 고의령 망산 PTY',
  days: [
    {
      day_number: 1,
      date: '11/14',
      day_of_week: '목',
      title: '인천 → 광저우',
      schedule: [
        {
          time: '08:40',
          description: '인천국제공항 출발',
          location: '인천국제공항 1청사',
        },
        {
          time: '11:15',
          description: '광저우 바이윈 국제공항 도착',
          location: '광저우',
        },
        {
          time: '오후',
          description: '점심 식사 후 호텔 체크인',
          location: '광저우',
        },
        {
          time: '저녁',
          description: '환영 만찬',
          location: '시내 레스토랑',
        },
      ],
      meals: {
        breakfast: '기내식',
        lunch: '현지식',
        dinner: '한식',
      },
      hotel: '광저우 ****호텔',
      background_image: '',
    },
    {
      day_number: 2,
      date: '11/15',
      day_of_week: '금',
      title: '광저우 → 천저우 → 고의령',
      schedule: [
        {
          time: '조식 후',
          description: '호텔 출발',
          location: '광저우',
        },
        {
          time: '오전',
          description: '천저우 고적 관람',
          location: '천저우',
        },
        {
          time: '오후',
          description: '고의령 단하산 관광',
          location: '고의령',
        },
        {
          time: '저녁',
          description: '현지 맛집 저녁 식사',
          location: '고의령',
        },
      ],
      meals: {
        breakfast: '호텔식',
        lunch: '현지식',
        dinner: '현지식',
      },
      hotel: '고의령 ****호텔',
      background_image: '',
    },
    {
      day_number: 3,
      date: '11/16',
      day_of_week: '토',
      title: '고의령 → 망산 → 광저우',
      schedule: [
        {
          time: '조식 후',
          description: '호텔 출발',
          location: '고의령',
        },
        {
          time: '오전',
          description: '망산 국립공원 관광',
          location: '망산',
        },
        {
          time: '오후',
          description: '광저우 귀환, 쇼핑 시간',
          location: '광저우',
        },
        {
          time: '저녁',
          description: '송별 만찬',
          location: '광저우',
        },
      ],
      meals: {
        breakfast: '호텔식',
        lunch: '현지식',
        dinner: '한식',
      },
      hotel: '광저우 ****호텔',
      background_image: '',
    },
    {
      day_number: 4,
      date: '11/17',
      day_of_week: '일',
      title: '광저우 → 인천',
      schedule: [
        {
          time: '조식 후',
          description: '호텔 체크아웃',
          location: '광저우',
        },
        {
          time: '오전',
          description: '자유 시간 (쇼핑)',
          location: '광저우',
        },
        {
          time: '12:20',
          description: '광저우 공항 출발',
          location: '광저우 바이윈 국제공항',
        },
        {
          time: '17:00',
          description: '인천 도착, 해산',
          location: '인천국제공항 1청사',
        },
      ],
      meals: {
        breakfast: '호텔식',
        lunch: '기내식',
        dinner: '-',
      },
      hotel: '-',
      background_image: '',
    },
  ],
};

// ==================================================================
// 간소화된 일정표 데이터 (편집용)
// ==================================================================

/**
 * 간단한 편집을 위한 일정표 데이터 구조
 * 배경 이미지 + 최소한의 텍스트 오버레이
 */
const SIMPLE_ITINERARY_DATA = {
  itinerary_id: '',
  pages: [
    {
      page_number: 1,
      page_type: 'quote',
      title: '여행 견적서',
      // Phase 1 데이터 사용
    },
    {
      page_number: 2,
      page_type: 'itinerary_day',
      background_image:
        '../itinerary/chain/can/25년11월중순 광저우 망산-1_hd5.png',
      day_info: {
        day_number: 1,
        date: '11/14',
        day_of_week: '목',
        title: '인천 → 광저우',
      },
      editable_text: {
        main_schedule:
          '08:40 인천 출발\n11:15 광저우 도착\n오후 호텔 체크인\n저녁 환영 만찬',
        meals: '조: 기내식 / 중: 현지식 / 석: 한식',
        hotel: '광저우 ****호텔',
      },
    },
    {
      page_number: 3,
      page_type: 'itinerary_day',
      background_image:
        '../itinerary/chain/can/25년11월중순 광저우 망산-1_hda.png',
      day_info: {
        day_number: 2,
        date: '11/15',
        day_of_week: '금',
        title: '광저우 → 천저우 → 고의령',
      },
      editable_text: {
        main_schedule:
          '조식 후 호텔 출발\n오전 천저우 고적 관람\n오후 고의령 단하산 관광\n저녁 현지 맛집',
        meals: '조: 호텔식 / 중: 현지식 / 석: 현지식',
        hotel: '고의령 ****호텔',
      },
    },
    // ... 더 많은 페이지 추가 가능
  ],
};

// ==================================================================
// 데이터 변환 함수
// ==================================================================

/**
 * 상세 일정표 데이터를 간소화된 형태로 변환
 * @param {ItineraryData} detailedData
 * @returns {Object} 간소화된 데이터
 */
function convertToSimpleFormat(detailedData) {
  const pages = [
    {
      page_number: 1,
      page_type: 'quote',
      title: '여행 견적서',
    },
  ];

  detailedData.days.forEach((day, index) => {
    // 일정을 텍스트로 변환
    const scheduleText = day.schedule
      .map((item) => `${item.time} ${item.description}`)
      .join('\n');

    // 식사 정보를 텍스트로 변환
    const mealsText = `조: ${day.meals.breakfast} / 중: ${day.meals.lunch} / 석: ${day.meals.dinner}`;

    pages.push({
      page_number: index + 2,
      page_type: 'itinerary_day',
      background_image: day.background_image || '',
      day_info: {
        day_number: day.day_number,
        date: day.date,
        day_of_week: day.day_of_week,
        title: day.title,
      },
      editable_text: {
        main_schedule: scheduleText,
        meals: mealsText,
        hotel: day.hotel,
      },
    });
  });

  return {
    itinerary_id: detailedData.itinerary_id,
    group_name: detailedData.group_name,
    pages: pages,
  };
}

/**
 * 간소화된 데이터를 상세 형태로 변환
 * @param {Object} simpleData
 * @returns {ItineraryData}
 */
function convertToDetailedFormat(simpleData) {
  const days = [];

  simpleData.pages.forEach((page) => {
    if (page.page_type !== 'itinerary_day') return;

    // 스케줄 텍스트를 파싱
    const scheduleLines = page.editable_text.main_schedule.split('\n');
    const schedule = scheduleLines.map((line) => {
      const parts = line.split(' ');
      return {
        time: parts[0] || '',
        description: parts.slice(1).join(' ') || '',
        location: '',
      };
    });

    // 식사 텍스트를 파싱
    const mealsMatch = page.editable_text.meals.match(
      /조:\s*([^/]+)\s*\/\s*중:\s*([^/]+)\s*\/\s*석:\s*(.+)/
    );
    const meals = {
      breakfast: mealsMatch ? mealsMatch[1].trim() : '',
      lunch: mealsMatch ? mealsMatch[2].trim() : '',
      dinner: mealsMatch ? mealsMatch[3].trim() : '',
    };

    days.push({
      day_number: page.day_info.day_number,
      date: page.day_info.date,
      day_of_week: page.day_info.day_of_week,
      title: page.day_info.title,
      schedule: schedule,
      meals: meals,
      hotel: page.editable_text.hotel,
      background_image: page.background_image,
    });
  });

  return {
    itinerary_id: simpleData.itinerary_id,
    group_name: simpleData.group_name,
    days: days,
  };
}

// ==================================================================
// Window Exposure (HTML inline scripts)
// ==================================================================
window.DEFAULT_ITINERARY_DATA = DEFAULT_ITINERARY_DATA;
window.SIMPLE_ITINERARY_DATA = SIMPLE_ITINERARY_DATA;
window.convertToSimpleFormat = convertToSimpleFormat;
window.convertToDetailedFormat = convertToDetailedFormat;

// ==================================================================
// ESM Export
// ==================================================================
export {
  DEFAULT_ITINERARY_DATA,
  SIMPLE_ITINERARY_DATA,
  convertToSimpleFormat,
  convertToDetailedFormat,
};
