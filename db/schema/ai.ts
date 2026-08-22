import { pgTable, text, integer } from "drizzle-orm/pg-core";
import { users } from "./users";

export const ai_quota = pgTable("ai_quota", {
  user_id: integer("user_id").primaryKey().references(() => users.id),
  tokens: integer("tokens").notNull().default(0),
  period_date: text("period_date").notNull().default("CURRENT_DATE"),
});
