"""
하나투어 웹 스크래핑 서비스

하나투어 일본 상품 페이지에서 여행 일정 정보를 추출합니다.
Windows asyncio 문제를 회피하기 위해 subprocess로 별도 프로세스에서 실행합니다.
"""

import subprocess
import sys
import json
from pathlib import Path
from typing import List, Dict


# Mock 모드 설정 (True: Mock 데이터, False: 실제 스크래핑)
USE_MOCK = False


def _get_mock_data() -> List[Dict[str, str]]:
    """테스트용 Mock 데이터"""
    return [
        {
            "day": "1일차",
            "region": "인천 → 오사카",
            "transport": "항공 OZ111",
            "time": "09:00",
            "schedule": "인천국제공항 출발 → 간사이국제공항 도착 → 오사카 시내 이동",
            "meals": "조식: X, 중식: 기내식, 석식: 현지식"
        },
        {
            "day": "2일차",
            "region": "오사카",
            "transport": "전용버스",
            "time": "08:30",
            "schedule": "호텔 조식 후 오사카성 관광 → 도톤보리 자유시간 → 신사이바시 쇼핑",
            "meals": "조식: 호텔식, 중식: 자유식, 석식: 현지식"
        },
        {
            "day": "3일차",
            "region": "오사카 → 인천",
            "transport": "항공 OZ112",
            "time": "10:00",
            "schedule": "호텔 조식 후 공항 이동 → 간사이국제공항 출발 → 인천국제공항 도착",
            "meals": "조식: 호텔식, 중식: 기내식, 석식: X"
        }
    ]


def _extract_via_subprocess(url: str) -> List[Dict[str, str]]:
    """
    subprocess로 별도 프로세스에서 Playwright 스크래핑 실행
    Windows asyncio 이벤트 루프 문제를 회피합니다.
    """
    import os
    worker_path = Path(__file__).parent / "scraper_worker.py"

    # Windows 인코딩 문제 해결을 위해 환경변수 설정
    env = os.environ.copy()
    env['PYTHONIOENCODING'] = 'utf-8'

    result = subprocess.run(
        [sys.executable, str(worker_path), url],
        capture_output=True,
        env=env,
        timeout=90  # 90초 타임아웃 (API 인터셉션 대기 시간 반영)
    )

    # bytes로 받아서 utf-8로 디코딩
    stdout = result.stdout.decode('utf-8', errors='replace')
    stderr = result.stderr.decode('utf-8', errors='replace')

    if result.returncode != 0:
        error_msg = stderr or "스크래핑 프로세스 실행 실패"
        raise Exception(error_msg)

    try:
        response = json.loads(stdout)
    except json.JSONDecodeError:
        raise Exception(f"JSON 파싱 실패: {stdout[:200]}")

    if not response.get("success"):
        raise Exception(response.get("error", "알 수 없는 오류"))

    return response.get("data", [])


async def extract_schedule(url: str) -> List[Dict[str, str]]:
    """
    하나투어 URL에서 일정 데이터 추출

    Args:
        url: 하나투어 상품 페이지 URL

    Returns:
        일정 데이터 리스트

    Raises:
        ValueError: URL이 비어있거나 하나투어가 아닌 경우
        Exception: 스크래핑 실패
    """
    if not url:
        raise ValueError("URL이 비어있습니다")

    if "hanatour.com" not in url:
        raise ValueError("하나투어 URL이 아닙니다")

    if USE_MOCK:
        return _get_mock_data()

    return _extract_via_subprocess(url)


def validate_url(url: str) -> bool:
    """
    하나투어 URL 유효성 검사

    Args:
        url: 검사할 URL

    Returns:
        유효하면 True, 아니면 False
    """
    if not url:
        return False

    if not url.startswith("http"):
        return False

    if "hanatour.com" not in url:
        return False

    return True
