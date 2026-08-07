-- Migration: Create effect_presets table
-- Phase 8: Preset System & Persistence

-- ============================================================================
-- TABLE: effect_presets
-- ============================================================================

CREATE TABLE IF NOT EXISTS effect_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  effects JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  thumbnail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_effect_presets_user_id
  ON effect_presets(user_id);

CREATE INDEX IF NOT EXISTS idx_effect_presets_public
  ON effect_presets(is_public)
  WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_effect_presets_name
  ON effect_presets USING gin(to_tsvector('english', name));

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE effect_presets ENABLE ROW LEVEL SECURITY;

-- Users can read their own presets
CREATE POLICY "Users can read own presets"
  ON effect_presets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Anyone can read public presets
CREATE POLICY "Anyone can read public presets"
  ON effect_presets
  FOR SELECT
  USING (is_public = true);

-- Users can insert their own presets
CREATE POLICY "Users can insert own presets"
  ON effect_presets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own presets
CREATE POLICY "Users can update own presets"
  ON effect_presets
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own presets
CREATE POLICY "Users can delete own presets"
  ON effect_presets
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGER: Update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_effect_presets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER effect_presets_updated_at
  BEFORE UPDATE ON effect_presets
  FOR EACH ROW
  EXECUTE FUNCTION update_effect_presets_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE effect_presets IS
  'Stores user effect presets for the Motion Studio';

COMMENT ON COLUMN effect_presets.effects IS
  'JSONB containing text, cursor, background, and ui effect configurations';

COMMENT ON COLUMN effect_presets.is_public IS
  'Whether preset is visible to all users';

COMMENT ON COLUMN effect_presets.thumbnail IS
  'Optional preview image URL or base64 data';
