DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'growth_metric') THEN
        CREATE TYPE public.growth_metric AS ENUM(
            'discord_message_count',
            'discord_member_count',
            'telegram_message_count',
            'telegram_member_count',
            'youtube_total_views',
            'youtube_subscriber_count',
            'youtube_total_impressions',
            'youtube_top_video_views',
            'youtube_top_video_impressions',
            'linkedin_follower_count',
            'luma_page_views',
            'luma_subscriber_count',
            'email_newsletter_signup_count',
            'twitter_follower_count',
            'twitter_engagement_count',
            'custom'
        );
    END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'growth_platform') THEN
        CREATE TYPE public.growth_platform AS ENUM(
            'discord', 'telegram', 'youtube', 'linkedin', 'luma', 'email_newsletter', 'twitter', 'other'
        );
    END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'growth_snapshot_window') THEN
        CREATE TYPE public.growth_snapshot_window AS ENUM('day', 'week', 'month', 'quarter', 'year');
    END IF;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.growth_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    source_id uuid,
    started_at timestamptz DEFAULT now(),
    finished_at timestamptz,
    status text DEFAULT 'pending',
    records_collected integer,
    error text,
    metadata jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.growth_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    source_id uuid NOT NULL,
    platform public.growth_platform NOT NULL,
    metric_type public.growth_metric NOT NULL,
    value numeric NOT NULL,
    recorded_at timestamptz DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.growth_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    source_id uuid NOT NULL,
    platform public.growth_platform NOT NULL,
    metric_type public.growth_metric NOT NULL,
    snapshot_window public.growth_snapshot_window NOT NULL,
    value numeric NOT NULL,
    change_abs numeric,
    change_pct numeric,
    snapshot_at timestamptz DEFAULT now(),
    previous_snapshot_at timestamptz,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.growth_sources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    platform public.growth_platform NOT NULL,
    slug text NOT NULL,
    display_name text NOT NULL,
    config jsonb DEFAULT '{}'::jsonb,
    collection_interval_minutes integer DEFAULT 60,
    last_collected_at timestamptz,
    status text DEFAULT 'pending',
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT growth_sources_slug_unique UNIQUE(slug)
);
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'growth_jobs_source_id_growth_sources_id_fk'
    ) THEN
        ALTER TABLE public.growth_jobs
            ADD CONSTRAINT growth_jobs_source_id_growth_sources_id_fk
            FOREIGN KEY (source_id) REFERENCES public.growth_sources(id)
            ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'growth_metrics_source_id_growth_sources_id_fk'
    ) THEN
        ALTER TABLE public.growth_metrics
            ADD CONSTRAINT growth_metrics_source_id_growth_sources_id_fk
            FOREIGN KEY (source_id) REFERENCES public.growth_sources(id)
            ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'growth_snapshots_source_id_growth_sources_id_fk'
    ) THEN
        ALTER TABLE public.growth_snapshots
            ADD CONSTRAINT growth_snapshots_source_id_growth_sources_id_fk
            FOREIGN KEY (source_id) REFERENCES public.growth_sources(id)
            ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
END $$;
