"""
Calculation Services - 자동 계산 로직
"""
from datetime import date, timedelta
from typing import Dict, Any, List
from decimal import Decimal
from sqlalchemy.orm import Session

from models import Group, GroupItinerary, GroupCancelRule


# ============================================================
# T-CALC-01: 기간 계산 로직
# ============================================================

def validate_dates(start_date: date, end_date: date) -> None:
    """
    날짜 검증

    Args:
        start_date: 출발일
        end_date: 도착일

    Raises:
        ValueError: 날짜가 유효하지 않은 경우
    """
    if end_date <= start_date:
        raise ValueError(f'도착일({end_date})은 출발일({start_date})보다 이후여야 합니다')

    # 최대 기간 제한 (365일)
    if (end_date - start_date).days > 365:
        raise ValueError('여행 기간은 최대 365일을 초과할 수 없습니다')


def calculate_period(group: Group) -> Dict[str, Any]:
    """
    기간 계산 (박수, 일수)

    Args:
        group: Group 객체

    Returns:
        {
            'nights': int,
            'days': int,
            'nights_changed': bool,
            'days_changed': bool
        }

    Note:
        - nights_manual == TRUE인 경우 nights 재계산 생략
        - days_manual == TRUE인 경우 days 재계산 생략
    """
    result = {
        'nights': group.nights,
        'days': group.days,
        'nights_changed': False,
        'days_changed': False
    }

    # 1. 박수 계산 (manual 플래그 확인)
    if not group.nights_manual:
        calculated_nights = (group.end_date - group.start_date).days

        if calculated_nights != group.nights:
            result['nights'] = calculated_nights
            result['nights_changed'] = True
            group.nights = calculated_nights

    # 2. 일수 계산 (manual 플래그 확인)
    if not group.days_manual:
        calculated_days = group.nights + 1

        if calculated_days != group.days:
            result['days'] = calculated_days
            result['days_changed'] = True
            group.days = calculated_days

    return result


# ============================================================
# T-CALC-02: 금액 계산 로직
# ============================================================

def calculate_total_price(group: Group) -> Dict[str, Any]:
    """
    총액 계산

    Args:
        group: Group 객체

    Returns:
        {
            'total_price': Decimal,
            'total_price_changed': bool
        }

    Note:
        - total_price_manual == TRUE인 경우 재계산 생략
        - 공식: total_price = pax * price_per_pax
    """
    result = {
        'total_price': group.total_price,
        'total_price_changed': False
    }

    # total_price 계산 (manual 플래그 확인)
    if not group.total_price_manual:
        calculated_total = group.pax * group.price_per_pax

        if calculated_total != group.total_price:
            result['total_price'] = calculated_total
            result['total_price_changed'] = True
            group.total_price = calculated_total

    return result


def calculate_balance(group: Group) -> Dict[str, Any]:
    """
    잔액 계산

    Args:
        group: Group 객체

    Returns:
        {
            'balance': Decimal,
            'balance_changed': bool
        }

    Note:
        - balance_manual == TRUE인 경우 재계산 생략
        - 공식: balance = total_price - deposit
    """
    result = {
        'balance': group.balance,
        'balance_changed': False
    }

    # balance 계산 (manual 플래그 확인)
    if not group.balance_manual:
        calculated_balance = group.total_price - group.deposit

        if calculated_balance != group.balance:
            result['balance'] = calculated_balance
            result['balance_changed'] = True
            group.balance = calculated_balance

    return result


# ============================================================
# T-CALC-03: 잔액 완납일 계산 로직
# ============================================================

def calculate_balance_due_date(group: Group, days_before: int = 7) -> Dict[str, Any]:
    """
    잔액 완납일 계산

    Args:
        group: Group 객체
        days_before: 출발 며칠 전 (기본값: 7일)

    Returns:
        {
            'balance_due_date': date,
            'balance_due_date_changed': bool
        }

    Note:
        - balance_due_date_manual == TRUE인 경우 재계산 생략
        - 공식: balance_due_date = start_date - days_before
    """
    result = {
        'balance_due_date': group.balance_due_date,
        'balance_due_date_changed': False
    }

    # balance_due_date 계산 (manual 플래그 확인)
    if not group.balance_due_date_manual:
        calculated_date = group.start_date - timedelta(days=days_before)

        if calculated_date != group.balance_due_date:
            result['balance_due_date'] = calculated_date
            result['balance_due_date_changed'] = True
            group.balance_due_date = calculated_date

    return result


