"""
Main FastAPI application entry point.

This module sets up the FastAPI app with all routes, middleware, and configuration.
We use dependency injection for database sessions and authentication.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from app.database import engine, Base
from app.routers import transactions, insights, query, auth
from app.config import settings


# Lifespan context manager: runs on startup and shutdown
# This ensures our database tables are created when the app starts
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create database tables
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown: cleanup if needed (currently none)


# Initialize FastAPI app with metadata
app = FastAPI(
    title="FinanceTrack API",
    description="AI-powered personal finance dashboard backend",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware: allows Next.js frontend to communicate with this backend
# In development, allow all localhost origins for flexibility
# In production, you'd restrict origins to your specific domain
import os
is_dev = os.getenv("ENVIRONMENT", "development") == "development"

# Allow all localhost ports in development, specific origins in production
if is_dev:
    # In development, allow any localhost origin
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:3004",
        "http://localhost:3005",
        "http://localhost:3006",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:3003",
        "http://127.0.0.1:3004",
        "http://127.0.0.1:3005",
        "http://127.0.0.1:3006",
    ]
else:
    # In production, use specific allowed origins from environment
    allowed_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers: each router handles a group of related endpoints
# This keeps our code modular and organized
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["transactions"])
app.include_router(insights.router, prefix="/api/insights", tags=["insights"])
app.include_router(query.router, prefix="/api/query", tags=["query"])


# Root endpoint: health check
@app.get("/")
async def root():
    return {"message": "FinanceTrack API", "status": "healthy"}


# Global exception handler: catches unhandled errors and returns JSON
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )

