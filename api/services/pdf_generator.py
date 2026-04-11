"""
PDF Generation Service - HTML to PDF conversion
"""
import io
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Try to import WeasyPrint (optional dependency)
try:
    from weasyprint import HTML, CSS
    from weasyprint.text.fonts import FontConfiguration
    WEASYPRINT_AVAILABLE = True
except Exception as e:
    logger.warning(f"WeasyPrint not available: {e}. PDF generation will be disabled.")
    WEASYPRINT_AVAILABLE = False
    HTML = None
    CSS = None
    FontConfiguration = None


def generate_pdf(html_content: str, css_content: Optional[str] = None) -> bytes:
    """
    HTML을 PDF로 변환

    Args:
        html_content: HTML 문자열
        css_content: 추가 CSS 문자열 (선택)

    Returns:
        PDF 바이트 데이터

    Raises:
        Exception: PDF 생성 실패 시
    """
    if not WEASYPRINT_AVAILABLE:
        raise RuntimeError(
            "PDF generation is not available. "
            "WeasyPrint is not installed or GTK+ libraries are missing. "
            "On Windows, install GTK+ from https://weasyprint.readthedocs.io/en/stable/install.html"
        )

    try:
        # Font configuration for better rendering
        font_config = FontConfiguration()

        # HTML to PDF conversion
        html = HTML(string=html_content)

        # Apply custom CSS if provided
        if css_content:
            css = CSS(string=css_content, font_config=font_config)
            pdf_bytes = html.write_pdf(stylesheets=[css], font_config=font_config)
        else:
            pdf_bytes = html.write_pdf(font_config=font_config)

        logger.info(f"PDF generated successfully, size: {len(pdf_bytes)} bytes")
        return pdf_bytes

    except Exception as e:
        logger.error(f"PDF generation failed: {str(e)}")
        raise Exception(f"PDF 생성 중 오류가 발생했습니다: {str(e)}")


def generate_pdf_from_file(html_file_path: str, css_file_path: Optional[str] = None) -> bytes:
    """
    HTML 파일을 PDF로 변환

    Args:
        html_file_path: HTML 파일 경로
        css_file_path: CSS 파일 경로 (선택)

    Returns:
        PDF 바이트 데이터
    """
    try:
        font_config = FontConfiguration()
        html = HTML(filename=html_file_path)

        if css_file_path:
            css = CSS(filename=css_file_path, font_config=font_config)
            pdf_bytes = html.write_pdf(stylesheets=[css], font_config=font_config)
        else:
            pdf_bytes = html.write_pdf(font_config=font_config)

        logger.info(f"PDF generated from file: {html_file_path}, size: {len(pdf_bytes)} bytes")
        return pdf_bytes

    except Exception as e:
        logger.error(f"PDF generation from file failed: {str(e)}")
        raise Exception(f"PDF 생성 중 오류가 발생했습니다: {str(e)}")
