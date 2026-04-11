"""
하나투어 이미지 가져오기 테스트 스크립트
1) 하나투어 일본 상품 목록에서 실제 상품 URL 찾기
2) 상품 페이지에서 이미지 URL 추출
3) 이미지 다운로드 테스트
"""
import sys
import io
import json
import urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from playwright.sync_api import sync_playwright


def find_product_urls():
    """하나투어 일본 상품 목록에서 상품 URL 찾기"""
    print("=" * 60)
    print("[1단계] 하나투어 일본 상품 목록에서 상품 URL 찾기")
    print("=" * 60)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        # 일본 패키지 목록 페이지
        list_url = "https://www.hanatour.com/package/major-products?cntryCd=JP&cityCd=OSA&depCityCd=JCN&cityNm=오사카"
        print(f"목록 페이지: {list_url}")
        page.goto(list_url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(5000)

        # 상품 링크 찾기 - 다양한 패턴 시도
        product_urls = []

        # 패턴1: a 태그에서 상품 상세 링크 찾기
        links = page.query_selector_all('a[href*="/package/"]')
        for link in links[:20]:
            href = link.get_attribute('href')
            if href and ('/item/' in href or '/detail/' in href or '/GD' in href):
                full_url = href if href.startswith('http') else f"https://www.hanatour.com{href}"
                if full_url not in product_urls:
                    product_urls.append(full_url)

        # 패턴2: data 속성에서 상품 코드 찾기
        if not product_urls:
            cards = page.query_selector_all('[data-pkg-cd], [data-prod-cd], [data-goods-cd]')
            for card in cards[:10]:
                for attr in ['data-pkg-cd', 'data-prod-cd', 'data-goods-cd']:
                    val = card.get_attribute(attr)
                    if val:
                        product_urls.append(f"CODE:{val}")

        # 패턴3: 전체 링크에서 숫자 ID 패턴 찾기
        if not product_urls:
            all_links = page.query_selector_all('a[href]')
            for link in all_links:
                href = link.get_attribute('href')
                if href and ('hanatour.com' in href or href.startswith('/')) and any(c.isdigit() for c in (href or '')):
                    if '/package/' in href and href not in product_urls and 'major-products' not in href:
                        full_url = href if href.startswith('http') else f"https://www.hanatour.com{href}"
                        product_urls.append(full_url)
                        if len(product_urls) >= 5:
                            break

        print(f"\n발견된 상품 URL ({len(product_urls)}개):")
        for url in product_urls[:5]:
            print(f"  - {url}")

        # 페이지 구조 디버깅용
        if not product_urls:
            print("\n[디버깅] 페이지 HTML 구조 확인...")
            # 주요 영역의 HTML 일부 저장
            html = page.content()
            with open("debug_list_page.html", "w", encoding="utf-8") as f:
                f.write(html)
            print("  debug_list_page.html 저장 완료")

            # 주요 링크 패턴 출력
            all_links = page.query_selector_all('a[href]')
            seen = set()
            print(f"\n  전체 링크 수: {len(all_links)}")
            for link in all_links[:50]:
                href = link.get_attribute('href') or ''
                text = link.inner_text()[:50].strip()
                if href and href not in seen and not href.startswith('#') and not href.startswith('javascript'):
                    seen.add(href)
                    print(f"    [{text}] → {href}")

        browser.close()
        return product_urls


def test_image_extraction(product_url):
    """상품 페이지에서 이미지 추출 테스트"""
    print("\n" + "=" * 60)
    print(f"[2단계] 상품 페이지에서 이미지 추출")
    print(f"URL: {product_url}")
    print("=" * 60)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()
        page.goto(product_url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(5000)

        # 일정 탭 클릭 시도
        try:
            schedule_tab = page.query_selector('a[href*="schedule"], button:has-text("일정"), a:has-text("일정")')
            if schedule_tab:
                print("일정 탭 발견 → 클릭")
                schedule_tab.click()
                page.wait_for_timeout(3000)
        except Exception as e:
            print(f"일정 탭 클릭 실패: {e}")

        # 이미지 찾기 - 다양한 셀렉터
        selectors = [
            'div._thumb.thumb img',
            'div.card_unit img',
            'div.schedule img',
            'div[class*="schedule"] img',
            'div[class*="itinerary"] img',
            'div.cont_unit img',
            'img[src*="tong"]',  # 하나투어 CDN
            'img[src*="hanatour"]',
        ]

        all_images = {}
        for selector in selectors:
            imgs = page.query_selector_all(selector)
            for img in imgs:
                src = img.get_attribute('src') or img.get_attribute('data-src') or img.get_attribute('data-lazy') or ''
                if src and src.startswith('http') and 'pixel' not in src and '1x1' not in src:
                    if src not in all_images:
                        alt = img.get_attribute('alt') or ''
                        all_images[src] = {'selector': selector, 'alt': alt}

        print(f"\n발견된 이미지 ({len(all_images)}개):")
        for i, (src, info) in enumerate(list(all_images.items())[:10]):
            print(f"  [{i+1}] selector: {info['selector']}")
            print(f"       alt: {info['alt']}")
            print(f"       src: {src[:120]}...")

        # HTML 저장 (디버깅용)
        html = page.content()
        with open("debug_product_page.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("\n  debug_product_page.html 저장 완료")

        browser.close()
        return list(all_images.keys())


def test_image_download(image_urls):
    """이미지 다운로드 테스트"""
    print("\n" + "=" * 60)
    print("[3단계] 이미지 다운로드 테스트")
    print("=" * 60)

    for i, url in enumerate(image_urls[:3]):
        print(f"\n  [{i+1}] {url[:100]}...")

        # 방법1: 헤더 없이
        try:
            req = urllib.request.Request(url)
            resp = urllib.request.urlopen(req, timeout=10)
            data = resp.read()
            print(f"    → 헤더없이 성공! ({len(data)} bytes, Content-Type: {resp.headers.get('Content-Type')})")
        except Exception as e:
            print(f"    → 헤더없이 실패: {e}")

            # 방법2: Referer 헤더 추가
            try:
                req = urllib.request.Request(url, headers={
                    'Referer': 'https://www.hanatour.com/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                })
                resp = urllib.request.urlopen(req, timeout=10)
                data = resp.read()
                print(f"    → Referer 추가 성공! ({len(data)} bytes, Content-Type: {resp.headers.get('Content-Type')})")
            except Exception as e2:
                print(f"    → Referer 추가도 실패: {e2}")


if __name__ == "__main__":
    # 1단계: 상품 URL 찾기
    product_urls = find_product_urls()

    if product_urls:
        # 첫 번째 상품으로 테스트
        test_url = product_urls[0]
        if test_url.startswith('CODE:'):
            print(f"\n상품 코드 발견: {test_url}")
            print("직접 URL 구성이 필요합니다.")
        else:
            # 2단계: 이미지 추출
            image_urls = test_image_extraction(test_url)

            if image_urls:
                # 3단계: 다운로드 테스트
                test_image_download(image_urls)
            else:
                print("\n이미지를 찾지 못했습니다.")
    else:
        print("\n상품 URL을 찾지 못했습니다. debug_list_page.html을 확인하세요.")
