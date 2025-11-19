-- Migration: Add Discord Integration Tables
-- This migration ONLY adds new tables and does NOT modify existing data
-- Safe to run on production database with existing data

-- Create discord_channels table
CREATE TABLE IF NOT EXISTS "discord_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dao_id" uuid,
	"channel_id" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"type" text DEFAULT 'text',
	"last_synced_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);

-- Create discord_messages table
CREATE TABLE IF NOT EXISTS "discord_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discord_id" text NOT NULL UNIQUE,
	"channel_id" uuid NOT NULL,
	"content" text,
	"author_id" text NOT NULL,
	"author_username" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"embeds" jsonb DEFAULT '[]'::jsonb,
	"posted_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);

-- Create discord_reports table
CREATE TABLE IF NOT EXISTS "discord_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid,
	"report_type" text NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"content" text NOT NULL,
	"summary" text,
	"status" text DEFAULT 'draft',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);

-- Add foreign key constraints (safe - only adds constraints, doesn't modify data)
DO $$ BEGIN
 ALTER TABLE "discord_channels" ADD CONSTRAINT "discord_channels_dao_id_dao_entities_id_fk" 
 FOREIGN KEY ("dao_id") REFERENCES "dao_entities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "discord_messages" ADD CONSTRAINT "discord_messages_channel_id_discord_channels_id_fk" 
 FOREIGN KEY ("channel_id") REFERENCES "discord_channels"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "discord_reports" ADD CONSTRAINT "discord_reports_channel_id_discord_channels_id_fk" 
 FOREIGN KEY ("channel_id") REFERENCES "discord_channels"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "discord_channels_dao_id_idx" ON "discord_channels" ("dao_id");
CREATE INDEX IF NOT EXISTS "discord_messages_channel_id_idx" ON "discord_messages" ("channel_id");
CREATE INDEX IF NOT EXISTS "discord_messages_posted_at_idx" ON "discord_messages" ("posted_at");
CREATE INDEX IF NOT EXISTS "discord_reports_channel_id_idx" ON "discord_reports" ("channel_id");
CREATE INDEX IF NOT EXISTS "discord_reports_period_idx" ON "discord_reports" ("period_start", "period_end");

