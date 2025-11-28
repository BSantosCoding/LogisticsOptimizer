-- Super Admin Feature - Database Migration Script
-- Run this in Supabase SQL Editor
-- This script adds company approval functionality

-- Step 1: Add approval_status column to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending';

-- Step 2: Set all existing companies to 'approved' (backwards compatibility)
UPDATE companies 
SET approval_status = 'approved' 
WHERE approval_status = 'pending';

-- Step 3: Add check constraint for approval_status
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'companies_approval_status_check'
    ) THEN
        ALTER TABLE companies 
        ADD CONSTRAINT companies_approval_status_check 
        CHECK (approval_status IN ('pending', 'approved', 'rejected'));
    END IF;
END $$;

-- Step 4: Update profiles table to support super_admin role
-- First, drop the existing constraint if it exists
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Then add the new constraint with super_admin included
ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('super_admin', 'admin', 'manager', 'standard'));

-- Step 5: Update RLS policy to check company approval status
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can only access approved companies" ON profiles;

-- Create new policy that allows super_admins to see everything
-- and regular users to only see profiles from approved companies
CREATE POLICY "Users can only access approved companies"
ON profiles FOR SELECT
USING (
  -- Super admins can see all profiles
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'super_admin'
  )
  OR
  -- Regular users can only see profiles from approved companies
  EXISTS (
    SELECT 1 FROM companies
    WHERE companies.id = profiles.company_id
    AND companies.approval_status = 'approved'
  )
);

-- Step 6: Add policy for companies table
-- Super admins can see all companies, regular users can only see approved ones
DROP POLICY IF EXISTS "Users can view approved companies" ON companies;

CREATE POLICY "Users can view approved companies"
ON companies FOR SELECT
USING (
  -- Super admins can see all companies
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'super_admin'
  )
  OR
  -- Regular users can only see approved companies
  approval_status = 'approved'
);

-- Step 7: Allow super admins to update companies
DROP POLICY IF EXISTS "Super admins can update companies" ON companies;

CREATE POLICY "Super admins can update companies"
ON companies FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'super_admin'
  )
);

-- Migration complete!
-- Next steps:
-- 1. Manually set a user's role to 'super_admin' in the profiles table
-- 2. Refresh your app to see the Super Admin panel
