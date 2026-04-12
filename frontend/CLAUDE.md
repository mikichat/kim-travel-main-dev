# TourWorld Frontend (Current Production)

## 개요
현재 운영 중인 Vanilla JS + HTML5 + CSS3 기반 프론트엔드. ES Modules와 DOM UI 방식을 사용하며 메모리 누출 방지에 신경 씀.

## 기술 스택
- **Language**: Vanilla JavaScript (ES6+)
- **Markup**: HTML5
- **Styling**: CSS3 (공통 스타일시트)
- **Icons**: 폰트 어썸(Font Awesome) 등
- **Charts**: 차트 라이브러리

## 주요 모듈
```
pages/       # 주요 HTML 페이지 (index, login, cost-calculator 등)
flights/     # 항공편/스케줄 관리
invoices/    # 인보이스/청구서
itineraries/ # 일정표 생성
quotes/      # 견적서 편집기
templates/   # 문서 인쇄 템플릿
js/          # 공통 JavaScript 유틸리티
css/         # 공통 스타일시트
components/  # 재사용 가능한 UI 컴포넌트
```

## 웹 진입
- 브라우저에서 `frontend/pages/index.html` 파일을 직접 열거나
- 간단한 웹서버로 서빙

```bash
# Python http.server 예시
cd frontend/pages
python -m http.server 8080

# Node.js http-server 예시
npx http-server -p 8080
```

## Git 워크플로우
1. 파일 수정 전: `git pull`
2. 파일 수정 후: `git push`
3. 커밋 메시지: **반드시 한국어**

## 현재 상태
- Production 운영 중
- DOM 접근성 (aria 属性) 완비
- XSS 방어 처리 완비