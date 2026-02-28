
-- Create a function to assign alumni role and create alumni profile
-- This will be called from the frontend after signup
CREATE OR REPLACE FUNCTION public.setup_alumni_profile(
  _user_id uuid,
  _graduation_year integer,
  _graduation_class text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert alumni role if not exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'alumni')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Insert alumni profile if not exists
  INSERT INTO public.alumni (user_id, graduation_year, graduation_class)
  VALUES (_user_id, _graduation_year, _graduation_class)
  ON CONFLICT DO NOTHING;
END;
$$;
