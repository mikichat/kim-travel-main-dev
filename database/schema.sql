-- ============================================================
-- 여행사 계약·견적·일정 자동화 인트라넷 시스템
-- Database Schema (PostgreSQL)
-- Created: 2024-12-23
-- ============================================================

-- UUID 확장 활성화 (PostgreSQL 13 미만인 경우 필요)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. groups 테이블
-- 목적: 단체의 기본 정보 저장 (시스템의 핵심 테이블)
-- ============================================================

CREATE TABLE groups (
    -- 기본 식별자
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,  -- 단체명 (중복 허용)

    -- 날짜 정보 (자동 계산의 기준)
    start_date DATE NOT NULL,  -- 출발일 (모든 자동 계산의 기준점)
    end_date DATE NOT NULL CHECK (end_date > start_date),  -- 도착일

    -- 기간 정보 (자동 계산)
    nights INTEGER NOT NULL,  -- 박수
    nights_manual BOOLEAN NOT NULL DEFAULT FALSE,  -- 박수 수동 수정 여부
    days INTEGER NOT NULL,  -- 일수
    days_manual BOOLEAN NOT NULL DEFAULT FALSE,  -- 일수 수동 수정 여부

    -- 인원 및 요금 정보
    pax INTEGER NOT NULL CHECK (pax > 0),  -- 인원수
    price_per_pax DECIMAL(12,2) NOT NULL CHECK (price_per_pax >= 0),  -- 1인당 요금

    -- 금액 정보 (자동 계산)
    total_price DECIMAL(12,2) NOT NULL,  -- 총액
    total_price_manual BOOLEAN NOT NULL DEFAULT FALSE,  -- 총액 수동 수정 여부
    deposit DECIMAL(12,2) DEFAULT 0 CHECK (deposit >= 0),  -- 계약금
    balance DECIMAL(12,2) NOT NULL,  -- 잔액
    balance_manual BOOLEAN NOT NULL DEFAULT FALSE,  -- 잔액 수동 수정 여부
    balance_due_date DATE,  -- 잔액 완납일
    balance_due_date_manual BOOLEAN NOT NULL DEFAULT FALSE,  -- 완납일 수동 수정 여부

    -- 상태 정보
    status VARCHAR(20) NOT NULL DEFAULT 'estimate'
        CHECK (status IN ('estimate', 'contract', 'confirmed')),  -- 견적/계약/확정

    -- 메타데이터
    created_by VARCHAR(100),  -- 생성자
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- 생성 일시
    updated_by VARCHAR(100),  -- 수정자
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP  -- 수정 일시
);

-- groups 테이블 인덱스
CREATE INDEX idx_groups_name ON groups(name);  -- 단체명 검색용
CREATE INDEX idx_groups_start_date ON groups(start_date);  -- 날짜 범위 검색용
CREATE INDEX idx_groups_status ON groups(status);  -- 상태별 필터링용
CREATE INDEX idx_groups_status_start_date ON groups(status, start_date);  -- 복합 인덱스

-- groups 테이블 설명
COMMENT ON TABLE groups IS '단체 기본 정보 - 시스템의 핵심 엔티티';
COMMENT ON COLUMN groups.name IS '단체명 (중복 허용, 고유 식별은 id 사용)';
COMMENT ON COLUMN groups.start_date IS '출발일 (모든 자동 계산의 기준점)';
COMMENT ON COLUMN groups.nights_manual IS '수동 수정 시 TRUE, 자동 재계산 보호';
COMMENT ON COLUMN groups.status IS 'estimate(견적), contract(계약), confirmed(확정)';

-- ============================================================
-- 2. group_itinerary 테이블
-- 목적: 단체별 일정 정보 저장
-- ============================================================

