import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const client = postgres(process.env.SUPABASE_DB_URL!, {
    ssl: { rejectUnauthorized: false },
  });
  try {
    const rows = await client`SELECT * FROM drizzle."_drizzle_migrations" ORDER BY id`;
    console.log(rows);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
