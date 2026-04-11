/**
 * server.js에 정의된 API 엔드포인트의 Swagger 정의
 * swagger-jsdoc이 이 파일을 스캔하여 OpenAPI 문서에 포함합니다.
 */

// ==================== 파일 업로드 ====================

/**
 * @swagger
 * /api/upload:
 *   post:
 *     tags: [파일 업로드]
 *     summary: 여행 일정 파일 업로드 및 AI 분석
 *     description: HWP/Excel/PDF/Word 파일을 업로드하면 Gemini AI가 일정을 파싱하여 DB에 저장합니다. Rate limit 1분 10회.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [schedule_file, group_name]
 *             properties:
 *               schedule_file:
 *                 type: string
 *                 format: binary
 *                 description: "업로드 파일 (지원: .xlsx, .xls, .pdf, .doc, .docx, .hwp / 최대 20MB)"
 *               group_name:
 *                 type: string
 *                 description: 그룹명 (최대 200자)
 *     responses:
 *       200:
 *         description: 파싱 및 저장 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 saved:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 group_name:
 *                   type: string
 *       400:
 *         description: 파일 누락 또는 그룹명 오류
 *       503:
 *         description: Gemini API 키 미설정
 */

/**
 * @swagger
 * /api/parse-product-file:
 *   post:
 *     tags: [파일 업로드]
 *     summary: 상품 파일(HWP) 파싱
 *     description: HWP/HWPX 파일에서 여행 상품 정보(목적지, 기간, 인원, 비용, 호텔, 일정 등)를 추출합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [product_file]
 *             properties:
 *               product_file:
 *                 type: string
 *                 format: binary
 *                 description: "HWP/HWPX 파일"
 *     responses:
 *       200:
 *         description: 파싱 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                   enum: [quotation, confirmation]
 *                 destination:
 *                   type: string
 *                 travelDates:
 *                   type: object
 *                 duration:
 *                   type: integer
 *                 pax:
 *                   type: object
 *                 hotel:
 *                   type: object
 *                 costs:
 *                   type: object
 *                 itinerary:
 *                   type: array
 *       400:
 *         description: 파일 누락 또는 지원하지 않는 형식
 */

// ==================== 여권 OCR ====================

/**
 * @swagger
 * /api/passport-ocr/scan:
 *   post:
 *     tags: [여권 OCR]
 *     summary: 여권 이미지 OCR 스캔 (프록시)
 *     description: tourworld1/landing 서버(OCR_SERVER_URL)로 요청을 프록시합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 description: Base64 인코딩된 여권 이미지
 *     responses:
 *       200:
 *         description: OCR 결과
 *       502:
 *         description: OCR 서버 연결 실패
 */

// ==================== 일정 관리 ====================

/**
 * @swagger
 * /api/schedules:
 *   get:
 *     tags: [일정]
 *     summary: 일정 목록 조회
 *     parameters:
 *       - in: query
 *         name: group
 *         schema:
 *           type: string
 *         description: 그룹명으로 필터링
 *     responses:
 *       200:
 *         description: 일정 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Schedule'
 *   post:
 *     tags: [일정]
 *     summary: 일정 추가
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [schedule]
 *             properties:
 *               group_name:
 *                 type: string
 *               event_date:
 *                 type: string
 *                 format: date
 *               location:
 *                 type: string
 *               transport:
 *                 type: string
 *               time:
 *                 type: string
 *               schedule:
 *                 type: string
 *                 description: 일정 내용 (필수)
 *               meals:
 *                 type: string
 *               color:
 *                 type: string
 *                 default: '#7B61FF'
 *     responses:
 *       201:
 *         description: 생성된 일정
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Schedule'
 *       400:
 *         description: schedule 필드 누락
 */

/**
 * @swagger
 * /api/schedules/date/{date}:
 *   get:
 *     tags: [일정]
 *     summary: 날짜별 일정 조회
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: 조회할 날짜 (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: 해당 날짜 일정 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Schedule'
 */

/**
 * @swagger
 * /api/schedules/export:
 *   get:
 *     tags: [일정]
 *     summary: 일정 Excel 내보내기
 *     parameters:
 *       - in: query
 *         name: group_name
 *         schema:
 *           type: string
 *         description: 그룹명으로 필터링 (없으면 전체)
 *     responses:
 *       200:
 *         description: Excel 파일 다운로드
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: 내보낼 데이터 없음
 */

