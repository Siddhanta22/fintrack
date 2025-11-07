"""
CSV parsing service: extracts transactions from bank CSV files.

Bank CSV formats vary, but typically include:
- Date
- Description/Memo
- Amount (positive or negative)
- Balance (optional)

This parser handles common formats and can be extended for specific banks.

Design:
- Flexible column mapping (different banks use different column names)
- Handles various date formats
- Normalizes amounts (some banks use positive for debits, others negative)
- Returns structured transaction data
"""

import csv
import io
from typing import List, Dict, Optional
from datetime import datetime
from decimal import Decimal
import pandas as pd


def parse_csv_file(file_content: bytes, account_id: int) -> List[Dict]:
    """
    Parse a bank CSV file and extract transactions.
    
    This function:
    1. Reads CSV content
    2. Detects column mapping (date, description, amount)
    3. Parses each row into a transaction dict
    4. Normalizes data (dates, amounts)
    
    Args:
        file_content: Raw bytes from uploaded CSV file
        account_id: ID of the account these transactions belong to
    
    Returns:
        List of transaction dictionaries ready for database insertion
    
    Example CSV format:
        Date,Description,Amount,Balance
        2024-01-15,STARBUCKS STORE #1234,-5.50,1000.00
        2024-01-16,SALARY DEPOSIT,3000.00,4000.00
    
    Example output:
        [
            {
                "account_id": 1,
                "date": datetime(2024, 1, 15),
                "description": "STARBUCKS STORE #1234",
                "amount": Decimal("-5.50"),
                "transaction_type": "debit"
            },
            ...
        ]
    """
    # Convert bytes to string
    content = file_content.decode('utf-8')
    
    # Use pandas for robust CSV parsing (handles encoding, quotes, etc.)
    df = pd.read_csv(io.StringIO(content))
    
    # Normalize column names (lowercase, strip whitespace)
    df.columns = df.columns.str.lower().str.strip()
    
    # Map common column name variations to standard names
    column_mapping = {
        'date': ['date', 'transaction date', 'posted date', 'date posted'],
        'description': ['description', 'memo', 'details', 'transaction', 'payee', 'merchant'],
        'amount': ['amount', 'transaction amount', 'debit', 'credit'],
        'balance': ['balance', 'running balance', 'available balance']
    }
    
    # Find actual column names
    date_col = None
    desc_col = None
    amount_col = None
    
    for col in df.columns:
        col_lower = col.lower()
        if col_lower in column_mapping['date']:
            date_col = col
        elif col_lower in column_mapping['description']:
            desc_col = col
        elif col_lower in column_mapping['amount']:
            amount_col = col
    
    # Validate required columns exist
    if not date_col or not desc_col or not amount_col:
        raise ValueError(
            f"CSV must contain date, description, and amount columns. "
            f"Found columns: {list(df.columns)}"
        )
    
    transactions = []
    
    # Parse each row
    for _, row in df.iterrows():
        try:
            # Parse date (try multiple formats)
            date_str = str(row[date_col]).strip()
            date = parse_date(date_str)
            
            # Get description
            description = str(row[desc_col]).strip()
            if not description:
                continue  # Skip rows with empty descriptions
            
            # Parse amount
            amount_str = str(row[amount_col]).strip()
            # Remove currency symbols and commas
            amount_str = amount_str.replace('$', '').replace(',', '').strip()
            amount = Decimal(amount_str)
            
            # Determine transaction type
            # Negative amount = expense (debit), positive = income (credit)
            transaction_type = "debit" if amount < 0 else "credit"
            
            transactions.append({
                "account_id": account_id,
                "date": date,
                "description": description,
                "amount": amount,
                "transaction_type": transaction_type
            })
            
        except Exception as e:
            # Log error but continue processing other rows
            print(f"Error parsing row: {e}")
            continue
    
    return transactions


def parse_date(date_str: str) -> datetime:
    """
    Parse date string in various formats.
    
    Common formats:
    - YYYY-MM-DD
    - MM/DD/YYYY
    - DD-MM-YYYY
    - YYYY/MM/DD
    
    Args:
        date_str: Date string from CSV
    
    Returns:
        datetime object
    """
    # List of common date formats
    date_formats = [
        "%Y-%m-%d",
        "%m/%d/%Y",
        "%d/%m/%Y",
        "%Y/%m/%d",
        "%m-%d-%Y",
        "%d-%m-%Y",
        "%Y-%m-%d %H:%M:%S",
        "%m/%d/%Y %H:%M:%S"
    ]
    
    for fmt in date_formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    
    # If no format matches, raise error
    raise ValueError(f"Unable to parse date: {date_str}")

