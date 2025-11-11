DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'twitter_metric_type') THEN
        CREATE TYPE public.twitter_metric_type AS ENUM('retweet_count', 'reply_count', 'like_count', 'quote_count', 'view_count', 'bookmark_count', 'impression_count');
    END IF;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dao_entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"twitter_handle" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "dao_entities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "orgs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "orgs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "twitter_post_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"metric_type" "twitter_metric_type" NOT NULL,
	"value" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now(),
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "twitter_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"dao_id" uuid NOT NULL,
	"tweet_id" text NOT NULL,
	"author" jsonb NOT NULL,
	"content" text,
	"tweet_metrics" jsonb DEFAULT '{}'::jsonb,
	"hashtags" jsonb DEFAULT '[]'::jsonb,
	"mentions" jsonb DEFAULT '[]'::jsonb,
	"media" jsonb DEFAULT '[]'::jsonb,
	"conversation_id" text,
	"in_reply_to_id" text,
	"in_reply_to_user_id" text,
	"tweeted_at" timestamp with time zone NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now(),
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "twitter_posts_tweet_id_unique" UNIQUE("tweet_id")
);
--> statement-breakpoint
DO $$ BEGIN
ALTER TABLE "dao_entities" ADD CONSTRAINT "dao_entities_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
ALTER TABLE "twitter_post_metrics" ADD CONSTRAINT "twitter_post_metrics_post_id_twitter_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."twitter_posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
ALTER TABLE "twitter_posts" ADD CONSTRAINT "twitter_posts_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
ALTER TABLE "twitter_posts" ADD CONSTRAINT "twitter_posts_dao_id_dao_entities_id_fk" FOREIGN KEY ("dao_id") REFERENCES "public"."dao_entities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
