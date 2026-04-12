from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# User schemas
class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    role: str
    moderates_constituency_id: Optional[int] = None
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Issue schemas
class IssueCreate(BaseModel):
    title: str
    content: str
    constituency_id: int

class IssueResponse(BaseModel):
    id: int
    title: str
    content: str
    created_at: datetime
    user_id: int
    constituency_id: int
    author: UserResponse
    
    class Config:
        from_attributes = True

# Comment schemas
class CommentCreate(BaseModel):
    content: str
    issue_id: int

class CommentResponse(BaseModel):
    id: int
    content: str
    created_at: datetime
    user_id: int
    issue_id: int
    author: UserResponse
    
    class Config:
        from_attributes = True

# Vote schemas
class VoteCreate(BaseModel):
    vote_type: int  # 1 = For, 0 = Neutral, -1 = Against
    issue_id: int  # ADD THIS LINE - was missing

# Optional: Add a VoteResponse schema if needed
class VoteResponse(BaseModel):
    id: int
    vote_type: int
    user_id: int
    issue_id: int
    
    class Config:
        from_attributes = True