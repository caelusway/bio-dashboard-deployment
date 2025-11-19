-- Migration: Add category fields to discord_channels
-- This adds category tracking for better organization

-- Add category fields to discord_channels
ALTER TABLE "discord_channels" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "discord_channels" ADD COLUMN IF NOT EXISTS "category_id" text;

-- Create index for category queries
CREATE INDEX IF NOT EXISTS "discord_channels_category_idx" ON "discord_channels" ("category");
CREATE INDEX IF NOT EXISTS "discord_channels_dao_category_idx" ON "discord_channels" ("dao_id", "category");

