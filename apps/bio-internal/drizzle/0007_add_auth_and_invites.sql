-- Create invite_status enum
DO $$ BEGIN
 CREATE TYPE "invite_status" AS ENUM('pending', 'accepted', 'expired', 'revoked');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create user_role enum
DO $$ BEGIN
 CREATE TYPE "user_role" AS ENUM('admin', 'member');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create invites table
CREATE TABLE IF NOT EXISTS "invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"invited_by" text NOT NULL,
	"status" "invite_status" DEFAULT 'pending' NOT NULL,
	"invite_token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"user_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "invites_email_unique" UNIQUE("email"),
	CONSTRAINT "invites_invite_token_unique" UNIQUE("invite_token")
);

-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role" "user_role" DEFAULT 'member' NOT NULL,
	"full_name" text,
	"avatar_url" text,
	"last_login_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "invites_email_idx" ON "invites" ("email");
CREATE INDEX IF NOT EXISTS "invites_status_idx" ON "invites" ("status");
CREATE INDEX IF NOT EXISTS "invites_token_idx" ON "invites" ("invite_token");
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");

-- Insert admin user (emre@bio.xyz) - you'll need to create this manually in Supabase Auth first
-- This is just a placeholder comment. After creating the user in Supabase, run:
-- INSERT INTO users (id, email, role, full_name) VALUES ('your-supabase-auth-id', 'emre@bio.xyz', 'admin', 'Emre')
-- ON CONFLICT (email) DO NOTHING;
