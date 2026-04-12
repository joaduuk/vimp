from datetime import datetime, timedelta
from typing import Optional
import hashlib
import secrets
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .database import get_db
from .models import User

# Secret key for JWT (change this in production!)
SECRET_KEY = "your-super-secret-key-change-this-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Security scheme
security = HTTPBearer()

def get_password_hash(password: str) -> str:
    """Hash a password using SHA256 with salt"""
    # Generate a random salt
    salt = secrets.token_hex(16)
    # Hash the password with salt
    hash_obj = hashlib.sha256((password + salt).encode())
    # Store salt and hash together
    return f"{salt}:{hash_obj.hexdigest()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password"""
    try:
        salt, hash_value = hashed_password.split(":")
        hash_obj = hashlib.sha256((plain_password + salt).encode())
        return hash_obj.hexdigest() == hash_value
    except Exception:
        return False

def authenticate_user(db: Session, email: str, password: str):
    """Authenticate a user by email and password"""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """Get the current user from the JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_moderator(current_user: User = Depends(get_current_user)):
    """Check if the current user is a moderator (constituency-level)"""
    if current_user.role != "moderator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Moderator privileges required"
        )
    return current_user