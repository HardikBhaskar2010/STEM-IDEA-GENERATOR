# achievement_routes.py - API routes for Achievement System
# This module handles achievement tracking, unlocking, and progress

import os
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment variables")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Create router
achievement_router = APIRouter(prefix="/api/achievements", tags=["Achievements"])

# =====================================================
# PYDANTIC MODELS
# =====================================================

class Achievement(BaseModel):
    id: str
    code: str
    title: str
    description: str
    category: str
    tier: str
    icon_emoji: str
    xp_reward: int
    points_reward: int
    unlock_condition: Dict[str, Any]
    requires_team: bool
    prerequisite_achievement_code: Optional[str] = None
    display_order: int
    is_unlocked: bool = False
    unlocked_at: Optional[str] = None
    progress: Optional[Dict[str, Any]] = None

class AchievementStats(BaseModel):
    total_achievements: int
    unlocked_achievements: int
    bronze_count: int
    silver_count: int
    gold_count: int
    platinum_count: int
    total_xp_from_achievements: int
    total_points_from_achievements: int
    completion_percentage: float

class AchievementUnlockRequest(BaseModel):
    user_id: str
    achievement_code: str

class AchievementProgressUpdate(BaseModel):
    user_id: str
    achievement_code: str
    current_value: int

# =====================================================
# HELPER FUNCTIONS
# =====================================================

async def check_prerequisite(user_id: str, prerequisite_code: Optional[str]) -> bool:
    """Check if user has unlocked prerequisite achievement"""
    if not prerequisite_code:
        return True
    
    try:
        result = supabase.table("user_achievements_detailed").select("code").eq("user_id", user_id).eq("code", prerequisite_code).execute()
        return len(result.data) > 0
    except Exception as e:
        print(f"Error checking prerequisite: {e}")
        return False

async def get_user_team_status(user_id: str) -> bool:
    """Check if user is in a team"""
    try:
        result = supabase.table("team_members").select("team_id").eq("user_id", user_id).execute()
        return len(result.data) > 0
    except:
        return False

async def calculate_achievement_progress(user_id: str, achievement: Dict) -> Optional[Dict[str, Any]]:
    """Calculate progress towards achievement based on condition"""
    try:
        condition = achievement.get("unlock_condition", {})
        condition_type = condition.get("type")
        target_value = condition.get("value", 0)
        
        current_value = 0
        
        if condition_type == "project_generated":
            # Count generated projects (from user_activities or another tracking table)
            result = supabase.table("projects").select("id", count="exact").eq("user_id", user_id).execute()
            current_value = result.count or 0
        
        elif condition_type == "project_saved":
            result = supabase.table("projects").select("id", count="exact").eq("user_id", user_id).execute()
            current_value = result.count or 0
        
        elif condition_type == "submission_count":
            result = supabase.table("idea_submissions").select("id", count="exact").eq("user_id", user_id).execute()
            current_value = result.count or 0
        
        elif condition_type == "upvote_received":
            # Get all submissions and count votes
            submissions = supabase.table("idea_submissions").select("id").eq("user_id", user_id).execute()
            total_votes = 0
            for sub in submissions.data:
                votes = supabase.table("idea_votes").select("id", count="exact").eq("submission_id", sub["id"]).execute()
                total_votes += votes.count or 0
            current_value = total_votes
        
        elif condition_type == "upvotes_given":
            result = supabase.table("idea_votes").select("id", count="exact").eq("voter_id", user_id).execute()
            current_value = result.count or 0
        
        elif condition_type == "level_reached":
            result = supabase.table("user_levels").select("level_number").eq("user_id", user_id).single().execute()
            if result.data:
                current_value = result.data.get("level_number", 0)
        
        elif condition_type == "streak_days":
            result = supabase.table("user_levels").select("streak_days").eq("user_id", user_id).single().execute()
            if result.data:
                current_value = result.data.get("streak_days", 0)
        
        elif condition_type == "profile_complete":
            result = supabase.table("profiles").select("username, bio, interests").eq("user_id", user_id).single().execute()
            if result.data:
                profile = result.data
                if profile.get("username") and profile.get("bio") and len(profile.get("interests", [])) > 0:
                    current_value = 1
                    target_value = 1
        
        elif condition_type == "profile_advanced":
            result = supabase.table("profiles").select("username, bio, interests, avatar_url").eq("user_id", user_id).single().execute()
            if result.data:
                profile = result.data
                if (profile.get("username") and profile.get("bio") and 
                    len(profile.get("interests", [])) >= 5 and profile.get("avatar_url")):
                    current_value = 1
                    target_value = 1
        
        if target_value > 0:
            return {
                "current": current_value,
                "target": target_value,
                "percentage": min(100, int((current_value / target_value) * 100))
            }
        
        return None
    
    except Exception as e:
        print(f"Error calculating progress: {e}")
        return None

