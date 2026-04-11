"""
Database connection and session management
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

# PostgreSQL 연결 URL
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost:5432/travel_agency"
)

# SQLAlchemy 엔진 생성
# SQLite와 PostgreSQL 모두 지원
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}  # SQLite에서 필요
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,  # 연결 유효성 체크
        pool_size=10,  # 커넥션 풀 크기
        max_overflow=20  # 최대 오버플로우 연결 수
    )

# 세션 팩토리
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base 클래스 (모든 모델의 부모 클래스)
Base = declarative_base()


def get_db():
    """
    데이터베이스 세션 의존성
    FastAPI Depends에서 사용
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
