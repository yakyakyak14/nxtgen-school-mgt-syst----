-- Create schools table for multi-tenant system
CREATE TABLE public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  domain text UNIQUE,
  subdomain text UNIQUE,
  logo_url text,
  primary_color text DEFAULT '#1e3a5f',
  secondary_color text DEFAULT '#2d5a3d',
  accent_color text DEFAULT '#d4a84b',
  motto text,
  address text,
  phone text,
  email text,
  google_maps_embed_url text,
  latitude numeric,
  longitude numeric,
  current_session text DEFAULT '2024/2025',
  current_term public.term DEFAULT 'first',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on schools table
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Schools are publicly viewable for landing page
CREATE POLICY "Schools viewable by public"
ON public.schools FOR SELECT
USING (is_active = true);

-- Only super admins can manage schools (for now, directors)
CREATE POLICY "Schools manageable by admin"
ON public.schools FOR ALL
USING (has_role(auth.uid(), 'director'::app_role));

-- Add school_id to existing tables for multi-tenancy
ALTER TABLE public.profiles ADD COLUMN school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.user_roles ADD COLUMN school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.students ADD COLUMN school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.staff ADD COLUMN school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.classes ADD COLUMN school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.subjects ADD COLUMN school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.fee_types ADD COLUMN school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.notices ADD COLUMN school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.weekly_reports ADD COLUMN school_id uuid REFERENCES public.schools(id);

-- Create indexes for school_id columns
CREATE INDEX idx_profiles_school ON public.profiles(school_id);
CREATE INDEX idx_user_roles_school ON public.user_roles(school_id);
CREATE INDEX idx_students_school ON public.students(school_id);
CREATE INDEX idx_staff_school ON public.staff(school_id);
CREATE INDEX idx_classes_school ON public.classes(school_id);
CREATE INDEX idx_subjects_school ON public.subjects(school_id);
CREATE INDEX idx_fee_types_school ON public.fee_types(school_id);
CREATE INDEX idx_notices_school ON public.notices(school_id);
CREATE INDEX idx_weekly_reports_school ON public.weekly_reports(school_id);

-- Create function to get current school from user
CREATE OR REPLACE FUNCTION public.get_user_school_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- Add updated_at trigger for schools
CREATE TRIGGER update_schools_updated_at
  BEFORE UPDATE ON public.schools
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for notices (for live announcements)
ALTER PUBLICATION supabase_realtime ADD TABLE public.notices;