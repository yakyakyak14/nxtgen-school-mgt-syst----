-- Create platform_settings table for global platform configuration
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_name text NOT NULL DEFAULT 'School Management Platform',
  platform_logo_url text,
  support_email text,
  support_phone text,
  default_primary_color text DEFAULT '#1e3a5f',
  default_secondary_color text DEFAULT '#2d5a3d',
  default_accent_color text DEFAULT '#d4a84b',
  max_schools_allowed integer DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Only super_admin can manage platform settings
CREATE POLICY "Platform settings viewable by super_admin"
ON public.platform_settings FOR SELECT
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Platform settings manageable by super_admin"
ON public.platform_settings FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

-- Allow super_admin to view all schools (including inactive)
DROP POLICY IF EXISTS "Super admin can view all schools" ON public.schools;
CREATE POLICY "Super admin can view all schools"
ON public.schools FOR SELECT
USING (has_role(auth.uid(), 'super_admin'));

-- Allow super_admin to manage all schools
DROP POLICY IF EXISTS "Super admin can manage all schools" ON public.schools;
CREATE POLICY "Super admin can manage all schools"
ON public.schools FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

-- Update get_user_role to include super_admin with highest priority
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'super_admin' THEN 0
      WHEN 'director' THEN 1
      WHEN 'principal' THEN 2
      WHEN 'headmaster' THEN 3
      WHEN 'teacher' THEN 4
      WHEN 'admin_staff' THEN 5
      WHEN 'non_teaching_staff' THEN 6
      WHEN 'parent' THEN 7
      WHEN 'student' THEN 8
      WHEN 'alumni' THEN 9
    END
  LIMIT 1
$$;

-- Insert default platform settings
INSERT INTO public.platform_settings (platform_name)
VALUES ('School Management Platform')
ON CONFLICT DO NOTHING;