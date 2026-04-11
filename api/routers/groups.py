"""
Groups API Router - 단체 관리 API
"""
from fastapi import APIRouter, Query, HTTPException, Depends, status
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from datetime import date, datetime
from uuid import UUID

from database import get_db
from models import Group
from schemas import (
    GroupListResponse,
    GroupSummary,
    GroupDetail,
    GroupDetailWithRelations,
    GroupCreate,
    GroupUpdate,
    StatusChangeRequest,
    StatusChangeResponse,
    RecalculateRequest,
    RecalculateResponse
)

router = APIRouter(prefix="/api/groups", tags=["groups"])


@router.get("", response_model=GroupListResponse)
def get_groups(
    name: Optional[str] = Query(None, description="단체명 검색 (부분 일치)"),
    status: Optional[str] = Query(None, description="상태 필터 (estimate/contract/confirmed)"),
    start_date_from: Optional[date] = Query(None, description="출발일 시작 범위"),
    start_date_to: Optional[date] = Query(None, description="출발일 종료 범위"),
    page: int = Query(1, ge=1, description="페이지 번호"),
    limit: int = Query(20, ge=1, le=100, description="페이지당 항목 수"),
    db: Session = Depends(get_db)
):
    """
    단체 목록 조회 (GET /api/groups)

    검색 및 필터링 기능:
    - **name**: 단체명 부분 검색 (대소문자 구분 없음)
    - **status**: 상태 필터 (estimate/contract/confirmed)
    - **start_date_from**: 출발일 시작 범위
    - **start_date_to**: 출발일 종료 범위

    페이징:
    - **page**: 페이지 번호 (기본값: 1)
    - **limit**: 페이지당 항목 수 (기본값: 20, 최대: 100)

    응답:
    - **data**: 단체 목록
    - **total**: 전체 항목 수
    - **page**: 현재 페이지
    - **limit**: 페이지당 항목 수
    - **total_pages**: 전체 페이지 수
    """

    # 1. 기본 쿼리 생성
    query = db.query(Group)

    # 2. 검색/필터 조건 적용
    if name:
        # 대소문자 구분 없이 부분 검색
        query = query.filter(Group.name.ilike(f"%{name}%"))

    if status:
        # 상태 값 검증
        valid_statuses = ['estimate', 'contract', 'confirmed']
        if status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "ValidationError",
                    "message": f"Invalid status. Must be one of: {', '.join(valid_statuses)}",
                    "field": "status"
                }
            )
        query = query.filter(Group.status == status)

    if start_date_from:
        query = query.filter(Group.start_date >= start_date_from)

    if start_date_to:
        query = query.filter(Group.start_date <= start_date_to)

    # 3. 총 개수 조회
    total = query.count()

    # 4. 페이징 적용
    offset = (page - 1) * limit
    groups = query.order_by(Group.created_at.desc())\
                 .offset(offset)\
                 .limit(limit)\
                 .all()

    # 5. 응답 데이터 구성
    total_pages = (total + limit - 1) // limit if total > 0 else 0

    return {
        "data": groups,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }


@router.get("/{group_id}", response_model=GroupDetailWithRelations)
def get_group(
    group_id: UUID,
    db: Session = Depends(get_db)
):
    """
    단체 상세 조회 (GET /api/groups/{group_id})

    특정 단체의 상세 정보를 조회합니다.
    일정, 취소 규정, 포함/불포함 항목을 포함하여 반환합니다.

    Parameters:
    - **group_id**: 단체 UUID

    Returns:
    - 단체 상세 정보 (기본 정보 + 일정 + 취소 규정 + 포함/불포함 항목)

    Raises:
    - 404: 단체를 찾을 수 없음

    Query Optimization:
    - Eager loading을 사용하여 N+1 쿼리 문제를 방지합니다.
    - 모든 관련 데이터를 한 번의 쿼리로 조회합니다.
    """
    # Eager loading으로 관련 데이터를 한 번에 조회
    group = db.query(Group)\
        .options(
            joinedload(Group.itineraries),
            joinedload(Group.cancel_rules),
            joinedload(Group.includes)
        )\
        .filter(Group.id == group_id)\
        .first()

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "NotFoundError",
                "message": f"Group not found: {group_id}",
                "code": "GROUP_NOT_FOUND"
            }
        )

    return group


