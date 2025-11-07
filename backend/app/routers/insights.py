"""
Insights router: generates financial insights and summaries.

Endpoints:
- GET /api/insights/monthly: Get monthly financial insights (KPIs, breakdowns, AI summary)

Monthly insights include:
- Total income and expenses
- Net income
- Category breakdown (pie chart data)
- Top expenses
- Budget status (spent vs. limit)
- AI-generated summary
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List
from decimal import Decimal

from app.database import get_db
from app.models import Transaction, Budget, Category, User
from app.schemas import MonthlyInsightsResponse
from app.auth import get_default_user as get_current_user
from app.services.ai_service import generate_monthly_summary

router = APIRouter()


@router.get("/monthly", response_model=MonthlyInsightsResponse)
def get_monthly_insights(
    month: int = Query(..., ge=1, le=12, description="Month (1-12)"),
    year: int = Query(..., ge=2000, le=2100, description="Year"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive monthly financial insights.
    
    This endpoint:
    1. Calculates total income and expenses
    2. Breaks down spending by category
    3. Lists top expenses
    4. Checks budget status
    5. Generates AI summary (if OpenAI key is configured)
    
    Example request:
        GET /api/insights/monthly?month=9&year=2024
    
    Example response:
        {
            "month": 9,
            "year": 2024,
            "total_income": 5000.00,
            "total_expenses": 3200.00,
            "net_income": 1800.00,
            "category_breakdown": [
                {"category_name": "Food & Dining", "amount": 800.00, "percentage": 25.0},
                {"category_name": "Transport", "amount": 400.00, "percentage": 12.5},
                ...
            ],
            "top_expenses": [
                {"description": "RENT PAYMENT", "amount": 1500.00, "date": "2024-09-01"},
                ...
            ],
            "budget_status": [
                {"category_name": "Food & Dining", "limit": 500.00, "spent": 800.00, "remaining": -300.00},
                ...
            ],
            "ai_summary": "In September 2024, you earned $5,000 and spent $3,200..."
        }
    """
    # Query transactions for the month
    transactions = db.query(Transaction).filter(
        and_(
            Transaction.user_id == current_user.id,
            func.extract('month', Transaction.date) == month,
            func.extract('year', Transaction.date) == year
        )
    ).all()
    
    if not transactions:
        raise HTTPException(
            status_code=404,
            detail=f"No transactions found for {month}/{year}"
        )
    
    # Calculate totals
    total_income = sum(t.amount for t in transactions if t.amount > 0)
    total_expenses = abs(sum(t.amount for t in transactions if t.amount < 0))
    net_income = total_income - total_expenses
    
    # Category breakdown
    category_totals = {}
    for t in transactions:
        if t.category and t.amount < 0:  # Only expenses
            cat_name = t.category.name
            amount = abs(t.amount)
            category_totals[cat_name] = category_totals.get(cat_name, Decimal("0")) + amount
    
    # Calculate percentages
    category_breakdown = []
    for cat_name, amount in sorted(category_totals.items(), key=lambda x: x[1], reverse=True):
        percentage = (amount / total_expenses * 100) if total_expenses > 0 else 0
        category_breakdown.append({
            "category_name": cat_name,
            "amount": float(amount),
            "percentage": round(float(percentage), 2)
        })
    
    # Top expenses (largest expenses)
    expenses = [t for t in transactions if t.amount < 0]
    expenses.sort(key=lambda x: abs(x.amount), reverse=True)
    top_expenses = [
        {
            "description": t.description,
            "amount": float(abs(t.amount)),
            "date": t.date.isoformat()
        }
        for t in expenses[:10]  # Top 10
    ]
    
    # Budget status
    budgets = db.query(Budget).filter(
        and_(
            Budget.user_id == current_user.id,
            Budget.month == month,
            Budget.year == year
        )
    ).all()
    
    budget_status = []
    for budget in budgets:
        category = db.query(Category).filter(Category.id == budget.category_id).first()
        if category:
            budget_status.append({
                "category_name": category.name,
                "limit": float(budget.limit),
                "spent": float(budget.spent),
                "remaining": float(budget.limit - budget.spent)
            })
    
    # Generate AI summary
    ai_summary = generate_monthly_summary(month, year, current_user.id, db)
    
    return MonthlyInsightsResponse(
        month=month,
        year=year,
        total_income=Decimal(str(total_income)),
        total_expenses=Decimal(str(total_expenses)),
        net_income=Decimal(str(net_income)),
        category_breakdown=category_breakdown,
        top_expenses=top_expenses,
        budget_status=budget_status,
        ai_summary=ai_summary
    )

