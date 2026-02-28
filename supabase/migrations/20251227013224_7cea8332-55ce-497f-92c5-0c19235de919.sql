-- Add alumni role to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'alumni';

-- Add bank account fields to staff table
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS bank_account_number text;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS bank_account_name text;

-- Create weekly reports table
CREATE TABLE public.weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  session text NOT NULL,
  term public.term NOT NULL,
  week_number integer NOT NULL,
  report_content text NOT NULL,
  behavior_rating text,
  academic_rating text,
  attendance_summary text,
  teacher_comments text,
  status text NOT NULL DEFAULT 'pending',
  submitted_at timestamp with time zone DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  director_summary text,
  summary_sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create alumni table
CREATE TABLE public.alumni (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  graduation_year integer NOT NULL,
  graduation_class text,
  current_occupation text,
  current_employer text,
  bio text,
  linkedin_url text,
  is_verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create alumni donations table
CREATE TABLE public.alumni_donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alumni_id uuid REFERENCES public.alumni(id) ON DELETE SET NULL,
  donor_name text NOT NULL,
  donor_email text,
  amount numeric NOT NULL,
  currency text DEFAULT 'NGN',
  project_id uuid,
  payment_reference text,
  payment_status text DEFAULT 'pending',
  message text,
  is_anonymous boolean DEFAULT false,
  donated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Create alumni projects table for crowdfunding
CREATE TABLE public.alumni_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  target_amount numeric NOT NULL,
  current_amount numeric DEFAULT 0,
  category text,
  image_url text,
  start_date timestamp with time zone DEFAULT now(),
  end_date timestamp with time zone,
  status text DEFAULT 'active',
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add foreign key for donations to projects
ALTER TABLE public.alumni_donations ADD CONSTRAINT alumni_donations_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES public.alumni_projects(id) ON DELETE SET NULL;

-- Enable RLS on all new tables
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_projects ENABLE ROW LEVEL SECURITY;

-- RLS policies for weekly_reports
CREATE POLICY "Teachers can insert their own reports" ON public.weekly_reports
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can view their own reports" ON public.weekly_reports
  FOR SELECT TO authenticated
  USING (teacher_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid()) 
    OR public.has_role(auth.uid(), 'director')
    OR public.has_role(auth.uid(), 'principal')
    OR public.has_role(auth.uid(), 'headmaster'));

CREATE POLICY "Teachers can update their own pending reports" ON public.weekly_reports
  FOR UPDATE TO authenticated
  USING (teacher_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid()) AND status = 'pending');

CREATE POLICY "Admin can manage all reports" ON public.weekly_reports
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'headmaster'));

-- RLS policies for alumni
CREATE POLICY "Alumni can view all alumni" ON public.alumni
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Alumni can update their own profile" ON public.alumni
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their alumni profile" ON public.alumni
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS policies for alumni_donations (public can view, authenticated can donate)
CREATE POLICY "Anyone can view non-anonymous donations" ON public.alumni_donations
  FOR SELECT USING (is_anonymous = false OR alumni_id IN (SELECT id FROM public.alumni WHERE user_id = auth.uid()));

CREATE POLICY "Authenticated users can create donations" ON public.alumni_donations
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- RLS policies for alumni_projects
CREATE POLICY "Anyone can view active projects" ON public.alumni_projects
  FOR SELECT USING (status = 'active' OR created_by = auth.uid());

CREATE POLICY "Admins can manage projects" ON public.alumni_projects
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'director') OR created_by = auth.uid());

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_weekly_reports_updated_at
  BEFORE UPDATE ON public.weekly_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_alumni_updated_at
  BEFORE UPDATE ON public.alumni
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_alumni_projects_updated_at
  BEFORE UPDATE ON public.alumni_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();