-- Add super_admin to app_role enum (must be separate from usage)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';