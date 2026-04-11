"""
하나투어 스크래퍼 테스트 — API JSON 파싱 함수별 단위 테스트

Playwright 없이 순수 함수만 테스트합니다.
Mock API JSON fixture를 사용합니다.
"""

import pytest

from app.services.scraper_worker import (
    format_date,
    extract_images_from_html,
    get_best_image,
    extract_meal_info,
    extract_region_from_items,
    extract_description,
    parse_itinerary_api,
    enrich_with_sightseeing,
)


# ──────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────

@pytest.fixture
def sample_api_response():
    """getPkgProdItnrInfo API 응답 Mock"""
    return {
        "body": {
            "schdInfoList": [
                {
                    "schdDay": 1,
                    "strtDt": "20260315",
                    "strDow": "일",
                    "schdMainInfoList": [
                        {
                            "schdCatgNm": "도시간이동",
                            "cardNm": "",
                            "depCityNm": "인천",
                            "arriveCityNm": "오사카",
                            "trspNm": "항공",
                        },
                        {
                            "schdCatgNm": "관광지",
                            "cardNm": "오사카성",
                            "cardCntntPc": '<div><img src="https://image.hanatour.com/usr/cms/resize/400_0/photo/osaka_castle.jpg"></div>',
                            "cmsInfoList": [
                                {
                                    "cmsCntntNm": "오사카성 소개",
                                    "cmsCntntCont": "<p>일본의 대표적인 성곽</p>",
                                    "pkgCmsImgInfoList": [],
                                }
                            ],
                        },
                        {
                            "schdCatgNm": "호텔/크루즈",
                            "cardNm": "오사카 힐튼 호텔",
                            "cardCntntPc": "",
                            "cmsInfoList": [
                                {
                                    "cmsCntntNm": "",
                                    "cmsCntntCont": "",
                                    "pkgCmsImgInfoList": [
                                        {"filePathNm": "photo/hotel_hilton.jpg"}
                                    ],
                                }
                            ],
                        },
                        {
                            "schdCatgNm": "식사",
                            "cardNm": "",
                            "mealTypeNm": "조식",
                            "mealCont": "기내식",
                        },
                        {
                            "schdCatgNm": "식사",
                            "cardNm": "",
                            "mealTypeNm": "중식",
                            "mealCont": "현지식",
                        },
                        {
                            "schdCatgNm": "식사",
                            "cardNm": "",
                            "mealTypeNm": "석식",
                            "mealCont": "호텔식",
                        },
                        {
                            "schdCatgNm": "텍스트입력",
                            "cardNm": "",
                        },
                    ],
                },
                {
                    "schdDay": 2,
                    "strtDt": "20260316",
                    "strDow": "월",
                    "schdMainInfoList": [
                        {
                            "schdCatgNm": "관광지",
                            "cardNm": "금각사",
                            "cityNm": "교토",
                            "cardCntntPc": "",
                            "cmsInfoList": [],
                        },
                        {
                            "schdCatgNm": "관광지",
                            "cardNm": "후시미 이나리",
                            "cityNm": "교토",
                            "cardCntntPc": "",
                            "cmsInfoList": [
                                {
                                    "cmsCntntNm": "후시미 이나리 신사",
                                    "cmsCntntCont": "<b>수천 개의 도리이</b>가 유명한 신사",
                                    "pkgCmsImgInfoList": [
                                        {"filePathNm": "photo/fushimi.jpg"}
                                    ],
                                }
                            ],
                        },
                        {
                            "schdCatgNm": "식사",
                            "cardNm": "",
                            "mealTypeNm": "조식",
                            "mealCont": "호텔식",
                        },
                    ],
                },
            ]
        }
    }


@pytest.fixture
def sample_sigh_response():
    """getPkgSighInfo API 응답 Mock"""
    return {
        "body": {
            "pkgSighInfoList": [
                {
                    "sighNm": "금각사",
                    "filePathNm": "photo/kinkakuji.jpg",
                },
                {
                    "sighNm": "도톤보리",
                    "filePathNm": "",
                    "pkgSighImgInfoList": [
                        {"filePathNm": "photo/dotonbori.jpg"}
                    ],
                },
            ]
        }
    }


# ──────────────────────────────────────────────
# format_date
# ──────────────────────────────────────────────

class TestFormatDate:
    def test_normal(self):
        assert format_date("20260315", "일") == "03/15(일)"

    def test_without_dow(self):
        assert format_date("20260315", "") == "03/15"

    def test_none_dow(self):
        assert format_date("20260315", None) == "03/15"

    def test_empty_strt_dt(self):
        assert format_date("", "일") == ""

    def test_none_strt_dt(self):
        assert format_date(None, "일") == ""

    def test_short_strt_dt(self):
        assert format_date("2026", "일") == ""


