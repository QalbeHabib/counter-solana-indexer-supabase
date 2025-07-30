-- Fix RLS policy for counter_events table to allow backend service access
-- This disables Row Level Security for the counter_events table
-- allowing your backend service to insert events without authentication issues

ALTER TABLE counter_events DISABLE ROW LEVEL SECURITY;

-- Verify the table structure and policies
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    hasindexes
FROM pg_tables 
WHERE tablename = 'counter_events';

-- Show current policies (should be empty after disabling RLS)
SELECT * FROM pg_policies WHERE tablename = 'counter_events';

-- Optional: Add a comment to document this change
COMMENT ON TABLE counter_events IS 'Counter events from Solana blockchain. RLS disabled for backend service access.';