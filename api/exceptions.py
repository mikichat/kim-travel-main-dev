"""
Custom Exception Classes
"""
from typing import Dict, Any, Optional


class BaseAPIException(Exception):
    """기본 API 예외 클래스"""

    def __init__(
        self,
        message: str,
        error_code: str,
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class ValidationError(BaseAPIException):
    """검증 에러 (400)"""

    def __init__(self, message: str, field: str = None, details: Dict[str, Any] = None):
        if details is None:
            details = {}
        if field:
            details["field"] = field

        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            status_code=400,
            details=details
        )


class NotFoundError(BaseAPIException):
    """리소스 없음 (404)"""

    def __init__(self, resource: str, resource_id: str = None):
        message = f"{resource}를 찾을 수 없습니다"
        if resource_id:
            message += f" (ID: {resource_id})"

        super().__init__(
            message=message,
            error_code="NOT_FOUND",
            status_code=404,
            details={"resource": resource, "id": resource_id}
        )


class ForbiddenError(BaseAPIException):
    """권한 없음 (403)"""

    def __init__(self, message: str = "권한이 없습니다", details: Dict[str, Any] = None):
        super().__init__(
            message=message,
            error_code="FORBIDDEN",
            status_code=403,
            details=details
        )


class ConflictError(BaseAPIException):
    """충돌 (409)"""

    def __init__(self, message: str, details: Dict[str, Any] = None):
        super().__init__(
            message=message,
            error_code="CONFLICT",
            status_code=409,
            details=details
        )


class InternalServerError(BaseAPIException):
    """내부 서버 오류 (500)"""

    def __init__(self, message: str = "내부 서버 오류가 발생했습니다", details: Dict[str, Any] = None):
        super().__init__(
            message=message,
            error_code="INTERNAL_SERVER_ERROR",
            status_code=500,
            details=details
        )
