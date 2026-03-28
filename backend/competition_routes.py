# competition_routes.py - API routes for STEM Competition Platform
# This module handles teams, submissions, leaderboards, and points/XP system

import os
import random
import string
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from supabase import create_client, Client

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment variables")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Create router
competition_router = APIRouter(prefix="/api/competition", tags=["Competition"])

# =====================================================
# PYDANTIC MODELS
# =====================================================

class TeamCreateRequest(BaseModel):
    name: str
    school_name: Optional[str] = None
    teacher_id: str  # UUID of the teacher (from auth.users)

class TeamCreateResponse(BaseModel):
    success: bool
    team_id: str
    team_code: str
    message: str

class TeamJoinRequest(BaseModel):
    team_code: str
    user_id: str  # UUID of the student joining
    role: str = "student"  # Default to student

class TeamJoinResponse(BaseModel):
    success: bool
    team_id: str
    team_name: str
    message: str

class TeamInfoResponse(BaseModel):
    team_id: str
    team_name: str
    school_name: Optional[str]
    team_code: str
    member_count: int
    role: str  # user's role in the team

class SubmissionCreateRequest(BaseModel):
    user_id: str
    team_id: str
    title: str
    description: str
    category: str
    generated_project: Optional[Dict[str, Any]] = None
    is_manual: bool = False

class SubmissionResponse(BaseModel):
    success: bool
    submission_id: str
    points_awarded: int
    xp_gained: int
    new_level: Optional[str] = None
    message: str

class SubmissionDetail(BaseModel):
    id: str
    title: str
    description: str
    category: str
    points: int
    vote_count: int
    submitted_at: str
    user_id: str
    team_id: str
    is_manual: bool

class UpvoteRequest(BaseModel):
    submission_id: str
    voter_id: str

class UpvoteResponse(BaseModel):
    success: bool
    points_awarded_to_author: int
    message: str

class UserProgressResponse(BaseModel):
    user_id: str
    current_level: str
    level_number: int
    total_xp: int
    total_points: int
    streak_days: int
    xp_to_next_level: int
    submissions_count: int
    votes_received: int

class LeaderboardEntry(BaseModel):
    user_id: str
    username: Optional[str] = "Anonymous"
    total_points: int
    current_level: str
    team_name: Optional[str] = None
    submission_count: int
    rank: int

class ConsistencyLeaderboardEntry(BaseModel):
    user_id: str
    username: Optional[str] = "Anonymous"
    streak_days: int
    total_points: int
    current_level: str
    team_name: Optional[str] = None
    last_activity_date: str
    rank: int

class TeamLeaderboardEntry(BaseModel):
    team_id: str
    team_name: str
    school_name: Optional[str] = None
    member_count: int
    total_submissions: int
    total_team_points: int
    avg_points_per_member: float
    rank: int

# =====================================================
# HELPER FUNCTIONS
# =====================================================

def generate_team_code() -> str:
    """Generate a unique team code like STEM-ABC123"""
    letters = ''.join(random.choices(string.ascii_uppercase, k=3))
    numbers = ''.join(random.choices(string.digits, k=3))
    return f"STEM-{letters}{numbers}"

def calculate_xp_to_next_level(current_xp: int) -> int:
    """Calculate XP needed to reach next level"""
    if current_xp >= 1000:
        return 0  # Max level
    elif current_xp >= 600:
        return 1000 - current_xp
    elif current_xp >= 300:
        return 600 - current_xp
    elif current_xp >= 100:
        return 300 - current_xp
    else:
        return 100 - current_xp

async def initialize_user_level(user_id: str):
    """Initialize user level record if it doesn't exist"""
    try:
        # Check if user level exists
        result = supabase.table("user_levels").select("*").eq("user_id", user_id).execute()
        
        if not result.data:
            # Create initial level record
            supabase.table("user_levels").insert({
                "user_id": user_id,
                "current_level": "Explorer",
                "level_number": 1,
                "total_xp": 0,
                "total_points": 0,
                "streak_days": 0,
                "last_activity_date": None
            }).execute()
    except Exception as e:
        print(f"Error initializing user level: {e}")