CREATE TABLE group_itinerary (
    -- 기본 식별자
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,  -- 단체 ID (외래키)

    -- 일정 순서 및 날짜
    day_no INTEGER NOT NULL CHECK (day_no > 0),  -- 일차 번호 (1부터 시작)
    itinerary_date DATE NOT NULL,  -- 일정 날짜 (자동 계산)
    itinerary_date_manual BOOLEAN NOT NULL DEFAULT FALSE,  -- 날짜 수동 수정 여부

    -- 일정 상세 정보
    location VARCHAR(255),  -- 지역/장소
    transport VARCHAR(255),  -- 교통편
    time VARCHAR(50),  -- 시간
    schedule TEXT,  -- 일정 내용
    meals VARCHAR(255),  -- 식사 정보
    accommodation VARCHAR(255),  -- 숙박 정보

    -- 메타데이터
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 제약조건: 동일 단체 내 day_no 중복 방지
    CONSTRAINT uk_itinerary_group_day UNIQUE (group_id, day_no)
);

-- group_itinerary 테이블 인덱스
CREATE INDEX idx_itinerary_group_id ON group_itinerary(group_id);  -- 단체별 일정 조회용
CREATE INDEX idx_itinerary_group_day ON group_itinerary(group_id, day_no);  -- 일차 순서 정렬용

-- group_itinerary 테이블 설명
COMMENT ON TABLE group_itinerary IS '단체별 일정 정보';
COMMENT ON COLUMN group_itinerary.day_no IS '일차 번호 (1부터 시작)';
COMMENT ON COLUMN group_itinerary.itinerary_date IS '출발일 변경 시 항상 재계산됨 (manual 플래그 무시)';

-- ============================================================
-- 3. group_cancel_rules 테이블
-- 목적: 단체별 취소 규정 및 위약금 정보 저장
-- ============================================================

