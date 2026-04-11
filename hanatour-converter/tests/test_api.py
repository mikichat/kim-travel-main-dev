"""
API Routes Test

POST /api/convert 엔드포인트 테스트
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from datetime import time

from app.main import app
from app.services.excel import ItineraryDay, ItineraryItem


@pytest.fixture
def client():
    """FastAPI TestClient 픽스처"""
    return TestClient(app)


@pytest.fixture
def mock_scraper_data():
    """Mock 스크래핑 데이터"""
    return [
        {
            "day": "1일차",
            "date": "03/15(일)",
            "region": "인천 → 오사카",
            "transport": "항공",
            "time": "09:00",
            "schedule": "인천국제공항 출발 → 오사카 간사이공항 도착",
            "description": "인천국제공항에서 오사카 간사이공항으로 이동",
            "image_url": "",
            "meals": "조:기내식, 중:현지식, 석:호텔식"
        },
        {
            "day": "1일차",
            "date": "03/15(일)",
            "region": "오사카",
            "transport": "전용차량",
            "time": "14:00",
            "schedule": "오사카성 관광",
            "description": "오사카의 대표적인 성곽",
            "image_url": "https://image.hanatour.com/usr/cms/resize/800_0/photo/osaka.jpg",
            "meals": ""
        },
        {
            "day": "2일차",
            "date": "03/16(월)",
            "region": "교토",
            "transport": "전용차량",
            "time": "10:00",
            "schedule": "금각사 관광",
            "description": "교토의 대표적인 사찰",
            "image_url": "https://image.hanatour.com/usr/cms/resize/800_0/photo/kinkakuji.jpg",
            "meals": "조:호텔식, 중:현지식"
        }
    ]


@pytest.fixture
def mock_itinerary_data():
    """Mock 엑셀용 일정 데이터"""
    day1_items = [
        ItineraryItem(
            region_from="인천",
            region_to="오사카",
            transport="항공",
            time=time(9, 0, 0),
            description="인천국제공항 출발 → 오사카 간사이공항 도착",
            meal="조:기내식, 중:현지식, 석:호텔식"
        ),
        ItineraryItem(
            region_from="오사카",
            transport="전용차량",
            time=time(14, 0, 0),
            description="오사카성 관광",
            meal=""
        ),
    ]

    day2_items = [
        ItineraryItem(
            region_from="교토",
            transport="전용차량",
            time=time(10, 0, 0),
            description="금각사 관광",
            meal="조:호텔식, 중:현지식"
        ),
    ]

    return [
        ItineraryDay(day_number=1, items=day1_items),
        ItineraryDay(day_number=2, items=day2_items),
    ]


class TestConvertEndpoint:
    """POST /api/convert 엔드포인트 테스트"""

    def test_convert_success(self, client, mock_scraper_data, mock_itinerary_data):
        """정상 요청 시 엑셀 파일 다운로드 테스트"""
        test_url = "https://www.hanatour.com/product/japan/123"

        with patch('app.api.routes.extract_schedule') as mock_extract, \
             patch('app.api.routes.convert_to_itinerary_days') as mock_convert, \
             patch('app.api.routes.ExcelGenerator') as mock_excel_gen:

            # Mock 설정
            mock_extract.return_value = mock_scraper_data
            mock_convert.return_value = mock_itinerary_data

            mock_excel_instance = MagicMock()
            mock_excel_instance.generate_excel_bytes.return_value = b"fake_excel_data"
            mock_excel_gen.return_value = mock_excel_instance

            # API 호출
            response = client.post(
                "/api/convert",
                json={"url": test_url}
            )

            # 검증
            assert response.status_code == 200
            assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            assert "attachment; filename=" in response.headers["content-disposition"]
            assert response.content == b"fake_excel_data"

            # Mock 호출 확인
            mock_extract.assert_called_once_with(test_url)
            mock_convert.assert_called_once_with(mock_scraper_data)
            mock_excel_instance.generate_excel_bytes.assert_called_once_with(mock_itinerary_data)

    def test_convert_missing_url(self, client):
        """URL 누락 시 400 에러"""
        response = client.post("/api/convert", json={})

        assert response.status_code == 422  # FastAPI validation error

    def test_convert_invalid_url(self, client):
        """잘못된 URL 형식 시 400 에러"""
        with patch('app.api.routes.validate_url') as mock_validate:
            mock_validate.return_value = False

            response = client.post(
                "/api/convert",
                json={"url": "not-a-url"}
            )

            assert response.status_code == 400
            response_data = response.json()
            assert "detail" in response_data
            assert "error" in response_data["detail"]

    def test_convert_not_hanatour_url(self, client):
        """하나투어 URL이 아닐 때 400 에러"""
        response = client.post(
            "/api/convert",
            json={"url": "https://www.google.com"}
        )

        assert response.status_code == 400
        response_data = response.json()
        assert "detail" in response_data
        assert "error" in response_data["detail"]
        assert "하나투어" in response_data["detail"]["error"]

    def test_convert_scraping_error(self, client):
        """스크래핑 실패 시 500 에러"""
        test_url = "https://www.hanatour.com/product/japan/123"

        with patch('app.api.routes.extract_schedule') as mock_extract:
            mock_extract.side_effect = Exception("페이지 로딩 실패")

            response = client.post(
                "/api/convert",
                json={"url": test_url}
            )

            assert response.status_code == 500
            response_data = response.json()
            assert "detail" in response_data
            assert "error" in response_data["detail"]

    def test_convert_empty_schedule(self, client):
        """빈 일정 데이터 시 400 에러"""
        test_url = "https://www.hanatour.com/product/japan/123"

        with patch('app.api.routes.extract_schedule') as mock_extract:
            mock_extract.return_value = []

            response = client.post(
                "/api/convert",
                json={"url": test_url}
            )

            assert response.status_code == 400
            response_data = response.json()
            assert "detail" in response_data
            assert "error" in response_data["detail"]
            assert "일정" in response_data["detail"]["error"]

    def test_convert_excel_generation_error(self, client, mock_scraper_data, mock_itinerary_data):
        """엑셀 생성 실패 시 500 에러"""
        test_url = "https://www.hanatour.com/product/japan/123"

        with patch('app.api.routes.extract_schedule') as mock_extract, \
             patch('app.api.routes.convert_to_itinerary_days') as mock_convert, \
             patch('app.api.routes.ExcelGenerator') as mock_excel_gen:

            mock_extract.return_value = mock_scraper_data
            mock_convert.return_value = mock_itinerary_data

            mock_excel_instance = MagicMock()
            mock_excel_instance.generate_excel_bytes.side_effect = Exception("엑셀 생성 실패")
            mock_excel_gen.return_value = mock_excel_instance

            response = client.post(
                "/api/convert",
                json={"url": test_url}
            )

            assert response.status_code == 500
            response_data = response.json()
            assert "detail" in response_data
            assert "error" in response_data["detail"]

    def test_convert_filename_format(self, client, mock_scraper_data, mock_itinerary_data):
        """파일명 형식 확인"""
        test_url = "https://www.hanatour.com/product/japan/123"

        with patch('app.api.routes.extract_schedule') as mock_extract, \
             patch('app.api.routes.convert_to_itinerary_days') as mock_convert, \
             patch('app.api.routes.ExcelGenerator') as mock_excel_gen:

            mock_extract.return_value = mock_scraper_data
            mock_convert.return_value = mock_itinerary_data

            mock_excel_instance = MagicMock()
            mock_excel_instance.generate_excel_bytes.return_value = b"fake_excel_data"
            mock_excel_gen.return_value = mock_excel_instance

            response = client.post(
                "/api/convert",
                json={"url": test_url}
            )

            # 파일명에 타임스탬프가 포함되어야 함
            assert response.status_code == 200
            content_disposition = response.headers["content-disposition"]
            assert "hanatour_itinerary_" in content_disposition
            assert ".xlsx" in content_disposition