# ──────────────────────────────────────────────
# extract_images_from_html
# ──────────────────────────────────────────────

class TestExtractImagesFromHtml:
    def test_single_image(self):
        html = '<div><img src="https://image.hanatour.com/usr/cms/resize/400_0/photo/test.jpg"></div>'
        result = extract_images_from_html(html)
        assert len(result) == 1
        assert "/resize/800_0/" in result[0]
        assert "photo/test.jpg" in result[0]

    def test_multiple_images(self):
        html = '''
        <div>
            <img src="https://image.hanatour.com/usr/cms/resize/300_0/photo/a.jpg">
            <img src="https://image.hanatour.com/usr/cms/resize/600_0/photo/b.jpg">
        </div>
        '''
        result = extract_images_from_html(html)
        assert len(result) == 2
        assert all("/resize/800_0/" in url for url in result)

    def test_non_hanatour_images_ignored(self):
        html = '<img src="https://other-cdn.com/photo.jpg"><img src="https://image.hanatour.com/usr/cms/resize/400_0/photo/test.jpg">'
        result = extract_images_from_html(html)
        assert len(result) == 1
        assert "image.hanatour.com" in result[0]

    def test_empty_html(self):
        assert extract_images_from_html("") == []

    def test_none_html(self):
        assert extract_images_from_html(None) == []

    def test_no_images(self):
        assert extract_images_from_html("<div>text only</div>") == []

    def test_deduplication(self):
        html = '''
        <img src="https://image.hanatour.com/usr/cms/resize/400_0/photo/same.jpg">
        <img src="https://image.hanatour.com/usr/cms/resize/400_0/photo/same.jpg">
        '''
        result = extract_images_from_html(html)
        assert len(result) == 1


# ──────────────────────────────────────────────
# get_best_image
# ──────────────────────────────────────────────

class TestGetBestImage:
    def test_priority_card_html(self):
        """cardCntntPc 이미지가 최우선"""
        item = {
            "cardCntntPc": '<img src="https://image.hanatour.com/usr/cms/resize/400_0/photo/card.jpg">',
            "cmsInfoList": [
                {
                    "pkgCmsImgInfoList": [
                        {"filePathNm": "photo/cms.jpg"}
                    ]
                }
            ],
        }
        result = get_best_image(item)
        assert "card.jpg" in result
        assert "/resize/800_0/" in result

    def test_fallback_to_cms(self):
        """cardCntntPc 없으면 cmsInfoList에서 추출"""
        item = {
            "cardCntntPc": "",
            "cmsInfoList": [
                {
                    "pkgCmsImgInfoList": [
                        {"filePathNm": "photo/cms.jpg"}
                    ]
                }
            ],
        }
        result = get_best_image(item)
        assert "cms.jpg" in result
        assert "/resize/800_0/" in result

    def test_no_images(self):
        """이미지 없으면 빈 문자열"""
        item = {"cardCntntPc": "", "cmsInfoList": []}
        assert get_best_image(item) == ""

    def test_empty_item(self):
        assert get_best_image({}) == ""


# ──────────────────────────────────────────────
# extract_meal_info
# ──────────────────────────────────────────────

class TestExtractMealInfo:
    def test_multiple_meals(self):
        items = [
            {"schdCatgNm": "식사", "mealTypeNm": "조식", "mealCont": "호텔식"},
            {"schdCatgNm": "식사", "mealTypeNm": "중식", "mealCont": "현지식"},
            {"schdCatgNm": "식사", "mealTypeNm": "석식", "mealCont": "불포함"},
        ]
        result = extract_meal_info(items)
        assert "호텔식(조식)" in result
        assert "현지식(중식)" in result
        assert "불포함(석식)" in result
        assert " / " in result

    def test_meal_cont_only(self):
        items = [{"schdCatgNm": "식사", "mealTypeNm": "", "mealCont": "자유식"}]
        assert extract_meal_info(items) == "자유식"

    def test_meal_type_only(self):
        items = [{"schdCatgNm": "식사", "mealTypeNm": "조식", "mealCont": ""}]
        assert extract_meal_info(items) == "조식"

    def test_non_meal_items_ignored(self):
        items = [
            {"schdCatgNm": "관광지", "cardNm": "오사카성"},
            {"schdCatgNm": "식사", "mealTypeNm": "조식", "mealCont": "호텔식"},
        ]
        result = extract_meal_info(items)
        assert "오사카성" not in result
        assert "호텔식(조식)" in result

    def test_empty_list(self):
        assert extract_meal_info([]) == ""

    def test_no_meal_items(self):
        items = [{"schdCatgNm": "관광지", "cardNm": "오사카성"}]
        assert extract_meal_info(items) == ""


