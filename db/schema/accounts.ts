import { pgTable, text, integer, serial, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  owner_id: integer("owner_id").notNull().references(() => users.id),
  screen_name: text("screen_name").notNull(),
  platform: text("platform").notNull().default("twitter"),
  user_id: text("user_id"),
  auth_token: text("auth_token").notNull(),
  fetch_interval: integer("fetch_interval").default(30),
  is_active: integer("is_active").default(1),
  last_fetched_at: text("last_fetched_at"),
  error_message: text("error_message"),
  instance_url: text("instance_url"),
  auth_type: text("auth_type"),
  created_at: text("created_at").notNull().default(sql`NOW()`),
  updated_at: text("updated_at").notNull().default(sql`NOW()`),
  deleted_at: text("deleted_at"),
},
(table) => ({
  uniq: uniqueIndex("idx_accounts_screen_name_platform").on(table.owner_id, table.screen_name, table.platform),
}));
