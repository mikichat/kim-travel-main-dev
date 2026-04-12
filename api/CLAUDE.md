# TourWorld API (Python 백엔드)

## 개요
Python 기반 API 서비스. 라우터, 서비스, 유틸리티 구조로 구성됨.

## 기술 스택
- **Language**: Python 3.x
- **Framework**: (확인 필요 - Flask/FastAPI 추정)
- **Database**: SQLite

## 디렉토리 구조
```
api/
├── routers/           # API 라우터
├── services/          # 비즈니스 로직
├── utils/             # 유틸리티
├── templates/         # 템플릿
├── image/             # 이미지 처리
├── __pycache__/       # Python 캐시
└── (루트 Python 파일들)
```

## 실행 명령어
```bash
cd api
pip install -r requirements.txt  # 의존성 설치
python main.py                    # 서버 실행 (방법 확인 필요)
```

## Git 워크플로우
1. 파일 수정 전: `git pull`
2. 파일 수정 후: `git push`
3. 커밋 메시지: **반드시 한국어**