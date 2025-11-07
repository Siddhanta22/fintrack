"""
Initialize default categories in the database.

Run this script after setting up the database to create default categories.
Usage: python init_categories.py
"""

from app.database import SessionLocal
from app.models import Category

# Default categories with colors
DEFAULT_CATEGORIES = [
    {"name": "Food & Dining", "color": "#FF5733", "icon": "restaurant"},
    {"name": "Transport", "color": "#3498DB", "icon": "car"},
    {"name": "Shopping", "color": "#9B59B6", "icon": "shopping"},
    {"name": "Entertainment", "color": "#E74C3C", "icon": "movie"},
    {"name": "Bills & Utilities", "color": "#F39C12", "icon": "bill"},
    {"name": "Healthcare", "color": "#1ABC9C", "icon": "health"},
    {"name": "Education", "color": "#34495E", "icon": "education"},
    {"name": "Travel", "color": "#16A085", "icon": "travel"},
    {"name": "Income", "color": "#27AE60", "icon": "income"},
    {"name": "Other", "color": "#95A5A6", "icon": "other"},
]


def init_categories():
    """Create default categories if they don't exist."""
    db = SessionLocal()
    try:
        for cat_data in DEFAULT_CATEGORIES:
            # Check if category already exists
            existing = db.query(Category).filter(Category.name == cat_data["name"]).first()
            if not existing:
                category = Category(**cat_data)
                db.add(category)
                print(f"Created category: {cat_data['name']}")
            else:
                print(f"Category already exists: {cat_data['name']}")
        
        db.commit()
        print("Categories initialized successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error initializing categories: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    init_categories()

