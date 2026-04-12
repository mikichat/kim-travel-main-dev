# TourWorld Database (스키마 문서)

## 개요
PostgreSQL 데이터베이스 스키마 정의 문서. 계약/견적 시스템의 데이터 구조를 정의.

## 주요 테이블

### groups (단체 기본 정보)
단체旅行 단체의 기본 정보 관리

### itinerary (일정 정보)
여행 일정 정보 관리

### cancel_rules (취소 규정)
단체별 취소 규정 관리

### includes (포함/불포함 항목)
여행 상품에 포함/불포함 항목 관리

### documents (문서 관리)
생성된 문서 정보 관리

### audit_logs (감사 로그)
시스템 이용 감사 로그

## 파일
- `schema.sql` - 전체 DB 스키마 정의

## Git 워크플로우
1. 파일 수정 전: `git pull`
2. 파일 수정 후: `git push`
3. 커밋 메시지: **반드시 한국어**