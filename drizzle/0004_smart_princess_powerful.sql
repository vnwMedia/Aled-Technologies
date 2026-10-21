DROP INDEX `active_slot_capacity`;--> statement-breakpoint
ALTER TABLE `appointments` ADD `start_minutes` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `active_time_capacity` ON `appointments` (`date`,`start_minutes`,`capacity_position`) WHERE "appointments"."canceled_at" IS NULL;