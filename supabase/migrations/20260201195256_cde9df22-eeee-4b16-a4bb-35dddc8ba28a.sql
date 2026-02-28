-- =============================================
-- PHASE 1: CORE INFRASTRUCTURE TABLES
-- =============================================

-- 1. ACTIVITY AUDIT LOGS
-- Track all user actions across the platform
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient querying
CREATE INDEX idx_audit_logs_school_id ON public.audit_logs(school_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs(entity_type);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can view all logs
CREATE POLICY "Super admins can view all audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Directors can view their school's logs
CREATE POLICY "Directors can view their school audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
  school_id = public.get_user_school_id(auth.uid()) 
  AND public.has_role(auth.uid(), 'director')
);

-- Allow inserts from authenticated users (for logging their own actions)
CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2. FEATURE FLAGS & TOGGLES
-- Control which modules are available per school
CREATE TABLE public.school_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  feature_key VARCHAR(100) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, feature_key)
);

-- Enable RLS
ALTER TABLE public.school_features ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all features
CREATE POLICY "Super admins can manage all school features"
ON public.school_features FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Users can view their school's features
CREATE POLICY "Users can view their school features"
ON public.school_features FOR SELECT
TO authenticated
USING (school_id = public.get_user_school_id(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_school_features_updated_at
BEFORE UPDATE ON public.school_features
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 3. PLATFORM ANNOUNCEMENTS
-- Broadcast messages from super admin to schools
CREATE TABLE public.platform_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  announcement_type VARCHAR(50) DEFAULT 'info',
  priority VARCHAR(20) DEFAULT 'normal',
  target_schools UUID[] DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_announcements ENABLE ROW LEVEL SECURITY;

-- Super admins can manage announcements
CREATE POLICY "Super admins can manage announcements"
ON public.platform_announcements FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Users can view active announcements for their school
CREATE POLICY "Users can view relevant announcements"
ON public.platform_announcements FOR SELECT
TO authenticated
USING (
  is_active = true 
  AND (starts_at IS NULL OR starts_at <= now())
  AND (expires_at IS NULL OR expires_at > now())
  AND (
    target_schools IS NULL 
    OR public.get_user_school_id(auth.uid()) = ANY(target_schools)
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_platform_announcements_updated_at
BEFORE UPDATE ON public.platform_announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 4. ANNOUNCEMENT DISMISSALS (Track which users dismissed which announcements)
CREATE TABLE public.announcement_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID REFERENCES public.platform_announcements(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- Enable RLS
ALTER TABLE public.announcement_dismissals ENABLE ROW LEVEL SECURITY;

-- Users can manage their own dismissals
CREATE POLICY "Users can manage their dismissals"
ON public.announcement_dismissals FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());