# =====================================================
# ACHIEVEMENT ENDPOINTS
# =====================================================

@achievement_router.get("/all")
async def get_all_achievements():
    """Get all available achievements"""
    try:
        result = supabase.table("achievements").select("*").eq("is_active", True).order("display_order").execute()
        return {"success": True, "achievements": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get achievements: {str(e)}")

@achievement_router.get("/user/{user_id}")
async def get_user_achievements(user_id: str):
    """Get all achievements with user's unlock status and progress"""
    try:
        # Get all achievements
        all_achievements = supabase.table("achievements").select("*").eq("is_active", True).order("display_order").execute()
        
        # Get user's unlocked achievements
        unlocked = supabase.table("user_achievements_detailed").select("*").eq("user_id", user_id).execute()
        unlocked_codes = {ach["code"]: ach for ach in unlocked.data}
        
        # Check if user is in a team
        in_team = await get_user_team_status(user_id)
        
        # Build response with unlock status and progress
        achievements_with_status = []
        for ach in all_achievements.data:
            code = ach["code"]
            is_unlocked = code in unlocked_codes
            
            # Check if achievement is accessible
            requires_team = ach.get("requires_team", False)
            prerequisite = ach.get("prerequisite_achievement_code")
            
            is_locked = False
            lock_reason = None
            
            if requires_team and not in_team:
                is_locked = True
                lock_reason = "Requires team membership"
            elif prerequisite and not await check_prerequisite(user_id, prerequisite):
                is_locked = True
                lock_reason = f"Requires unlocking: {prerequisite}"
            
            # Calculate progress if not unlocked
            progress = None
            if not is_unlocked and not is_locked:
                progress = await calculate_achievement_progress(user_id, ach)
            
            achievement_data = {
                **ach,
                "is_unlocked": is_unlocked,
                "unlocked_at": unlocked_codes[code]["unlocked_at"] if is_unlocked else None,
                "is_locked": is_locked,
                "lock_reason": lock_reason,
                "progress": progress
            }
            
            achievements_with_status.append(achievement_data)
        
        return {"success": True, "achievements": achievements_with_status}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user achievements: {str(e)}")

@achievement_router.get("/user/{user_id}/stats")
async def get_user_achievement_stats(user_id: str):
    """Get user's achievement statistics"""
    try:
        # Use the database function
        result = supabase.rpc("get_user_achievement_stats", {"p_user_id": user_id}).execute()
        
        if result.data and len(result.data) > 0:
            stats = result.data[0]
            total = stats.get("total_achievements", 1)
            unlocked = stats.get("unlocked_achievements", 0)
            completion = (unlocked / total * 100) if total > 0 else 0
            
            return {
                "success": True,
                "stats": {
                    **stats,
                    "completion_percentage": round(completion, 1)
                }
            }
        
        return {
            "success": True,
            "stats": {
                "total_achievements": 0,
                "unlocked_achievements": 0,
                "bronze_count": 0,
                "silver_count": 0,
                "gold_count": 0,
                "platinum_count": 0,
                "total_xp_from_achievements": 0,
                "total_points_from_achievements": 0,
                "completion_percentage": 0
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")

@achievement_router.post("/unlock")
async def unlock_achievement(request: AchievementUnlockRequest):
    """Manually unlock an achievement (for specific triggers)"""
    try:
        # Use the database function
        result = supabase.rpc("check_and_award_achievement", {
            "p_user_id": request.user_id,
            "p_achievement_code": request.achievement_code
        }).execute()
        
        if result.data:
            return {
                "success": True,
                "unlocked": True,
                "message": f"Achievement '{request.achievement_code}' unlocked!"
            }
        else:
            return {
                "success": True,
                "unlocked": False,
                "message": "Achievement already unlocked or not found"
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to unlock achievement: {str(e)}")

@achievement_router.post("/check-and-unlock/{user_id}")
async def check_and_unlock_achievements(user_id: str):
    """Check all achievements and auto-unlock eligible ones"""
    try:
        unlocked_count = 0
        newly_unlocked = []
        
        # Get all achievements
        all_achievements = supabase.table("achievements").select("*").eq("is_active", True).execute()
        
        # Get already unlocked
        unlocked = supabase.table("user_achievements_detailed").select("code").eq("user_id", user_id).execute()
        unlocked_codes = {ach["code"] for ach in unlocked.data}
        
        # Check if user is in team
        in_team = await get_user_team_status(user_id)
        
        for ach in all_achievements.data:
            code = ach["code"]
            
            # Skip if already unlocked
            if code in unlocked_codes:
                continue
            
            # Skip if requires team and user not in team
            if ach.get("requires_team") and not in_team:
                continue
            
            # Check prerequisite
            if ach.get("prerequisite_achievement_code"):
                if not await check_prerequisite(user_id, ach["prerequisite_achievement_code"]):
                    continue
            
            # Check condition
            progress = await calculate_achievement_progress(user_id, ach)
            if progress and progress["current"] >= progress["target"]:
                # Unlock achievement
                result = supabase.rpc("check_and_award_achievement", {
                    "p_user_id": user_id,
                    "p_achievement_code": code
                }).execute()
                
                if result.data:
                    unlocked_count += 1
                    newly_unlocked.append({
                        "code": code,
                        "title": ach["title"],
                        "tier": ach["tier"],
                        "xp_reward": ach["xp_reward"],
                        "points_reward": ach["points_reward"]
                    })
        
        return {
            "success": True,
            "unlocked_count": unlocked_count,
            "newly_unlocked": newly_unlocked
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check achievements: {str(e)}")

@achievement_router.get("/recent-unlocks/{user_id}")
async def get_recent_unlocks(user_id: str, limit: int = 10):
    """Get recently unlocked achievements for a user"""
    try:
        result = supabase.table("user_achievements_detailed").select("*").eq("user_id", user_id).order("unlocked_at", desc=True).limit(limit).execute()
        
        return {
            "success": True,
            "recent_unlocks": result.data
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get recent unlocks: {str(e)}")

@achievement_router.get("/leaderboard")
async def get_achievement_leaderboard(limit: int = 50):
    """Get leaderboard of users by achievement count"""
    try:
        # Get users with most achievements
        result = supabase.table("user_achievements").select("user_id").execute()
        
        # Count achievements per user
        user_counts = {}
        for record in result.data:
            user_id = record["user_id"]
            user_counts[user_id] = user_counts.get(user_id, 0) + 1
        
        # Sort by count
        sorted_users = sorted(user_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
        
        # Build leaderboard with user info
        leaderboard = []
        for rank, (user_id, count) in enumerate(sorted_users, 1):
            # Get user profile
            profile_result = supabase.table("profiles").select("username, avatar_url").eq("user_id", user_id).execute()
            profile = profile_result.data[0] if profile_result.data else {}
            
            # Get achievement stats
            stats_result = supabase.rpc("get_user_achievement_stats", {"p_user_id": user_id}).execute()
            stats = stats_result.data[0] if stats_result.data else {}
            
            leaderboard.append({
                "rank": rank,
                "user_id": user_id,
                "username": profile.get("username", "Anonymous"),
                "avatar_url": profile.get("avatar_url"),
                "achievement_count": count,
                "bronze_count": stats.get("bronze_count", 0),
                "silver_count": stats.get("silver_count", 0),
                "gold_count": stats.get("gold_count", 0),
                "platinum_count": stats.get("platinum_count", 0)
            })
        
        return {
            "success": True,
            "leaderboard": leaderboard
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get leaderboard: {str(e)}")
