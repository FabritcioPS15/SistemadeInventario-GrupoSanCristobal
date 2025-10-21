-- Add password column to users table
ALTER TABLE users ADD COLUMN password text;

-- Add comment to the column
COMMENT ON COLUMN users.password IS 'User password for authentication';
