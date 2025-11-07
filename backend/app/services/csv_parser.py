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
    # Convert bytes to string (try multiple encodings)
    content = None
    encodings = ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252', 'iso-8859-1']
    
    for encoding in encodings:
        try:
            content = file_content.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    
    if content is None:
        raise ValueError(
            "Unable to decode file. Please ensure your CSV file is saved with UTF-8 encoding."
        )
    
    # Use pandas for robust CSV parsing (handles encoding, quotes, etc.)
    try:
        df = pd.read_csv(io.StringIO(content))
    except pd.errors.EmptyDataError:
        raise ValueError("CSV file is empty. Please upload a file with transaction data.")
    except pd.errors.ParserError as e:
        raise ValueError(f"Error parsing CSV file: {str(e)}. Please check that your file is a valid CSV.")
    
    # Check if DataFrame is empty
    if df.empty:
        raise ValueError("CSV file contains no data rows. Please ensure your file has transaction data.")
    
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
    if not date_col:
        available_cols = ', '.join(list(df.columns))
        raise ValueError(
            f"CSV file is missing a 'Date' column. "
            f"Please ensure your CSV has a column named 'Date' (or 'Transaction Date', 'Posted Date'). "
            f"Found columns: {available_cols}"
        )
    
    if not desc_col:
        available_cols = ', '.join(list(df.columns))
        raise ValueError(
            f"CSV file is missing a 'Description' column. "
            f"Please ensure your CSV has a column named 'Description' (or 'Memo', 'Details', 'Transaction', 'Payee', 'Merchant'). "
            f"Found columns: {available_cols}"
        )
    
    if not amount_col:
        available_cols = ', '.join(list(df.columns))
        raise ValueError(
            f"CSV file is missing an 'Amount' column. "
            f"Please ensure your CSV has a column named 'Amount' (or 'Transaction Amount', 'Debit', 'Credit'). "
            f"Found columns: {available_cols}"
        )
    
    transactions = []
    
    # Parse each row
    row_errors = []
    row_num = 1  # Start at 1 (header is row 1, first data row is row 2)
    for idx, row in df.iterrows():
        row_num += 1  # Increment to current row number (row 2, 3, 4, etc.)
        try:
            # Skip empty rows
            if row.isna().all():
                continue
            
            # Parse date (try multiple formats)
            date_str = str(row[date_col]).strip()
            if date_str == 'nan' or not date_str:
                row_errors.append(f"Row {row_num}: Missing date value")
                continue
            date = parse_date(date_str)
            
            # Get description
            description = str(row[desc_col]).strip()
            if not description or description == 'nan':
                row_errors.append(f"Row {row_num}: Missing description value")
                continue  # Skip rows with empty descriptions
            
            # Parse amount
            amount_str = str(row[amount_col]).strip()
            if amount_str == 'nan' or not amount_str:
                row_errors.append(f"Row {row_num}: Missing amount value")
                continue
            
            # Remove currency symbols and commas
            amount_str = amount_str.replace('$', '').replace(',', '').strip()
            try:
                amount = Decimal(amount_str)
            except (ValueError, Exception) as e:
                row_errors.append(f"Row {row_num}: Invalid amount '{amount_str}' - {str(e)}")
                continue
            
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
            
        except ValueError as e:
            # Date parsing errors
            row_errors.append(f"Row {row_num}: {str(e)}")
            continue
        except Exception as e:
            # Other errors
            row_errors.append(f"Row {row_num}: Error parsing row - {str(e)}")
            continue
    
    # If no valid transactions were parsed, raise an error with details
    if len(transactions) == 0:
        error_msg = "No valid transactions could be parsed from the CSV file."
        if row_errors:
            error_msg += f" Errors: {'; '.join(row_errors[:5])}"  # Show first 5 errors
            if len(row_errors) > 5:
                error_msg += f" (and {len(row_errors) - 5} more errors)"
        raise ValueError(error_msg)
    
    # Log row errors if any (but don't fail if we have at least some valid transactions)
    if row_errors:
        print(f"Warning: {len(row_errors)} rows had parsing errors: {row_errors[:10]}")
    
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

