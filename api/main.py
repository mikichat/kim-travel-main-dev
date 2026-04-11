"""
여행사 계약·견적·일정 자동화 인트라넷 시스템
FastAPI Main Application
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path

from database import engine, Base
from routers import groups, itineraries, cancel_rules, includes, documents, invoices
from middleware import add_exception_handlers

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('api.log')
    ]
)
logger = logging.getLogger(__name__)


# 데이터베이스 테이블 생성
def create_tables():
    """데이터베이스 테이블 생성 (개발용)"""
    Base.metadata.create_all(bind=engine)


# 앱 시작/종료 이벤트 처리
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 시작 시
    print("Starting application...")

    # SQLite 사용 시 테이블 자동 생성
    import os
    from dotenv import load_dotenv
    load_dotenv()
    database_url = os.getenv("DATABASE_URL", "")
    if database_url.startswith("sqlite"):
        print("Using SQLite - Creating tables...")
        create_tables()
        print("Tables created")

    # 예외 핸들러 등록
    await add_exception_handlers(app)
    print("Exception handlers registered")

    # OpenAPI 스키마 강제 재생성 (개발 중)
    app.openapi_schema = None
    print("OpenAPI schema reset")

    yield
    # 종료 시
    print("Shutting down application...")


# FastAPI 앱 생성
app = FastAPI(
    title="여행사 계약 관리 시스템",
    description="단체 여행 계약·견적·일정 자동화 인트라넷 API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS 설정 (프론트엔드 연동을 위해)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(groups.router)
app.include_router(itineraries.router)
app.include_router(cancel_rules.router)
app.include_router(includes.router)
app.include_router(documents.router)
app.include_router(documents.download_router)
app.include_router(invoices.router)

# 정적 파일 서빙 (프론트엔드)
frontend_path = Path(__file__).parent.parent / "frontend"
if frontend_path.exists():
    app.mount("/pages", StaticFiles(directory=str(frontend_path / "pages")), name="pages")
    app.mount("/static", StaticFiles(directory=str(frontend_path / "static")), name="static")
    logger.info(f"Frontend static files mounted from {frontend_path}")


@app.get("/")
def root():
    """루트 엔드포인트"""
    return {
        "message": "여행사 계약 관리 시스템 API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc"
    }


@app.get("/health")
def health_check():
    """헬스 체크 엔드포인트"""
    return {
        "status": "healthy",
        "service": "travel-agency-api"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True  # 개발 모드에서만 사용
    )
