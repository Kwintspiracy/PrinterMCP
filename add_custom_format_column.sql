-- Add custom_format column to user_settings table
-- Run this in your Supabase SQL Editor

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS custom_format text DEFAULT '{"message": "${message}"}';
