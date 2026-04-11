"""
프론트엔드 UI 자동화 테스트
Selenium을 사용한 E2E 테스트
"""
import time
from datetime import datetime, timedelta
import sys

# Selenium 설치 확인
try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.common.exceptions import TimeoutException
    SELENIUM_AVAILABLE = True
except ImportError:
    print("WARNING: Selenium is not installed. Please install: pip install selenium")
    SELENIUM_AVAILABLE = False

# 테스트 설정
FRONTEND_URL = "http://localhost:8000"

class FrontendTest:
    def __init__(self):
        if not SELENIUM_AVAILABLE:
            raise RuntimeError("Selenium is not installed")

        self.driver = None
        self.passed = 0
        self.failed = 0
        self.test_group_name = f"UI_Test_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    def log(self, message, status="INFO"):
        """로그 출력"""
        colors = {
            "INFO": "\033[94m",
            "SUCCESS": "\033[92m",
            "ERROR": "\033[91m",
            "WARNING": "\033[93m",
        }
        reset = "\033[0m"
        print(f"{colors.get(status, '')}{status}: {message}{reset}")

    def setup_driver(self):
        """웹 드라이버 설정"""
        self.log("Setting up Chrome driver...")
        try:
            from selenium.webdriver.chrome.service import Service
            from webdriver_manager.chrome import ChromeDriverManager

            options = webdriver.ChromeOptions()
            # 헤드리스 모드는 일단 비활성화 (디버깅을 위해)
            # options.add_argument('--headless')
            options.add_argument('--disable-gpu')
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument('--log-level=3')  # 로그 최소화

            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=options)
            self.driver.implicitly_wait(10)
            self.log("Chrome driver initialized", "SUCCESS")
            return True
        except Exception as e:
            self.log(f"Failed to initialize driver: {e}", "ERROR")
            return False

    def teardown_driver(self):
        """웹 드라이버 종료"""
        if self.driver:
            self.driver.quit()
            self.log("Driver closed", "INFO")

    def assert_page_loaded(self, url, expected_title_part, test_name):
        """페이지 로드 확인"""
        try:
            self.driver.get(url)
            WebDriverWait(self.driver, 10).until(
                lambda d: expected_title_part.lower() in d.title.lower() or
                         len(d.find_elements(By.TAG_NAME, "h1")) > 0
            )
            self.log(f"[OK] {test_name} - Page loaded", "SUCCESS")
            self.passed += 1
            return True
        except TimeoutException:
            self.log(f"[FAIL] {test_name} - Page load timeout", "ERROR")
            self.failed += 1
            return False

    def assert_element_exists(self, by, value, test_name, timeout=10):
        """요소 존재 확인"""
        try:
            WebDriverWait(self.driver, timeout).until(
                EC.presence_of_element_located((by, value))
            )
            self.log(f"[OK] {test_name} - Element found", "SUCCESS")
            self.passed += 1
            return True
        except TimeoutException:
            self.log(f"[FAIL] {test_name} - Element not found: {value}", "ERROR")
            self.failed += 1
            return False

    def test_group_list_page(self):
        """단체 목록 페이지 테스트"""
        self.log("\n=== Testing Group List Page ===")

        url = f"{FRONTEND_URL}/pages/group_list.html"
        if not self.assert_page_loaded(url, "단체 관리", "Group list page load"):
            return

        # 주요 요소 확인
        self.assert_element_exists(By.ID, "searchName", "Search name input")
        self.assert_element_exists(By.ID, "filterStatus", "Status filter")
        self.assert_element_exists(By.ID, "btnCreateNew", "Create group button")
        self.assert_element_exists(By.ID, "groupTableBody", "Group table body")
        self.assert_element_exists(By.ID, "pagination", "Pagination")

    def test_group_form_page(self):
        """단체 입력 폼 페이지 테스트"""
        self.log("\n=== Testing Group Form Page ===")

        url = f"{FRONTEND_URL}/pages/group_form.html"
        if not self.assert_page_loaded(url, "단체", "Group form page load"):
            return

        # 폼 요소 확인
        self.assert_element_exists(By.ID, "name", "Group name input")
        self.assert_element_exists(By.ID, "start_date", "Start date input")
        self.assert_element_exists(By.ID, "end_date", "End date input")
        self.assert_element_exists(By.ID, "pax", "Pax input")
        self.assert_element_exists(By.ID, "price_per_pax", "Price per pax input")

        # 자동 계산 필드 확인
        self.assert_element_exists(By.ID, "nights", "Nights field")
        self.assert_element_exists(By.ID, "days", "Days field")
        self.assert_element_exists(By.ID, "total_price", "Total price field")
        self.assert_element_exists(By.ID, "balance", "Balance field")

    def test_create_group(self):
        """단체 생성 테스트"""
        self.log("\n=== Testing Group Creation ===")

        url = f"{FRONTEND_URL}/pages/group_form.html"
        self.driver.get(url)

        try:
            # 폼 작성
            start_date = datetime.now().date() + timedelta(days=30)
            end_date = start_date + timedelta(days=7)

            # 이름 입력
            name_input = self.driver.find_element(By.ID, "name")
            name_input.clear()
            name_input.send_keys(self.test_group_name)

            # 날짜 입력 (JavaScript로 값 설정)
            self.driver.execute_script(
                f"document.getElementById('start_date').value = '{start_date.strftime('%Y-%m-%d')}';"
            )
            self.driver.execute_script(
                f"document.getElementById('end_date').value = '{end_date.strftime('%Y-%m-%d')}';"
            )
            # 날짜 변경 이벤트 발생
            self.driver.execute_script(
                "document.getElementById('start_date').dispatchEvent(new Event('change'));"
            )
            self.driver.execute_script(
                "document.getElementById('end_date').dispatchEvent(new Event('change'));"
            )

            # 인원 및 요금 입력
            pax_input = self.driver.find_element(By.ID, "pax")
            pax_input.clear()
            pax_input.send_keys("30")
            pax_input.send_keys("\t")  # Tab to trigger change event

            price_input = self.driver.find_element(By.ID, "price_per_pax")
            price_input.clear()
            price_input.send_keys("1500000")
            price_input.send_keys("\t")

            deposit_input = self.driver.find_element(By.ID, "deposit")
            deposit_input.clear()
            deposit_input.send_keys("5000000")
            deposit_input.send_keys("\t")

            # 잠시 대기 (자동 계산 적용 대기)
            time.sleep(1)

            # 자동 계산 결과 확인
            nights = self.driver.find_element(By.ID, "nights").get_attribute("value")
            days = self.driver.find_element(By.ID, "days").get_attribute("value")
            total_price = self.driver.find_element(By.ID, "total_price").get_attribute("value")

            if nights == "7":
                self.log("[OK] Auto-calculated nights = 7", "SUCCESS")
                self.passed += 1
            else:
                self.log(f"[FAIL] Auto-calculated nights = {nights}, expected 7", "ERROR")
                self.failed += 1

            if days == "8":
                self.log("[OK] Auto-calculated days = 8", "SUCCESS")
                self.passed += 1
            else:
                self.log(f"[FAIL] Auto-calculated days = {days}, expected 8", "ERROR")
                self.failed += 1

            if total_price == "45000000":
                self.log("[OK] Auto-calculated total_price = 45000000", "SUCCESS")
                self.passed += 1
            else:
                self.log(f"[FAIL] Auto-calculated total_price = {total_price}, expected 45000000", "ERROR")
                self.failed += 1

            # 저장 버튼 클릭
            save_button = self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            save_button.click()

            # 리다이렉트 대기 (목록 페이지로)
            time.sleep(2)

            # 목록 페이지로 리다이렉트 확인
            if "group_list.html" in self.driver.current_url:
                self.log("[OK] Redirected to group list after save", "SUCCESS")
                self.passed += 1
            else:
                self.log(f"[FAIL] Not redirected to group list: {self.driver.current_url}", "ERROR")
                self.failed += 1

        except Exception as e:
            self.log(f"[FAIL] Group creation failed: {e}", "ERROR")
            self.failed += 1

    def test_group_dashboard(self):
        """단체 대시보드 테스트"""
        self.log("\n=== Testing Group Dashboard ===")

        # 먼저 목록 페이지로 이동
        self.driver.get(f"{FRONTEND_URL}/pages/group_list.html")
        time.sleep(2)

        try:
            # 첫 번째 단체 행 클릭
            first_row = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "#groupTableBody tr"))
            )
            first_row.click()

            # 대시보드 페이지 로드 대기
            time.sleep(2)

            if "group_dashboard.html" in self.driver.current_url:
                self.log("[OK] Dashboard page loaded", "SUCCESS")
                self.passed += 1
            else:
                self.log(f"[FAIL] Not on dashboard page: {self.driver.current_url}", "ERROR")
                self.failed += 1
                return

            # 탭 요소 확인
            self.assert_element_exists(By.ID, "tab-info", "Basic info tab content")
            self.assert_element_exists(By.ID, "tab-itinerary", "Itinerary tab content")
            self.assert_element_exists(By.ID, "tab-cancel-rules", "Cancel rules tab content")
            self.assert_element_exists(By.ID, "tab-includes", "Include/Exclude tab content")
            self.assert_element_exists(By.ID, "tab-documents", "Document tab content")

            # 각 탭 클릭 테스트
            tabs = [
                ("itinerary", "tab-itinerary", "Itinerary"),
                ("cancel-rules", "tab-cancel-rules", "Cancel rules"),
                ("includes", "tab-includes", "Include/Exclude"),
                ("documents", "tab-documents", "Document"),
            ]

            for data_tab, content_id, tab_name in tabs:
                try:
                    # data-tab 속성으로 탭 찾기
                    tab = self.driver.find_element(By.CSS_SELECTOR, f'button[data-tab="{data_tab}"]')
                    tab.click()
                    time.sleep(0.5)

                    content = self.driver.find_element(By.ID, content_id)
                    if content.is_displayed():
                        self.log(f"[OK] {tab_name} tab content displayed", "SUCCESS")
                        self.passed += 1
                    else:
                        self.log(f"[FAIL] {tab_name} tab content not displayed", "ERROR")
                        self.failed += 1
                except Exception as e:
                    self.log(f"[FAIL] {tab_name} tab test failed: {e}", "ERROR")
                    self.failed += 1

        except TimeoutException:
            self.log("[FAIL] No groups found in list", "WARNING")
            self.failed += 1
        except Exception as e:
            self.log(f"[FAIL] Dashboard test failed: {e}", "ERROR")
            self.failed += 1

    def test_search_functionality(self):
        """검색 기능 테스트"""
        self.log("\n=== Testing Search Functionality ===")

        self.driver.get(f"{FRONTEND_URL}/pages/group_list.html")
        time.sleep(2)

        try:
            search_input = self.driver.find_element(By.ID, "searchName")
            search_input.clear()
            search_input.send_keys(self.test_group_name[:10])

            # Debounce 대기
            time.sleep(1)

            # 결과 확인
            rows = self.driver.find_elements(By.CSS_SELECTOR, "#groupTableBody tr")
            if len(rows) > 0:
                self.log(f"[OK] Search returned {len(rows)} results", "SUCCESS")
                self.passed += 1
            else:
                self.log("[FAIL] Search returned no results", "ERROR")
                self.failed += 1

        except Exception as e:
            self.log(f"[FAIL] Search test failed: {e}", "ERROR")
            self.failed += 1

    def run_all_tests(self):
        """모든 테스트 실행"""
        self.log("=" * 60)
        self.log("프론트엔드 UI 자동화 테스트 시작")
        self.log("=" * 60)

        if not self.setup_driver():
            self.log("Driver setup failed. Exiting.", "ERROR")
            return False

        try:
            # 페이지 로드 테스트
            self.test_group_list_page()
            self.test_group_form_page()

            # 기능 테스트
            self.test_create_group()
            self.test_group_dashboard()
            self.test_search_functionality()

            # 결과 출력
            self.log("\n" + "=" * 60)
            self.log("테스트 결과")
            self.log("=" * 60)
            self.log(f"총 테스트: {self.passed + self.failed}", "INFO")
            self.log(f"성공: {self.passed}", "SUCCESS")
            self.log(f"실패: {self.failed}", "ERROR" if self.failed > 0 else "INFO")

            success_rate = (self.passed / (self.passed + self.failed) * 100) if (self.passed + self.failed) > 0 else 0
            self.log(f"성공률: {success_rate:.1f}%", "SUCCESS" if success_rate >= 90 else "WARNING")

            return self.failed == 0

        finally:
            # 브라우저를 열어두고 싶으면 주석 처리
            # time.sleep(5)  # 결과 확인을 위해 5초 대기
            self.teardown_driver()


if __name__ == "__main__":
    if not SELENIUM_AVAILABLE:
        print("\nSelenium을 설치하세요:")
        print("  pip install selenium")
        print("\n또한 Chrome 브라우저와 ChromeDriver가 필요합니다:")
        print("  ChromeDriver: https://chromedriver.chromium.org/")
        sys.exit(1)

    tester = FrontendTest()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
