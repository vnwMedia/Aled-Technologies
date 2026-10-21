CREATE TABLE `appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`request_key` text NOT NULL,
	`date` text NOT NULL,
	`slot` integer NOT NULL,
	`name` text NOT NULL,
	`apartment` text NOT NULL,
	`apartment_key` text NOT NULL,
	`units` integer NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`created_at` text NOT NULL,
	`canceled_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `active_slot` ON `appointments` (`date`,`slot`) WHERE "appointments"."canceled_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `active_apartment` ON `appointments` (`date`,`apartment_key`) WHERE "appointments"."canceled_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `user_request` ON `appointments` (`user_id`,`request_key`);