# ============================================================
# T-CALC-04: 취소 규정 날짜 계산 로직
# ============================================================

def calculate_cancel_rule_date(
    start_date: date,
    days_before: int,
    cancel_date_manual: bool = False,
    current_cancel_date: date = None
) -> date:
    """
    취소 규정 날짜 계산

    Args:
        start_date: 출발일
        days_before: 출발 며칠 전
        cancel_date_manual: manual 플래그
        current_cancel_date: 현재 설정된 취소일

    Returns:
        계산된 취소 규정 날짜

    Note:
        - cancel_date_manual == TRUE인 경우 current_cancel_date 반환
        - 공식: cancel_date = start_date - days_before
    """
    if cancel_date_manual and current_cancel_date:
        return current_cancel_date

    return start_date - timedelta(days=days_before)


def recalculate_all_cancel_rules(group: Group, db: Session) -> List[Dict[str, Any]]:
    """
    모든 취소 규정의 날짜를 재계산

    Args:
        group: Group 객체
        db: Database session

    Returns:
        변경된 취소 규정 목록

    Note:
        출발일이 변경되었을 때 호출됩니다.
        cancel_date_manual == FALSE인 규정만 재계산됩니다.
    """
    changed_rules = []

    for rule in group.cancel_rules:
        if not rule.cancel_date_manual:
            old_date = rule.cancel_date
            new_date = group.start_date - timedelta(days=rule.days_before)

            if old_date != new_date:
                rule.cancel_date = new_date
                changed_rules.append({
                    'rule_id': rule.id,
                    'days_before': rule.days_before,
                    'old_date': old_date,
                    'new_date': new_date
                })

    return changed_rules


# ============================================================
# T-CALC-05: 일정 날짜 자동 재배치 로직
# ============================================================

def recalculate_all_itinerary_dates(group: Group, db: Session) -> List[Dict[str, Any]]:
    """
    모든 일정의 날짜를 재계산

    Args:
        group: Group 객체
        db: Database session

    Returns:
        변경된 일정 목록

    Note:
        출발일이 변경되었을 때 호출됩니다.
        itinerary_date_manual == FALSE인 일정만 재계산됩니다.

        중요: manual 플래그와 관계없이 모든 일정을 재계산합니다 (PRD 7.5 참조).
    """
    changed_itineraries = []

    for itinerary in group.itineraries:
        # PRD Section 7.5: 일정 날짜는 manual 플래그와 관계없이 재계산
        old_date = itinerary.itinerary_date
        new_date = group.start_date + timedelta(days=itinerary.day_no - 1)

        if old_date != new_date:
            itinerary.itinerary_date = new_date
            # manual 플래그 리셋
            itinerary.itinerary_date_manual = False

            changed_itineraries.append({
                'itinerary_id': itinerary.id,
                'day_no': itinerary.day_no,
                'old_date': old_date,
                'new_date': new_date
            })

    return changed_itineraries


# ============================================================
# T-CALC-06: 통합 재계산 로직
# ============================================================

def recalculate_all(group: Group, db: Session) -> Dict[str, Any]:
    """
    단체의 모든 자동 계산 필드를 재계산

    Args:
        group: Group 객체
        db: Database session

    Returns:
        {
            'period': {...},
            'total_price': {...},
            'balance': {...},
            'balance_due_date': {...},
            'cancel_rules': [...],
            'itineraries': [...]
        }

    Note:
        단체 정보 수정 후 또는 명시적 재계산 요청 시 호출됩니다.
        manual 플래그가 TRUE인 필드는 재계산하지 않습니다.
    """
    results = {}

    # 1. 기간 계산
    results['period'] = calculate_period(group)

    # 2. 총액 계산
    results['total_price'] = calculate_total_price(group)

    # 3. 잔액 계산
    results['balance'] = calculate_balance(group)

    # 4. 잔액 완납일 계산
    results['balance_due_date'] = calculate_balance_due_date(group)

    # 5. 취소 규정 날짜 재계산
    results['cancel_rules'] = recalculate_all_cancel_rules(group, db)

    # 6. 일정 날짜 재배치
    results['itineraries'] = recalculate_all_itinerary_dates(group, db)

    return results
