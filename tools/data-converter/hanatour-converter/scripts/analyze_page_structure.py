"""
하나투어 페이지 구조 분석 스크립트

실제 하나투어 일본 상품 페이지를 분석하여:
1. 페이지 HTML 구조 저장
2. 일정 테이블 셀렉터 확인
3. 데이터 추출 가능 여부 검증
"""

from playwright.sync_api import sync_playwright
import json
import os


def analyze_hanatour_page(url):
    """하나투어 페이지 구조 분석"""

    print(f"페이지 분석 시작: {url}\n")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)

        # User-Agent 설정
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080}
        )

        page = context.new_page()

        try:
            # 페이지 로드
            print("페이지 로딩 중...")
            response = page.goto(url, wait_until="domcontentloaded", timeout=60000)

            print(f"HTTP 상태: {response.status}")
            print(f"페이지 타이틀: {page.title()}\n")

            # 추가 로딩 대기
            page.wait_for_timeout(5000)

            # HTML 저장
            html_content = page.content()
            os.makedirs("downloads", exist_ok=True)
            with open("downloads/hanatour_page.html", "w", encoding="utf-8") as f:
                f.write(html_content)
            print("✓ HTML 저장 완료: downloads/hanatour_page.html\n")

            # 스크린샷
            page.screenshot(path="downloads/hanatour_page.png", full_page=True)
            print("✓ 스크린샷 저장 완료: downloads/hanatour_page.png\n")

            # 일정 관련 요소 찾기
            print("=" * 60)
            print("일정 테이블 셀렉터 탐색")
            print("=" * 60)

            selectors_to_try = [
                ("table", "일반 테이블"),
                ("[class*='schedule']", "schedule 클래스"),
                ("[class*='itinerary']", "itinerary 클래스"),
                ("[class*='day']", "day 클래스"),
                ("[class*='일정']", "일정 클래스"),
                ("div[role='table']", "ARIA 테이블"),
                ("ul[class*='schedule']", "schedule 리스트"),
                ("div[class*='tour']", "tour 클래스"),
            ]

            found_selectors = []

            for selector, description in selectors_to_try:
                elements = page.query_selector_all(selector)
                count = len(elements)
                print(f"\n{description} ({selector}): {count}개 발견")

                if count > 0:
                    found_selectors.append({
                        "selector": selector,
                        "description": description,
                        "count": count
                    })

                    # 첫 번째 요소의 텍스트 샘플
                    first_element = elements[0]
                    text_sample = first_element.inner_text()[:200].strip()
                    print(f"  첫 번째 요소 샘플: {text_sample}...")

            # 키워드 검색
            print("\n" + "=" * 60)
            print("키워드 검색 결과")
            print("=" * 60)

            keywords = ["일차", "DAY", "일정", "식사", "교통", "지역"]
            for keyword in keywords:
                if keyword in html_content:
                    print(f"✓ '{keyword}' 키워드 발견")
                else:
                    print(f"✗ '{keyword}' 키워드 없음")

            # 결과 저장
            analysis_result = {
                "url": url,
                "status_code": response.status,
                "title": page.title(),
                "found_selectors": found_selectors,
                "keywords_found": [kw for kw in keywords if kw in html_content]
            }

            with open("downloads/analysis_result.json", "w", encoding="utf-8") as f:
                json.dump(analysis_result, f, ensure_ascii=False, indent=2)

            print("\n✓ 분석 결과 저장: downloads/analysis_result.json")

            # 브라우저 창 유지 (수동 확인)
            print("\n" + "=" * 60)
            print("브라우저 창에서 페이지를 확인하세요.")
            print("30초 후 자동으로 종료됩니다.")
            print("=" * 60)
            page.wait_for_timeout(30000)

        except Exception as e:
            print(f"\n오류 발생: {e}")
            import traceback
            traceback.print_exc()

        finally:
            browser.close()


if __name__ == "__main__":
    # 테스트용 URL - 실제 존재하는 URL로 교체 필요
    test_urls = [
        "https://www.hanatour.com/package/international/region/item/60116",
        "https://www.hanatour.com/package/international",
    ]

    print("하나투어 페이지 구조 분석 도구")
    print("=" * 60)
    print("\n사용할 URL을 선택하세요:")
    for i, url in enumerate(test_urls, 1):
        print(f"{i}. {url}")
    print(f"{len(test_urls) + 1}. 직접 입력")

    try:
        choice = input("\n선택 (번호 입력): ").strip()
        if choice.isdigit():
            choice = int(choice)
            if 1 <= choice <= len(test_urls):
                url = test_urls[choice - 1]
            elif choice == len(test_urls) + 1:
                url = input("URL 입력: ").strip()
            else:
                print("잘못된 선택입니다.")
                exit(1)
        else:
            url = choice  # URL 직접 입력

        if url:
            analyze_hanatour_page(url)
        else:
            print("URL이 비어있습니다.")

    except KeyboardInterrupt:
        print("\n\n중단되었습니다.")
    except Exception as e:
        print(f"\n오류: {e}")
