"""
하나투어 일본 상품 URL 찾기 스크립트

하나투어 웹사이트를 탐색하여 실제 일본 상품 페이지 URL을 찾습니다.
"""

from playwright.sync_api import sync_playwright
import time


def find_hanatour_japan_urls():
    """하나투어 일본 상품 URL 찾기"""

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # 브라우저 창 표시
        page = browser.new_page()

        # 하나투어 메인 페이지
        print("하나투어 메인 페이지 접속...")
        page.goto("https://www.hanatour.com", wait_until="networkidle")
        time.sleep(2)

        # 일본 상품 검색
        print("\n일본 상품 검색 중...")

        # 패키지 여행 섹션 클릭 시도
        try:
            # 패키지 메뉴 찾기
            package_link = page.query_selector("a[href*='package'], a[href*='pkg']")
            if package_link:
                print(f"패키지 링크 발견: {package_link.get_attribute('href')}")
                package_link.click()
                page.wait_for_load_state("networkidle")
                time.sleep(2)
        except Exception as e:
            print(f"패키지 메뉴 클릭 실패: {e}")

        # 일본 상품 찾기
        try:
            # 일본 관련 링크 찾기
            japan_links = page.query_selector_all("a[href*='japan'], a[href*='일본'], a[href*='osaka'], a[href*='tokyo']")

            print(f"\n일본 관련 링크 {len(japan_links)}개 발견:")
            for i, link in enumerate(japan_links[:10]):  # 상위 10개만
                href = link.get_attribute("href")
                text = link.inner_text().strip()
                print(f"{i+1}. {text} - {href}")

            # 첫 번째 일본 상품 클릭
            if japan_links:
                first_japan = japan_links[0]
                href = first_japan.get_attribute("href")
                print(f"\n첫 번째 일본 상품 클릭: {href}")
                first_japan.click()
                page.wait_for_load_state("networkidle")
                time.sleep(2)

                print(f"\n현재 URL: {page.url}")

        except Exception as e:
            print(f"일본 상품 검색 실패: {e}")

        # 페이지에서 패키지 상품 URL 찾기
        try:
            all_links = page.query_selector_all("a[href*='/pkg/']")
            print(f"\n패키지 상품 링크 {len(all_links)}개 발견:")

            urls = set()
            for link in all_links[:20]:
                href = link.get_attribute("href")
                if href:
                    full_url = href if href.startswith("http") else f"https://www.hanatour.com{href}"
                    urls.add(full_url)

            for url in sorted(urls)[:10]:
                print(f"- {url}")

        except Exception as e:
            print(f"상품 URL 수집 실패: {e}")

        print("\n\n브라우저 창을 확인하세요. 10초 후 종료됩니다...")
        time.sleep(10)

        browser.close()


if __name__ == "__main__":
    find_hanatour_japan_urls()
