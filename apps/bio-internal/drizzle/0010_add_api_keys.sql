-- Create API Keys table for external app authentication
CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "key_hash" text NOT NULL UNIQUE,
  "key_prefix" text NOT NULL,
  "created_by" uuid,
  "last_used_at" timestamp with time zone,
  "expires_at" timestamp with time zone,
  "is_active" boolean DEFAULT true,
  "metadata" jsonb DEFAULT '{}',
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_by ON api_keys(created_by);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

-- Add comment
COMMENT ON TABLE api_keys IS 'API keys for external application authentication';

