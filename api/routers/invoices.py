"""
인보이스 관련 API 라우터
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from database import get_db
from models import Invoice, FlightSchedule, BankAccount
from schemas import InvoiceCreate, InvoiceUpdate, InvoiceResponse

router = APIRouter(prefix="/invoices", tags=["invoices"])


def calculate_invoice_totals(invoice_data: dict) -> dict:
    """인보이스 총액 계산"""
    airfare_total = (invoice_data.get('airfare_unit_price', 0) or 0) * (invoice_data.get('airfare_quantity', 0) or 0)
    seat_total = (invoice_data.get('seat_preference_unit_price', 0) or 0) * (invoice_data.get('seat_preference_quantity', 0) or 0)
    total_amount = airfare_total + seat_total
    
    return {
        'airfare_total': airfare_total,
        'seat_preference_total': seat_total,
        'total_amount': total_amount
    }


@router.get("", response_model=List[InvoiceResponse])
def get_invoices(
    invoice_date_from: Optional[date] = None,
    invoice_date_to: Optional[date] = None,
    recipient: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """인보이스 목록 조회"""
    query = db.query(Invoice)
    
    if invoice_date_from:
        query = query.filter(Invoice.invoice_date >= invoice_date_from)
    if invoice_date_to:
        query = query.filter(Invoice.invoice_date <= invoice_date_to)
    if recipient:
        query = query.filter(Invoice.recipient.contains(recipient))
    
    total = query.count()
    invoices = query.order_by(Invoice.invoice_date.desc(), Invoice.created_at.desc())\
        .offset((page - 1) * limit)\
        .limit(limit)\
        .all()
    
    return invoices


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(invoice_id: str, db: Session = Depends(get_db)):
    """인보이스 상세 조회"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="인보이스를 찾을 수 없습니다.")
    return invoice


@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_invoice(invoice_data: InvoiceCreate, db: Session = Depends(get_db)):
    """인보이스 생성"""
    # 자동 계산
    totals = calculate_invoice_totals(invoice_data.dict())
    
    invoice = Invoice(
        **invoice_data.dict(),
        **totals
    )
    
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    
    return invoice


@router.put("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(invoice_id: str, invoice_data: InvoiceUpdate, db: Session = Depends(get_db)):
    """인보이스 수정"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="인보이스를 찾을 수 없습니다.")
    
    # 자동 계산
    update_dict = invoice_data.dict(exclude_unset=True)
    if any(key in update_dict for key in ['airfare_unit_price', 'airfare_quantity', 
                                          'seat_preference_unit_price', 'seat_preference_quantity']):
        current_data = invoice.__dict__.copy()
        current_data.update(update_dict)
        totals = calculate_invoice_totals(current_data)
        update_dict.update(totals)
    
    for key, value in update_dict.items():
        setattr(invoice, key, value)
    
    db.commit()
    db.refresh(invoice)
    
    return invoice


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invoice(invoice_id: str, db: Session = Depends(get_db)):
    """인보이스 삭제"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="인보이스를 찾을 수 없습니다.")
    
    db.delete(invoice)
    db.commit()
    
    return None
