"""
Transactions router: handles transaction CRUD, CSV upload, and categorization.

Endpoints:
- POST /api/transactions/upload: Upload CSV file and import transactions
- GET /api/transactions: List transactions with filtering
- POST /api/transactions: Create a single transaction
- POST /api/transactions/categorize: Apply categorization rules/AI to transactions
- GET /api/transactions/{id}: Get single transaction
- PUT /api/transactions/{id}: Update transaction (e.g., change category)
- DELETE /api/transactions/{id}: Delete transaction

Key features:
- CSV parsing with flexible column detection
- Duplicate detection (same date + amount + description)
- Batch categorization
- Filtering and pagination
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import Transaction, Account, User
from app.schemas import (
    TransactionCreate, TransactionResponse, TransactionFilter,
    TransactionUploadResponse
)
from app.auth import get_current_user
from app.services.csv_parser import parse_csv_file
from app.services.categorization import categorize_batch

router = APIRouter()


@router.post("/upload", response_model=TransactionUploadResponse)
async def upload_transactions(
    file: UploadFile = File(...),
    account_id: int = Query(..., description="ID of account to import transactions into"),
    auto_categorize: bool = Query(True, description="Automatically categorize transactions"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a CSV file and import transactions.
    
    Process:
    1. Verify account belongs to current user
    2. Read CSV file content
    3. Parse CSV into transaction dictionaries
    4. Check for duplicates (same date + amount + description)
    5. Insert new transactions
    6. Optionally categorize transactions
    
    Example request:
        POST /api/transactions/upload?account_id=1&auto_categorize=true
        Content-Type: multipart/form-data
        Body: CSV file
    
    Example response:
        {
            "transactions_created": 45,
            "transactions_updated": 0,
            "errors": []
        }
    
    CSV Format:
        Date,Description,Amount
        2024-01-15,STARBUCKS STORE #1234,-5.50
        2024-01-16,SALARY DEPOSIT,3000.00
    """
    # Verify account belongs to user
    account = db.query(Account).filter(
        and_(Account.id == account_id, Account.user_id == current_user.id)
    ).first()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Read file content
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error reading file: {str(e)}"
        )
    
    # Parse CSV
    try:
        parsed_transactions = parse_csv_file(content, account_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error parsing CSV: {str(e)}"
        )
    
    # Import transactions
    created_count = 0
    updated_count = 0
    errors = []
    
    for trans_data in parsed_transactions:
        try:
            # Check for duplicate (same date, amount, description for this account)
            existing = db.query(Transaction).filter(
                and_(
                    Transaction.account_id == account_id,
                    Transaction.date == trans_data["date"],
                    Transaction.amount == trans_data["amount"],
                    Transaction.description == trans_data["description"]
                )
            ).first()
            
            if existing:
                # Update existing transaction
                for key, value in trans_data.items():
                    setattr(existing, key, value)
                updated_count += 1
            else:
                # Create new transaction
                new_transaction = Transaction(
                    user_id=current_user.id,
                    **trans_data
                )
                db.add(new_transaction)
                created_count += 1
                
        except Exception as e:
            errors.append(f"Error importing transaction: {str(e)}")
    
    db.commit()
    
    # Auto-categorize if requested
    if auto_categorize and created_count > 0:
        # Get IDs of newly created transactions
        new_transactions = db.query(Transaction).filter(
            and_(
                Transaction.user_id == current_user.id,
                Transaction.account_id == account_id,
                Transaction.is_categorized == False
            )
        ).order_by(Transaction.id.desc()).limit(created_count).all()
        
        transaction_ids = [t.id for t in new_transactions]
        categorize_batch(transaction_ids, db, use_ai=True)
    
    return TransactionUploadResponse(
        transactions_created=created_count,
        transactions_updated=updated_count,
        errors=errors
    )


@router.get("", response_model=List[TransactionResponse])
def list_transactions(
    account_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List transactions with filtering and pagination.
    
    Query parameters:
    - account_id: Filter by account
    - category_id: Filter by category
    - start_date: Start of date range
    - end_date: End of date range
    - limit: Number of results (default 100, max 1000)
    - offset: Pagination offset
    
    Example request:
        GET /api/transactions?account_id=1&start_date=2024-01-01&limit=50
    
    Example response:
        [
            {
                "id": 1,
                "date": "2024-01-15T10:00:00Z",
                "description": "STARBUCKS STORE #1234",
                "amount": "-5.50",
                "category": {"id": 1, "name": "Food & Dining"},
                ...
            },
            ...
        ]
    """
    # Start with base query: only current user's transactions
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    
    # Apply filters
    if account_id:
        query = query.filter(Transaction.account_id == account_id)
    
    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    
    if end_date:
        query = query.filter(Transaction.date <= end_date)
    
    # Order by date (newest first)
    query = query.order_by(Transaction.date.desc())
    
    # Apply pagination
    transactions = query.offset(offset).limit(limit).all()
    
    return transactions


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    transaction_data: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a single transaction manually.
    
    Useful for adding transactions that aren't in CSV files.
    
    Example request:
        POST /api/transactions
        {
            "account_id": 1,
            "date": "2024-01-15T10:00:00Z",
            "description": "Coffee shop",
            "amount": "-5.50",
            "transaction_type": "debit",
            "category_id": 1
        }
    """
    # Verify account belongs to user
    account = db.query(Account).filter(
        and_(Account.id == transaction_data.account_id, Account.user_id == current_user.id)
    ).first()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Create transaction
    new_transaction = Transaction(
        user_id=current_user.id,
        **transaction_data.dict()
    )
    
    # Set is_categorized if category_id is provided
    if transaction_data.category_id:
        new_transaction.is_categorized = True
    
    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)
    
    return new_transaction


@router.post("/categorize")
def categorize_transactions(
    transaction_ids: Optional[List[int]] = None,
    use_ai: bool = Query(True, description="Use AI for uncategorized transactions"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Apply categorization to transactions.
    
    If transaction_ids is provided, only categorize those transactions.
    Otherwise, categorize all uncategorized transactions for the user.
    
    Example request:
        POST /api/transactions/categorize?use_ai=true
        {
            "transaction_ids": [1, 2, 3]  // Optional
        }
    
    Example response:
        {
            "categorized": 10,
            "uncategorized": 2,
            "errors": []
        }
    """
    if transaction_ids:
        # Verify all transactions belong to user
        transactions = db.query(Transaction).filter(
            and_(
                Transaction.id.in_(transaction_ids),
                Transaction.user_id == current_user.id
            )
        ).all()
        
        if len(transactions) != len(transaction_ids):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Some transactions not found"
            )
        
        ids_to_categorize = transaction_ids
    else:
        # Get all uncategorized transactions for user
        uncategorized = db.query(Transaction).filter(
            and_(
                Transaction.user_id == current_user.id,
                Transaction.is_categorized == False
            )
        ).all()
        ids_to_categorize = [t.id for t in uncategorized]
    
    # Categorize
    result = categorize_batch(ids_to_categorize, db, use_ai=use_ai)
    
    return result


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single transaction by ID."""
    transaction = db.query(Transaction).filter(
        and_(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id
        )
    ).first()
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    return transaction


@router.put("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: int,
    category_id: Optional[int] = None,
    description: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a transaction (typically to change category or description)."""
    transaction = db.query(Transaction).filter(
        and_(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id
        )
    ).first()
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    # Update fields
    if category_id is not None:
        transaction.category_id = category_id
        transaction.is_categorized = True
    
    if description is not None:
        transaction.description = description
    
    db.commit()
    db.refresh(transaction)
    
    return transaction

