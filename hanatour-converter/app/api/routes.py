"""
API Routes

POST /api/convert - 하나투어 URL을 엑셀 파일로 변환
"""

from datetime import datetime, time
from pathlib import Path
from typing import Dict, List

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, HttpUrl

from app.services.scraper import extract_schedule, validate_url
from app.services.excel import ExcelGenerator, ItineraryDay, ItineraryItem

DOWNLOADS_DIR = Path(__file__).parent.parent.parent / "downloads"

router = APIRouter(prefix="/api", tags=["convert"])


class ConvertRequest(BaseModel):
    """변환 요청 모델"""
    url: str


def parse_time(time_str: str) -> time | None:
    """시간 문자열을 time 객체로 변환

    Args:
        time_str: "09:00", "14:30" 등의 형식

    Returns:
        time 객체 또는 None
    """
    if not time_str or not time_str.strip():
        return None

    try:
        # "09:00" -> time(9, 0, 0)
        parts = time_str.strip().split(":")
        if len(parts) == 2:
            hour, minute = int(parts[0]), int(parts[1])
            return time(hour, minute, 0)
    except (ValueError, IndexError):
        pass

    return None


def parse_region(region_str: str) -> tuple[str, str]:
    """지역 문자열을 출발/도착으로 분리

    Args:
        region_str: "인천 → 오사카" 또는 "오사카" 등

    Returns:
        (출발지역, 도착지역) 튜플
    """
    if "→" in region_str or "->" in region_str:
        parts = region_str.replace("->", "→").split("→")
        return parts[0].strip(), parts[1].strip() if len(parts) > 1 else ""
    else:
        return region_str.strip(), ""


def convert_to_itinerary_days(schedule_data: List[Dict[str, str]]) -> List[ItineraryDay]:
    """스크래핑 데이터를 엑셀용 일정 데이터로 변환

    Args:
        schedule_data: extract_schedule()의 반환값

    Returns:
        ItineraryDay 리스트
    """
    days_map: Dict[int, List[ItineraryItem]] = {}

    for item in schedule_data:
        # 일차 추출 ("1일차" -> 1)
        day_str = item.get("day", "1일차")
        day_number = int(''.join(filter(str.isdigit, day_str)) or "1")

        # 지역 파싱
        region_from, region_to = parse_region(item.get("region", ""))

        # ItineraryItem 생성
        itinerary_item = ItineraryItem(
            region_from=region_from,
            region_to=region_to,
            transport=item.get("transport", ""),
            time=parse_time(item.get("time", "")),
            schedule_title=item.get("schedule", ""),  # 관광지 이름
            description=item.get("description", ""),  # 관광지 상세 설명
            image_url=item.get("image_url", ""),  # 이미지 URL
            meal=item.get("meals", ""),
        )

        # 일차별로 그룹화
        if day_number not in days_map:
            days_map[day_number] = []
        days_map[day_number].append(itinerary_item)

    # ItineraryDay 객체로 변환
    itinerary_days = [
        ItineraryDay(day_number=day_num, items=items)
        for day_num, items in sorted(days_map.items())
    ]

    return itinerary_days


async def _validate_and_scrape(url: str) -> List[Dict[str, str]]:
    """URL 검증 + 스크래핑 공통 로직"""
    if not validate_url(url):
        raise HTTPException(
            status_code=400,
            detail={"error": "유효하지 않은 URL입니다. 하나투어 URL을 입력해주세요."}
        )

    if "hanatour.com" not in url:
        raise HTTPException(
            status_code=400,
            detail={"error": "하나투어 URL이 아닙니다."}
        )

    schedule_data = await extract_schedule(url)

    if not schedule_data:
        raise HTTPException(
            status_code=400,
            detail={"error": "일정 데이터를 찾을 수 없습니다."}
        )

    return schedule_data


@router.post("/scrape-json")
async def scrape_hanatour_json(request: ConvertRequest):
    """하나투어 URL → JSON 일정 데이터 반환"""
    url = request.url

    try:
        schedule_data = await _validate_and_scrape(url)
        return {"schedule": schedule_data, "url": url}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"[ERROR] Scrape JSON failed: {error_detail}")
        raise HTTPException(
            status_code=500,
            detail={"error": f"스크래핑 중 오류가 발생했습니다: {str(e)}"}
        )


@router.post("/convert")
async def convert_hanatour_to_excel(request: ConvertRequest):
    """
    하나투어 URL을 엑셀 파일로 변환

    Args:
        request: { "url": "https://www.hanatour.com/..." }

    Returns:
        StreamingResponse: 엑셀 파일 다운로드

    Raises:
        HTTPException: 400 (잘못된 요청), 500 (서버 에러)
    """
    url = request.url

    try:
        # 1-2. URL 검증 + 스크래핑
        schedule_data = await _validate_and_scrape(url)

        # 3. 데이터 변환
        itinerary_days = convert_to_itinerary_days(schedule_data)

        # 4. 엑셀 생성 + 이미지 로컬 저장
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        image_dir = str(DOWNLOADS_DIR / f"images_{timestamp}")
        excel_generator = ExcelGenerator(image_dir=image_dir)
        excel_bytes = excel_generator.generate_excel_bytes(itinerary_days)

        # 5. 파일명 생성 (타임스탬프 포함)
        filename = f"hanatour_itinerary_{timestamp}.xlsx"

        # 6. StreamingResponse 반환
        return StreamingResponse(
            iter([excel_bytes]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"[ERROR] Convert failed: {error_detail}")
        raise HTTPException(
            status_code=500,
            detail={"error": f"변환 중 오류가 발생했습니다: {str(e)}", "traceback": error_detail}
        )
