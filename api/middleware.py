"""
FastAPI Middleware - 에러 처리 및 로깅
"""
import logging
import traceback
from datetime import datetime
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import SQLAlchemyError, IntegrityError

from exceptions import BaseAPIException

# 로거 설정
logger = logging.getLogger(__name__)


async def add_exception_handlers(app):
    """
    FastAPI 앱에 예외 핸들러 등록
    """

    @app.exception_handler(BaseAPIException)
    async def custom_api_exception_handler(request: Request, exc: BaseAPIException):
        """
        커스텀 API 예외 처리
        """
        logger.warning(
            f"{exc.error_code}: {exc.message}",
            extra={
                "path": str(request.url),
                "method": request.method,
                "details": exc.details
            }
        )

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.error_code,
                "message": exc.message,
                "details": exc.details,
                "timestamp": datetime.now().isoformat(),
                "path": str(request.url.path)
            }
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        """
        Pydantic 검증 에러 처리
        """
        errors = []
        for error in exc.errors():
            field = ".".join(str(loc) for loc in error["loc"] if loc != "body")
            errors.append({
                "field": field,
                "message": error["msg"],
                "type": error["type"]
            })

        logger.warning(
            f"Validation error: {errors}",
            extra={
                "path": str(request.url),
                "method": request.method
            }
        )

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": "VALIDATION_ERROR",
                "message": "입력값이 올바르지 않습니다",
                "details": {"errors": errors},
                "timestamp": datetime.now().isoformat(),
                "path": str(request.url.path)
            }
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        """
        HTTP 예외 처리 (404, 405 등)
        """
        logger.warning(
            f"HTTP {exc.status_code}: {exc.detail}",
            extra={
                "path": str(request.url),
                "method": request.method
            }
        )

        # detail이 dict인 경우 그대로 사용
        if isinstance(exc.detail, dict):
            return JSONResponse(
                status_code=exc.status_code,
                content={
                    **exc.detail,
                    "timestamp": datetime.now().isoformat(),
                    "path": str(request.url.path)
                }
            )

        # detail이 문자열인 경우
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": f"HTTP_{exc.status_code}",
                "message": str(exc.detail),
                "timestamp": datetime.now().isoformat(),
                "path": str(request.url.path)
            }
        )

    @app.exception_handler(IntegrityError)
    async def integrity_exception_handler(request: Request, exc: IntegrityError):
        """
        데이터베이스 무결성 제약 위반 처리
        """
        logger.error(
            f"Database integrity error: {str(exc.orig)}",
            extra={
                "path": str(request.url),
                "method": request.method
            }
        )

        # 중복 키 에러 감지
        error_msg = str(exc.orig).lower()
        if "unique" in error_msg or "duplicate" in error_msg:
            return JSONResponse(
                status_code=status.HTTP_409_CONFLICT,
                content={
                    "error": "CONFLICT",
                    "message": "중복된 데이터가 존재합니다",
                    "details": {"database_error": "Unique constraint violation"},
                    "timestamp": datetime.now().isoformat(),
                    "path": str(request.url.path)
                }
            )

        # 외래 키 제약 위반
        if "foreign key" in error_msg:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "error": "VALIDATION_ERROR",
                    "message": "참조하는 데이터가 존재하지 않습니다",
                    "details": {"database_error": "Foreign key constraint violation"},
                    "timestamp": datetime.now().isoformat(),
                    "path": str(request.url.path)
                }
            )

        # 기타 무결성 에러
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "VALIDATION_ERROR",
                "message": "데이터 무결성 제약을 위반했습니다",
                "timestamp": datetime.now().isoformat(),
                "path": str(request.url.path)
            }
        )

    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
        """
        SQLAlchemy 데이터베이스 에러 처리
        """
        logger.error(
            f"Database error: {str(exc)}",
            extra={
                "path": str(request.url),
                "method": request.method,
                "traceback": traceback.format_exc()
            }
        )

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "DATABASE_ERROR",
                "message": "데이터베이스 오류가 발생했습니다",
                "timestamp": datetime.now().isoformat(),
                "path": str(request.url.path)
            }
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """
        모든 기타 예외 처리 (최종 catch-all)
        """
        logger.error(
            f"Unexpected error: {str(exc)}",
            extra={
                "path": str(request.url),
                "method": request.method,
                "traceback": traceback.format_exc()
            }
        )

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "INTERNAL_SERVER_ERROR",
                "message": "예기치 않은 오류가 발생했습니다",
                "timestamp": datetime.now().isoformat(),
                "path": str(request.url.path)
            }
        )
