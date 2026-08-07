"""
Billing service for managing SaaS plans and quotas.

Provides functions to check and consume user generation quotas.
"""

import logging
from typing import Optional

from fastapi import HTTPException
from backend.core.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


async def check_and_consume_quota(user_id: str) -> bool:
    """
    Check if the user has enough quota and consume 1 unit.
    Returns True if quota was consumed, raises HTTPException(402) if exhausted.
    For guests (user_id starts with 'guest_'), we use a mock limit of 1 for now.
    """
    if user_id.startswith("guest_"):
        # Guests get a hard limit or we rely on IP rate limits
        # For SaaS funnel, guests shouldn't have persistent quotas unless tied to IP.
        # We'll allow them 1 free generation tracked loosely or rely on rate_limiter.py
        return True
        
    client = get_supabase_client()
    try:
        # Fetch user plan and quota
        response = client.table("users").select("plan_tier, generation_quota").eq("id", user_id).single().execute()
        if not response.data:
            logger.warning(f"User {user_id} not found in users table for quota check")
            return True # Fail open if table sync issues
            
        plan_tier = response.data.get("plan_tier", "free")
        quota = response.data.get("generation_quota", 0)
        
        if plan_tier == "pro":
            return True # Unlimited for pro
            
        if quota <= 0:
            logger.warning(f"User {user_id} exhausted generation quota")
            raise HTTPException(status_code=402, detail="Generation quota exhausted. Please upgrade to Pro.")
            
        # Consume quota
        client.table("users").update({"generation_quota": quota - 1}).eq("id", user_id).execute()
        return True
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking quota for {user_id}: {e}")
        return True # Fail open on db errors

async def upgrade_user_to_pro(user_id: str) -> None:
    """Mock endpoint logic to upgrade user to Pro."""
    client = get_supabase_client()
    try:
        client.table("users").update({
            "plan_tier": "pro",
            "generation_quota": 99999
        }).eq("id", user_id).execute()
        logger.info(f"User {user_id} upgraded to pro")
    except Exception as e:
        logger.error(f"Error upgrading user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to upgrade user")
