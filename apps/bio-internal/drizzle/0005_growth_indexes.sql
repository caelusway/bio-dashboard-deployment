DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'growth_metric') THEN
        ALTER TYPE public.growth_metric ADD VALUE IF NOT EXISTS 'youtube_top_video_views';
        ALTER TYPE public.growth_metric ADD VALUE IF NOT EXISTS 'youtube_top_video_impressions';
    END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS growth_metrics_source_metric_recorded_idx
    ON public.growth_metrics (source_id, metric_type, recorded_at);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS growth_snapshots_source_metric_window_snapshot_idx
    ON public.growth_snapshots (source_id, metric_type, snapshot_window, snapshot_at);
