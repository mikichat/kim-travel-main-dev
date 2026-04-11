"""
Itineraries API Router - 일정 관리 API
"""
from fastapi import APIRouter, HTTPException, Depends, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import timedelta
from uuid import UUID

from database import get_db
from models import Group, GroupItinerary
from schemas import ItineraryDetail, ItineraryUpdate

router = APIRouter(prefix="/api/groups/{group_id}/itineraries", tags=["itineraries"])


@router.get("", response_model=list[ItineraryDetail])
def get_itineraries(
    group_id: UUID,
    db: Session = Depends(get_db)
):
    """일정 목록 조회"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    itineraries = db.query(GroupItinerary)\
        .filter(GroupItinerary.group_id == group_id)\
        .order_by(GroupItinerary.day_no)\
        .all()

    return itineraries


@router.api_route("", methods=["POST"], status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_itinerary(
    group_id: UUID,
    request: Request,
    db: Session = Depends(get_db)
):
    """일정 추가 - day_no 자동 부여"""
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
    day_no = data.get('day_no')
    location = data.get('location')
    transport = data.get('transport')
    time = data.get('time')
    schedule = data.get('schedule')
    meals = data.get('meals')
    accommodation = data.get('accommodation')

    # Auto-assign day_no if not provided
    if day_no is None:
        max_day = db.query(func.max(GroupItinerary.day_no))\
            .filter(GroupItinerary.group_id == group_id)\
            .scalar()
        day_no = (max_day or 0) + 1
    else:
        # Check for duplicates
        existing = db.query(GroupItinerary)\
            .filter(GroupItinerary.group_id == group_id, GroupItinerary.day_no == day_no)\
            .first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Day {day_no} already exists")

    # Calculate itinerary_date
    itinerary_date = group.start_date + timedelta(days=day_no - 1)

    # Create itinerary
    new_itinerary = GroupItinerary(
        group_id=group_id,
        day_no=day_no,
        itinerary_date=itinerary_date,
        itinerary_date_manual=False,
        location=location,
        transport=transport,
        time=time,
        schedule=schedule,
        meals=meals,
        accommodation=accommodation
    )

    db.add(new_itinerary)
    db.commit()
    db.refresh(new_itinerary)

    return new_itinerary


@router.put("/{itinerary_id}", response_model=ItineraryDetail)
def update_itinerary(
    group_id: UUID,
    itinerary_id: UUID,
    update_data: ItineraryUpdate,
    db: Session = Depends(get_db)
):
    """일정 수정"""
    itinerary = db.query(GroupItinerary)\
        .filter(GroupItinerary.id == itinerary_id, GroupItinerary.group_id == group_id)\
        .first()

    if not itinerary:
        raise HTTPException(status_code=404, detail="Itinerary not found")

    update_dict = update_data.model_dump(exclude_unset=True)

    # Check for day_no duplicates
    if 'day_no' in update_dict and update_dict['day_no'] != itinerary.day_no:
        existing = db.query(GroupItinerary)\
            .filter(
                GroupItinerary.group_id == group_id,
                GroupItinerary.day_no == update_dict['day_no'],
                GroupItinerary.id != itinerary_id
            )\
            .first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Day {update_dict['day_no']} already exists")

    # Set manual flag if date is directly modified
    if 'itinerary_date' in update_dict:
        itinerary.itinerary_date_manual = True

    # Apply updates
    for field, value in update_dict.items():
        setattr(itinerary, field, value)

    # Recalculate date if day_no changed and not manual
    if 'day_no' in update_dict and not itinerary.itinerary_date_manual:
        group = db.query(Group).filter(Group.id == group_id).first()
        itinerary.itinerary_date = group.start_date + timedelta(days=itinerary.day_no - 1)

    db.commit()
    db.refresh(itinerary)

    return itinerary


@router.delete("/{itinerary_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_itinerary(
    group_id: UUID,
    itinerary_id: UUID,
    db: Session = Depends(get_db)
):
    """일정 삭제"""
    itinerary = db.query(GroupItinerary)\
        .filter(GroupItinerary.id == itinerary_id, GroupItinerary.group_id == group_id)\
        .first()

    if not itinerary:
        raise HTTPException(status_code=404, detail="Itinerary not found")

    db.delete(itinerary)
    db.commit()

    return None
