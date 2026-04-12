from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, Enum, Boolean
from sqlalchemy.orm import relationship
from .database import Base
import datetime

class Country(Base):
    __tablename__ = "countries"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    code = Column(String, unique=True)

class Constituency(Base):
    __tablename__ = "constituencies"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    country_id = Column(Integer, ForeignKey("countries.id"))
    country = relationship("Country")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    # RBAC Field: "user" or "moderator"
    role = Column(String, default="user")
    # Which constituency they moderate (NULL if they are a regular user)
    moderates_constituency_id = Column(Integer, ForeignKey("constituencies.id"), nullable=True)  # Added comma
    issues = relationship("Issue", back_populates="author")
    comments = relationship("Comment", back_populates="author")
    votes = relationship("Vote", back_populates="user")
    
class Issue(Base):
    __tablename__ = "issues"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    constituency_id = Column(Integer, ForeignKey("constituencies.id"))
    author = relationship("User", back_populates="issues")
    comments = relationship("Comment", back_populates="issue")

class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    issue_id = Column(Integer, ForeignKey("issues.id"))
    author = relationship("User", back_populates="comments")
    issue = relationship("Issue", back_populates="comments")

class Vote(Base):
    __tablename__ = "votes"
    id = Column(Integer, primary_key=True, index=True)
    # vote_type: 1 = For, 0 = Neutral, -1 = Against
    vote_type = Column(Integer)
    user_id = Column(Integer, ForeignKey("users.id"))
    issue_id = Column(Integer, ForeignKey("issues.id"))
    user = relationship("User", back_populates="votes")  # Added this relationship
    issue = relationship("Issue")  # Optional: to get vote's issue