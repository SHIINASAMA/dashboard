import { pgTable, text, serial } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"),
  created_at: text("created_at").notNull().default(sql`NOW()`),
  deleted_at: text("deleted_at"),
});