async def update_user_points_and_xp(user_id: str, points: int, activity_type: str, related_submission_id: Optional[str] = None):
    """Update user points, XP, streak, and level"""
    try:
        # Initialize user level if needed
        await initialize_user_level(user_id)
        
        # Get current user level data
        result = supabase.table("user_levels").select("*").eq("user_id", user_id).single().execute()
        current_data = result.data
        
        # Calculate new totals
        new_total_points = current_data["total_points"] + points
        new_total_xp = current_data["total_xp"] + points  # 1 point = 1 XP
        
        # Update streak
        today = date.today()
        last_activity = current_data.get("last_activity_date")
        
        if last_activity:
            last_date = datetime.strptime(last_activity, "%Y-%m-%d").date() if isinstance(last_activity, str) else last_activity
            days_diff = (today - last_date).days
            
            if days_diff == 0:
                # Same day, keep streak
                new_streak = current_data["streak_days"]
            elif days_diff == 1:
                # Consecutive day, increment streak
                new_streak = current_data["streak_days"] + 1
            else:
                # Gap, reset streak
                new_streak = 1
        else:
            # First activity
            new_streak = 1
        
        # Update user_levels table
        supabase.table("user_levels").update({
            "total_points": new_total_points,
            "total_xp": new_total_xp,
            "streak_days": new_streak,
            "last_activity_date": today.isoformat()
        }).eq("user_id", user_id).execute()
        
        # Record activity
        supabase.table("user_activities").insert({
            "user_id": user_id,
            "activity_type": activity_type,
            "points_value": points,
            "related_submission_id": related_submission_id
        }).execute()
        
        # Get updated level info
        updated_result = supabase.table("user_levels").select("*").eq("user_id", user_id).single().execute()
        updated_data = updated_result.data
        
        return {
            "new_total_points": new_total_points,
            "new_total_xp": new_total_xp,
            "new_level": updated_data["current_level"],
            "level_changed": updated_data["current_level"] != current_data["current_level"]
        }
        
    except Exception as e:
        print(f"Error updating user points and XP: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update points: {str(e)}")

# =====================================================
# TEAM MANAGEMENT ENDPOINTS
# =====================================================

