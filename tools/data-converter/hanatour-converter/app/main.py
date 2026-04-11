# FastAPI Main Application
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.api.routes import router as convert_router

app = FastAPI(
    title="여행상품 일정 변환기",
    description="하나투어 일본 상품 URL을 자사 양식 엑셀로 변환",
    version="0.1.0",
)

# 라우터 등록
app.include_router(convert_router)

# 프론트엔드 정적 파일 경로
FRONTEND_DIR = Path(__file__).parent.parent / "frontend"


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/")
async def serve_frontend():
    """메인 페이지 - 프론트엔드 UI 제공."""
    return FileResponse(FRONTEND_DIR / "index.html")


# 정적 파일 마운트 (CSS, JS 등 추가 파일용)
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")