/**
 * @swagger
 * /api/schedules/{id}:
 *   get:
 *     tags: [일정]
 *     summary: 일정 상세 조회
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 일정 상세
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Schedule'
 *       404:
 *         description: 일정을 찾을 수 없음
 *   put:
 *     tags: [일정]
 *     summary: 일정 수정
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [schedule]
 *             properties:
 *               group_name:
 *                 type: string
 *               event_date:
 *                 type: string
 *                 format: date
 *               location:
 *                 type: string
 *               transport:
 *                 type: string
 *               time:
 *                 type: string
 *               schedule:
 *                 type: string
 *               meals:
 *                 type: string
 *               color:
 *                 type: string
 *     responses:
 *       200:
 *         description: 수정된 일정
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Schedule'
 *       400:
 *         description: schedule 필드 누락
 *       404:
 *         description: 일정을 찾을 수 없음
 *   delete:
 *     tags: [일정]
 *     summary: 일정 삭제
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: 삭제 성공
 *       404:
 *         description: 일정을 찾을 수 없음
 */

// ==================== 원가 계산서 ====================

/**
 * @swagger
 * /api/cost-calculations:
 *   get:
 *     tags: [원가 계산서]
 *     summary: 원가 계산서 목록 조회
 *     responses:
 *       200:
 *         description: 원가 계산서 목록 (JSON 필드 제외한 요약)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CostCalculation'
 *   post:
 *     tags: [원가 계산서]
 *     summary: 원가 계산서 저장 (생성/수정)
 *     description: code가 있으면 기존 데이터 업데이트, 없으면 자동 생성 (COST-YYYY-MM-XXX)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               code:
 *                 type: string
 *                 description: "코드 (없으면 자동 생성)"
 *               name:
 *                 type: string
 *                 description: 행사명 (필수)
 *               destination:
 *                 type: string
 *               departure_date:
 *                 type: string
 *                 format: date
 *               arrival_date:
 *                 type: string
 *                 format: date
 *               nights:
 *                 type: integer
 *               days:
 *                 type: integer
 *               adults:
 *                 type: integer
 *               children:
 *                 type: integer
 *               infants:
 *                 type: integer
 *               tc:
 *                 type: integer
 *               flight_data:
 *                 type: object
 *               etc_costs:
 *                 type: object
 *               land_cost_1:
 *                 type: object
 *               land_cost_2:
 *                 type: object
 *               margin_amount_1:
 *                 type: number
 *               margin_amount_2:
 *                 type: number
 *               notes_1:
 *                 type: string
 *               notes_2:
 *                 type: string
 *     responses:
 *       201:
 *         description: 생성 성공
 *       200:
 *         description: 업데이트 성공
 *       400:
 *         description: 행사명 누락
 */

/**
 * @swagger
 * /api/cost-calculations/{id}:
 *   get:
 *     tags: [원가 계산서]
 *     summary: 원가 계산서 상세 조회
 *     description: JSON 필드(flight_data, etc_costs, land_cost_1, land_cost_2)를 파싱하여 반환
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 원가 계산서 상세
 *       404:
 *         description: 원가 계산서를 찾을 수 없음
 *   delete:
 *     tags: [원가 계산서]
 *     summary: 원가 계산서 삭제
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: 삭제 성공
 *       404:
 *         description: 원가 계산서를 찾을 수 없음
 */

// ==================== 동기화 ====================

/**
 * @swagger
 * /api/sync/customers/batch:
 *   post:
 *     tags: [동기화]
 *     summary: 배치 고객 동기화
 *     description: 단체명단에서 고객 DB로 배치 동기화. 여권번호 기준 중복 체크, 최대 500명. Rate limit 1분 20회.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [members]
 *             properties:
 *               group_id:
 *                 type: string
 *               group_name:
 *                 type: string
 *                 maxLength: 200
 *               departure_date:
 *                 type: string
 *                 format: date
 *               return_date:
 *                 type: string
 *                 format: date
 *               destination:
 *                 type: string
 *               members:
 *                 type: array
 *                 maxItems: 500
 *                 items:
 *                   type: object
 *                   required: [passportNo, birthDate, passportExpire]
 *                   properties:
 *                     nameKor:
 *                       type: string
 *                     nameEn:
 *                       type: string
 *                     passportNo:
 *                       type: string
 *                     birthDate:
 *                       type: string
 *                     passportExpire:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     gender:
 *                       type: string
 *     responses:
 *       200:
 *         description: 동기화 결과
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 created:
 *                   type: integer
 *                 updated:
 *                   type: integer
 *                 skipped:
 *                   type: integer
 *                 errors:
 *                   type: array
 *                 sync_log_id:
 *                   type: string
 *       400:
 *         description: 멤버 목록 누락 또는 유효성 오류
 */

