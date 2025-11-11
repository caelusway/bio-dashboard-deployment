CREATE TABLE IF NOT EXISTS public.dao_follower_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    dao_id uuid NOT NULL,
    count integer NOT NULL,
    recorded_at timestamptz DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'dao_entities'
          AND column_name = 'follower_count'
    ) THEN
        ALTER TABLE public.dao_entities
            ADD COLUMN follower_count integer;
    END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'dao_entities'
          AND column_name = 'follower_count_updated_at'
    ) THEN
        ALTER TABLE public.dao_entities
            ADD COLUMN follower_count_updated_at timestamptz;
    END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'dao_follower_snapshots_dao_id_dao_entities_id_fk'
    ) THEN
        ALTER TABLE public.dao_follower_snapshots
            ADD CONSTRAINT dao_follower_snapshots_dao_id_dao_entities_id_fk
            FOREIGN KEY (dao_id) REFERENCES public.dao_entities(id)
            ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
END $$;
