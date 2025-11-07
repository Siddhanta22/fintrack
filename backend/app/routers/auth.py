"""
Authentication router: handles user registration and login.

Endpoints:
- POST /api/auth/register: Create a new user account
- POST /api/auth/login: Authenticate user and return JWT token
- GET /api/auth/me: Get current user information (protected)

Flow:
1. User registers → password is hashed and stored
2. User logs in → password verified, JWT token issued
3. User includes token in Authorization header for protected routes
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserResponse, Token
from app.auth import get_password_hash, verify_password, create_access_token, get_default_user

router = APIRouter()


# Register route disabled for open access
# @router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
# def register(user_data: UserCreate, db: Session = Depends(get_db)):
#     ... (disabled)


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Authenticate user and return JWT token.
    
    OAuth2PasswordRequestForm expects:
    - username: email address (OAuth2 spec uses "username" field)
    - password: plain text password
    
    Process:
    1. Find user by email
    2. Verify password against stored hash
    3. Generate JWT token with user ID
    4. Return token (client stores this and sends in Authorization header)
    
    Example request:
        POST /api/auth/login
        Form data:
            username: user@example.com
            password: securepassword123
    
    Example response:
        {
            "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "token_type": "bearer"
        }
    """
    # Find user by email (OAuth2PasswordRequestForm uses "username" field for email)
    user = db.query(User).filter(User.email == form_data.username).first()
    
    # Verify user exists and password is correct
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Create access token
    # "sub" (subject) is the standard JWT claim for user identifier
    access_token = create_access_token(data={"sub": user.id, "email": user.email})
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_default_user)):
    """
    Get current user information (default user for open access).
    
    Example request:
        GET /api/auth/me
    
    Example response:
        {
            "id": 1,
            "email": "default@financetrack.local",
            "full_name": "Default User",
            "created_at": "2024-01-15T10:30:00Z"
        }
    """
    return current_user

