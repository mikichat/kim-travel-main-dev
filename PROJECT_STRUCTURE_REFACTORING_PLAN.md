# 📁 프로젝트 파일/폴더 구조 개선 계획 (Refactoring Plan)

TourWorld 프로젝트의 아키텍처는 훌륭하게 모듈화되어 있지만, 루트 경로에 많은 파일이 쌓여 있고 일부 레거시 폴더 시스템이 직관적이지 않은 이름을 가지고 있습니다. 이를 바로잡아 파악하기 쉽고 확장 가능한 모노레포 구조로 정리하기 위한 구조 개선 계획입니다.

---

## 🛑 1. 현재의 문제점 (AS-IS)

1. **직관적이지 않은 폴더명**
   - `in/`: 이름만으로 목적(Invoices)을 유추하기 어렵습니다.
   - `air1/`: 무슨 역할을 하는지 명확하지 않습니다 (Flights 및 예약).
   - `hanatour/`, `hanatour-converter/`: 종속적인 이름 대신 역할 중심의 이름이 필요합니다 (일정표/컨버터).
   - `123/`: 어떤 목적도 없는 빈 폴더이거나 테스트용 폴더입니다.
2. **복제가 의심되거나 무작위적인 파일명**
   - `group-roster-manager-v2 (3).html` 등 다운로드 복사본 넘버링이 그대로 사용되었습니다.
3. **루트 디렉토리의 과도한 파편화**
   - 현행 Production Frontend(Vanilla JS/HTML) 관련 파일(`.html`, `js/`, `css/`)들이 루트에 흩어져 있어 백엔드/신규 클라이언트 환경과 섞여 있습니다.
   - 수많은 분석, 문제해결 및 로그용 `.md` 파일들이 루트 폴더에 정리되지 않은 채 존재합니다 (`BIRTHDATE_FIX_SUMMARY.md`, `SESSION_LOG.md` 등 20개 이상).

---

## 🎯 2. 명칭 변경 및 이동 계획 (TO-BE)

### 🧹 직관적이지 않은 이름 변경
| 기존 (AS-IS) | 변경 제안 (TO-BE) | 설명 |
|---|---|---|
| `in/` | `frontend/invoices/` | 인보이스(청구서) 관련 정적 파일 |
| `air1/` | `frontend/flights/` | 항공편/스케줄 관련 프론트엔드 파일 |
| `hanatour/` | `frontend/itineraries/` | 상세/간략 일정표 모듈 |
| `hanatour-converter/` | `tools/data-converter/` | 엑셀 및 데이터 컨버터 유틸리티 |
| `quote-editor-v1/` | `frontend/quotes/` | 견적서 생성기 프론트엔드 |
| `doc-template-1/` | `frontend/templates/` | 문서 인쇄용 템플릿 모음 |
| `123/` | *(삭제)* | 목적 불명의 테스트/빈 폴더 |

### 📄 파일명 정리
| 기존 (AS-IS) | 변경 제안 (TO-BE) |
|---|---|
| `group-roster-manager-v2 (3).html` | `frontend/pages/group-roster.html` |
| `flight-schedule-2025-12-26.png` | `docs/assets/flight-schedule-example.png` |

### 📂 루트 프론트엔드 통합 (`frontend/`)
루트에 있는 Current Stable 버전의 웹 자원들을 하나로 캡슐화합니다.
- `index.html`, `login.html`, `landing.html` 등 ➜ `frontend/` 안으로 계층적 이동
- `js/`, `css/`, `components/` ➜ `frontend/` 하위로 이동

### 📚 문서 및 로그 기록 스토리지 통합 (`docs/`)
루트를 차지하는 엄청난 양의 마크다운 기록물들을 분리합니다.
- **최상위 유지 필요 문서**: `README.md`, `ROADMAP.md`, `TASKS.md`, `CHECKLIST.md` 등 시스템의 메인 가이드라인 문서.
- **`docs/history/`로 이동**: `DURATION_BUG_FIX.md`, `FINAL_WORKFLOW_REPORT.md`, `SESSION_LOG.md` 등 작업 일지.
- **`docs/testing/`로 이동**: `SYNC_TEST_RESULTS.md`, `WORKFLOW_TEST_RESULT.md` 등 테스트 결과물.
- **기타 레퍼런스(`docs/references/`)**: `airport.txt`, `airports-iata.json`, `sql-queries.txt` 등.

---

## 🌳 3. 최종 목표 아키텍처 트리 (Target Structure)

정리가 완료되면 최상위 루트는 다음과 같이 깔끔하게 정돈되어 듀얼 체계(Current vs Next-Gen)를 완벽하게 대변합니다.

```text
tourworld-root/
├── client/                  # 🚀 [Next-Gen] React 기반 Frontend
├── server/                  # 🚀 [Next-Gen] Express+Prisma Backend
├── shared/                  # 🔗 공통 타입/유틸 라이브러리 (Monorepo Workspace)
├── backend/                 # 🛡️ [Current] Node.js Backend (안정화 버전)
│
├── frontend/                # 💻 [Current] Vanilla JS Frontend (신설 통합 폴더)
│   ├── index.html           # 메인 진입점 및 주요 페이지
│   ├── pages/               # 각종 서브 페이지 (login.html, cost-calculator.html 등)
│   ├── flights/             # (기존 air1/)
│   ├── invoices/            # (기존 in/)
│   ├── itineraries/         # (기존 hanatour/)
│   ├── quotes/              # (기존 quote-editor-v1/)
│   ├── templates/           # (기존 doc-template-1/)
│   ├── js/                  # (기존 루트 js/)
│   └── css/                 # (기존 루트 css/)
│
├── docs/                    # 📚 프로젝트 주요 문서 모음
│   ├── history/             # 버그 픽스 및 세션 로그 모음
│   ├── testing/             # 테스트 리포트 모음
│   └── references/          # 각종 참조용 텍스트, json 파일 등
│
├── tools/                   # ⚙️ 보조 실행/변환 도구들
│   ├── data-converter/      # (기존 hanatour-converter/)
│   └── scripts/             # (기존 루트 scripts/)
│
├── e2e/                     # 🧪 E2E 테스트 스펙 (Playwright 등)
├── __tests__/               # 🧪 프론트/백 통합 유닛 테스트 모음
│
└── package.json, (설정 파일들), README.md, ROADMAP.md
```

## 🚀 4. 리팩토링 진행 가이드 (제안)

이 계획을 실제 반영할 때는 프론트엔드 라우팅 및 리소스 경로 변경이 수반되어야 합니다:
1. 먼저 `docs/` 및 `123/`과 같은 독립적이거나 참조도가 낮은 파일/폴더들을 정리.
2. `frontend/` 디렉토리를 구축하고 기존 루트 레벨 HTML 파일 내부에 작성된 `<link>` (css) 및 `<script src(...)>` 상대 경로들을 업데이트 해가며 이동.
3. `in/` -> `invoices/`, `air1/` -> `flights/` 로 폴더명을 변경하고 관련된 파일 내비게이션(예: 인보이스 메뉴 클릭 시 이동하는 href 링크)들을 찾아 일괄 Replace (정규표현식 등 활용).
4. 모든 코드가 옮겨지고 참조가 갱신된 뒤, 로컬 개발/테스트 서버를 재실행 후 E2E 테스트 및 직접 수동 인스펙션을 통해 누락 파상 여부를 검증합니다.
