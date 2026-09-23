-- Stage 3: task source metadata and per-user scheduling mode.
-- Source metadata for shared task cards (LeetCode slug, raw URL, etc.).
ALTER TABLE tasks ADD COLUMN source_meta VARCHAR(1024);

-- Per-user scheduling mode; 'spaced_repetition' = take part in the review queue.
ALTER TABLE user_tasks ADD COLUMN schedule_mode VARCHAR(32) NOT NULL DEFAULT 'spaced_repetition';
