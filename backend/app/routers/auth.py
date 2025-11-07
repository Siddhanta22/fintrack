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
from app.auth import get_password_hash, verify_password, create_access_token, get_current_user

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user.
    
    Process:
    1. Check if email already exists
    2. Hash the password (never store plain text!)
    3. Create user record in database
    4. Return user data (excluding password)
    
    Example request:
        POST /api/auth/register
        {
            "email": "user@example.com",
            "password": "securepassword123",
            "full_name": "John Doe"
        }
    
    Example response:
        {
            "id": 1,
            "email": "user@example.com",
            "full_name": "John Doe",
            "created_at": "2024-01-15T10:30:00Z"
        }
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password before storing
    hashed_password = get_password_hash(user_data.password)
    
    # Create new user
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user


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
def get_me(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user information.
    
    This is a protected route - requires valid JWT token in Authorization header.
    
    Example request:
        GET /api/auth/me
        Headers:
            Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    
    Example response:
        {
            "id": 1,
            "email": "user@example.com",
            "full_name": "John Doe",
            "created_at": "2024-01-15T10:30:00Z"
        }
    """
    return current_user

