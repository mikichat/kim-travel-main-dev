"""
File Management Utilities - 파일 저장 및 관리
"""
import os
import logging
from pathlib import Path
from typing import Optional
from uuid import UUID

logger = logging.getLogger(__name__)

# 문서 저장 기본 디렉토리
DOCUMENTS_DIR = Path("documents")


def ensure_directory(directory: Path) -> None:
    """
    디렉토리가 없으면 생성

    Args:
        directory: 디렉토리 경로
    """
    directory.mkdir(parents=True, exist_ok=True)
    logger.debug(f"Directory ensured: {directory}")


def get_group_document_dir(group_id: UUID) -> Path:
    """
    단체별 문서 디렉토리 경로 반환

    Args:
        group_id: 단체 UUID

    Returns:
        단체 문서 디렉토리 경로
    """
    return DOCUMENTS_DIR / str(group_id)


def save_file(file_path: str, content: bytes) -> str:
    """
    파일 저장

    Args:
        file_path: 저장할 파일 경로 (상대 경로)
        content: 파일 내용 (바이트)

    Returns:
        저장된 파일의 절대 경로

    Raises:
        Exception: 파일 저장 실패 시
    """
    try:
        # 절대 경로로 변환
        abs_path = Path(file_path)

        # 디렉토리 생성
        ensure_directory(abs_path.parent)

        # 파일 저장
        with open(abs_path, 'wb') as f:
            f.write(content)

        logger.info(f"File saved: {abs_path}, size: {len(content)} bytes")
        return str(abs_path)

    except Exception as e:
        logger.error(f"File save failed for {file_path}: {str(e)}")
        raise Exception(f"파일 저장 중 오류가 발생했습니다: {str(e)}")


def read_file(file_path: str) -> bytes:
    """
    파일 읽기

    Args:
        file_path: 파일 경로

    Returns:
        파일 내용 (바이트)

    Raises:
        FileNotFoundError: 파일을 찾을 수 없음
        Exception: 파일 읽기 실패
    """
    try:
        abs_path = Path(file_path)

        if not abs_path.exists():
            raise FileNotFoundError(f"파일을 찾을 수 없습니다: {file_path}")

        with open(abs_path, 'rb') as f:
            content = f.read()

        logger.info(f"File read: {abs_path}, size: {len(content)} bytes")
        return content

    except FileNotFoundError:
        raise
    except Exception as e:
        logger.error(f"File read failed for {file_path}: {str(e)}")
        raise Exception(f"파일 읽기 중 오류가 발생했습니다: {str(e)}")


def delete_file(file_path: str) -> None:
    """
    파일 삭제

    Args:
        file_path: 파일 경로

    Raises:
        FileNotFoundError: 파일을 찾을 수 없음
        Exception: 파일 삭제 실패
    """
    try:
        abs_path = Path(file_path)

        if not abs_path.exists():
            raise FileNotFoundError(f"파일을 찾을 수 없습니다: {file_path}")

        abs_path.unlink()
        logger.info(f"File deleted: {abs_path}")

    except FileNotFoundError:
        raise
    except Exception as e:
        logger.error(f"File delete failed for {file_path}: {str(e)}")
        raise Exception(f"파일 삭제 중 오류가 발생했습니다: {str(e)}")


def get_file_size(file_path: str) -> int:
    """
    파일 크기 반환

    Args:
        file_path: 파일 경로

    Returns:
        파일 크기 (바이트)

    Raises:
        FileNotFoundError: 파일을 찾을 수 없음
    """
    abs_path = Path(file_path)

    if not abs_path.exists():
        raise FileNotFoundError(f"파일을 찾을 수 없습니다: {file_path}")

    return abs_path.stat().st_size


def sanitize_filename(filename: str) -> str:
    """
    파일명 정리 (안전한 파일명 생성)

    Args:
        filename: 원본 파일명

    Returns:
        정리된 파일명
    """
    # 위험한 문자 제거 또는 대체
    dangerous_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']
    safe_filename = filename

    for char in dangerous_chars:
        safe_filename = safe_filename.replace(char, '_')

    # 공백을 언더스코어로 대체
    safe_filename = safe_filename.replace(' ', '_')

    return safe_filename
