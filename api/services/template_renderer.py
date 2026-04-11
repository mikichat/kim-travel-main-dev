"""
Template Rendering Service - Jinja2 template rendering
"""
import logging
from typing import Dict, Any
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, Template

logger = logging.getLogger(__name__)

# 템플릿 디렉토리 경로 설정
TEMPLATE_DIR = Path(__file__).parent.parent / "templates"


def get_jinja_env() -> Environment:
    """
    Jinja2 Environment 생성

    Returns:
        Jinja2 Environment 객체
    """
    # 템플릿 디렉토리가 없으면 생성
    TEMPLATE_DIR.mkdir(exist_ok=True)

    env = Environment(
        loader=FileSystemLoader(str(TEMPLATE_DIR)),
        autoescape=True,  # XSS 방지
        trim_blocks=True,
        lstrip_blocks=True
    )

    # 커스텀 필터 추가
    env.filters['format_currency'] = format_currency
    env.filters['format_date'] = format_date

    return env


def format_currency(value) -> str:
    """
    통화 포맷팅 필터

    Args:
        value: 숫자 값

    Returns:
        포맷된 통화 문자열 (예: "1,234,567원")
    """
    try:
        return f"{int(value):,}원"
    except (ValueError, TypeError):
        return str(value)


def format_date(value, format_string: str = "%Y년 %m월 %d일") -> str:
    """
    날짜 포맷팅 필터

    Args:
        value: date 객체
        format_string: 포맷 문자열

    Returns:
        포맷된 날짜 문자열
    """
    try:
        return value.strftime(format_string)
    except AttributeError:
        return str(value)


def render_template(template_name: str, context: Dict[str, Any]) -> str:
    """
    템플릿 렌더링

    Args:
        template_name: 템플릿 파일명 (예: "estimate.html")
        context: 템플릿 컨텍스트 데이터

    Returns:
        렌더링된 HTML 문자열

    Raises:
        Exception: 템플릿 렌더링 실패 시
    """
    try:
        env = get_jinja_env()
        template = env.get_template(template_name)
        html_content = template.render(**context)

        logger.info(f"Template rendered successfully: {template_name}")
        return html_content

    except Exception as e:
        logger.error(f"Template rendering failed for {template_name}: {str(e)}")
        raise Exception(f"템플릿 렌더링 중 오류가 발생했습니다: {str(e)}")


def render_string_template(template_string: str, context: Dict[str, Any]) -> str:
    """
    문자열 템플릿 렌더링

    Args:
        template_string: 템플릿 문자열
        context: 템플릿 컨텍스트 데이터

    Returns:
        렌더링된 문자열
    """
    try:
        env = get_jinja_env()
        template = Template(template_string)
        result = template.render(**context)

        logger.info("String template rendered successfully")
        return result

    except Exception as e:
        logger.error(f"String template rendering failed: {str(e)}")
        raise Exception(f"템플릿 렌더링 중 오류가 발생했습니다: {str(e)}")
