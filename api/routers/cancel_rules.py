"""
Cancel Rules API Router - 취소 규정 관리 API
"""
from fastapi import APIRouter, HTTPException, Depends, status, Request
from sqlalchemy.orm import Session
from datetime import timedelta
from uuid import UUID
from decimal import Decimal

from database import get_db
from models import Group, GroupCancelRule
from schemas import CancelRuleDetail

router = APIRouter(prefix="/api/groups/{group_id}/cancel-rules", tags=["cancel-rules"])


@router.get("", response_model=list[CancelRuleDetail])
def get_cancel_rules(
    group_id: UUID,
    db: Session = Depends(get_db)
):
    """취소 규정 목록 조회"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    rules = db.query(GroupCancelRule)\
        .filter(GroupCancelRule.group_id == group_id)\
        .order_by(GroupCancelRule.days_before.desc())\
        .all()

    return rules


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_cancel_rule(
    group_id: UUID,
    request: Request,
    db: Session = Depends(get_db)
):
    """취소 규정 추가 - cancel_date 자동 계산"""
    # Parse request body
    try:
        data = await request.json()
    except:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    # Get group
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Extract fields
    days_before = data.get('days_before')
    penalty_rate = data.get('penalty_rate')
    penalty_amount = data.get('penalty_amount')
    description = data.get('description')

    # Validate required fields
    if days_before is None or penalty_rate is None:
        raise HTTPException(status_code=400, detail="days_before and penalty_rate are required")

    try:
        # Calculate cancel_date
        cancel_date = group.start_date - timedelta(days=days_before)

        # Create cancel rule
        new_rule = GroupCancelRule(
            group_id=group_id,
            days_before=days_before,
            cancel_date=cancel_date,
            cancel_date_manual=False,
            penalty_rate=Decimal(str(penalty_rate)),
            penalty_amount=Decimal(str(penalty_amount)) if penalty_amount else None,
            description=description
        )

        db.add(new_rule)
        db.commit()
        db.refresh(new_rule)

        return new_rule
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create cancel rule: {str(e)}")


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cancel_rule(
    group_id: UUID,
    rule_id: UUID,
    db: Session = Depends(get_db)
):
    """취소 규정 삭제"""
    rule = db.query(GroupCancelRule)\
        .filter(GroupCancelRule.id == rule_id, GroupCancelRule.group_id == group_id)\
        .first()

    if not rule:
        raise HTTPException(status_code=404, detail="Cancel rule not found")

    db.delete(rule)
    db.commit()

    return None
