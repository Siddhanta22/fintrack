"""
SQLAlchemy ORM models for FinanceTrack.

These models represent our database tables. SQLAlchemy automatically converts
Python classes to SQL tables and Python objects to database rows.

Design decisions:
- Use Decimal for money (avoids floating-point precision issues)
- Index frequently queried fields (user_id, date) for performance
- Use relationships for foreign keys (SQLAlchemy handles joins automatically)
- Timestamps track when records are created/updated
"""

from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Boolean, Text, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from decimal import Decimal
from datetime import datetime

from app.database import Base


class User(Base):
    """
    User model: stores authentication and profile information.
    
    Fields:
    - id: Primary key (auto-incrementing integer)
    - email: Unique email address (used for login)
    - hashed_password: Bcrypt-hashed password (never store plain text!)
    - full_name: User's display name
    - created_at: Timestamp when account was created
    - is_active: Soft delete flag (can disable accounts without deleting)
    
    Relationships:
    - accounts: All bank accounts belonging to this user
    - transactions: All transactions across all accounts
    - budgets: All budgets set by this user
    - rules: All categorization rules created by this user
    """
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)
    
    # Relationships: SQLAlchemy automatically creates these
    # lazy="dynamic" means we get a query object, not a list (better for large datasets)
    accounts = relationship("Account", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="user", cascade="all, delete-orphan")
    rules = relationship("Rule", back_populates="user", cascade="all, delete-orphan")


class Account(Base):
    """
    Account model: represents a bank account.
    
    Users can have multiple accounts (checking, savings, credit cards, etc.)
    Each transaction belongs to one account.
    
    Fields:
    - id: Primary key
    - user_id: Foreign key to users table
    - name: Account nickname (e.g., "Chase Checking")
    - account_type: Type of account (checking, savings, credit_card, etc.)
    - balance: Current account balance (updated when transactions are added)
    - created_at: When account was added
    """
    __tablename__ = "accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    account_type = Column(String, nullable=False)  # checking, savings, credit_card, etc.
    balance = Column(Numeric(10, 2), default=Decimal("0.00"))  # 10 digits total, 2 decimal places
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")


class Category(Base):
    """
    Category model: spending categories.
    
    Categories are shared across all users (Food, Transport, Entertainment, etc.)
    We could make them user-specific, but shared categories make reporting easier.
    
    Fields:
    - id: Primary key
    - name: Category name (e.g., "Food & Dining")
    - color: Hex color code for UI display (e.g., "#FF5733")
    - icon: Icon name for UI (e.g., "restaurant")
    """
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    color = Column(String, default="#6B7280")  # Default gray
    icon = Column(String, nullable=True)
    
    # Relationships
    transactions = relationship("Transaction", back_populates="category")
    budgets = relationship("Budget", back_populates="category")


class Transaction(Base):
    """
    Transaction model: the core entity storing individual transactions.
    
    This is the most important table - it stores all financial transactions.
    We index user_id, date, and category_id for fast queries.
    
    Fields:
    - id: Primary key
    - user_id: Foreign key to users (who owns this transaction)
    - account_id: Foreign key to accounts (which account this belongs to)
    - category_id: Foreign key to categories (can be null if uncategorized)
    - date: Transaction date (when the transaction occurred)
    - description: Transaction description from bank statement
    - amount: Transaction amount (negative for expenses, positive for income)
    - transaction_type: Type (debit, credit, transfer)
    - is_categorized: Boolean flag (true if category_id is set)
    - created_at: When transaction was imported
    - updated_at: When transaction was last modified (e.g., categorized)
    
    Indexes:
    - Composite index on (user_id, date) for fast date range queries
    - Index on category_id for filtering by category
    """
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True, index=True)
    
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    description = Column(String, nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)  # Negative = expense, Positive = income
    transaction_type = Column(String, nullable=False)  # debit, credit, transfer
    
    is_categorized = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="transactions")
    account = relationship("Account", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
    
    # Composite index: speeds up queries like "get all transactions for user X in date range Y"
    __table_args__ = (
        Index("idx_user_date", "user_id", "date"),
    )


class Budget(Base):
    """
    Budget model: monthly spending limits per category.
    
    Users set budgets like "Spend max $500 on Food in September"
    We track both the limit and current spending.
    
    Fields:
    - id: Primary key
    - user_id: Foreign key to users
    - category_id: Foreign key to categories (which category this budget is for)
    - month: Month (1-12)
    - year: Year (e.g., 2024)
    - limit: Budget limit (maximum amount to spend)
    - spent: Current amount spent (calculated from transactions)
    - created_at: When budget was created
    
    Unique constraint: one budget per user/category/month/year combination
    """
    __tablename__ = "budgets"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    month = Column(Integer, nullable=False)  # 1-12
    year = Column(Integer, nullable=False)
    limit = Column(Numeric(10, 2), nullable=False)
    spent = Column(Numeric(10, 2), default=Decimal("0.00"))  # Calculated from transactions
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="budgets")
    category = relationship("Category", back_populates="budgets")
    
    # Unique constraint: prevents duplicate budgets
    __table_args__ = (
        Index("idx_user_category_month_year", "user_id", "category_id", "month", "year", unique=True),
    )


class Rule(Base):
    """
    Rule model: auto-categorization rules.
    
    Rules automatically categorize transactions based on description patterns.
    Example: "If description contains 'STARBUCKS', assign to 'Food' category"
    
    Rules are evaluated in order (priority field), so more specific rules run first.
    
    Fields:
    - id: Primary key
    - user_id: Foreign key to users (rules are user-specific)
    - category_id: Foreign key to categories (which category to assign)
    - pattern: Pattern to match in transaction description (case-insensitive)
    - pattern_type: Type of pattern (contains, starts_with, exact, regex)
    - priority: Rule priority (higher = evaluated first)
    - is_active: Whether rule is currently active
    - created_at: When rule was created
    """
    __tablename__ = "rules"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    pattern = Column(String, nullable=False)  # Pattern to match
    pattern_type = Column(String, nullable=False, default="contains")  # contains, starts_with, exact, regex
    priority = Column(Integer, default=0)  # Higher priority = evaluated first
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="rules")
    category = relationship("Category")

