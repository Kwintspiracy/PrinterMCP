-- Add verbatim column to user_settings table
-- Run this in your Supabase SQL Editor

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS verbatim boolean DEFAULT false;
