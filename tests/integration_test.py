"""
통합 테스트 스크립트
FastAPI 백엔드와 프론트엔드 연동 테스트
"""
import requests
import json
from datetime import datetime, timedelta
import sys

# API 기본 URL
API_BASE_URL = "http://localhost:8000/api"
FRONTEND_URL = "http://localhost:8000"

class IntegrationTest:
    def __init__(self):
        self.test_group_id = None
        self.test_itinerary_id = None
        self.test_cancel_rule_id = None
        self.test_include_id = None
        self.passed = 0
        self.failed = 0

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

    def assert_equal(self, actual, expected, test_name):
        """값 비교"""
        # Decimal 타입을 처리하기 위해 숫자는 모두 float으로 변환
        from decimal import Decimal

        actual_val = actual
        expected_val = expected

        # Decimal, 숫자, 숫자 문자열을 float으로 통일
        if isinstance(actual, (int, float, Decimal)):
            actual_val = float(actual)
        elif isinstance(actual, str):
            try:
                actual_val = float(actual)
            except (ValueError, TypeError):
                pass  # 문자열이 숫자가 아니면 그대로 유지

        if isinstance(expected, (int, float, Decimal)):
            expected_val = float(expected)
        elif isinstance(expected, str):
            try:
                expected_val = float(expected)
            except (ValueError, TypeError):
                pass

        if actual_val == expected_val:
            self.log(f"[OK] {test_name} - PASSED", "SUCCESS")
            self.passed += 1
            return True
        else:
            self.log(f"[FAIL] {test_name} - FAILED (Expected: {expected_val}, Got: {actual_val})", "ERROR")
            self.failed += 1
            return False

    def assert_status(self, response, expected_status, test_name):
        """HTTP 상태 코드 확인"""
        if response.status_code == expected_status:
            self.log(f"[OK] {test_name} - Status {response.status_code}", "SUCCESS")
            self.passed += 1
            return True
        else:
            self.log(f"[FAIL] {test_name} - Expected {expected_status}, Got {response.status_code}", "ERROR")
            self.log(f"  Response: {response.text}", "ERROR")
            self.failed += 1
            return False

    def test_health_check(self):
        """헬스 체크 테스트"""
        self.log("=== Testing Health Check ===")
        try:
            response = requests.get(f"{FRONTEND_URL}/health")
            self.assert_status(response, 200, "Health check")
            data = response.json()
            self.assert_equal(data.get("status"), "healthy", "Health status")
        except Exception as e:
            self.log(f"Health check failed: {e}", "ERROR")
            self.failed += 1

    def test_create_group(self):
        """단체 생성 테스트"""
        self.log("\n=== Testing Create Group ===")

        start_date = datetime.now().date()
        end_date = start_date + timedelta(days=7)

        data = {
            "name": "통합테스트_단체_" + datetime.now().strftime("%Y%m%d_%H%M%S"),
            "start_date": str(start_date),
            "end_date": str(end_date),
            "pax": 30,
            "price_per_pax": 1500000,
            "deposit": 5000000,
            "status": "estimate"
        }

        try:
            response = requests.post(f"{API_BASE_URL}/groups", json=data)
            if self.assert_status(response, 201, "Create group"):
                result = response.json()
                self.test_group_id = result.get("id")
                self.log(f"Created group ID: {self.test_group_id}", "INFO")

                # 자동 계산 검증
                self.assert_equal(result.get("nights"), 7, "Auto-calculated nights")
                self.assert_equal(result.get("days"), 8, "Auto-calculated days")
                self.assert_equal(result.get("total_price"), 45000000, "Auto-calculated total_price")
                self.assert_equal(result.get("balance"), 40000000, "Auto-calculated balance")
        except Exception as e:
            self.log(f"Create group failed: {e}", "ERROR")
            self.failed += 1

    def test_get_groups(self):
        """단체 목록 조회 테스트"""
        self.log("\n=== Testing Get Groups ===")
        try:
            response = requests.get(f"{API_BASE_URL}/groups")
            if self.assert_status(response, 200, "Get groups"):
                result = response.json()
                self.assert_equal("data" in result, True, "Response has 'data' field")
                self.assert_equal("total" in result, True, "Response has 'total' field")
                self.log(f"Total groups: {result.get('total', 0)}", "INFO")
        except Exception as e:
            self.log(f"Get groups failed: {e}", "ERROR")
            self.failed += 1

    def test_get_group_detail(self):
        """단체 상세 조회 테스트"""
        if not self.test_group_id:
            self.log("Skipping get group detail - no group ID", "WARNING")
            return

        self.log("\n=== Testing Get Group Detail ===")
        try:
            response = requests.get(f"{API_BASE_URL}/groups/{self.test_group_id}")
            if self.assert_status(response, 200, "Get group detail"):
                result = response.json()
                self.assert_equal(result.get("id"), self.test_group_id, "Group ID matches")
        except Exception as e:
            self.log(f"Get group detail failed: {e}", "ERROR")
            self.failed += 1

    def test_update_group(self):
        """단체 수정 테스트"""
        if not self.test_group_id:
            self.log("Skipping update group - no group ID", "WARNING")
            return

        self.log("\n=== Testing Update Group ===")
        try:
            data = {
                "pax": 35,
                "price_per_pax": 1600000
            }
            response = requests.put(f"{API_BASE_URL}/groups/{self.test_group_id}", json=data)
            if self.assert_status(response, 200, "Update group"):
                result = response.json()
                self.assert_equal(result.get("pax"), 35, "Updated pax")
                self.assert_equal(result.get("total_price"), 56000000, "Re-calculated total_price")
        except Exception as e:
            self.log(f"Update group failed: {e}", "ERROR")
            self.failed += 1

    def test_create_itinerary(self):
        """일정 생성 테스트"""
        if not self.test_group_id:
            self.log("Skipping create itinerary - no group ID", "WARNING")
            return

        self.log("\n=== Testing Create Itinerary ===")
        try:
            data = {
                "location": "서울 → 파리",
                "transport": "대한항공 KE901",
                "schedule": "09:00 인천공항 출발\n14:00 파리 샤를드골 공항 도착",
                "meals": "기내식",
                "accommodation": "파리 힐튼 호텔"
            }
            response = requests.post(f"{API_BASE_URL}/groups/{self.test_group_id}/itineraries", json=data)
            if self.assert_status(response, 201, "Create itinerary"):
                result = response.json()
                self.test_itinerary_id = result.get("id")
                self.assert_equal(result.get("day_no"), 1, "Auto-assigned day_no")
                self.log(f"Created itinerary ID: {self.test_itinerary_id}", "INFO")
        except Exception as e:
            self.log(f"Create itinerary failed: {e}", "ERROR")
            self.failed += 1

    def test_create_cancel_rule(self):
        """취소 규정 생성 테스트"""
        if not self.test_group_id:
            self.log("Skipping create cancel rule - no group ID", "WARNING")
            return

        self.log("\n=== Testing Create Cancel Rule ===")
        try:
            data = {
                "days_before": 30,
                "penalty_rate": 10.0,
                "description": "출발 30일 전 취소"
            }
            response = requests.post(f"{API_BASE_URL}/groups/{self.test_group_id}/cancel-rules", json=data)
            if self.assert_status(response, 201, "Create cancel rule"):
                result = response.json()
                self.test_cancel_rule_id = result.get("id")
                self.assert_equal(result.get("days_before"), 30, "Cancel rule days_before")
                self.assert_equal("cancel_date" in result, True, "Auto-calculated cancel_date")
                self.log(f"Created cancel rule ID: {self.test_cancel_rule_id}", "INFO")
        except Exception as e:
            self.log(f"Create cancel rule failed: {e}", "ERROR")
            self.failed += 1

    def test_create_include(self):
        """포함 항목 생성 테스트"""
        if not self.test_group_id:
            self.log("Skipping create include - no group ID", "WARNING")
            return

        self.log("\n=== Testing Create Include Item ===")
        try:
            data = {
                "item_type": "include",
                "description": "항공권 (이코노미 왕복)"
            }
            response = requests.post(f"{API_BASE_URL}/groups/{self.test_group_id}/includes", json=data)
            if self.assert_status(response, 201, "Create include"):
                result = response.json()
                self.test_include_id = result.get("id")
                self.assert_equal(result.get("item_type"), "include", "Include item type")
                self.assert_equal("display_order" in result, True, "Auto-assigned display_order")
                self.log(f"Created include ID: {self.test_include_id}", "INFO")
        except Exception as e:
            self.log(f"Create include failed: {e}", "ERROR")
            self.failed += 1

    def test_change_status(self):
        """상태 변경 테스트"""
        if not self.test_group_id:
            self.log("Skipping change status - no group ID", "WARNING")
            return

        self.log("\n=== Testing Change Status ===")
        try:
            data = {"new_status": "contract"}
            response = requests.put(f"{API_BASE_URL}/groups/{self.test_group_id}/status", json=data)
            if self.assert_status(response, 200, "Change status"):
                result = response.json()
                self.assert_equal(result.get("new_status"), "contract", "Status changed to contract")
        except Exception as e:
            self.log(f"Change status failed: {e}", "ERROR")
            self.failed += 1

    def test_generate_document(self):
        """문서 생성 테스트"""
        if not self.test_group_id:
            self.log("Skipping document generation - no group ID", "WARNING")
            return

        self.log("\n=== Testing Document Generation ===")
        doc_types = ["estimate", "contract", "itinerary", "bundle"]

        for doc_type in doc_types:
            try:
                data = {"document_type": doc_type}
                response = requests.post(
                    f"{API_BASE_URL}/groups/{self.test_group_id}/documents/generate",
                    json=data
                )
                if self.assert_status(response, 201, f"Generate {doc_type} document"):
                    result = response.json()
                    self.log(f"Generated {doc_type}: {result.get('file_name')}", "INFO")
            except Exception as e:
                self.log(f"Generate {doc_type} document failed: {e}", "ERROR")
                self.failed += 1

    def test_recalculate(self):
        """재계산 테스트"""
        if not self.test_group_id:
            self.log("Skipping recalculate - no group ID", "WARNING")
            return

        self.log("\n=== Testing Recalculate ===")
        try:
            data = {"recalculate_all": True}
            response = requests.post(f"{API_BASE_URL}/groups/{self.test_group_id}/recalculate", json=data)
            if self.assert_status(response, 200, "Recalculate"):
                result = response.json()
                self.log(f"Recalculation result: {result.get('message')}", "INFO")
        except Exception as e:
            self.log(f"Recalculate failed: {e}", "ERROR")
            self.failed += 1

    def test_frontend_access(self):
        """프론트엔드 접근 테스트"""
        self.log("\n=== Testing Frontend Access ===")

        pages = [
            "/pages/group_list.html",
            "/pages/group_form.html",
            "/pages/group_dashboard.html",
            "/pages/itinerary.html"
        ]

        for page in pages:
            try:
                response = requests.get(f"{FRONTEND_URL}{page}")
                self.assert_status(response, 200, f"Access {page}")
            except Exception as e:
                self.log(f"Access {page} failed: {e}", "ERROR")
                self.failed += 1

    def cleanup(self):
        """테스트 데이터 정리"""
        if not self.test_group_id:
            return

        self.log("\n=== Cleaning Up Test Data ===")
        try:
            response = requests.delete(f"{API_BASE_URL}/groups/{self.test_group_id}")
            if response.status_code == 204:
                self.log("Test group deleted successfully", "SUCCESS")
            else:
                self.log(f"Failed to delete test group: {response.status_code}", "WARNING")
        except Exception as e:
            self.log(f"Cleanup failed: {e}", "WARNING")

    def run_all_tests(self):
        """모든 테스트 실행"""
        self.log("=" * 60)
        self.log("통합 테스트 시작")
        self.log("=" * 60)

        # API 서버 연결 테스트
        self.test_health_check()

        # CRUD 테스트
        self.test_create_group()
        self.test_get_groups()
        self.test_get_group_detail()
        self.test_update_group()

        # 하위 리소스 테스트
        self.test_create_itinerary()
        self.test_create_cancel_rule()
        self.test_create_include()

        # 상태 변경 및 재계산 테스트
        self.test_change_status()
        self.test_recalculate()

        # 문서 생성 테스트
        self.test_generate_document()

        # 프론트엔드 테스트
        self.test_frontend_access()

        # 결과 출력
        self.log("\n" + "=" * 60)
        self.log("테스트 결과")
        self.log("=" * 60)
        self.log(f"총 테스트: {self.passed + self.failed}", "INFO")
        self.log(f"성공: {self.passed}", "SUCCESS")
        self.log(f"실패: {self.failed}", "ERROR" if self.failed > 0 else "INFO")

        success_rate = (self.passed / (self.passed + self.failed) * 100) if (self.passed + self.failed) > 0 else 0
        self.log(f"성공률: {success_rate:.1f}%", "SUCCESS" if success_rate >= 90 else "WARNING")

        # 정리 (자동)
        self.cleanup()

        return self.failed == 0


if __name__ == "__main__":
    tester = IntegrationTest()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
