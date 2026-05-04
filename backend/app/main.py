from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware  # Add this import
from sqlalchemy.orm import Session
from .database import get_db, engine, Base
from . import models, schemas, auth
from datetime import datetime, timedelta
from typing import Optional
from .email import send_welcome_email

import socketio
from .socket_manager import manager




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
    {
        "name": "Elections",
        "description": "Create and manage elections for Virtual MP",
    },
    {
        "name": "Countries",
        "description": "Get countries and constituencies",
    },
    {
        "name": "Constituencies",
        "description": "Get constituencies and popularity metrics",
    },
    {
        "name": "User Profile",
        "description": "Manage user profile and constituency settings",
    },
    {
        "name": "Notifications",
        "description": "User notifications and alerts",
    },
    {
        "name": "Admin",
        "description": "Super admin management endpoints",
    },
    {
        "name": "Moderator",
        "description": "Moderator management endpoints",
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
# Create Socket.IO server
sio = socketio.AsyncServer(cors_allowed_origins=['http://localhost:5173'])

# Mount Socket.IO
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

@app.get("/", tags=["Root"])
def root():
    return {"message": "Welcome to VirMP API", "status": "running"}

# ============ AUTH ENDPOINTS ============

@app.post("/api/register", response_model=schemas.Token, tags=["Authentication"])
async def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
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

    # Validate constituency if provided
    constituency_id = None
    if user_data.constituency_id:
        constituency = db.query(models.Constituency).filter(
            models.Constituency.id == user_data.constituency_id
        ).first()
        if not constituency:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected constituency not found"
            )
        constituency_id = user_data.constituency_id

    # Create new user
    hashed_password = auth.get_password_hash(user_data.password)
    new_user = models.User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_password,
        role="user",
        moderates_constituency_id=None,
        constituency_id=constituency_id,
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create access token
    access_token = auth.create_access_token(data={"sub": str(new_user.id)})

    # Send welcome email (don't block registration if email fails)
    try:
        await send_welcome_email(new_user.email, new_user.username)
    except Exception as e:
        print(f"Failed to send welcome email: {e}")
    
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
    # Verify user has a constituency selected
    if not current_user.constituency_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please set your constituency in your profile before creating issues"
        )
    
    # Verify user is creating issue in their own constituency
    if current_user.constituency_id != issue_data.constituency_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create issues in your own constituency"
        )
    
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
    
    # Create notifications for other users in the same constituency (except the author)
    other_users = db.query(models.User).filter(
        models.User.constituency_id == issue_data.constituency_id,
        models.User.id != current_user.id
    ).all()
    
    for user in other_users:
        notification = models.Notification(
            user_id=user.id,
            title="New Issue in Your Constituency",
            message=f"{current_user.username} posted: {issue_data.title[:60]}...",
            type="info",
            link=f"/issue/{new_issue.id}",
            is_read=False
        )
        db.add(notification)
    
    db.commit()
    
    return new_issue

