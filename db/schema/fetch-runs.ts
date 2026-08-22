import { pgTable, text, integer, serial, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { accounts } from "./accounts";

export const fetch_runs = pgTable("fetch_runs", {
  id: serial("id").primaryKey(),
  account_id: integer("account_id").notNull().references(() => accounts.id),
  trigger: text("trigger").notNull().default("manual"),
  status: text("status").notNull().default("running"),
  started_at: text("started_at").notNull().default(sql`NOW()`),
  finished_at: text("finished_at"),
  duration_ms: integer("duration_ms"),
  error_message: text("error_message"),
  capability_gaps: text("capability_gaps").notNull().default("[]"),
},
(table) => ({
  accountStarted: index("idx_fetch_runs_account_started").on(table.account_id, table.started_at),
}));
