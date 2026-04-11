"""
Documents API Router - 문서 생성 및 다운로드 API
"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import FileResponse, HTMLResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from datetime import date, datetime
from uuid import UUID
from typing import Optional, List

from database import get_db
from models import Group, Document
from schemas import DocumentDetail, DocumentGenerateRequest
from services.template_renderer import render_template
from services.pdf_generator import generate_pdf
from utils.file_manager import save_file, read_file, get_group_document_dir, sanitize_filename

router = APIRouter(prefix="/api/groups/{group_id}/documents", tags=["documents"])


@router.get("/preview/{document_type}", response_class=HTMLResponse)
async def preview_document(
    group_id: UUID,
    document_type: str,
    db: Session = Depends(get_db)
):
    """
    문서 HTML 미리보기 (GET /api/groups/{group_id}/documents/preview/{document_type})

    PDF 생성 없이 HTML로 문서를 미리볼 수 있습니다.

    Parameters:
    - **group_id**: 단체 UUID
    - **document_type**: 문서 유형 (estimate/contract/itinerary/bundle)

    Returns:
    - HTML 문서
    """
    # 유효한 문서 유형 확인
    valid_types = ['estimate', 'contract', 'itinerary', 'bundle']
    if document_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "ValidationError",
                "message": f"Invalid document_type. Must be one of: {valid_types}",
                "field": "document_type"
            }
        )

    # 단체 조회 (eager loading)
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

    # HTML 템플릿 렌더링
    try:
        template_name = f"{document_type}.html"
        context = {
            'group': group,
            'itineraries': sorted(group.itineraries, key=lambda x: x.day_no),
            'cancel_rules': sorted(group.cancel_rules, key=lambda x: x.days_before, reverse=True),
            'includes': group.includes,
            'version': 'Preview',
            'generated_date': date.today()
        }

        html_content = render_template(template_name, context)
        return HTMLResponse(content=html_content)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "TemplateRenderError",
                "message": f"템플릿 렌더링 실패: {str(e)}",
                "code": "TEMPLATE_ERROR"
            }
        )


@router.post("/generate", response_model=DocumentDetail, status_code=status.HTTP_201_CREATED)
async def generate_document(
    group_id: UUID,
    doc_request: DocumentGenerateRequest,
    db: Session = Depends(get_db)
):
    """
    문서 생성 (POST /api/groups/{group_id}/documents/generate)

    HTML 템플릿을 사용하여 PDF 문서를 생성합니다.

    Parameters:
    - **group_id**: 단체 UUID

    Request Body:
    - document_type: 문서 유형 (estimate/contract/itinerary/bundle)
    - version: 버전 번호 (선택, 생략 시 자동 증가)

    Returns:
    - 생성된 문서 정보

    Raises:
    - 404: 단체를 찾을 수 없음
    - 400: 유효하지 않은 문서 유형
    - 500: 문서 생성 실패

    프로세스:
    1. 단체 및 관련 데이터 조회 (eager loading)
    2. 버전 번호 결정 (자동 증가)
    3. 파일명 생성 ([단체명]_[유형]_v[버전]_[날짜].pdf)
    4. HTML 템플릿 렌더링
    5. PDF 변환
    6. 파일 저장
    7. 문서 이력 DB 저장
    """
    # 1. 단체 조회 (eager loading)
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

    # 2. 버전 결정 (동일 유형의 최신 버전 + 1 또는 명시된 버전)
    if doc_request.version:
        version = doc_request.version
    else:
        latest_doc = db.query(func.max(Document.version))\
            .filter(
                Document.group_id == group_id,
                Document.document_type == doc_request.document_type
            )\
            .scalar()
        version = (latest_doc + 1) if latest_doc else 1

    # 3. 파일명 생성
    today = date.today().strftime('%Y%m%d')
    safe_group_name = sanitize_filename(group.name)
    file_name = f"{safe_group_name}_{doc_request.document_type}_v{version}_{today}.pdf"

    # 4. HTML 템플릿 렌더링
    try:
        template_name = f"{doc_request.document_type}.html"
        context = {
            'group': group,
            'itineraries': sorted(group.itineraries, key=lambda x: x.day_no),
            'cancel_rules': sorted(group.cancel_rules, key=lambda x: x.days_before, reverse=True),
            'includes': group.includes,
            'version': version,
            'generated_date': date.today()
        }

        html_content = render_template(template_name, context)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "TemplateRenderError",
                "message": f"템플릿 렌더링 실패: {str(e)}",
                "code": "TEMPLATE_ERROR"
            }
        )

    # 5. PDF 변환
    try:
        pdf_bytes = generate_pdf(html_content)
        file_size = len(pdf_bytes)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "PDFGenerationError",
                "message": f"PDF 생성 실패: {str(e)}",
                "code": "PDF_ERROR"
            }
        )

    # 6. 파일 저장
    try:
        doc_dir = get_group_document_dir(group_id)
        file_path = doc_dir / file_name
        save_file(str(file_path), pdf_bytes)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "FileSaveError",
                "message": f"파일 저장 실패: {str(e)}",
                "code": "FILE_SAVE_ERROR"
            }
        )

    # 7. 문서 이력 저장
    new_document = Document(
        group_id=group_id,
        document_type=doc_request.document_type,
        version=version,
        file_name=file_name,
        file_path=str(file_path),
        file_size=file_size,
        generated_by=None  # TODO: 인증 시스템 구현 후 current_user.id로 변경
    )

    db.add(new_document)
    db.commit()
    db.refresh(new_document)

    return new_document


@router.get("", response_model=List[DocumentDetail])
def get_document_history(
    group_id: UUID,
    document_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    문서 이력 조회 (GET /api/groups/{group_id}/documents)

    특정 단체의 생성된 문서 이력을 조회합니다.

    Parameters:
    - **group_id**: 단체 UUID
    - **document_type**: 문서 유형 필터 (선택)

    Returns:
    - 문서 목록 (최신순)

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

    # 문서 이력 조회
    query = db.query(Document).filter(Document.group_id == group_id)

    if document_type:
        valid_types = ['estimate', 'contract', 'itinerary', 'bundle']
        if document_type not in valid_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "ValidationError",
                    "message": f"Invalid document_type. Must be one of: {valid_types}",
                    "field": "document_type"
                }
            )
        query = query.filter(Document.document_type == document_type)

    documents = query.order_by(Document.generated_at.desc()).all()

    return documents


# 문서 다운로드는 별도 라우터로 분리 (group_id 없이 직접 document_id로 접근)
download_router = APIRouter(prefix="/api/documents", tags=["documents"])


@download_router.get("/{document_id}/download")
async def download_document(
    document_id: UUID,
    db: Session = Depends(get_db)
):
    """
    문서 다운로드 (GET /api/documents/{document_id}/download)

    생성된 PDF 문서를 다운로드합니다.

    Parameters:
    - **document_id**: 문서 UUID

    Returns:
    - PDF 파일 (FileResponse)

    Raises:
    - 404: 문서를 찾을 수 없음
    - 404: 파일을 찾을 수 없음
    """
    # 문서 조회
    document = db.query(Document).filter(Document.id == document_id).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "NotFoundError",
                "message": f"Document not found: {document_id}",
                "code": "DOCUMENT_NOT_FOUND"
            }
        )

    # 파일 존재 확인
    try:
        from pathlib import Path
        file_path = Path(document.file_path)

        if not file_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": "FileNotFoundError",
                    "message": f"File not found: {document.file_name}",
                    "code": "FILE_NOT_FOUND"
                }
            )

        # 파일 다운로드 응답
        return FileResponse(
            path=str(file_path),
            filename=document.file_name,
            media_type='application/pdf'
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "FileDownloadError",
                "message": f"파일 다운로드 실패: {str(e)}",
                "code": "FILE_DOWNLOAD_ERROR"
            }
        )
