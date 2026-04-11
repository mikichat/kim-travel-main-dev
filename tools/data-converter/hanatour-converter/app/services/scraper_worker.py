"""
Playwright 스크래핑 워커 (별도 프로세스에서 실행)

Windows asyncio 이벤트 루프 문제를 회피하기 위해
subprocess로 실행되는 독립 스크립트입니다.

방식: Playwright response 인터셉션으로 하나투어 내부 API JSON 직접 파싱

사용법:
    python -m app.services.scraper_worker <url>
    결과는 stdout으로 JSON 출력
"""

import sys
import json
import re
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup


# ──────────────────────────────────────────────
# 순수 함수: 날짜 포맷
# ──────────────────────────────────────────────

def format_date(strt_dt: str, str_dow: str) -> str:
    """API의 strtDt + strDow → 'MM/DD(요일)' 형식으로 변환

    Args:
        strt_dt: "20260315" 형태의 날짜 문자열
        str_dow: "토" 같은 요일 문자열

    Returns:
        "03/15(토)" 형태 문자열, 파싱 실패 시 빈 문자열
    """
    if not strt_dt or len(strt_dt) < 8:
        return ""
    try:
        month = strt_dt[4:6]
        day = strt_dt[6:8]
        dow = str_dow or ""
        return f"{month}/{day}({dow})" if dow else f"{month}/{day}"
    except (IndexError, TypeError):
        return ""


# ──────────────────────────────────────────────
# 순수 함수: 이미지 추출
# ──────────────────────────────────────────────

def extract_images_from_html(html: str) -> list:
    """HTML 스니펫(cardCntntPc 등)에서 이미지 URL 추출

    image.hanatour.com 도메인의 이미지만 추출하고,
    resize를 800_0으로 통일합니다.

    Args:
        html: HTML 문자열 스니펫

    Returns:
        이미지 URL 리스트
    """
    if not html:
        return []

    soup = BeautifulSoup(html, "html.parser")
    images = []

    for img in soup.find_all("img"):
        src = img.get("src", "")
        if not src:
            continue
        # image.hanatour.com 도메인 이미지만
        if "image.hanatour.com" in src:
            # resize 사이즈를 800_0으로 통일
            src = re.sub(r"/resize/\d+_\d+/", "/resize/800_0/", src)
            if src not in images:
                images.append(src)

    return images


def get_best_image(item: dict) -> str:
    """스케줄 아이템에서 최적 이미지 URL 추출

    우선순위:
    1. cardCntntPc HTML 내 <img> 태그
    2. cmsInfoList[].pkgCmsImgInfoList[].filePathNm

    Args:
        item: schdMainInfoList의 개별 아이템

    Returns:
        이미지 URL 문자열 (없으면 빈 문자열)
    """
    # 1순위: cardCntntPc HTML 내 이미지
    card_html = item.get("cardCntntPc", "")
    if card_html:
        images = extract_images_from_html(card_html)
        if images:
            return images[0]

    # 2순위: cmsInfoList 내 pkgCmsImgInfoList
    cms_list = item.get("cmsInfoList") or []
    for cms in cms_list:
        img_list = cms.get("pkgCmsImgInfoList") or []
        for img_info in img_list:
            file_path = img_info.get("filePathNm", "")
            if file_path:
                url = f"https://image.hanatour.com/usr/cms/resize/800_0/{file_path}"
                return url

    return ""


# ──────────────────────────────────────────────
# 순수 함수: 식사 정보 추출
# ──────────────────────────────────────────────

def extract_meal_info(items: list) -> str:
    """schdMainInfoList에서 식사 정보 추출

    schdCatgNm이 "식사"인 아이템의 mealTypeNm + mealCont를 조합합니다.

    Args:
        items: schdMainInfoList 배열

    Returns:
        "호텔식(조식 뷔페) / 현지식 / 불포함" 형태 문자열
    """
    meals = []
    for item in items:
        catg = item.get("schdCatgNm", "")
        if catg != "식사":
            continue

        meal_type = (item.get("mealTypeNm") or "").strip()
        meal_cont = (item.get("mealCont") or "").strip()

        if meal_type and meal_cont:
            meals.append(f"{meal_cont}({meal_type})")
        elif meal_cont:
            meals.append(meal_cont)
        elif meal_type:
            meals.append(meal_type)

    return " / ".join(meals) if meals else ""


# ──────────────────────────────────────────────
# 순수 함수: 지역/이동 정보 추출
# ──────────────────────────────────────────────

