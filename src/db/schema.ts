import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  adminKey: text("admin_key").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  eventType: text("event_type").notNull().default("in_person"), // 'in_person' | 'virtual'
  timezone: text("timezone"), // IANA timezone, in-person events only
  dateRangeStart: text("date_range_start").notNull(), // ISO date
  dateRangeEnd: text("date_range_end").notNull(), // ISO date
  durationMinutes: integer("duration_minutes").notNull().default(60),
  organizerName: text("organizer_name").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const participants = sqliteTable("participants", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id),
  name: text("name").notNull(),
  timezone: text("timezone"), // virtual events only
  chatStatus: text("chat_status").notNull().default("not_started"), // 'not_started' | 'in_progress' | 'completed'
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  completedAt: text("completed_at"),
});

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  participantId: text("participant_id")
    .notNull()
    .references(() => participants.id),
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  messageIndex: integer("message_index").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const availabilityWindows = sqliteTable("availability_windows", {
  id: text("id").primaryKey(),
  participantId: text("participant_id")
    .notNull()
    .references(() => participants.id),
  date: text("date").notNull(), // ISO date
  startTime: text("start_time"), // HH:mm, null = all day
  endTime: text("end_time"), // HH:mm, null = all day
  preference: text("preference").notNull().default("available"), // 'preferred' | 'available' | 'if_needed' | 'unavailable'
  note: text("note"), // preserves nuance
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const synthesisResults = sqliteTable("synthesis_results", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id),
  recommendedDate: text("recommended_date"),
  recommendedStartTime: text("recommended_start_time"),
  recommendedEndTime: text("recommended_end_time"),
  recommendationSummary: text("recommendation_summary").notNull(),
  alternativesJson: text("alternatives_json"), // JSON array
  tradeoffsJson: text("tradeoffs_json"), // JSON array
  participantImpactJson: text("participant_impact_json"), // JSON object
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});
