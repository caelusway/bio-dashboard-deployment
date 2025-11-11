-- Add 'website' to growth_platform enum
ALTER TYPE growth_platform ADD VALUE IF NOT EXISTS 'website';

-- Add website metrics to growth_metric enum
ALTER TYPE growth_metric ADD VALUE IF NOT EXISTS 'website_page_views';
ALTER TYPE growth_metric ADD VALUE IF NOT EXISTS 'website_active_users';
ALTER TYPE growth_metric ADD VALUE IF NOT EXISTS 'website_new_users';

-- Add twitter and youtube metrics
ALTER TYPE growth_metric ADD VALUE IF NOT EXISTS 'twitter_impression_count';
ALTER TYPE growth_metric ADD VALUE IF NOT EXISTS 'youtube_view_count';
