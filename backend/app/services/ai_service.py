"""
AI service: uses OpenAI/LangChain for intelligent categorization and insights.

This module handles:
1. Transaction categorization: analyzes description and suggests category
2. Monthly insights: generates natural language summaries
3. Natural language queries: converts questions to SQL queries

We use LangChain for:
- Structured prompts
- Response parsing
- Error handling
- Potential future: caching, streaming, etc.
"""

from typing import Optional, List
from sqlalchemy.orm import Session
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema import HumanMessage

from app.config import settings
from app.models import Category

# Lazy initialization of OpenAI LLM
# Only initialize if API key is available
_llm: Optional[ChatOpenAI] = None

def get_llm() -> Optional[ChatOpenAI]:
    """Get or create the LLM instance. Returns None if API key is not configured."""
    global _llm
    if not settings.OPENAI_API_KEY:
        return None
    if _llm is None:
        _llm = ChatOpenAI(
            model_name="gpt-3.5-turbo",
            temperature=0.3,
            openai_api_key=settings.OPENAI_API_KEY
        )
    return _llm


def categorize_with_ai(description: str, db: Session) -> Optional[Category]:
    """
    Use AI to categorize a transaction based on its description.
    
    Process:
    1. Get list of available categories from database
    2. Build prompt with description and categories
    3. Call LLM to determine best category
    4. Map LLM response to Category object
    
    Args:
        description: Transaction description (e.g., "STARBUCKS STORE #1234")
        db: Database session
    
    Returns:
        Category object if found, None otherwise
    
    Example:
        Input: "AMAZON.COM PURCHASE"
        Output: Category(name="Shopping")
    """
    if not settings.OPENAI_API_KEY:
        return None  # AI features disabled
    
    # Get all categories
    categories = db.query(Category).all()
    if not categories:
        return None
    
    # Build category list for prompt
    category_list = "\n".join([f"- {cat.name}" for cat in categories])
    
    # Create prompt template
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a financial categorization assistant. 
        Analyze transaction descriptions and assign them to the most appropriate category.
        Return ONLY the category name, nothing else."""),
        ("human", """Transaction description: {description}

Available categories:
{categories}

Which category best fits this transaction? Return only the category name.""")
    ])
    
    try:
        llm = get_llm()
        if not llm:
            return None
        
        # Format prompt with variables
        messages = prompt.format_messages(
            description=description,
            categories=category_list
        )
        
        # Call LLM
        response = llm(messages)
        category_name = response.content.strip()
        
        # Find matching category (case-insensitive)
        category = db.query(Category).filter(
            Category.name.ilike(f"%{category_name}%")
        ).first()
        
        return category
        
    except Exception as e:
        print(f"AI categorization error: {e}")
        return None


def generate_monthly_summary(
    month: int,
    year: int,
    user_id: int,
    db: Session
) -> str:
    """
    Generate AI-powered monthly financial summary.
    
    Process:
    1. Query transactions for the month
    2. Calculate statistics (total income, expenses, top categories, etc.)
    3. Build prompt with financial data
    4. Generate natural language summary
    
    Args:
        month: Month (1-12)
        year: Year
        user_id: User ID
        db: Database session
    
    Returns:
        Natural language summary string
    """
    if not settings.OPENAI_API_KEY:
        return "AI insights are not available. Please configure OPENAI_API_KEY."
    
    from app.models import Transaction
    from sqlalchemy import and_, func
    from decimal import Decimal
    
    # Query transactions for the month
    transactions = db.query(Transaction).filter(
        and_(
            Transaction.user_id == user_id,
            func.extract('month', Transaction.date) == month,
            func.extract('year', Transaction.date) == year
        )
    ).all()
    
    if not transactions:
        return f"No transactions found for {month}/{year}."
    
    # Calculate statistics
    total_income = sum(t.amount for t in transactions if t.amount > 0)
    total_expenses = abs(sum(t.amount for t in transactions if t.amount < 0))
    net_income = total_income - total_expenses
    
    # Get category breakdown
    category_totals = {}
    for t in transactions:
        if t.category and t.amount < 0:  # Only expenses
            cat_name = t.category.name
            category_totals[cat_name] = category_totals.get(cat_name, Decimal("0")) + abs(t.amount)
    
    top_categories = sorted(category_totals.items(), key=lambda x: x[1], reverse=True)[:5]
    
    # Build prompt
    prompt = f"""Generate a concise monthly financial summary for {month}/{year}.

Financial Data:
- Total Income: ${total_income:,.2f}
- Total Expenses: ${total_expenses:,.2f}
- Net Income: ${net_income:,.2f}
- Top Spending Categories:
{chr(10).join([f"  - {cat}: ${amt:,.2f}" for cat, amt in top_categories])}

Write a 2-3 sentence summary highlighting key insights and spending patterns."""
    
    try:
        llm = get_llm()
        if not llm:
            return "AI insights are not available. Please configure OPENAI_API_KEY."
        response = llm([HumanMessage(content=prompt)])
        return response.content.strip()
    except Exception as e:
        return f"Error generating summary: {str(e)}"

