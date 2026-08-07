-- ============================================================================
-- MIGRATION 012: SaaS Billing & Quotas (No Razorpay yet)
-- ============================================================================

-- 1. Extend users table with plan and quota
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'free' CHECK (plan_tier IN ('free', 'pro')),
    ADD COLUMN IF NOT EXISTS generation_quota INT DEFAULT 5;