# ──────────────────────────────────────────────
# extract_region_from_items
# ──────────────────────────────────────────────

class TestExtractRegionFromItems:
    def test_city_transport(self):
        items = [
            {"schdCatgNm": "도시간이동", "depCityNm": "오사카", "arriveCityNm": "교토"},
        ]
        result = extract_region_from_items(items)
        assert result == "오사카 → 교토"

    def test_multiple_transports(self):
        items = [
            {"schdCatgNm": "도시간이동", "depCityNm": "인천", "arriveCityNm": "오사카"},
            {"schdCatgNm": "도시간이동", "depCityNm": "오사카", "arriveCityNm": "교토"},
        ]
        result = extract_region_from_items(items)
        assert "인천" in result
        assert "오사카" in result
        assert "교토" in result

    def test_fallback_to_cityNm(self):
        items = [
            {"schdCatgNm": "관광지", "cityNm": "교토"},
            {"schdCatgNm": "관광지", "cityNm": "교토"},
        ]
        result = extract_region_from_items(items)
        assert result == "교토"

    def test_empty_list(self):
        assert extract_region_from_items([]) == ""

    def test_no_city_info(self):
        items = [{"schdCatgNm": "관광지", "cardNm": "오사카성"}]
        assert extract_region_from_items(items) == ""


# ──────────────────────────────────────────────
# extract_description
# ──────────────────────────────────────────────

class TestExtractDescription:
    def test_name_and_content(self):
        item = {
            "cmsInfoList": [
                {"cmsCntntNm": "소개", "cmsCntntCont": "<p>설명 텍스트</p>"}
            ]
        }
        result = extract_description(item)
        assert "소개" in result
        assert "설명 텍스트" in result
        assert "<p>" not in result

    def test_content_only(self):
        item = {
            "cmsInfoList": [
                {"cmsCntntNm": "", "cmsCntntCont": "간단한 설명"}
            ]
        }
        assert extract_description(item) == "간단한 설명"

    def test_name_only(self):
        item = {
            "cmsInfoList": [
                {"cmsCntntNm": "소개", "cmsCntntCont": ""}
            ]
        }
        assert extract_description(item) == "소개"

    def test_empty_cms(self):
        assert extract_description({"cmsInfoList": []}) == ""

    def test_no_cms(self):
        assert extract_description({}) == ""


# ──────────────────────────────────────────────
# parse_itinerary_api
# ──────────────────────────────────────────────

class TestParseItineraryApi:
    def test_basic_parsing(self, sample_api_response):
        result = parse_itinerary_api(sample_api_response)

        assert len(result) > 0
        # 1일차: 오사카성 + 오사카 힐튼 호텔 = 2개
        # 2일차: 금각사 + 후시미 이나리 = 2개
        day1_items = [r for r in result if r["day"] == "1일차"]
        day2_items = [r for r in result if r["day"] == "2일차"]

        assert len(day1_items) == 2
        assert len(day2_items) == 2

    def test_day_fields(self, sample_api_response):
        result = parse_itinerary_api(sample_api_response)
        first = result[0]

        assert first["day"] == "1일차"
        assert first["date"] == "03/15(일)"
        assert first["region"] == "인천 → 오사카"
        assert first["transport"] == "항공"

    def test_schedule_names(self, sample_api_response):
        result = parse_itinerary_api(sample_api_response)
        names = [r["schedule"] for r in result]

        assert "오사카성" in names
        assert "오사카 힐튼 호텔" in names
        assert "금각사" in names
        assert "후시미 이나리" in names

    def test_meals_extracted(self, sample_api_response):
        result = parse_itinerary_api(sample_api_response)
        day1 = result[0]

        assert "기내식(조식)" in day1["meals"]
        assert "현지식(중식)" in day1["meals"]
        assert "호텔식(석식)" in day1["meals"]

    def test_image_from_card_html(self, sample_api_response):
        result = parse_itinerary_api(sample_api_response)
        osaka_castle = next(r for r in result if r["schedule"] == "오사카성")

        assert "osaka_castle.jpg" in osaka_castle["image_url"]
        assert "/resize/800_0/" in osaka_castle["image_url"]

    def test_image_from_cms(self, sample_api_response):
        result = parse_itinerary_api(sample_api_response)
        hotel = next(r for r in result if r["schedule"] == "오사카 힐튼 호텔")

        assert "hotel_hilton.jpg" in hotel["image_url"]

    def test_description_extracted(self, sample_api_response):
        result = parse_itinerary_api(sample_api_response)
        osaka_castle = next(r for r in result if r["schedule"] == "오사카성")

        assert "일본의 대표적인 성곽" in osaka_castle["description"]

    def test_skips_meal_without_card(self, sample_api_response):
        result = parse_itinerary_api(sample_api_response)
        names = [r["schedule"] for r in result]

        # 식사 아이템(cardNm 없는)은 스케줄에 나타나면 안 됨
        assert "" not in names

    def test_skips_text_input(self, sample_api_response):
        result = parse_itinerary_api(sample_api_response)
        names = [r["schedule"] for r in result]

        # 텍스트입력은 스케줄에 나타나면 안 됨
        assert "텍스트입력" not in [r.get("schdCatgNm") for r in result]

    def test_output_dict_format(self, sample_api_response):
        """routes.py와 호환되는 필드 확인"""
        result = parse_itinerary_api(sample_api_response)
        required_fields = {"day", "date", "region", "transport", "time", "schedule", "description", "image_url", "meals"}

        for item in result:
            assert required_fields.issubset(item.keys()), f"필드 누락: {required_fields - item.keys()}"

    def test_empty_body(self):
        result = parse_itinerary_api({"body": {"schdInfoList": []}})
        assert result == []

    def test_empty_data(self):
        result = parse_itinerary_api({})
        assert result == []

    def test_day_without_schedule_items(self):
        """관광지 없는 일차 (이동일 등)"""
        api_data = {
            "body": {
                "schdInfoList": [
                    {
                        "schdDay": 3,
                        "strtDt": "20260317",
                        "strDow": "화",
                        "schdMainInfoList": [
                            {
                                "schdCatgNm": "도시간이동",
                                "cardNm": "",
                                "depCityNm": "오사카",
                                "arriveCityNm": "인천",
                                "trspNm": "항공",
                            },
                            {
                                "schdCatgNm": "식사",
                                "cardNm": "",
                                "mealTypeNm": "조식",
                                "mealCont": "호텔식",
                            },
                        ],
                    }
                ]
            }
        }
        result = parse_itinerary_api(api_data)
        assert len(result) == 1
        assert result[0]["day"] == "3일차"
        assert result[0]["region"] == "오사카 → 인천"
        assert result[0]["schedule"] == "오사카 → 인천"


# ──────────────────────────────────────────────
# enrich_with_sightseeing
# ──────────────────────────────────────────────

class TestEnrichWithSightseeing:
    def test_enriches_missing_images(self, sample_sigh_response):
        schedule_data = [
            {"schedule": "금각사", "image_url": ""},
            {"schedule": "오사카성", "image_url": "https://existing.jpg"},
        ]

        result = enrich_with_sightseeing(schedule_data, sample_sigh_response)

        assert "kinkakuji.jpg" in result[0]["image_url"]
        assert result[1]["image_url"] == "https://existing.jpg"  # 기존 이미지 유지

    def test_no_overwrite(self, sample_sigh_response):
        schedule_data = [
            {"schedule": "금각사", "image_url": "https://my-image.jpg"},
        ]

        result = enrich_with_sightseeing(schedule_data, sample_sigh_response)
        assert result[0]["image_url"] == "https://my-image.jpg"

    def test_sigh_img_list_fallback(self, sample_sigh_response):
        schedule_data = [
            {"schedule": "도톤보리", "image_url": ""},
        ]

        result = enrich_with_sightseeing(schedule_data, sample_sigh_response)
        assert "dotonbori.jpg" in result[0]["image_url"]

    def test_empty_sigh_data(self):
        schedule_data = [{"schedule": "금각사", "image_url": ""}]
        result = enrich_with_sightseeing(schedule_data, None)
        assert result[0]["image_url"] == ""

    def test_no_matching_sigh(self, sample_sigh_response):
        schedule_data = [{"schedule": "알 수 없는 곳", "image_url": ""}]
        result = enrich_with_sightseeing(schedule_data, sample_sigh_response)
        assert result[0]["image_url"] == ""


# ──────────────────────────────────────────────
# scraper.py edge cases (async 함수)
# ──────────────────────────────────────────────

class TestScraperEdgeCases:
    @pytest.mark.asyncio
    async def test_empty_url(self):
        from app.services.scraper import extract_schedule
        with pytest.raises(ValueError):
            await extract_schedule("")

    @pytest.mark.asyncio
    async def test_non_hanatour_url(self):
        from app.services.scraper import extract_schedule
        with pytest.raises(ValueError):
            await extract_schedule("https://www.google.com")
