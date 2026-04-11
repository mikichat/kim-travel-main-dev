"""
Pydantic Schemas for API Request/Response
"""
from pydantic import BaseModel, Field, ConfigDict
from datetime import date, datetime
from typing import List, Optional
from uuid import UUID
from decimal import Decimal


# ============================================================
# Invoice Schemas
# ============================================================

class InvoiceCreate(BaseModel):
    """인보이스 생성 스키마"""
    recipient: str = Field(..., description="수신")
    invoice_date: date = Field(..., description="일자")
    description: Optional[str] = None
    flight_schedule_id: Optional[UUID] = None
    airfare_unit_price: Decimal = Field(default=0, ge=0)
    airfare_quantity: int = Field(default=0, ge=0)
    seat_preference_unit_price: Decimal = Field(default=0, ge=0)
    seat_preference_quantity: int = Field(default=0, ge=0)
    bank_account_id: Optional[UUID] = None


class InvoiceUpdate(BaseModel):
    """인보이스 수정 스키마"""
    recipient: Optional[str] = None
    invoice_date: Optional[date] = None
    description: Optional[str] = None
    flight_schedule_id: Optional[UUID] = None
    airfare_unit_price: Optional[Decimal] = Field(None, ge=0)
    airfare_quantity: Optional[int] = Field(None, ge=0)
    seat_preference_unit_price: Optional[Decimal] = Field(None, ge=0)
    seat_preference_quantity: Optional[int] = Field(None, ge=0)
    bank_account_id: Optional[UUID] = None


class InvoiceResponse(BaseModel):
    """인보이스 응답 스키마"""
    id: UUID
    invoice_number: str
    recipient: str
    invoice_date: date
    description: Optional[str]
    flight_schedule_id: Optional[UUID]
    airfare_unit_price: Decimal
    airfare_quantity: int
    airfare_total: Decimal
    seat_preference_unit_price: Decimal
    seat_preference_quantity: int
    seat_preference_total: Decimal
    total_amount: Decimal
    bank_account_id: Optional[UUID]
    logo_path: Optional[str]
    seal_path: Optional[str]
    pdf_file_path: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# Group Schemas
# ============================================================

class GroupBase(BaseModel):
    """단체 기본 스키마"""
    name: str
    start_date: date
    end_date: date
    pax: int = Field(gt=0, description="인원수 (1명 이상)")
    price_per_pax: Decimal = Field(ge=0, description="1인당 요금")
    deposit: Decimal = Field(default=0, ge=0, description="계약금")
    status: str = Field(default="estimate", pattern="^(estimate|contract|confirmed)$")


class GroupSummary(BaseModel):
    """단체 목록 조회용 요약 스키마"""
    id: UUID
    name: str
    start_date: date
    end_date: date
    nights: int
    days: int
    pax: int
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GroupDetail(BaseModel):
    """단체 상세 조회용 스키마 (기본 정보만)"""
    id: UUID
    name: str
    start_date: date
    end_date: date
    nights: int
    nights_manual: bool
    days: int
    days_manual: bool
    pax: int
    price_per_pax: Decimal
    total_price: Decimal
    total_price_manual: bool
    deposit: Decimal
    balance: Decimal
    balance_manual: bool
    balance_due_date: Optional[date]
    balance_due_date_manual: bool
    status: str
    created_by: Optional[str]
    created_at: datetime
    updated_by: Optional[str]
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GroupDetailWithRelations(BaseModel):
    """단체 상세 조회용 스키마 (관련 데이터 포함)"""
    # 기본 정보
    id: UUID
    name: str
    start_date: date
    end_date: date
    nights: int
    nights_manual: bool
    days: int
    days_manual: bool
    pax: int
    price_per_pax: Decimal
    total_price: Decimal
    total_price_manual: bool
    deposit: Decimal
    balance: Decimal
    balance_manual: bool
    balance_due_date: Optional[date]
    balance_due_date_manual: bool
    status: str
    created_by: Optional[str]
    created_at: datetime
    updated_by: Optional[str]
    updated_at: datetime

    # 관련 데이터
    itineraries: List["ItineraryDetail"] = []
    cancel_rules: List["CancelRuleDetail"] = []
    includes: List["IncludeDetail"] = []

    model_config = ConfigDict(from_attributes=True)


class GroupCreate(GroupBase):
    """단체 생성 요청 스키마"""
    created_by: Optional[str] = None


class GroupUpdate(BaseModel):
    """단체 수정 요청 스키마"""
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    nights: Optional[int] = Field(None, gt=0, description="박수 (수동 수정 가능)")
    days: Optional[int] = Field(None, gt=0, description="일수 (수동 수정 가능)")
    pax: Optional[int] = Field(None, gt=0)
    price_per_pax: Optional[Decimal] = Field(None, ge=0)
    total_price: Optional[Decimal] = Field(None, ge=0, description="총액 (수동 수정 가능)")
    deposit: Optional[Decimal] = Field(None, ge=0)
    balance: Optional[Decimal] = Field(None, ge=0, description="잔액 (수동 수정 가능)")
    balance_due_date: Optional[date] = Field(None, description="잔액 완납일 (수동 수정 가능)")
    status: Optional[str] = Field(None, pattern="^(estimate|contract|confirmed)$")
    updated_by: Optional[str] = None


