// pg-boss + fetch_policy + mv_pulse_daily
// This migration is applied via lib/setup.ts SCHEMA array; pg-boss tables are auto-created by pgboss library.
// For manual SQL, run:
// CREATE TABLE IF NOT EXISTS fetch_policy (platform TEXT NOT NULL, level TEXT NOT NULL, interval TEXT NOT NULL, PRIMARY KEY(platform, level));
// INSERT INTO fetch_policy VALUES ('github','l0','24h'), ('github','l1','90m'), ('github','l2','8h') ON CONFLICT DO NOTHING;
// CREATE MATERIALIZED VIEW IF NOT EXISTS mv_pulse_daily AS SELECT * FROM github_repo_snapshots WHERE 1=0;
export const pgBossMigration = `
// pg-boss tables are created automatically by new PgBoss(db); no manual DDL needed
// fetch_policy and mv_pulse_daily are created in lib/setup.ts SCHEMA
`;