@competition_router.post("/teams/create", response_model=TeamCreateResponse)
async def create_team(request: TeamCreateRequest):
    """Teacher creates a new team and gets a join code"""
    try:
        # Generate unique team code
        team_code = generate_team_code()
        
        # Check if code already exists (very unlikely but handle it)
        while True:
            existing = supabase.table("teams").select("id").eq("code", team_code).execute()
            if not existing.data:
                break
            team_code = generate_team_code()
        
        # Create team
        team_result = supabase.table("teams").insert({
            "name": request.name,
            "code": team_code,
            "school_name": request.school_name,
            "teacher_id": request.teacher_id
        }).execute()
        
        team_id = team_result.data[0]["id"]
        
        # Add teacher to team_members
        supabase.table("team_members").insert({
            "user_id": request.teacher_id,
            "team_id": team_id,
            "role": "teacher"
        }).execute()
        
        return TeamCreateResponse(
            success=True,
            team_id=team_id,
            team_code=team_code,
            message=f"Team '{request.name}' created successfully! Share code: {team_code}"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create team: {str(e)}")

@competition_router.post("/teams/join", response_model=TeamJoinResponse)
async def join_team(request: TeamJoinRequest):
    """Student joins a team using a team code"""
    try:
        # Find team by code
        team_result = supabase.table("teams").select("*").eq("code", request.team_code).execute()
        
        if not team_result.data:
            raise HTTPException(status_code=404, detail="Invalid team code")
        
        team = team_result.data[0]
        team_id = team["id"]
        
        # Check if user is already in this team
        existing_member = supabase.table("team_members").select("*").eq("user_id", request.user_id).eq("team_id", team_id).execute()
        
        if existing_member.data:
            return TeamJoinResponse(
                success=True,
                team_id=team_id,
                team_name=team["name"],
                message="You are already a member of this team"
            )
        
        # Add user to team
        supabase.table("team_members").insert({
            "user_id": request.user_id,
            "team_id": team_id,
            "role": request.role
        }).execute()
        
        # Initialize user level if needed
        await initialize_user_level(request.user_id)
        
        return TeamJoinResponse(
            success=True,
            team_id=team_id,
            team_name=team["name"],
            message=f"Successfully joined team '{team['name']}'!"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to join team: {str(e)}")

@competition_router.get("/teams/my-team/{user_id}", response_model=TeamInfoResponse)
async def get_my_team(user_id: str):
    """Get the team info for a user"""
    try:
        # Get user's team membership
        member_result = supabase.table("team_members").select("team_id, role").eq("user_id", user_id).execute()
        
        if not member_result.data:
            raise HTTPException(status_code=404, detail="You are not part of any team")
        
        team_id = member_result.data[0]["team_id"]
        role = member_result.data[0]["role"]
        
        # Get team details
        team_result = supabase.table("teams").select("*").eq("id", team_id).single().execute()
        team = team_result.data
        
        # Count members
        members_result = supabase.table("team_members").select("user_id", count="exact").eq("team_id", team_id).execute()
        member_count = members_result.count
        
        return TeamInfoResponse(
            team_id=team["id"],
            team_name=team["name"],
            school_name=team.get("school_name"),
            team_code=team["code"],
            member_count=member_count,
            role=role
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get team info: {str(e)}")

@competition_router.get("/teams/{team_id}/members")
async def get_team_members(team_id: str):
    """Get all members of a team (for teachers)"""
    try:
        # Get team members with user level info
        members_result = supabase.table("team_members").select(
            "user_id, role, joined_at"
        ).eq("team_id", team_id).execute()
        
        members = []
        for member in members_result.data:
            # Get user level info
            level_result = supabase.table("user_levels").select("*").eq("user_id", member["user_id"]).execute()
            level_data = level_result.data[0] if level_result.data else {
                "current_level": "Explorer",
                "total_points": 0,
                "total_xp": 0
            }
            
            members.append({
                "user_id": member["user_id"],
                "role": member["role"],
                "joined_at": member["joined_at"],
                "current_level": level_data["current_level"],
                "total_points": level_data["total_points"],
                "total_xp": level_data["total_xp"]
            })
        
        return {"success": True, "members": members}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get team members: {str(e)}")

# =====================================================
# SUBMISSION ENDPOINTS
# =====================================================

@competition_router.post("/submissions/create", response_model=SubmissionResponse)
async def create_submission(request: SubmissionCreateRequest):
    """Submit a new idea to the competition"""
    try:
        # Create submission
        submission_result = supabase.table("idea_submissions").insert({
            "user_id": request.user_id,
            "team_id": request.team_id,
            "title": request.title,
            "description": request.description,
            "category": request.category,
            "generated_project": request.generated_project,
            "is_manual": request.is_manual,
            "points": 10  # Base submission points
        }).execute()
        
        submission_id = submission_result.data[0]["id"]
        
        # Award points and XP
        points_awarded = 10
        update_result = await update_user_points_and_xp(
            request.user_id, 
            points_awarded, 
            "submit",
            submission_id
        )
        
        return SubmissionResponse(
            success=True,
            submission_id=submission_id,
            points_awarded=points_awarded,
            xp_gained=points_awarded,
            new_level=update_result["new_level"] if update_result["level_changed"] else None,
            message="Idea submitted successfully! You earned 10 points!"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create submission: {str(e)}")

@competition_router.get("/submissions/my-submissions/{user_id}")
async def get_my_submissions(user_id: str):
    """Get all submissions by a user"""
    try:
        result = supabase.table("idea_submissions").select("*").eq("user_id", user_id).order("submitted_at", desc=True).execute()
        
        # Get vote counts for each submission
        submissions = []
        for sub in result.data:
            votes_result = supabase.table("idea_votes").select("id", count="exact").eq("submission_id", sub["id"]).execute()
            sub["vote_count"] = votes_result.count
            submissions.append(sub)
        
        return {"success": True, "submissions": submissions}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get submissions: {str(e)}")

@competition_router.get("/submissions/team/{team_id}")
async def get_team_submissions(team_id: str, limit: int = 50):
    """Get all submissions for a team"""
    try:
        result = supabase.table("idea_submissions").select("*").eq("team_id", team_id).order("submitted_at", desc=True).limit(limit).execute()
        
        # Get vote counts for each submission
        submissions = []
        for sub in result.data:
            votes_result = supabase.table("idea_votes").select("id", count="exact").eq("submission_id", sub["id"]).execute()
            sub["vote_count"] = votes_result.count
            submissions.append(sub)
        
        return {"success": True, "submissions": submissions}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get team submissions: {str(e)}")

@competition_router.post("/submissions/upvote", response_model=UpvoteResponse)
async def upvote_submission(request: UpvoteRequest):
    """Upvote a submission (awards 5 points to the author)"""
    try:
        # Check if already voted
        existing_vote = supabase.table("idea_votes").select("*").eq("submission_id", request.submission_id).eq("voter_id", request.voter_id).execute()
        
        if existing_vote.data:
            raise HTTPException(status_code=400, detail="You have already upvoted this submission")
        
        # Get submission to find author
        submission_result = supabase.table("idea_submissions").select("user_id").eq("id", request.submission_id).single().execute()
        author_id = submission_result.data["user_id"]
        
        # Can't upvote your own submission
        if author_id == request.voter_id:
            raise HTTPException(status_code=400, detail="You cannot upvote your own submission")
        
        # Create vote
        supabase.table("idea_votes").insert({
            "submission_id": request.submission_id,
            "voter_id": request.voter_id
        }).execute()
        
        # Award points to author
        points_awarded = 5
        await update_user_points_and_xp(
            author_id,
            points_awarded,
            "upvote",
            request.submission_id
        )
        
        return UpvoteResponse(
            success=True,
            points_awarded_to_author=points_awarded,
            message="Upvote recorded! Author earned 5 points."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upvote: {str(e)}")

# =====================================================
# PROGRESS & LEVELS ENDPOINTS
# =====================================================

@competition_router.get("/users/progress/{user_id}", response_model=UserProgressResponse)
async def get_user_progress(user_id: str):
    """Get user's current level, XP, points, and streak"""
    try:
        # Initialize if needed
        await initialize_user_level(user_id)
        
        # Get user level data
        level_result = supabase.table("user_levels").select("*").eq("user_id", user_id).single().execute()
        level_data = level_result.data
        
        # Get submission count
        submissions_result = supabase.table("idea_submissions").select("id", count="exact").eq("user_id", user_id).execute()
        submissions_count = submissions_result.count
        
        # Get votes received
        votes_result = supabase.table("idea_votes").select("v.id").eq("idea_submissions.user_id", user_id).execute()
        # Note: This requires a join, let's do it differently
        # Get all submissions and count votes
        submissions = supabase.table("idea_submissions").select("id").eq("user_id", user_id).execute()
        votes_received = 0
        for sub in submissions.data:
            votes = supabase.table("idea_votes").select("id", count="exact").eq("submission_id", sub["id"]).execute()
            votes_received += votes.count
        
        return UserProgressResponse(
            user_id=user_id,
            current_level=level_data["current_level"],
            level_number=level_data["level_number"],
            total_xp=level_data["total_xp"],
            total_points=level_data["total_points"],
            streak_days=level_data["streak_days"],
            xp_to_next_level=calculate_xp_to_next_level(level_data["total_xp"]),
            submissions_count=submissions_count,
            votes_received=votes_received
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user progress: {str(e)}")

# =====================================================
# LEADERBOARD ENDPOINTS
# =====================================================

@competition_router.get("/leaderboards/top-scorers")
async def get_top_scorers(limit: int = 20, team_id: Optional[str] = None):
    """Get top scorers leaderboard (global or team-specific)"""
    try:
        query = supabase.table("user_levels").select(
            "user_id, total_points, current_level, level_number"
        ).order("total_points", desc=True).limit(limit)
        
        if team_id:
            # Filter by team - need to join with team_members
            # This is complex in Supabase, so let's get all and filter
            all_result = query.execute()
            
            # Get team members
            team_members_result = supabase.table("team_members").select("user_id").eq("team_id", team_id).execute()
            team_member_ids = [m["user_id"] for m in team_members_result.data]
            
            # Filter results
            filtered_data = [u for u in all_result.data if u["user_id"] in team_member_ids]
            leaderboard_data = filtered_data
        else:
            result = query.execute()
            leaderboard_data = result.data
        
        # Build leaderboard with ranks
        leaderboard = []
        for idx, entry in enumerate(leaderboard_data, 1):
            # Get submission count
            submissions = supabase.table("idea_submissions").select("id", count="exact").eq("user_id", entry["user_id"]).execute()
            
            # Get team name
            team_result = supabase.table("team_members").select("team_id").eq("user_id", entry["user_id"]).execute()
            team_name = None
            if team_result.data:
                team_info = supabase.table("teams").select("name").eq("id", team_result.data[0]["team_id"]).single().execute()
                team_name = team_info.data["name"]
            
            leaderboard.append(LeaderboardEntry(
                user_id=entry["user_id"],
                total_points=entry["total_points"],
                current_level=entry["current_level"],
                team_name=team_name,
                submission_count=submissions.count,
                rank=idx
            ))
        
        return {"success": True, "leaderboard": leaderboard}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get leaderboard: {str(e)}")

@competition_router.get("/leaderboards/consistency")
async def get_consistency_leaderboard(limit: int = 20):
    """Get most consistent users (by streak)"""
    try:
        result = supabase.table("user_levels").select(
            "user_id, streak_days, total_points, current_level, last_activity_date"
        ).gt("streak_days", 0).order("streak_days", desc=True).order("total_points", desc=True).limit(limit).execute()
        
        leaderboard = []
        for idx, entry in enumerate(result.data, 1):
            # Get team name
            team_result = supabase.table("team_members").select("team_id").eq("user_id", entry["user_id"]).execute()
            team_name = None
            if team_result.data:
                team_info = supabase.table("teams").select("name").eq("id", team_result.data[0]["team_id"]).single().execute()
                team_name = team_info.data["name"]
            
            leaderboard.append(ConsistencyLeaderboardEntry(
                user_id=entry["user_id"],
                streak_days=entry["streak_days"],
                total_points=entry["total_points"],
                current_level=entry["current_level"],
                team_name=team_name,
                last_activity_date=entry["last_activity_date"] or "",
                rank=idx
            ))
        
        return {"success": True, "leaderboard": leaderboard}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get consistency leaderboard: {str(e)}")

@competition_router.get("/leaderboards/teams")
async def get_team_leaderboard(limit: int = 20):
    """Get team rankings"""
    try:
        # Get all teams
        teams_result = supabase.table("teams").select("*").limit(limit).execute()
        
        leaderboard = []
        for team in teams_result.data:
            team_id = team["id"]
            
            # Count members
            members_result = supabase.table("team_members").select("user_id", count="exact").eq("team_id", team_id).execute()
            member_count = members_result.count
            member_ids = [m["user_id"] for m in members_result.data]
            
            # Count submissions
            submissions_result = supabase.table("idea_submissions").select("id", count="exact").eq("team_id", team_id).execute()
            total_submissions = submissions_result.count
            
            # Calculate total team points
            total_team_points = 0
            for member_id in member_ids:
                level_result = supabase.table("user_levels").select("total_points").eq("user_id", member_id).execute()
                if level_result.data:
                    total_team_points += level_result.data[0]["total_points"]
            
            avg_points = total_team_points / member_count if member_count > 0 else 0
            
            leaderboard.append({
                "team_id": team_id,
                "team_name": team["name"],
                "school_name": team.get("school_name"),
                "member_count": member_count,
                "total_submissions": total_submissions,
                "total_team_points": total_team_points,
                "avg_points_per_member": round(avg_points, 2)
            })
        
        # Sort by total team points
        leaderboard.sort(key=lambda x: x["total_team_points"], reverse=True)
        
        # Add ranks
        for idx, entry in enumerate(leaderboard, 1):
            entry["rank"] = idx
        
        return {"success": True, "leaderboard": leaderboard}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get team leaderboard: {str(e)}")

# =====================================================
# DAILY ACTIVITY BONUS (can be called by cron or manually)
# =====================================================

@competition_router.post("/activities/daily-bonus/{user_id}")
async def award_daily_bonus(user_id: str):
    """Award daily activity bonus (5 points) - called once per day"""
    try:
        # Check if already awarded today
        today = date.today()
        result = supabase.table("user_activities").select("*").eq("user_id", user_id).eq("activity_type", "daily").gte("timestamp", today.isoformat()).execute()
        
        if result.data:
            return {"success": False, "message": "Daily bonus already awarded today"}
        
        # Award daily bonus
        points_awarded = 5
        await update_user_points_and_xp(user_id, points_awarded, "daily")
        
        return {
            "success": True,
            "points_awarded": points_awarded,
            "message": "Daily activity bonus awarded!"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to award daily bonus: {str(e)}")

# =====================================================
# ADDITIONAL ENDPOINTS FOR COMPLETE FUNCTIONALITY
# =====================================================

@competition_router.get("/submissions/all")
async def get_all_submissions(limit: int = 50, skip: int = 0, category: Optional[str] = None):
    """Get all submissions (global feed) with optional category filter"""
    try:
        query = supabase.table("idea_submissions").select("*").order("submitted_at", desc=True).range(skip, skip + limit - 1)
        
        if category:
            query = query.eq("category", category)
        
        result = query.execute()
        
        # Get vote counts for each submission
        submissions = []
        for sub in result.data:
            votes_result = supabase.table("idea_votes").select("id", count="exact").eq("submission_id", sub["id"]).execute()
            sub["vote_count"] = votes_result.count
            submissions.append(sub)
        
        return {"success": True, "submissions": submissions, "count": len(submissions)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get submissions: {str(e)}")

@competition_router.get("/submissions/{submission_id}")
async def get_submission_by_id(submission_id: str):
    """Get a specific submission by ID with full details"""
    try:
        # Get submission
        submission_result = supabase.table("idea_submissions").select("*").eq("id", submission_id).single().execute()
        submission = submission_result.data
        
        # Get vote count
        votes_result = supabase.table("idea_votes").select("id", count="exact").eq("submission_id", submission_id).execute()
        submission["vote_count"] = votes_result.count
        
        # Get team info
        team_result = supabase.table("teams").select("name, school_name").eq("id", submission["team_id"]).single().execute()
        submission["team_info"] = team_result.data
        
        # Get user level info
        level_result = supabase.table("user_levels").select("current_level, total_points").eq("user_id", submission["user_id"]).execute()
        if level_result.data:
            submission["user_level"] = level_result.data[0]
        
        return {"success": True, "submission": submission}
        
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Submission not found: {str(e)}")

@competition_router.delete("/submissions/{submission_id}")
async def delete_submission(submission_id: str, user_id: str):
    """Delete a submission (only by the author)"""
    try:
        # Verify ownership
        submission_result = supabase.table("idea_submissions").select("user_id").eq("id", submission_id).single().execute()
        
        if submission_result.data["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="You can only delete your own submissions")
        
        # Delete the submission
        supabase.table("idea_submissions").delete().eq("id", submission_id).execute()
        
        return {"success": True, "message": "Submission deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete submission: {str(e)}")

@competition_router.post("/teams/leave")
async def leave_team(user_id: str):
    """User leaves their current team"""
    try:
        # Check if user is in a team
        member_result = supabase.table("team_members").select("team_id, role").eq("user_id", user_id).execute()
        
        if not member_result.data:
            raise HTTPException(status_code=404, detail="You are not part of any team")
        
        team_id = member_result.data[0]["team_id"]
        role = member_result.data[0]["role"]
        
        # Teachers cannot leave their own teams
        if role == "teacher":
            team_result = supabase.table("teams").select("teacher_id").eq("id", team_id).single().execute()
            if team_result.data["teacher_id"] == user_id:
                raise HTTPException(status_code=400, detail="Team creators cannot leave their own team. Delete the team instead.")
        
        # Remove from team
        supabase.table("team_members").delete().eq("user_id", user_id).eq("team_id", team_id).execute()
        
        return {"success": True, "message": "Successfully left the team"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to leave team: {str(e)}")

@competition_router.delete("/teams/{team_id}")
async def delete_team(team_id: str, user_id: str):
    """Delete a team (only by the teacher who created it)"""
    try:
        # Verify ownership
        team_result = supabase.table("teams").select("teacher_id").eq("id", team_id).single().execute()
        
        if team_result.data["teacher_id"] != user_id:
            raise HTTPException(status_code=403, detail="Only the team creator can delete the team")
        
        # Delete team (cascade will handle team_members and submissions)
        supabase.table("teams").delete().eq("id", team_id).execute()
        
        return {"success": True, "message": "Team deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete team: {str(e)}")

@competition_router.get("/teams/validate-code/{team_code}")
async def validate_team_code(team_code: str):
    """Check if a team code is valid"""
    try:
        result = supabase.table("teams").select("id, name, school_name").eq("code", team_code).execute()
        
        if not result.data:
            return {"valid": False, "message": "Invalid team code"}
        
        team = result.data[0]
        return {
            "valid": True,
            "team_id": team["id"],
            "team_name": team["name"],
            "school_name": team.get("school_name"),
            "message": f"Valid code for team: {team['name']}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to validate code: {str(e)}")

@competition_router.get("/statistics/overview")
async def get_platform_statistics():
    """Get overall platform statistics for admin dashboard"""
    try:
        # Total teams
        teams_result = supabase.table("teams").select("id", count="exact").execute()
        total_teams = teams_result.count
        
        # Total users with levels
        users_result = supabase.table("user_levels").select("user_id", count="exact").execute()
        total_users = users_result.count
        
        # Total submissions
        submissions_result = supabase.table("idea_submissions").select("id", count="exact").execute()
        total_submissions = submissions_result.count
        
        # Total votes
        votes_result = supabase.table("idea_votes").select("id", count="exact").execute()
        total_votes = votes_result.count
        
        # Active users (submitted in last 7 days)
        seven_days_ago = (date.today() - timedelta(days=7)).isoformat()
        active_users_result = supabase.table("idea_submissions").select("user_id").gte("submitted_at", seven_days_ago).execute()
        active_users = len(set(sub["user_id"] for sub in active_users_result.data))
        
        # Submissions by category
        categories_result = supabase.table("idea_submissions").select("category").execute()
        categories_count = {}
        for sub in categories_result.data:
            cat = sub["category"]
            categories_count[cat] = categories_count.get(cat, 0) + 1
        
        return {
            "success": True,
            "statistics": {
                "total_teams": total_teams,
                "total_users": total_users,
                "total_submissions": total_submissions,
                "total_votes": total_votes,
                "active_users_7d": active_users,
                "submissions_by_category": categories_count
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get statistics: {str(e)}")

@competition_router.get("/activities/recent/{user_id}")
async def get_recent_activities(user_id: str, limit: int = 20):
    """Get recent activities for a user"""
    try:
        result = supabase.table("user_activities").select("*").eq("user_id", user_id).order("timestamp", desc=True).limit(limit).execute()
        
        activities = []
        for activity in result.data:
            activity_info = {
                "id": activity["id"],
                "activity_type": activity["activity_type"],
                "points_value": activity["points_value"],
                "timestamp": activity["timestamp"]
            }
            
            # Get related submission info if available
            if activity.get("related_submission_id"):
                submission_result = supabase.table("idea_submissions").select("title").eq("id", activity["related_submission_id"]).execute()
                if submission_result.data:
                    activity_info["submission_title"] = submission_result.data[0]["title"]
            
            activities.append(activity_info)
        
        return {"success": True, "activities": activities}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get activities: {str(e)}")

@competition_router.get("/users/check-team/{user_id}")
async def check_user_team_status(user_id: str):
    """Check if a user is part of a team"""
    try:
        result = supabase.table("team_members").select("team_id, role").eq("user_id", user_id).execute()
        
        if not result.data:
            return {
                "has_team": False,
                "message": "User is not part of any team"
            }
        
        team_id = result.data[0]["team_id"]
        role = result.data[0]["role"]
        
        # Get team info
        team_result = supabase.table("teams").select("name, code").eq("id", team_id).single().execute()
        
        return {
            "has_team": True,
            "team_id": team_id,
            "team_name": team_result.data["name"],
            "team_code": team_result.data["code"],
            "role": role
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check team status: {str(e)}")