/**
 * @swagger
 * /api/sync/validate:
 *   post:
 *     tags: [동기화]
 *     summary: 동기화 전 검증
 *     description: 멤버 데이터의 필수 필드와 중복 여부를 사전 검증합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [members]
 *             properties:
 *               members:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: 검증 결과
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: array
 *                 invalid:
 *                   type: array
 *                 duplicates:
 *                   type: array
 *       400:
 *         description: 멤버 목록 누락
 */

/**
 * @swagger
 * /api/sync/history:
 *   get:
 *     tags: [동기화]
 *     summary: 동기화 이력 조회
 *     parameters:
 *       - in: query
 *         name: group_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: sync_type
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 1000
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: 동기화 로그 목록
 */

// ==================== 상품 매칭 ====================

/**
 * @swagger
 * /api/products/match:
 *   get:
 *     tags: [상품]
 *     summary: 상품 목적지 매칭
 *     description: 목적지 정확 매칭 또는 유사도(Levenshtein) 기반 검색
 *     parameters:
 *       - in: query
 *         name: destination
 *         required: true
 *         schema:
 *           type: string
 *         description: 목적지
 *     responses:
 *       200:
 *         description: 매칭 결과
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exact_match:
 *                   type: object
 *                   nullable: true
 *                 similar_matches:
 *                   type: array
 *       400:
 *         description: 목적지 파라미터 누락
 */

// ==================== 데이터베이스 백업 ====================

/**
 * @swagger
 * /api/backup/database:
 *   get:
 *     tags: [백업]
 *     summary: 데이터베이스 JSON 백업
 *     description: customers, products, bookings, schedules, todos, notifications 테이블 전체를 JSON으로 반환
 *     responses:
 *       200:
 *         description: 백업 데이터
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 timestamp:
 *                   type: integer
 *                 date:
 *                   type: string
 *                 version:
 *                   type: string
 *                 tables:
 *                   type: object
 */

/**
 * @swagger
 * /api/backup/download:
 *   get:
 *     tags: [백업]
 *     summary: 백업 JSON 파일 다운로드
 *     responses:
 *       200:
 *         description: JSON 파일 다운로드
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               format: binary
 */

/**
 * @swagger
 * /api/backup/file:
 *   get:
 *     tags: [백업]
 *     summary: SQLite DB 파일 백업
 *     description: DB 파일을 backups/ 폴더에 복사합니다. 최근 7개만 유지.
 *     responses:
 *       200:
 *         description: 백업 완료
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 backupFile:
 *                   type: string
 *                 totalBackups:
 *                   type: integer
 */

// ==================== 범용 테이블 CRUD ====================

/**
 * @swagger
 * /tables/{tableName}:
 *   get:
 *     tags: [범용 테이블]
 *     summary: 테이블 데이터 조회
 *     description: "허용 테이블: customers, products, bookings, schedules, todos, notifications, groups, sync_logs, cost_calculations"
 *     parameters:
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *           enum: [customers, products, bookings, schedules, todos, notifications, groups, sync_logs, cost_calculations]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *           maximum: 1000
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: created_at
 *           enum: [created_at, updated_at, id, name, event_date, last_modified]
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           default: desc
 *           enum: [asc, desc]
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *         description: "필터 (형식: column:value)"
 *     responses:
 *       200:
 *         description: 데이터 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *       400:
 *         description: 허용되지 않은 테이블
 *   post:
 *     tags: [범용 테이블]
 *     summary: 테이블 데이터 생성
 *     parameters:
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *           enum: [customers, products, bookings, schedules, todos, notifications, groups, sync_logs, cost_calculations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: 테이블 스키마에 맞는 필드 (id, created_at은 자동 생성)
 *     responses:
 *       201:
 *         description: 생성 성공
 *       400:
 *         description: 허용되지 않은 테이블
 */

/**
 * @swagger
 * /tables/{tableName}/{id}:
 *   get:
 *     tags: [범용 테이블]
 *     summary: 테이블 단일 데이터 조회
 *     parameters:
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 데이터 상세
 *       404:
 *         description: 데이터를 찾을 수 없음
 *   put:
 *     tags: [범용 테이블]
 *     summary: 테이블 데이터 전체 수정
 *     parameters:
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: 수정 성공
 *       400:
 *         description: 허용되지 않은 테이블 또는 유효한 필드 없음
 *       404:
 *         description: 데이터를 찾을 수 없음
 *   patch:
 *     tags: [범용 테이블]
 *     summary: 테이블 데이터 부분 수정
 *     parameters:
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: 패치 성공
 *       400:
 *         description: 유효한 필드 없음
 *       404:
 *         description: 데이터를 찾을 수 없음
 *   delete:
 *     tags: [범용 테이블]
 *     summary: 테이블 데이터 삭제
 *     parameters:
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: 삭제 성공
 *       404:
 *         description: 데이터를 찾을 수 없음
 */
