DROP INDEX `active_slot`;--> statement-breakpoint
ALTER TABLE `appointments` ADD `capacity_position` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `active_slot_capacity` ON `appointments` (`date`,`slot`,`capacity_position`) WHERE "appointments"."canceled_at" IS NULL;