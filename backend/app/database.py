"""
Database connection and session management.

This module sets up SQLAlchemy for PostgreSQL:
- Engine: manages connection pooling
- SessionLocal: creates database sessions for each request
- Base: base class for all ORM models

We use dependency injection to provide database sessions to route handlers.
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.config import settings

# Create database engine
# pool_pre_ping=True: verifies connections before using them (handles stale connections)
# echo=True: logs all SQL queries (useful for debugging, disable in production)
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=False  # Set to True for SQL query logging
)

# SessionLocal: factory for creating database sessions
# autocommit=False: changes require explicit commit
# autoflush=False: changes aren't automatically flushed to DB
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base: all our ORM models will inherit from this
Base = declarative_base()


# Dependency function: creates a database session for each request
# FastAPI will call this automatically when injected into route handlers
def get_db():
    """
    Dependency that provides a database session.
    
    Usage in routes:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    
    The session is automatically closed after the request completes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

