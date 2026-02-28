CREATE TABLE `availability_windows` (
	`id` text PRIMARY KEY NOT NULL,
	`participant_id` text NOT NULL,
	`date` text NOT NULL,
	`start_time` text,
	`end_time` text,
	`preference` text DEFAULT 'available' NOT NULL,
	`note` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`participant_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`message_index` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_key` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`event_type` text DEFAULT 'in_person' NOT NULL,
	`timezone` text,
	`date_range_start` text NOT NULL,
	`date_range_end` text NOT NULL,
	`duration_minutes` integer DEFAULT 60 NOT NULL,
	`organizer_name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_admin_key_unique` ON `events` (`admin_key`);--> statement-breakpoint
CREATE TABLE `participants` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`name` text NOT NULL,
	`timezone` text,
	`chat_status` text DEFAULT 'not_started' NOT NULL,
	`created_at` text NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `synthesis_results` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`recommended_date` text,
	`recommended_start_time` text,
	`recommended_end_time` text,
	`recommendation_summary` text NOT NULL,
	`alternatives_json` text,
	`tradeoffs_json` text,
	`participant_impact_json` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
