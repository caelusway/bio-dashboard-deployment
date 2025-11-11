INSERT INTO "orgs" (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'BioProtocol', 'bioprotocol')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "dao_entities" (org_id, slug, name, twitter_handle, follower_count, follower_count_updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'bioprotocol',
  'BioProtocol',
  'BioProtocolDAO',
  NULL,
  NULL
)
ON CONFLICT (slug) DO NOTHING;
