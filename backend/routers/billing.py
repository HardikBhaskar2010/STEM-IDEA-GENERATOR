"""
Billing router.

Endpoints for managing subscriptions and quotas.
"""

import logging
from typing import Dict, Any

from fastapi import APIRouter, Depends
from backend.core.dependencies import get_authenticated_user_id
from backend.services.billing_service import upgrade_user_to_pro

logger = logging.getLogger(__name__)

billing_router = APIRouter(prefix="/api/billing", tags=["billing"])

@billing_router.post("/upgrade")
async def upgrade_to_pro(user_id: str = Depends(get_authenticated_user_id)) -> Dict[str, Any]:
    """
    Mock endpoint to upgrade the authenticated user to Pro plan.
    In a real Razorpay flow, this would create an order id and return it to the frontend.
    """
    await upgrade_user_to_pro(user_id)
    return {"status": "success", "message": "Upgraded to Pro successfully"}
