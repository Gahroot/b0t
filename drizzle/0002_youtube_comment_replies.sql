CREATE TABLE `youtube_comment_replies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`original_comment_id` text NOT NULL,
	`original_comment_text` text NOT NULL,
	`original_comment_author` text NOT NULL,
	`original_comment_likes` integer DEFAULT 0,
	`video_id` text NOT NULL,
	`video_title` text,
	`our_reply_text` text NOT NULL,
	`our_reply_comment_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`replied_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `youtube_comment_replies_original_comment_id_unique` ON `youtube_comment_replies` (`original_comment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `youtube_comment_replies_original_comment_id_idx` ON `youtube_comment_replies` (`original_comment_id`);--> statement-breakpoint
CREATE INDEX `youtube_comment_replies_status_idx` ON `youtube_comment_replies` (`status`);--> statement-breakpoint
CREATE INDEX `youtube_comment_replies_created_at_idx` ON `youtube_comment_replies` (`created_at`);--> statement-breakpoint
CREATE INDEX `youtube_comment_replies_video_id_idx` ON `youtube_comment_replies` (`video_id`);--> statement-breakpoint
CREATE INDEX `youtube_comment_replies_video_status_idx` ON `youtube_comment_replies` (`video_id`,`status`);--> statement-breakpoint
CREATE TABLE `youtube_usage` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`window_type` text NOT NULL,
	`comments_count` integer DEFAULT 0 NOT NULL,
	`videos_count` integer DEFAULT 0 NOT NULL,
	`quota_units` integer DEFAULT 0 NOT NULL,
	`window_start` integer NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `youtube_usage_window_type_unique` ON `youtube_usage` (`window_type`);--> statement-breakpoint
CREATE INDEX `youtube_usage_window_type_idx` ON `youtube_usage` (`window_type`);--> statement-breakpoint
CREATE INDEX `youtube_usage_window_start_idx` ON `youtube_usage` (`window_start`);
