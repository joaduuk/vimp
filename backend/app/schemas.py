from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# User schemas
class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    constituency_id: Optional[int] = None  # ADD THIS

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    role: str
    moderates_constituency_id: Optional[int] = None
    constituency_id: Optional[int] = None  # ADD THIS
    constituency_name: Optional[str] = None  # ADD THIS
    
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):  # ADD THIS NEW SCHEMA
    username: Optional[str] = None
    constituency_id: Optional[int] = None

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
    issue_id: int

# Optional: Add a VoteResponse schema if needed
class VoteResponse(BaseModel):
    id: int
    vote_type: int
    user_id: int
    issue_id: int
    
    class Config:
        from_attributes = True

# ============ ELECTION SCHEMAS ============

class ElectionCreate(BaseModel):
    constituency_id: int
    title: str
    description: Optional[str] = None
    start_date: datetime  # This is now the voting start date (moderator picks this)
    
class ElectionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[str] = None

class ElectionResponse(BaseModel):
    id: int
    constituency_id: int
    title: str
    description: Optional[str] = None
    start_date: datetime
    end_date: datetime
    status: str
    created_at: datetime
    constituency: Optional[dict] = None
    candidates: Optional[list] = None
    
    class Config:
        from_attributes = True

class CandidateCreate(BaseModel):
    manifesto: Optional[str] = None

class CandidateResponse(BaseModel):
    id: int
    user_id: int
    election_id: int
    manifesto: Optional[str] = None
    status: str
    vote_count: int
    user: Optional[UserResponse] = None  # FIXED: removed "schemas." - just UserResponse
    
    class Config:
        from_attributes = True

class ElectionVoteCreate(BaseModel):
    candidate_id: int

class ElectionResultResponse(BaseModel):
    election_id: int
    total_votes: int
    winner: Optional[CandidateResponse] = None
    candidates: list