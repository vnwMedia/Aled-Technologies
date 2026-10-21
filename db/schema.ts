import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
export const appointments = sqliteTable("appointments", {
 id: text("id").primaryKey(), userId:text("user_id").notNull(), requestKey:text("request_key").notNull(), date:text("date").notNull(), slot:integer("slot").notNull(), name:text("name").notNull(), apartment:text("apartment").notNull(), apartmentKey:text("apartment_key").notNull(), units:integer("units").notNull(), email:text("email").notNull(), phone:text("phone").notNull(), createdAt:text("created_at").notNull(), canceledAt:text("canceled_at"), notificationState:text("notification_state").notNull().default("not_requested")
}, (t)=>[uniqueIndex("active_slot").on(t.date,t.slot).where(sql`${t.canceledAt} IS NULL`),uniqueIndex("active_apartment").on(t.date,t.apartmentKey).where(sql`${t.canceledAt} IS NULL`),uniqueIndex("user_request").on(t.userId,t.requestKey)]);
