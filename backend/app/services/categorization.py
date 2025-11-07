"""
Categorization service: assigns categories to transactions.

Two-tier approach:
1. Rule-based: Fast, deterministic rules (e.g., "STARBUCKS" → "Food")
2. AI-based: Fallback for uncategorized transactions using LLM

Rule matching:
- Rules are evaluated by priority (higher first)
- Pattern types: contains, starts_with, exact, regex
- First matching rule wins

AI categorization:
- Uses OpenAI GPT to analyze transaction description
- Returns category name, which we map to Category ID
- Results can be cached to reduce API calls
"""

from typing import Optional, List
from sqlalchemy.orm import Session
from app.models import Transaction, Rule, Category
from app.services.ai_service import categorize_with_ai


def categorize_transaction(
    transaction: Transaction,
    db: Session,
    use_ai: bool = True
) -> Optional[Category]:
    """
    Categorize a transaction using rules first, then AI if needed.
    
    Process:
    1. Get all active rules for the user, ordered by priority
    2. Try each rule pattern against transaction description
    3. If no rule matches and use_ai=True, call AI service
    4. Update transaction with category
    
    Args:
        transaction: Transaction object to categorize
        db: Database session
        use_ai: Whether to use AI if no rules match
    
    Returns:
        Category object if found, None otherwise
    """
    # Step 1: Try rule-based categorization
    rules = db.query(Rule).filter(
        Rule.user_id == transaction.user_id,
        Rule.is_active == True
    ).order_by(Rule.priority.desc()).all()
    
    for rule in rules:
        if matches_pattern(transaction.description, rule.pattern, rule.pattern_type):
            # Found matching rule!
            category = db.query(Category).filter(Category.id == rule.category_id).first()
            if category:
                transaction.category_id = category.id
                transaction.is_categorized = True
                db.commit()
                return category
    
    # Step 2: If no rule matched, try AI categorization
    if use_ai:
        category = categorize_with_ai(transaction.description, db)
        if category:
            transaction.category_id = category.id
            transaction.is_categorized = True
            db.commit()
            return category
    
    # No category found
    return None


def matches_pattern(text: str, pattern: str, pattern_type: str) -> bool:
    """
    Check if text matches a pattern based on pattern type.
    
    Args:
        text: Transaction description
        pattern: Pattern to match against
        pattern_type: Type of pattern (contains, starts_with, exact, regex)
    
    Returns:
        True if text matches pattern, False otherwise
    """
    text_lower = text.lower()
    pattern_lower = pattern.lower()
    
    if pattern_type == "contains":
        return pattern_lower in text_lower
    elif pattern_type == "starts_with":
        return text_lower.startswith(pattern_lower)
    elif pattern_type == "exact":
        return text_lower == pattern_lower
    elif pattern_type == "regex":
        import re
        try:
            return bool(re.search(pattern, text, re.IGNORECASE))
        except re.error:
            return False
    else:
        return False


def categorize_batch(transaction_ids: List[int], db: Session, use_ai: bool = True) -> dict:
    """
    Categorize multiple transactions in batch.
    
    Useful for bulk categorization after CSV upload.
    
    Args:
        transaction_ids: List of transaction IDs to categorize
        db: Database session
        use_ai: Whether to use AI for uncategorized transactions
    
    Returns:
        Dictionary with statistics:
        {
            "categorized": 10,
            "uncategorized": 2,
            "errors": []
        }
    """
    categorized_count = 0
    uncategorized_count = 0
    errors = []
    
    for trans_id in transaction_ids:
        try:
            transaction = db.query(Transaction).filter(Transaction.id == trans_id).first()
            if not transaction:
                continue
            
            category = categorize_transaction(transaction, db, use_ai)
            if category:
                categorized_count += 1
            else:
                uncategorized_count += 1
                
        except Exception as e:
            errors.append(f"Transaction {trans_id}: {str(e)}")
    
    return {
        "categorized": categorized_count,
        "uncategorized": uncategorized_count,
        "errors": errors
    }