CREATE TABLE group_cancel_rules (
    -- 기본 식별자
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,  -- 단체 ID (외래키)

    -- 취소 규정 정보
    days_before INTEGER NOT NULL,  -- 출발일 기준 며칠 전
    cancel_date DATE NOT NULL,  -- 취소 기준일 (자동 계산)
    cancel_date_manual BOOLEAN NOT NULL DEFAULT FALSE,  -- 취소일 수동 수정 여부

    -- 위약금 정보
    penalty_rate DECIMAL(5,2) NOT NULL
        CHECK (penalty_rate >= 0 AND penalty_rate <= 100),  -- 위약금 비율 (%)
    penalty_amount DECIMAL(12,2),  -- 위약금 금액 (선택)
    description TEXT,  -- 취소 규정 설명

    -- 메타데이터
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- group_cancel_rules 테이블 인덱스
CREATE INDEX idx_cancel_rules_group_id ON group_cancel_rules(group_id);  -- 단체별 조회용
CREATE INDEX idx_cancel_rules_days_before ON group_cancel_rules(group_id, days_before DESC);  -- 정렬용

-- group_cancel_rules 테이블 설명
COMMENT ON TABLE group_cancel_rules IS '단체별 취소 규정 및 위약금';
COMMENT ON COLUMN group_cancel_rules.days_before IS '출발일 기준 며칠 전';
COMMENT ON COLUMN group_cancel_rules.penalty_rate IS '위약금 비율 0~100%';

-- ============================================================
-- 4. group_includes 테이블
-- 목적: 단체별 포함/불포함 항목 저장
-- ============================================================

CREATE TABLE group_includes (
    -- 기본 식별자
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,  -- 단체 ID (외래키)

    -- 항목 정보
    item_type VARCHAR(20) NOT NULL
        CHECK (item_type IN ('include', 'exclude')),  -- 포함/불포함 구분
    category VARCHAR(100),  -- 항목 카테고리 (항공, 호텔, 식사 등)
    description TEXT NOT NULL,  -- 항목 설명
    display_order INTEGER NOT NULL DEFAULT 0,  -- 표시 순서

    -- 메타데이터
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- group_includes 테이블 인덱스
CREATE INDEX idx_includes_group_id ON group_includes(group_id);  -- 단체별 조회용
CREATE INDEX idx_includes_type_order ON group_includes(group_id, item_type, display_order);  -- 타입별 정렬용

-- group_includes 테이블 설명
COMMENT ON TABLE group_includes IS '단체별 포함/불포함 항목';
COMMENT ON COLUMN group_includes.item_type IS 'include(포함) 또는 exclude(불포함)';
COMMENT ON COLUMN group_includes.display_order IS '작은 숫자가 먼저 표시됨';

-- ============================================================
-- 5. documents 테이블
-- 목적: 생성된 PDF 문서의 이력 및 버전 관리
-- ============================================================

CREATE TABLE documents (
    -- 기본 식별자
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,  -- 단체 ID (외래키)

    -- 문서 정보
    document_type VARCHAR(20) NOT NULL
        CHECK (document_type IN ('estimate', 'contract', 'itinerary', 'bundle')),  -- 문서 종류
    version INTEGER NOT NULL DEFAULT 1,  -- 버전 번호

    -- 파일 정보
    file_path VARCHAR(500) NOT NULL,  -- 파일 저장 경로
    file_name VARCHAR(255) NOT NULL,  -- 파일명
    file_size BIGINT,  -- 파일 크기 (bytes)

    -- 메타데이터
    generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- 생성 일시
    generated_by VARCHAR(100)  -- 생성자
);

-- documents 테이블 인덱스
CREATE INDEX idx_documents_group_id ON documents(group_id);  -- 단체별 문서 조회용
CREATE INDEX idx_documents_type_version ON documents(group_id, document_type, version DESC);  -- 버전 관리용
CREATE INDEX idx_documents_generated_at ON documents(generated_at DESC);  -- 생성일시 조회용

-- documents 테이블 설명
COMMENT ON TABLE documents IS 'PDF 문서 이력 및 버전 관리';
COMMENT ON COLUMN documents.document_type IS 'estimate(견적서), contract(계약서), itinerary(일정표), bundle(통합)';
COMMENT ON COLUMN documents.file_name IS '규칙: {문서타입}_{단체명}_v{버전}_{YYYYMMDD}.pdf';

-- ============================================================
-- 6. audit_logs 테이블 (추가)
-- 목적: 시스템 내 모든 중요 작업의 감사 추적
-- ============================================================

CREATE TABLE audit_logs (
    -- 기본 식별자
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 액션 정보
    action VARCHAR(50) NOT NULL,  -- 액션 타입 (AUTO_CALCULATE, MANUAL_MODIFY, DOCUMENT_GENERATE 등)
    entity_type VARCHAR(50) NOT NULL,  -- 엔티티 타입 (group, document, itinerary 등)
    entity_id UUID NOT NULL,  -- 엔티티 ID

    -- 변경 정보
    field_name VARCHAR(100),  -- 수정된 필드명
    old_value TEXT,  -- 이전 값
    new_value TEXT,  -- 새 값
    reason TEXT,  -- 수정 사유 (수동 수정인 경우)

    -- 추가 메타데이터
    metadata JSONB,  -- 추가 정보 (JSON 형식)

    -- 사용자 정보
    user_id VARCHAR(100) NOT NULL,  -- 사용자 ID
    ip_address VARCHAR(45),  -- IP 주소

    -- 메타데이터
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- audit_logs 테이블 인덱스
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);  -- 엔티티별 조회용
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);  -- 사용자별 조회용
CREATE INDEX idx_audit_logs_action ON audit_logs(action);  -- 액션별 조회용
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);  -- 날짜별 조회용

-- audit_logs 테이블 설명
COMMENT ON TABLE audit_logs IS '시스템 감사 로그 - 모든 중요 작업 추적';
COMMENT ON COLUMN audit_logs.action IS 'AUTO_CALCULATE, MANUAL_MODIFY, DOCUMENT_GENERATE 등';
COMMENT ON COLUMN audit_logs.metadata IS 'JSON 형식의 추가 메타데이터';

-- ============================================================
-- 테이블 생성 완료 메시지
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE '데이터베이스 스키마 생성 완료';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '생성된 테이블:';
    RAISE NOTICE '  1. groups - 단체 기본 정보';
    RAISE NOTICE '  2. group_itinerary - 일정 정보';
    RAISE NOTICE '  3. group_cancel_rules - 취소 규정';
    RAISE NOTICE '  4. group_includes - 포함/불포함 항목';
    RAISE NOTICE '  5. documents - 문서 이력';
    RAISE NOTICE '  6. audit_logs - 감사 로그';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '다음 명령으로 테이블 목록을 확인하세요:';
    RAISE NOTICE '  \dt';
    RAISE NOTICE '============================================================';
END $$;
