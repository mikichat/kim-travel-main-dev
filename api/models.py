"""
SQLAlchemy Database Models
"""
from sqlalchemy import Column, String, Integer, Boolean, Date, DECIMAL, DateTime, Text, ForeignKey, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from database import Base


class Group(Base):
    """단체 기본 정보 테이블"""
    __tablename__ = "groups"

    # 기본 식별자
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, index=True)

    # 날짜 정보
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False)

    # 기간 정보 (자동 계산)
    nights = Column(Integer, nullable=False)
    nights_manual = Column(Boolean, nullable=False, default=False)
    days = Column(Integer, nullable=False)
    days_manual = Column(Boolean, nullable=False, default=False)

    # 인원 및 요금 정보
    pax = Column(Integer, nullable=False)
    price_per_pax = Column(DECIMAL(12, 2), nullable=False)

    # 금액 정보 (자동 계산)
    total_price = Column(DECIMAL(12, 2), nullable=False)
    total_price_manual = Column(Boolean, nullable=False, default=False)
    deposit = Column(DECIMAL(12, 2), default=0)
    balance = Column(DECIMAL(12, 2), nullable=False)
    balance_manual = Column(Boolean, nullable=False, default=False)
    balance_due_date = Column(Date)
    balance_due_date_manual = Column(Boolean, nullable=False, default=False)

    # 상태 정보
    status = Column(String(20), nullable=False, default='estimate', index=True)

    # 메타데이터
    created_by = Column(String(100))
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_by = Column(String(100))
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    # 관계
    itineraries = relationship("GroupItinerary", back_populates="group", cascade="all, delete-orphan")
    cancel_rules = relationship("GroupCancelRule", back_populates="group", cascade="all, delete-orphan")
    includes = relationship("GroupInclude", back_populates="group", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="group", cascade="all, delete-orphan")

    # 제약조건
    __table_args__ = (
        CheckConstraint('end_date > start_date', name='check_end_date_after_start'),
        CheckConstraint('pax > 0', name='check_pax_positive'),
        CheckConstraint('price_per_pax >= 0', name='check_price_per_pax_non_negative'),
        CheckConstraint('deposit >= 0', name='check_deposit_non_negative'),
        CheckConstraint("status IN ('estimate', 'contract', 'confirmed')", name='check_status_valid'),
        Index('idx_groups_status_start_date', 'status', 'start_date'),
    )


class GroupItinerary(Base):
    """일정 정보 테이블"""
    __tablename__ = "group_itinerary"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey('groups.id', ondelete='CASCADE'), nullable=False, index=True)

    # 일정 순서 및 날짜
    day_no = Column(Integer, nullable=False)
    itinerary_date = Column(Date, nullable=False)
    itinerary_date_manual = Column(Boolean, nullable=False, default=False)

    # 일정 상세 정보
    location = Column(String(255))
    transport = Column(String(255))
    time = Column(String(50))
    schedule = Column(Text)
    meals = Column(String(255))
    accommodation = Column(String(255))

    # 메타데이터
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    # 관계
    group = relationship("Group", back_populates="itineraries")

    # 제약조건
    __table_args__ = (
        CheckConstraint('day_no > 0', name='check_day_no_positive'),
        Index('idx_itinerary_group_day', 'group_id', 'day_no', unique=True),
    )


class GroupCancelRule(Base):
    """취소 규정 테이블"""
    __tablename__ = "group_cancel_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey('groups.id', ondelete='CASCADE'), nullable=False, index=True)

    # 취소 규정 정보
    days_before = Column(Integer, nullable=False)
    cancel_date = Column(Date, nullable=False)
    cancel_date_manual = Column(Boolean, nullable=False, default=False)

    # 위약금 정보
    penalty_rate = Column(DECIMAL(5, 2), nullable=False)
    penalty_amount = Column(DECIMAL(12, 2))
    description = Column(Text)

    # 메타데이터
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    # 관계
    group = relationship("Group", back_populates="cancel_rules")

    # 제약조건
    __table_args__ = (
        CheckConstraint('penalty_rate >= 0 AND penalty_rate <= 100', name='check_penalty_rate_valid'),
        Index('idx_cancel_rules_days_before', 'group_id', 'days_before'),
    )


class GroupInclude(Base):
    """포함/불포함 항목 테이블"""
    __tablename__ = "group_includes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey('groups.id', ondelete='CASCADE'), nullable=False, index=True)

    # 항목 정보
    item_type = Column(String(20), nullable=False)
    category = Column(String(100))
    description = Column(Text, nullable=False)
    display_order = Column(Integer, nullable=False, default=0)

    # 메타데이터
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    # 관계
    group = relationship("Group", back_populates="includes")

    # 제약조건
    __table_args__ = (
        CheckConstraint("item_type IN ('include', 'exclude')", name='check_item_type_valid'),
        Index('idx_includes_type_order', 'group_id', 'item_type', 'display_order'),
    )