@router.post("", response_model=GroupDetail, status_code=status.HTTP_201_CREATED)
def create_group(
    group_data: GroupCreate,
    db: Session = Depends(get_db)
):
    """
    단체 생성 (POST /api/groups)

    새로운 단체를 생성합니다.
    자동 계산 로직은 별도 서비스에서 처리됩니다 (추후 구현).

    Request Body:
    - name: 단체명
    - start_date: 출발일
    - end_date: 도착일
    - pax: 인원수
    - price_per_pax: 1인당 요금
    - deposit: 계약금 (선택, 기본값: 0)
    - status: 상태 (선택, 기본값: estimate)
    - created_by: 생성자 (선택)

    Returns:
    - 생성된 단체 정보

    Raises:
    - 400: 유효하지 않은 데이터
    """
    # 날짜 검증
    if group_data.end_date <= group_data.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "ValidationError",
                "message": "도착일은 출발일보다 이후여야 합니다",
                "field": "end_date"
            }
        )

    # 기본 자동 계산 (임시 - 추후 서비스 레이어로 이동)
    nights = (group_data.end_date - group_data.start_date).days
    days = nights + 1
    total_price = group_data.pax * group_data.price_per_pax
    balance = total_price - group_data.deposit

    # 계약금 검증
    if group_data.deposit > total_price:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "ValidationError",
                "message": "계약금은 총액을 초과할 수 없습니다",
                "field": "deposit"
            }
        )

    # 단체 생성
    new_group = Group(
        **group_data.model_dump(),
        nights=nights,
        days=days,
        total_price=total_price,
        balance=balance
    )

    db.add(new_group)
    db.commit()
    db.refresh(new_group)

    return new_group


@router.put("/{group_id}", response_model=GroupDetail)
def update_group(
    group_id: UUID,
    group_data: GroupUpdate,
    db: Session = Depends(get_db)
):
    """
    단체 수정 (PUT /api/groups/{group_id})

    기존 단체의 정보를 수정합니다.
    자동 계산 로직은 별도 서비스에서 처리됩니다 (추후 구현).

    Parameters:
    - **group_id**: 단체 UUID

    Request Body (모든 필드 선택):
    - name: 단체명
    - start_date: 출발일
    - end_date: 도착일
    - pax: 인원수
    - price_per_pax: 1인당 요금
    - deposit: 계약금
    - status: 상태
    - updated_by: 수정자

    Returns:
    - 수정된 단체 정보

    Raises:
    - 404: 단체를 찾을 수 없음
    - 400: 유효하지 않은 데이터
    - 403: 확정 상태에서 수정 시도
    """
    # 단체 조회
    group = db.query(Group).filter(Group.id == group_id).first()

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "NotFoundError",
                "message": f"Group not found: {group_id}",
                "code": "GROUP_NOT_FOUND"
            }
        )

    # 확정 상태 체크
    if group.status == 'confirmed':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "ForbiddenError",
                "message": "확정된 계약은 수정할 수 없습니다",
                "code": "GROUP_CONFIRMED"
            }
        )

    # 수정할 필드만 업데이트
    update_data = group_data.model_dump(exclude_unset=True)

    # 수동 수정 감지: 자동 계산 필드를 직접 수정하면 manual 플래그 설정
    if 'nights' in update_data:
        group.nights_manual = True
    if 'days' in update_data:
        group.days_manual = True
    if 'total_price' in update_data:
        group.total_price_manual = True
    if 'balance' in update_data:
        group.balance_manual = True
    if 'balance_due_date' in update_data:
        group.balance_due_date_manual = True

    # 필드 업데이트
    for field, value in update_data.items():
        setattr(group, field, value)

    # 날짜 변경 시 검증
    if group.end_date <= group.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "ValidationError",
                "message": "도착일은 출발일보다 이후여야 합니다",
                "field": "end_date"
            }
        )

    # 자동 재계산 로직 (manual 플래그가 FALSE인 필드만)
    # 1. 날짜 기반 계산 (start_date 또는 end_date 변경 시)
    if 'start_date' in update_data or 'end_date' in update_data:
        if not group.nights_manual:
            group.nights = (group.end_date - group.start_date).days
        if not group.days_manual:
            group.days = group.nights + 1

    # 2. 인원/요금 기반 계산 (pax 또는 price_per_pax 변경 시)
    if 'pax' in update_data or 'price_per_pax' in update_data:
        if not group.total_price_manual:
            group.total_price = group.pax * group.price_per_pax

    # 3. 잔액 계산 (total_price 또는 deposit 변경 시)
    if 'total_price' in update_data or 'deposit' in update_data or 'pax' in update_data or 'price_per_pax' in update_data:
        # 계약금 검증
        if group.deposit > group.total_price:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "ValidationError",
                    "message": "계약금은 총액을 초과할 수 없습니다",
                    "field": "deposit"
                }
            )
        if not group.balance_manual:
            group.balance = group.total_price - group.deposit

    db.commit()
    db.refresh(group)

    return group


