"""
Pydantic schemas for request/response validation.

Pydantic models validate incoming request data and serialize response data.
They ensure type safety and provide automatic API documentation.

We separate schemas into:
- Request schemas: what the client sends (e.g., CreateTransaction)
- Response schemas: what the server returns (e.g., TransactionResponse)
- Base schemas: shared fields between request/response
"""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


# ==================== Authentication Schemas ====================

class Token(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    """Request schema for user registration."""
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    full_name: Optional[str] = None


class UserResponse(BaseModel):
    """Response schema for user data (excludes password)."""
    id: int
    email: str
    full_name: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True  # Allows conversion from SQLAlchemy models


# ==================== Account Schemas ====================

class AccountCreate(BaseModel):
    """Request schema for creating an account."""
    name: str = Field(..., min_length=1, max_length=100)
    account_type: str = Field(..., description="checking, savings, credit_card, etc.")


class AccountResponse(BaseModel):
    """Response schema for account data."""
    id: int
    user_id: int
    name: str
    account_type: str
    balance: Decimal
    created_at: datetime
    
    class Config:
        from_attributes = True


# ==================== Category Schemas ====================

class CategoryResponse(BaseModel):
    """Response schema for category data."""
    id: int
    name: str
    color: str
    icon: Optional[str]
    
    class Config:
        from_attributes = True


class CategoryCreate(BaseModel):
    """Request schema for creating a category."""
    name: str = Field(..., min_length=1, max_length=100)
    color: str = Field(default="#6B7280", pattern="^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = None


# ==================== Transaction Schemas ====================

class TransactionCreate(BaseModel):
    """Request schema for creating a single transaction."""
    account_id: int
    date: datetime
    description: str = Field(..., min_length=1, max_length=500)
    amount: Decimal
    transaction_type: str = Field(..., description="debit, credit, or transfer")
    category_id: Optional[int] = None


class TransactionResponse(BaseModel):
    """Response schema for transaction data."""
    id: int
    user_id: int
    account_id: int
    category_id: Optional[int]
    date: datetime
    description: str
    amount: Decimal
    transaction_type: str
    is_categorized: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    # Nested relationships (optional, loaded when needed)
    account: Optional[AccountResponse] = None
    category: Optional[CategoryResponse] = None
    
    class Config:
        from_attributes = True


class TransactionFilter(BaseModel):
    """Query parameters for filtering transactions."""
    account_id: Optional[int] = None
    category_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    min_amount: Optional[Decimal] = None
    max_amount: Optional[Decimal] = None
    transaction_type: Optional[str] = None
    is_categorized: Optional[bool] = None
    limit: int = Field(default=100, ge=1, le=1000)
    offset: int = Field(default=0, ge=0)


class TransactionUploadResponse(BaseModel):
    """Response after CSV upload."""
    transactions_created: int
    transactions_updated: int
    errors: List[str] = []


# ==================== Budget Schemas ====================

class BudgetCreate(BaseModel):
    """Request schema for creating a budget."""
    category_id: int
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2000, le=2100)
    limit: Decimal = Field(..., gt=0)


class BudgetResponse(BaseModel):
    """Response schema for budget data."""
    id: int
    user_id: int
    category_id: int
    month: int
    year: int
    limit: Decimal
    spent: Decimal
    created_at: datetime
    
    # Nested relationships
    category: Optional[CategoryResponse] = None
    
    class Config:
        from_attributes = True


# ==================== Rule Schemas ====================

class RuleCreate(BaseModel):
    """Request schema for creating a categorization rule."""
    category_id: int
    pattern: str = Field(..., min_length=1, max_length=200)
    pattern_type: str = Field(default="contains", description="contains, starts_with, exact, regex")
    priority: int = Field(default=0, ge=0)


class RuleResponse(BaseModel):
    """Response schema for rule data."""
    id: int
    user_id: int
    category_id: int
    pattern: str
    pattern_type: str
    priority: int
    is_active: bool
    created_at: datetime
    
    category: Optional[CategoryResponse] = None
    
    class Config:
        from_attributes = True


# ==================== Insights Schemas ====================

class MonthlyInsightsResponse(BaseModel):
    """Response schema for monthly insights."""
    month: int
    year: int
    total_income: Decimal
    total_expenses: Decimal
    net_income: Decimal
    category_breakdown: List[dict]  # [{category_name, amount, percentage}]
    top_expenses: List[dict]  # [{description, amount, date}]
    budget_status: List[dict]  # [{category_name, limit, spent, remaining}]
    ai_summary: Optional[str] = None  # AI-generated summary


# ==================== Query Schemas ====================

class NaturalLanguageQuery(BaseModel):
    """Request schema for natural language queries."""
    query: str = Field(..., min_length=1, max_length=500, description="Natural language question about finances")


class QueryResponse(BaseModel):
    """Response schema for natural language query results."""
    answer: str
    sql_query: Optional[str] = None  # The SQL query that was executed (for debugging)
    data: Optional[List[dict]] = None  # Raw data if applicable