def extract_region_from_items(items: list) -> str:
    """schdMainInfoList에서 지역 이동 정보 추출

    schdCatgNm이 "도시간이동"인 아이템의 depCityNm/arriveCityNm를 사용합니다.
    이동이 없으면 첫 번째 관광지/호텔 아이템의 도시명을 사용합니다.

    Args:
        items: schdMainInfoList 배열

    Returns:
        "오사카 → 교토" 또는 "오사카" 형태 문자열
    """
    cities = []

    for item in items:
        catg = item.get("schdCatgNm", "")
        if catg == "도시간이동":
            dep = (item.get("depCityNm") or "").strip()
            arrive = (item.get("arriveCityNm") or "").strip()
            if dep and dep not in cities:
                cities.append(dep)
            if arrive and arrive not in cities:
                cities.append(arrive)

    if cities:
        return " → ".join(cities)

    # 도시간이동이 없으면 관광지/호텔 아이템에서 도시명 추출
    for item in items:
        city = (item.get("cityNm") or "").strip()
        if city and city not in cities:
            cities.append(city)

    return " → ".join(cities) if cities else ""


# ──────────────────────────────────────────────
# 순수 함수: 설명 텍스트 추출
# ──────────────────────────────────────────────

def extract_description(item: dict) -> str:
    """스케줄 아이템에서 설명 텍스트 추출

    cmsInfoList의 cmsCntntNm과 cmsCntntCont를 조합합니다.
    HTML 태그는 제거합니다.

    Args:
        item: schdMainInfoList의 개별 아이템

    Returns:
        설명 텍스트 문자열
    """
    descriptions = []

    cms_list = item.get("cmsInfoList") or []
    for cms in cms_list:
        name = (cms.get("cmsCntntNm") or "").strip()
        cont = (cms.get("cmsCntntCont") or "").strip()

        # HTML 태그 제거
        if cont:
            cont = BeautifulSoup(cont, "html.parser").get_text(separator="\n").strip()

        if name and cont:
            descriptions.append(f"{name}\n{cont}")
        elif cont:
            descriptions.append(cont)
        elif name:
            descriptions.append(name)

    return "\n".join(descriptions)


# ──────────────────────────────────────────────
# 핵심 함수: API JSON → 일정 데이터 파싱
# ──────────────────────────────────────────────

def parse_itinerary_api(api_data: dict) -> list:
    """getPkgProdItnrInfo API 응답을 일정 데이터로 변환

    Args:
        api_data: API 응답 JSON (data.schdInfoList 포함)

    Returns:
        routes.py와 호환되는 dict 리스트:
        [{"day", "date", "region", "transport", "time", "schedule", "description", "image_url", "meals"}, ...]
    """
    schedule_data = []

    # data 또는 body에서 schdInfoList 가져오기
    body = api_data.get("data") or api_data.get("body") or api_data
    schd_list = body.get("schdInfoList") or []

    for schd in schd_list:
        schd_day = schd.get("schdDay", 0)
        strt_dt = schd.get("strtDt", "")
        str_dow = schd.get("strDow", "")
        date_str = format_date(strt_dt, str_dow)

        main_items = schd.get("schdMainInfoList") or []

        # 식사 정보 (일차 단위)
        meal_info = extract_meal_info(main_items)

        # 지역/이동 정보 (일차 단위)
        region = extract_region_from_items(main_items)

        # 교통 정보 추출
        transport = ""
        for item in main_items:
            catg = item.get("schdCatgNm", "")
            if catg == "도시간이동":
                trans = (item.get("trspNm") or "").strip()
                if trans:
                    transport = trans
                    break

        # 스케줄 아이템 순회
        has_schedule_items = False

        for item in main_items:
            catg = item.get("schdCatgNm", "")
            card_nm = (item.get("cardNm") or "").strip()

            # skip: 식사 (cardNm 없는 것) / 텍스트입력 (유의미 내용 없음)
            if catg == "식사" and not card_nm:
                continue
            if catg == "텍스트입력" and not card_nm:
                continue
            if catg == "도시간이동":
                continue

            # 관광지, 호텔/크루즈, 식사(cardNm있는), 기타 카테고리
            schedule_name = card_nm
            if not schedule_name:
                continue

            description = extract_description(item)
            image_url = get_best_image(item)

            schedule_data.append({
                "day": f"{schd_day}일차",
                "date": date_str,
                "region": region,
                "transport": transport,
                "time": date_str,
                "schedule": schedule_name,
                "description": description,
                "image_url": image_url,
                "meals": meal_info,
            })
            has_schedule_items = True

        # 스케줄 아이템이 없는 일차 (이동일 등)
        if not has_schedule_items:
            schedule_data.append({
                "day": f"{schd_day}일차",
                "date": date_str,
                "region": region,
                "transport": transport,
                "time": date_str,
                "schedule": region or f"{schd_day}일차",
                "description": "",
                "image_url": "",
                "meals": meal_info,
            })

    return schedule_data


# ──────────────────────────────────────────────
# 보충 함수: 관광지 이미지 보충
# ──────────────────────────────────────────────

