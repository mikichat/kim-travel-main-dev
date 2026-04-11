"""
로깅 유틸리티 모듈

이 모듈은 애플리케이션 전반에서 사용할 수 있는 통합 로깅 시스템을 제공합니다.
파일 로깅, 콘솔 로깅, 로그 레벨 관리 등의 기능을 포함합니다.
"""

import logging
import logging.handlers
import os
from datetime import datetime
from pathlib import Path
from typing import Optional


class Logger:
    """
    로깅 클래스
    
    애플리케이션의 로깅을 관리하는 메인 클래스입니다.
    파일과 콘솔에 동시에 로그를 기록할 수 있습니다.
    """
    
    def __init__(
        self,
        name: str = "애플리케이션",
        log_dir: str = "logs",
        log_level: int = logging.INFO,
        max_bytes: int = 10 * 1024 * 1024,  # 10MB
        backup_count: int = 5,
        console_output: bool = True
    ):
        """
        로거 초기화
        
        Args:
            name: 로거 이름
            log_dir: 로그 파일이 저장될 디렉토리 경로
            log_level: 로그 레벨 (DEBUG, INFO, WARNING, ERROR, CRITICAL)
            max_bytes: 로그 파일 최대 크기 (바이트)
            backup_count: 보관할 백업 파일 개수
            console_output: 콘솔에 로그 출력 여부
        """
        self.name = name
        self.log_dir = Path(log_dir)
        self.log_level = log_level
        self.max_bytes = max_bytes
        self.backup_count = backup_count
        self.console_output = console_output
        
        # 로그 디렉토리 생성
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        # 로거 생성
        self.logger = logging.getLogger(name)
        self.logger.setLevel(log_level)
        
        # 기존 핸들러 제거 (중복 방지)
        self.logger.handlers.clear()
        
        # 포매터 설정
        self._setup_formatters()
        
        # 핸들러 설정
        self._setup_handlers()
    
    def _setup_formatters(self):
        """
        로그 포매터 설정
        
        파일과 콘솔에 각각 다른 형식의 포매터를 적용합니다.
        """
        # 파일용 상세 포매터
        self.file_formatter = logging.Formatter(
            fmt='%(asctime)s | %(levelname)-8s | %(name)s | %(funcName)s:%(lineno)d | %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        # 콘솔용 간단한 포매터
        self.console_formatter = logging.Formatter(
            fmt='%(asctime)s | %(levelname)-8s | %(message)s',
            datefmt='%H:%M:%S'
        )
    
    def _setup_handlers(self):
        """
        로그 핸들러 설정
        
        파일 핸들러와 콘솔 핸들러를 설정합니다.
        """
        # 파일 핸들러 (로테이션 지원)
        log_file = self.log_dir / f"{self.name}_{datetime.now().strftime('%Y%m%d')}.log"
        file_handler = logging.handlers.RotatingFileHandler(
            filename=str(log_file),
            maxBytes=self.max_bytes,
            backupCount=self.backup_count,
            encoding='utf-8'
        )
        file_handler.setLevel(self.log_level)
        file_handler.setFormatter(self.file_formatter)
        self.logger.addHandler(file_handler)
        
        # 콘솔 핸들러
        if self.console_output:
            console_handler = logging.StreamHandler()
            console_handler.setLevel(self.log_level)
            console_handler.setFormatter(self.console_formatter)
            self.logger.addHandler(console_handler)
    
    def debug(self, message: str):
        """디버그 레벨 로그 기록"""
        self.logger.debug(message)
    
    def info(self, message: str):
        """정보 레벨 로그 기록"""
        self.logger.info(message)
    
    def warning(self, message: str):
        """경고 레벨 로그 기록"""
        self.logger.warning(message)
    
    def error(self, message: str, exc_info: bool = False):
        """
        오류 레벨 로그 기록
        
        Args:
            message: 오류 메시지
            exc_info: 예외 정보 포함 여부
        """
        self.logger.error(message, exc_info=exc_info)
    
    def critical(self, message: str, exc_info: bool = False):
        """
        치명적 오류 레벨 로그 기록
        
        Args:
            message: 오류 메시지
            exc_info: 예외 정보 포함 여부
        """
        self.logger.critical(message, exc_info=exc_info)
    
    def exception(self, message: str):
        """
        예외 정보와 함께 오류 로그 기록
        
        Args:
            message: 오류 메시지
        """
        self.logger.exception(message)


# 전역 로거 인스턴스
_default_logger: Optional[Logger] = None


def get_logger(
    name: str = "애플리케이션",
    log_dir: str = "logs",
    log_level: int = logging.INFO,
    console_output: bool = True
) -> Logger:
    """
    로거 인스턴스 가져오기 (싱글톤 패턴)
    
    Args:
        name: 로거 이름
        log_dir: 로그 디렉토리 경로
        log_level: 로그 레벨
        console_output: 콘솔 출력 여부
    
    Returns:
        Logger 인스턴스
    """
    global _default_logger
    
    if _default_logger is None:
        _default_logger = Logger(
            name=name,
            log_dir=log_dir,
            log_level=log_level,
            console_output=console_output
        )
    
    return _default_logger


def setup_logging(
    name: str = "애플리케이션",
    log_dir: str = "logs",
    log_level: str = "INFO",
    console_output: bool = True
) -> Logger:
    """
    로깅 시스템 초기화
    
    Args:
        name: 로거 이름
        log_dir: 로그 디렉토리 경로
        log_level: 로그 레벨 문자열 ("DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL")
        console_output: 콘솔 출력 여부
    
    Returns:
        설정된 Logger 인스턴스
    
    Example:
        >>> logger = setup_logging("내앱", "logs", "DEBUG")
        >>> logger.info("애플리케이션이 시작되었습니다.")
    """
    # 로그 레벨 문자열을 정수로 변환
    level_map = {
        "DEBUG": logging.DEBUG,
        "INFO": logging.INFO,
        "WARNING": logging.WARNING,
        "ERROR": logging.ERROR,
        "CRITICAL": logging.CRITICAL
    }
    
    level = level_map.get(log_level.upper(), logging.INFO)
    
    return get_logger(
        name=name,
        log_dir=log_dir,
        log_level=level,
        console_output=console_output
    )


# 사용 예제
if __name__ == "__main__":
    # 로거 초기화
    logger = setup_logging(
        name="테스트앱",
        log_dir="logs",
        log_level="DEBUG",
        console_output=True
    )
    
    # 다양한 레벨의 로그 기록
    logger.debug("디버그 메시지입니다.")
    logger.info("정보 메시지입니다.")
    logger.warning("경고 메시지입니다.")
    logger.error("오류 메시지입니다.")
    
    # 예외 정보와 함께 로그 기록
    try:
        result = 1 / 0
    except ZeroDivisionError:
        logger.exception("0으로 나누기 시도 중 오류 발생")
    
    print("\n로그 파일이 'logs' 디렉토리에 생성되었습니다.")



