from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware  # Add this import
from sqlalchemy.orm import Session
from .database import get_db, engine, Base
from . import models, schemas, auth
from datetime import timedelta
from typing import Optional

# Create tables (if they don't exist)
Base.metadata.create_all(bind=engine)

# Tags metadata for Swagger organization
tags_metadata = [
    {
        "name": "Authentication",
        "description": "User registration, login, and profile management",
    },
    {
        "name": "Issues",
        "description": "Create, read, and delete issues/posts in constituencies",
    },
    {
        "name": "Comments",
        "description": "Add and manage comments on issues",
    },
    {
        "name": "Voting",
        "description": "Cast votes (For/Neutral/Against) on issues and view results",
    },
]

app = FastAPI(
    title="VirMP API", 
    description="Your Virtual Representative (MP) Platform",
    openapi_tags=tags_metadata
)
# Add CORS middleware - allows frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite's default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", tags=["Root"])
def root():
    return {"message": "Welcome to VirMP API", "status": "running"}

# ============ AUTH ENDPOINTS ============

@app.post("/api/register", response_model=schemas.Token, tags=["Authentication"])
def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if user exists
    existing_user = db.query(models.User).filter(
        (models.User.email == user_data.email) | (models.User.username == user_data.username)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username already registered"
        )
    
    # Create new user (default role is "user")
    hashed_password = auth.get_password_hash(user_data.password)
    new_user = models.User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_password,
        role="user",  # Default role
        moderates_constituency_id=None  # Regular users don't moderate
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create access token
    access_token = auth.create_access_token(data={"sub": str(new_user.id)})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user
    }