class GroupListResponse(BaseModel):
    """단체 목록 응답 스키마"""
    data: List[GroupSummary]
    total: int
    page: int
    limit: int
    total_pages: int


# ============================================================
# Status Change Schemas
# ============================================================

class StatusChangeRequest(BaseModel):
    """상태 변경 요청 스키마"""
    new_status: str = Field(..., pattern="^(estimate|contract|confirmed)$", description="새로운 상태")
    reason: Optional[str] = Field(None, max_length=500, description="상태 변경 사유")


class StatusChangeResponse(BaseModel):
    """상태 변경 응답 스키마"""
    id: UUID
    name: str
    old_status: str
    new_status: str
    changed_at: datetime
    reason: Optional[str]


# ============================================================
# Recalculate Schemas
# ============================================================

class RecalculateRequest(BaseModel):
    """재계산 요청 스키마"""
    fields: Optional[List[str]] = Field(
        None,
        description="재계산할 필드 목록 (생략 시 모든 자동 계산 필드). 예: ['nights', 'days', 'total_price', 'balance']"
    )
    reset_manual_flags: bool = Field(
        False,
        description="True인 경우 지정된 필드의 manual 플래그를 FALSE로 리셋하고 재계산"
    )


class RecalculateResponse(BaseModel):
    """재계산 응답 스키마"""
    group_id: UUID
    recalculated_fields: dict
    skipped_fields: List[str]
    message: str


# ============================================================
# Itinerary Schemas
# ============================================================

class ItineraryBase(BaseModel):
    """일정 기본 스키마"""
    location: Optional[str] = None
    transport: Optional[str] = None
    time: Optional[str] = None
    schedule: Optional[str] = None
    meals: Optional[str] = None
    accommodation: Optional[str] = None


class ItineraryDetail(BaseModel):
    """일정 상세 스키마"""
    id: UUID
    group_id: UUID
    day_no: int
    itinerary_date: date
    itinerary_date_manual: bool
    location: Optional[str]
    transport: Optional[str]
    time: Optional[str]
    schedule: Optional[str]
    meals: Optional[str]
    accommodation: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ItineraryUpdate(BaseModel):
    """일정 수정 요청 스키마"""
    day_no: Optional[int] = Field(None, gt=0)
    itinerary_date: Optional[date] = None
    location: Optional[str] = None
    transport: Optional[str] = None
    time: Optional[str] = None
    schedule: Optional[str] = None
    meals: Optional[str] = None
    accommodation: Optional[str] = None


# ============================================================
# Cancel Rule Schemas
# ============================================================

class CancelRuleBase(BaseModel):
    """취소 규정 기본 스키마"""
    days_before: int = Field(gt=0, description="출발일 기준 며칠 전")
    penalty_rate: Decimal = Field(ge=0, le=100, description="위약금 비율 (%)")
    penalty_amount: Optional[Decimal] = Field(None, description="위약금 금액")
    description: Optional[str] = None


class CancelRuleDetail(CancelRuleBase):
    """취소 규정 상세 스키마"""
    id: UUID
    group_id: UUID
    cancel_date: date
    cancel_date_manual: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# Include/Exclude Schemas
# ============================================================

class IncludeBase(BaseModel):
    """포함/불포함 항목 기본 스키마"""
    item_type: str = Field(pattern="^(include|exclude)$")
    category: Optional[str] = None
    description: str
    display_order: int = Field(default=0)


class IncludeDetail(IncludeBase):
    """포함/불포함 항목 상세 스키마"""
    id: UUID
    group_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IncludeCreate(IncludeBase):
    """포함/불포함 항목 생성 요청 스키마"""
    pass


# ============================================================
# Document Schemas
# ============================================================

class DocumentDetail(BaseModel):
    """문서 상세 스키마"""
    id: UUID
    group_id: UUID
    document_type: str
    version: int
    file_path: str
    file_name: str
    file_size: Optional[int]
    generated_at: datetime
    generated_by: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class DocumentGenerateRequest(BaseModel):
    """문서 생성 요청 스키마"""
    document_type: str = Field(pattern="^(estimate|contract|itinerary|bundle)$", description="문서 유형")
    version: Optional[int] = Field(None, gt=0, description="버전 번호 (생략 시 자동 증가)")


# ============================================================
# Error Response Schemas
# ============================================================

class ErrorResponse(BaseModel):
    """에러 응답 스키마"""
    error: str
    message: str
    field: Optional[str] = None
    code: Optional[str] = None
