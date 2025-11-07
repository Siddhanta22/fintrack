"""
Configuration management using Pydantic Settings.

This module loads environment variables and provides type-safe configuration.
We use a .env file for local development and environment variables for production.
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database connection string
    # Format: postgresql://user:password@host:port/database
    DATABASE_URL: str
    
    # JWT secret key for token generation
    # In production, use a strong random secret
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    
    # JWT algorithm
    ALGORITHM: str = "HS256"
    
    # Token expiration time in minutes
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # OpenAI API key for AI features
    OPENAI_API_KEY: Optional[str] = None
    
    # Server configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Create a singleton settings instance
# This is imported throughout the app to access configuration
settings = Settings()

