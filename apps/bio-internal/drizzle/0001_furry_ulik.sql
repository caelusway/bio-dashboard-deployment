DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'dao_entities'
          AND column_name = 'last_synced_at'
    ) THEN
        ALTER TABLE public.dao_entities
            ADD COLUMN last_synced_at timestamptz;
    END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'dao_entities'
          AND column_name = 'last_tweet_id'
    ) THEN
        ALTER TABLE public.dao_entities
            ADD COLUMN last_tweet_id text;
    END IF;
END $$;
