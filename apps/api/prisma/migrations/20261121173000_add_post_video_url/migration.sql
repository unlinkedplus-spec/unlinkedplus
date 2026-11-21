-- Video Spill: nullable external video link (allow-listed providers only).
ALTER TABLE "posts" ADD COLUMN "video_url" VARCHAR(500);