def enrich_with_sightseeing(schedule_data: list, sigh_data: dict) -> list:
    """getPkgSighInfo 데이터로 이미지 없는 항목에 이미지 보충

    Args:
        schedule_data: parse_itinerary_api의 결과
        sigh_data: getPkgSighInfo API 응답 JSON

    Returns:
        이미지가 보충된 schedule_data (원본 수정)
    """
    if not sigh_data:
        return schedule_data

    body = sigh_data.get("data") or sigh_data.get("body") or sigh_data
    sigh_list = (
        body.get("schdSighInfoList")
        or body.get("sighList")
        or body.get("pkgSighInfoList")
        or []
    )

    # 일차별 이미지 수집 (schdDay → 이미지 URL 리스트)
    day_images = {}
    # 관광지 이름 → 이미지 URL 매핑
    sigh_images = {}

    for sigh in sigh_list:
        schd_day = sigh.get("schdDay")

        # 방법 1: pcHtmlCont에서 이미지 추출
        pc_html = sigh.get("pcHtmlCont") or ""
        images = extract_images_from_html(pc_html) if pc_html else []

        # 방법 2: cmsInfoList.pkgCmsImgInfoList에서 이미지 추출
        cms_list = sigh.get("cmsInfoList") or []
        for cms in cms_list:
            img_list = cms.get("pkgCmsImgInfoList") or []
            for img_info in img_list:
                fp = img_info.get("filePathNm", "")
                if fp:
                    url = f"https://image.hanatour.com/usr/cms/resize/800_0/{fp}"
                    if url not in images:
                        images.append(url)

        # 방법 3: sigh 아이템 레벨 pkgSighImgInfoList / sighImgList
        sigh_img_list = sigh.get("pkgSighImgInfoList") or sigh.get("sighImgList") or []
        for img_info in sigh_img_list:
            fp = img_info.get("filePathNm", "")
            if fp:
                url = f"https://image.hanatour.com/usr/cms/resize/800_0/{fp}"
                if url not in images:
                    images.append(url)

        # 방법 4: 직접 filePathNm
        fp = sigh.get("filePathNm", "")
        if fp:
            url = f"https://image.hanatour.com/usr/cms/resize/800_0/{fp}"
            if url not in images:
                images.append(url)

        if images and schd_day:
            if schd_day not in day_images:
                day_images[schd_day] = []
            day_images[schd_day].extend(images)

        # 이름 기반 매핑 (sighNm 또는 cardNm)
        name = (sigh.get("sighNm") or sigh.get("cardNm") or "").strip()
        if name and images:
            sigh_images[name] = images[0]

    # 이미지 없는 항목에 보충
    for item in schedule_data:
        if item.get("image_url"):
            continue

        schedule_name = item.get("schedule", "")

        # 1순위: 이름 기반 매칭
        if schedule_name in sigh_images:
            item["image_url"] = sigh_images[schedule_name]
            continue

        # 2순위: 일차 기반 매칭 (일차의 첫 번째 이미지)
        day_str = item.get("day", "")
        day_num = int(''.join(filter(str.isdigit, day_str)) or "0")
        if day_num and day_num in day_images and day_images[day_num]:
            item["image_url"] = day_images[day_num].pop(0)

    return schedule_data


# ──────────────────────────────────────────────
# 메인: Playwright response 인터셉션
# ──────────────────────────────────────────────

def scrape_hanatour(url: str) -> dict:
    """하나투어 URL에서 API 인터셉션으로 일정 스크래핑

    Playwright의 page.on("response") 리스너로
    getPkgProdItnrInfo, getPkgSighInfo API 응답을 캡쳐합니다.
    """
    captured = {"itinerary": None, "sightseeing": None}

    def handle_response(response):
        try:
            resp_url = response.url
            if response.status != 200:
                return

            if "getPkgProdItnrInfo" in resp_url:
                captured["itinerary"] = response.json()
            elif "getPkgSighInfo" in resp_url:
                captured["sightseeing"] = response.json()
        except Exception:
            pass

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            page = context.new_page()

            # response 리스너 등록
            page.on("response", handle_response)

            response = page.goto(url, wait_until="domcontentloaded", timeout=30000)

            if not response:
                return {"success": False, "error": "페이지 응답 없음"}

            if response.status != 200:
                return {"success": False, "error": f"페이지 로딩 실패: HTTP {response.status}"}

            # API 호출 대기 (SPA이므로 데이터 로딩 시간 필요)
            page.wait_for_timeout(8000)

            browser.close()

            # 캡쳐된 API 데이터 파싱
            if not captured["itinerary"]:
                return {
                    "success": False,
                    "error": "일정 API 응답을 캡쳐하지 못했습니다. 페이지 구조가 변경되었을 수 있습니다."
                }

            schedule_data = parse_itinerary_api(captured["itinerary"])

            # 관광지 이미지 보충
            if captured["sightseeing"]:
                schedule_data = enrich_with_sightseeing(schedule_data, captured["sightseeing"])

            if not schedule_data:
                return {
                    "success": False,
                    "error": "일정 데이터를 파싱할 수 없습니다."
                }

            return {"success": True, "data": schedule_data}

    except Exception as e:
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    # Windows stdout 인코딩 문제 해결
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "URL이 필요합니다"}, ensure_ascii=False))
        sys.exit(1)

    url = sys.argv[1]
    result = scrape_hanatour(url)
    print(json.dumps(result, ensure_ascii=False))