@router.put("/{group_id}/status", response_model=StatusChangeResponse)
def change_group_status(
    group_id: UUID,
    status_data: StatusChangeRequest,
    db: Session = Depends(get_db)
):
    """
    단체 상태 변경 (PUT /api/groups/{group_id}/status)

    단체의 상태를 변경합니다.
    상태 전환 규칙을 검증합니다.

    Parameters:
    - **group_id**: 단체 UUID

    Request Body:
    - new_status: 새로운 상태 (estimate/contract/confirmed)
    - reason: 상태 변경 사유 (선택)

    Returns:
    - 상태 변경 정보 (이전 상태, 새 상태, 변경 시각)

    Raises:
    - 404: 단체를 찾을 수 없음
    - 400: 유효하지 않은 상태 전환
    - 403: 역방향 전환 시도 (관리자 권한 필요, 추후 구현)

    상태 전환 규칙:
    - 정방향: estimate → contract → confirmed
    - 역방향: 관리자 권한 필요 (추후 인증 시스템 구현 시 적용)
    """
    # 단체 조회
    group = db.query(Group).filter(Group.id == group_id).first()

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "NotFoundError",
                "message": f"Group not found: {group_id}",
                "code": "GROUP_NOT_FOUND"
            }
        )

    old_status = group.status
    new_status = status_data.new_status

    # 동일 상태 전환 방지
    if old_status == new_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "ValidationError",
                "message": "동일한 상태로는 변경할 수 없습니다",
                "field": "new_status"
            }
        )

    # 상태 전환 방향 판단
    status_order = {'estimate': 1, 'contract': 2, 'confirmed': 3}
    is_backward = status_order[new_status] < status_order[old_status]

    # 역방향 전환 시 경고 (추후 인증 시스템 구현 시 권한 체크로 대체)
    if is_backward:
        # TODO: 인증 시스템 구현 후 관리자 권한 체크
        # if current_user.role != 'admin':
        #     raise HTTPException(status_code=403, detail="역방향 상태 전환은 관리자만 가능합니다")
        pass

    # 상태 변경
    group.status = new_status
    group.updated_at = datetime.now()

    db.commit()
    db.refresh(group)

    # TODO: 감사 로그 기록 (추후 감사 로그 서비스 구현 시)
    # log_audit(db, 'STATUS_CHANGE', group_id, {...})

    return StatusChangeResponse(
        id=group.id,
        name=group.name,
        old_status=old_status,
        new_status=new_status,
        changed_at=group.updated_at,
        reason=status_data.reason
    )