class Document(Base):
    """문서 이력 테이블"""
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey('groups.id', ondelete='CASCADE'), nullable=False, index=True)

    # 문서 정보
    document_type = Column(String(20), nullable=False)
    version = Column(Integer, nullable=False, default=1)

    # 파일 정보
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer)

    # 메타데이터
    generated_at = Column(DateTime, nullable=False, server_default=func.now())
    generated_by = Column(String(100))

    # 관계
    group = relationship("Group", back_populates="documents")

    # 제약조건
    __table_args__ = (
        CheckConstraint("document_type IN ('estimate', 'contract', 'itinerary', 'bundle')", name='check_document_type_valid'),
        Index('idx_documents_type_version', 'group_id', 'document_type', 'version'),
        Index('idx_documents_generated_at', 'generated_at'),
    )


class FlightSchedule(Base):
    """항공 스케줄 테이블"""
    __tablename__ = "flight_schedules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey('groups.id', ondelete='SET NULL'), nullable=True, index=True)
    group_name = Column(String(255))

    # 항공사 정보
    airline = Column(String(255), nullable=False)
    flight_number = Column(String(50))

    # 출발 정보
    departure_date = Column(Date, nullable=False, index=True)
    departure_airport = Column(String(10), nullable=False)
    departure_time = Column(String(10), nullable=False)

    # 도착 정보
    arrival_date = Column(Date, nullable=False)
    arrival_airport = Column(String(10), nullable=False)
    arrival_time = Column(String(10), nullable=False)

    # 기타
    passengers = Column(Integer, default=0)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    # 관계
    group = relationship("Group", backref="flight_schedules")


class BankAccount(Base):
    """은행 계좌 정보 테이블"""
    __tablename__ = "bank_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bank_name = Column(String(255), nullable=False)
    account_number = Column(String(50), nullable=False)
    account_holder = Column(String(255), nullable=False)
    is_default = Column(Boolean, nullable=False, default=False, index=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())


class Invoice(Base):
    """인보이스 메타데이터 테이블"""
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_number = Column(String(50), unique=True, nullable=False)
    recipient = Column(String(255), nullable=False)
    invoice_date = Column(Date, nullable=False, index=True)
    description = Column(Text)

    # 항공 스케줄 연동
    flight_schedule_id = Column(UUID(as_uuid=True), ForeignKey('flight_schedules.id', ondelete='SET NULL'), nullable=True, index=True)

    # 항공료 정보
    airfare_unit_price = Column(DECIMAL(12, 2), default=0)
    airfare_quantity = Column(Integer, default=0)
    airfare_total = Column(DECIMAL(12, 2), default=0)

    # 선호좌석 정보
    seat_preference_unit_price = Column(DECIMAL(12, 2), default=0)
    seat_preference_quantity = Column(Integer, default=0)
    seat_preference_total = Column(DECIMAL(12, 2), default=0)

    # 총액
    total_amount = Column(DECIMAL(12, 2), nullable=False)

    # 은행 계좌 연동
    bank_account_id = Column(UUID(as_uuid=True), ForeignKey('bank_accounts.id', ondelete='SET NULL'), nullable=True, index=True)

    # 이미지 경로
    logo_path = Column(String(500))
    seal_path = Column(String(500))

    # PDF 파일 경로
    pdf_file_path = Column(String(500))

    # 메타데이터
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    # 관계
    flight_schedule = relationship("FlightSchedule", backref="invoices")
    bank_account = relationship("BankAccount", backref="invoices")


class AuditLog(Base):
    """감사 로그 테이블"""
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # 액션 정보
    action = Column(String(50), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=False)

    # 변경 정보
    field_name = Column(String(100))
    old_value = Column(Text)
    new_value = Column(Text)
    reason = Column(Text)

    # 추가 메타데이터 (metadata는 SQLAlchemy 예약어이므로 extra_data로 변경)
    # Text로 변경 (SQLite 호환성, JSON 문자열로 저장)
    extra_data = Column(Text)

    # 사용자 정보
    user_id = Column(String(100), nullable=False, index=True)
    ip_address = Column(String(45))

    # 메타데이터
    created_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)

    # 인덱스
    __table_args__ = (
        Index('idx_audit_logs_entity', 'entity_type', 'entity_id'),
    )
