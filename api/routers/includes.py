"""
Includes API Router - 포함/불포함 항목 관리 API
"""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import UUID

from database import get_db
from models import Group, GroupInclude
from schemas import (
    IncludeDetail,
    IncludeCreate
)

router = APIRouter(prefix="/api/groups/{group_id}/includes", tags=["includes"])


@router.get("", response_model=list[IncludeDetail])
def get_includes(
    group_id: UUID,
    item_type: str = None,
    db: Session = Depends(get_db)
):
    """
    포함/불포함 항목 목록 조회 (GET /api/groups/{group_id}/includes)

    특정 단체의 포함/불포함 항목을 조회합니다.
    display_order 순서대로 정렬하여 반환합니다.

    Parameters:
    - **group_id**: 단체 UUID
    - **item_type**: 항목 유형 필터 (include/exclude, 선택)

    Returns:
    - 포함/불포함 항목 목록 (display_order 오름차순)

    Raises:
    - 404: 단체를 찾을 수 없음
    """
    # 단체 존재 확인
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

    # 항목 조회
    query = db.query(GroupInclude).filter(GroupInclude.group_id == group_id)

    # item_type 필터 적용
    if item_type:
        if item_type not in ['include', 'exclude']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "ValidationError",
                    "message": "item_type must be 'include' or 'exclude'",
                    "field": "item_type"
                }
            )
        query = query.filter(GroupInclude.item_type == item_type)

    items = query.order_by(
        GroupInclude.item_type.desc(),  # 'include' 먼저 (역순)
        GroupInclude.display_order
    ).all()

    return items


@router.post("", response_model=IncludeDetail, status_code=status.HTTP_201_CREATED)
def create_include(
    group_id: UUID,
    item_data: IncludeCreate,
    db: Session = Depends(get_db)
):
    """
    포함/불포함 항목 추가 (POST /api/groups/{group_id}/includes)

    새로운 포함/불포함 항목을 추가합니다.
    display_order 생략 시 자동으로 마지막 번호 + 1을 부여합니다.

    Parameters:
    - **group_id**: 단체 UUID

    Request Body:
    - item_type: 항목 유형 (include/exclude)
    - category: 카테고리 (선택)
    - description: 항목 설명 (필수)
    - display_order: 표시 순서 (선택, 생략 시 자동 부여)

    Returns:
    - 생성된 포함/불포함 항목 정보

    Raises:
    - 404: 단체를 찾을 수 없음
    - 400: 유효하지 않은 데이터

    자동 계산 로직:
    - display_order가 0이거나 생략 시: 같은 item_type 내에서 max(display_order) + 1
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

    # display_order 결정 (0이거나 생략 시 자동 부여)
    if item_data.display_order == 0:
        max_order = db.query(func.max(GroupInclude.display_order))\
            .filter(
                GroupInclude.group_id == group_id,
                GroupInclude.item_type == item_data.item_type
            )\
            .scalar()
        display_order = (max_order or 0) + 1
    else:
        display_order = item_data.display_order

    # 항목 생성
    new_item = GroupInclude(
        group_id=group_id,
        item_type=item_data.item_type,
        category=item_data.category,
        description=item_data.description,
        display_order=display_order
    )

    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    return new_item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_include(
    group_id: UUID,
    item_id: UUID,
    db: Session = Depends(get_db)
):
    """
    포함/불포함 항목 삭제 (DELETE /api/groups/{group_id}/includes/{item_id})

    포함/불포함 항목을 삭제합니다.

    중요: display_order를 재정렬하지 않습니다.

    Parameters:
    - **group_id**: 단체 UUID
    - **item_id**: 포함/불포함 항목 UUID

    Returns:
    - 204 No Content

    Raises:
    - 404: 항목을 찾을 수 없음
    """
    # 항목 조회
    item = db.query(GroupInclude)\
        .filter(GroupInclude.id == item_id, GroupInclude.group_id == group_id)\
        .first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "NotFoundError",
                "message": f"Include item not found: {item_id}",
                "code": "INCLUDE_ITEM_NOT_FOUND"
            }
        )

    db.delete(item)
    db.commit()

    return None
