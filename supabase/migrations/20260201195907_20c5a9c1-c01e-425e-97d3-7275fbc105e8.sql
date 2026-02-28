-- =============================================
-- PHASE 3: ANALYTICS & QUOTAS TABLES
-- =============================================

-- 1. SCHOOL QUOTAS & USAGE LIMITS
CREATE TABLE public.school_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL UNIQUE,
  max_students INTEGER DEFAULT 500,
  max_staff INTEGER DEFAULT 100,
  max_storage_mb INTEGER DEFAULT 5000,
  max_api_calls_daily INTEGER DEFAULT 10000,
  current_students INTEGER DEFAULT 0,
  current_staff INTEGER DEFAULT 0,
  current_storage_mb NUMERIC(10,2) DEFAULT 0,
  api_calls_today INTEGER DEFAULT 0,
  api_calls_reset_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.school_quotas ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all quotas
CREATE POLICY "Super admins can manage all quotas"
ON public.school_quotas FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Directors can view their school's quota
CREATE POLICY "Directors can view their school quota"
ON public.school_quotas FOR SELECT
TO authenticated
USING (
  school_id = public.get_user_school_id(auth.uid()) 
  AND public.has_role(auth.uid(), 'director')
);

-- Trigger for updated_at
CREATE TRIGGER update_school_quotas_updated_at
BEFORE UPDATE ON public.school_quotas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 2. USAGE ANALYTICS (Daily aggregated usage per school)
CREATE TABLE public.usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- User activity
  unique_logins INTEGER DEFAULT 0,
  total_page_views INTEGER DEFAULT 0,
  
  -- Data operations
  students_added INTEGER DEFAULT 0,
  students_updated INTEGER DEFAULT 0,
  staff_added INTEGER DEFAULT 0,
  
  -- Financials
  fee_payments_count INTEGER DEFAULT 0,
  fee_amount_collected NUMERIC(15,2) DEFAULT 0,
  
  -- Academic
  grades_entered INTEGER DEFAULT 0,
  attendance_records INTEGER DEFAULT 0,
  
  -- Communications
  messages_sent INTEGER DEFAULT 0,
  notices_created INTEGER DEFAULT 0,
  
  -- Storage & API
  storage_added_mb NUMERIC(10,2) DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, date)
);

-- Index
CREATE INDEX idx_usage_analytics_school_date ON public.usage_analytics(school_id, date DESC);

-- Enable RLS
ALTER TABLE public.usage_analytics ENABLE ROW LEVEL SECURITY;

-- Super admins can view all analytics
CREATE POLICY "Super admins can view all usage analytics"
ON public.usage_analytics FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Super admins can manage analytics
CREATE POLICY "Super admins can manage usage analytics"
ON public.usage_analytics FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Directors can view their school's analytics
CREATE POLICY "Directors can view their school analytics"
ON public.usage_analytics FOR SELECT
TO authenticated
USING (
  school_id = public.get_user_school_id(auth.uid()) 
  AND public.has_role(auth.uid(), 'director')
);

-- 3. COMPARATIVE BENCHMARKS (Platform-wide aggregated metrics)
CREATE TABLE public.platform_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE UNIQUE,
  
  -- Averages across all schools
  avg_student_count NUMERIC(10,2) DEFAULT 0,
  avg_staff_count NUMERIC(10,2) DEFAULT 0,
  avg_fee_collection_rate NUMERIC(5,2) DEFAULT 0,
  avg_attendance_rate NUMERIC(5,2) DEFAULT 0,
  avg_grade_average NUMERIC(5,2) DEFAULT 0,
  
  -- Platform totals
  total_schools INTEGER DEFAULT 0,
  active_schools INTEGER DEFAULT 0,
  total_students INTEGER DEFAULT 0,
  total_staff INTEGER DEFAULT 0,
  total_fee_collected NUMERIC(15,2) DEFAULT 0,
  
  -- Top performers (school IDs)
  top_attendance_school UUID,
  top_fee_collection_school UUID,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_benchmarks ENABLE ROW LEVEL SECURITY;

-- Super admins can manage benchmarks
CREATE POLICY "Super admins can manage benchmarks"
ON public.platform_benchmarks FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Directors can view benchmarks (for comparison)
CREATE POLICY "Directors can view benchmarks"
ON public.platform_benchmarks FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'director'));