@app.post("/api/login", response_model=schemas.Token, tags=["Authentication"])
def login(user_data: schemas.UserLogin, db: Session = Depends(get_db)):
    """Login with email and password"""
    user = auth.authenticate_user(db, user_data.email, user_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token = auth.create_access_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@app.get("/api/me", response_model=schemas.UserResponse, tags=["Authentication"])
def get_current_user_info(current_user: models.User = Depends(auth.get_current_user)):
    """Get the current logged-in user's info"""
    return current_user

@app.get("/api/protected", tags=["Authentication"])
def protected_route(current_user: models.User = Depends(auth.get_current_user)):
    """Example protected route - requires authentication"""
    return {"message": f"Hello {current_user.username}, you are authenticated!"}

@app.get("/api/moderator-only", tags=["Authentication"])
def moderator_route(current_user: models.User = Depends(auth.get_current_moderator)):
    """Example moderator-only route"""
    return {"message": f"Welcome moderator {current_user.username}!"}

# ============ ISSUES ENDPOINTS ============

@app.post("/api/issues", response_model=schemas.IssueResponse, tags=["Issues"])
def create_issue(
    issue_data: schemas.IssueCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new issue/post in a constituency"""
    # Verify constituency exists
    constituency = db.query(models.Constituency).filter(models.Constituency.id == issue_data.constituency_id).first()
    if not constituency:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Constituency not found"
        )
    
    # Create the issue
    new_issue = models.Issue(
        title=issue_data.title,
        content=issue_data.content,
        user_id=current_user.id,
        constituency_id=issue_data.constituency_id
    )
    
    db.add(new_issue)
    db.commit()
    db.refresh(new_issue)
    
    return new_issue

@app.get("/api/issues/{constituency_id}", tags=["Issues"])
def get_issues_by_constituency(
    constituency_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get all issues for a specific constituency"""
    issues = db.query(models.Issue).filter(
        models.Issue.constituency_id == constituency_id
    ).order_by(models.Issue.created_at.desc()).offset(skip).limit(limit).all()
    
    return issues

@app.get("/api/issue/{issue_id}", tags=["Issues"])
def get_issue_detail(
    issue_id: int,
    db: Session = Depends(get_db)
):
    """Get a single issue with details"""
    issue = db.query(models.Issue).filter(models.Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )
    return issue

@app.delete("/api/issue/{issue_id}", tags=["Issues"])
def delete_issue(
    issue_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an issue (moderators can delete any, users only their own)"""
    issue = db.query(models.Issue).filter(models.Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )
    
    # Check permissions
    if current_user.role != "moderator" and issue.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this issue"
        )
    
    db.delete(issue)
    db.commit()
    
    return {"message": "Issue deleted successfully"}

# ============ COMMENTS ENDPOINTS ============

@app.post("/api/comments", response_model=schemas.CommentResponse, tags=["Comments"])
def create_comment(
    comment_data: schemas.CommentCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Add a comment to an issue"""
    # Verify issue exists
    issue = db.query(models.Issue).filter(models.Issue.id == comment_data.issue_id).first()
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )
    
    # Create the comment
    new_comment = models.Comment(
        content=comment_data.content,
        user_id=current_user.id,
        issue_id=comment_data.issue_id
    )
    
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    
    return new_comment

@app.get("/api/comments/{issue_id}", tags=["Comments"])
def get_comments_by_issue(
    issue_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get all comments for a specific issue"""
    comments = db.query(models.Comment).filter(
        models.Comment.issue_id == issue_id
    ).order_by(models.Comment.created_at.asc()).offset(skip).limit(limit).all()
    
    return comments

@app.delete("/api/comment/{comment_id}", tags=["Comments"])
def delete_comment(
    comment_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a comment (moderators can delete any, users only their own)"""
    comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    
    # Check permissions
    if current_user.role != "moderator" and comment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this comment"
        )
    
    db.delete(comment)
    db.commit()
    
    return {"message": "Comment deleted successfully"}

# ============ VOTING ENDPOINTS ============

@app.post("/api/vote", tags=["Voting"])
def cast_vote(
    vote_data: schemas.VoteCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Cast a vote on an issue (For/Neutral/Against)"""
    # Verify issue exists
    issue = db.query(models.Issue).filter(models.Issue.id == vote_data.issue_id).first()
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )
    
    # Check if user already voted on this issue
    existing_vote = db.query(models.Vote).filter(
        models.Vote.user_id == current_user.id,
        models.Vote.issue_id == vote_data.issue_id
    ).first()
    
    if existing_vote:
        # Update existing vote
        existing_vote.vote_type = vote_data.vote_type
        db.commit()
        db.refresh(existing_vote)
        return {"message": "Vote updated successfully", "vote": existing_vote}
    else:
        # Create new vote
        new_vote = models.Vote(
            vote_type=vote_data.vote_type,
            user_id=current_user.id,
            issue_id=vote_data.issue_id
        )
        db.add(new_vote)
        db.commit()
        db.refresh(new_vote)
        return {"message": "Vote cast successfully", "vote": new_vote}

@app.get("/api/votes/{issue_id}", tags=["Voting"])
def get_vote_counts(
    issue_id: int,
    db: Session = Depends(get_db)
):
    """Get vote counts for an issue (For, Neutral, Against)"""
    votes = db.query(models.Vote).filter(models.Vote.issue_id == issue_id).all()
    
    counts = {
        "for": 0,
        "neutral": 0,
        "against": 0,
        "total": len(votes)
    }
    
    for vote in votes:
        if vote.vote_type == 1:
            counts["for"] += 1
        elif vote.vote_type == 0:
            counts["neutral"] += 1
        elif vote.vote_type == -1:
            counts["against"] += 1
    
    return counts

@app.get("/api/user/vote/{issue_id}", tags=["Voting"])
def get_user_vote(
    issue_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get the current user's vote on an issue"""
    vote = db.query(models.Vote).filter(
        models.Vote.user_id == current_user.id,
        models.Vote.issue_id == issue_id
    ).first()
    
    if vote:
        return {"has_voted": True, "vote_type": vote.vote_type}
    else:
        return {"has_voted": False, "vote_type": None}
    
# ============ COUNTRIES & CONSTITUENCIES ENDPOINTS ============

@app.get("/api/countries", tags=["Countries"])
def get_countries(db: Session = Depends(get_db)):
    """Get all countries"""
    countries = db.query(models.Country).all()
    return countries

@app.get("/api/constituencies", tags=["Constituencies"])
def get_constituencies(country_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Get constituencies, optionally filtered by country"""
    query = db.query(models.Constituency)
    if country_id:
        query = query.filter(models.Constituency.country_id == country_id)
    constituencies = query.all()
    return constituencies