@app.get("/api/issues/{constituency_id}", tags=["Issues"])
def get_issues_by_constituency(
    constituency_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get all issues for a specific constituency"""
    from sqlalchemy.orm import joinedload
    issues = db.query(models.Issue).options(
        joinedload(models.Issue.author)
    ).filter(
        models.Issue.constituency_id == constituency_id
    ).order_by(models.Issue.created_at.desc()).offset(skip).limit(limit).all()

    return [
        {
            "id": i.id,
            "title": i.title,
            "content": i.content,
            "created_at": i.created_at,
            "user_id": i.user_id,
            "constituency_id": i.constituency_id,
            "author": {
                "id": i.author.id,
                "username": i.author.username,
                "email": i.author.email,
                "role": i.author.role,
            } if i.author else None
        }
        for i in issues
    ]
@app.get("/api/issue/{issue_id}", tags=["Issues"])
def get_issue_detail(
    issue_id: int,
    db: Session = Depends(get_db)
):
    """Get a single issue with details"""
    from sqlalchemy.orm import joinedload
    issue = db.query(models.Issue).options(
        joinedload(models.Issue.author)
    ).filter(models.Issue.id == issue_id).first()

    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )

    return {
        "id": issue.id,
        "title": issue.title,
        "content": issue.content,
        "created_at": issue.created_at,
        "user_id": issue.user_id,
        "constituency_id": issue.constituency_id,
        "author": {
            "id": issue.author.id,
            "username": issue.author.username,
            "email": issue.author.email,
            "role": issue.author.role,
        } if issue.author else None
    }
    
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
    # Verify user has a constituency selected
    if not current_user.constituency_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please set your constituency in your profile before commenting"
        )
    
    # Verify issue exists
    issue = db.query(models.Issue).filter(models.Issue.id == comment_data.issue_id).first()
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )
    
    # Verify user is commenting on issue in their constituency
    if current_user.constituency_id != issue.constituency_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only comment on issues in your own constituency"
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
    
    # Notify the issue author (if not the commenter)
    if issue.user_id != current_user.id:
        notification = models.Notification(
            user_id=issue.user_id,
            title="New Comment on Your Issue",
            message=f"{current_user.username} commented on '{issue.title[:50]}...'",
            type="comment",
            link=f"/issue/{issue.id}",
            is_read=False
        )
        db.add(notification)
        db.commit()
    
    return new_comment

@app.get("/api/comments/{issue_id}", tags=["Comments"])
def get_comments_by_issue(
    issue_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get all comments for a specific issue"""
    from sqlalchemy.orm import joinedload
    comments = db.query(models.Comment).options(
        joinedload(models.Comment.author)
    ).filter(
        models.Comment.issue_id == issue_id
    ).order_by(models.Comment.created_at.asc()).offset(skip).limit(limit).all()

    return [
        {
            "id": c.id,
            "content": c.content,
            "created_at": c.created_at,
            "user_id": c.user_id,
            "issue_id": c.issue_id,
            "author": {
                "id": c.author.id,
                "username": c.author.username,
                "email": c.author.email,
                "role": c.author.role,
            } if c.author else None
        }
        for c in comments
    ]
    
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
    # Verify user has a constituency selected
    if not current_user.constituency_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please set your constituency in your profile before voting"
        )
    
    # Verify issue exists
    issue = db.query(models.Issue).filter(models.Issue.id == vote_data.issue_id).first()
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )
    
    # Verify user is voting on issue in their constituency
    if current_user.constituency_id != issue.constituency_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only vote on issues in your own constituency"
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
        
        # Notify issue author about the vote (optional)
        if issue.user_id != current_user.id:
            vote_text = "For" if vote_data.vote_type == 1 else "Against" if vote_data.vote_type == -1 else "Neutral"
            notification = models.Notification(
                user_id=issue.user_id,
                title="New Vote on Your Issue",
                message=f"{current_user.username} voted '{vote_text}' on '{issue.title[:50]}...'",
                type="vote",
                link=f"/issue/{issue.id}",
                is_read=False
            )
            db.add(notification)
            db.commit()
        
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

@app.get("/api/popular-constituencies", tags=["Constituencies"])
def get_popular_constituencies(limit: int = 5, db: Session = Depends(get_db)):
    """Get most active constituencies based on issues, comments, and votes"""
    from sqlalchemy import func, desc
    
    results = db.query(
        models.Constituency.id,
        models.Constituency.name,
        func.count(models.Issue.id.distinct()).label('issue_count'),
        func.count(models.Comment.id.distinct()).label('comment_count'),
        func.count(models.Vote.id.distinct()).label('vote_count')
    ).outerjoin(models.Issue, models.Constituency.id == models.Issue.constituency_id)\
     .outerjoin(models.Comment, models.Issue.id == models.Comment.issue_id)\
     .outerjoin(models.Vote, models.Issue.id == models.Vote.issue_id)\
     .group_by(models.Constituency.id)\
     .order_by(
         desc('comment_count'),  # Most discussed first
         desc('issue_count'),    # Then most issues
         desc('vote_count')      # Then most votes
     )\
     .limit(limit)\
     .all()
    
    # Format the response
    popular = []
    for r in results:
        popular.append({
            "id": r.id,
            "name": r.name,
            "issue_count": r.issue_count or 0,
            "comment_count": r.comment_count or 0,
            "vote_count": r.vote_count or 0
        })
    
    return popular
# ============ ELECTION ENDPOINTS ============

