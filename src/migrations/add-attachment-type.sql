-- Migration: Add attachmentType column to files table
-- Date: 2025-01-21
-- Description: Add column to categorize file attachments as 'initial' or 'submission'

-- Add the attachmentType column
ALTER TABLE files 
ADD COLUMN attachment_type VARCHAR(20) CHECK (attachment_type IN ('initial', 'submission'));

-- Add index for better query performance
CREATE INDEX idx_files_attachment_type ON files(attachment_type);

-- Optional: Update existing files to have a default type
-- Uncomment the following lines if you want to set existing files as 'initial'
-- UPDATE files 
-- SET attachment_type = 'initial' 
-- WHERE attachment_type IS NULL 
-- AND id IN (
--   SELECT DISTINCT file_id 
--   FROM task_files 
--   WHERE task_id IN (
--     SELECT id FROM tasks 
--     WHERE created_at < '2025-01-21'
--   )
-- );

-- Verify the migration
SELECT 
  COUNT(*) as total_files,
  COUNT(attachment_type) as files_with_type,
  attachment_type
FROM files 
GROUP BY attachment_type;