@router.post("/{group_id}/recalculate", response_model=RecalculateResponse)
def recalculate_group(
    group_id: UUID,
    request: RecalculateRequest,
    db: Session = Depends(get_db)
):
    """
    자동 계산 트리거 (POST /api/groups/{group_id}/recalculate)

    사용자가 명시적으로 자동 계산 필드를 재계산할 수 있습니다.

    Parameters:
    - **group_id**: 단체 UUID

    Request Body:
    - fields: 재계산할 필드 목록 (생략 시 모든 필드)
    - reset_manual_flags: manual 플래그 리셋 여부

    Returns:
    - 재계산된 필드 정보 및 건너뛴 필드 목록

    Raises:
    - 404: 단체를 찾을 수 없음
    - 403: 확정 상태에서 재계산 시도
    - 400: 잘못된 필드명

    기능:
    - 선택적 필드 재계산 (nights, days, total_price, balance)
    - manual 플래그 보호 (reset_manual_flags=False 시)
    - manual 플래그 리셋 옵션 (reset_manual_flags=True 시)
    """
    # 단체 조회
    group = db.query(Group).filter(Group.id == group_id).first()

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "NotFoundError",
                "message": f"Group not found: {group_id}",
                "code": "GROUP_NOT_FOUND"
            }
        )

    # 확정 상태 체크
    if group.status == 'confirmed':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "ForbiddenError",
                "message": "확정 상태에서는 재계산할 수 없습니다",
                "code": "GROUP_CONFIRMED"
            }
        )

    # 재계산할 필드 목록 결정
    allowed_fields = ['nights', 'days', 'total_price', 'balance']
    fields_to_recalc = request.fields or allowed_fields

    # 필드 검증
    invalid_fields = [f for f in fields_to_recalc if f not in allowed_fields]
    if invalid_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "ValidationError",
                "message": f"잘못된 필드: {invalid_fields}. 허용: {allowed_fields}",
                "field": "fields"
            }
        )

    recalculated = {}
    skipped = []

    # 각 필드 재계산
    for field in fields_to_recalc:
        manual_flag = f"{field}_manual"
        is_manual = getattr(group, manual_flag, False)

        # manual 플래그 확인
        if is_manual and not request.reset_manual_flags:
            skipped.append(field)
            continue

        old_value = getattr(group, field)

        # 재계산 로직
        if field == 'nights':
            new_value = (group.end_date - group.start_date).days
        elif field == 'days':
            new_value = group.nights + 1
        elif field == 'total_price':
            new_value = group.pax * group.price_per_pax
        elif field == 'balance':
            new_value = group.total_price - group.deposit
        else:
            continue

        # 값 업데이트
        setattr(group, field, new_value)

        # manual 플래그 리셋 (요청 시)
        if request.reset_manual_flags:
            setattr(group, manual_flag, False)
            recalculated[field] = {
                "old": float(old_value) if hasattr(old_value, '__float__') else old_value,
                "new": float(new_value) if hasattr(new_value, '__float__') else new_value,
                "manual_reset": True
            }
        else:
            recalculated[field] = {
                "old": float(old_value) if hasattr(old_value, '__float__') else old_value,
                "new": float(new_value) if hasattr(new_value, '__float__') else new_value
            }

    # 데이터베이스 저장
    group.updated_at = datetime.now()
    db.commit()
    db.refresh(group)

    # TODO: 감사 로그 기록 (추후 감사 로그 서비스 구현 시)

    # 응답 메시지 생성
    message = f"{len(recalculated)}개 필드 재계산 완료"
    if skipped:
        message += f", {len(skipped)}개 필드 건너뜀 (수동 수정됨)"

    return RecalculateResponse(
        group_id=group_id,
        recalculated_fields=recalculated,
        skipped_fields=skipped,
        message=message
    )


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(
    group_id: UUID,
    db: Session = Depends(get_db)
):
    """
    단체 삭제 (DELETE /api/groups/{group_id})

    단체를 삭제합니다.
    CASCADE 설정으로 관련된 일정, 취소규정, 포함항목, 문서도 함께 삭제됩니다.

    Parameters:
    - **group_id**: 단체 UUID

    Returns:
    - 204 No Content

    Raises:
    - 404: 단체를 찾을 수 없음
    - 403: 확정 상태에서 삭제 시도
    """
    # 단체 조회
    group = db.query(Group).filter(Group.id == group_id).first()

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "NotFoundError",
                "message": f"Group not found: {group_id}",
                "code": "GROUP_NOT_FOUND"
            }
        )

    # 확정 상태 체크
    if group.status == 'confirmed':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "ForbiddenError",
                "message": "확정된 계약은 삭제할 수 없습니다",
                "code": "GROUP_CONFIRMED"
            }
        )

    db.delete(group)
    db.commit()

    return None