@app.get("/api/elections", tags=["Elections"])
def get_elections(
    constituency_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get elections, optionally filtered by constituency and/or status"""
    from datetime import datetime, timedelta
    
    now = datetime.utcnow()
    
    # Build query
    query = db.query(models.Election)
    if constituency_id:
        query = query.filter(models.Election.constituency_id == constituency_id)
    
    elections = query.all()
    
    # Process each election and auto-update status based on dates
    result = []
    for election in elections:
        if election.start_date and election.end_date:
            registration_start = election.start_date
            voting_start = election.start_date + timedelta(days=7)
            voting_end = election.end_date
            
            # Auto-update status based on current date
            if now < registration_start:
                new_status = "upcoming"
            elif registration_start <= now < voting_start:
                new_status = "register"
            elif voting_start <= now <= voting_end:
                new_status = "active"
            else:
                new_status = "ended"
            
            # Update the database if status changed
            if election.status != new_status:
                election.status = new_status
                db.add(election)
        else:
            # If dates are missing, keep existing status
            new_status = election.status
        
        result.append({
            "id": election.id,
            "title": election.title,
            "description": election.description,
            "status": new_status,
            "start_date": election.start_date.isoformat() if election.start_date else None,
            "end_date": election.end_date.isoformat() if election.end_date else None,
            "constituency_id": election.constituency_id,
            "created_at": election.created_at.isoformat() if election.created_at else None,
        })
    
    db.commit()
    
    # Apply status filter if provided
    if status:
        result = [e for e in result if e['status'] == status]
    
    return result
@app.get("/api/elections/{election_id}", tags=["Elections"])
def get_election_detail(election_id: int, db: Session = Depends(get_db)):
    """Get detailed election info including approved candidates only"""
    election = db.query(models.Election).filter(models.Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    
    # Get ONLY approved candidates
    candidates = db.query(models.Candidate).filter(
        models.Candidate.election_id == election_id,
        models.Candidate.status == "approved"
    ).all()
    
    return {
        "id": election.id,
        "title": election.title,
        "description": election.description,
        "start_date": election.start_date,
        "end_date": election.end_date,
        "status": election.status,
        "constituency": election.constituency,
        "candidates": candidates
    }

@app.post("/api/elections", tags=["Elections"])
def create_election(
    election_data: schemas.ElectionCreate,
    current_user: models.User = Depends(auth.get_current_moderator),
    db: Session = Depends(get_db)
):
    """Create a new election - dates are auto-calculated"""
    from datetime import datetime, timedelta
    
    # Verify constituency exists
    constituency = db.query(models.Constituency).filter(
        models.Constituency.id == election_data.constituency_id
    ).first()
    if not constituency:
        raise HTTPException(status_code=404, detail="Constituency not found")
    
    # Check if there's an active election already
    active_election = db.query(models.Election).filter(
        models.Election.constituency_id == election_data.constituency_id,
        models.Election.status.in_(["upcoming", "active"])
    ).first()
    if active_election:
        raise HTTPException(status_code=400, detail="Constituency already has an active or upcoming election")
    
    # Get the voting start date from the request
    voting_start_date = election_data.start_date
    
    # If it's a string, parse it
    if isinstance(voting_start_date, str):
        voting_start_date = datetime.fromisoformat(voting_start_date.replace('Z', '+00:00'))
    
    # Remove timezone info
    if hasattr(voting_start_date, 'tzinfo') and voting_start_date.tzinfo is not None:
        voting_start_date = voting_start_date.replace(tzinfo=None)
    
    # Calculate dates
    registration_start = voting_start_date - timedelta(days=7)  # Registration opens 7 days before voting
    registration_end = voting_start_date  # Registration closes when voting starts
    voting_end = voting_start_date + timedelta(days=29)  # Voting lasts 30 days
    
    # Get current UTC time
    now = datetime.utcnow()
    
    # Determine status based on current date
    if now < registration_start:
        status = "upcoming"  # Registration not open yet
    elif registration_start <= now < voting_start_date:
        status = "register"  # Registration period (special status for candidates to register)
    elif voting_start_date <= now <= voting_end:
        status = "active"  # Voting period
    else:
        status = "ended"  # Election ended
    
    new_election = models.Election(
        constituency_id=election_data.constituency_id,
        title=election_data.title,
        description=election_data.description,
        start_date=registration_start,
        end_date=voting_end,
        status=status,
        created_by=current_user.id
    )
    
    db.add(new_election)
    db.commit()
    db.refresh(new_election)
    
    return {
        "id": new_election.id,
        "title": new_election.title,
        "description": new_election.description,
        "status": new_election.status,
        "timeline": {
            "registration_opens": registration_start.strftime('%Y-%m-%d'),
            "registration_ends": registration_end.strftime('%Y-%m-%d'),
            "voting_starts": voting_start_date.strftime('%Y-%m-%d'),
            "voting_ends": voting_end.strftime('%Y-%m-%d')
        },
        "message": f"Election created! Current status: {status}"
    }
@app.post("/api/elections/{election_id}/candidate", tags=["Elections"])
def register_as_candidate(
    election_id: int,
    candidate_data: schemas.CandidateCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Register as a candidate for an election"""
    from datetime import datetime
    
    # Verify election exists
    election = db.query(models.Election).filter(models.Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    
    # Check if election is in registration phase (status = 'register')
    # Also check dates as fallback
    now = datetime.utcnow()
    registration_start = election.start_date
    voting_start = election.start_date + timedelta(days=7) if election.start_date else None
    
    # Use status as primary check
    if election.status == 'ended':
        raise HTTPException(status_code=400, detail="Election has ended")
    
    if election.status == 'active':
        raise HTTPException(status_code=400, detail="Voting has already started - registration closed")
    
    # If status is 'upcoming' or 'register', allow registration
    if election.status not in ['upcoming', 'register']:
        # Fallback to date check
        if now >= voting_start:
            raise HTTPException(status_code=400, detail="Registration period has ended - voting has started")
        if now < registration_start:
            raise HTTPException(status_code=400, detail="Registration has not opened yet")
    
    # Check if user is already a candidate
    existing = db.query(models.Candidate).filter(
        models.Candidate.user_id == current_user.id,
        models.Candidate.election_id == election_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You are already registered as a candidate")
    
    # Create candidate
    candidate = models.Candidate(
        user_id=current_user.id,
        election_id=election_id,
        manifesto=candidate_data.manifesto,
        status="pending"
    )
    
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    
    return {
        "message": "Successfully registered as candidate. Waiting for moderator approval.",
        "candidate": candidate
    }

@app.post("/api/elections/{election_id}/vote", tags=["Elections"])
def cast_election_vote(
    election_id: int,
    vote_data: schemas.ElectionVoteCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Cast a vote in an election"""
    # Verify election exists and is active
    election = db.query(models.Election).filter(models.Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    
    from datetime import datetime
    now = datetime.utcnow()
    if now < election.start_date:
        raise HTTPException(status_code=400, detail="Election has not started yet")
    if now > election.end_date:
        raise HTTPException(status_code=400, detail="Election has ended")
    
    # Verify candidate exists and is approved
    candidate = db.query(models.Candidate).filter(
        models.Candidate.id == vote_data.candidate_id,
        models.Candidate.election_id == election_id,
        models.Candidate.status == "approved"
    ).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found or not approved")
    
    # Check if user already voted
    existing_vote = db.query(models.ElectionVote).filter(
        models.ElectionVote.user_id == current_user.id,
        models.ElectionVote.election_id == election_id
    ).first()
    if existing_vote:
        raise HTTPException(status_code=400, detail="You have already voted in this election")
    
    # Cast vote
    vote = models.ElectionVote(
        user_id=current_user.id,
        candidate_id=vote_data.candidate_id,
        election_id=election_id
    )
    
    db.add(vote)
    db.commit()
    
    return {"message": "Vote cast successfully"}

@app.get("/api/elections/{election_id}/results", tags=["Elections"])
def get_election_results(election_id: int, db: Session = Depends(get_db)):
    """Get election results"""
    election = db.query(models.Election).filter(models.Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    
    # Get all candidates with vote counts
    candidates = db.query(models.Candidate).filter(
        models.Candidate.election_id == election_id,
        models.Candidate.status == "approved"
    ).all()
    
    results = []
    for candidate in candidates:
        vote_count = db.query(models.ElectionVote).filter(
            models.ElectionVote.candidate_id == candidate.id
        ).count()
        candidate.vote_count = vote_count
        results.append(candidate)
    
    # Sort by vote count
    results.sort(key=lambda x: x.vote_count, reverse=True)
    
    # Determine winner
    winner = results[0] if results else None
    
    return {
        "election_id": election_id,
        "election_title": election.title,
        "status": election.status,
        "total_votes": sum(c.vote_count for c in results),
        "winner": winner,
        "candidates": results
    }
    
@app.get("/api/elections/{election_id}/candidates/all", tags=["Elections"])
def get_all_candidates(
    election_id: int,
    current_user: models.User = Depends(auth.get_current_moderator),
    db: Session = Depends(get_db)
):
    """Get all candidates including pending (moderator only)"""
    candidates = db.query(models.Candidate).filter(
        models.Candidate.election_id == election_id
    ).all()
    return candidates

@app.put("/api/candidates/{candidate_id}/approve", tags=["Elections"])
def approve_candidate(
    candidate_id: int,
    current_user: models.User = Depends(auth.get_current_moderator),
    db: Session = Depends(get_db)
):
    """Approve a candidate (moderator only)"""
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    candidate.status = "approved"
    db.commit()
    
    return {"message": "Candidate approved successfully"}

@app.put("/api/candidates/{candidate_id}/reject", tags=["Elections"])
def reject_candidate(
    candidate_id: int,
    current_user: models.User = Depends(auth.get_current_moderator),
    db: Session = Depends(get_db)
):
    """Reject a candidate (moderator only)"""
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    candidate.status = "rejected"
    db.commit()
    
    return {"message": "Candidate rejected successfully"}

@app.get("/api/moderator/pending-candidates", tags=["Moderator"])
def get_pending_candidates(
    current_user: models.User = Depends(auth.get_current_moderator),
    db: Session = Depends(get_db)
):
    """Get all pending candidates across constituencies the moderator manages"""
    # If moderator manages specific constituencies, filter by that
    if current_user.moderates_constituency_id:
        # Get elections in that constituency
        elections = db.query(models.Election).filter(
            models.Election.constituency_id == current_user.moderates_constituency_id
        ).all()
        election_ids = [e.id for e in elections]
        
        candidates = db.query(models.Candidate).filter(
            models.Candidate.election_id.in_(election_ids),
            models.Candidate.status == "pending"
        ).all()
    else:
        # Super moderator - see all pending candidates
        candidates = db.query(models.Candidate).filter(
            models.Candidate.status == "pending"
        ).all()
    
    # Enrich with election and user info
    result = []
    for candidate in candidates:
        result.append({
            "id": candidate.id,
            "user_id": candidate.user_id,
            "username": candidate.user.username if candidate.user else "Unknown",
            "email": candidate.user.email if candidate.user else "Unknown",
            "manifesto": candidate.manifesto,
            "status": candidate.status,
            "created_at": candidate.created_at,
            "election_id": candidate.election_id,
            "election_title": candidate.election.title if candidate.election else "Unknown",
            "constituency_name": candidate.election.constituency.name if candidate.election and candidate.election.constituency else "Unknown"
        })
    
    return result

@app.put("/api/moderator/candidates/{candidate_id}/approve", tags=["Moderator"])
def approve_candidate(
    candidate_id: int,
    current_user: models.User = Depends(auth.get_current_moderator),
    db: Session = Depends(get_db)
):
    """Approve a candidate (moderator only)"""
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    candidate.status = "approved"
    db.commit()
    
    return {"message": f"Candidate {candidate.user.username} approved successfully"}

@app.put("/api/moderator/candidates/{candidate_id}/reject", tags=["Moderator"])
def reject_candidate(
    candidate_id: int,
    current_user: models.User = Depends(auth.get_current_moderator),
    db: Session = Depends(get_db)
):
    """Reject a candidate (moderator only)"""
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    candidate.status = "rejected"
    db.commit()
    
    return {"message": f"Candidate {candidate.user.username} rejected"}

# ============ SUPER ADMIN ENDPOINTS ============

def get_current_super_admin(current_user: models.User = Depends(auth.get_current_user)):
    """Check if current user is super admin"""
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin privileges required"
        )
    return current_user

@app.get("/api/admin/users", tags=["Admin"])
def get_all_users(
    current_user: models.User = Depends(get_current_super_admin),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """Get all users (super admin only)"""
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users

@app.put("/api/admin/users/{user_id}/role", tags=["Admin"])
def update_user_role(
    user_id: int,
    role: str,
    current_user: models.User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Update a user's role (super admin only)"""
    if role not in ["user", "moderator", "super_admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.role = role
    db.commit()
    
    return {"message": f"User {user.username} role updated to {role}"}

@app.delete("/api/admin/users/{user_id}", tags=["Admin"])
def delete_user(
    user_id: int,
    current_user: models.User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Delete a user (super admin only)"""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    
    return {"message": f"User {user.username} deleted"}

@app.get("/api/admin/stats", tags=["Admin"])
def get_platform_stats(
    current_user: models.User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Get platform statistics (super admin only)"""
    from sqlalchemy import func
    
    total_users = db.query(models.User).count()
    total_issues = db.query(models.Issue).count()
    total_comments = db.query(models.Comment).count()
    total_votes = db.query(models.Vote).count()
    total_elections = db.query(models.Election).count()
    
    # Users by role
    users_by_role = db.query(
        models.User.role, 
        func.count(models.User.id)
    ).group_by(models.User.role).all()
    
    # Recent activity (last 7 days)
    from datetime import datetime, timedelta
    week_ago = datetime.utcnow() - timedelta(days=7)
    
    recent_issues = db.query(models.Issue).filter(
        models.Issue.created_at >= week_ago
    ).count()
    
    recent_comments = db.query(models.Comment).filter(
        models.Comment.created_at >= week_ago
    ).count()
    
    return {
        "total_users": total_users,
        "total_issues": total_issues,
        "total_comments": total_comments,
        "total_votes": total_votes,
        "total_elections": total_elections,
        "users_by_role": dict(users_by_role),
        "recent_activity": {
            "issues": recent_issues,
            "comments": recent_comments,
            "period": "last_7_days"
        }
    }

# ============ USER PROFILE ENDPOINTS ============

@app.get("/api/user/profile", response_model=schemas.UserResponse, tags=["User Profile"])
def get_user_profile(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Get current user's profile"""
    # Get constituency name if exists
    result = {
        "id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "role": current_user.role,
        "moderates_constituency_id": current_user.moderates_constituency_id,
        "constituency_id": current_user.constituency_id,
        "constituency_name": current_user.constituency.name if current_user.constituency else None
    }
    return result

@app.put("/api/user/profile", tags=["User Profile"])
def update_user_profile(
    profile_data: schemas.UserUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Update user profile (username, constituency)"""
    if profile_data.username:
        # Check if username is taken
        existing = db.query(models.User).filter(
            models.User.username == profile_data.username,
            models.User.id != current_user.id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
        current_user.username = profile_data.username
    
    if profile_data.constituency_id:
        # Verify constituency exists
        constituency = db.query(models.Constituency).filter(
            models.Constituency.id == profile_data.constituency_id
        ).first()
        if not constituency:
            raise HTTPException(status_code=404, detail="Constituency not found")
        current_user.constituency_id = profile_data.constituency_id
    
    db.commit()
    db.refresh(current_user)
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "role": current_user.role,
        "constituency_id": current_user.constituency_id,
        "constituency_name": current_user.constituency.name if current_user.constituency else None
    }

@app.get("/api/user/eligible-constituencies", tags=["User Profile"])
def get_eligible_constituencies(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get constituencies the user can select (all for now, could be location-based)"""
    constituencies = db.query(models.Constituency).all()
    return [{"id": c.id, "name": c.name, "country": c.country.name} for c in constituencies]

# ============ NOTIFICATION ENDPOINTS ============

@app.get("/api/notifications", tags=["Notifications"])
def get_notifications(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50,
    skip: int = 0
):
    """Get user's notifications"""
    notifications = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    ).order_by(models.Notification.created_at.desc()).offset(skip).limit(limit).all()
    return notifications

@app.put("/api/notifications/{notification_id}/read", tags=["Notifications"])
def mark_notification_read(
    notification_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a notification as read"""
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == current_user.id
    ).first()
    if notification:
        notification.is_read = True
        db.commit()
    return {"success": True}

@app.put("/api/notifications/read-all", tags=["Notifications"])
def mark_all_notifications_read(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read"""
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"success": True}

@app.get("/api/public/constituencies", tags=["Constituencies"])
def get_public_constituencies(db: Session = Depends(get_db)):
    """Get all constituencies publicly - used for registration"""
    constituencies = db.query(models.Constituency).all()
    return [{"id": c.id, "name": c.name, "country": c.country.name} for c in constituencies]