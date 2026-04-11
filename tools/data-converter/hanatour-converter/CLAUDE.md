# CLAUDE.md

> 이 파일은 Claude Code가 프로젝트 컨텍스트를 빠르게 파악하도록 돕습니다.

## 프로젝트 개요

- **이름**: 여행상품 일정 변환기 (hanatour-converter)
- **설명**: 하나투어 일본 상품 URL을 입력하면 자사 양식 엑셀 일정표로 변환하는 웹 앱
- **기술 스택**: FastAPI + Python + Playwright + openpyxl

## 빠른 시작

```bash
# 가상환경 생성 및 활성화
python -m venv venv
venv\Scripts\activate  # Windows

# 의존성 설치
pip install fastapi uvicorn playwright openpyxl

# Playwright 브라우저 설치
playwright install chromium

# 개발 서버 실행
uvicorn app.main:app --reload

# 테스트 실행
pytest
```

## 프로젝트 구조

```
hanatour-converter/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI 앱
│   ├── api/
│   │   └── routes.py        # API 라우트
│   └── services/
│       ├── scraper.py       # 스크래핑 로직
│       └── excel.py         # 엑셀 생성 로직
├── frontend/
│   └── index.html           # 웹 UI
├── tests/
│   ├── test_scraper.py
│   ├── test_excel.py
│   └── test_api.py
├── downloads/               # 생성된 엑셀 파일
├── TASKS.md                 # 태스크 목록
├── CLAUDE.md                # 이 파일
└── requirements.txt
```

## 컨벤션

- 커밋 메시지: Conventional Commits (한글)
- 브랜치 전략: feature/*, fix/*, phase/*
- 코드 스타일: Black + isort

